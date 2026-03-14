from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from backend.api.dependencies import get_live_signal_service
from backend.services.live_signal_service import LiveSignalService
from core.agents.base_agent import BaseAgent


router = APIRouter(tags=["Signals"])


class SignalResponse(BaseModel):
    status: str
    data: Dict[str, Any]


class DummyAgent(BaseAgent):
    def __init__(self) -> None:
        self._last_explanation = "Initial dummy decision."
        self._last_confidence = 0.5

    def generate_signal(self, market_data: Dict[str, Any]) -> Dict[str, Any]:
        symbol = str(market_data.get("symbol", "UNKNOWN"))
        price = float(market_data.get("price", 0.0))

        if price <= 0:
            action = "HOLD"
            confidence = 0.3
            explanation = "Invalid price -> HOLD"
        elif int(price) % 2 == 0:
            action = "BUY"
            confidence = 0.7
            explanation = "Dummy rule: even price -> BUY"
        else:
            action = "SELL"
            confidence = 0.6
            explanation = "Dummy rule: odd price -> SELL"

        self._last_confidence = confidence
        self._last_explanation = explanation

        return {
            "symbol": symbol,
            "action": action,
            "quantity": 1,
            "price": price,
            "confidence": confidence,
            "timestamp": None,
        }

    def confidence_score(self) -> float:
        return self._last_confidence

    def explain_decision(self) -> str:
        return self._last_explanation


agent = DummyAgent()


@router.get("/{symbol}", response_model=SignalResponse)
def get_live_signal(
    symbol: str,
    service: LiveSignalService = Depends(get_live_signal_service),
):
    symbol = symbol.upper()

    try:
        signal = service.get_live_signal(symbol, agent, agent_name="dummy")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return {
        "status": "success",
        "data": signal,
    }
