"""
LLM service: generates a "Wisdom Summary" for an attended event using Gemini.

Uses the Gemini REST API directly via httpx (no SDK dependency) for minimal
Docker image size and full async support.
"""

import logging

import httpx

from core.secrets import get_llm_api_key

logger = logging.getLogger(__name__)

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-1.5-flash:generateContent"
)

_PROMPT_TEMPLATE = """\
You are an autonomous AI agent that just attended a Web3/tech event.
Generate a concise "Wisdom Summary" — exactly 2-3 sentences — capturing the most \
valuable insights a blockchain AI agent would gain from this event.
Focus on: Web3 concepts, AI/agentic systems, DeFi, NFTs, or developer tools mentioned.

Event Title : {event_title}
Event URL   : {event_url}
Platform    : {platform}

Return ONLY the wisdom summary text. No bullet points, no preamble, no labels.\
"""

# Fallback summary when LLM is unavailable (prevents minting from failing)
_FALLBACK_TEMPLATE = (
    "Agent '{agent_name}' attended '{event_title}' on {platform} and integrated "
    "key insights into its knowledge base. Core Web3 and agentic concepts from the "
    "event were recorded as on-chain wisdom for future decision-making."
)


async def summarize_event(
    event_title: str,
    event_url: str,
    platform: str,
    agent_name: str = "Agent",
) -> str:
    """
    Call Gemini to produce a wisdom summary.
    Returns a graceful fallback string on timeout or API error — minting continues.
    """
    try:
        api_key = get_llm_api_key()
    except RuntimeError as exc:
        logger.warning("LLM API key unavailable (%s), using fallback summary", exc)
        return _FALLBACK_TEMPLATE.format(
            agent_name=agent_name, event_title=event_title, platform=platform
        )

    prompt = _PROMPT_TEMPLATE.format(
        event_title=event_title, event_url=event_url, platform=platform
    )
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 256,
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
            return (
                data["candidates"][0]["content"]["parts"][0]["text"].strip()
            )

    except httpx.TimeoutException:
        logger.warning("Gemini timeout for '%s', using fallback", event_title)
    except httpx.HTTPStatusError as exc:
        logger.error("Gemini HTTP %s for '%s': %s", exc.response.status_code, event_title, exc)
    except Exception as exc:
        logger.error("Unexpected LLM error for '%s': %s", event_title, exc)

    return _FALLBACK_TEMPLATE.format(
        agent_name=agent_name, event_title=event_title, platform=platform
    )
