"""Shared Wisdom Cache — cross-agent reuse of prior YouTube wisdom.

Adapted from Spektra's video_corpus, but deliberately much simpler: Firestore
lookup by canonical video ID, no vector index, no embeddings. The goal is
cache reuse + differentiated summaries — not full semantic recall.

Read-only for attend flow: never blocks, never overwrites. A new agent
attending a video that another agent already saw gets the prior summary as
context to produce a *different* take (different lens), not a copy.
"""
import logging
import re

from core.database import get_db

logger = logging.getLogger(__name__)

EVENTS_COLLECTION = "agent_events"


def _canonical_video_id(url: str) -> str | None:
    """Extract YouTube video ID, ignoring query params so ?t= variants match."""
    for pat in (
        r"(?:youtube\.com/watch\?.*v=|youtu\.be/)([A-Za-z0-9_-]{11})",
        r"youtube\.com/embed/([A-Za-z0-9_-]{11})",
        r"youtube\.com/shorts/([A-Za-z0-9_-]{11})",
    ):
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return None


async def lookup_prior_wisdom(event_url: str, exclude_agent_id: str | None = None) -> str | None:
    """
    Return a compact context string of prior wisdom for this video, or None.

    Only YouTube URLs are eligible (the only platform with a stable video ID).
    Excludes the requesting agent so an agent never quotes itself.
    """
    video_id = _canonical_video_id(event_url)
    if not video_id:
        return None

    db = get_db()
    query = db.collection(EVENTS_COLLECTION).where("event_url", ">=", f"https://youtu.be/{video_id}").where("event_url", "<=", f"https://youtu.be/{video_id}\uf8ff")
    try:
        docs = await query.get()
    except Exception:
        # Range queries on event_url can be brittle — fall back to a simple
        # equality match on the full URL, then canonicalize client-side.
        docs = await db.collection(EVENTS_COLLECTION).where("event_url", "==", event_url).get()

    prior: list[dict] = []
    for doc in docs:
        data = doc.to_dict() or {}
        other_id = data.get("agent_id")
        if exclude_agent_id and other_id == exclude_agent_id:
            continue
        if _canonical_video_id(data.get("event_url", "")) != video_id:
            continue
        prior.append(data)
        if len(prior) >= 2:  # cap context so the prompt stays small
            break

    if not prior:
        return None

    lines = [
        f"Prior wisdom from agent '{d.get('agent_name', '?')}' (niche={d.get('niche', '?')}): "
        f"{(d.get('wisdom_summary') or '')[:200].strip()}…"
        for d in prior
    ]
    return "\n".join(lines)