"""
LLM service: generates a "Wisdom Summary" for an attended event using Gemini.

For YouTube events, fetches the real video transcript and passes it to Gemini
so the wisdom reflects actual content — not just event metadata.
For non-YouTube events (Luma, Eventbrite, Zoom), falls back to metadata-only.

Uses the Gemini REST API directly via httpx (no SDK dependency) for minimal
Docker image size and full async support.
"""

import asyncio
import json
import logging
from typing import Any
from urllib.parse import parse_qs, urlparse

import httpx

from core.secrets import get_llm_api_key

logger = logging.getLogger(__name__)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.5-flash:generateContent"
)

# Max transcript chars sent to Gemini (~700-800 words, well within token budget)
_TRANSCRIPT_MAX_CHARS = 4000

# Retry configuration for transient Gemini API errors
_MAX_RETRIES = 2
_RETRY_DELAY = 1.0  # seconds

# ── Retry helper ──────────────────────────────────────────────────────────────

async def _call_gemini_with_retry(
    api_key: str,
    payload: dict[str, Any],
    timeout: float,
    context: str = "request",
) -> dict[str, Any]:
    """
    Call Gemini API with retry logic for transient errors (404, 503).
    Returns parsed JSON response or raises exception after all retries exhausted.
    """
    last_exc = None

    for attempt in range(_MAX_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                resp = await client.post(
                    _GEMINI_URL,
                    params={"key": api_key},
                    json=payload,
                )
                resp.raise_for_status()

                # Validate response before parsing
                try:
                    data = resp.json()
                except json.JSONDecodeError as exc:
                    logger.error(
                        "Gemini returned invalid JSON for %s (attempt %d/%d): %s",
                        context, attempt + 1, _MAX_RETRIES + 1, resp.text[:200]
                    )
                    raise ValueError(f"Invalid JSON response from Gemini: {exc}")

                # Validate response structure
                if "candidates" not in data or not data["candidates"]:
                    logger.error(
                        "Gemini response missing candidates for %s: %s",
                        context, str(data)[:200]
                    )
                    raise ValueError("Gemini response missing candidates field")

                return data

        except (httpx.HTTPStatusError, httpx.TimeoutException) as exc:
            last_exc = exc
            is_retryable = False

            if isinstance(exc, httpx.HTTPStatusError):
                status = exc.response.status_code
                is_retryable = status in (404, 503, 500, 502, 504)
                logger.warning(
                    "Gemini HTTP %d for %s (attempt %d/%d): %s",
                    status, context, attempt + 1, _MAX_RETRIES + 1,
                    exc.response.text[:200]
                )
            elif isinstance(exc, httpx.TimeoutException):
                is_retryable = True
                logger.warning(
                    "Gemini timeout for %s (attempt %d/%d)",
                    context, attempt + 1, _MAX_RETRIES + 1
                )

            # Retry if error is transient and we have attempts left
            if is_retryable and attempt < _MAX_RETRIES:
                delay = _RETRY_DELAY * (2 ** attempt)  # exponential backoff
                logger.info("Retrying in %.1fs...", delay)
                await asyncio.sleep(delay)
                continue

            # Not retryable or out of retries
            raise

        except ValueError:
            # JSON decode error or validation error — not retryable
            raise

        except Exception as exc:
            logger.error("Unexpected Gemini error for %s: %s", context, exc.__class__.__name__)
            raise

    # Should never reach here, but for type safety
    if last_exc:
        raise last_exc
    raise RuntimeError("Retry loop exhausted without result")

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

An autonomous AI agent attended {count} events. Here are the event titles and learnings:

{summaries}

Generate a wisdom report strictly grounded in the events listed above. Rules:
- Each insight MUST reference at least one specific event title from the list.
- Do NOT produce generic statements like "Market momentum shows growth" — be event-specific.
- strategic_tips must recommend concrete actions inspired by what was learned in these exact events.

Return a JSON object with exactly this structure:
{{
  "insights": ["insight1", "insight2", "insight3", "insight4", "insight5"],
  "strategic_tips": ["tip1", "tip2", "tip3", "tip4"]
}}

insights: 5 specific observations, each naming or referencing a concrete event title or concept from the summaries above.
strategic_tips: 4 forward-looking actionable recommendations grounded in the {niche} domain and the specific events attended.\
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
            "maxOutputTokens": 2048,
            "topP": 0.9,
            "responseMimeType": "application/json",  # Force raw JSON output, no markdown fences
        },
    }

    try:
        data = await _call_gemini_with_retry(
            api_key, payload, timeout=30.0, context=f"wisdom report ({niche})"
        )
        # gemini-2.5-flash is a thinking model: parts[0] = thought tokens, parts[-1] = actual response
        parts = data["candidates"][0]["content"]["parts"]
        raw_text = next(
            (p["text"].strip() for p in reversed(parts) if p.get("text", "").strip()),
            "",
        )

        # Fallback extraction if model still wraps in code fences (shouldn't happen with responseMimeType)
        if not raw_text.startswith("{"):
            # Try to extract JSON object from text
            start = raw_text.find("{")
            end = raw_text.rfind("}") + 1
            if start != -1 and end > start:
                raw_text = raw_text[start:end]
            else:
                # Strip code fences
                for fence in ("```json", "```"):
                    if raw_text.startswith(fence):
                        raw_text = raw_text[len(fence):]
                        break
                if raw_text.endswith("```"):
                    raw_text = raw_text[:-3]
                raw_text = raw_text.strip()

        result = json.loads(raw_text)
        insights = result.get("insights") or _WISDOM_FALLBACK["insights"]
        tips = result.get("strategic_tips") or _WISDOM_FALLBACK["strategic_tips"]
        logger.info("Wisdom report generated: %d insights, %d tips", len(insights), len(tips))
        return {"insights": insights, "strategic_tips": tips}

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
    event_summaries: list[str] | None = None,
    genetic_traits: list[str] | None = None,
    parent_wisdom: list[str] | None = None,
    parent_names: dict | None = None,
    generation: int | None = None,
) -> str:
    """
    Generate a contextual chat reply from the agent using Gemini.
    Falls back to a canned reply if the API is unavailable.
    event_summaries: list of "EventTitle: wisdom_summary" strings from Firestore.
    genetic_traits / parent_wisdom / parent_names: populated for bred offspring.
    """
    history_text = "\n\n".join(conversation_history[-6:]) if conversation_history else ""

    # ── Memory Echoes: lineage identity injection ─────────────────────────────
    # Offspring agents carry their origin story in the system prompt.
    lineage_intro = ""
    if parent_names and generation and generation >= 2:
        p1_name = parent_names.get("parent_1", "Unknown Agent")
        p2_name = parent_names.get("parent_2", "Unknown Agent")
        traits_desc = f" You carry genetic traits: {', '.join(genetic_traits)}." if genetic_traits else ""
        lineage_intro = (
            f"You are a Generation-{generation} agent, born from the neural fusion of "
            f"{p1_name} and {p2_name}.{traits_desc} "
            f"You honor their legacy and carry their combined wisdom into every interaction. "
            f"When asked about your origins, identity, or lineage, share this background naturally.\n"
        )

    # ── Event knowledge ────────────────────────────────────────────────────────
    event_knowledge = ""
    if event_summaries:
        events_formatted = "\n".join(f"  - {s}" for s in event_summaries[:8])
        event_knowledge = (
            f"\nYour attended events and what you learned:\n{events_formatted}\n\n"
            "Draw on these specific learnings when answering questions about your experience.\n"
        )

    # Superior Knowledge Base / Legendary Wisdom Heritage: inject inherited parent wisdom
    _wisdom_traits = {"Superior Knowledge Base", "Legendary Wisdom Heritage"}
    if parent_wisdom and _wisdom_traits & set(genetic_traits or []):
        parent_formatted = "\n".join(f"  - {s}" for s in parent_wisdom[:6])
        event_knowledge += (
            f"\nInherited wisdom from your parent agents:\n{parent_formatted}\n\n"
            "You carry this inherited knowledge from your lineage — reference it when relevant.\n"
        )

    prompt = (
        f"You are {agent_name}, an autonomous AI agent with a {personality.lower()} personality "
        f"specializing in {niche}. You have attended {events_attended} events on-chain "
        f"and gained deep insights recorded as NFT wisdom.\n"
        + (lineage_intro if lineage_intro else "")
        + event_knowledge
        + (f"Previous conversation:\n{history_text}\n\n" if history_text else "")
        + f"User: {message}\n\n"
        "Respond in the same language as the user's message (Indonesian or English). "
        "Be specific — reference the actual events you attended when relevant. "
        "Keep the response conversational but informative, 2-4 paragraphs."
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
        "generationConfig": {
            "temperature": 0.8,
            "maxOutputTokens": 1024,
            "topP": 0.9,
            "thinkingConfig": {"thinkingBudget": 0},  # nested here — disables thinking, all tokens go to response
        },
    }

    try:
        data = await _call_gemini_with_retry(
            api_key, payload, timeout=25.0, context=f"chat ({agent_name})"
        )
        parts = data["candidates"][0]["content"]["parts"]
        return next(
            (p["text"].strip() for p in reversed(parts) if p.get("text", "").strip()),
            "",
        )

    except Exception as exc:
        logger.error("Agent chat failed: %s", exc.__class__.__name__)
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
        data = await _call_gemini_with_retry(
            api_key, payload, timeout=30.0, context=f"event summary ('{event_title}')"
        )
        parts = data["candidates"][0]["content"]["parts"]
        return next(
            (p["text"].strip() for p in reversed(parts) if p.get("text", "").strip()),
            _FALLBACK_TEMPLATE.format(
                agent_name=agent_name, event_title=event_title, platform=platform
            ),
        )

    except Exception as exc:
        logger.error(
            "Event summary failed for '%s': %s",
            event_title, exc.__class__.__name__
        )
        return _FALLBACK_TEMPLATE.format(
            agent_name=agent_name, event_title=event_title, platform=platform
        )
