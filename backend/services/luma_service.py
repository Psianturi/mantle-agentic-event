"""
Luma event data fetcher — cascading strategy for Cloud Run (no browser available).

Try 1: Official Luma API  (requires LUMA_API_KEY env var)
Try 2: httpx GET + __NEXT_DATA__ JSON parse  (Next.js server-side rendered)
Try 3: httpx GET + JSON-LD / embedded event metadata
Try 4: httpx GET + OpenGraph meta tags  (always present, minimal data)

Returns a LumaEventData dict consumed by llm_service.summarize_event().

Dict fields returned:
  title        : str
  description  : str
  speakers     : list[str]
  location     : str | None       — physical address or None for online
  start_at     : str | None       — ISO 8601 timestamp from Luma
  meeting_url  : str              — virtual meeting link (empty if hidden/physical)
  platform     : "Luma"
  event_url    : str
    source       : "official_api" | "next_data" | "json_ld" | "opengraph"
"""

import json
import logging
import os
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}

_TIMEOUT = httpx.Timeout(10.0, connect=5.0)


# ── Slug extraction ───────────────────────────────────────────────────────────

def extract_luma_slug(url: str) -> str:
    """
    Extract the event slug from any Luma URL variant.
    Handles: lu.ma/slug, luma.com/slug, https://lu.ma/slug?ref=..., etc.
    """
    match = re.search(r"(?:lu\.ma|luma\.com)/([a-zA-Z0-9][a-zA-Z0-9\-_]+)", url)
    if not match:
        raise ValueError(f"Could not extract Luma event slug from URL: {url}")
    slug = match.group(1)
    # Exclude path segments that are clearly not event slugs
    if slug in ("discover", "pricing", "login", "signup", "blog", "help", "api"):
        raise ValueError(f"URL appears to be a Luma page, not an event: {url}")
    return slug


def is_luma_url(url: str) -> bool:
    """Return True if the URL points to a Luma event page."""
    return bool(re.search(r"(?:lu\.ma|luma\.com)/", url))


def get_luma_event_status(start_at_str: str | None) -> str:
    """
    Compare event start time against now (UTC).
    Returns 'scheduled' (future), 'completed' (past/present), or 'unknown' (no timestamp).
    """
    if not start_at_str:
        return "unknown"
    try:
        normalized = start_at_str.replace("Z", "+00:00")
        event_time = datetime.fromisoformat(normalized)
        return "scheduled" if event_time > datetime.now(timezone.utc) else "completed"
    except Exception:
        return "unknown"


def extract_youtube_from_luma(luma_data: dict) -> str | None:
    """
    Return the YouTube URL if a Luma event streams on YouTube, else None.
    Used to cascade-fetch a YouTube transcript for SUPER RICH wisdom mode.
    """
    meeting_url = luma_data.get("meeting_url", "")
    if meeting_url and ("youtube.com" in meeting_url or "youtu.be" in meeting_url):
        return meeting_url
    return None


# ── Main entry point ──────────────────────────────────────────────────────────

async def fetch_luma_event(url: str) -> dict:
    """
    Fetch event metadata from a Luma URL.
    Returns a dict with: title, description, speakers, location, start_at, platform, source.
    Raises ValueError if the event cannot be fetched by any strategy.
    """
    slug = extract_luma_slug(url)
    # Preserve query params (e.g. ?tk= invite tokens) so private events authenticate correctly
    parsed_orig = urlparse(url)
    query = parsed_orig.query
    canonical_url = f"https://lu.ma/{slug}" + (f"?{query}" if query else "")

    # Try 1: Official Luma API (only if API key is configured)
    api_key = os.getenv("LUMA_API_KEY", "").strip()
    if api_key:
        result = await _try_official_api(slug, api_key)
        if result:
            logger.info("Luma event '%s' fetched via official API", slug)
            return result

    # Try 2: httpx + __NEXT_DATA__ JSON (Next.js SSR)
    html = await _fetch_html(canonical_url)
    if html:
        result = _parse_next_data(html, slug)
        if result:
            logger.info("Luma event '%s' fetched via __NEXT_DATA__", slug)
            return result

        # Try 3: JSON-LD / embedded event metadata
        result = _parse_json_ld_event(html, slug)
        if result:
            logger.info("Luma event '%s' fetched via JSON-LD metadata", slug)
            return result

        # Try 4: OpenGraph meta tags (always present, minimal data)
        result = _parse_opengraph(html, slug)
        if result:
            logger.info("Luma event '%s' fetched via OpenGraph tags", slug)
            return result

    # Try luma.com domain if lu.ma failed (post-migration redirect)
    luma_com_url = f"https://luma.com/{slug}" + (f"?{query}" if query else "")
    html = await _fetch_html(luma_com_url)
    if html:
        result = _parse_next_data(html, slug) or _parse_json_ld_event(html, slug) or _parse_opengraph(html, slug)
        if result:
            logger.info("Luma event '%s' fetched via luma.com fallback", slug)
            return result

    raise ValueError(
        f"Could not fetch Luma event data for '{slug}'. "
        "The event may be private, deleted, or Cloudflare-protected."
    )


