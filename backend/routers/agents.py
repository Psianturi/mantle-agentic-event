"""
POST /api/v1/agent/spawn          — Spawn a new autonomous AI agent with its own wallet.
GET  /api/v1/agent/list           — List all agents owned by a wallet address.
GET  /api/v1/agent/{agent_id}     — Get agent details.
POST /api/v1/agent/{agent_id}/mark-funded — Mark agent as funded on-chain.
POST /api/v1/agent/{agent_id}/wisdom      — Generate wisdom report from agent's events.

All agent state is persisted in Firestore (collection: "agents").
This ensures agent wallets and private keys survive Cloud Run cold starts.
"""

import hashlib
import logging
import secrets
import time

from eth_account import Account
from fastapi import APIRouter, HTTPException, Query
from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import BaseModel, field_validator
from web3 import Web3

from core.database import get_db
from core.kms_service import decrypt_private_key, encrypt_private_key
from services.llm_service import chat_with_agent, generate_wisdom_report

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/agent", tags=["agents"])

AGENTS_COLLECTION = "agents"


# ── Request / Response models ─────────────────────────────────────────────────


class SpawnRequest(BaseModel):
    user_wallet: str
    agent_name: str
    niche: str = "General"

    @field_validator("user_wallet")
    @classmethod
    def validate_wallet(cls, v: str) -> str:
        if not Web3.is_address(v):
            raise ValueError("Invalid Ethereum wallet address")
        return Web3.to_checksum_address(v)


class SpawnResponse(BaseModel):
    agent_id: str
    agent_wallet: str
    agent_name: str
    niche: str
    user_wallet: str
    level: int
    total_events: int
    created_at: float
    needs_funding: bool  # True if agent needs spawnAgent() call on-chain
    custom_instructions: str | None = None
    auto_scout_enabled: bool | None = None
    custom_agenda: str | None = None
    generation: int | None = None
    parent_ids: list[str] | None = None
    breeding_count: int | None = None
    max_breedings: int | None = None
    genetic_traits: list[str] | None = None
    last_breeding_time: float | None = None
    breeding_cooldown_hours: int | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────


def _to_response(data: dict, needs_funding: bool) -> SpawnResponse:
    """Convert a Firestore document dict to SpawnResponse (strips private_key)."""
    return SpawnResponse(
        agent_id=data["agent_id"],
        agent_wallet=data["agent_wallet"],
        agent_name=data["agent_name"],
        niche=data["niche"],
        user_wallet=data["user_wallet"],
        level=data.get("level", 1),
        total_events=data.get("total_events", 0),
        created_at=data.get("created_at", 0.0),
        needs_funding=needs_funding,
        custom_instructions=data.get("custom_instructions"),
        auto_scout_enabled=data.get("auto_scout_enabled"),
        custom_agenda=data.get("custom_agenda"),
        generation=data.get("generation"),
        parent_ids=data.get("parent_ids"),
        breeding_count=data.get("breeding_count"),
        max_breedings=data.get("max_breedings"),
        genetic_traits=data.get("genetic_traits"),
        last_breeding_time=data.get("last_breeding_time"),
        breeding_cooldown_hours=data.get("breeding_cooldown_hours"),
    )


