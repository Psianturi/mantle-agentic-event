"""
Luma Browser Service — Playwright-based autonomous RSVP worker.

Two modes:
  CAPTURE  — opens a visible browser so the user can log in via Google OAuth once.
             Returns the Luma session cookies for encrypted storage in Firestore.
  RSVP     — injects stored cookies, navigates to an event page, clicks Register/RSVP,
             and returns the result + refreshed cookies.

Chromium flags are compatible with both local headful use and Cloud Run headless
(--no-sandbox required in containerised / root-process environments).
"""

import asyncio
import logging
from typing import Any

logger = logging.getLogger(__name__)

_LUMA_DOMAINS = [".lu.ma", ".luma.com"]
_LUMA_SIGNIN_URL = "https://lu.ma/signin"
_LUMA_HOME_URL = "https://luma.com/home"   # Google OAuth lands on luma.com
_LUMA_COOKIE_URLS = ["https://lu.ma", "https://luma.com"]  # fetch cookies from both

# Chromium launch args safe for Cloud Run (headless Linux, no sandbox)
_CR_ARGS = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--single-process",
]

_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


# ── Cookie helpers ────────────────────────────────────────────────────────────

def _filter_luma_cookies(all_cookies: list[dict]) -> list[dict]:
    """Keep only cookies that belong to lu.ma / luma.com domains."""
    return [
        c for c in all_cookies
        if any(d in c.get("domain", "") for d in ("lu.ma", "luma.com"))
    ]


def _is_logged_in(url: str) -> bool:
    # Luma uses both lu.ma and luma.com — Google OAuth redirects to luma.com/home
    on_luma = "lu.ma" in url or "luma.com" in url
    not_auth_page = "signin" not in url and "login" not in url and "auth" not in url
    return on_luma and not_auth_page


# ── CAPTURE mode (one-time setup) ─────────────────────────────────────────────

async def capture_luma_session(timeout_seconds: int = 300) -> list[dict]:
    """
    Opens a VISIBLE Chromium window so the user can log in to Luma via Google OAuth.
    Waits until login is detected (URL leaves the signin page), then returns
    all Luma-domain cookies.

    Called once from the "Connect Luma Account" setup endpoint.
    Caller is responsible for KMS-encrypting and storing the returned cookies.
    """
    from playwright.async_api import async_playwright  # lazy — not installed in all envs

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False, args=["--no-sandbox"])
        context = await browser.new_context(user_agent=_UA)
        page = await context.new_page()

        await page.goto(_LUMA_SIGNIN_URL, wait_until="domcontentloaded")
        logger.info(
            "Browser opened — waiting up to %ds for user to complete Google OAuth login.",
            timeout_seconds,
        )

        try:
            # Poll until login is detected via URL change OR session cookie presence.
            # Luma may show a "Create Passkey" modal that keeps URL at /signin —
            # in that case we detect login via the __session cookie instead.
            deadline_ms = timeout_seconds * 1000
            elapsed = 0
            poll_ms = 1_500
            logged_in = False
            while elapsed < deadline_ms:
                # Primary check: URL changed away from signin
                if _is_logged_in(page.url):
                    logged_in = True
                    break
                # Fallback: session cookie already present (passkey modal edge case)
                # Explicitly fetch from both domains — Google OAuth lands on luma.com
                cookies = await context.cookies(_LUMA_COOKIE_URLS)
                if any(c["name"] == "__session" for c in cookies):
                    logger.info(
                        "Login detected via __session cookie (URL still at %s — "
                        "likely passkey modal). Dismissing modal if present.",
                        page.url,
                    )
                    # Try to dismiss passkey / any blocking modal automatically
                    for dismiss_text in ["Not Now", "Skip", "Maybe Later", "No thanks"]:
                        try:
                            btn = await page.query_selector(f'button:has-text("{dismiss_text}")')
                            if btn and await btn.is_visible():
                                await btn.click()
                                logger.info("Dismissed modal: '%s'", dismiss_text)
                                await page.wait_for_timeout(1_500)
                                break
                        except Exception:
                            pass
                    logged_in = True
                    break
                await page.wait_for_timeout(poll_ms)
                elapsed += poll_ms

            if not logged_in:
                raise TimeoutError(
                    f"Luma login not detected after {timeout_seconds}s. "
                    "User may not have completed Google OAuth."
                )

            # Wait a moment for Clerk to finalise all session cookies
            await page.wait_for_timeout(2_500)

            # Fetch cookies explicitly from both domains (lu.ma + luma.com)
            all_cookies = await context.cookies(_LUMA_COOKIE_URLS)
            luma_cookies = _filter_luma_cookies(all_cookies)

            logger.info(
                "Captured %d Luma cookies (domains: %s)",
                len(luma_cookies),
                {c["domain"] for c in luma_cookies},
            )
            return luma_cookies

        finally:
            await browser.close()


