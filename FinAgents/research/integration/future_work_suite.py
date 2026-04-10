"""Future-work completion suite for research-grade FinAgents.

This module turns the roadmap items into a reproducible experiment harness:

- Longer-horizon and broader-market benchmark scenarios
- Ablations for gating, memory, and messaging
- Broader signal inputs via headlines, macro reports, and social-style chatter
- Replication artifacts and logs for each run
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

from FinAgents.research.integration.research_report import ResearchReportGenerator
from FinAgents.research.integration.system_integrator import (
    ResearchSystemConfig,
    ResearchSystemIntegrator,
)
from FinAgents.research.evaluation.comparison_engine import ComparisonEngine
from FinAgents.research.data_pipeline.data_sources import (
    SimulatedNewsGenerator,
    SyntheticReportGenerator,
)
from FinAgents.research.domain_agents.base_agent import MarketContext
from FinAgents.research.multimodal.text_encoder import TextEncoder
from FinAgents.research.simulation.market_environment import MarketRegime


@dataclass(frozen=True)
class FutureWorkVariant:
    """Experiment toggles used in the roadmap ablation suite."""

    name: str
    gating_enabled: bool = True
    memory_enabled: bool = True
    messaging_enabled: bool = True
    broader_signals_enabled: bool = True


@dataclass(frozen=True)
class FutureWorkScenario:
    """Scenario definition for longer-horizon / multi-market experiments."""

    name: str
    description: str
    symbols: List[str]
    horizon_steps: int
    forced_regime: Optional[str] = None


@dataclass
class ScenarioRunArtifact:
    """Serializable record of a single scenario/variant run."""

    scenario: str
    variant: str
    output_dir: str
    total_return_pct: float
    final_portfolio_value: float
    sharpe_ratio: float
    max_drawdown: float
    num_decisions: int
    num_snapshots: int
    config: Dict[str, Any] = field(default_factory=dict)


class ReplicationArtifactWriter:
    """Writes benchmark outputs and logs for replication."""

    def __init__(self, base_dir: str | Path) -> None:
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def write_run(
        self,
        scenario: FutureWorkScenario,
        variant: FutureWorkVariant,
        config: ResearchSystemConfig,
        result: Any,
        report: Any,
    ) -> ScenarioRunArtifact:
        run_dir = self.base_dir / scenario.name / variant.name
        run_dir.mkdir(parents=True, exist_ok=True)

        (run_dir / "config.json").write_text(
            json.dumps(self._to_jsonable(asdict(config)), indent=2),
            encoding="utf-8",
        )
        (run_dir / "summary.json").write_text(
            json.dumps(
                {
                    "summary": report.summary,
                    "financial_metrics": self._to_jsonable(report.financial_metrics),
                    "ai_metrics": self._to_jsonable(report.ai_metrics),
                },
                indent=2,
            ),
            encoding="utf-8",
        )
        (run_dir / "decision_log.json").write_text(
            json.dumps(self._to_jsonable(result.decision_log), indent=2),
            encoding="utf-8",
        )
        (run_dir / "agent_performance.json").write_text(
            json.dumps(self._to_jsonable(result.agent_performance), indent=2),
            encoding="utf-8",
        )
        (run_dir / "performance_metrics.json").write_text(
            json.dumps(self._to_jsonable(result.performance_metrics), indent=2),
            encoding="utf-8",
        )

        artifact = ScenarioRunArtifact(
            scenario=scenario.name,
            variant=variant.name,
            output_dir=str(run_dir),
            total_return_pct=float(result.total_return_pct),
            final_portfolio_value=float(result.final_portfolio_value),
            sharpe_ratio=float(report.financial_metrics.get("sharpe_ratio", 0.0)),
            max_drawdown=float(report.financial_metrics.get("max_drawdown", 0.0)),
            num_decisions=len(result.decision_log),
            num_snapshots=len(result.snapshots),
            config={
                "symbols": config.symbols,
                "horizon_steps": config.num_steps,
                "gating_enabled": config.gating_enabled,
                "memory_enabled": config.memory_enabled,
                "messaging_enabled": config.messaging_enabled,
                "broader_signals_enabled": config.broader_signals_enabled,
            },
        )

        (run_dir / "manifest.json").write_text(
            json.dumps(self._to_jsonable(asdict(artifact)), indent=2),
            encoding="utf-8",
        )
        return artifact

    def write_suite_summary(self, payload: Dict[str, Any]) -> None:
        (self.base_dir / "suite_summary.json").write_text(
            json.dumps(self._to_jsonable(payload), indent=2),
            encoding="utf-8",
        )

    def _to_jsonable(self, value: Any) -> Any:
        if isinstance(value, dict):
            return {str(k): self._to_jsonable(v) for k, v in value.items()}
        if isinstance(value, list):
            return [self._to_jsonable(v) for v in value]
        if isinstance(value, tuple):
            return [self._to_jsonable(v) for v in value]
        if isinstance(value, Path):
            return str(value)
        if isinstance(value, datetime):
            return value.isoformat()
        if callable(value):
            return getattr(value, "__name__", value.__class__.__name__)
        return value


class BroaderSignalContextProvider:
    """Injects broader signal sources and memory traces into MarketContext."""

    def __init__(
        self,
        symbols: List[str],
        memory_enabled: bool,
        random_seed: Optional[int] = 42,
        headline_csv_path: Optional[str | Path] = None,
    ) -> None:
        self.symbols = list(symbols)
        self.memory_enabled = memory_enabled
        self.text_encoder = TextEncoder()
        self.news_generator = SimulatedNewsGenerator(random_seed=random_seed)
        self.report_generator = SyntheticReportGenerator(random_seed=random_seed)
        self._headline_rows = self._load_headlines(headline_csv_path)
        self._previous_regime_by_symbol: Dict[str, str] = {}
        self._memory_notes: Dict[str, List[str]] = {symbol: [] for symbol in self.symbols}

    def __call__(
        self,
        step: int,
        symbol: str,
        market_data: Any,
        state: Any,
        active_events: List[Any],
        default_context: MarketContext,
    ) -> MarketContext:
        selected_headlines = self._headline_slice(step, limit=3)
        simulated = self.news_generator.generate_headlines(
            symbol=symbol,
            date_range=pd.date_range(datetime(2024, 1, 1) + timedelta(days=step), periods=1),
            count_per_day=2,
        )
        simulated_text = [item.headline for item in simulated]
        social_text = self._build_social_chatter(symbol, selected_headlines + simulated_text)
        memory_text = self._memory_notes.get(symbol, [])[:2] if self.memory_enabled else []

        all_text = selected_headlines + simulated_text + social_text + memory_text
        sentiment = 0.0
        if all_text:
            sentiment_scores = [
                self.text_encoder.analyze_sentiment(text).score
                for text in all_text
            ]
            sentiment = float(sum(sentiment_scores) / len(sentiment_scores))

        macro_report = self.report_generator.generate_macro_report(
            {
                "gdp_growth": 2.0 + (0.6 if sentiment > 0 else -0.2),
                "inflation": 2.2 + max(default_context.volatility_level or 0.0, 0.0) * 10,
                "unemployment": 3.8 if sentiment >= 0 else 4.6,
                "fed_rate": 4.25 if default_context.regime not in {"RECOVERY", "BULL"} else 3.75,
            }
        )

        previous_regime = self._previous_regime_by_symbol.get(symbol)
        current_regime = state.regime.value if state is not None else (default_context.regime or "SIDEWAYS")
        regime_transition = previous_regime is not None and previous_regime != current_regime
        if state is not None:
            self._previous_regime_by_symbol[symbol] = current_regime

        events = list(default_context.events)
        events.extend([f"headline:{headline}" for headline in selected_headlines])
        events.extend([f"social:{headline}" for headline in social_text[:2]])
        if regime_transition:
            events.append(f"regime_shift:{previous_regime}->{current_regime}")

        macro_indicators = {
            "gdp_growth": macro_report.gdp_growth,
            "interest_rate": macro_report.fed_rate,
            "inflation": macro_report.inflation,
            "unemployment": macro_report.unemployment,
            "regime_transition": 1.0 if regime_transition else 0.0,
        }

        return MarketContext(
            regime=current_regime,
            volatility_level=default_context.volatility_level,
            sentiment=sentiment,
            macro_indicators=macro_indicators,
            events=events[:8],
        )

    def on_step_end(self, **kwargs: Any) -> None:
        if not self.memory_enabled:
            return

        market_states = kwargs.get("market_states", {})
        trades = kwargs.get("trades", [])
        for symbol, state in market_states.items():
            if state is None:
                continue
            note = (
                f"memory:{symbol}:regime={state.regime.value}:"
                f"vol={state.volatility:.4f}:price={state.current_price:.2f}"
            )
            bucket = self._memory_notes.setdefault(symbol, [])
            bucket.insert(0, note)
            self._memory_notes[symbol] = bucket[:5]

        for trade in trades:
            symbol = trade.get("symbol")
            if not symbol:
                continue
            note = (
                f"memory:{symbol}:last_trade={trade.get('side','NA')}:"
                f"fill={trade.get('price', 0.0):.2f}:slippage={trade.get('slippage', 0.0):.4f}"
            )
            bucket = self._memory_notes.setdefault(symbol, [])
            bucket.insert(0, note)
            self._memory_notes[symbol] = bucket[:5]

    def _load_headlines(self, headline_csv_path: Optional[str | Path]) -> List[Dict[str, Any]]:
        candidate = (
            Path(headline_csv_path)
            if headline_csv_path is not None
            else Path(__file__).resolve().parents[2] / "memory_testing" / "sp500_headlines_2008_2024.csv"
        )
        if not candidate.exists():
            return []

        frame = pd.read_csv(candidate)
        if "Date" in frame.columns:
            frame["Date"] = pd.to_datetime(frame["Date"], errors="coerce")
        frame = frame.dropna(subset=["Title", "Date"]).reset_index(drop=True)
        return frame.to_dict("records")

    def _headline_slice(self, step: int, limit: int) -> List[str]:
        if not self._headline_rows:
            return []

        start = (step * limit) % len(self._headline_rows)
        rows = self._headline_rows[start : start + limit]
        return [str(row["Title"]) for row in rows]

    def _build_social_chatter(self, symbol: str, headlines: List[str]) -> List[str]:
        if not headlines:
            return [f"{symbol} retail chatter is quiet but monitoring momentum and macro tone."]

        chatter = []
        for headline in headlines[:2]:
            chatter.append(f"{symbol} social sentiment reacts to: {headline}")
        chatter.append(f"{symbol} community flow tracks volatility, breadth, and earnings tone.")
        return chatter


DEFAULT_SCENARIOS: List[FutureWorkScenario] = [
    FutureWorkScenario(
        name="us_equities_medium_horizon",
        description="Core US equities over a medium horizon with multi-agent coordination.",
        symbols=["AAPL", "MSFT", "GOOG"],
        horizon_steps=120,
        forced_regime=MarketRegime.BULL.value,
    ),
    FutureWorkScenario(
        name="diversified_etfs_long_horizon",
        description="Longer-horizon ETF basket benchmark across broad US market exposures.",
        symbols=["SPY", "QQQ", "IWM", "VTI", "VXUS"],
        horizon_steps=252,
        forced_regime=MarketRegime.SIDEWAYS.value,
    ),
    FutureWorkScenario(
        name="crypto_etfs_regime_shift",
        description="Crypto ETF basket with higher volatility and explicit regime-shift pressure.",
        symbols=["IBIT", "FBTC", "GBTC"],
        horizon_steps=252,
        forced_regime=MarketRegime.HIGH_VOLATILITY.value,
    ),
]

DEFAULT_VARIANTS: List[FutureWorkVariant] = [
    FutureWorkVariant(name="enhanced"),
    FutureWorkVariant(name="no_gating", gating_enabled=False),
    FutureWorkVariant(name="no_memory", memory_enabled=False),
    FutureWorkVariant(name="no_messaging", messaging_enabled=False),
]


def run_future_work_suite(
    output_dir: Optional[str | Path] = None,
    verbose: bool = False,
    scenarios: Optional[List[FutureWorkScenario]] = None,
    variants: Optional[List[FutureWorkVariant]] = None,
) -> Dict[str, Any]:
    """Run the future-work benchmark and ablation suite."""

    scenarios = scenarios or DEFAULT_SCENARIOS
    variants = variants or DEFAULT_VARIANTS
    base_dir = (
        Path(output_dir)
        if output_dir is not None
        else Path(__file__).resolve().parents[1] / "artifacts" / "future_work"
    )
    writer = ReplicationArtifactWriter(base_dir)
    reporter = ResearchReportGenerator()
    comparison_engine = ComparisonEngine()

    scenario_results: Dict[str, Dict[str, Any]] = {}
    suite_runs: List[ScenarioRunArtifact] = []
    raw_results: Dict[str, Dict[str, Any]] = {}

    for scenario in scenarios:
        if verbose:
            print(f"[future-work] scenario={scenario.name}")
        scenario_results[scenario.name] = {}
        raw_results[scenario.name] = {}

        for variant in variants:
            context_provider = BroaderSignalContextProvider(
                symbols=scenario.symbols,
                memory_enabled=variant.memory_enabled,
            )
            config = ResearchSystemConfig(
                symbols=scenario.symbols,
                initial_prices=_initial_prices_for_symbols(scenario.symbols),
                num_steps=scenario.horizon_steps,
                include_risk_manager=variant.gating_enabled,
                gating_enabled=variant.gating_enabled,
                memory_enabled=variant.memory_enabled,
                messaging_enabled=variant.messaging_enabled,
                broader_signals_enabled=variant.broader_signals_enabled,
                market_config={
                    "forced_regime": scenario.forced_regime,
                },
                context_provider=context_provider if variant.broader_signals_enabled else None,
                post_step_callback=context_provider.on_step_end if variant.memory_enabled else None,
                replication_artifact_dir=str(base_dir / scenario.name / variant.name),
            )

            integrator = ResearchSystemIntegrator(config)
            system = integrator.build_system()
            result = system.simulation_runner.run(verbose=False)
            report = reporter.generate(result)
            artifact = writer.write_run(scenario, variant, config, result, report)

            suite_runs.append(artifact)
            scenario_results[scenario.name][variant.name] = asdict(artifact)
            raw_results[scenario.name][variant.name] = result

        enhanced = raw_results[scenario.name]["enhanced"]
        for variant in variants:
            if variant.name == "enhanced":
                continue
            comparison = comparison_engine.compare(
                raw_results[scenario.name][variant.name],
                enhanced,
            )
            scenario_results[scenario.name][variant.name]["vs_enhanced"] = {
                "summary": comparison.summary,
                "improvements": comparison.improvements,
                "statistical_tests": comparison.statistical_tests,
            }

    payload = {
        "generated_at": datetime.utcnow().isoformat(),
        "scenarios": scenario_results,
        "runs": [asdict(run) for run in suite_runs],
    }
    writer.write_suite_summary(payload)
    return payload


def _initial_prices_for_symbols(symbols: List[str]) -> Dict[str, float]:
    initial_prices: Dict[str, float] = {}
    for symbol in symbols:
        upper = symbol.upper()
        if upper in {"SPY", "QQQ", "VTI", "IWM", "VXUS"}:
            initial_prices[upper] = 100.0 + len(upper) * 10
        elif upper in {"IBIT", "FBTC", "GBTC"}:
            initial_prices[upper] = 45.0 + len(upper) * 3
        else:
            initial_prices[upper] = 120.0 + len(upper) * 8
    return initial_prices


__all__ = [
    "BroaderSignalContextProvider",
    "FutureWorkScenario",
    "FutureWorkVariant",
    "ReplicationArtifactWriter",
    "run_future_work_suite",
]
