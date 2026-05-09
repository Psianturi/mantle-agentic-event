"""
POST /api/v1/agent/spawn  — Spawn a new autonomous AI agent.

Each agent gets a deterministic wallet address derived from the user's wallet +
agent name.  The derivation is one-way (address only, private key never stored),
because the backend's single MINTER_ROLE key does all minting — the agent wallet
is only the NFT *recipient*.
"""

import hashlib
import logging

from eth_account import Account
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator
from web3 import Web3

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/agent", tags=["agents"])

# In-memory store — survives the request lifecycle.
# Cloud Run is stateless; for production swap with Firestore or Redis.
_agent_store: dict[str, dict] = {}


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


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/spawn", response_model=SpawnResponse, status_code=201)
async def spawn_agent(req: SpawnRequest) -> SpawnResponse:
    """
    Creates (or retrieves) an AI agent for the given user wallet.

    Determinism guarantee: calling spawn twice with the same user_wallet +
    agent_name always returns the same agent_wallet address.
    """
    # Stable ID: first 16 hex chars of sha256(user_wallet:agent_name)
    agent_id = hashlib.sha256(
        f"{req.user_wallet}:{req.agent_name}".encode()
    ).hexdigest()[:16]

    if agent_id in _agent_store:
        logger.info("Returning existing agent %s", agent_id)
        return SpawnResponse(**_agent_store[agent_id])

    # Derive a deterministic *address* for this agent.
    # Seed bytes = sha256("maef-agent:<user_wallet>:<agent_name>")
    # This seed is used only to generate a stable Ethereum address.
    seed = hashlib.sha256(
        f"maef-agent:{req.user_wallet}:{req.agent_name}".encode()
    ).digest()
    agent_account = Account.from_key(seed)

    agent_data: dict = {
        "agent_id": agent_id,
        "agent_wallet": agent_account.address,
        "agent_name": req.agent_name,
        "niche": req.niche,
        "user_wallet": req.user_wallet,
        "level": 1,
        "total_events": 0,
    }
    _agent_store[agent_id] = agent_data
    logger.info("Spawned new agent %s → wallet %s", agent_id, agent_account.address)
    return SpawnResponse(**agent_data)


@router.get("/{agent_id}", response_model=SpawnResponse)
async def get_agent(agent_id: str) -> SpawnResponse:
    """Retrieve agent info by agent_id."""
    if agent_id not in _agent_store:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    return SpawnResponse(**_agent_store[agent_id])
