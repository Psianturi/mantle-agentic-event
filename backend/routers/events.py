"""
POST /api/v1/event/attend  — Core agentic workflow.

Flow:
  A) Validate & sanitise event URL (SSRF guard)
  B) Gemini generates a Wisdom Summary from event metadata
  C) Backend signs & sends mintAttendanceNFT() to Mantle Sepolia
  D) Return tx hash + token ID + wisdom summary to frontend
"""

import logging
import time
from urllib.parse import urlparse

from fastapi import APIRouter, HTTPException, Query
from google.cloud.firestore_v1 import Increment
from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import BaseModel, field_validator
from web3 import Web3

from core.config import settings
from core.database import get_db
from services.llm_service import summarize_event
from services.web3_service import web3_service

AGENTS_COLLECTION = "agents"
EVENTS_COLLECTION = "agent_events"

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/event", tags=["events"])

# Allowlist mirrors the frontend's cloudRunService.ts validateEventUrl()
_ALLOWED_HOSTS: frozenset[str] = frozenset(
    {
        "youtube.com",
        "www.youtube.com",
        "youtu.be",
        "lu.ma",
        "luma.com",
        "eventbrite.com",
        "www.eventbrite.com",
        "zoom.us",
    }
)

_MANTLE_EXPLORER_BY_CHAIN: dict[int, str] = {
    5003: "https://explorer.sepolia.mantle.xyz",
    5000: "https://explorer.mantle.xyz",
}


# ── Request / Response models ─────────────────────────────────────────────────


class AttendRequest(BaseModel):
    agent_id: str
    agent_wallet: str       # NFT recipient (agent's derived address or user's wallet)
    agent_name: str
    event_url: str
    event_title: str
    platform: str = "YouTube"
    niche: str = "General"

    @field_validator("agent_wallet")
    @classmethod
    def validate_wallet(cls, v: str) -> str:
        if not Web3.is_address(v):
            raise ValueError("Invalid Ethereum wallet address")
        return Web3.to_checksum_address(v)

    @field_validator("event_url")
    @classmethod
    def validate_event_url(cls, v: str) -> str:
        parsed = urlparse(v)
        if parsed.scheme != "https":
            raise ValueError("Event URL must use HTTPS")
        if parsed.hostname not in _ALLOWED_HOSTS:
            raise ValueError(
                f"Host '{parsed.hostname}' is not in the allowed event URL list"
            )
        return v


class AttendResponse(BaseModel):
    success: bool
    tx_hash: str | None
    token_id: str | None
    wisdom_summary: str
    gas_used: str | None
    block_number: int | None
    explorer_url: str | None
    level_up: bool
    new_total_events: int | None = None
    new_level: int | None = None


class EventHistoryItem(BaseModel):
    id: str
    agent_id: str
    event_url: str
    event_title: str
    platform: str
    wisdom_summary: str
    tx_hash: str | None
    token_id: str | None
    gas_used: str | None
    block_number: int | None
    attended_at: float
    explorer_url: str | None


# ── Endpoint ──────────────────────────────────────────────────────────────────


@router.get("/list", response_model=list[EventHistoryItem])
async def list_events_by_wallet(
    wallet: str = Query(..., description="Owner wallet address (checksummed Ethereum address)"),
) -> list[EventHistoryItem]:
    """
    Return all persisted event records for agents owned by the wallet.

    This powers cross-device NFT/Event restoration on frontend wallet connect.
    """
    if not Web3.is_address(wallet):
        raise HTTPException(status_code=400, detail="Invalid wallet address")
    wallet = Web3.to_checksum_address(wallet)

    db = get_db()
    explorer_base = _MANTLE_EXPLORER_BY_CHAIN.get(
        settings.chain_id, "https://explorer.sepolia.mantle.xyz"
    )

    agent_ids: list[str] = []
    try:
        async for doc in (
            db.collection(AGENTS_COLLECTION)
            .where(filter=FieldFilter("user_wallet", "==", wallet))
            .stream()
        ):
            data = doc.to_dict() or {}
            agent_id = data.get("agent_id")
            if isinstance(agent_id, str) and agent_id:
                agent_ids.append(agent_id)
    except Exception as exc:
        logger.error("Firestore agent lookup failed for wallet %s: %s", wallet, exc)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    if not agent_ids:
        return []

    records: list[dict] = []
    try:
        for agent_id in agent_ids:
            async for doc in (
                db.collection(EVENTS_COLLECTION)
                .where(filter=FieldFilter("agent_id", "==", agent_id))
                .stream()
            ):
                data = doc.to_dict() or {}
                records.append(
                    {
                        "id": doc.id,
                        "agent_id": data.get("agent_id", agent_id),
                        "event_url": data.get("event_url", ""),
                        "event_title": data.get("event_title", "Event"),
                        "platform": data.get("platform", "YouTube"),
                        "wisdom_summary": data.get("wisdom_summary", ""),
                        "tx_hash": data.get("tx_hash"),
                        "token_id": data.get("token_id"),
                        "gas_used": data.get("gas_used"),
                        "block_number": data.get("block_number"),
                        "attended_at": float(data.get("attended_at", 0.0)),
                    }
                )
    except Exception as exc:
        logger.error("Firestore event query failed for wallet %s: %s", wallet, exc)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    records.sort(key=lambda r: r.get("attended_at", 0.0), reverse=True)
    result: list[EventHistoryItem] = []
    for item in records:
        tx_hash = item.get("tx_hash")
        result.append(
            EventHistoryItem(
                **item,
                explorer_url=f"{explorer_base}/tx/{tx_hash}" if tx_hash else None,
            )
        )

    logger.info("Listed %d persisted events for wallet %s", len(result), wallet[:10])
    return result


