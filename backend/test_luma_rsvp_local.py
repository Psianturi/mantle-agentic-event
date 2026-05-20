"""
Local test script — run this directly to validate Luma cookie capture + RSVP.

Usage:
  python test_luma_rsvp_local.py

Step 1 (CAPTURE): A Chromium window opens. Log in to Luma with your Google account.
Step 2 (RSVP):    The script attempts to RSVP to the test event URL you provide.

Cookies are saved to luma_cookies_test.json so you don't need to re-login on each run.
"""

import asyncio
import json
import logging
import os
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

COOKIES_FILE = "luma_cookies_test.json"

# ── Change this to a real Luma event URL you want to test RSVP on ────────────
# Use an event you created yourself, or any open public event on lu.ma
TEST_EVENT_URL = "https://luma.com/spider-agents-06"  # Workshop: AI Agents Discovery (YouTube, Register button)


async def main():
    from services.luma_browser_service import capture_luma_session, rsvp_luma_event

    if not TEST_EVENT_URL or TEST_EVENT_URL == "https://lu.ma/":
        print("ERROR: Set TEST_EVENT_URL to a real Luma event URL before running.")
        sys.exit(1)

    # ── Step 1: Capture cookies (skip if already saved) ──────────────────────
    if os.path.exists(COOKIES_FILE):
        print(f"[CAPTURE] Loading existing cookies from {COOKIES_FILE}")
        with open(COOKIES_FILE) as f:
            cookies = json.load(f)
    else:
        print("[CAPTURE] Opening browser — please log in with Google...")
        cookies = await capture_luma_session(timeout_seconds=300)
        with open(COOKIES_FILE, "w") as f:
            json.dump(cookies, f, indent=2)
        print(f"[CAPTURE] {len(cookies)} cookies saved to {COOKIES_FILE}")

    # ── Step 2: Attempt autonomous RSVP ──────────────────────────────────────
    print(f"\n[RSVP] Attempting autonomous RSVP to: {TEST_EVENT_URL}")
    result = await rsvp_luma_event(
        cookies=cookies,
        event_url=TEST_EVENT_URL,
        agent_name="TestAgent-Local",
    )

    print("\n── RESULT ──────────────────────────────────────────")
    print(f"  status         : {result['status']}")
    print(f"  rsvp_confirmed : {result['rsvp_confirmed']}")
    print(f"  event_title    : {result['event_title']}")
    print(f"  updated_cookies: {len(result['updated_cookies'])} cookies")
    if result.get("error"):
        print(f"  error          : {result['error']}")

    # Save refreshed cookies
    if result["updated_cookies"]:
        with open(COOKIES_FILE, "w") as f:
            json.dump(result["updated_cookies"], f, indent=2)
        print(f"\n[CAPTURE] Refreshed cookies saved to {COOKIES_FILE}")

    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
