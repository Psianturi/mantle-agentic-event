"""Regression tests for market-context formatting in proposal generation."""

from services.llm_service import _format_market_context


def test_empty_market_context_produces_empty_text():
    assert _format_market_context(None) == ""
    assert _format_market_context({}) == ""
    assert _format_market_context({"prices": {}, "fear_greed": None}) == ""


def test_includes_prices_and_fear_greed():
    market_context = {
        "prices": {"bitcoin": {"usd": 78000, "usd_24h_change": 1.5}},
        "fear_greed": {"value": 70, "value_classification": "Greed"},
        "generated_at": 1_757_000_000,
    }

    text = _format_market_context(market_context)

    assert "BITCOIN" in text
    assert "78000" in text
    assert "1.5" in text
    assert "Fear & Greed Index: 70 (Greed)" in text
    assert "defi" in text.lower()  # instructs the model when to weigh this in


def test_missing_generated_at_does_not_crash():
    market_context = {"prices": {"mantle": {"usd": 0.6}}, "fear_greed": None}

    text = _format_market_context(market_context)

    assert "MANTLE" in text
    assert "unknown time" in text
