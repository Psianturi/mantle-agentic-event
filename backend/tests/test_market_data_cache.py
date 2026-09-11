"""Regression tests for the market data cache — a stale/missing cache entry
must trigger exactly one fetch, and a fresh one must trigger zero."""

import pytest

from services.market_data_service import _cached
from tests.fake_firestore import FakeFirestoreClient

pytestmark = pytest.mark.asyncio


async def test_cache_miss_calls_fetch_and_persists(monkeypatch):
    db = FakeFirestoreClient()
    monkeypatch.setattr("services.market_data_service.get_db", lambda: db)

    calls = 0

    async def fetch():
        nonlocal calls
        calls += 1
        return {"price": 123}

    result = await _cached("btc", ttl_seconds=300, fetch=fetch)

    assert result == {"price": 123}
    assert calls == 1
    stored = await db.collection("market_cache").document("btc").get()
    assert stored.to_dict()["payload"] == {"price": 123}


async def test_fresh_cache_skips_fetch(monkeypatch):
    db = FakeFirestoreClient()
    monkeypatch.setattr("services.market_data_service.get_db", lambda: db)
    monkeypatch.setattr("services.market_data_service.time.time", lambda: 1000.0)
    db.seed("market_cache", "btc", {"payload": {"price": 999}, "fetched_at": 1000.0})

    calls = 0

    async def fetch():
        nonlocal calls
        calls += 1
        return {"price": 1}

    result = await _cached("btc", ttl_seconds=300, fetch=fetch)

    assert result == {"price": 999}
    assert calls == 0


async def test_expired_cache_refetches(monkeypatch):
    db = FakeFirestoreClient()
    monkeypatch.setattr("services.market_data_service.get_db", lambda: db)
    monkeypatch.setattr("services.market_data_service.time.time", lambda: 2000.0)
    db.seed("market_cache", "btc", {"payload": {"price": 999}, "fetched_at": 1000.0})  # 1000s old

    calls = 0

    async def fetch():
        nonlocal calls
        calls += 1
        return {"price": 2}

    result = await _cached("btc", ttl_seconds=300, fetch=fetch)

    assert result == {"price": 2}
    assert calls == 1
