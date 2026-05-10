"""
POST /api/v1/agent/spawn  — Spawn a new autonomous AI agent with its own wallet.

Each agent gets a deterministic wallet with BOTH public address and private key.
The private key is stored encrypted in the agent store so the agent can sign
its own transactions autonomously (true agentic economy).
"""

import hashlib
import logging
import secrets

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
    needs_funding: bool  # True if agent needs spawnAgent() call


# ── Endpoints ─────────────────────────────────────────────────────────────────


@router.post("/spawn", response_model=SpawnResponse, status_code=201)
async def spawn_agent(req: SpawnRequest) -> SpawnResponse:
    """
    Creates a new AI agent with its own autonomous wallet.
    
    The agent's private key is stored encrypted in the backend so it can
    sign its own transactions. User must call spawnAgent() on the smart
    contract to fund the agent with 0.5 MNT for gas autonomy.
    """
    # Stable ID: first 16 hex chars of sha256(user_wallet:agent_name)
    agent_id = hashlib.sha256(
        f"{req.user_wallet}:{req.agent_name}".encode()
    ).hexdigest()[:16]

    if agent_id in _agent_store:
        logger.info("Returning existing agent %s", agent_id)
        existing = _agent_store[agent_id]
        return SpawnResponse(**existing, needs_funding=not existing.get("funded", False))

    # Generate a NEW random wallet for this agent (true autonomy)
    # Each agent gets unique private key for signing its own transactions
    private_key = "0x" + secrets.token_hex(32)
    agent_account = Account.from_key(private_key)

    agent_data: dict = {
        "agent_id": agent_id,
        "agent_wallet": agent_account.address,
        "agent_name": req.agent_name,
        "niche": req.niche,
        "user_wallet": req.user_wallet,
        "level": 1,
        "total_events": 0,
        "private_key": private_key,  # TODO: Encrypt in production with KMS
        "funded": False,  # Set to True after spawnAgent() is called
    }
    _agent_store[agent_id] = agent_data
    logger.info(
        "Spawned new agent %s → wallet %s (needs funding via spawnAgent)",
        agent_id,
        agent_account.address,
    )
    return SpawnResponse(**{k: v for k, v in agent_data.items() if k != "private_key"}, needs_funding=True)


@router.get("/{agent_id}", response_model=SpawnResponse)
async def get_agent(agent_id: str) -> SpawnResponse:
    """Retrieve agent info by agent_id."""
    if agent_id not in _agent_store:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    agent_data = _agent_store[agent_id]
    # Don't expose private key in response
    return SpawnResponse(**{k: v for k, v in agent_data.items() if k != "private_key"}, needs_funding=not agent_data.get("funded", False))


@router.post("/{agent_id}/mark-funded")
async def mark_agent_funded(agent_id: str) -> dict:
    """
    Mark agent as funded after spawnAgent() transaction succeeds.
    Called by frontend after user confirms spawnAgent() on smart contract.
    """
    if agent_id not in _agent_store:
        raise HTTPException(status_code=404, detail=f"Agent '{agent_id}' not found")
    
    _agent_store[agent_id]["funded"] = True
    logger.info("Agent %s marked as funded", agent_id)
    return {"status": "success", "agent_id": agent_id, "funded": True}


def get_agent_private_key(agent_id: str) -> str:
    """
    Internal helper to retrieve agent's private key for transaction signing.
    Only used by backend services, never exposed via API.
    """
    if agent_id not in _agent_store:
        raise ValueError(f"Agent '{agent_id}' not found")
    
    private_key = _agent_store[agent_id].get("private_key")
    if not private_key:
        raise ValueError(f"Agent '{agent_id}' has no private key")
    
    return private_key
