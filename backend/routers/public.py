"""
POST /api/v1/public/featured-wisdom — Featured wisdom for public discovery.

Hybrid selection logic:
  - 60% trending: high sentiment wisdom from last 7 days
  - 30% all-time: highest quality wisdom ever
  - 10% wildcard: random unique niches for discovery

This endpoint powers "Featured Wisdom" showcase for non-authenticated users,
driving engagement and conversion to wallet-connected state.
"""

import logging
import time
from datetime import datetime, timedelta

from fastapi import APIRouter, HTTPException
from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import BaseModel
from web3 import Web3

from core.config import settings
from core.database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/public", tags=["public"])

AGENTS_COLLECTION = "agents"
EVENTS_COLLECTION = "agent_events"


class FeaturedWisdomItem(BaseModel):
    """A single featured wisdom card for public showcase."""
    event_title: str
    wisdom_summary: str
    agent_name: str
    agent_id: str
    niche: str
    platform: str
    attended_at: float
    tx_hash: str | None = None
    token_id: str | None = None
    wisdom_quality_score: float = 0.0  # 0-100, based on length + key phrases
    category: str  # "trending", "quality", "wildcard"


class PublicMetricsResponse(BaseModel):
    """Global aggregate metrics for public users."""
    total_agents: int
    total_wisdom_nfts: int
    total_events_attended: int
    average_agent_level: float
    global_wisdom_index: float


@router.get("/featured-wisdom", response_model=list[FeaturedWisdomItem])
async def get_featured_wisdom() -> list[FeaturedWisdomItem]:
    """
    Return 6 featured wisdom items (60% trending + 30% quality + 10% wildcard).
    
    This is the "storefront" for public users to discover what agents can do.
    No authentication required.
    """
    db = get_db()
    result: list[FeaturedWisdomItem] = []
    
    try:
        # Fetch all events (this is a read-heavy query, consider caching in production)
        all_events: list[dict] = []
        async for doc in db.collection(EVENTS_COLLECTION).stream():
            event_data = doc.to_dict() or {}
            event_data["doc_id"] = doc.id
            all_events.append(event_data)
        
        if not all_events:
            logger.warning("No events found for featured wisdom showcase")
            return []
        
        # Fetch corresponding agent names for enrichment
        agent_cache: dict[str, str] = {}  # agent_id -> agent_name
        async for doc in db.collection(AGENTS_COLLECTION).stream():
            agent_data = doc.to_dict() or {}
            if "agent_id" in agent_data and "agent_name" in agent_data:
                agent_cache[agent_data["agent_id"]] = agent_data.get("agent_name", "Anonymous")
        
        # Calculate wisdom quality score (based on summary length + keyword presence)
        def score_wisdom_quality(summary: str) -> float:
            """Simple heuristic: longer + key phrases = higher quality."""
            if not summary:
                return 0.0
            
            base_score = min(100, len(summary) / 10)  # Cap at 100, one point per 10 chars
            
            # Boost if contains analytical keywords
            keywords = ["key insight", "critical", "analysis", "framework", "pattern", "strategy", "deep dive"]
            keyword_hits = sum(1 for kw in keywords if kw.lower() in summary.lower())
            keyword_boost = min(30, keyword_hits * 5)  # Up to +30 from keywords
            
            return min(100, base_score + keyword_boost)
        
        # Categorize events
        now = time.time()
        seven_days_ago = now - (7 * 24 * 3600)
        
        trending: list[FeaturedWisdomItem] = []
        quality: list[FeaturedWisdomItem] = []
        wildcard_by_niche: dict[str, list[FeaturedWisdomItem]] = {}
        
        for event in all_events:
            attended_at = event.get("attended_at", 0)
            agent_id = event.get("agent_id", "")
            wisdom_score = score_wisdom_quality(event.get("wisdom_summary", ""))
            
            item = FeaturedWisdomItem(
                event_title=event.get("event_title", "Event"),
                wisdom_summary=event.get("wisdom_summary", ""),
                agent_name=agent_cache.get(agent_id, "Anonymous Agent"),
                agent_id=agent_id,
                niche=event.get("niche", "General") or "General",
                platform=event.get("platform", "YouTube"),
                attended_at=attended_at,
                tx_hash=event.get("tx_hash"),
                token_id=event.get("token_id"),
                wisdom_quality_score=wisdom_score,
                category="",  # Will be set below
            )
            
            # Sort into categories
            if attended_at >= seven_days_ago:
                item.category = "trending"
                trending.append(item)
            
            item.category = "quality"
            quality.append(item)
            
            # Collect by niche for wildcard
            niche = item.niche
            if niche not in wildcard_by_niche:
                wildcard_by_niche[niche] = []
            wildcard_by_niche[niche].append(item)
        
        # Sort each category
        trending.sort(key=lambda x: (x.wisdom_quality_score, x.attended_at), reverse=True)
        quality.sort(key=lambda x: x.wisdom_quality_score, reverse=True)
        
        # Build featured set: 60% trending + 30% quality + 10% wildcard
        target_trending = max(1, int(6 * 0.6))  # 3-4
        target_quality = max(1, int(6 * 0.3))   # 1-2
        target_wildcard = 6 - target_trending - target_quality  # remainder
        
        # Add trending
        result.extend(trending[:target_trending])
        
        # Add quality (skip if already in trending by avoiding duplicates)
        trending_ids = {e.event_title for e in result}
        for q in quality:
            if q.event_title not in trending_ids and len([r for r in result if r.category == "quality"]) < target_quality:
                result.append(q)
                trending_ids.add(q.event_title)
        
        # Add wildcard: prioritize rare niches
        niche_counts = {}
        for item in result:
            niche_counts[item.niche] = niche_counts.get(item.niche, 0) + 1
        
        # Pick wildcard from under-represented niches
        wildcard_candidates: list[FeaturedWisdomItem] = []
        for niche, items in wildcard_by_niche.items():
            if niche_counts.get(niche, 0) < 2:  # Underrepresented
                wildcard_candidates.extend(items)
        
        wildcard_candidates.sort(key=lambda x: x.wisdom_quality_score, reverse=True)
        for wc in wildcard_candidates[:target_wildcard]:
            if len([r for r in result if r.category == "wildcard"]) < target_wildcard:
                wc.category = "wildcard"
                result.append(wc)
        
        # Trim to exactly 6 and shuffle for variety
        result = result[:6]
        
        logger.info(
            "Featured wisdom: %d trending, %d quality, %d wildcard",
            len([r for r in result if r.category == "trending"]),
            len([r for r in result if r.category == "quality"]),
            len([r for r in result if r.category == "wildcard"]),
        )
        
        return result
        
    except Exception as exc:
        logger.error("Failed to fetch featured wisdom: %s", exc)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")


