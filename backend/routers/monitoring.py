"""
GET /api/v1/monitoring/gas-status/{agent_wallet}  — Check agent gas balance & minting capacity
GET /api/v1/monitoring/spawn-quota/{user_wallet}  — Check user's spawn quota (max 3 direct spawns)

Read-only monitoring endpoints for frontend visibility.
"""

import logging

from fastapi import APIRouter, HTTPException
from google.cloud.firestore_v1.base_query import FieldFilter
from web3 import Web3

from core.database import get_db
from services.web3_service import web3_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/monitoring", tags=["monitoring"])

AGENTS_COLLECTION = "agents"


@router.get("/gas-status/{agent_wallet}")
async def get_agent_gas_status(agent_wallet: str) -> dict:
    """
    Read-only endpoint: check agent's gas balance and minting capacity.
    Returns status (healthy/warning/critical) based on balance thresholds.
    
    Response shows:
    - Current balance in MNT and wei
    - Status indicator (healthy/warning/critical/depleted)
    - Can agent still mint NFTs?
    - Estimated remaining mints based on gas consumption
    """
    if not Web3.is_address(agent_wallet):
        raise HTTPException(status_code=400, detail="Invalid agent wallet address")
    agent_wallet = Web3.to_checksum_address(agent_wallet)

    try:
        balance_wei = await web3_service.get_balance(agent_wallet)
        balance_mnt = Web3.from_wei(balance_wei, "ether")
    except Exception as exc:
        logger.error("Failed to fetch balance for %s: %s", agent_wallet, exc)
        raise HTTPException(status_code=503, detail="Blockchain query failed")

    # Thresholds match Auto Scout dynamic logic
    HEALTHY_THRESHOLD = 0.15
    WARNING_THRESHOLD = 0.08
    CRITICAL_THRESHOLD = 0.03

    if balance_mnt >= HEALTHY_THRESHOLD:
        status = "healthy"
    elif balance_mnt >= WARNING_THRESHOLD:
        status = "warning"
    elif balance_mnt >= CRITICAL_THRESHOLD:
        status = "critical"
    else:
        status = "depleted"

    # Rough estimate: ~0.02 MNT per mint (gas + overhead)
    GAS_PER_MINT = 0.02
    estimated_mints = int(balance_mnt / GAS_PER_MINT) if balance_mnt > 0 else 0

    return {
        "agent_wallet": agent_wallet,
        "gas_balance_wei": str(balance_wei),
        "gas_balance_mnt": f"{balance_mnt:.4f}",
        "status": status,
        "can_mint": balance_mnt >= CRITICAL_THRESHOLD,
        "estimated_mints_remaining": estimated_mints,
        "thresholds": {
            "healthy": f"{HEALTHY_THRESHOLD}",
            "warning": f"{WARNING_THRESHOLD}",
            "critical": f"{CRITICAL_THRESHOLD}",
        },
    }


@router.get("/spawn-quota/{user_wallet}")
async def get_spawn_quota(user_wallet: str) -> dict:
    """
    Read-only endpoint: check how many agents user has spawned (max 3 direct spawns).
    Bred offspring are excluded from the count (ownership_status != 'bred').
    
    Response shows:
    - Current spawn count vs. max limit (3)
    - Remaining slots available
    - Can user spawn another agent?
    - List of directly spawned agents
    """
    if not Web3.is_address(user_wallet):
        raise HTTPException(status_code=400, detail="Invalid wallet address")
    user_wallet = Web3.to_checksum_address(user_wallet)

    MAX_SPAWN_LIMIT = 3
    db = get_db()

    try:
        query = db.collection(AGENTS_COLLECTION).where(filter=FieldFilter("user_wallet", "==", user_wallet))
        docs = await query.get()
    except Exception as exc:
        logger.error("Firestore query failed for wallet %s: %s", user_wallet, exc)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")

    spawned_agents = []
    for doc in docs:
        data = doc.to_dict() or {}
        # Count only direct spawns, exclude bred offspring
        if data.get("ownership_status") != "bred":
            spawned_agents.append({
                "agent_wallet": data.get("agent_wallet"),
                "agent_name": data.get("agent_name"),
                "spawned_at": data.get("created_at"),
            })

    spawned_count = len(spawned_agents)
    remaining_slots = max(0, MAX_SPAWN_LIMIT - spawned_count)

    return {
        "user_wallet": user_wallet,
        "spawned_count": spawned_count,
        "max_spawn_limit": MAX_SPAWN_LIMIT,
        "remaining_slots": remaining_slots,
        "can_spawn": spawned_count < MAX_SPAWN_LIMIT,
        "agents": spawned_agents,
    }
