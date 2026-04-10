"""
Agent Manager: register agents, activate strategies, manage multiple agents,
and route signals to the execution engine.
"""

from typing import Any, Dict, List, Optional, Type
import uuid

from core.agents.base_agent import BaseAgent

from backend.services.agent_registry import AgentRegistry
from backend.services.execution_service import ExecutionService
from backend.services.live_signal_service import LiveSignalService
from backend.market.data_provider import MarketDataProvider
from backend.cache.cache_service import CacheService
from backend.services.builtin_agents import register_builtin_agents


class AgentManager:
    """
    Central manager for trading agents and strategies.
    - Registers agents via AgentRegistry
    - Activates/deactivates strategies (agent + symbol)
    - Manages multiple agents simultaneously
    - Routes signals to the execution engine
    """

    def __init__(
        self,
        agent_registry: Optional[AgentRegistry] = None,
        market_data_provider: Optional[MarketDataProvider] = None,
        live_signal_service: Optional[LiveSignalService] = None,
        execution_service: Optional[ExecutionService] = None,
        cache: Optional[CacheService] = None,
    ) -> None:
        self._registry = agent_registry or AgentRegistry()
        self._market = market_data_provider or MarketDataProvider()
        self._signal_service = live_signal_service or LiveSignalService(self._market)
        self._execution = execution_service or ExecutionService()
        self._cache = cache
        self._strategies: Dict[str, Dict[str, Any]] = {}
        register_builtin_agents(self._registry)

    def register_agent(self, name: str, agent_cls: Type[BaseAgent]) -> None:
        """Register an agent class. Raises if name already registered."""
        self._registry.register(name, agent_cls)

    def list_agents(self) -> List[str]:
        """Return names of all registered agents."""
        return self._registry.list_agents()

    def activate_strategy(
        self,
        agent_name: str,
        symbol: str,
        auto_execute: bool = False,
        quantity_override: Optional[float] = None,
    ) -> str:
        """
        Activate a strategy: agent_name + symbol.
        Returns strategy_id for later deactivation.
        """
        self._registry.get_agent(agent_name)
        symbol = symbol.upper()
        strategy_id = str(uuid.uuid4())
        self._strategies[strategy_id] = {
            "strategy_id": strategy_id,
            "agent_name": agent_name,
            "symbol": symbol,
            "active": True,
            "auto_execute": auto_execute,
            "quantity_override": quantity_override,
        }
        return strategy_id

    def deactivate_strategy(self, strategy_id: str) -> bool:
        """Deactivate a strategy by id. Returns True if it was active."""
        if strategy_id not in self._strategies:
            return False
        self._strategies[strategy_id]["active"] = False
        return True

    def remove_strategy(self, strategy_id: str) -> bool:
        """Remove a strategy from the manager. Returns True if it existed."""
        if strategy_id not in self._strategies:
            return False
        del self._strategies[strategy_id]
        return True

    def list_active_strategies(self) -> List[Dict[str, Any]]:
        """Return list of active strategy configs."""
        return [
            {**s, "active": s["active"]}
            for s in self._strategies.values()
            if s["active"]
        ]

    def list_all_strategies(self) -> List[Dict[str, Any]]:
        """Return all registered strategies (active and inactive)."""
        return [dict(s) for s in self._strategies.values()]

    def get_signal(self, agent_name: str, symbol: str) -> Dict[str, Any]:
        """
        Generate a single live signal (formatted for API/streaming).
        Raises ValueError if no market data or invalid agent/signal.
        """
        agent = self._registry.get_agent(agent_name)
        return self._signal_service.get_live_signal(
            symbol, agent, agent_name=agent_name
        )

    def get_raw_signal(self, agent_name: str, symbol: str) -> Dict[str, Any]:
        """
        Get raw signal dict from agent (symbol, action, quantity, price)
        for use with execution engine.
        """
        agent = self._registry.get_agent(agent_name)
        market_data = self._market.get_latest_price(symbol.upper())
        if not market_data:
            raise ValueError(f"No market data available for symbol '{symbol}'")
        raw = agent.generate_signal(market_data)
        if not isinstance(raw, dict):
            raise ValueError("Agent generate_signal must return a dict")
        return raw

    def get_agent_memory(self, agent_name: str) -> Optional[Dict[str, Any]]:
        """Return cached memory for the agent, or None."""
        if not self._cache or not self._cache.is_available:
            return None
        return self._cache.get_agent_memory(agent_name)

    def set_agent_memory(
        self,
        agent_name: str,
        data: Dict[str, Any],
        ttl_seconds: Optional[int] = None,
    ) -> bool:
        """Store agent memory in cache. Returns True if cache write succeeded."""
        if not self._cache or not self._cache.is_available:
            return False
        return self._cache.set_agent_memory(agent_name, data, ttl_seconds=ttl_seconds)

    def get_all_signals(self) -> List[Dict[str, Any]]:
        """
        For each active strategy, generate the formatted signal.
        Skips strategies that error (e.g. no data); errors are not raised.
        """
        results: List[Dict[str, Any]] = []
        for s in self._strategies.values():
            if not s["active"]:
                continue
            try:
                signal = self.get_signal(s["agent_name"], s["symbol"])
                signal["strategy_id"] = s["strategy_id"]
                signal["agent_name"] = s["agent_name"]
                results.append(signal)
            except Exception:
                continue
        return results

    def route_signal_to_execution(
        self,
        raw_signal: Dict[str, Any],
        quantity_override: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Send a raw signal to the execution engine.
        raw_signal must contain symbol, action, quantity, price.
        If quantity_override is set, it replaces quantity before execution.
        """
        signal = dict(raw_signal)
        if quantity_override is not None:
            signal["quantity"] = quantity_override
        return self._execution.execute_trade(signal)

    def run_cycle(
        self,
        route_buy_sell: bool = False,
        quantity_override_by_strategy: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        For each active strategy: get market data, get raw signal, get
        formatted signal, and if route_buy_sell and strategy has auto_execute,
        route to execution.
        Returns summary: { "signals": [...], "executions": [...] }.
        """
        quantity_overrides = quantity_override_by_strategy or {}
        signals: List[Dict[str, Any]] = []
        executions: List[Dict[str, Any]] = []

        for s in self._strategies.values():
            if not s["active"]:
                continue
            sid = s["strategy_id"]
            agent_name = s["agent_name"]
            symbol = s["symbol"]
            try:
                formatted = self.get_signal(agent_name, symbol)
                formatted["strategy_id"] = sid
                formatted["agent_name"] = agent_name
                signals.append(formatted)

                if not route_buy_sell or not s.get("auto_execute"):
                    continue
                raw = self.get_raw_signal(agent_name, symbol)
                action = str(raw.get("action", "")).upper()
                if action not in ("BUY", "SELL"):
                    continue
                qty = raw.get("quantity") or 0.0
                if qty <= 0:
                    qty = quantity_overrides.get(sid) or s.get("quantity_override")
                if qty and qty > 0:
                    raw["quantity"] = qty
                    result = self.route_signal_to_execution(raw)
                    result["strategy_id"] = sid
                    executions.append(result)
            except Exception:
                continue

        return {"signals": signals, "executions": executions}
