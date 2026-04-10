from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import asyncio
import logging
from typing import Dict, Any

from backend.services.market_engine import live_cache

logger = logging.getLogger("WS-Stream")

router = APIRouter(tags=["Stream"])

@router.websocket("/market")
async def market_endpoint(websocket: WebSocket):
    """
    Multiplexed Anti-Gravity Stream endpoint.
    Pushes sub-5ms processed ticks from the LiveQuotesCache directly to the client.
    """
    await websocket.accept()
    logger.info("Anti-Gravity WebSocket: Client Connected.")
    
    # Create an isolated queue for this specific client so slow clients don't block the engine
    client_queue = asyncio.Queue(maxsize=100)
    live_cache.subscribe(client_queue)
    
    try:
        # Pre-warm client with everything in cache immediately
        for sym, tick in live_cache._cache.copy().items():
            import json
            await websocket.send_text(json.dumps({"type": "tick", "data": tick}))
            
        while True:
            # Wait for instant ticks specifically directed to this client
            msg = await client_queue.get()
            await websocket.send_text(msg)
            
    except WebSocketDisconnect:
        logger.info("Anti-Gravity WebSocket: Client Disconnected.")
    except Exception as e:
        logger.error(f"WebSocket Error: {e}")
    finally:
        live_cache.unsubscribe(client_queue)
