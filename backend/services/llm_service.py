"""
LLM service: generates a "Wisdom Summary" for an attended event using Gemini.

For YouTube events, fetches the real video transcript and passes it to Gemini
so the wisdom reflects actual content — not just event metadata.
For non-YouTube events (Luma, Eventbrite, Zoom), falls back to metadata-only.

Uses the Gemini REST API directly via httpx (no SDK dependency) for minimal
Docker image size and full async support.
"""

import asyncio
import logging
from urllib.parse import parse_qs, urlparse

import httpx

from core.secrets import get_llm_api_key

logger = logging.getLogger(__name__)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1/models/"
    "gemini-2.5-flash:generateContent"
)

# Max transcript chars sent to Gemini (~700-800 words, well within token budget)
_TRANSCRIPT_MAX_CHARS = 4000

# ── Prompt templates ──────────────────────────────────────────────────────────

_PROMPT_WITH_TRANSCRIPT = """\
You are an autonomous AI agent that just attended a Web3/tech event.
You have access to the actual transcript from this event.
Generate a concise "Wisdom Summary" — exactly 2-3 sentences — capturing the most \
valuable insights a blockchain AI agent would gain from this content.
Focus on: Web3 concepts, AI/agentic systems, DeFi, NFTs, developer tools, key \
announcements, or actionable insights found in the transcript.

Event Title  : {event_title}
Platform     : {platform}
Transcript   :
{transcript}

Return ONLY the wisdom summary text. No bullet points, no preamble, no labels.\
"""

_PROMPT_METADATA_ONLY = """\
You are an autonomous AI agent that just attended a Web3/tech or wellness event.
Generate a concise "Wisdom Summary" — exactly 2-3 sentences — capturing the most \
valuable insights a blockchain AI agent would gain from this event.
Focus on: Web3 concepts, AI/agentic systems, DeFi, NFTs, or developer tools mentioned.

Event Title : {event_title}
Event URL   : {event_url}
Platform    : {platform}

Return ONLY the wisdom summary text. No bullet points, no preamble, no labels.\
"""

_FALLBACK_TEMPLATE = (
    "Agent '{agent_name}' attended '{event_title}' on {platform} and integrated "
    "key insights into its knowledge base. Core Web3 and agentic concepts from the "
    "event were recorded as on-chain wisdom for future decision-making."
)

# ── YouTube transcript helpers ────────────────────────────────────────────────

try:
    from youtube_transcript_api import YouTubeTranscriptApi
    _YT_AVAILABLE = True
except ImportError:
    _YT_AVAILABLE = False
    logger.warning("youtube-transcript-api not installed — transcript fetch disabled")


def _extract_video_id(url: str) -> str | None:
    """Extract YouTube video ID from watch, live, shorts, embed, or youtu.be URLs."""
    try:
        parsed = urlparse(url)
    except Exception:
        return None

    host = (parsed.hostname or "").lower()

    if host == "youtu.be":
        return parsed.path.lstrip("/").split("?")[0] or None

    if host in ("youtube.com", "www.youtube.com"):
        qs = parse_qs(parsed.query)
        if "v" in qs:
            return qs["v"][0]
        # /live/ID  /shorts/ID  /embed/ID
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) >= 2 and parts[0] in ("live", "shorts", "embed"):
            return parts[1]

    return None


def _fetch_transcript_sync(video_id: str) -> str | None:
    """Sync fetch — runs in a thread executor to avoid blocking the event loop."""
    if not _YT_AVAILABLE:
        return None
    try:
        entries = YouTubeTranscriptApi.get_transcript(video_id, languages=["en", "id", "en-US"])
        text = " ".join(e["text"] for e in entries)
        return text[:_TRANSCRIPT_MAX_CHARS] if len(text) > _TRANSCRIPT_MAX_CHARS else text
    except Exception as exc:
        logger.debug("Transcript unavailable for video %s: %s", video_id, exc)
        return None


async def _fetch_youtube_transcript(url: str) -> str | None:
    """Async wrapper: extract video ID then fetch transcript in thread executor."""
    video_id = _extract_video_id(url)
    if not video_id:
        return None
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _fetch_transcript_sync, video_id)


# ── Wisdom report generation ──────────────────────────────────────────────────

_WISDOM_PROMPT = """\
You are an AI analyst specializing in {niche}.

Analyze these {count} event summaries attended by an autonomous AI agent:

{summaries}

Generate a comprehensive wisdom report. Return ONLY a valid JSON object with this structure:
{{
  "insights": ["insight1", "insight2", "insight3", "insight4", "insight5"],
  "strategic_tips": ["tip1", "tip2", "tip3", "tip4"]
}}

Make insights data-driven and specific to the actual events above.
Make tips actionable and forward-looking.\
"""

_WISDOM_FALLBACK = {
    "insights": [
        "Cross-event analysis reveals emerging patterns in the niche",
        "Market momentum shows continued growth in key sectors",
        "Strategic opportunities identified across multiple attended events",
        "Community sentiment indicates positive trend continuation",
        "Risk-adjusted metrics suggest favorable positioning ahead",
    ],
    "strategic_tips": [
        "Diversify exposure across multiple protocols and platforms",
        "Monitor emerging trends identified in attended events for early positioning",
        "Implement strategic timing based on patterns from event analysis",
        "Leverage cross-platform opportunities for enhanced returns",
    ],
}


