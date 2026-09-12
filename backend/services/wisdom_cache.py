"""Shared Wisdom Cache — same-owner agent reuse of prior YouTube wisdom.

Read-only for the attend flow: never blocks, never overwrites. When the
attending user owns multiple agents that have already attended the same
YouTube video, the prior summary is supplied as context so this agent's
take is differentiated (different lens) rather than a copy.

Privacy: cache reuse is strictly per-owner (`user_wallet`). One user's
agents never see another user's wisdom — that's the explicit product
boundary, not an implementation detail. Without user_wallet, the cache
returns None (no leakage).
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


async def lookup_prior_wisdom(
    event_url: str,
    exclude_agent_id: str | None = None,
    user_wallet: str | None = None,
) -> str | None:
    """
    Return a compact context string of prior wisdom for this video, or None.

    Only YouTube URLs are eligible (the only platform with a stable video ID).
    Excludes the requesting agent so an agent never quotes itself.

    Privacy: when user_wallet is provided, only events owned by that wallet are
    considered. Without it, the cache is empty — same-owner only.
    """
    if not user_wallet:
        return None
    video_id = _canonical_video_id(event_url)
    if not video_id:
        return None

    db = get_db()
    # Per-owner isolation: query both the canonical URL form and same-user
    # constraints in one pass. The user_wallet filter is the privacy boundary.
    try:
        docs = await (
            db.collection(EVENTS_COLLECTION)
            .where("event_url", ">=", f"https://youtu.be/{video_id}")
            .where("event_url", "<=", f"https://youtu.be/{video_id}\uf8ff")
            .where("user_wallet", "==", user_wallet)
            .get()
        )
    except Exception:
        # Fall back to exact-URL match if range+equality compound fails
        # (Firestore sometimes rejects compound queries that mix range + inequality on different fields).
        try:
            docs = (
                await db.collection(EVENTS_COLLECTION)
                .where("event_url", "==", event_url)
                .where("user_wallet", "==", user_wallet)
                .get()
            )
        except Exception as exc:
            logger.warning("wisdom cache lookup failed (non-fatal): %s", exc)
            return None

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