# ── Strategy implementations ──────────────────────────────────────────────────

async def _try_official_api(slug: str, api_key: str) -> dict | None:
    """
    Official Luma API: GET /calendar/get-event?api_id=<slug>
    Requires Luma Plus subscription and a calendar-scoped API key.
    """
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            r = await client.get(
                "https://api.lu.ma/calendar/get-event",
                params={"api_id": slug},
                headers={"x-luma-api-key": api_key, "Accept": "application/json"},
            )
            if r.status_code != 200:
                logger.debug("Luma official API returned %d for slug '%s'", r.status_code, slug)
                return None
            data = r.json()
            event = data.get("event", {})
            hosts = data.get("hosts", [])
            virtual_info = event.get("virtual_info") or {}
            return {
                "title": event.get("name", slug),
                "description": _clean_text(event.get("description", "")),
                "speakers": [h.get("name") for h in hosts if h.get("name")],
                "location": (event.get("geo_address_info") or {}).get("full_address"),
                "start_at": event.get("start_at"),
                "meeting_url": virtual_info.get("url") or "",
                "platform": "Luma",
                "event_url": f"https://lu.ma/{slug}",
                "source": "official_api",
            }
    except Exception as exc:
        logger.debug("Luma official API error for '%s': %s", slug, exc)
        return None


async def _fetch_html(url: str) -> str | None:
    """Fetch raw HTML with a browser-like User-Agent. Returns None on error or Cloudflare challenge."""
    try:
        async with httpx.AsyncClient(
            timeout=_TIMEOUT,
            follow_redirects=True,
            headers=_HEADERS,
        ) as client:
            r = await client.get(url)
            if r.status_code != 200:
                logger.debug("Luma HTTP %d for %s", r.status_code, url)
                return None
            html = r.text
            # Cloudflare JS challenge pages return 200 but contain no real event data
            if "cf-browser-verification" in html or "challenge-form" in html or "jschl_vc" in html:
                logger.info("Luma fetch blocked by Cloudflare challenge for %s", url)
                return None
            return html
    except Exception as exc:
        logger.debug("Luma fetch error for %s: %s", url, exc)
        return None


def _parse_next_data(html: str, slug: str) -> dict | None:
    """
    Extract event data from Next.js __NEXT_DATA__ script tag.
    Luma is a Next.js app — SSR embeds full event JSON in the page.
    """
    try:
        match = re.search(
            r'<script[^>]+id=["\']__NEXT_DATA__["\'][^>]*>(.*?)</script>',
            html, re.DOTALL
        )
        if not match:
            return None

        data = json.loads(match.group(1))
        props = data.get("props", {}).get("pageProps", {})

        # Luma has used multiple layouts over time. Prefer the closest event dict
        # with both name/title and start_at before falling back to older shapes.
        initial = props.get("initialData") or props
        event = (
            props.get("event")
            or initial.get("event")
            or (initial.get("data") or {}).get("event")
            or {}
        )
        if not event or not event.get("name"):
            return None

        hosts = props.get("hosts") or initial.get("hosts") or (initial.get("data") or {}).get("hosts") or []
        speakers = [
            h.get("name") or h.get("user", {}).get("name", "")
            for h in hosts
            if (h.get("name") or h.get("user", {}).get("name"))
        ]

        description = _clean_text(event.get("description") or event.get("description_mirror") or "")
        location_info = event.get("geo_address_info") or {}
        virtual_info = event.get("virtual_info") or {}

        return {
            "title": event.get("name", slug),
            "description": description,
            "speakers": speakers,
            "location": location_info.get("full_address") or location_info.get("city_state"),
            "start_at": event.get("start_at"),
            "meeting_url": virtual_info.get("url") or "",
            "platform": "Luma",
            "event_url": f"https://lu.ma/{slug}",
            "source": "next_data",
        }
    except Exception as exc:
        logger.debug("__NEXT_DATA__ parse failed for '%s': %s", slug, exc)
        return None