# ── OTP CONNECT mode (one-time per-user setup via email code) ────────────────

async def connect_luma_with_otp(
    email: str,
    otp_queue: asyncio.Queue,
    result_queue: asyncio.Queue,
) -> None:
    """
    Headless Playwright flow for email OTP login on Luma.

    Caller is responsible for signalling:
      - otp_queue.put(code)   → unblocks this function to submit the code
      - result_queue.get()    → caller waits here for {"success": bool, ...}

    Flow:
      1. Open lu.ma/signin headless
      2. Enter email → Luma emails a 6-digit code
      3. Await otp_queue for the code (up to 5 min)
      4. Enter code → detect login → capture cookies
      5. Put result in result_queue
    """
    from playwright.async_api import async_playwright

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True, args=_CR_ARGS)
            context = await browser.new_context(user_agent=_UA)
            page = await context.new_page()

            # Step 1: Navigate to signin
            await page.goto(_LUMA_SIGNIN_URL, wait_until="domcontentloaded", timeout=30_000)
            await page.wait_for_timeout(2_000)

            # Step 2: Enter email — Clerk renders input[type="email"] or input[name="emailAddress"]
            email_input = await page.wait_for_selector(
                'input[type="email"], input[name="emailAddress"]',
                timeout=15_000,
                state="visible",
            )
            await email_input.fill(email)
            await page.wait_for_timeout(400)

            # Click Continue/Sign In button
            await page.evaluate("""
                () => {
                    const LABELS = ['Continue', 'Sign in', 'Send', 'Next', 'Submit'];
                    const btn = [...document.querySelectorAll('button[type="submit"], button')]
                        .find(b => LABELS.some(l => (b.innerText || b.textContent || '').trim().startsWith(l)));
                    if (btn) btn.click();
                }
            """)
            logger.info("OTP connect: email '%s' submitted — waiting for Luma to send code.", email)
            await page.wait_for_timeout(3_000)

            # Step 3: Wait for OTP code from frontend (5 min timeout)
            try:
                otp_code = await asyncio.wait_for(otp_queue.get(), timeout=300)
            except asyncio.TimeoutError:
                await result_queue.put({"success": False, "error": "Timed out waiting for OTP code (5 minutes)"})
                return

            logger.info("OTP connect: received code — submitting.")

            # Step 4: Enter OTP — Clerk uses 6 individual single-char inputs OR one consolidated input
            digit_inputs = await page.query_selector_all('input[maxlength="1"]')
            if len(digit_inputs) >= 6:
                for i, char in enumerate(otp_code.strip()[:6]):
                    await digit_inputs[i].fill(char)
                    await page.wait_for_timeout(80)
            else:
                otp_input = await page.wait_for_selector(
                    'input[autocomplete="one-time-code"], input[type="text"]',
                    timeout=10_000,
                    state="visible",
                )
                await otp_input.fill(otp_code.strip())

            await page.wait_for_timeout(400)

            # Submit OTP form
            await page.evaluate("""
                () => {
                    const LABELS = ['Verify', 'Continue', 'Sign in', 'Confirm', 'Submit'];
                    const btn = [...document.querySelectorAll('button[type="submit"], button')]
                        .find(b => LABELS.some(l => (b.innerText || b.textContent || '').trim().startsWith(l)));
                    if (btn) btn.click();
                }
            """)
            await page.wait_for_timeout(5_000)

            # Step 5: Detect login + capture cookies
            all_cookies = await context.cookies(_LUMA_COOKIE_URLS)
            luma_cookies = _filter_luma_cookies(all_cookies)

            has_session = any(c["name"] in ("__session", "__client") for c in luma_cookies)
            if not has_session:
                await result_queue.put({
                    "success": False,
                    "error": "Login failed — no session cookie found. Check the code and try again.",
                })
                return

            logger.info("OTP connect: login confirmed — %d cookies captured.", len(luma_cookies))
            await result_queue.put({"success": True, "cookies": luma_cookies})

    except Exception as exc:
        logger.error("OTP connect: unexpected error: %s", exc)
        await result_queue.put({"success": False, "error": str(exc)})


# ── RSVP mode (autonomous) ────────────────────────────────────────────────────

