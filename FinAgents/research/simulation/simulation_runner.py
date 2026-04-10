"""End-to-End Simulation Orchestrator.

This module provides the main SimulationRunner class that coordinates
market environment, events, agents, and performance tracking.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, Any, Callable, Dict, List, Optional

import numpy as np

from FinAgents.research.simulation.event_engine import EventEngine, MarketEvent
from FinAgents.research.simulation.market_environment import (
    MarketEnvironment,
    MarketRegime,
    MarketState,
    Order,
    OrderSide,
    OrderType,
)
from FinAgents.research.simulation.performance_tracker import PerformanceTracker

if TYPE_CHECKING:
    from FinAgents.research.coordination.coordinator import (
        AgentCoordinator,
        TradingCycleResult,
    )
    from FinAgents.research.domain_agents.base_agent import (
        Action,
        MarketContext,
        MarketData,
        ResearchAgent,
    )


@dataclass
class SimulationConfig:
    """Configuration for a simulation run.

    Attributes
    ----------
    symbols : list of str
        Trading symbols.
    initial_prices : dict
        Initial price per symbol.
    num_steps : int
        Number of simulation steps (default 252 for one trading year).
    initial_capital : float
        Starting portfolio value.
    agents : dict
        Mapping from role to agent instance.
    use_coordinator : bool
        Whether to use AgentCoordinator for agent orchestration.
    enable_events : bool
        Whether to enable random market events.
    random_seed : int or None
        Random seed for reproducibility.
    market_config : dict
        Additional market environment configuration.
    event_config : dict
        Additional event engine configuration.
    context_provider : callable or None
        Optional callback that can enrich or replace MarketContext on each step.
    post_step_callback : callable or None
        Optional callback invoked after each simulation step for logging/memory.
    """

    symbols: List[str]
    initial_prices: Dict[str, float]
    num_steps: int = 252
    initial_capital: float = 1_000_000.0
    agents: Dict[str, "ResearchAgent"] = field(default_factory=dict)
    use_coordinator: bool = True
    enable_events: bool = True
    random_seed: Optional[int] = None
    market_config: Dict[str, Any] = field(default_factory=dict)
    event_config: Dict[str, Any] = field(default_factory=dict)
    context_provider: Optional[Callable[..., Any]] = None
    post_step_callback: Optional[Callable[..., None]] = None


@dataclass
class SimulationSnapshot:
    """Snapshot of simulation state at a point in time.

    Attributes
    ----------
    step : int
        Current step number.
    timestamp : datetime
        Snapshot timestamp.
    market_states : dict
        MarketState per symbol.
    portfolio_value : float
        Total portfolio value.
    cash : float
        Available cash.
    positions : dict
        Current positions (symbol -> quantity).
    agent_decisions : list
        Decisions made by agents this step.
    events : list
        Active events this step.
    """

    step: int
    timestamp: datetime
    market_states: Dict[str, MarketState]
    portfolio_value: float
    cash: float
    positions: Dict[str, float]
    agent_decisions: List[Dict[str, Any]]
    events: List[MarketEvent]


@dataclass
class SimulationResult:
    """Complete result of a simulation run.

    Attributes
    ----------
    config : SimulationConfig
        Original simulation configuration.
    total_steps : int
        Number of steps completed.
    final_portfolio_value : float
        Final portfolio value.
    total_return_pct : float
        Total return as percentage.
    performance_metrics : dict
        Complete performance metrics.
    snapshots : list
        Sampled snapshots (not every step).
    event_log : list
        All events that occurred.
    decision_log : list
        All agent decisions made.
    agent_performance : dict
        Per-agent performance metrics.
    """

    config: SimulationConfig
    total_steps: int
    final_portfolio_value: float
    total_return_pct: float
    performance_metrics: Dict[str, Any]
    snapshots: List[SimulationSnapshot]
    event_log: List[MarketEvent]
    decision_log: List[Dict[str, Any]]
    agent_performance: Dict[str, Dict[str, Any]]


class SimulationRunner:
    """End-to-end simulation orchestrator.

    Coordinates market environment, event engine, agents, and performance
    tracking to run complete trading simulations.

    Attributes
    ----------
    config : SimulationConfig
        Simulation configuration.
    market : MarketEnvironment
        Market simulation environment.
    events : EventEngine
        Event simulation engine.
    coordinator : AgentCoordinator or None
        Agent coordinator if use_coordinator is True.
    tracker : PerformanceTracker
        Performance metrics tracker.
    """

    def __init__(self, config: SimulationConfig) -> None:
        """Initialize the simulation runner.

        Parameters
        ----------
        config : SimulationConfig
            Simulation configuration.
        """
        self.config = config

        # Set random seed if provided
        if config.random_seed is not None:
            np.random.seed(config.random_seed)

        # Initialize components
        self.market = MarketEnvironment(
            symbols=config.symbols,
            initial_prices=config.initial_prices,
            config=config.market_config,
        )

        self.events = EventEngine(config=config.event_config)

        # Set random seeds on components
        if config.random_seed is not None:
            self.market.set_random_seed(config.random_seed)
            self.events.set_random_seed(config.random_seed + 1)

        # Initialize coordinator if needed
        self.coordinator: Optional["AgentCoordinator"] = None
        if config.use_coordinator and config.agents:
            self._init_coordinator()

        # Performance tracking
        self.tracker = PerformanceTracker(config.initial_capital)

        # Portfolio state
        self._cash = config.initial_capital
        self._positions: Dict[str, float] = {}  # symbol -> quantity
        self._position_cost: Dict[str, float] = {}  # symbol -> average cost

        # Simulation state
        self._current_step = 0
        self._snapshot_history: List[SimulationSnapshot] = []
        self._decision_log: List[Dict[str, Any]] = []

    def _init_coordinator(self) -> None:
        """Initialize the agent coordinator."""
        from FinAgents.research.coordination.coordinator import AgentCoordinator

        self.coordinator = AgentCoordinator(agents=self.config.agents)

    def run(self, verbose: bool = False) -> SimulationResult:
        """Run the complete simulation.

        Parameters
        ----------
        verbose : bool
            Whether to print step summaries.

        Returns
        -------
        SimulationResult
            Complete simulation results.
        """
        # Reset state
        self.reset()

        for step in range(self.config.num_steps):
            self._current_step = step

            # Step 1: Generate and apply events
            step_events = []
            if self.config.enable_events:
                # Generate new events
                new_events = self.events.generate_random_events(
                    step, self.config.symbols
                )
                step_events.extend(new_events)

                # Get events from queue
                current_time = datetime.utcnow() + timedelta(minutes=step)
                queued = [
                    e
                    for e in self.events.event_queue
                    if e.timestamp <= current_time
                ]
                step_events.extend(queued)

                # Remove queued events
                self.events.event_queue = [
                    e for e in self.events.event_queue if e.timestamp > current_time
                ]

                # Apply events to market states
                self.events.apply_events(step_events, self.market.states)

                # Step active events (decay)
                self.events.step_active_events()

            # Step 2: Step market environment
            market_states = self.market.step()

            # Step 3-6: Agent decisions and order execution
            agent_orders, decisions = self._run_agents(step)

            # Step 6: Fill orders
            filled_orders = self.market.fill_orders(agent_orders)

            # Step 7: Update portfolio
            self._update_portfolio(filled_orders)

            # Step 8: Record performance
            portfolio_value = self.get_portfolio_value()

            # Calculate benchmark (equal-weight buy and hold)
            benchmark_value = self._calculate_benchmark_value()

            # Record trades with PnL
            trades = self._orders_to_trades(filled_orders, decisions)
            agent_attributions = self._calculate_agent_attributions(filled_orders, decisions)

            self.tracker.record_step(
                portfolio_value=portfolio_value,
                benchmark_value=benchmark_value,
                trades=trades,
                agent_attributions=agent_attributions,
            )

            if self.config.post_step_callback is not None:
                self.config.post_step_callback(
                    step=step,
                    market_states=market_states,
                    events=step_events,
                    filled_orders=filled_orders,
                    trades=trades,
                    decisions=decisions,
                    portfolio_value=portfolio_value,
                    benchmark_value=benchmark_value,
                )

            # Step 9: Take snapshots periodically
            if step % 5 == 0:
                snapshot = self.save_snapshot()
                self._snapshot_history.append(snapshot)

            # Step 10: Verbose output
            if verbose and step % 20 == 0:
                print(
                    f"Step {step}: Portfolio=${portfolio_value:,.2f}, "
                    f"Return={((portfolio_value / self.config.initial_capital) - 1) * 100:.2f}%, "
                    f"Events={len(step_events)}"
                )

        # Final snapshot
        final_snapshot = self.save_snapshot()
        self._snapshot_history.append(final_snapshot)

        # Compile results
        return self._compile_results()

    def run_step(self) -> Dict[str, Any]:
        """Run a single simulation step.

        Returns
        -------
        dict
            Step results including market states, decisions, and portfolio.
        """
        step = self._current_step

        # Generate and apply events
        step_events = []
        if self.config.enable_events:
            new_events = self.events.generate_random_events(step, self.config.symbols)
            step_events.extend(new_events)
            self.events.apply_events(step_events, self.market.states)
            self.events.step_active_events()

        # Step market
        market_states = self.market.step()

        # Run agents
        agent_orders, decisions = self._run_agents(step)

        # Fill orders
        filled_orders = self.market.fill_orders(agent_orders)

        # Update portfolio
        self._update_portfolio(filled_orders)

        # Record performance
        portfolio_value = self.get_portfolio_value()
        benchmark_value = self._calculate_benchmark_value()
        trades = self._orders_to_trades(filled_orders, decisions)

        self.tracker.record_step(
            portfolio_value=portfolio_value,
            benchmark_value=benchmark_value,
            trades=trades,
        )

        if self.config.post_step_callback is not None:
            self.config.post_step_callback(
                step=step,
                market_states=market_states,
                events=step_events,
                filled_orders=filled_orders,
                trades=trades,
                decisions=decisions,
                portfolio_value=portfolio_value,
                benchmark_value=benchmark_value,
            )

        self._current_step += 1

        return {
            "step": step,
            "market_states": {k: self._state_to_dict(v) for k, v in market_states.items()},
            "portfolio_value": portfolio_value,
            "positions": self._positions.copy(),
            "cash": self._cash,
            "events": step_events,
            "decisions": decisions,
            "filled_orders": [
                {
                    "order_id": o.order_id,
                    "symbol": o.symbol,
                    "side": o.side.value,
                    "quantity": o.quantity,
                    "fill_price": o.fill_price,
                    "filled": o.filled,
                }
                for o in filled_orders
            ],
        }

    def _run_agents(
        self, step: int
    ) -> tuple:
        """Run agents and collect orders.

        Parameters
        ----------
        step : int
            Current step number.

        Returns
        -------
        tuple
            (orders, decisions) where decisions is a list of dicts.
        """
        orders: List[Order] = []
        decisions: List[Dict[str, Any]] = []

        if self.coordinator is not None:
            # Use coordinator for each symbol
            for symbol in self.config.symbols:
                try:
                    market_data = self.market.get_market_data(symbol)
                    context = self._create_market_context(symbol)

                    result = self.coordinator.run_trading_cycle(market_data, context)

                    # Convert executed trades to orders
                    for trade in result.executed_trades:
                        order = Order(
                            symbol=trade.get("symbol", symbol),
                            side=OrderSide.BUY
                            if trade.get("action") == "BUY"
                            else OrderSide.SELL,
                            quantity=trade.get("quantity", 0),
                            price=trade.get("price"),
                            order_type=OrderType.MARKET,
                            agent_id="coordinator",
                        )
                        orders.append(order)

                    decisions.append(
                        {
                            "step": step,
                            "symbol": symbol,
                            "decision": result.final_decision,
                            "reasoning": result.reasoning_chains,
                            "trades": result.executed_trades,
                        }
                    )
                    self._decision_log.append(decisions[-1])

                except Exception as e:
                    decisions.append(
                        {
                            "step": step,
                            "symbol": symbol,
                            "error": str(e),
                        }
                    )
        else:
            # Run agents individually
            for role, agent in self.config.agents.items():
                for symbol in self.config.symbols:
                    try:
                        market_data = self.market.get_market_data(symbol)
                        context = self._create_market_context(symbol)

                        # Agent reasoning
                        reasoning = agent.reason(market_data, context)
                        action = agent.act(reasoning)

                        # Convert action to order if not HOLD
                        if action.action_type.value != "HOLD":
                            order = Order(
                                symbol=action.symbol or symbol,
                                side=OrderSide.BUY
                                if action.action_type.value == "BUY"
                                else OrderSide.SELL,
                                quantity=action.quantity,
                                price=action.price,
                                order_type=OrderType.MARKET,
                                agent_id=agent.agent_id,
                            )
                            orders.append(order)

                        decisions.append(
                            {
                                "step": step,
                                "agent": role,
                                "symbol": symbol,
                                "action": action.action_type.value,
                                "quantity": action.quantity,
                                "confidence": action.confidence,
                                "reasoning": action.reasoning_summary,
                            }
                        )
                        self._decision_log.append(decisions[-1])

                    except Exception as e:
                        decisions.append(
                            {
                                "step": step,
                                "agent": role,
                                "symbol": symbol,
                                "error": str(e),
                            }
                        )

        return orders, decisions

    def _create_market_context(self, symbol: str) -> "MarketContext":
        """Create MarketContext for a symbol.

        Parameters
        ----------
        symbol : str
            Symbol to create context for.

        Returns
        -------
        MarketContext
            Market context for the symbol.
        """
        from FinAgents.research.domain_agents.base_agent import MarketContext

        state = self.market.states.get(symbol)
        active_events = self.events.get_active_events(self._current_step)

        default_context = MarketContext(
            regime=state.regime.value if state else "SIDEWAYS",
            volatility_level=state.volatility if state else 0.02,
            sentiment=0.0,  # Neutral default
            events=[e.description for e in active_events if symbol in e.affected_symbols],
        )

        if self.config.context_provider is None:
            return default_context

        enriched = self.config.context_provider(
            step=self._current_step,
            symbol=symbol,
            market_data=self.market.get_market_data(symbol),
            state=state,
            active_events=active_events,
            default_context=default_context,
        )

        if enriched is None:
            return default_context
        if isinstance(enriched, MarketContext):
            return enriched
        if isinstance(enriched, dict):
            merged = {
                "regime": default_context.regime,
                "volatility_level": default_context.volatility_level,
                "sentiment": default_context.sentiment,
                "macro_indicators": default_context.macro_indicators,
                "events": default_context.events,
            }
            merged.update(enriched)
            return MarketContext(**merged)

        return default_context

    def _update_portfolio(self, filled_orders: List[Order]) -> None:
        """Update portfolio based on filled orders.

        Parameters
        ----------
        filled_orders : list of Order
            Filled orders to process.
        """
        for order in filled_orders:
            if not order.filled or order.fill_price is None:
                continue

            symbol = order.symbol
            quantity = order.quantity
            fill_price = order.fill_price

            if order.side == OrderSide.BUY:
                # Reduce cash
                cost = quantity * fill_price
                self._cash -= cost

                # Update position
                if symbol not in self._positions:
                    self._positions[symbol] = 0.0
                    self._position_cost[symbol] = fill_price
                else:
                    # Update average cost
                    old_qty = self._positions[symbol]
                    old_cost = self._position_cost[symbol]
                    new_qty = old_qty + quantity
                    if new_qty > 0:
                        self._position_cost[symbol] = (
                            old_cost * old_qty + fill_price * quantity
                        ) / new_qty

                self._positions[symbol] = self._positions.get(symbol, 0) + quantity

            else:  # SELL
                # Increase cash
                proceeds = quantity * fill_price
                self._cash += proceeds

                # Update position
                if symbol in self._positions:
                    self._positions[symbol] -= quantity
                    if self._positions[symbol] <= 0:
                        del self._positions[symbol]

    def get_portfolio_value(self) -> float:
        """Calculate total portfolio value.

        Returns
        -------
        float
            Cash + sum of position values.
        """
        total = self._cash

        for symbol, quantity in self._positions.items():
            if quantity > 0 and symbol in self.market.states:
                price = self.market.states[symbol].current_price
                total += quantity * price

        return total

    def get_portfolio_state(self) -> Dict[str, Any]:
        """Get current portfolio state.

        Returns
        -------
        dict
            Portfolio state including positions, values, and weights.
        """
        portfolio_value = self.get_portfolio_value()
        positions = {}

        for symbol, quantity in self._positions.items():
            if quantity > 0 and symbol in self.market.states:
                price = self.market.states[symbol].current_price
                value = quantity * price
                positions[symbol] = {
                    "quantity": quantity,
                    "avg_cost": self._position_cost.get(symbol, 0),
                    "current_price": price,
                    "value": value,
                    "weight": value / portfolio_value if portfolio_value > 0 else 0,
                }

        return {
            "cash": self._cash,
            "positions": positions,
            "total_value": portfolio_value,
            "cash_weight": self._cash / portfolio_value if portfolio_value > 0 else 0,
        }

    def _calculate_benchmark_value(self) -> float:
        """Calculate buy-and-hold benchmark value.

        Returns
        -------
        float
            Benchmark portfolio value.
        """
        # Equal-weight buy and hold from initial prices
        n_symbols = len(self.config.symbols)
        if n_symbols == 0:
            return self.config.initial_capital

        per_symbol = self.config.initial_capital / n_symbols
        benchmark_value = 0.0

        for symbol, initial_price in self.config.initial_prices.items():
            if symbol in self.market.states:
                current_price = self.market.states[symbol].current_price
                shares = per_symbol / initial_price if initial_price > 0 else 0
                benchmark_value += shares * current_price

        return benchmark_value

    def _orders_to_trades(
        self, filled_orders: List[Order], decisions: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Convert filled orders to trade records.

        Parameters
        ----------
        filled_orders : list of Order
            Filled orders.
        decisions : list of dict
            Agent decisions.

        Returns
        -------
        list of dict
            Trade records.
        """
        trades = []

        for order in filled_orders:
            if not order.filled or order.fill_price is None:
                continue

            trades.append({
                "order_id": order.order_id,
                "symbol": order.symbol,
                "side": order.side.value,
                "quantity": order.quantity,
                "price": order.fill_price,
                "slippage": order.slippage,
                "agent_id": order.agent_id,
                "timestamp": order.fill_time.isoformat() if order.fill_time else None,
                "pnl": 0.0,  # Will be calculated on position close
            })

        return trades

    def _calculate_agent_attributions(
        self, filled_orders: List[Order], decisions: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """Calculate per-agent PnL attributions.

        Parameters
        ----------
        filled_orders : list of Order
            Filled orders.
        decisions : list of dict
            Agent decisions.

        Returns
        -------
        dict
            Agent ID -> PnL attribution.
        """
        attributions: Dict[str, float] = {}

        for order in filled_orders:
            if not order.filled:
                continue

            agent_id = order.agent_id
            if agent_id not in attributions:
                attributions[agent_id] = 0.0

            # For sells, calculate realized PnL
            if order.side == OrderSide.SELL and order.fill_price:
                symbol = order.symbol
                if symbol in self._position_cost:
                    avg_cost = self._position_cost[symbol]
                    pnl = (order.fill_price - avg_cost) * order.quantity
                    attributions[agent_id] += pnl

        return attributions

    def _state_to_dict(self, state: MarketState) -> Dict[str, Any]:
        """Convert MarketState to dictionary.

        Parameters
        ----------
        state : MarketState
            Market state to convert.

        Returns
        -------
        dict
            Dictionary representation.
        """
        return {
            "symbol": state.symbol,
            "current_price": state.current_price,
            "open": state.open,
            "high": state.high,
            "low": state.low,
            "volume": state.volume,
            "regime": state.regime.value,
            "volatility": state.volatility,
            "bid": state.bid,
            "ask": state.ask,
        }

    def reset(self) -> None:
        """Reset simulation for re-run."""
        self.market.reset()
        self.events.reset()
        self.tracker.reset()

        self._cash = self.config.initial_capital
        self._positions = {}
        self._position_cost = {}
        self._current_step = 0
        self._snapshot_history = []
        self._decision_log = []

        if self.config.random_seed is not None:
            np.random.seed(self.config.random_seed)
            self.market.set_random_seed(self.config.random_seed)
            self.events.set_random_seed(self.config.random_seed + 1)

    def save_snapshot(self) -> SimulationSnapshot:
        """Save current simulation state as snapshot.

        Returns
        -------
        SimulationSnapshot
            Current state snapshot.
        """
        # Deep copy market states
        market_states = {}
        for symbol, state in self.market.states.items():
            market_states[symbol] = copy.deepcopy(state)

        return SimulationSnapshot(
            step=self._current_step,
            timestamp=datetime.utcnow(),
            market_states=market_states,
            portfolio_value=self.get_portfolio_value(),
            cash=self._cash,
            positions=self._positions.copy(),
            agent_decisions=[],
            events=self.events.get_active_events(self._current_step),
        )

    def restore_snapshot(self, snapshot: SimulationSnapshot) -> None:
        """Restore simulation state from snapshot.

        Parameters
        ----------
        snapshot : SimulationSnapshot
            Snapshot to restore from.
        """
        self._current_step = snapshot.step
        self._cash = snapshot.cash
        self._positions = snapshot.positions.copy()

        # Restore market states
        for symbol, state in snapshot.market_states.items():
            self.market.states[symbol] = copy.deepcopy(state)

    def _compile_results(self) -> SimulationResult:
        """Compile final simulation results.

        Returns
        -------
        SimulationResult
            Complete simulation results.
        """
        portfolio_value = self.get_portfolio_value()
        total_return = (portfolio_value - self.config.initial_capital) / self.config.initial_capital
        metrics = self.tracker.get_all_metrics()

        # Get agent performance
        agent_performance = {}
        for agent_id, attr in self.tracker.get_agent_attribution().items():
            agent_performance[agent_id] = {
                "total_pnl": attr.total_pnl,
                "num_trades": attr.num_trades,
                "win_rate": attr.win_rate,
                "avg_pnl_per_trade": attr.avg_pnl_per_trade,
                "contribution_pct": attr.contribution_pct,
            }

        return SimulationResult(
            config=self.config,
            total_steps=self._current_step,
            final_portfolio_value=portfolio_value,
            total_return_pct=total_return,
            performance_metrics=metrics,
            snapshots=self._snapshot_history,
            event_log=self.events.get_event_history(),
            decision_log=self._decision_log,
            agent_performance=agent_performance,
        )
