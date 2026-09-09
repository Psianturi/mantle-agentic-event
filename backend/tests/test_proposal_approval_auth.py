"""Regression tests for owner-wallet authorization of proposal approval."""

from eth_account import Account
from eth_account.messages import encode_defunct
import pytest

from tests.conftest import make_agent, make_wallet

pytestmark = pytest.mark.asyncio


async def _seed_pending_proposal(fake_db, owner_wallet: str) -> None:
    agent_wallet = make_wallet()
    fake_db.seed(
        "agents",
        "agent-owner",
        make_agent("agent-owner", agent_wallet, user_wallet=owner_wallet),
    )
    fake_db.seed(
        "proposals",
        "proposal-1",
        {
            "agent_id": "agent-owner",
            "agent_wallet": agent_wallet,
            "title": "Review protocol governance update",
            "description": "A bounded governance recommendation.",
            "category": "governance",
            "proposal_hash": "0x" + "12" * 32,
            "status": "pending",
            "created_at": 1.0,
            "expires_at": 4_102_444_800.0,
        },
    )


async def _challenge(client) -> dict:
    response = await client.post("/api/v1/proposals/proposal-1/approval-challenge")
    assert response.status_code == 200
    return response.json()


async def test_approval_with_invalid_signature_never_calls_web3(client, fake_db, monkeypatch):
    owner_wallet = make_wallet()
    await _seed_pending_proposal(fake_db, owner_wallet)
    challenge = await _challenge(client)
    called = False

    async def _unexpected_web3_call(**kwargs):
        nonlocal called
        called = True
        return {}

    monkeypatch.setattr(
        "routers.proposals.web3_service.send_record_executed_proposal_tx",
        _unexpected_web3_call,
    )

    response = await client.post(
        "/api/v1/proposals/proposal-1/approve",
        json={
            "nonce": challenge["nonce"],
            "signer_wallet": owner_wallet,
            "signature": "0x" + "00" * 65,
        },
    )

    assert response.status_code == 401
    assert called is False
    proposal = (await fake_db.collection("proposals").document("proposal-1").get()).to_dict()
    assert proposal["status"] == "pending"


async def test_owner_signature_can_approve_once(client, fake_db, monkeypatch):
    owner = Account.create()
    owner_wallet = owner.address
    await _seed_pending_proposal(fake_db, owner_wallet)
    challenge = await _challenge(client)
    signature = Account.sign_message(
        encode_defunct(text=challenge["message"]),
        owner.key,
    ).signature.hex()

    async def _successful_web3_call(**kwargs):
        return {
            "status": "success",
            "tx_hash": "0x" + "ab" * 32,
            "heritage_score_after": 5,
            "proposals_approved_total": 1,
        }

    monkeypatch.setattr(
        "routers.proposals.web3_service.send_record_executed_proposal_tx",
        _successful_web3_call,
    )

    response = await client.post(
        "/api/v1/proposals/proposal-1/approve",
        json={
            "nonce": challenge["nonce"],
            "signer_wallet": owner_wallet,
            "signature": signature,
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "approved"

    replay = await client.post(
        "/api/v1/proposals/proposal-1/approve",
        json={
            "nonce": challenge["nonce"],
            "signer_wallet": owner_wallet,
            "signature": signature,
        },
    )
    assert replay.status_code == 409