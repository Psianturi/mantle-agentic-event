"""
POST /api/v1/agent/spawn          — Spawn a new autonomous AI agent with its own wallet.
POST /api/v1/agent/breed          — Breed two agents to create an offspring agent.
GET  /api/v1/agent/list           — List all agents owned by a wallet address.
GET  /api/v1/agent/{agent_id}     — Get agent details.
POST /api/v1/agent/{agent_id}/mark-funded — Mark agent as funded on-chain.
POST /api/v1/agent/{agent_id}/wisdom      — Generate wisdom report from agent's events.

All agent state is persisted in Firestore (collection: "agents").
This ensures agent wallets and private keys survive Cloud Run cold starts.
"""

import asyncio
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
SCOUT_LOGS_COLLECTION = "scout_logs"


async def _write_scout_log(
    db,
    *,
    agent_id: str,
    action: str,
    reason_code: str,
    run_at: float,
    scheduler_run_id: str | None = None,
    score: int | None = None,
    threshold_applied: int | None = None,
    agent_gas_balance: float | None = None,
    candidate_title: str | None = None,
    candidate_url: str | None = None,
    reason_description: str | None = None,
) -> None:
    """Best-effort logging for autonomous scout decisions (never blocks main flow)."""
    log_id = f"scout_{agent_id[:8]}_{int(run_at * 1000)}_{secrets.token_hex(3)}"

    payload = {
        "log_id": log_id,
        "scheduler_run_id": scheduler_run_id,
        "agent_id": agent_id,
        "run_at": run_at,
        "action": action,
        "reason_code": reason_code,
        "metrics": {
            "score": score,
            "threshold_applied": threshold_applied,
            "agent_gas_balance": agent_gas_balance,
        },
        "candidate_source": {
            "title": candidate_title,
            "url": candidate_url,
        },
        "reason_description": reason_description,
    }

    try:
        await db.collection(SCOUT_LOGS_COLLECTION).document(log_id).set(payload)
    except Exception as exc:
        logger.warning(
            "Scout log write failed for agent %s: %s",
            agent_id,
            exc.__class__.__name__,
        )


async def _update_agent_balance_cache(doc_ref, balance: float | None) -> None:
    if balance is None:
        return

    try:
        await doc_ref.update(
            {
                "agent_gas_balance": balance,
                "mantle_balance": balance,
            }
        )
    except Exception as exc:
        logger.warning("Agent balance cache update failed: %s", exc.__class__.__name__)


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
    personality: str | None = None
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
    scout_interval_hours: int = 6
    last_scout_at: float | None = None
    autonomous_signatures: int = 0


# ── Helpers ───────────────────────────────────────────────────────────────────


def _to_response(data: dict, needs_funding: bool) -> SpawnResponse:
    """Convert a Firestore document dict to SpawnResponse (strips private_key).

    Uses explicit .get(field, default) for every optional field so legacy Firestore
    documents missing new fields never cause a KeyError or Pydantic validation failure.
    """
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
        personality=data.get("personality"),
        custom_instructions=data.get("custom_instructions"),
        auto_scout_enabled=data.get("auto_scout_enabled", False),
        scout_interval_hours=data.get("scout_interval_hours", 6),
        last_scout_at=data.get("last_scout_at"),
        custom_agenda=data.get("custom_agenda"),
        generation=data.get("generation"),
        parent_ids=data.get("parent_ids"),
        breeding_count=data.get("breeding_count"),
        max_breedings=data.get("max_breedings"),
        genetic_traits=data.get("genetic_traits"),
        last_breeding_time=data.get("last_breeding_time"),
        breeding_cooldown_hours=data.get("breeding_cooldown_hours"),
        autonomous_signatures=data.get("autonomous_signatures", 0),
    )