class UpdateAgentStateRequest(BaseModel):
    custom_instructions: str | None = None
    auto_scout_enabled: bool | None = None
    custom_agenda: str | None = None
    generation: int | None = None
    parent_ids: list[str] | None = None
    breeding_count: int | None = None
    max_breedings: int | None = None
    genetic_traits: list[str] | None = None
    last_breeding_time: float | None = None
    breeding_cooldown_hours: int | None = None


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/spawn", response_model=SpawnResponse, status_code=201)
async def spawn_agent(req: SpawnRequest) -> SpawnResponse:
    """
    Creates a new AI agent with its own autonomous wallet, persisted in Firestore.

    The agent's private key is stored in Firestore so it survives Cloud Run
    cold starts. The user must call spawnAgent() on the smart contract to
    fund the agent with 0.5 MNT for gas autonomy.
    """
    agent_id = hashlib.sha256(
        f"{req.user_wallet}:{req.agent_name}".encode()
    ).hexdigest()[:16]

    db = get_db()
    doc_ref = db.collection(AGENTS_COLLECTION).document(agent_id)

    try:
        doc = await doc_ref.get()
    except Exception as exc:
        logger.error("Firestore read failed for agent %s: %s", agent_id, exc)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    if doc.exists:
        logger.info("Returning existing agent %s from Firestore", agent_id)
        data = doc.to_dict()
        return _to_response(data, needs_funding=not data.get("funded", False))

    # Generate a new random wallet (true autonomy — unique private key per agent)
    private_key = "0x" + secrets.token_hex(32)
    agent_account = Account.from_key(private_key)
    now = time.time()

    agent_data: dict = {
        "agent_id": agent_id,
        "agent_wallet": agent_account.address,
        "agent_name": req.agent_name,
        "niche": req.niche,
        "user_wallet": req.user_wallet,
        "level": 1,
        "total_events": 0,
        "private_key_enc": encrypt_private_key(private_key),
        "funded": False,
        "created_at": now,
    }

    try:
        await doc_ref.set(agent_data)
    except Exception as exc:
        logger.error("Firestore write failed for agent %s: %s", agent_id, exc)
        raise HTTPException(status_code=503, detail="Failed to persist agent to database")

    logger.info(
        "Spawned new agent %s → wallet %s (persisted in Firestore)",
        agent_id,
        agent_account.address,
    )
    return _to_response(agent_data, needs_funding=True)


@router.get("/list")
async def list_agents_by_wallet(
    wallet: str = Query(..., description="Owner wallet address (checksummed Ethereum address)"),
) -> list[SpawnResponse]:
    """
    Return all agents belonging to the given wallet address.
    Called by the frontend on wallet connect to restore agent state from Firestore.
    """
    if not Web3.is_address(wallet):
        raise HTTPException(status_code=400, detail="Invalid wallet address")
    wallet = Web3.to_checksum_address(wallet)

    db = get_db()
    result: list[SpawnResponse] = []

    try:
        async for doc in (
            db.collection(AGENTS_COLLECTION)
            .where(filter=FieldFilter("user_wallet", "==", wallet))
            .stream()
        ):
            data = doc.to_dict()
            if data:
                result.append(_to_response(data, needs_funding=not data.get("funded", False)))
    except Exception as exc:
        logger.error("Firestore query failed for wallet %s: %s", wallet, exc)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    logger.info("Listed %d agents for wallet %s", len(result), wallet[:10])
    return result


@router.get("/{agent_id}", response_model=SpawnResponse)
async def get_agent(agent_id: str) -> SpawnResponse:
    """Retrieve agent info by agent_id."""
    db = get_db()

    try:
        doc = await db.collection(AGENTS_COLLECTION).document(agent_id).get()
    except Exception as exc:
        logger.error("Firestore read failed for agent %s: %s", agent_id, exc)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    data = doc.to_dict()
    return _to_response(data, needs_funding=not data.get("funded", False))


@router.post("/{agent_id}/mark-funded")
async def mark_agent_funded(agent_id: str) -> dict:
    """
    Mark agent as funded after spawnAgent() transaction succeeds on-chain.
    Called by frontend after user confirms spawnAgent() on smart contract.
    """
    db = get_db()
    doc_ref = db.collection(AGENTS_COLLECTION).document(agent_id)

    try:
        doc = await doc_ref.get()
    except Exception as exc:
        logger.error("Firestore read failed for agent %s: %s", agent_id, exc)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    try:
        await doc_ref.update({"funded": True})
    except Exception as exc:
        logger.error("Firestore update failed for agent %s: %s", agent_id, exc)
        raise HTTPException(status_code=503, detail="Failed to update agent in database")

    logger.info("Agent %s marked as funded in Firestore", agent_id)
    return {"status": "success", "agent_id": agent_id, "funded": True}