async def rsvp_luma_event(
    cookies: list[dict],
    event_url: str,
    agent_name: str = "Agent",
) -> dict[str, Any]:
    """
    Injects stored Luma session cookies and autonomously RSVPs to an event.

    Returns a dict with:
      status           — 'success' | 'already_registered' | 'session_expired'
                         | 'no_rsvp_button' | 'error'
      rsvp_confirmed   — bool
      event_title      — str (page <title>)
      updated_cookies  — list[dict] — refreshed cookies to persist back to Firestore
      error            — str (only on status='error')
    """
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=_CR_ARGS,
        )
        context = await browser.new_context(user_agent=_UA)

        await context.add_cookies(cookies)
        page = await context.new_page()

        try:
            # ── 1. Verify session is still valid ──────────────────────────
            await page.goto(_LUMA_HOME_URL, wait_until="domcontentloaded", timeout=30_000)
            await page.wait_for_timeout(1_500)

            if not _is_logged_in(page.url):
                logger.warning("Luma session expired for agent %s — cookies need refresh.", agent_name)
                return _result("session_expired", confirmed=False)

            # ── 2. Navigate to event page ─────────────────────────────────
            logger.info("Agent %s navigating to event: %s", agent_name, event_url)
            await page.goto(event_url, wait_until="domcontentloaded", timeout=30_000)
            await page.wait_for_timeout(2_000)  # let Luma JS hydrate

            event_title = await page.title()
            logger.info("Event page loaded: '%s'", event_title)

            # ── 3. Check if past event (registration closed) ─────────────
            if await _is_past_event(page):
                logger.info("Event '%s' has ended — skipping RSVP.", event_title)
                return _result("past_event", confirmed=False, title=event_title)

            # ── 3b. Online-only filter ────────────────────────────────────
            if not await _is_online_event(page):
                logger.info("Event '%s' appears offline/in-person — skipping RSVP.", event_title)
                return _result("offline_event", confirmed=False, title=event_title)

            # ── 4. Check if already registered ───────────────────────────
            if await _already_registered(page):
                logger.info("Agent %s already registered for '%s'.", agent_name, event_title)
                updated = _filter_luma_cookies(await context.cookies(_LUMA_COOKIE_URLS))
                return _result("already_registered", confirmed=True,
                               title=event_title, cookies=updated)

            # ── 5. Handle ticket selection (pick first free non-approval ticket) ──
            ticket_selected = await _select_free_ticket(page)
            if ticket_selected:
                logger.info("Free ticket selected for '%s'.", event_title)
                await page.wait_for_timeout(1_500)

            # ── 6. Find and click main CTA button ────────────────────────
            rsvp_btn = await _find_rsvp_button(page)
            if not rsvp_btn:
                logger.warning("No RSVP/Accept button found on '%s'.", event_title)
                return _result("no_rsvp_button", confirmed=False, title=event_title)

            await rsvp_btn.click()
            logger.info("RSVP/Accept button clicked for '%s'.", event_title)
            await page.wait_for_timeout(4_000)

            # ── 7. Handle possible confirmation modal / follow-up ─────────
            await _handle_post_click_modal(page)
            await page.wait_for_timeout(2_000)

            # ── 8. Verify success ─────────────────────────────────────────
            # First pass: check current page state (may catch inline success)
            confirmed = await _check_rsvp_success(page)

            # Second pass: if not found, reload the event page — after form submit
            # Luma returns to the event page with a "You're going" badge visible
            if not confirmed:
                try:
                    await page.goto(event_url, wait_until="domcontentloaded", timeout=20_000)
                    await page.wait_for_timeout(2_000)
                    confirmed = await _already_registered(page) or await _check_rsvp_success(page)
                    logger.info("Post-reload registration check: %s", confirmed)
                except Exception as reload_err:
                    logger.warning("Post-reload check failed: %s", reload_err)

            # Debug screenshot (after reload for accurate state)
            try:
                await page.screenshot(path="rsvp_debug.png", full_page=False)
                logger.info("Screenshot saved: rsvp_debug.png")
            except Exception:
                pass

            status = "success" if confirmed else "uncertain"
            logger.info(
                "RSVP result for agent %s on '%s': %s", agent_name, event_title, status
            )

            # Clerk may have rotated the __session JWT — capture latest cookies
            updated = _filter_luma_cookies(await context.cookies(_LUMA_COOKIE_URLS))
            return _result(status, confirmed=confirmed, title=event_title, cookies=updated)

        except Exception as exc:
            logger.error("RSVP error for agent %s on %s: %s", agent_name, event_url, exc)
            return _result("error", confirmed=False, error=str(exc)[:300])

        finally:
            await browser.close()


# ── Internal helpers ──────────────────────────────────────────────────────────

