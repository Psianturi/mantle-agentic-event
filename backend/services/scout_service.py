"""
Secretary sub-agent: YouTube event discovery for autonomous agents.

Flow:
  1. Search YouTube Data API v3 for long-form videos (webinars/conferences)
     matching the agent's niche and custom instructions.
  2. Filter out already-attended URLs (dedup via Firestore event history).
  3. Use Gemini to rank candidates and pick the single best video.
  4. Return selected video metadata ready for the attend workflow.
"""

import datetime
import json
import logging

import httpx

logger = logging.getLogger(__name__)

_YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

# Primary and fallback queries per niche
_NICHE_QUERIES: dict[str, list[str]] = {
    "Blockchain/DeFi": [
        "blockchain DeFi summit webinar 2026",
        "crypto decentralized finance conference talk",
    ],
    "Trading": [
        "crypto trading strategy analysis webinar 2026",
        "algorithmic trading conference workshop",
    ],
    "Tech": [
        "AI technology developer conference 2026",
        "software engineering summit workshop",
    ],
    "Health/Wellness": [
        "health wellness innovation summit 2026",
        "mental health conference workshop",
    ],
    "General": [
        "technology innovation summit webinar 2026",
        "startup product conference talk",
    ],
}


async def search_youtube(
    niche: str,
    max_results: int = 10,
    published_after_days: int = 30,
) -> list[dict]:
    """
    Search YouTube for long-form videos in the agent's niche.
    Returns list of candidate dicts: {video_id, title, description, channel, url}.
    """
    from core.secrets import get_youtube_api_key

    api_key = get_youtube_api_key()
    if not api_key:
        raise RuntimeError("YOUTUBE_API_KEY not configured — cannot run Auto Scout")

    cutoff = (
        datetime.datetime.utcnow() - datetime.timedelta(days=published_after_days)
    ).strftime("%Y-%m-%dT%H:%M:%SZ")

    queries = _NICHE_QUERIES.get(niche, _NICHE_QUERIES["General"])

    candidates: list[dict] = []
    seen_ids: set[str] = set()

    for query in queries:
        params = {
            "key": api_key,
            "q": query,
            "part": "snippet",
            "type": "video",
            "videoDuration": "long",   # > 20 min — webinars, conferences
            "publishedAfter": cutoff,
            "maxResults": max_results,
            "relevanceLanguage": "en",
            "order": "relevance",
        }
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(_YOUTUBE_SEARCH_URL, params=params)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPStatusError as exc:
            logger.warning("YouTube search HTTP error (query=%r): %s", query, exc.response.status_code)
            continue
        except Exception as exc:
            logger.warning("YouTube search failed (query=%r): %s", query, type(exc).__name__)
            continue

        for item in data.get("items", []):
            video_id = item.get("id", {}).get("videoId", "")
            if not video_id or video_id in seen_ids:
                continue
            seen_ids.add(video_id)
            snippet = item.get("snippet", {})
            candidates.append({
                "video_id": video_id,
                "title": snippet.get("title", "Untitled"),
                "description": snippet.get("description", "")[:300],
                "channel": snippet.get("channelTitle", ""),
                "published_at": snippet.get("publishedAt", ""),
                "url": f"https://www.youtube.com/watch?v={video_id}",
            })

        if len(candidates) >= max_results:
            break

    logger.info("Secretary: found %d YouTube candidates for niche '%s'", len(candidates), niche)
    return candidates


async def filter_best_candidate(
    candidates: list[dict],
    niche: str,
    agent_name: str,
    custom_instructions: str | None,
    attended_urls: set[str],
) -> dict | None:
    """
    Remove already-attended videos, then use Gemini to pick the best candidate.
    Falls back to first unattended candidate if Gemini fails.
    """
    unattended = [c for c in candidates if c["url"] not in attended_urls]
    if not unattended:
        logger.info("Secretary: all candidates already attended, nothing new to scout")
        return None

    if len(unattended) == 1:
        return unattended[0]

    # Gemini picks the most valuable video
    from services.llm_service import _call_gemini_with_retry
    from core.secrets import get_llm_api_key

    shortlist = unattended[:8]
    candidates_text = "\n".join(
        f"{i + 1}. [{c['title']}] by {c['channel']} — {c['description'][:120]}"
        for i, c in enumerate(shortlist)
    )
    instructions_part = (
        f"\nAgent custom focus: {custom_instructions}" if custom_instructions else ""
    )

    prompt = (
        f"You are selecting the best YouTube event for an AI agent to attend.\n\n"
        f"Agent: {agent_name}\nNiche: {niche}{instructions_part}\n\n"
        f"Candidates:\n{candidates_text}\n\n"
        f"Return ONLY valid JSON with this structure:\n"
        f'{{\"selected_index\": <1-{len(shortlist)}>, \"reason\": \"<one sentence>\"}}\n\n'
        f"Pick the video with the most educational value for the agent's niche."
    )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2,
        },
    }

    try:
        result = await _call_gemini_with_retry(
            api_key=get_llm_api_key(),
            payload=payload,
            timeout=20,
            context="secretary_filter",
        )
        raw = result["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(raw)
        idx = max(0, min(int(parsed.get("selected_index", 1)) - 1, len(shortlist) - 1))
        selected = shortlist[idx]
        selected["scout_reason"] = parsed.get("reason", "")
        logger.info("Secretary selected: '%s' — %s", selected["title"], selected.get("scout_reason", ""))
        return selected
    except Exception as exc:
        logger.warning("Gemini filter failed (%s), picking first candidate", type(exc).__name__)
        return unattended[0]


async def discover_event(
    agent_id: str,
    niche: str,
    agent_name: str,
    custom_instructions: str | None = None,
) -> dict | None:
    """
    Full Secretary workflow: search → dedup against Firestore history → Gemini filter.
    Returns selected video dict or None if nothing new found.
    """
    from core.database import get_db
    from google.cloud.firestore_v1.base_query import FieldFilter

    # Fetch already-attended URLs for this agent
    db = get_db()
    attended_urls: set[str] = set()
    try:
        async for doc in (
            db.collection("agent_events")
            .where(filter=FieldFilter("agent_id", "==", agent_id))
            .stream()
        ):
            url = (doc.to_dict() or {}).get("event_url", "")
            if url:
                attended_urls.add(url)
    except Exception as exc:
        logger.warning("Could not fetch attended URLs for dedup: %s", type(exc).__name__)

    candidates = await search_youtube(niche=niche)
    if not candidates:
        return None

    return await filter_best_candidate(
        candidates=candidates,
        niche=niche,
        agent_name=agent_name,
        custom_instructions=custom_instructions,
        attended_urls=attended_urls,
    )
