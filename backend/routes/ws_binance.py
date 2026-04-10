from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import logging
import json
from backend.services.binance_websocket import binance_engine

logger = logging.getLogger("WS-Binance")
router = APIRouter(tags=["Binance"])

@router.websocket("/binance/{symbol}")
async def binance_market_endpoint(websocket: WebSocket, symbol: str):
    """
    Sub-second latency direct line to Binance Multiplexed socket
    """
    await websocket.accept()
    logger.info(f"Binance WebSocket: Client Connected for {symbol}.")
    
    client_queue = asyncio.Queue(maxsize=150)
    binance_engine.subscribe(symbol, client_queue)
    
    try:
        # Pre-warm with cache if available instantly
        cached_data = binance_engine.cache.get(symbol.upper(), {})
        for dtype in ["kline", "trade", "depth"]:
            if dtype in cached_data:
                await websocket.send_text(json.dumps({"type": dtype, "data": cached_data[dtype]}))
                
        while True:
            msg = await client_queue.get()
            await websocket.send_text(json.dumps(msg))
            
    except WebSocketDisconnect:
        logger.info(f"Binance WebSocket: Client Disconnected from {symbol}.")
    except Exception as e:
        logger.error(f"Binance WebSocket Error for {symbol}: {e}")
    finally:
        binance_engine.unsubscribe(symbol, client_queue)