@router.post("/attend", response_model=AttendResponse)
async def attend_event(req: AttendRequest) -> AttendResponse:
    """
    Autonomous event-attendance workflow.

    Step A — AI: Gemini generates a Wisdom Summary for the event.
    Step B — Web3: backend wallet signs mintAttendanceNFT() and broadcasts it.
    Step C — Return: tx hash, token ID, explorer link, and wisdom text.
    """
    # Guard: contract must be deployed before minting
    if not settings.contract_address or not Web3.is_address(settings.contract_address):
        raise HTTPException(
            status_code=503,
            detail=(
                "Smart contract is not configured. "
                "Deploy the contract and set CONTRACT_ADDRESS env var."
            ),
        )

    # ── Step A: Wisdom Summary ─────────────────────────────────────────────
    wisdom_summary = await summarize_event(
        event_title=req.event_title,
        event_url=req.event_url,
        platform=req.platform,
        agent_name=req.agent_name,
    )
    logger.info("Wisdom generated for agent %s: %.80s", req.agent_id, wisdom_summary)

    # ── Steps B + C: Mint on Mantle (Mode A: master key / MINTER_ROLE) ─────
    # Backend deployer wallet holds MINTER_ROLE and signs all mint txs.
    # NFT is minted TO the agent_wallet (agent keeps identity + ownership).
    # agent_private_key=None triggers fallback to AGENT_PRIVATE_KEY env var.
    try:
        mint_result = await web3_service.mint_attendance_nft(
            agent_wallet=req.agent_wallet,
            event_title=req.event_title,
            event_url=req.event_url,
            platform=req.platform,
            agent_name=req.agent_name,
            summary=wisdom_summary,
            niche=req.niche,
            agent_private_key=None,  # Mode A: master key (MINTER_ROLE) signs
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except ConnectionError as exc:
        raise HTTPException(
            status_code=503, detail=f"Mantle RPC unavailable: {exc}"
        )
    except Exception as exc:
        logger.error("mintAttendanceNFT failed for agent %s: %s", req.agent_id, exc)
        raise HTTPException(
            status_code=500,
            detail="NFT minting failed. Check Cloud Run logs for details.",
        )

    tx_hash = mint_result.get("tx_hash")
    success = mint_result.get("status") == "success"
    level_up = mint_result.get("level_up", False)
    explorer_base = _MANTLE_EXPLORER_BY_CHAIN.get(
        settings.chain_id, "https://explorer.sepolia.mantle.xyz"
    )

    # ── Update agent stats in Firestore ───────────────────────────────────
    new_total_events: int | None = None
    new_level: int | None = None
    if success:
        db = get_db()
        agent_ref = db.collection(AGENTS_COLLECTION).document(req.agent_id)
        try:
            agent_doc = await agent_ref.get()
            if agent_doc.exists:
                data = agent_doc.to_dict() or {}
                current_events = data.get("total_events", 0) + 1
                current_level = data.get("level", 1)
                # Level formula: every 2 events = +1 level (matches frontend)
                new_level = max(current_level, (current_events // 2) + 1)
                if level_up and new_level <= current_level:
                    new_level = current_level + 1
                update_payload: dict = {
                    "total_events": Increment(1),
                    "level": new_level,
                }
                await agent_ref.update(update_payload)
                new_total_events = current_events
                logger.info(
                    "Agent %s stats updated: total_events=%d level=%d",
                    req.agent_id, current_events, new_level,
                )
            else:
                logger.warning("Agent %s not found in Firestore — skipping stat update", req.agent_id)
        except Exception as exc:
            # Non-fatal: mint succeeded, stats update is best-effort
            logger.error("Firestore agent stat update failed for %s: %s", req.agent_id, exc)

        # ── Persist event record in Firestore ─────────────────────────────
        try:
            event_doc = {
                "agent_id": req.agent_id,
                "agent_wallet": req.agent_wallet,
                "event_url": req.event_url,
                "event_title": req.event_title,
                "platform": req.platform,
                "wisdom_summary": wisdom_summary,
                "tx_hash": tx_hash,
                "token_id": mint_result.get("token_id"),
                "gas_used": str(mint_result.get("gas_used", "")),
                "block_number": mint_result.get("block_number"),
                "attended_at": time.time(),
            }
            await db.collection(EVENTS_COLLECTION).add(event_doc)
        except Exception as exc:
            logger.error("Firestore event record save failed for agent %s: %s", req.agent_id, exc)

    return AttendResponse(
        success=success,
        tx_hash=tx_hash,
        token_id=mint_result.get("token_id"),
        wisdom_summary=wisdom_summary,
        gas_used=mint_result.get("gas_used"),
        block_number=mint_result.get("block_number"),
        explorer_url=f"{explorer_base}/tx/{tx_hash}" if tx_hash else None,
        level_up=level_up,
        new_total_events=new_total_events,
        new_level=new_level,
    )
