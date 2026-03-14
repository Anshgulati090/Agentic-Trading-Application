import asyncio
import logging
from typing import Any, Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.cache.cache_service import CacheService
from backend.config.settings import get_settings
from backend.market.data_provider import MarketDataProvider
from backend.risk.risk_engine import RiskEngine
from backend.routes.signals import DummyAgent
from backend.services.live_signal_service import LiveSignalService


router = APIRouter(tags=["WebSocket Signals"])
logger = logging.getLogger("agentic.websocket")


def _get_cached_signal_service() -> LiveSignalService:
    settings = get_settings()
    cache = CacheService(redis_url=settings.REDIS_URL)
    provider = MarketDataProvider(cache=cache)
    return LiveSignalService(provider, risk_engine=RiskEngine(), cache=cache)


_service = _get_cached_signal_service()
_agent = DummyAgent()


@router.websocket("/signals/{symbol}")
async def websocket_signals(websocket: WebSocket, symbol: str) -> None:
    symbol = symbol.upper()
    await websocket.accept()

    try:
        while True:
            try:
                signal: Dict[str, Any] = _service.get_live_signal(symbol, _agent, agent_name="dummy")
                await websocket.send_json(
                    {
                        "status": "success",
                        "data": signal,
                    }
                )
            except Exception as exc:
                logger.warning("websocket_signal_error", extra={"extra_data": {"symbol": symbol, "error": str(exc)}})
                await websocket.send_json(
                    {
                        "status": "error",
                        "data": {
                            "symbol": symbol,
                            "signal": "HOLD",
                            "price": 0,
                            "confidence": 0,
                            "explanation": f"stream fallback: {exc}",
                        },
                    }
                )

            await asyncio.sleep(2.0)
    except WebSocketDisconnect:
        logger.info("websocket_disconnected", extra={"extra_data": {"symbol": symbol}})
        return
