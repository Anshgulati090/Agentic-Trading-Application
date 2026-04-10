from __future__ import annotations

import hashlib
from ..domain.models import AlphaTask, AlphaPlan, PlanNode


class Planner:
    """Regime-aware planner that builds a simple adaptive DAG."""

    def _infer_regime(self, market_ctx: Dict[str, Any]) -> str:
        regime = str(market_ctx.get("regime", "neutral")).lower()
        volatility = float(market_ctx.get("volatility", market_ctx.get("volatility_level", 0.0)) or 0.0)

        if not regime or regime == "neutral":
            if volatility >= 0.03:
                return "high_volatility"
            return "sideways"

        return regime

    def _regime_features(self, regime: str, requested_features: list[str]) -> list[str]:
        features = list(requested_features)
        adaptive_defaults = {
            "bull": ["trend_strength", "breakout_confirmation"],
            "bull_market": ["trend_strength", "breakout_confirmation"],
            "bear": ["downside_momentum", "drawdown_risk"],
            "bear_market": ["downside_momentum", "drawdown_risk"],
            "high_volatility": ["realized_volatility", "liquidity_stress"],
            "crash": ["liquidity_stress", "tail_risk"],
            "recovery": ["breadth_rebound", "momentum_reversal"],
            "sideways": ["mean_reversion_band", "range_compression"],
        }

        for feature in adaptive_defaults.get(regime, []):
            if feature not in features:
                features.append(feature)

        return features

    def plan(self, task: AlphaTask) -> AlphaPlan:
        # Deterministic plan id by hashing task key fields
        regime = self._infer_regime(task.market_ctx)
        regime_transition = bool(task.market_ctx.get("regime_transition", False))
        plan_key = (
            f"{task.task_id}|{task.strategy_id}|{regime}|{regime_transition}|"
            f"{task.time_window.get('start','')}|{task.time_window.get('end','')}"
        )
        plan_id = hashlib.sha1(plan_key.encode()).hexdigest()[:16]

        nodes = []
        features = self._regime_features(regime, task.features_req or [])

        # Feature nodes first
        for idx, feature in enumerate(features):
            nodes.append(
                PlanNode(
                    node_id=f"feature_{idx}",
                    node_type="feature",
                    params={"feature": feature, "market_ctx": task.market_ctx, "regime": regime},
                    depends_on=[],
                )
            )

        nodes.append(
            PlanNode(
                node_id="regime_gate",
                node_type="attribute",
                params={
                    "regime": regime,
                    "regime_transition": regime_transition,
                    "risk_hint": task.risk_hint or {},
                },
                depends_on=[],
            )
        )

        # Strategy node depends on all features
        nodes.append(
            PlanNode(
                node_id="strategy_main",
                node_type="strategy",
                params={
                    "strategy_id": task.strategy_id,
                    "market_ctx": task.market_ctx,
                    "regime": regime,
                    "adaptive": True,
                },
                depends_on=[n.node_id for n in nodes],
            )
        )

        if regime_transition:
            nodes.append(
                PlanNode(
                    node_id="recalibrate_strategy",
                    node_type="score",
                    params={
                        "objective": "regime_shift_recalibration",
                        "strategy_id": task.strategy_id,
                        "regime": regime,
                    },
                    depends_on=["strategy_main", "regime_gate"],
                )
            )

        # Validation node depends on strategy
        nodes.append(
            PlanNode(
                node_id="validate_main",
                node_type="validate",
                params={
                    "rules": ["basic_consistency", "regime_alignment", "risk_budget"],
                    "regime": regime,
                },
                depends_on=["recalibrate_strategy" if regime_transition else "strategy_main"],
            )
        )

        return AlphaPlan(plan_id=plan_id, nodes=tuple(nodes))

