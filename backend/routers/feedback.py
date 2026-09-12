"""
POST /api/v1/feedback — Owner-rated wisdom feedback.

Inspired by Spektra's explicit-feedback learning, adapted for ASAJU's
sovereign-agent model: feedback is per (agent, event), owner-only, and
rate-limited so it cannot be used to spam-write Firestore.

Stored shape on the agent document:
  wisdom_feedback[event_id] = {"rating": "up"|"down", "tags": [...], "at": ts}
  top_feedback_tags = [{"tag": str, "score": int}]  # derived preference list
"""

import logging
import time

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from core.database import get_db

AGENTS_COLLECTION = "agents"
EVENTS_COLLECTION = "agent_events"

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/feedback", tags=["feedback"])

# Rate limit: max 5 feedback writes per agent per minute.
# Prevents abuse of an unauthenticated-but-owner-checked endpoint without
# needing a full auth dependency (matches project convention: no JWT, wallet
# ownership is the only boundary that matters here).
_RATE_WINDOW_SEC = 60
_RATE_MAX = 5
_rate_log: dict[str, list[float]] = {}


class FeedbackRequest(BaseModel):
    agent_id: str
    event_id: str
    user_wallet: str
    rating: str

    @field_validator("rating")
    @classmethod
    def validate_rating(cls, v: str) -> str:
        if v not in ("up", "down"):
            raise ValueError("rating must be 'up' or 'down'")
        return v


def _rate_limited(agent_id: str) -> bool:
    now = time.time()
    window = [t for t in _rate_log.get(agent_id, []) if now - t < _RATE_WINDOW_SEC]
    if len(window) >= _RATE_MAX:
        return True
    window.append(now)
    _rate_log[agent_id] = window
    return False


@router.post("")
async def submit_feedback(req: FeedbackRequest) -> dict:
    db = get_db()

    # 1. Load agent and require ownership.
    agent_ref = db.collection(AGENTS_COLLECTION).document(req.agent_id)
    try:
        agent_doc = await agent_ref.get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc
    if not agent_doc.exists:
        raise HTTPException(status_code=404, detail=f"Agent '{req.agent_id}' not found")
    agent_data = agent_doc.to_dict() or {}
    if agent_data.get("user_wallet", "").lower() != req.user_wallet.lower():
        raise HTTPException(status_code=403, detail="This agent does not belong to your wallet")

    # 2. Verify the event belongs to this agent (prevents rating events that
    #    are not the agent's, which would inject foreign tags into its prefs).
    event_ref = db.collection(EVENTS_COLLECTION).document(req.event_id)
    try:
        event_doc = await event_ref.get()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database temporarily unavailable") from exc
    if not event_doc.exists:
        raise HTTPException(status_code=404, detail=f"Event '{req.event_id}' not found")
    event_data = event_doc.to_dict() or {}
    if event_data.get("agent_id") != req.agent_id:
        raise HTTPException(status_code=400, detail="Event does not belong to this agent")

    # 3. Rate limit.
    if _rate_limited(req.agent_id):
        raise HTTPException(status_code=429, detail="Too many feedback submissions. Wait a minute and retry.")

    # 4. Derive tags from the event's classified niche (not free-form text —
    #    free-text tags would let callers inject arbitrary preference labels).
    tags = [t for t in [event_data.get("detected_niche")] if t]

    # 5. Read-merge-write the feedback map + derived preference list.
    feedback_map: dict = agent_data.get("wisdom_feedback", {})
    feedback_map[req.event_id] = {
        "rating": req.rating,
        "tags": tags,
        "at": time.time(),
    }

    # Rebuild top_feedback_tags from the full map — same shape as Spektra's
    # liked_tags/disliked_tags, but computed so it's always consistent.
    tag_scores: dict[str, int] = {}
    for entry in feedback_map.values():
        for tag in entry.get("tags", []):
            tag_scores[tag] = tag_scores.get(tag, 0) + (1 if entry.get("rating") == "up" else -1)
    top_feedback_tags = [
        {"tag": tag, "score": score}
        for tag, score in sorted(tag_scores.items(), key=lambda kv: kv[1], reverse=True)
        if score > 0  # only positive-scored tags boost; negative scores suppress
    ][:10]

    try:
        await agent_ref.update({
            "wisdom_feedback": feedback_map,
            "top_feedback_tags": top_feedback_tags,
        })
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Failed to persist feedback") from exc

    logger.info(
        "Feedback recorded agent=%s event=%s rating=%s tags=%s",
        req.agent_id, req.event_id, req.rating, tags,
    )
    return {
        "status": "ok",
        "top_feedback_tags": top_feedback_tags,
    }