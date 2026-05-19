"""
ELFA Market Intelligence Layer — real-time social signals enrichment for Gemini wisdom prompts.

Hybrid Query Strategy:
  1. Scan event title for known crypto keywords → use mapped query  (dynamic)
  2. Fallback to agent niche ticker                                 (safe default)

Result is injected into build_luma_context() so Gemini can cross-reference
event content with live social sentiment and mention velocity.

Graceful degradation: returns None on any error or missing API key.
Never raises — this layer is purely additive context, never load-bearing.
"""

import logging
import os

import httpx

logger = logging.getLogger(__name__)

_ELFA_API_BASE = "https://api.elfa.ai/v1"
_ELFA_TIMEOUT = httpx.Timeout(2.5, connect=2.0)   # strict: never block the main pipeline

# Dynamic keyword → query mapping (longest match wins via iteration order)
_KEYWORD_QUERY_MAP: dict[str, str] = {
    "real world asset": "RWA",
    "rwa": "RWA",
    "defi": "DeFi",
    "decentralized finance": "DeFi",
    "swap": "DeFi",
    "liquidity": "DeFi",
    "yield": "DeFi",
    "ai agent": "AI Agent",
    "autonomous agent": "AI Agent",
    "agent": "AI Agent",
    "artificial intelligence": "AI",
    "machine learning": "AI",
    "nft": "NFT",
    "gamefi": "GameFi",
    "gaming": "GameFi",
    "layer 2": "Layer2",
    "layer2": "Layer2",
    "zk rollup": "ZK Rollup",
    "zero knowledge": "ZK Rollup",
    "dao": "DAO",
    "governance": "DAO",
    "staking": "Staking",
    "restaking": "Restaking",
    "payment": "Web3 Payment",
    "confidential": "Privacy",
    "privacy": "Privacy",
}

# Safe fallback per agent niche
_NICHE_FALLBACK: dict[str, str] = {
    "Trading/Investment": "MNT",
    "Blockchain/DeFi": "DeFi",
    "Technology": "Mantle",
    "Health/Wellness": "Mantle",
}


def determine_elfa_query(event_title: str, agent_niche: str) -> str:
    """
    Hybrid query determination:
    - Step 1: scan title for known crypto keywords (dynamic)
    - Step 2: fall back to niche-based ticker (safe)
    """
    title_lower = event_title.lower()
    for keyword, mapped_query in _KEYWORD_QUERY_MAP.items():
        if keyword in title_lower:
            logger.debug("ELFA query '%s' matched keyword '%s' in title", mapped_query, keyword)
            return mapped_query
    fallback = _NICHE_FALLBACK.get(agent_niche, "Mantle")
    logger.debug("ELFA query fallback to niche '%s' → '%s'", agent_niche, fallback)
    return fallback


async def get_elfa_market_signals(query: str) -> dict | None:
    """
    Call ELFA API for social mention velocity and sentiment around `query`.
    Returns a signals dict or None — never raises.

    Dict shape:
      query_used              : str
      mentions_velocity_24h   : str   e.g. "+312% Surge" or "Stable/Neutral"
      sentiment_bullish_pct   : int   0-100
    """
    api_key = os.getenv("ELFA_API_KEY", "").strip()
    if not api_key:
        logger.info("ELFA_API_KEY not configured — market intelligence layer skipped")
        return None

    try:
        async with httpx.AsyncClient(timeout=_ELFA_TIMEOUT) as client:
            r = await client.get(
                f"{_ELFA_API_BASE}/mentions",
                params={"search": query},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            if r.status_code != 200:
                logger.warning("ELFA API %d for query '%s' — skipping", r.status_code, query)
                return None

            data = r.json()
            signals = {
                "query_used": query,
                "mentions_velocity_24h": str(data.get("velocity_24h", "Stable/Neutral")),
                "sentiment_bullish_pct": int(data.get("sentiment_bullish_pct", 50)),
            }
            logger.info(
                "ELFA signals for '%s': velocity=%s sentiment=%d%%",
                query, signals["mentions_velocity_24h"], signals["sentiment_bullish_pct"],
            )
            return signals

    except httpx.TimeoutException:
        logger.warning("ELFA API timeout for query '%s' — skipping", query)
        return None
    except Exception as exc:
        logger.warning("ELFA API error for query '%s': %s — skipping", query, exc)
        return None