async def _is_past_event(page) -> bool:
    """Return True if the event registration period has closed."""
    indicators = [
        "text=This event ended",
        "text=Event has ended",
        "text=Registration closed",
        "text=This event is over",
    ]
    for ind in indicators:
        try:
            el = await page.query_selector(ind)
            if el:
                return True
        except Exception:
            continue
    return False


async def _is_online_event(page) -> bool:
    """
    Return True if the event is online (YouTube, Zoom, Google Meet, Teams, etc.).

    Strategy:
    1. Check Luma's platform indicator element (most reliable — explicit icon/text).
    2. Fall back to body-text keyword scan.
    Defaults to True (online) when no clear offline signal is found.
    """
    # ── 1. Luma platform indicator DOM check ────────────────────────────────
    # Luma renders the meeting platform as text+icon near the event date/time.
    # "YouTube" / "Zoom" / "Google Meet" etc. appear in a dedicated element.
    platform_selectors = [
        'text="YouTube"',
        'text="Zoom"',
        'text="Google Meet"',
        'text="Microsoft Teams"',
        'text="Discord"',
        'text="Twitch"',
        'text="StreamYard"',
        'text="Hopin"',
        'text="Online"',
        'img[alt*="YouTube"]', 'img[src*="youtube"]',
        'img[alt*="Zoom"]', 'img[src*="zoom"]',
        'img[alt*="Google Meet"]',
        'svg[aria-label*="YouTube"]',
    ]
    for sel in platform_selectors:
        try:
            el = await page.query_selector(sel)
            if el:
                return True
        except Exception:
            continue

    # ── 2. Body-text keyword scan ────────────────────────────────────────────
    # "address" intentionally excluded — too common in blockchain/agent tech text.
    online_keywords = [
        "youtube.com", "youtu.be", "youtube",
        "zoom.us", "zoom.com", "zoom meeting", "zoom link",
        "meet.google.com", "google meet",
        "teams.microsoft.com", "microsoft teams",
        "discord.gg", "discord.com",
        "twitch.tv", "streamyard.com",
        "hopin.com", "airmeet.com",
        "online event", "virtual event", "remote event",
        "join online", "watch live", "livestream", "live stream", "webinar",
    ]
    offline_keywords = [
        "in-person", "in person",
        "on-site", "onsite",
        "directions to",
        "parking available",
        "doors open",
        "come join us at",
        "physical location",
        "street address",
    ]
    try:
        body_text = (await page.inner_text("body")).lower()
    except Exception:
        return True

    for kw in online_keywords:
        if kw in body_text:
            return True
    for kw in offline_keywords:
        if kw in body_text:
            return False

    return True  # default: treat as online


async def _select_free_ticket(page) -> bool:
    """
    If the event shows a ticket selection panel, find and click the first
    Free ticket that does NOT require approval (e.g. 'Virtual guest').
    Returns True if a ticket was selected, False if no ticket panel found.
    """
    # Priority: prefer 'Virtual guest', then any visible Free ticket
    priority_labels = ["Virtual guest", "General Admission", "Attend Online", "Free Ticket"]

    for label in priority_labels:
        try:
            el = await page.query_selector(f'text="{label}"')
            if el and await el.is_visible():
                # Make sure it doesn't say "Require Approval" nearby
                parent = await el.evaluate_handle("el => el.closest('div[class]') || el.parentElement")
                parent_text = await parent.evaluate("el => el.innerText")
                if "Require Approval" not in parent_text and "Sold Out" not in parent_text:
                    await el.click()
                    logger.info("Ticket selected: '%s'", label)
                    return True
        except Exception:
            continue

    # Fallback: find any row with "Free" that is not approval-gated
    try:
        free_els = await page.query_selector_all('text="Free"')
        for el in free_els:
            try:
                if not await el.is_visible():
                    continue
                parent = await el.evaluate_handle("el => el.closest('div[class]') || el.parentElement")
                parent_text = await parent.evaluate("el => el.innerText")
                if "Require Approval" not in parent_text and "Sold Out" not in parent_text:
                    await el.click()
                    logger.info("Ticket selected via fallback Free selector")
                    return True
            except Exception:
                continue
    except Exception:
        pass

    return False


async def _find_rsvp_button(page):
    """
    Try all known CTA button patterns across Luma's different event layouts.
    Priority: Accept Invite > Register > RSVP > Attend > Request to Join.
    Returns the first visible element, or None.
    """
    selectors = [
        'button:has-text("Accept Invite")',   # invite-only events
        'button:has-text("Accept")',
        'button:has-text("Register")',
        'button:has-text("RSVP")',
        'button:has-text("Attend")',
        'button:has-text("Request to Join")',
        'button:has-text("Join")',
        'a:has-text("Register")',
        'a:has-text("RSVP")',
        '[data-testid="register-button"]',
        '[data-testid="rsvp-button"]',
        '.event-cta button',
    ]
    for sel in selectors:
        try:
            el = await page.query_selector(sel)
            if el and await el.is_visible():
                return el
        except Exception:
            continue
    return None