@router.patch("/{agent_id}/state")
async def update_agent_state(agent_id: str, req: UpdateAgentStateRequest) -> dict:
    """Persist frontend-owned agent state so it survives refresh/reconnect."""
    db = get_db()
    doc_ref = db.collection(AGENTS_COLLECTION).document(agent_id)

    try:
        doc = await doc_ref.get()
    except Exception as exc:
        logger.error("Firestore read failed for agent %s: %s", agent_id, exc)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    payload = req.model_dump(exclude_none=True)
    if not payload:
        return {"status": "noop", "agent_id": agent_id, "updated_fields": []}

    try:
        await doc_ref.update(payload)
    except Exception as exc:
        logger.error("Firestore update failed for agent %s: %s", agent_id, exc)
        raise HTTPException(status_code=503, detail="Failed to update agent state")

    return {
        "status": "success",
        "agent_id": agent_id,
        "updated_fields": sorted(payload.keys()),
    }


async def get_agent_private_key(agent_id: str) -> str:
    """
    Internal helper: retrieve agent's private key from Firestore.
    Used by backend services for autonomous transaction signing.
    Never exposed via API endpoints.
    """
    db = get_db()

    try:
        doc = await db.collection(AGENTS_COLLECTION).document(agent_id).get()
    except Exception as exc:
        raise ValueError(f"Firestore read failed: {exc}") from exc

    if not doc.exists:
        raise ValueError(f"Agent '{agent_id}' not found in database")

    data = doc.to_dict()
    # Support both legacy field name and new encrypted field
    stored = (data.get("private_key_enc") or data.get("private_key")) if data else None

    if not stored:
        raise ValueError(f"Agent '{agent_id}' has no private key stored")

    return decrypt_private_key(stored)


EVENTS_COLLECTION = "agent_events"


class ChatRequest(BaseModel):
    message: str
    conversation_history: list[str] = []


@router.post("/{agent_id}/chat")
async def agent_chat(agent_id: str, req: ChatRequest) -> dict:
    """Reply to a user message as the named agent, using Gemini."""
    db = get_db()

    try:
        doc = await db.collection(AGENTS_COLLECTION).document(agent_id).get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    data = doc.to_dict() or {}
    reply = await chat_with_agent(
        agent_name=data.get("agent_name", "Agent"),
        personality=data.get("personality", "Analytical"),
        niche=data.get("niche", "Blockchain/DeFi"),
        events_attended=data.get("total_events", 0),
        message=req.message,
        conversation_history=req.conversation_history,
    )
    return {"reply": reply}


@router.post("/{agent_id}/wisdom")
async def generate_agent_wisdom(agent_id: str) -> dict:
    """
    Generate a Wisdom Report by analysing all events the agent has attended.
    Reads event summaries from Firestore and calls Gemini for analysis.
    """
    db = get_db()

    # Fetch agent to get niche
    try:
        agent_doc = await db.collection(AGENTS_COLLECTION).document(agent_id).get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

    if not agent_doc.exists:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    agent_data = agent_doc.to_dict() or {}
    niche = agent_data.get("niche", "Blockchain/DeFi")

    # Fetch all event records for this agent
    summaries: list[str] = []
    event_titles: list[str] = []
    try:
        async for doc in (
            db.collection(EVENTS_COLLECTION)
            .where(filter=FieldFilter("agent_id", "==", agent_id))
            .stream()
        ):
            data = doc.to_dict() or {}
            title = data.get("event_title", "")
            summary = data.get("wisdom_summary", "")
            if title and summary:
                summaries.append(f"{title}: {summary}")
                event_titles.append(title)
    except Exception as exc:
        logger.error("Firestore event query failed for agent %s: %s", agent_id, exc)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

    if not summaries:
        raise HTTPException(
            status_code=422,
            detail="No attended events found for this agent. Attend at least one event first.",
        )

    report = await generate_wisdom_report(niche=niche, event_summaries=summaries)

    return {
        "agent_id": agent_id,
        "niche": niche,
        "events_analyzed": len(summaries),
        "event_titles": event_titles,
        "insights": report["insights"],
        "strategic_tips": report["strategic_tips"],
        "generated_at": time.time(),
    }
