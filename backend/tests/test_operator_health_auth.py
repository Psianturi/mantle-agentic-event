"""Regression tests for the operator health endpoint's auth gate."""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from tests.fake_firestore import FakeFirestoreClient

pytestmark = pytest.mark.asyncio


@pytest_asyncio.fixture
async def operator_client(monkeypatch):
    fake_db = FakeFirestoreClient()
    monkeypatch.setattr("routers.operator.get_db", lambda: fake_db)
    monkeypatch.setattr(
        "routers.operator.web3_service.get_minter_balance_status",
        lambda chain_id: {"chain_id": chain_id, "balance": 5.0, "threshold": 4.0, "healthy": True},
    )

    from main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def test_unconfigured_key_returns_503(operator_client, monkeypatch):
    monkeypatch.setattr("routers.operator.get_operator_api_key", lambda: None)

    response = await operator_client.get("/api/v1/operator/health")

    assert response.status_code == 503


async def test_missing_header_returns_401(operator_client, monkeypatch):
    monkeypatch.setattr("routers.operator.get_operator_api_key", lambda: "secret-key")

    response = await operator_client.get("/api/v1/operator/health")

    assert response.status_code == 401


async def test_wrong_header_returns_401(operator_client, monkeypatch):
    monkeypatch.setattr("routers.operator.get_operator_api_key", lambda: "secret-key")

    response = await operator_client.get(
        "/api/v1/operator/health", headers={"X-Operator-Key": "wrong-key"}
    )

    assert response.status_code == 401


async def test_correct_header_returns_200(operator_client, monkeypatch):
    monkeypatch.setattr("routers.operator.get_operator_api_key", lambda: "secret-key")

    response = await operator_client.get(
        "/api/v1/operator/health", headers={"X-Operator-Key": "secret-key"}
    )

    assert response.status_code == 200
    body = response.json()
    assert "minter_service" in body
    assert "proposals" in body
