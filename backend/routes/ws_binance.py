from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import logging
import json
from backend.services.binance_websocket import binance_engine

logger = logging.getLogger("WS-Binance")
router = APIRouter(tags=["Binance"])

SUPPORTED_BINANCE_SYMBOLS = {
    "BTC-USD",
    "ETH-USD",
    "SOL-USD",
    "BNB-USD",
    "XRP-USD",
    "DOGE-USD",
    "ADA-USD",
}

@router.websocket("/binance/{symbol}")
async def binance_market_endpoint(websocket: WebSocket, symbol: str):
    """
    Sub-second latency direct line to Binance Multiplexed socket
    """
    normalized = symbol.upper()
    await websocket.accept()
    logger.info(f"Binance WebSocket: Client Connected for {normalized}.")

    if normalized not in SUPPORTED_BINANCE_SYMBOLS:
        await websocket.send_text(json.dumps({
            "type": "error",
            "data": {
                "symbol": normalized,
                "reason": "unsupported_symbol",
                "detail": "Binance stream is available for supported crypto symbols only.",
            }
        }))
        await websocket.close(code=1008)
        return
    
    client_queue = asyncio.Queue(maxsize=150)
    binance_engine.subscribe(normalized, client_queue)
    
    try:
        # Pre-warm with cache if available instantly
        cached_data = binance_engine.cache.get(normalized, {})
        for dtype in ["kline", "trade", "depth"]:
            if dtype in cached_data:
                await websocket.send_text(json.dumps({"type": dtype, "data": cached_data[dtype]}))
                
        while True:
            msg = await client_queue.get()
            await websocket.send_text(json.dumps(msg))
            
    except WebSocketDisconnect:
        logger.info(f"Binance WebSocket: Client Disconnected from {normalized}.")
    except Exception as e:
        logger.error(f"Binance WebSocket Error for {normalized}: {e}")
    finally:
        binance_engine.unsubscribe(normalized, client_queue)