@router.get("/metrics", response_model=PublicMetricsResponse)
async def get_public_metrics() -> PublicMetricsResponse:
    """
    Global aggregate metrics for public dashboard.
    
    Cached metrics (no auth required) showing ecosystem health.
    """
    db = get_db()
    
    try:
        # Count agents
        total_agents = 0
        total_level_sum = 0.0
        async for _ in db.collection(AGENTS_COLLECTION).stream():
            total_agents += 1
        
        # Count wisdom NFTs and events
        total_wisdom_nfts = 0
        total_events = 0
        async for doc in db.collection(AGENTS_COLLECTION).stream():
            agent_data = doc.to_dict() or {}
            total_events += agent_data.get("total_events", 0)
            total_level_sum += agent_data.get("level", 1)
        
        async for doc in db.collection(EVENTS_COLLECTION).stream():
            if doc.to_dict():
                total_wisdom_nfts += 1
        
        # Calculate global wisdom index
        avg_level = total_level_sum / max(1, total_agents)
        global_wisdom_index = (total_wisdom_nfts * avg_level)
        
        return PublicMetricsResponse(
            total_agents=total_agents,
            total_wisdom_nfts=total_wisdom_nfts,
            total_events_attended=total_events,
            average_agent_level=round(avg_level, 2),
            global_wisdom_index=round(global_wisdom_index, 1),
        )
        
    except Exception as exc:
        logger.error("Failed to fetch public metrics: %s", exc)
        raise HTTPException(status_code=503, detail="Database temporarily unavailable")
