import asyncio
import random
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSocket"])

BASE_PRICES = {
    "AAPL": 189.5, "MSFT": 378.2, "GOOGL": 141.8, "AMZN": 182.4,
    "TSLA": 248.7, "META": 503.1, "NVDA": 875.4,
}

ACTIONS = ["BUY", "SELL", "HOLD"]
EXPLANATIONS = {
    "BUY": "Momentum signal: 20-day MA crossed above 50-day MA with strong volume.",
    "SELL": "Mean reversion: Z-score > 2.0 — price significantly above historical mean.",
    "HOLD": "No edge detected — waiting for higher conviction signal.",
}


@router.websocket("/signals/{symbol}")
async def websocket_signals(websocket: WebSocket, symbol: str) -> None:
    symbol = symbol.upper()
    base = BASE_PRICES.get(symbol, 150.0)
    price = base
    await websocket.accept()

    try:
        while True:
            # Simulate price walk
            price = round(price * (1 + random.uniform(-0.005, 0.005)), 2)
            action = random.choices(ACTIONS, weights=[0.35, 0.25, 0.40])[0]
            confidence = round(random.uniform(0.48, 0.91), 3)

            await websocket.send_json({
                "status": "success",
                "data": {
                    "symbol": symbol,
                    "price": price,
                    "signal": action,
                    "action": action,
                    "confidence": confidence,
                    "explanation": EXPLANATIONS[action],
                    "agent": "momentum",
                },
            })
            await asyncio.sleep(2.0)

    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close()
        except Exception:
            pass
