"""
POST /api/v1/agent/{agent_id}/propose        — Gemini generates a strategic proposal.
GET  /api/v1/agent/{agent_id}/proposals      — List proposals for an agent.
POST /api/v1/proposals/{proposal_id}/approve — Validate + recordExecutedProposal() on V4.
POST /api/v1/proposals/{proposal_id}/reject  — Mark proposal as rejected.

Flow:
  1. User clicks "Request Strategic Consult" on AgentCard.
  2. Backend fetches agent context + event history from Firestore.
  3. Gemini generates a proposal (title + description + category).
  4. Proposal saved to Firestore with keccak256 hash + 7-day TTL.
  5. User approves → backend calls recordExecutedProposal() via MINTER_ROLE.
  6. V4 emits ProposalExecuted: +5 heritageScore on-chain.
  7. Firestore updated: status=approved, tx_hash, heritage_score_after.
"""

import logging
import time

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from web3 import Web3

from core.config import settings
from core.database import get_db
from core.kms_service import decrypt_private_key
from google.cloud.firestore_v1.base_query import FieldFilter
from services.llm_service import generate_agent_proposal
from services.web3_service import web3_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["proposals"])

AGENTS_COLLECTION = "agents"
EVENTS_COLLECTION = "agent_events"
PROPOSALS_COLLECTION = "proposals"

PROPOSAL_TTL_SECONDS = 7 * 24 * 3600  # 7 days
HERITAGE_XP_PER_PROPOSAL = 5


# ── Models ────────────────────────────────────────────────────────────────────


class ProposalResponse(BaseModel):
    proposal_id: str
    agent_id: str
    agent_wallet: str
    title: str
    description: str
    category: str
    proposal_hash: str
    status: str
    created_at: float
    expires_at: float
    tx_hash: str | None = None
    heritage_score_after: int | None = None
    proposals_approved_total: int | None = None
    autonomous_execution_triggered: bool | None = None
    autonomous_transfer_tx: str | None = None
    autonomous_transfer_status: str | None = None
    autonomous_transfer_amount_mnt: float | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────


def _compute_proposal_hash(agent_wallet: str, title: str, created_at: float) -> str:
    """Deterministic keccak256 — verifiable against ProposalExecuted event on MantleScan."""
    return Web3.keccak(text=f"{agent_wallet}:{title}:{created_at}").hex()


def _doc_to_response(doc_id: str, data: dict) -> ProposalResponse:
    return ProposalResponse(
        proposal_id=doc_id,
        agent_id=data["agent_id"],
        agent_wallet=data["agent_wallet"],
        title=data["title"],
        description=data["description"],
        category=data["category"],
        proposal_hash=data["proposal_hash"],
        status=data["status"],
        created_at=data["created_at"],
        expires_at=data["expires_at"],
        tx_hash=data.get("tx_hash"),
        heritage_score_after=data.get("heritage_score_after"),
        proposals_approved_total=data.get("proposals_approved_total"),
        autonomous_execution_triggered=data.get("autonomous_execution_triggered"),
        autonomous_transfer_tx=data.get("autonomous_transfer_tx"),
        autonomous_transfer_status=data.get("autonomous_transfer_status"),
        autonomous_transfer_amount_mnt=data.get("autonomous_transfer_amount_mnt"),
    )


# ── Background task ───────────────────────────────────────────────────────────


