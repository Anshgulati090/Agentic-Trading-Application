import random
from typing import Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=["Signals"])

ACTIONS = ["BUY", "SELL", "HOLD"]

EXPLANATIONS = {
    "BUY": [
        "20-day MA crossed above 50-day MA — bullish momentum signal.",
        "RSI at 38 — oversold conditions suggest buying opportunity.",
        "Price broke above key resistance with strong volume.",
        "Factor model: high quality + value score warrants long entry.",
    ],
    "SELL": [
        "20-day MA crossed below 50-day MA — bearish momentum signal.",
        "RSI at 72 — overbought, mean reversion likely.",
        "Z-score > 2.1 standard deviations above mean — take profit.",
        "Drawdown controller: reducing exposure at risk limit.",
    ],
    "HOLD": [
        "No clear trend — waiting for confirmation signal.",
        "Risk manager: portfolio exposure at 45%, near limit.",
        "Low confidence: conflicting signals from momentum and reversion agents.",
        "Market hours closed or insufficient data for signal.",
    ],
}

BASE_PRICES = {
    "AAPL": 189.5, "MSFT": 378.2, "GOOGL": 141.8, "AMZN": 182.4,
    "TSLA": 248.7, "META": 503.1, "NVDA": 875.4,
}


def _generate_signal(symbol: str) -> Dict[str, Any]:
    from backend.routes.market import get_technicals
    try:
        tech_res = get_technicals(symbol)
        tech = tech_res.get("data", {})
        action = tech.get("signal_state", "HOLD")
        
        if action == "BUY":
            confidence = 0.85
            explanation = "Technical indicators suggest BUY (e.g., RSI oversold or moving average crossover)."
        elif action == "SELL":
            confidence = 0.85
            explanation = "Technical indicators suggest SELL (e.g., RSI overbought or moving average breakdown)."
        else:
            confidence = 0.50
            explanation = "Technical indicators are neutral; HOLD recommended."
            
        return {
            "symbol": symbol.upper(),
            "price": tech.get("current_price", 100.0) or 100.0,
            "signal": action,
            "action": action,
            "confidence": confidence,
            "explanation": explanation,
            "agent": "momentum",
        }
    except Exception:
        # Fallback to deterministic static output
        h = hash(symbol.upper())
        action = ["BUY", "SELL", "HOLD"][h % 3]
        return {
            "symbol": symbol.upper(),
            "price": 100.0,
            "signal": action,
            "action": action,
            "confidence": 0.5 + (h % 50) / 100.0,
            "explanation": "Deterministic static fallback explanation.",
            "agent": "momentum",
        }


class SignalResponse(BaseModel):
    status: str
    data: Dict[str, Any]


@router.get("/{symbol}", response_model=SignalResponse)
def get_live_signal(symbol: str):
    if not symbol or len(symbol) > 12:
        raise HTTPException(status_code=400, detail="Invalid symbol")
    signal = _generate_signal(symbol.upper())
    return {"status": "success", "data": signal}
