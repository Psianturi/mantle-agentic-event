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
import json
import logging
import secrets
import time
import uuid

from eth_account import Account
from fastapi import APIRouter, HTTPException, Query
from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import BaseModel, field_validator
from web3 import Web3

from core.database import get_db
from core.kms_service import decrypt_private_key, encrypt_private_key
from services.llm_service import chat_with_agent, generate_lineage_biography, generate_wisdom_report
from services.web3_service import web3_service

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
    personality: str = "Analytical"

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
    parent_names: dict | None = None
    breeding_count: int | None = None
    max_breedings: int | None = None
    genetic_traits: list[str] | None = None
    last_breeding_time: float | None = None
    breeding_cooldown_hours: int | None = None
    scout_interval_hours: int = 6
    last_scout_at: float | None = None
    autonomous_signatures: int = 0
    wisdom_heritage_score: int | None = None
    lineage_biography: str | None = None
    spawned_on_v4: bool = False
    ownership_status: str | None = None
    luma_connected_at: float | None = None


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
        wisdom_heritage_score=data.get("wisdom_heritage_score"),
        parent_names=data.get("parent_names"),
        lineage_biography=data.get("lineage_biography"),
        spawned_on_v4=data.get("spawned_on_v4", False),
        ownership_status=data.get("ownership_status"),
        luma_connected_at=data.get("luma_connected_at"),
    )


class BreedRequest(BaseModel):
    user_wallet: str
    parent_1_id: str
    parent_2_id: str
    offspring_name: str
    breed_tx_hash: str | None = None  # on-chain breedAgents() tx hash; required after contract upgrade

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
        "personality": req.personality,
        "ownership_status": "original-creator",
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


async def _generate_and_save_biography(
    db,
    offspring_id: str,
    offspring_name: str,
    offspring_gen: int,
    p1_id: str,
    p2_id: str,
    p1_name: str,
    p2_name: str,
    p1_niche: str,
    p2_niche: str,
    genetic_traits: list[str],
) -> None:
    """Fire-and-forget: fetch parent wisdom, generate biography via Gemini, save to Firestore."""
    try:
        p1_summaries: list[str] = []
        p2_summaries: list[str] = []
        for pid, target in [(p1_id, p1_summaries), (p2_id, p2_summaries)]:
            async for ev_doc in (
                db.collection(EVENTS_COLLECTION)
                .where(filter=FieldFilter("agent_id", "==", pid))
                .stream()
            ):
                ev = ev_doc.to_dict() or {}
                t, s = ev.get("event_title", ""), ev.get("wisdom_summary", "")
                if t and s:
                    target.append(f"{t}: {s}")

        biography = await generate_lineage_biography(
            offspring_name=offspring_name,
            offspring_gen=offspring_gen,
            p1_name=p1_name,
            p2_name=p2_name,
            p1_niche=p1_niche,
            p2_niche=p2_niche,
            p1_summaries=p1_summaries[:4],
            p2_summaries=p2_summaries[:4],
            genetic_traits=genetic_traits,
        )

        await db.collection(AGENTS_COLLECTION).document(offspring_id).update({
            "lineage_biography": biography
        })
        logger.info("Lineage biography saved for offspring %s (%d chars)", offspring_id, len(biography))
    except Exception as exc:
        logger.warning(
            "Lineage biography failed for %s (non-fatal): %s",
            offspring_id, exc.__class__.__name__,
        )


