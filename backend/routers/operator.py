"""
GET /api/v1/operator/health — Internal-only operational status.

Not linked from any UI, not for end users. Gated by OPERATOR_API_KEY (header
X-Operator-Key) so it isn't public just because the URL is guessable.
"""

import logging
import time

from fastapi import APIRouter, Depends, Header, HTTPException

from core.config import CHAIN_CONFIGS
from core.database import get_db
from core.secrets import get_operator_api_key
from services.web3_service import web3_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/operator", tags=["operator"])

PROPOSALS_COLLECTION = "proposals"
MARKET_CACHE_COLLECTION = "market_cache"

# A proposal stuck in "approving" past this long means the on-chain tx likely
# crashed before it could reset to "pending" or advance to "approved" — the
# kind of silent-failure edge case this endpoint exists to surface.
STUCK_APPROVAL_SECONDS = 5 * 60


async def _require_operator_key(x_operator_key: str | None = Header(default=None)) -> None:
    expected = get_operator_api_key()
    if not expected:
        # Unconfigured means disabled, not open — never fall through to "no auth required".
        raise HTTPException(status_code=503, detail="Operator endpoint not configured")
    if not x_operator_key or x_operator_key != expected:
        raise HTTPException(status_code=401, detail="Invalid or missing X-Operator-Key header")


@router.get("/health", dependencies=[Depends(_require_operator_key)])
async def operator_health() -> dict:
    now = time.time()
    db = get_db()

    minter_status = {
        str(chain_id): web3_service.get_minter_balance_status(chain_id)
        for chain_id in CHAIN_CONFIGS
    }

    market_cache: dict = {}
    try:
        async for doc in db.collection(MARKET_CACHE_COLLECTION).stream():
            data = doc.to_dict() or {}
            fetched_at = data.get("fetched_at")
            market_cache[doc.id] = {
                "fetched_at": fetched_at,
                "age_seconds": round(now - fetched_at) if fetched_at else None,
            }
    except Exception as exc:
        market_cache = {"error": str(exc)[:200]}

    proposals_status = {"pending_count": 0, "stuck_approving_count": 0}
    try:
        async for doc in db.collection(PROPOSALS_COLLECTION).stream():
            data = doc.to_dict() or {}
            status = data.get("status")
            if status == "pending":
                proposals_status["pending_count"] += 1
            elif status == "approving":
                started = data.get("approval_started_at", 0)
                if now - started > STUCK_APPROVAL_SECONDS:
                    proposals_status["stuck_approving_count"] += 1
    except Exception as exc:
        proposals_status = {"error": str(exc)[:200]}

    return {
        "generated_at": now,
        "minter_service": minter_status,
        "market_cache": market_cache,
        "proposals": proposals_status,
    }