async def _bg_autonomous_transfer(
    proposal_id: str,
    agent_id: str,
    agent_wallet: str,
    agent_private_key: str,
) -> None:
    """
    Semi-Autonomous Proposal Execution (Option A):
    After a DeFi proposal is approved on-chain, the agent's own wallet
    transfers 0.1 MNT to the autonomous vault — no human keystroke required.
    """
    vault_address = settings.autonomous_vault_address
    if not vault_address or not Web3.is_address(vault_address):
        logger.warning(
            "Autonomous transfer skipped: AUTONOMOUS_VAULT_ADDRESS not configured (proposal %s)",
            proposal_id,
        )
        return

    db = get_db()
    try:
        result = await web3_service.execute_autonomous_transfer(
            agent_wallet=agent_wallet,
            agent_private_key=agent_private_key,
            amount_mnt=0.1,
            vault_address=vault_address,
        )
        logger.info(
            "Autonomous transfer complete for proposal %s: tx=%s status=%s",
            proposal_id, result.get("tx_hash"), result.get("status"),
        )
        await db.collection(PROPOSALS_COLLECTION).document(proposal_id).update({
            "autonomous_transfer_tx": result.get("tx_hash"),
            "autonomous_transfer_status": result.get("status"),
            "autonomous_transfer_amount_mnt": result.get("amount_mnt"),
            "autonomous_transfer_at": time.time(),
        })
    except Exception as exc:
        logger.error(
            "Autonomous transfer failed for proposal %s (agent %s): %s",
            proposal_id, agent_id, exc,
        )
        try:
            await db.collection(PROPOSALS_COLLECTION).document(proposal_id).update({
                "autonomous_transfer_status": "failed",
                "autonomous_transfer_error": str(exc)[:200],
            })
        except Exception:
            pass


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/api/v1/agent/{agent_id}/propose", response_model=ProposalResponse, status_code=201)
async def generate_proposal(agent_id: str) -> ProposalResponse:
    """
    Gemini analyses the agent's event history and generates a strategic proposal.
    Saved to Firestore with a 7-day TTL and keccak256 hash for on-chain auditability.
    """
    db = get_db()

    # Fetch agent
    try:
        agent_doc = await db.collection(AGENTS_COLLECTION).document(agent_id).get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

    if not agent_doc.exists:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    agent_data = agent_doc.to_dict() or {}
    agent_wallet = agent_data.get("agent_wallet", "")
    agent_name = agent_data.get("agent_name", "Agent")
    niche = agent_data.get("niche", "General")
    level = agent_data.get("level", 1)
    generation = agent_data.get("generation", 1)
    genetic_traits = agent_data.get("genetic_traits") or []

    if not agent_wallet:
        raise HTTPException(status_code=400, detail="Agent has no wallet address")

    # Fetch event history for context
    event_summaries: list[str] = []
    try:
        async for ev_doc in (
            db.collection(EVENTS_COLLECTION)
            .where(filter=FieldFilter("agent_id", "==", agent_id))
            .stream()
        ):
            ev = ev_doc.to_dict() or {}
            title = ev.get("event_title", "")
            summary = ev.get("wisdom_summary", "")
            if title and summary:
                event_summaries.append(f"{title}: {summary}")
    except Exception as exc:
        logger.warning("Could not fetch event history for proposal: %s", exc)

    # Generate proposal via Gemini
    try:
        proposal_data = await generate_agent_proposal(
            agent_name=agent_name,
            niche=niche,
            level=level,
            generation=generation,
            genetic_traits=genetic_traits,
            event_summaries=event_summaries[:6],
        )
    except Exception as exc:
        logger.error("Gemini proposal generation failed for agent %s: %s", agent_id, exc)
        raise HTTPException(status_code=503, detail="Proposal generation failed — LLM unavailable")

    now = time.time()
    proposal_hash = _compute_proposal_hash(agent_wallet, proposal_data["title"], now)

    proposal_doc = {
        "agent_id": agent_id,
        "agent_wallet": agent_wallet,
        "title": proposal_data["title"],
        "description": proposal_data["description"],
        "category": proposal_data["category"],
        "proposal_hash": proposal_hash,
        "status": "pending",
        "created_at": now,
        "expires_at": now + PROPOSAL_TTL_SECONDS,
    }

    try:
        _, doc_ref = await db.collection(PROPOSALS_COLLECTION).add(proposal_doc)
    except Exception as exc:
        logger.error("Firestore proposal save failed for agent %s: %s", agent_id, exc)
        raise HTTPException(status_code=503, detail="Failed to persist proposal")

    logger.info(
        "Proposal generated for agent %s: '%s' (hash: %s)",
        agent_id, proposal_data["title"], proposal_hash[:12],
    )
    return _doc_to_response(doc_ref.id, proposal_doc)


@router.get("/api/v1/agent/{agent_id}/proposals", response_model=list[ProposalResponse])
async def list_agent_proposals(agent_id: str) -> list[ProposalResponse]:
    """Return all proposals for an agent, auto-expiring stale ones."""
    db = get_db()

    try:
        agent_doc = await db.collection(AGENTS_COLLECTION).document(agent_id).get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

    if not agent_doc.exists:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    now = time.time()
    results: list[ProposalResponse] = []

    try:
        async for doc in (
            db.collection(PROPOSALS_COLLECTION)
            .where(filter=FieldFilter("agent_id", "==", agent_id))
            .stream()
        ):
            data = doc.to_dict() or {}
            # Auto-expire: mark as expired if TTL passed and still pending
            if data.get("status") == "pending" and data.get("expires_at", 0) < now:
                try:
                    await doc.reference.update({"status": "expired"})
                    data["status"] = "expired"
                except Exception:
                    pass
            results.append(_doc_to_response(doc.id, data))
    except Exception as exc:
        logger.error("Firestore proposal list failed for agent %s: %s", agent_id, exc)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    results.sort(key=lambda p: p.created_at, reverse=True)
    logger.info("Listed %d proposals for agent %s", len(results), agent_id)
    return results