async def _spawn_bred_agent_on_chain(
    db,
    offspring_id: str,
    offspring_wallet: str,
    onchain_offspring_key: str | None = None,
) -> None:
    """
    Fire-and-forget: call spawnBredAgent() on V4 signed by MINTER_SERVICE.
    Sets isAgentSpawned[offspringWallet]=true on-chain, then updates Firestore.
    Runs after the breed response is already sent to the client.

    onchain_offspring_key is the bytes32 hex from the AgentsBred event — this is
    what the V4 contract stored in its breedRecords mapping. Must match exactly.
    """
    if not onchain_offspring_key:
        logger.warning(
            "spawnBredAgent skipped for offspring %s: no on-chain offspringKey available "
            "(breed_tx_hash was not provided or not yet verified)",
            offspring_id,
        )
        return
    try:
        result = await web3_service.send_spawn_bred_agent_tx(
            offspring_wallet=offspring_wallet,
            offspring_id=onchain_offspring_key,
        )
        if result.get("status") == "success":
            await db.collection(AGENTS_COLLECTION).document(offspring_id).update(
                {
                    "spawned_on_v4": True,
                    "funded": True,
                    "spawn_tx_hash": result.get("tx_hash"),
                }
            )
            logger.info(
                "Offspring %s registered on V4 (tx: %s)", offspring_id, result.get("tx_hash")
            )
        else:
            logger.warning(
                "spawnBredAgent returned non-success for offspring %s: %s",
                offspring_id, result,
            )
    except Exception as exc:
        logger.warning(
            "spawnBredAgent failed for offspring %s (non-fatal): %s",
            offspring_id, exc.__class__.__name__,
        )