async def _already_registered(page) -> bool:
    """Check for indicators that the user is already registered for this event."""
    indicators = [
        'text="You\'re going"',
        'text="You\'re registered"',
        'text="You\'re attending"',
        'text="Registration confirmed"',
        '[data-testid="attending-badge"]',
    ]
    for ind in indicators:
        try:
            el = await page.query_selector(ind)
            if el:
                return True
        except Exception:
            continue
    return False


async def _handle_post_click_modal(page) -> None:
    """
    After clicking RSVP, Luma shows a registration form modal:
    - Pre-filled profile fields
    - A required "agree to event terms" checkbox (native input, visually hidden)
    - An "Accept Invite" / "Register" / "Confirm" submit button

    We use page.evaluate() to click the checkbox via JS — the only reliable
    method when Luma's checkbox is styled/hidden and not actionable via Playwright.
    """
    # ── Step 1: Check the terms checkbox via JS ───────────────────────────────
    try:
        cb_found = await page.evaluate("""
            () => {
                const cb = document.querySelector('input[type="checkbox"]');
                if (!cb) return false;
                if (!cb.checked) {
                    cb.click();
                    cb.dispatchEvent(new Event('input', { bubbles: true }));
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                }
                return true;
            }
        """)
        logger.info("Checkbox found=%s, checked via JS.", cb_found)
        await page.wait_for_timeout(1_200)  # let React re-render / enable the button
    except Exception as e:
        logger.warning("JS checkbox evaluation failed: %s", e)

    # ── Step 2: Click the FORM submit button via JS ───────────────────────────
    # The page has two "Accept Invite" buttons: the initial page CTA (already
    # clicked in step 6) and the form modal submit.  The form submit is always
    # the LAST matching button in the DOM, so we reverse-iterate.  We also try
    # scoping to a <dialog>, <form>, or [role="dialog"] container first.
    try:
        clicked_text = await page.evaluate("""
            () => {
                const LABELS = ['Accept Invite', 'Register', 'Confirm', 'Submit'];
                const matches = txt => LABELS.some(l => txt.includes(l));

                // 1. Look inside dialog / form containers (modal-specific)
                for (const sel of ['dialog', '[role="dialog"]', 'form', '[data-radix-popper-content-wrapper]']) {
                    const container = document.querySelector(sel);
                    if (!container) continue;
                    for (const btn of container.querySelectorAll('button')) {
                        const txt = (btn.innerText || btn.textContent || '').trim();
                        if (matches(txt)) { btn.click(); return 'modal:' + txt; }
                    }
                }

                // 2. Fallback: last matching button in full DOM (form submit = last)
                const all = [...document.querySelectorAll('button')];
                for (const btn of all.reverse()) {
                    const txt = (btn.innerText || btn.textContent || '').trim();
                    if (matches(txt)) { btn.click(); return 'last:' + txt; }
                }
                return null;
            }
        """)
        if clicked_text:
            logger.info("Modal submit clicked via JS: '%s'", clicked_text)
            await page.wait_for_timeout(3_500)
        else:
            logger.warning("No modal submit button found via JS scan.")
    except Exception as e:
        logger.warning("JS button click failed: %s", e)


async def _check_rsvp_success(page) -> bool:
    """Return True if post-RSVP success indicators are visible."""
    indicators = [
        "text=You're going",
        "text=You're registered",
        "text=You're attending",
        "text=Registration confirmed",
        "text=See you there",
        "text=Check your email",
        "text=You're in",
        "text=Registered",
        "text=You have been registered",
        "text=Successfully registered",
        "text=You have registered",
        "text=You've registered",
        "text=Going",
        '[data-testid="registration-success"]',
        '[data-testid="attending-badge"]',
    ]
    for ind in indicators:
        try:
            el = await page.query_selector(ind)
            if el:
                return True
        except Exception:
            continue
    return False


def _result(
    status: str,
    *,
    confirmed: bool,
    title: str = "",
    cookies: list[dict] | None = None,
    error: str = "",
) -> dict[str, Any]:
    return {
        "status": status,
        "rsvp_confirmed": confirmed,
        "event_title": title,
        "updated_cookies": cookies or [],
        "error": error,
    }