def _parse_json_ld_event(html: str, slug: str) -> dict | None:
    """
    Extract event metadata from schema.org JSON-LD blocks or embedded event fields.
    This is the safest fallback when __NEXT_DATA__ shape changes but the page still
    exposes Event metadata such as startDate / eventStatus.
    """
    try:
        for raw_json in re.findall(
            r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
            html,
            re.DOTALL | re.IGNORECASE,
        ):
            cleaned = raw_json.strip()
            if not cleaned:
                continue
            try:
                payload = json.loads(cleaned)
            except Exception:
                continue

            event = _find_json_ld_event(payload)
            if not event:
                continue

            title = (event.get("name") or event.get("headline") or slug).strip()
            description = _clean_text(event.get("description") or "")
            location = _extract_json_ld_location(event.get("location"))
            meeting_url = _extract_json_ld_meeting_url(event)
            start_at = event.get("start_at") or event.get("startDate")
            return {
                "title": title,
                "description": description,
                "speakers": _extract_json_ld_speakers(event),
                "location": location,
                "start_at": start_at,
                "meeting_url": meeting_url,
                "platform": "Luma",
                "event_url": f"https://lu.ma/{slug}",
                "source": "json_ld",
            }

        start_at = _extract_embedded_start_at(html)
        if not start_at:
            return None

        title_match = re.search(r"<title>([^<]+)</title>", html, re.IGNORECASE)
        title = title_match.group(1).strip() if title_match else slug
        return {
            "title": title,
            "description": _clean_text(""),
            "speakers": [],
            "location": None,
            "start_at": start_at,
            "meeting_url": "",
            "platform": "Luma",
            "event_url": f"https://lu.ma/{slug}",
            "source": "json_ld",
        }
    except Exception as exc:
        logger.debug("JSON-LD parse failed for '%s': %s", slug, exc)
        return None


def _parse_opengraph(html: str, slug: str) -> dict | None:
    """
    Extract event data from OpenGraph and Twitter card meta tags.
    Always present on Luma pages — minimal data but reliable.
    """
    try:
        def _meta(prop: str, attr: str = "property") -> str:
            m = re.search(
                rf'<meta[^>]+{attr}=["\'](?:og:|twitter:)?{re.escape(prop)}["\'][^>]+content=["\']([^"\']+)["\']',
                html, re.IGNORECASE
            )
            if not m:
                # Also try reversed attribute order
                m = re.search(
                    rf'<meta[^>]+content=["\']([^"\']+)["\'][^>]+{attr}=["\'](?:og:|twitter:)?{re.escape(prop)}["\']',
                    html, re.IGNORECASE
                )
            return m.group(1).strip() if m else ""

        title = (
            _meta("title")
            or _meta("title", "name")
            or re.search(r"<title>([^<]+)</title>", html, re.IGNORECASE)
            and re.search(r"<title>([^<]+)</title>", html, re.IGNORECASE).group(1).strip()
            or slug
        )
        description = _meta("description") or _meta("description", "name")

        if not title and not description:
            return None

        return {
            "title": title,
            "description": _clean_text(description),
            "speakers": [],
            "location": None,
            "start_at": _extract_embedded_start_at(html),
            "meeting_url": "",   # OpenGraph doesn't expose meeting links
            "platform": "Luma",
            "event_url": f"https://lu.ma/{slug}",
            "source": "opengraph",
        }
    except Exception as exc:
        logger.debug("OpenGraph parse failed for '%s': %s", slug, exc)
        return None


# ── Utilities ─────────────────────────────────────────────────────────────────

