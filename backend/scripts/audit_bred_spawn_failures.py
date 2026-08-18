"""
Audit bred agents that failed to spawn on V4 (spawned_on_v4 != True).

Finds the same silent-fail pattern that affected "Coco": a bred offspring
whose breedAgents() tx succeeded on-chain, but whose follow-up
spawnBredAgent() failed (usually MINTER_SERVICE out of gas at the time).
Those agents sit in Firestore with spawned_on_v4=False indefinitely.

Run locally with the service account that has "Cloud Datastore User":

    GOOGLE_APPLICATION_CREDENTIALS=path/to/sa.json python scripts/audit_bred_spawn_failures.py

Outputs a table of affected agents and, with --retry, kicks off a retry for
each via the backend retry-spawn endpoint. Retry uses the breed_tx_hash
already stored on the agent doc, so the user does not re-pay.

Requires:
    pip install google-cloud-firestore httpx

Environment:
    BACKEND_URL  — backend base URL (default: production Cloud Run)
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys

from google.cloud import firestore_async

logging.basicConfig(level=logging.INFO, format="%(levelname)-8s %(message)s")
logger = logging.getLogger("audit-bred")

AGENTS_COLLECTION = "agents"

DEFAULT_BACKEND_URL = "https://mantle-agentic-event-21898396920.asia-southeast1.run.app"


async def find_failed_bred_agents(db) -> list[dict]:
    """
    Scan the agents collection for bred offspring that never spawned on V4.

    Firestore does not index spawned_on_v4 by default, so we stream the whole
    collection and filter in Python. The agents collection is small (<100 docs
    in testnet), so a full scan is cheap and avoids needing a composite index.
    """
    failed: list[dict] = []
    async for doc in db.collection(AGENTS_COLLECTION).stream():
        data = doc.to_dict() or {}
        if data.get("ownership_status") != "bred":
            continue
        if data.get("spawned_on_v4") is True:
            continue
        failed.append({
            "agent_id": doc.id,
            "agent_name": data.get("agent_name", "?"),
            "agent_wallet": data.get("agent_wallet", "?"),
            "user_wallet": data.get("user_wallet", "?"),
            "chain_id": data.get("chain_id", 5003),
            "breed_tx_hash": data.get("breed_tx_hash"),
            "generation": data.get("generation"),
            "created_at": data.get("created_at"),
        })
    return failed


def print_table(rows: list[dict]) -> None:
    if not rows:
        print("\nNo failed bred agents found. All bred offspring spawned on V4.")
        return

    print(f"\n{'='*100}")
    print(f"Found {len(rows)} bred agent(s) with spawned_on_v4 != True")
    print(f"{'='*100}")
    header = f"{'agent_id':<28} {'name':<16} {'chain':<6} {'gen':<4} {'breed_tx_hash':<20}"
    print(header)
    print("-" * len(header))
    for r in rows:
        tx = (r["breed_tx_hash"] or "NONE")[:18] + ".."
        print(f"{r['agent_id']:<28} {r['agent_name']:<16} {str(r['chain_id']):<6} {str(r['generation']):<4} {tx:<20}")
    print()


async def retry_agent(client, base_url: str, agent: dict) -> dict:
    """Call POST /api/v1/agent/{id}/retry-spawn?wallet=... for one agent."""
    import httpx

    url = f"{base_url}/api/v1/agent/{agent['agent_id']}/retry-spawn"
    params = {"wallet": agent["user_wallet"]}
    try:
        resp = await client.post(url, params=params, timeout=60.0)
        return {"agent_id": agent["agent_id"], "status_code": resp.status_code, "body": resp.json()}
    except Exception as exc:
        return {"agent_id": agent["agent_id"], "error": str(exc)}


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--retry",
        action="store_true",
        help="Trigger retry-spawn for each failed agent via the backend API.",
    )
    parser.add_argument(
        "--backend-url",
        default=os.environ.get("BACKEND_URL", DEFAULT_BACKEND_URL),
        help="Backend base URL for retry calls (default: production Cloud Run).",
    )
    args = parser.parse_args()

    db = firestore_async.AsyncClient()

    logger.info("Scanning %s collection for bred agents with spawned_on_v4 != True ...", AGENTS_COLLECTION)
    failed = await find_failed_bred_agents(db)
    print_table(failed)

    if not failed:
        return

    if not args.retry:
        print("Dry run only. Re-run with --retry to trigger retry-spawn for each agent.")
        return

    # Block on agents missing the data needed to retry.
    retryable = [a for a in failed if a["breed_tx_hash"] and a["user_wallet"]]
    skipped = [a for a in failed if a not in retryable]
    if skipped:
        print(f"Skipping {len(skipped)} agent(s) missing breed_tx_hash or user_wallet (cannot retry):")
        for a in skipped:
            print(f"  - {a['agent_id']} ({a['agent_name']})")

    if not retryable:
        print("No agents are eligible for retry.")
        return

    print(f"\nTriggering retry-spawn for {len(retryable)} agent(s) via {args.backend_url} ...")
    import httpx
    async with httpx.AsyncClient() as client:
        results = await asyncio.gather(*[retry_agent(client, args.backend_url, a) for a in retryable])

    print("\nRetry results:")
    for r in results:
        if "error" in r:
            print(f"  ✗ {r['agent_id']}: ERROR {r['error']}")
        else:
            print(f"  → {r['agent_id']}: HTTP {r['status_code']} → {r['body']}")


if __name__ == "__main__":
    asyncio.run(main())