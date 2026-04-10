from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.api.dependencies import get_cache_service, get_market_data_provider
from backend.auth.jwt_handler import get_current_user
from backend.cache.cache_service import CacheService
from backend.db.models.user import User
from backend.market.data_provider import MarketDataProvider
from backend.services.agent_manager import AgentManager


router = APIRouter(tags=["Agents"])

AGENT_DESCRIPTIONS = {
    "momentum": "Trend-following using moving-average continuation logic",
    "mean_reversion": "Contrarian entries from standardized price stretch",
    "risk": "Portfolio risk controls - position sizing and drawdown response",
    "execution": "Execution timing and fill-quality heuristics",
    "llm": "Context-style regime interpretation (LLM-strategy proxy)",
    "factor": "Multi-factor blend (momentum, value proxy, volatility)",
}

STRATEGY_ALIAS = {
    "momentum": "momentum",
    "mean_reversion": "mean_reversion",
    "risk": "risk",
    "risk_manager": "risk",
    "execution": "execution",
    "executor": "execution",
    "llm": "llm",
    "llm_strategist": "llm",
    "factor": "factor",
    "factor_model": "factor",
}


class ExecuteRequest(BaseModel):
    agent_id: Optional[str] = Field(default=None)
    strategy: Optional[str] = Field(default=None)
    symbol: str = Field(default="AAPL", min_length=1, max_length=24)
    quantity: float = Field(default=1.0, gt=0.0)
    execute_trade: bool = True
    execution_mode: str = Field(default="paper")


def _resolve_strategy(strategy: Optional[str], agent_id: Optional[str]) -> str:
    preferred = (strategy or "").strip().lower()
    fallback = (agent_id or "").strip().lower()

    if preferred in STRATEGY_ALIAS:
        return STRATEGY_ALIAS[preferred]
    if fallback in STRATEGY_ALIAS:
        return STRATEGY_ALIAS[fallback]

    attempted = strategy or agent_id or ""
    raise HTTPException(
        status_code=400,
        detail=f"Unknown strategy '{attempted}'.",
    )


def _build_manager(provider: MarketDataProvider, cache: CacheService) -> AgentManager:
    return AgentManager(market_data_provider=provider, cache=cache)


@router.post("/execute")
def execute_agent(
    payload: ExecuteRequest,
    _user: User = Depends(get_current_user),
    provider: MarketDataProvider = Depends(get_market_data_provider),
    cache: CacheService = Depends(get_cache_service),
):
    manager = _build_manager(provider, cache)
    strategy = _resolve_strategy(payload.strategy, payload.agent_id)
    symbol = payload.symbol.upper().strip()

    try:
        signal = manager.get_signal(strategy, symbol)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    execution_result = None
    action = str(signal.get("signal", "HOLD")).upper()
    if payload.execute_trade and action in {"BUY", "SELL"}:
        raw_signal = {
            "symbol": symbol,
            "action": action,
            "quantity": float(payload.quantity),
            "price": float(signal.get("price", 0.0)),
            "execution_mode": payload.execution_mode.strip().lower() or "paper",
        }
        execution_result = manager.route_signal_to_execution(raw_signal)

    return {
        "status": "success",
        "data": {
            "agent_id": payload.agent_id or strategy,
            "strategy": strategy,
            "symbol": symbol,
            "signal": signal,
            "executed_trade": execution_result,
            "execution_mode": payload.execution_mode.strip().lower() or "paper",
            "live_market_source": True,
        },
    }


@router.get("/list")
def list_agents(
    provider: MarketDataProvider = Depends(get_market_data_provider),
    cache: CacheService = Depends(get_cache_service),
):
    manager = _build_manager(provider, cache)
    return {
        "agents": [
            {"id": name, "description": AGENT_DESCRIPTIONS.get(name, "Built-in trading agent")}
            for name in manager.list_agents()
        ]
    }