class BreedRequest(BaseModel):
    user_wallet: str
    parent_1_id: str
    parent_2_id: str
    offspring_name: str

    @field_validator("user_wallet")
    @classmethod
    def validate_wallet(cls, v: str) -> str:
        if not Web3.is_address(v):
            raise ValueError("Invalid Ethereum wallet address")
        return Web3.to_checksum_address(v)

    @field_validator("offspring_name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 50:
            raise ValueError("offspring_name must be 1-50 characters")
        return v


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


class ScoutLogMetricsResponse(BaseModel):
    score: int | None = None
    threshold_applied: int | None = None
    agent_gas_balance: float | None = None


class ScoutLogCandidateSourceResponse(BaseModel):
    title: str | None = None
    url: str | None = None


class ScoutLogResponse(BaseModel):
    log_id: str
    scheduler_run_id: str | None = None
    agent_id: str
    run_at: float
    action: str
    reason_code: str
    metrics: ScoutLogMetricsResponse
    candidate_source: ScoutLogCandidateSourceResponse
    reason_description: str | None = None


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

    # Per-wallet agent limit (testnet: 3, mainnet: change to 1)
    MAX_AGENTS_PER_WALLET = 3
    try:
        existing_query = db.collection(AGENTS_COLLECTION).where("user_wallet", "==", req.user_wallet)
        existing_docs = await existing_query.get()
        existing_count = len(existing_docs)
        if existing_count >= MAX_AGENTS_PER_WALLET:
            raise HTTPException(
                status_code=422,
                detail=f"Wallet has reached the maximum of {MAX_AGENTS_PER_WALLET} agents. Breed existing agents to create stronger hybrids.",
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Could not verify agent count for wallet %s: %s", req.user_wallet[:10], exc)

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
        # Autonomous scout scheduling — disabled by default, user opts in per agent
        "auto_scout_enabled": False,
        "scout_interval_hours": 6,
        "last_scout_at": None,
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


@router.post("/breed", response_model=SpawnResponse, status_code=201)
async def breed_agents(req: BreedRequest) -> SpawnResponse:
    """
    Create an offspring agent from two parent agents.

    All validation, inheritance calculation, and wallet creation happen server-side.
    Parents and offspring are written atomically in a single Firestore batch.
    Idempotent: same (parent1_id, parent2_id, offspring_name) always returns the same agent.
    """
    if req.parent_1_id == req.parent_2_id:
        raise HTTPException(status_code=400, detail="An agent cannot breed with itself")

    # Sort IDs so (A, B) and (B, A) produce the same offspring (guardrail #8)
    p1_id, p2_id = sorted([req.parent_1_id, req.parent_2_id])

    # Offspring ID is deterministic — idempotency per unique combo (guardrail #3)
    offspring_id = hashlib.sha256(
        f"breed:{p1_id}:{p2_id}:{req.offspring_name}".encode()
    ).hexdigest()[:16]

    db = get_db()
    offspring_ref = db.collection(AGENTS_COLLECTION).document(offspring_id)

    # Idempotency check — return existing if already bred
    try:
        existing = await offspring_ref.get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

    if existing.exists:
        data = existing.to_dict() or {}
        if data.get("user_wallet") != req.user_wallet:
            raise HTTPException(status_code=403, detail="This offspring does not belong to your wallet")
        logger.info("Breed idempotency hit: offspring %s already exists", offspring_id)
        return _to_response(data, needs_funding=not data.get("funded", False))

    # Fetch both parents concurrently
    try:
        p1_doc, p2_doc = await asyncio.gather(
            db.collection(AGENTS_COLLECTION).document(p1_id).get(),
            db.collection(AGENTS_COLLECTION).document(p2_id).get(),
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

    if not p1_doc.exists:
        raise HTTPException(status_code=404, detail=f"Parent agent '{p1_id}' not found")
    if not p2_doc.exists:
        raise HTTPException(status_code=404, detail=f"Parent agent '{p2_id}' not found")

    p1 = p1_doc.to_dict() or {}
    p2 = p2_doc.to_dict() or {}

    # Ownership: both parents must belong to the requesting wallet (guardrail #2)
    if p1.get("user_wallet") != req.user_wallet:
        raise HTTPException(status_code=403, detail=f"Parent '{p1_id}' does not belong to your wallet")
    if p2.get("user_wallet") != req.user_wallet:
        raise HTTPException(status_code=403, detail=f"Parent '{p2_id}' does not belong to your wallet")

    # Wisdom unlock: level >= 3 or total_events >= 5
    for p_id, p_data in [(p1_id, p1), (p2_id, p2)]:
        if p_data.get("level", 1) < 3 and p_data.get("total_events", 0) < 5:
            raise HTTPException(
                status_code=422,
                detail=f"Agent '{p_data.get('agent_name', p_id)}' needs level 3+ or 5+ events to breed",
            )

    # Breeding quota (server-authoritative — guardrail #4)
    _max_b = 3
    for p_id, p_data in [(p1_id, p1), (p2_id, p2)]:
        count = p_data.get("breeding_count") or 0
        max_b = p_data.get("max_breedings") or _max_b
        if count >= max_b:
            raise HTTPException(
                status_code=422,
                detail=f"Agent '{p_data.get('agent_name', p_id)}' has reached its breeding limit ({max_b})",
            )

    # Cooldown check (server-authoritative — guardrail #4)
    now = time.time()
    for p_id, p_data in [(p1_id, p1), (p2_id, p2)]:
        last_bt = p_data.get("last_breeding_time")
        cooldown_h = p_data.get("breeding_cooldown_hours") or 0
        if last_bt and cooldown_h:
            # Normalise: frontend sends Date.now() (ms); backend stores time.time() (s)
            last_bt_s = last_bt / 1000 if last_bt > 1e12 else last_bt
            elapsed = now - last_bt_s
            if elapsed < cooldown_h * 3600:
                remaining_h = int((cooldown_h * 3600 - elapsed) / 3600) + 1
                raise HTTPException(
                    status_code=422,
                    detail=f"Agent '{p_data.get('agent_name', p_id)}' is on cooldown for ~{remaining_h}h more",
                )

    # ── Deterministic inheritance ─────────────────────────────────────────────
    # Seed: sorted parent IDs + offspring name (guardrail: sort already applied above)
    seed_base = f"{p1_id}:{p2_id}:{req.offspring_name}"

    def _bit(salt: str) -> int:
        return int(hashlib.sha256(f"{seed_base}:{salt}".encode()).hexdigest()[0], 16) % 2

    personalities = [p1.get("personality", "Analytical"), p2.get("personality", "Analytical")]
    niches = [p1.get("niche", "Blockchain/DeFi"), p2.get("niche", "Blockchain/DeFi")]
    personality = personalities[_bit("personality")]
    offspring_niche = niches[_bit("niche")]

    total_parent_events = (p1.get("total_events") or 0) + (p2.get("total_events") or 0)
    inherited_events = total_parent_events // 3 + ((p1.get("level", 1) + p2.get("level", 1)) // 4)
    inherited_level = max(1, inherited_events // 3 + 1)
    offspring_gen = max(p1.get("generation") or 1, p2.get("generation") or 1) + 1

    # Genetic traits — fully deterministic from parent attributes (no randomness)
    genetic_traits: list[str] = []
    if p1.get("niche") == p2.get("niche"):
        genetic_traits.append("Specialized Niche Mastery")
    else:
        genetic_traits.append("Cross-Domain Intelligence")

    if p1.get("personality") == p2.get("personality"):
        genetic_traits.append("Enhanced Personality Traits")
    else:
        genetic_traits.append("Adaptive Personality Matrix")

    if total_parent_events >= 15:
        genetic_traits.append("Legendary Wisdom Heritage")
    elif total_parent_events >= 10:
        genetic_traits.append("Superior Knowledge Base")

    if offspring_gen >= 3:
        genetic_traits.append("Multi-Generation Evolution")

    # ── Generate offspring wallet + encrypt key ───────────────────────────────
    offspring_private_key = "0x" + secrets.token_hex(32)
    offspring_account = Account.from_key(offspring_private_key)

    offspring_data: dict = {
        "agent_id": offspring_id,
        "agent_wallet": offspring_account.address,
        "agent_name": req.offspring_name,
        "niche": offspring_niche,
        "personality": personality,
        "user_wallet": req.user_wallet,
        "level": inherited_level,
        "total_events": inherited_events,
        "private_key_enc": encrypt_private_key(offspring_private_key),
        "funded": False,
        "needs_funding": True,
        "created_at": now,
        "generation": offspring_gen,
        "parent_ids": [p1_id, p2_id],
        "breeding_count": 0,
        "max_breedings": 3,
        "genetic_traits": genetic_traits,
        "ownership_status": "bred",
        # Autonomous scout scheduling — disabled by default, user opts in per agent
        "auto_scout_enabled": False,
        "scout_interval_hours": 6,
        "last_scout_at": None,
    }

    # ── Atomic Firestore batch: offspring + both parents (guardrail #5) ───────
    parent1_ref = db.collection(AGENTS_COLLECTION).document(p1_id)
    parent2_ref = db.collection(AGENTS_COLLECTION).document(p2_id)

    try:
        batch = db.batch()
        batch.set(offspring_ref, offspring_data)
        batch.update(parent1_ref, {
            "breeding_count": (p1.get("breeding_count") or 0) + 1,
            "last_breeding_time": now,
            "breeding_cooldown_hours": 24,
            "max_breedings": p1.get("max_breedings") or _max_b,
        })
        batch.update(parent2_ref, {
            "breeding_count": (p2.get("breeding_count") or 0) + 1,
            "last_breeding_time": now,
            "breeding_cooldown_hours": 24,
            "max_breedings": p2.get("max_breedings") or _max_b,
        })
        await batch.commit()
    except Exception as exc:
        logger.error("Firestore batch write failed for offspring %s: %s", offspring_id, exc)
        raise HTTPException(status_code=503, detail="Failed to persist breeding result") from exc

    logger.info(
        "Bred offspring %s → wallet %s (gen %d, parents %s + %s)",
        offspring_id, offspring_account.address, offspring_gen, p1_id, p2_id,
    )
    return _to_response(offspring_data, needs_funding=True)


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


@router.get("/{agent_id}/scout-logs", response_model=list[ScoutLogResponse])
async def get_agent_scout_logs(agent_id: str) -> list[ScoutLogResponse]:
    db = get_db()

    try:
        agent_doc = await db.collection(AGENTS_COLLECTION).document(agent_id).get()
    except Exception as exc:
        logger.error("Firestore read failed for agent %s: %s", agent_id, exc)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    if not agent_doc.exists:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    logs: list[dict] = []
    try:
        async for doc in (
            db.collection(SCOUT_LOGS_COLLECTION)
            .where(filter=FieldFilter("agent_id", "==", agent_id))
            .stream()
        ):
            data = doc.to_dict() or {}
            if data:
                logs.append(data)
    except Exception as exc:
        logger.error("Firestore scout log query failed for agent %s: %s", agent_id, exc)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    logs.sort(key=lambda item: item.get("run_at", 0), reverse=True)
    return [ScoutLogResponse(**item) for item in logs[:20]]


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
    """Reply to a user message as the named agent, using Gemini with event grounding."""
    db = get_db()

    try:
        doc = await db.collection(AGENTS_COLLECTION).document(agent_id).get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    data = doc.to_dict() or {}

    # Fetch event summaries to ground the chat with real knowledge
    event_summaries: list[str] = []
    try:
        async for event_doc in (
            db.collection(EVENTS_COLLECTION)
            .where(filter=FieldFilter("agent_id", "==", agent_id))
            .stream()
        ):
            event_data = event_doc.to_dict() or {}
            title = event_data.get("event_title", "")
            summary = event_data.get("wisdom_summary", "")
            if title and summary:
                event_summaries.append(f"{title}: {summary}")
    except Exception as exc:
        logger.warning("Could not fetch event history for chat grounding: %s", exc.__class__.__name__)

    reply = await chat_with_agent(
        agent_name=data.get("agent_name", "Agent"),
        personality=data.get("personality", "Analytical"),
        niche=data.get("niche", "Blockchain/DeFi"),
        events_attended=data.get("total_events", 0),
        message=req.message,
        conversation_history=req.conversation_history,
        event_summaries=event_summaries,
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


@router.post("/{agent_id}/scout")
async def run_auto_scout(agent_id: str, scheduler_run_id: str | None = None) -> dict:
    """
    Secretary sub-agent: autonomously discover and attend a YouTube event.

    1. Secretary searches YouTube for videos matching the agent's niche.
    2. Already-attended URLs are filtered out (dedup via Firestore).
    3. Gemini picks the best candidate.
    4. Agent attends the event — Mode B if funded on-chain, Mode A fallback.

    Returns the discovered video details + full attend result.
    """
    db = get_db()
    doc_ref = db.collection(AGENTS_COLLECTION).document(agent_id)
    try:
        doc = await doc_ref.get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    data = doc.to_dict() or {}
    niche = data.get("niche", "General")
    agent_name = data.get("agent_name", "Agent")
    agent_wallet = data.get("agent_wallet", "")
    custom_instructions = data.get("custom_instructions")
    is_funded = data.get("funded", False)

    if not agent_wallet:
        raise HTTPException(status_code=400, detail="Agent has no wallet address")

    # ── Secretary: discover best YouTube event ────────────────────────────
    from services.scout_service import discover_event

    run_at = time.time()
    logger.info(
        "Auto Scout triggered for agent %s (niche=%s, scheduler_run_id=%s)",
        agent_id,
        niche,
        scheduler_run_id or "manual",
    )
    try:
        decision = await discover_event(
            agent_id=agent_id,
            niche=niche,
            agent_name=agent_name,
            agent_wallet=agent_wallet,
            custom_instructions=custom_instructions,
        )
    except RuntimeError as exc:
        msg = str(exc)
        reason_code = (
            "YOUTUBE_API_LIMIT"
            if "youtube" in msg.lower() or "quota" in msg.lower() or "api" in msg.lower()
            else "LLM_UNAVAILABLE"
        )
        await _write_scout_log(
            db,
            agent_id=agent_id,
            action="SKIPPED",
            reason_code=reason_code,
            run_at=run_at,
            scheduler_run_id=scheduler_run_id,
            reason_description=msg,
        )
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("Secretary discovery failed for agent %s: %s", agent_id, exc)
        await _write_scout_log(
            db,
            agent_id=agent_id,
            action="SKIPPED",
            reason_code="LLM_UNAVAILABLE",
            run_at=run_at,
            scheduler_run_id=scheduler_run_id,
            reason_description="Discovery failed before mint decision",
        )
        raise HTTPException(status_code=500, detail="Event discovery failed")

    if decision.get("status") != "ready_to_mint":
        candidate = decision.get("candidate") or {}
        balance = decision.get("agent_gas_balance")
        await _update_agent_balance_cache(doc_ref, balance)
        await _write_scout_log(
            db,
            agent_id=agent_id,
            action="SKIPPED",
            reason_code=decision.get("reason_code", "NO_NEW_EVENTS"),
            run_at=run_at,
            scheduler_run_id=scheduler_run_id,
            score=decision.get("score"),
            threshold_applied=decision.get("threshold_applied"),
            agent_gas_balance=balance,
            candidate_title=candidate.get("title"),
            candidate_url=candidate.get("url"),
            reason_description=decision.get("message") or "Auto Scout skipped by policy.",
        )
        return {
            "status": "no_new_events" if decision.get("reason_code") == "NO_NEW_EVENTS" else "skipped",
            "message": decision.get("message") or "Auto Scout skipped by policy.",
            "agent_id": agent_id,
            "reason_code": decision.get("reason_code"),
            "decision_metrics": {
                "score": decision.get("score"),
                "threshold_applied": decision.get("threshold_applied"),
                "agent_gas_balance": balance,
            },
        }

    video = decision["candidate"]

    logger.info(
        "Secretary selected '%s' for agent %s (reason: %s)",
        video["title"], agent_id, video.get("scout_reason", "N/A"),
    )

    # ── Mint-Master: attend the discovered event ──────────────────────────
    from routers.events import AttendRequest, attend_event

    attend_req = AttendRequest(
        agent_id=agent_id,
        agent_wallet=agent_wallet,
        agent_name=agent_name,
        event_url=video["url"],
        event_title=video["title"],
        platform="YouTube",
        niche=niche,
        mode_b=is_funded,
    )

    try:
        attend_result = await attend_event(attend_req)
    except HTTPException as exc:
        reason_code = "LLM_UNAVAILABLE"
        reason_description = "Attend stage rejected"
        detail = exc.detail
        balance = decision.get("agent_gas_balance")

        if isinstance(detail, dict):
            code = detail.get("code")
            if code == "AGENT_OUT_OF_GAS":
                reason_code = "LOW_GAS"
            elif code == "MODE_B_STRICT_REJECTED":
                reason_code = "LLM_UNAVAILABLE"
            elif code == "AGENT_NOT_AUTHORIZED":
                reason_code = "LLM_UNAVAILABLE"
            reason_description = str(detail.get("message") or reason_description)
        elif isinstance(detail, str):
            lower = detail.lower()
            if "youtube" in lower and ("quota" in lower or "limit" in lower or "429" in lower):
                reason_code = "YOUTUBE_API_LIMIT"
            elif "out of gas" in lower:
                reason_code = "LOW_GAS"
            reason_description = detail

        await _write_scout_log(
            db,
            agent_id=agent_id,
            action="SKIPPED",
            reason_code=reason_code,
            run_at=run_at,
            scheduler_run_id=scheduler_run_id,
            score=decision.get("score"),
            threshold_applied=decision.get("threshold_applied"),
            agent_gas_balance=balance,
            candidate_title=video.get("title"),
            candidate_url=video.get("url"),
            reason_description=reason_description,
        )
        await _update_agent_balance_cache(doc_ref, balance)
        raise
    except Exception as exc:
        logger.error("Auto Scout attend failed for agent %s: %s", agent_id, exc)
        await _write_scout_log(
            db,
            agent_id=agent_id,
            action="SKIPPED",
            reason_code="LLM_UNAVAILABLE",
            run_at=run_at,
            scheduler_run_id=scheduler_run_id,
            score=decision.get("score"),
            threshold_applied=decision.get("threshold_applied"),
            agent_gas_balance=decision.get("agent_gas_balance"),
            candidate_title=video.get("title"),
            candidate_url=video.get("url"),
            reason_description="Event attendance failed after discovery",
        )
        await _update_agent_balance_cache(doc_ref, decision.get("agent_gas_balance"))
        raise HTTPException(status_code=500, detail="Event attendance failed after discovery")

    try:
        from services.web3_service import web3_service

        gas_balance = await web3_service.get_native_balance(agent_wallet)
    except Exception:
        gas_balance = decision.get("agent_gas_balance")

    await _update_agent_balance_cache(doc_ref, gas_balance)

    await _write_scout_log(
        db,
        agent_id=agent_id,
        action="MINTED",
        reason_code="MINTED",
        run_at=run_at,
        scheduler_run_id=scheduler_run_id,
        score=decision.get("score"),
        threshold_applied=decision.get("threshold_applied"),
        agent_gas_balance=gas_balance,
        candidate_title=video.get("title"),
        candidate_url=video.get("url"),
        reason_description=video.get("scout_reason") or "Minted after secretary selection",
    )

    return {
        "status": "attended",
        "agent_id": agent_id,
        "discovered": {
            "url": video["url"],
            "title": video["title"],
            "channel": video.get("channel", ""),
            "scout_reason": video.get("scout_reason", ""),
        },
        "decision_metrics": {
            "score": decision.get("score"),
            "threshold_applied": decision.get("threshold_applied"),
            "agent_gas_balance": gas_balance,
        },
        "attend_result": {
            "success": attend_result.success,
            "tx_hash": attend_result.tx_hash,
            "token_id": attend_result.token_id,
            "wisdom_summary": attend_result.wisdom_summary,
            "explorer_url": attend_result.explorer_url,
            "new_total_events": attend_result.new_total_events,
            "new_level": attend_result.new_level,
        },
    }
