"""
GET /api/v1/market/snapshot — Cached market context (price, sentiment, news)
for agent research. See services/market_data_service.py for provider details.
"""

import logging

from fastapi import APIRouter, HTTPException, Query

from services.market_data_service import DEX_NETWORKS, get_dex_pools, get_dex_pools_multi, get_market_snapshot, get_ohlc

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/market", tags=["market"])


@router.get("/snapshot")
async def market_snapshot(
    coins: str = Query("bitcoin,ethereum,mantle", description="Comma-separated CoinGecko coin IDs"),
) -> dict:
    coin_ids = [c.strip() for c in coins.split(",") if c.strip()]
    if not coin_ids:
        raise HTTPException(status_code=400, detail="At least one coin ID is required")

    return await get_market_snapshot(coin_ids)


@router.get("/ohlc/{coin_id}")
async def market_ohlc(coin_id: str, days: int = Query(7, ge=1, le=90)) -> dict:
    candles = await get_ohlc(coin_id, days)
    return {"coin_id": coin_id, "days": days, "candles": candles}


@router.get("/dex-pools/{network}")
async def market_dex_pools(network: str, page: int = Query(1, ge=1)) -> dict:
    if network not in DEX_NETWORKS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported network '{network}'. Supported: {', '.join(DEX_NETWORKS)}",
        )
    pools = await get_dex_pools(network, page)
    return {"network": network, "page": page, "pools": pools}


@router.get("/dex-pools")
async def market_dex_pools_all() -> dict:
    """Top DEX pools across every supported high-volume network, one call."""
    return await get_dex_pools_multi()
