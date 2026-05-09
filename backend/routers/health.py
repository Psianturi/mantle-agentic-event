"""Health-check endpoints — used by Cloud Run's startup and liveness probes."""

import logging

from fastapi import APIRouter

from core.config import settings
from services.web3_service import web3_service

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict:
    """Basic liveness check.  Always returns 200 if the process is up."""
    return {
        "status": "ok",
        "environment": settings.environment,
        "chain_id": settings.chain_id,
        "contract_configured": (
            bool(settings.contract_address)
            and not settings.contract_address.startswith("0x0000")
        ),
    }


@router.get("/health/blockchain")
async def health_blockchain() -> dict:
    """
    Deep check: connects to Mantle RPC and reads total minted count.
    Cloud Run startup probe can use this to validate on-chain connectivity.
    """
    try:
        total = await web3_service.get_total_minted()
        return {"status": "ok", "total_minted": total}
    except Exception as exc:
        logger.error("Blockchain health check failed: %s", exc)
        return {"status": "error", "detail": str(exc)}