async def generate_wisdom_report(niche: str, event_summaries: list[str]) -> dict:
    """
    Generate a structured wisdom report from a list of event summaries.
    Returns dict with 'insights' and 'strategic_tips' lists.
    Falls back to generic content on error.
    """
    if not event_summaries:
        return _WISDOM_FALLBACK

    try:
        api_key = get_llm_api_key()
    except RuntimeError:
        return _WISDOM_FALLBACK

    summaries_text = "\n\n".join(
        f"Event {i + 1}: {s}" for i, s in enumerate(event_summaries)
    )
    prompt = _WISDOM_PROMPT.format(
        niche=niche,
        count=len(event_summaries),
        summaries=summaries_text,
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.62,
            "maxOutputTokens": 1024,
            "topP": 0.9,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                _GEMINI_URL,
                params={"key": api_key},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
            # Strip markdown code fences if present
            if raw_text.startswith("```"):
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
            import json
            result = json.loads(raw_text)
            return {
                "insights": result.get("insights", _WISDOM_FALLBACK["insights"]),
                "strategic_tips": result.get("strategic_tips", _WISDOM_FALLBACK["strategic_tips"]),
            }
    except Exception as exc:
        logger.error("Wisdom report generation failed: %s", exc.__class__.__name__)
        return _WISDOM_FALLBACK


async def chat_with_agent(
    agent_name: str,
    personality: str,
    niche: str,
    events_attended: int,
    message: str,
    conversation_history: list[str],
) -> str:
    """
    Generate a contextual chat reply from the agent using Gemini.
    Falls back to a canned reply if the API is unavailable.
    """
    history_text = "\n\n".join(conversation_history[-6:]) if conversation_history else ""
    prompt = (
        f"You are {agent_name}, an AI agent with a {personality.lower()} personality "
        f"specializing in {niche}. You have attended {events_attended} events and gained "
        f"deep insights in your domain.\n\n"
        + (f"Previous conversation:\n{history_text}\n\n" if history_text else "")
        + f"User: {message}\n\n"
        "Respond naturally and helpfully, drawing on your expertise. "
        "Keep the response conversational but informative, under 150 words."
    )

    try:
        api_key = get_llm_api_key()
    except RuntimeError:
        return (
            f"I'm {agent_name}, your {personality.lower()} agent focused on {niche}. "
            "I'm currently unable to connect to my AI backend. Please try again later."
        )

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.8, "maxOutputTokens": 300, "topP": 0.9},
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(_GEMINI_URL, params={"key": api_key}, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception as exc:
        logger.error("Agent chat LLM error: %s", exc.__class__.__name__)
        return (
            f"I apologize, I'm having trouble connecting right now. "
            f"As your {personality.lower()} agent focused on {niche}, "
            f"I'm ready to share insights from the {events_attended} events I've attended. "
            "Please try again."
        )

async def summarize_event(
    event_title: str,
    event_url: str,
    platform: str,
    agent_name: str = "Agent",
) -> str:
    """
    Call Gemini to produce a wisdom summary.

    For YouTube events: fetches the real transcript and passes it to Gemini.
    For other platforms: uses event title + URL as context (metadata-only).
    Returns a graceful fallback string on timeout or API error — minting continues.
    """
    try:
        api_key = get_llm_api_key()
    except RuntimeError as exc:
        logger.warning("LLM API key unavailable (%s), using fallback summary", exc)
        return _FALLBACK_TEMPLATE.format(
            agent_name=agent_name, event_title=event_title, platform=platform
        )

    # For YouTube URLs, try to enrich the prompt with the real transcript
    transcript: str | None = None
    is_youtube = platform.lower() == "youtube" or any(
        h in event_url for h in ("youtube.com", "youtu.be")
    )
    if is_youtube:
        transcript = await _fetch_youtube_transcript(event_url)
        if transcript:
            logger.info(
                "Transcript fetched for '%s' (%d chars) — using rich prompt",
                event_title, len(transcript),
            )
        else:
            logger.info("No transcript for '%s' — falling back to metadata-only prompt", event_title)

    if transcript:
        prompt = _PROMPT_WITH_TRANSCRIPT.format(
            event_title=event_title,
            platform=platform,
            transcript=transcript,
        )
        max_tokens = 512  # richer content → allow longer summary
    else:
        prompt = _PROMPT_METADATA_ONLY.format(
            event_title=event_title,
            event_url=event_url,
            platform=platform,
        )
        max_tokens = 256

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": max_tokens,
            "topP": 0.9,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(
                _GEMINI_URL,
                params={"key": api_key},
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()

    except httpx.TimeoutException:
        logger.warning("Gemini timeout for '%s', using fallback", event_title)
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Gemini HTTP %s for '%s': %s",
            exc.response.status_code,
            event_title,
            exc.response.text[:200],
        )
    except Exception as exc:
        logger.error("Unexpected LLM error for '%s': %s", event_title, exc.__class__.__name__)

    return _FALLBACK_TEMPLATE.format(
        agent_name=agent_name, event_title=event_title, platform=platform
    )
