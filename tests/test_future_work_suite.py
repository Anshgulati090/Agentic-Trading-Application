from __future__ import annotations

from datetime import datetime

from FinAgents.agent_pools.alpha_agent_pool.core.services.planner import Planner
from FinAgents.agent_pools.alpha_agent_pool.core.domain.models import AlphaTask
from FinAgents.research.domain_agents.base_agent import MarketContext
from FinAgents.research.integration.future_work_suite import BroaderSignalContextProvider
from FinAgents.research.simulation.market_environment import MarketRegime, MarketState


def test_regime_aware_planner_adds_adaptive_nodes() -> None:
    planner = Planner()
    task = AlphaTask(
        task_id="task-1",
        strategy_id="momentum",
        market_ctx={
            "regime": "bear_market",
            "volatility_level": 0.05,
            "regime_transition": True,
        },
        time_window={"start": "2024-01-01", "end": "2024-12-31"},
        features_req=["returns_20d"],
    )

    plan = planner.plan(task)
    node_ids = {node.node_id for node in plan.nodes}
    feature_names = {
        node.params.get("feature")
        for node in plan.nodes
        if node.node_type == "feature"
    }

    assert "regime_gate" in node_ids
    assert "recalibrate_strategy" in node_ids
    assert "downside_momentum" in feature_names
    assert "drawdown_risk" in feature_names


def test_broader_signal_context_provider_enriches_context_and_memory() -> None:
    provider = BroaderSignalContextProvider(
        symbols=["AAPL"],
        memory_enabled=True,
        random_seed=7,
    )
    state = MarketState(
        symbol="AAPL",
        current_price=150.0,
        open=149.0,
        high=151.0,
        low=148.5,
        volume=1000.0,
        timestamp=datetime.utcnow(),
        regime=MarketRegime.BULL,
        volatility=0.03,
        bid=149.9,
        ask=150.1,
        price_history=[],
        order_book=None,
    )
    default_context = MarketContext(
        regime="BULL",
        volatility_level=0.03,
        sentiment=0.0,
        macro_indicators={},
        events=["earnings"],
    )

    provider.on_step_end(
        step=0,
        market_states={"AAPL": state},
        trades=[{"symbol": "AAPL", "side": "BUY", "price": 150.0, "slippage": 0.01}],
    )
    enriched = provider(
        step=1,
        symbol="AAPL",
        market_data=None,
        state=state,
        active_events=[],
        default_context=default_context,
    )

    assert enriched.sentiment is not None
    assert enriched.macro_indicators["gdp_growth"] > 0
    assert any(event.startswith("headline:") for event in enriched.events)
    assert any("social:" in event or "memory:" in event for event in enriched.events)