@router.post("/api/v1/proposals/{proposal_id}/approve", response_model=ProposalResponse)
async def approve_proposal(proposal_id: str, background_tasks: BackgroundTasks) -> ProposalResponse:
    """
    Validate proposal → call recordExecutedProposal() on V4 via MINTER_ROLE.
    V4 emits ProposalExecuted: +5 heritageScore on-chain.
    """
    db = get_db()

    try:
        doc = await db.collection(PROPOSALS_COLLECTION).document(proposal_id).get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Proposal not found")

    data = doc.to_dict() or {}

    if data.get("status") != "pending":
        raise HTTPException(
            status_code=422,
            detail=f"Proposal is '{data.get('status')}' — only pending proposals can be approved",
        )

    if data.get("expires_at", 0) < time.time():
        await doc.reference.update({"status": "expired"})
        raise HTTPException(status_code=422, detail="Proposal has expired")

    agent_wallet = data.get("agent_wallet", "")
    proposal_hash = data.get("proposal_hash", "")

    if not agent_wallet or not proposal_hash:
        raise HTTPException(status_code=400, detail="Proposal missing wallet or hash")

    # Call recordExecutedProposal() on V4
    try:
        result = await web3_service.send_record_executed_proposal_tx(
            agent_wallet=agent_wallet,
            proposal_hash_hex=proposal_hash,
        )
    except Exception as exc:
        logger.error("recordExecutedProposal tx failed for proposal %s: %s", proposal_id, exc)
        raise HTTPException(status_code=503, detail=f"On-chain execution failed: {exc}")

    if result.get("status") != "success":
        raise HTTPException(status_code=502, detail="Transaction reverted on-chain")

    update_payload = {
        "status": "approved",
        "tx_hash": result.get("tx_hash"),
        "heritage_score_after": result.get("heritage_score_after"),
        "proposals_approved_total": result.get("proposals_approved_total"),
        "approved_at": time.time(),
    }
    try:
        await doc.reference.update(update_payload)
    except Exception as exc:
        logger.warning("Firestore proposal update failed after on-chain success: %s", exc)

    data.update(update_payload)
    logger.info(
        "Proposal %s approved on-chain: tx=%s heritage=%s",
        proposal_id, result.get("tx_hash"), result.get("heritage_score_after"),
    )

    # ── Option A: Semi-Autonomous Execution for DeFi proposals ───────────────
    if data.get("category") == "defi":
        agent_id = data.get("agent_id", "")
        try:
            agent_doc = await db.collection(AGENTS_COLLECTION).document(agent_id).get()
            agent_data = (agent_doc.to_dict() or {}) if agent_doc.exists else {}
            stored_key = agent_data.get("private_key_enc") or agent_data.get("private_key")
            if stored_key:
                agent_private_key = decrypt_private_key(stored_key)
                background_tasks.add_task(
                    _bg_autonomous_transfer,
                    proposal_id,
                    agent_id,
                    agent_wallet,
                    agent_private_key,
                )
                try:
                    await doc.reference.update({"autonomous_execution_triggered": True})
                except Exception:
                    pass
                logger.info(
                    "Autonomous transfer queued for DeFi proposal %s (agent %s)",
                    proposal_id, agent_id,
                )
            else:
                logger.warning(
                    "Agent %s has no private key — autonomous transfer skipped for proposal %s",
                    agent_id, proposal_id,
                )
        except Exception as exc:
            logger.warning(
                "Could not queue autonomous transfer for proposal %s: %s — continuing",
                proposal_id, exc,
            )

    return _doc_to_response(proposal_id, data)


@router.post("/api/v1/proposals/{proposal_id}/reject", response_model=ProposalResponse)
async def reject_proposal(proposal_id: str) -> ProposalResponse:
    """Mark a pending proposal as rejected (no on-chain action)."""
    db = get_db()

    try:
        doc = await db.collection(PROPOSALS_COLLECTION).document(proposal_id).get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Proposal not found")

    data = doc.to_dict() or {}
    if data.get("status") != "pending":
        raise HTTPException(
            status_code=422,
            detail=f"Proposal is '{data.get('status')}' — only pending proposals can be rejected",
        )

    try:
        await doc.reference.update({"status": "rejected", "rejected_at": time.time()})
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database update failed") from exc

    data["status"] = "rejected"
    logger.info("Proposal %s rejected by user", proposal_id)
    return _doc_to_response(proposal_id, data)