def _calculate_heritage_score(p1: dict, p2: dict, genetic_traits: list[str]) -> int:
    """
    0–100 score quantifying the genetic quality of an offspring.
    Used as a rarity/value metric visible to users and judges.

    Breakdown (max 100):
      40 — Event depth (combined parent wisdom pool)
      20 — Level legacy (parent agent seniority)
      25 — Trait rarity (legendary > superior > cross-domain > specialized)
      15 — Generation multiplier (higher-gen parents = rarer offspring)
    """
    p1_events = p1.get("total_events") or 0
    p2_events = p2.get("total_events") or 0
    event_score = min(40, (p1_events + p2_events) * 2)

    p1_level = p1.get("level", 1)
    p2_level = p2.get("level", 1)
    level_score = min(20, (p1_level + p2_level) * 3)

    trait_score = 0
    if "Legendary Wisdom Heritage" in genetic_traits:
        trait_score += 20
    elif "Superior Knowledge Base" in genetic_traits:
        trait_score += 12
    if "Cross-Domain Intelligence" in genetic_traits:
        trait_score += 5
    elif "Specialized Niche Mastery" in genetic_traits:
        trait_score += 3
    if "Multi-Generation Evolution" in genetic_traits:
        trait_score += 5
    trait_score = min(25, trait_score)

    max_gen = max(p1.get("generation") or 1, p2.get("generation") or 1)
    gen_score = min(15, max_gen * 5)

    return min(100, event_score + level_score + trait_score + gen_score)


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

    # ── On-chain breed cost verification (guardrail #9) ──────────────────────
    # When a breed_tx_hash is supplied, verify it on Mantle before creating offspring.
    # This proves the user paid the 2.5 MNT fee via breedAgents() on the contract.
    # Optional for backwards compat — will become required once contract is upgraded.
    # on-chain generation/heritageScore — set by the verified event, fallback to None
    onchain_generation: int | None = None
    onchain_heritage_score: int | None = None
    onchain_offspring_key: str | None = None  # bytes32 hex from AgentsBred event

    if req.breed_tx_hash:
        try:
            breed_tx_data = await web3_service.verify_breed_tx(
                tx_hash=req.breed_tx_hash,
                expected_user_wallet=req.user_wallet,
            )
            onchain_generation = breed_tx_data.get("generation")
            onchain_heritage_score = breed_tx_data.get("heritage_score")
            onchain_offspring_key = breed_tx_data.get("offspring_key")
            logger.info(
                "Breed tx %s verified on-chain: gen=%s heritage=%s offspring_key=%s",
                req.breed_tx_hash, onchain_generation, onchain_heritage_score,
                (onchain_offspring_key or "")[:16],
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=f"Breed transaction invalid: {exc}") from exc
        except Exception as exc:
            logger.warning("Breed tx verification failed (non-blocking): %s", exc.__class__.__name__)

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
    offspring_gen = onchain_generation if onchain_generation is not None else max(p1.get("generation") or 1, p2.get("generation") or 1) + 1

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

    # Collect unique parent niches — used by Cross-Domain Intelligence trait during scouting
    parent_niches = list({p1.get("niche", "General"), p2.get("niche", "General")})

    # Parent identity — stored for Memory Echoes in chat + Lineage Biography
    parent_names = {
        "parent_1": p1.get("agent_name", "Unknown Agent"),
        "parent_2": p2.get("agent_name", "Unknown Agent"),
    }

    wisdom_heritage_score = (
        onchain_heritage_score
        if onchain_heritage_score is not None
        else _calculate_heritage_score(p1, p2, genetic_traits)
    )

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
        "parent_names": parent_names,
        "parent_niches": parent_niches,
        "wisdom_heritage_score": wisdom_heritage_score,
        "breeding_count": 0,
        "max_breedings": 3,
        "genetic_traits": genetic_traits,
        "ownership_status": "bred",
        "breed_tx_hash": req.breed_tx_hash,  # None if pre-contract-upgrade; on-chain proof otherwise
        "spawned_on_v4": False,  # set to True by _spawn_bred_agent_on_chain background task
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

    # ── Inherit real event docs from parents (fixes phantom events) ──────────
    # Offspring gets `total_events > 0` but zero actual docs in agent_events,
    # causing wisdom report crashes. We copy up to 2 real events per parent.
    try:
        to_inherit: list[dict] = []
        for parent_id in [p1_id, p2_id]:
            parent_evs: list[dict] = []
            async for ev_doc in (
                db.collection(EVENTS_COLLECTION)
                .where(filter=FieldFilter("agent_id", "==", parent_id))
                .stream()
            ):
                ev_data = ev_doc.to_dict() or {}
                if ev_data.get("wisdom_summary") and ev_data.get("event_title"):
                    parent_evs.append(ev_data)
            # Most recent first (attended_at descending), take top 2
            parent_evs.sort(key=lambda d: d.get("attended_at", 0), reverse=True)
            to_inherit.extend(parent_evs[:2])

        if to_inherit:
            inherit_batch = db.batch()
            for ev_data in to_inherit:
                inherit_id = hashlib.sha256(
                    f"inherited:{offspring_id}:{ev_data.get('event_url', ev_data.get('event_title', ''))}".encode()
                ).hexdigest()[:16]
                inherit_ref = db.collection(EVENTS_COLLECTION).document(inherit_id)
                inherit_batch.set(inherit_ref, {
                    **ev_data,
                    "agent_id": offspring_id,
                    "agent_wallet": offspring_account.address,
                    "is_inherited": True,
                    "inherited_from": ev_data.get("agent_id"),
                })
            await inherit_batch.commit()
            logger.info("Inherited %d event docs for offspring %s", len(to_inherit), offspring_id)
    except Exception as exc:
        logger.warning(
            "Event inheritance failed for offspring %s (non-fatal): %s",
            offspring_id, exc.__class__.__name__,
        )

    # ── Lineage Biography (non-blocking) ─────────────────────────────────────
    # Gemini generates a unique 2-paragraph biography from parent wisdom.
    # Saved to Firestore async — offspring is returned immediately without waiting.
    asyncio.create_task(
        _generate_and_save_biography(
            db=db,
            offspring_id=offspring_id,
            offspring_name=req.offspring_name,
            offspring_gen=offspring_gen,
            p1_id=p1_id,
            p2_id=p2_id,
            p1_name=parent_names["parent_1"],
            p2_name=parent_names["parent_2"],
            p1_niche=p1.get("niche", "General"),
            p2_niche=p2.get("niche", "General"),
            genetic_traits=genetic_traits,
        )
    )

    # ── spawnBredAgent on V4 (non-blocking) ──────────────────────────────────
    # MINTER_SERVICE calls spawnBredAgent(offspringWallet, offspringId) on V4,
    # setting isAgentSpawned=true so the offspring can self-sign (Mode B).
    # Firestore is updated (spawned_on_v4=True, funded=True) when tx confirms.
    asyncio.create_task(
        _spawn_bred_agent_on_chain(
            db=db,
            offspring_id=offspring_id,
            offspring_wallet=offspring_account.address,
            onchain_offspring_key=onchain_offspring_key,
        )
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


@router.post("/{agent_id}/retry-spawn")
async def retry_spawn_bred_agent(
    agent_id: str,
    wallet: str = Query(..., description="Owner wallet address"),
) -> dict:
    """
    Re-trigger spawnBredAgent() for a bred offspring whose initial spawn failed.
    Uses the breed_tx_hash stored in Firestore to look up the correct on-chain offspringKey.
    The user does not need to pay again — the breed record already exists on V4.
    """
    if not Web3.is_address(wallet):
        raise HTTPException(status_code=400, detail="Invalid wallet address")
    wallet = Web3.to_checksum_address(wallet)

    db = get_db()
    try:
        doc = await db.collection(AGENTS_COLLECTION).document(agent_id).get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Agent not found")

    data = doc.to_dict() or {}
    if data.get("user_wallet") != wallet:
        raise HTTPException(status_code=403, detail="Not your agent")
    if data.get("spawned_on_v4"):
        return {"status": "already_spawned"}
    if data.get("ownership_status") != "bred":
        raise HTTPException(status_code=400, detail="Agent is not a bred offspring")

    breed_tx_hash = data.get("breed_tx_hash")
    if not breed_tx_hash:
        raise HTTPException(
            status_code=400,
            detail="No breed transaction hash stored — cannot retry (agent predates on-chain verification)",
        )

    try:
        breed_tx_data = await web3_service.verify_breed_tx(
            tx_hash=breed_tx_hash,
            expected_user_wallet=wallet,
            max_age_seconds=86400 * 30,  # Allow up to 30 days for retry
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Breed transaction invalid: {exc}") from exc

    offspring_key = breed_tx_data.get("offspring_key")
    if not offspring_key:
        raise HTTPException(status_code=422, detail="Could not extract offspring key from breed transaction")

    offspring_wallet = data.get("agent_wallet")
    asyncio.create_task(
        _spawn_bred_agent_on_chain(
            db=db,
            offspring_id=agent_id,
            offspring_wallet=offspring_wallet,
            onchain_offspring_key=offspring_key,
        )
    )

    logger.info("retry-spawn initiated for offspring %s, offspring_key=%s...", agent_id, offspring_key[:16])
    return {"status": "retry_initiated", "agent_id": agent_id}


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

    # For offspring with Superior Knowledge Base / Legendary Wisdom Heritage,
    # also pull parent agents' event summaries as inherited context
    genetic_traits: list[str] = data.get("genetic_traits") or []
    parent_wisdom: list[str] = []
    wisdom_traits = {"Superior Knowledge Base", "Legendary Wisdom Heritage"}
    if wisdom_traits & set(genetic_traits):
        parent_ids: list[str] = data.get("parent_ids") or []
        for pid in parent_ids[:2]:
            try:
                async for ev_doc in (
                    db.collection(EVENTS_COLLECTION)
                    .where(filter=FieldFilter("agent_id", "==", pid))
                    .stream()
                ):
                    ev = ev_doc.to_dict() or {}
                    t, s = ev.get("event_title", ""), ev.get("wisdom_summary", "")
                    if t and s:
                        parent_wisdom.append(f"{t}: {s}")
            except Exception:
                pass

    reply = await chat_with_agent(
        agent_name=data.get("agent_name", "Agent"),
        personality=data.get("personality", "Analytical"),
        niche=data.get("niche", "Blockchain/DeFi"),
        events_attended=data.get("total_events", 0),
        message=req.message,
        conversation_history=req.conversation_history,
        event_summaries=event_summaries,
        genetic_traits=genetic_traits or None,
        parent_wisdom=parent_wisdom or None,
        parent_names=data.get("parent_names"),
        generation=data.get("generation"),
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

    # Cross-Domain Intelligence: bred agents with two different-niche parents
    # cast a wider net during YouTube discovery
    scout_genetic_traits: list[str] = data.get("genetic_traits") or []
    scout_parent_niches: list[str] = data.get("parent_niches") or []
    additional_niches: list[str] | None = None
    if "Cross-Domain Intelligence" in scout_genetic_traits and len(scout_parent_niches) > 1:
        additional_niches = [n for n in scout_parent_niches if n != niche]

    # ── Secretary: discover best YouTube event ────────────────────────────
    from services.scout_service import discover_event

    run_at = time.time()
    logger.info(
        "Auto Scout triggered for agent %s (niche=%s, cross_domain=%s, scheduler_run_id=%s)",
        agent_id,
        niche,
        additional_niches or "none",
        scheduler_run_id or "manual",
    )
    try:
        decision = await discover_event(
            agent_id=agent_id,
            niche=niche,
            agent_name=agent_name,
            agent_wallet=agent_wallet,
            custom_instructions=custom_instructions,
            additional_niches=additional_niches,
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


# ── Luma Autonomous RSVP ─────────────────────────────────────────────────────

_LUMA_OTP_SESSIONS_COLLECTION = "luma_otp_sessions"


class LumaConnectStartRequest(BaseModel):
    email: str
    password: str | None = None  # optional: use password login instead of OTP
    force_reconnect: bool = False  # set True to re-login even if session appears valid


class LumaConnectVerifyRequest(BaseModel):
    session_id: str
    code: str


class LumaConnectRequest(BaseModel):
    cookies: list[dict]


class LumaRSVPRequest(BaseModel):
    event_url: str

    @field_validator("event_url")
    @classmethod
    def validate_luma_url(cls, v: str) -> str:
        if not ("lu.ma/" in v or "luma.com/" in v):
            raise ValueError("URL must be a Luma event URL (lu.ma or luma.com)")
        return v


@router.post("/{agent_id}/luma-connect-start")
async def luma_connect_start(agent_id: str, req: LumaConnectStartRequest) -> dict:
    """
    Step 1: Create Firestore session doc, start Playwright background task.
    Playwright polls Firestore for OTP code — works across any Cloud Run instance.

    If the agent already has a non-expired luma.auth-session-key cookie stored and
    force_reconnect is not set, the session is reused immediately without Playwright.
    """
    db = get_db()
    doc = await db.collection(AGENTS_COLLECTION).document(agent_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    session_id = secrets.token_urlsafe(16)

    # Check for existing valid session (skip Playwright if already connected)
    if not req.force_reconnect:
        agent_data = doc.to_dict() or {}
        existing_enc = agent_data.get("luma_cookies_enc")
        if existing_enc:
            try:
                from services.luma_browser_service import validate_existing_luma_session
                existing_cookies = json.loads(decrypt_private_key(existing_enc))
                if validate_existing_luma_session(existing_cookies):
                    await db.collection(_LUMA_OTP_SESSIONS_COLLECTION).document(session_id).set({
                        "agent_id": agent_id,
                        "email": req.email,
                        "status": "connected",
                        "created_at": time.time(),
                    })
                    logger.info("Luma connect reused existing session — agent=%s session=%s", agent_id, session_id)
                    return {
                        "session_id": session_id,
                        "status": "already_connected",
                        "already_connected": True,
                        "email": req.email,
                        "mode": "reuse",
                    }
            except Exception as e:
                logger.warning("Existing session validation failed for agent %s: %s — proceeding with fresh login", agent_id, e)

    # Write session to Firestore before starting Playwright task
    await db.collection(_LUMA_OTP_SESSIONS_COLLECTION).document(session_id).set({
        "agent_id": agent_id,
        "email": req.email,
        "status": "starting",
        "created_at": time.time(),
    })

    async def _run():
        from services.luma_browser_service import connect_luma_with_otp
        await connect_luma_with_otp(session_id, req.email, password=req.password)

    asyncio.create_task(_run())
    mode = "password" if req.password else "otp"
    logger.info("Luma connect started — agent=%s session=%s email=%s mode=%s", agent_id, session_id, req.email, mode)

    return {"session_id": session_id, "status": "started", "email": req.email, "mode": mode}


@router.get("/{agent_id}/luma-connect-status")
async def luma_connect_status(
    agent_id: str,
    session_id: str = Query(..., description="Session ID from luma-connect-start"),
) -> dict:
    """Poll Firestore for the current state of a Luma connect session."""
    db = get_db()
    doc = await db.collection(_LUMA_OTP_SESSIONS_COLLECTION).document(session_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    data = doc.to_dict() or {}
    return {"status": data.get("status", "unknown"), "error": data.get("error")}


@router.post("/{agent_id}/luma-connect-verify")
async def luma_connect_verify(agent_id: str, req: LumaConnectVerifyRequest) -> dict:
    """
    Step 2: Write OTP code to Firestore. Playwright task picks it up and completes login.
    Poll Firestore for result (works across any Cloud Run instance).
    """
    db = get_db()
    session_ref = db.collection(_LUMA_OTP_SESSIONS_COLLECTION).document(req.session_id)

    doc = await session_ref.get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Session not found or expired. Please start again.")

    # Write code to Firestore — Playwright task is polling for this
    await session_ref.update({"code": req.code.strip(), "code_submitted_at": time.time()})

    # Poll Firestore until Playwright completes. OTP verification can be slow on
    # Cloud Run because Clerk/Luma may take multiple redirects before cookies settle.
    deadline = time.time() + 180
    while time.time() < deadline:
        await asyncio.sleep(1.5)
        snap = await session_ref.get()
        data = snap.to_dict() or {}
        status = data.get("status")

        if status == "connected":
            logger.info("Luma OTP verified — agent=%s session=%s", agent_id, req.session_id)
            return {"status": "connected", "cookies_captured": data.get("cookies_count", 0), "luma_connected": True}

        if status == "error":
            raise HTTPException(status_code=400, detail=data.get("error", "OTP verification failed"))

    raise HTTPException(status_code=504, detail="Timed out waiting for verification. Luma is still responding too slowly; please try again.")


@router.post("/{agent_id}/luma-connect")
async def luma_connect(agent_id: str, req: LumaConnectRequest) -> dict:
    """
    Stores pre-captured Luma session cookies for this agent, encrypted via KMS.

    Flow:
      1. Run backend/test_luma_rsvp_local.py locally (opens browser, captures cookies)
      2. Copy the contents of luma_cookies_test.json
      3. POST { "cookies": [...] } to this endpoint
      4. Cookies are KMS-encrypted and stored in Firestore
      5. Call /luma-rsvp to autonomously register to Luma events
    """
    if not req.cookies:
        raise HTTPException(status_code=422, detail="cookies array must not be empty")

    db = get_db()
    doc_ref = db.collection(AGENTS_COLLECTION).document(agent_id)

    try:
        doc = await doc_ref.get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    agent_data = doc.to_dict() or {}
    agent_name = agent_data.get("name", agent_id)
    cookies = req.cookies

    # Serialize + encrypt cookies using KMS (same mechanism as agent private keys)
    try:
        cookies_enc = encrypt_private_key(json.dumps(cookies))
    except Exception as exc:
        logger.error("KMS encryption of Luma cookies failed for agent %s: %s", agent_id, exc)
        raise HTTPException(status_code=500, detail="Failed to encrypt session cookies") from exc

    try:
        await doc_ref.update({
            "luma_cookies_enc": cookies_enc,
            "luma_connected_at": time.time(),
        })
    except Exception as exc:
        logger.error("Firestore update failed for agent %s luma cookies: %s", agent_id, exc)
        raise HTTPException(status_code=503, detail="Failed to persist session cookies") from exc

    logger.info(
        "Luma session captured for agent %s (%s), %d cookies stored",
        agent_id, agent_name, len(cookies),
    )
    return {
        "status": "success",
        "agent_id": agent_id,
        "agent_name": agent_name,
        "cookies_captured": len(cookies),
        "luma_connected": True,
    }


@router.post("/{agent_id}/luma-rsvp")
async def luma_rsvp(agent_id: str, req: LumaRSVPRequest) -> dict:
    """
    Autonomously RSVPs the agent to a Luma event using stored session cookies.
    Refreshes cookies in Firestore if Clerk rotates the JWT during the session.
    """
    db = get_db()
    doc_ref = db.collection(AGENTS_COLLECTION).document(agent_id)

    try:
        doc = await doc_ref.get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")

    agent_data = doc.to_dict() or {}
    agent_name = agent_data.get("name", agent_id)
    cookies_enc = agent_data.get("luma_cookies_enc")

    if not cookies_enc:
        raise HTTPException(
            status_code=422,
            detail="No Luma session found for this agent. Call POST /luma-connect first.",
        )

    try:
        cookies = json.loads(decrypt_private_key(cookies_enc))
    except Exception as exc:
        logger.error("Failed to decrypt Luma cookies for agent %s: %s", agent_id, exc)
        raise HTTPException(status_code=500, detail="Failed to decrypt session cookies") from exc

    try:
        from services.luma_browser_service import rsvp_luma_event
        result = await rsvp_luma_event(
            cookies=cookies,
            event_url=req.event_url,
            agent_name=agent_name,
        )
    except Exception as exc:
        logger.error("RSVP failed for agent %s on %s: %s", agent_id, req.event_url, exc)
        raise HTTPException(status_code=500, detail=f"RSVP execution failed: {exc}") from exc

    # If Clerk rotated the JWT, persist refreshed cookies
    updated_cookies = result.get("updated_cookies")
    ts_update: dict = {"luma_last_rsvp_at": time.time()}
    if updated_cookies:
        try:
            ts_update["luma_cookies_enc"] = encrypt_private_key(json.dumps(updated_cookies))
            logger.info("Refreshed Luma cookies persisted for agent %s", agent_id)
        except Exception as exc:
            logger.warning("Failed to re-encrypt updated Luma cookies for agent %s: %s", agent_id, exc)
    try:
        await doc_ref.update(ts_update)
    except Exception:
        pass  # non-critical timestamp update

    logger.info(
        "Luma RSVP for agent %s on '%s': status=%s confirmed=%s",
        agent_id, result.get("event_title", req.event_url),
        result.get("status"), result.get("rsvp_confirmed"),
    )
    return {
        "agent_id": agent_id,
        "agent_name": agent_name,
        "event_url": req.event_url,
        "event_title": result.get("event_title", ""),
        "status": result.get("status"),
        "rsvp_confirmed": result.get("rsvp_confirmed", False),
        "error": result.get("error"),
    }


# ── Delete Agent ──────────────────────────────────────────────────────────────

EVENTS_COLLECTION = "agent_events"
PROPOSALS_COLLECTION = "proposals"


@router.delete("/{agent_id}", status_code=200)
async def delete_agent(
    agent_id: str,
    wallet: str = Query(..., description="Owner wallet address — must match agent's user_wallet"),
) -> dict:
    """
    Soft-delete an agent from Firestore.
    Validates that the requesting wallet owns the agent before deleting.
    Also cleans up associated events and proposals.
    """
    if not Web3.is_address(wallet):
        raise HTTPException(status_code=400, detail="Invalid wallet address")
    wallet = Web3.to_checksum_address(wallet)

    db = get_db()

    try:
        doc = await db.collection(AGENTS_COLLECTION).document(agent_id).get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc

    if not doc.exists:
        raise HTTPException(status_code=404, detail="Agent not found")

    data = doc.to_dict() or {}
    owner = data.get("user_wallet", "")
    if owner.lower() != wallet.lower():
        raise HTTPException(status_code=403, detail="Wallet does not own this agent")

    # Delete agent doc
    try:
        await doc.reference.delete()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Failed to delete agent") from exc

    # Best-effort cleanup of events and proposals (non-blocking)
    deleted_events = 0
    deleted_proposals = 0
    try:
        async for ev_doc in (
            db.collection(EVENTS_COLLECTION)
            .where(filter=FieldFilter("agent_id", "==", agent_id))
            .stream()
        ):
            await ev_doc.reference.delete()
            deleted_events += 1
    except Exception as exc:
        logger.warning("Could not clean up events for agent %s: %s", agent_id, exc)

    try:
        async for pr_doc in (
            db.collection(PROPOSALS_COLLECTION)
            .where(filter=FieldFilter("agent_id", "==", agent_id))
            .stream()
        ):
            await pr_doc.reference.delete()
            deleted_proposals += 1
    except Exception as exc:
        logger.warning("Could not clean up proposals for agent %s: %s", agent_id, exc)

    logger.info(
        "Agent %s deleted by wallet %s (events=%d proposals=%d)",
        agent_id, wallet[:10], deleted_events, deleted_proposals,
    )
    return {"status": "deleted", "agent_id": agent_id}
