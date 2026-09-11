"""Regression tests for owner-wallet authorization of proposal approval/rejection."""

from eth_account import Account
from eth_account.messages import encode_defunct
import pytest

from routers.proposals import _approval_attempts
from tests.conftest import make_agent, make_wallet

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
def _reset_rate_limit():
    """_approval_attempts is a module-level dict shared across the whole test
    session — without this, tests calling approve/reject on the same proposal_id
    accumulate attempts and later tests get spuriously rate-limited (429)."""
    _approval_attempts.clear()


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


async def _challenge(client, action: str = "approve") -> dict:
    response = await client.post(f"/api/v1/proposals/proposal-1/approval-challenge?action={action}")
    assert response.status_code == 200
    return response.json()


def _sign(owner: Account, message: str) -> str:
    return Account.sign_message(encode_defunct(text=message), owner.key).signature.hex()


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
    assert replay.status_code == 401


async def test_reject_with_invalid_signature_is_rejected(client, fake_db):
    owner_wallet = make_wallet()
    await _seed_pending_proposal(fake_db, owner_wallet)
    challenge = await _challenge(client, action="reject")

    response = await client.post(
        "/api/v1/proposals/proposal-1/reject",
        json={
            "nonce": challenge["nonce"],
            "signer_wallet": owner_wallet,
            "signature": "0x" + "00" * 65,
        },
    )

    assert response.status_code == 401
    proposal = (await fake_db.collection("proposals").document("proposal-1").get()).to_dict()
    assert proposal["status"] == "pending"


async def test_owner_signature_can_reject_once(client, fake_db):
    owner = Account.create()
    await _seed_pending_proposal(fake_db, owner.address)
    challenge = await _challenge(client, action="reject")
    signature = _sign(owner, challenge["message"])

    response = await client.post(
        "/api/v1/proposals/proposal-1/reject",
        json={"nonce": challenge["nonce"], "signer_wallet": owner.address, "signature": signature},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "rejected"

    replay = await client.post(
        "/api/v1/proposals/proposal-1/reject",
        json={"nonce": challenge["nonce"], "signer_wallet": owner.address, "signature": signature},
    )
    assert replay.status_code == 401


async def test_approve_challenge_cannot_be_used_to_reject(client, fake_db):
    owner = Account.create()
    await _seed_pending_proposal(fake_db, owner.address)
    challenge = await _challenge(client, action="approve")
    signature = _sign(owner, challenge["message"])

    response = await client.post(
        "/api/v1/proposals/proposal-1/reject",
        json={"nonce": challenge["nonce"], "signer_wallet": owner.address, "signature": signature},
    )

    assert response.status_code == 401
    proposal = (await fake_db.collection("proposals").document("proposal-1").get()).to_dict()
    assert proposal["status"] == "pending"


async def test_reject_challenge_cannot_be_used_to_approve(client, fake_db, monkeypatch):
    owner = Account.create()
    await _seed_pending_proposal(fake_db, owner.address)
    challenge = await _challenge(client, action="reject")
    signature = _sign(owner, challenge["message"])
    called = False

    async def _unexpected_web3_call(**kwargs):
        nonlocal called
        called = True
        return {}

    monkeypatch.setattr("routers.proposals.web3_service.send_record_executed_proposal_tx", _unexpected_web3_call)

    response = await client.post(
        "/api/v1/proposals/proposal-1/approve",
        json={"nonce": challenge["nonce"], "signer_wallet": owner.address, "signature": signature},
    )

    assert response.status_code == 401
    assert called is False