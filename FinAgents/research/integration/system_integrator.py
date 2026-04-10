"""System integrator for research-grade FinAgents enhancements."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

from FinAgents.research.coordination.coordinator import AgentCoordinator
from FinAgents.research.data_pipeline.data_sources import (
    DataSourceManager,
    SimulatedNewsGenerator,
    SyntheticReportGenerator,
)
from FinAgents.research.data_pipeline.feature_engineering import FeatureEngineer
from FinAgents.research.data_pipeline.preprocessor import DataPreprocessor
from FinAgents.research.domain_agents.analyst_agent import AnalystAgent
from FinAgents.research.domain_agents.portfolio_manager_agent import PortfolioManagerAgent
from FinAgents.research.domain_agents.risk_manager_agent import RiskManagerAgent
from FinAgents.research.domain_agents.trader_agent import TraderAgent
from FinAgents.research.explainability.decision_audit import DecisionAuditTrail
from FinAgents.research.explainability.explanation_renderer import ExplanationRenderer
from FinAgents.research.explainability.reasoning_chain import ReasoningChain
from FinAgents.research.memory_learning.experience_replay import ExperienceReplayBuffer
from FinAgents.research.memory_learning.learning_loop import LearningLoop
from FinAgents.research.memory_learning.reward_engine import RewardEngine
from FinAgents.research.memory_learning.trade_memory import TradeMemoryStore
from FinAgents.research.multimodal.multimodal_agent import MultimodalAgent
from FinAgents.research.risk_compliance.compliance_engine import ComplianceEngine
from FinAgents.research.risk_compliance.constraints import (
    ConcentrationConstraint,
    ConstraintManager,
    CorrelationConstraint,
    MaxDrawdownConstraint,
    PositionSizeConstraint,
    TurnoverConstraint,
)
from FinAgents.research.risk_compliance.regulatory_checks import RegulatoryChecker
from FinAgents.research.risk_compliance.risk_dashboard import RiskDashboard
from FinAgents.research.simulation.simulation_runner import (
    SimulationConfig,
    SimulationRunner,
)


@dataclass
class ResearchSystemConfig:
    """Configuration for the integrated research system."""

    symbols: List[str] = field(default_factory=lambda: ["AAPL", "MSFT", "GOOG"])
    initial_prices: Dict[str, float] = field(
        default_factory=lambda: {"AAPL": 180.0, "MSFT": 340.0, "GOOG": 140.0}
    )
    num_steps: int = 120
    initial_capital: float = 1_000_000.0
    use_coordinator: bool = True
    enable_events: bool = True
    random_seed: Optional[int] = 42
    market_config: Dict[str, Any] = field(default_factory=dict)
    event_config: Dict[str, Any] = field(default_factory=dict)
    agent_config: Dict[str, Any] = field(default_factory=dict)
    multimodal_config: Dict[str, Any] = field(default_factory=dict)
    include_multimodal_agent: bool = True
    include_analyst_agent: bool = True
    include_risk_manager: bool = True
    include_portfolio_manager: bool = True
    gating_enabled: bool = True
    memory_enabled: bool = True
    messaging_enabled: bool = True
    broader_signals_enabled: bool = True
    planner_adaptation_enabled: bool = True
    replication_artifact_dir: Optional[str] = None
    context_provider: Optional[Callable[..., Any]] = None
    post_step_callback: Optional[Callable[..., None]] = None


@dataclass
class ResearchSystem:
    """Container for all integrated research system components."""

    config: ResearchSystemConfig
    agents: Dict[str, Any]
    multimodal_agent: Optional[MultimodalAgent]
    coordinator: Optional[AgentCoordinator]
    trade_memory: TradeMemoryStore
    experience_replay: ExperienceReplayBuffer
    learning_loop: LearningLoop
    reward_engine: RewardEngine
    explanation_renderer: ExplanationRenderer
    audit_trail: DecisionAuditTrail
    data_sources: DataSourceManager
    news_generator: SimulatedNewsGenerator
    report_generator: SyntheticReportGenerator
    feature_engineer: FeatureEngineer
    preprocessor: DataPreprocessor
    constraint_manager: ConstraintManager
    compliance_engine: ComplianceEngine
    regulatory_checker: RegulatoryChecker
    risk_dashboard: RiskDashboard
    simulation_runner: SimulationRunner


class ResearchSystemIntegrator:
    """Integrator that wires research modules into a cohesive system."""

    def __init__(self, config: Optional[ResearchSystemConfig] = None) -> None:
        self.config = config or ResearchSystemConfig()

    def build_system(self) -> ResearchSystem:
        """Instantiate and connect all research modules."""
        agents = self._build_agents()
        multimodal_agent = self._build_multimodal_agent()
        coordinator = AgentCoordinator(agents) if self.config.use_coordinator else None

        trade_memory = TradeMemoryStore()
        experience_replay = ExperienceReplayBuffer()
        reward_engine = RewardEngine()
        learning_loop = LearningLoop(
            trade_memory=trade_memory,
            replay_buffer=experience_replay,
            reward_engine=reward_engine,
        )

        explanation_renderer = ExplanationRenderer()
        audit_trail = DecisionAuditTrail()

        data_sources = DataSourceManager()
        news_generator = SimulatedNewsGenerator(random_seed=self.config.random_seed)
        report_generator = SyntheticReportGenerator(random_seed=self.config.random_seed)
        feature_engineer = FeatureEngineer()
        preprocessor = DataPreprocessor()

        constraint_manager = self._build_constraints()
        compliance_engine = ComplianceEngine(constraint_manager)
        regulatory_checker = RegulatoryChecker()
        risk_dashboard = RiskDashboard(
            constraint_manager=constraint_manager,
            compliance_engine=compliance_engine,
            regulatory_checker=regulatory_checker,
        )

        simulation_runner = self._build_simulation_runner(agents)

        return ResearchSystem(
            config=self.config,
            agents=agents,
            multimodal_agent=multimodal_agent,
            coordinator=coordinator,
            trade_memory=trade_memory,
            experience_replay=experience_replay,
            learning_loop=learning_loop,
            reward_engine=reward_engine,
            explanation_renderer=explanation_renderer,
            audit_trail=audit_trail,
            data_sources=data_sources,
            news_generator=news_generator,
            report_generator=report_generator,
            feature_engineer=feature_engineer,
            preprocessor=preprocessor,
            constraint_manager=constraint_manager,
            compliance_engine=compliance_engine,
            regulatory_checker=regulatory_checker,
            risk_dashboard=risk_dashboard,
            simulation_runner=simulation_runner,
        )

    def _build_agents(self) -> Dict[str, Any]:
        """Instantiate domain-specialized agents."""
        agents: Dict[str, Any] = {
            "trader": TraderAgent("research_trader", self.config.agent_config),
        }

        if self.config.include_analyst_agent:
            agents["analyst"] = AnalystAgent("research_analyst", self.config.agent_config)
        if self.config.include_risk_manager and self.config.gating_enabled:
            agents["risk_manager"] = RiskManagerAgent("research_risk", self.config.agent_config)
        if self.config.include_portfolio_manager:
            agents["portfolio_manager"] = PortfolioManagerAgent(
                "research_portfolio", self.config.agent_config
            )

        return agents

    def _build_multimodal_agent(self) -> Optional[MultimodalAgent]:
        if not self.config.include_multimodal_agent:
            return None
        return MultimodalAgent("research_multimodal", self.config.multimodal_config)

    def _build_constraints(self) -> ConstraintManager:
        manager = ConstraintManager()
        manager.add_constraint(MaxDrawdownConstraint())
        manager.add_constraint(PositionSizeConstraint())
        manager.add_constraint(ConcentrationConstraint())
        manager.add_constraint(TurnoverConstraint())
        manager.add_constraint(CorrelationConstraint())
        return manager

    def _build_simulation_runner(self, agents: Dict[str, Any]) -> SimulationRunner:
        config = SimulationConfig(
            symbols=self.config.symbols,
            initial_prices=self.config.initial_prices,
            num_steps=self.config.num_steps,
            initial_capital=self.config.initial_capital,
            agents=agents,
            use_coordinator=self.config.use_coordinator and self.config.messaging_enabled,
            enable_events=self.config.enable_events,
            random_seed=self.config.random_seed,
            market_config=self.config.market_config,
            event_config=self.config.event_config,
            context_provider=self.config.context_provider,
            post_step_callback=self.config.post_step_callback,
        )
        return SimulationRunner(config)

    @staticmethod
    def build_reasoning_chain(
        agent_id: str,
        reasoning_result: Any,
        action: Any,
    ) -> ReasoningChain:
        """Create a ReasoningChain from a ReasoningResult and Action."""
        chain = ReasoningChain(agent_id=agent_id, decision_context=str(action.action_type))
        for observation in reasoning_result.observations:
            chain.add_observation(observation, data_source="market_data")
        for inference in reasoning_result.inferences:
            chain.add_analysis(inference, data_source="analysis")
        chain.add_decision(
            decision=f"{action.action_type.value} {action.symbol or ''}".strip(),
            confidence=action.confidence,
            reasoning_summary=action.reasoning_summary or "",
        )
        return chain