def _clean_text(text: str) -> str:
    """Strip HTML tags and normalize whitespace from event description."""
    if not text:
        return ""
    # Remove HTML tags
    text = re.sub(r"<[^>]+>", " ", text)
    # Normalize whitespace
    text = re.sub(r"\s+", " ", text).strip()
    # Truncate to 3000 chars to stay within Gemini token budget
    return text[:3000]


def _find_json_ld_event(payload: object) -> dict | None:
    if isinstance(payload, dict):
        payload_type = payload.get("@type")
        if payload_type == "Event" or (isinstance(payload_type, list) and "Event" in payload_type):
            return payload
        for value in payload.values():
            found = _find_json_ld_event(value)
            if found:
                return found
    elif isinstance(payload, list):
        for item in payload:
            found = _find_json_ld_event(item)
            if found:
                return found
    return None


def _extract_json_ld_location(location: object) -> str | None:
    if isinstance(location, str):
        return location.strip() or None
    if isinstance(location, dict):
        return (
            location.get("name")
            or location.get("address")
            or location.get("url")
            or None
        )
    return None


def _extract_json_ld_speakers(event: dict) -> list[str]:
    speakers: list[str] = []
    for key in ("performer", "organizer"):
        value = event.get(key)
        items = value if isinstance(value, list) else [value]
        for item in items:
            if isinstance(item, dict) and item.get("name"):
                speakers.append(str(item["name"]).strip())
            elif isinstance(item, str) and item.strip():
                speakers.append(item.strip())
    # Preserve order while deduplicating.
    return list(dict.fromkeys(speakers))


def _extract_json_ld_meeting_url(event: dict) -> str:
    for key in ("eventAttendanceMode", "url", "contentUrl"):
        value = event.get(key)
        if isinstance(value, str) and value.startswith("http"):
            return value
    return ""


def _extract_embedded_start_at(html: str) -> str | None:
    patterns = [
        r'"start_at"\s*:\s*"([^"]+)"',
        r'"startDate"\s*:\s*"([^"]+)"',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, re.IGNORECASE)
        if match:
            return match.group(1).strip()
    return None


def build_luma_context(event_data: dict, elfa_signals: dict | None = None) -> str:
    """
    Format Luma event data into a rich context string for Gemini summarization.
    Equivalent to a YouTube transcript — provides Gemini with real content.
    If elfa_signals is provided, appends a REAL-TIME MARKET INTELLIGENCE section
    so Gemini can cross-reference event topics against live social sentiment.
    """
    parts = [f"Event: {event_data.get('title', 'Untitled')}"]

    if event_data.get("location"):
        parts.append(f"Location: {event_data['location']}")
    else:
        # Resolve online platform label from meeting_url
        meeting_url = event_data.get("meeting_url", "")
        if "youtube.com" in meeting_url or "youtu.be" in meeting_url:
            parts.append("Format: Online — YouTube Live")
        elif "zoom.us" in meeting_url:
            parts.append("Format: Online — Zoom")
        elif "meet.google.com" in meeting_url:
            parts.append("Format: Online — Google Meet")
        elif "x.com" in meeting_url or "twitter.com" in meeting_url:
            parts.append("Format: Online — X/Twitter Spaces")
        elif "t.me" in meeting_url or "telegram" in meeting_url:
            parts.append("Format: Online — Telegram Live")
        elif meeting_url:
            parts.append("Format: Online / Virtual")

    if event_data.get("start_at"):
        parts.append(f"Date: {event_data['start_at']}")

    speakers = event_data.get("speakers", [])
    if speakers:
        parts.append(f"Speakers/Hosts: {', '.join(speakers)}")

    description = event_data.get("description", "")
    if description:
        parts.append(f"\nEvent Description:\n{description}")

    if elfa_signals:
        query = elfa_signals.get("query_used", "")
        velocity = elfa_signals.get("mentions_velocity_24h", "Stable/Neutral")
        sentiment = elfa_signals.get("sentiment_bullish_pct", 50)
        parts.append(
            f"\n=== REAL-TIME MARKET INTELLIGENCE (via ELFA API) ===\n"
            f"Target Query Tracked: {query}\n"
            f"Social Mention Volume (24h): {velocity}\n"
            f"Market Sentiment Score: {sentiment}% Bullish Momentum"
        )

    return "\n".join(parts)
