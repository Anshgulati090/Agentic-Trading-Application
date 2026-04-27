import asyncio
import logging
import time
from typing import Dict, List, Any
from binance import AsyncClient, BinanceSocketManager

logger = logging.getLogger("BinanceWS")

class BinanceLiveEngine:
    """Anti-Gravity Binance Live Engine"""
    def __init__(self):
        self.client = None
        self.bsm = None
        self.running = False
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.subscribers: Dict[str, List[asyncio.Queue]] = {}
        # Track which symbols are currently active to prevent duplicate streams
        self.active_streams = set()

    async def startup(self):
        self.client = await AsyncClient.create()
        self.bsm = BinanceSocketManager(self.client)
        self.running = True
        logger.info("Anti-Gravity Binance Live Engine initialized.")

    async def shutdown(self):
        self.running = False
        if self.client:
            try:
                # Add a safe timeout so it does not permanently deadlock Uvicorn on shutdown/reload
                await asyncio.wait_for(self.client.close_connection(), timeout=2.0)
            except Exception as e:
                logger.warning(f"Binance gracefully closed or timed out: {e}")

    def subscribe(self, symbol: str, queue: asyncio.Queue):
        sym = symbol.upper()
        if sym not in self.subscribers:
            self.subscribers[sym] = []
        self.subscribers[sym].append(queue)
        
        # Dispatch stream instantly if not active
        if sym not in self.active_streams:
            self.active_streams.add(sym)
            asyncio.create_task(self._multiplex_stream(sym))

    def unsubscribe(self, symbol: str, queue: asyncio.Queue):
        sym = symbol.upper()
        if sym in self.subscribers and queue in self.subscribers[sym]:
            self.subscribers[sym].remove(queue)
            if not self.subscribers[sym]:
                if sym in self.active_streams:
                    self.active_streams.remove(sym)

    def _broadcast(self, symbol: str, msg: dict):
        sym = symbol.upper()
        self.cache.setdefault(sym, {})["last_update"] = time.time()
        
        if sym in self.subscribers:
            # We must iterate over a copy of the list to avoid modifying it while iterating
            for queue in list(self.subscribers[sym]):
                try:
                    queue.put_nowait(msg)
                except asyncio.QueueFull:
                    pass

    async def _multiplex_stream(self, symbol: str):
        # Convert internal representation 'BTC-USD' to binance 'btcusdt'
        sym_binance = symbol.upper().replace("-USD", "USDT").lower()
        streams = [
            f"{sym_binance}@trade",
            f"{sym_binance}@kline_1m",
            f"{sym_binance}@depth5"
        ]
        
        consecutive_failures = 0
        MAX_RETRIES = 10
        MAX_BACKOFF = 60
        
        while self.running and symbol in self.active_streams:
            try:
                # Reconnect boundary - inside 800ms typically done by native python-binance 
                ts = self.bsm.multiplex_socket(streams)
                async with ts as tscm:
                    logger.info(f"Binance Stream multiplex CONNECTED for {symbol}")
                    consecutive_failures = 0  # Reset on successful connection
                    while self.running:
                        # 3-second heartbeat enforce:
                        res = await asyncio.wait_for(tscm.recv(), timeout=3.0)
                        
                        if not res:
                            continue
                            
                        stream_name = res.get('stream', '')
                        data = res.get('data', {})
                        
                        if 'kline_1m' in stream_name:
                            k = data.get('k', {})
                            if k:
                                partial = {
                                    "time": int(k['t']),
                                    "open": float(k['o']),
                                    "high": float(k['h']),
                                    "low": float(k['l']),
                                    "close": float(k['c']),
                                    "volume": float(k['v']),
                                    "is_closed": k['x']
                                }
                                self.cache.setdefault(symbol, {})["kline"] = partial
                                self._broadcast(symbol, {"type": "kline", "data": partial})
                                
                        elif 'trade' in stream_name:
                            trade = {
                                "price": float(data.get('p', 0)),
                                "quantity": float(data.get('q', 0)),
                                "time": int(data.get('T', 0))
                            }
                            self.cache.setdefault(symbol, {})["trade"] = trade
                            self._broadcast(symbol, {"type": "trade", "data": trade})
                            
                        elif 'depth5' in stream_name:
                            depth = {
                                "bids": data.get('bids', []),
                                "asks": data.get('asks', []),
                            }
                            self.cache.setdefault(symbol, {})["depth"] = depth
                            self._broadcast(symbol, {"type": "depth", "data": depth})
                            
            except asyncio.TimeoutError:
                # 3 seconds without data -> Heartbeat failed, force reconnect
                logger.warning(f"Binance Stream {symbol} TIMEOUT (Heartbeat missed). Reconnecting <800ms...")
                await asyncio.sleep(0.5)
            except Exception as e:
                error_text = str(e)
                if "fail_connection" in error_text:
                    logger.error(
                        f"Binance Stream {symbol}: incompatible websocket client detected ({error_text}). "
                        "Disabling stream for this symbol to avoid retry storms."
                    )
                    self._broadcast(symbol, {
                        "type": "error",
                        "data": {
                            "symbol": symbol,
                            "reason": "binance_stream_unavailable",
                            "detail": error_text,
                        },
                    })
                    self.active_streams.discard(symbol)
                    break

                consecutive_failures += 1
                backoff = min(2 ** (consecutive_failures - 1), MAX_BACKOFF)
                if consecutive_failures <= MAX_RETRIES:
                    logger.warning(f"Binance Stream Error for {symbol} ({consecutive_failures}/{MAX_RETRIES}): {e}. Retrying in {backoff}s...")
                    await asyncio.sleep(backoff)
                else:
                    logger.error(f"Binance Stream {symbol}: {MAX_RETRIES} consecutive failures. Stopping. Last error: {e}")
                    self.active_streams.discard(symbol)
                    break

# Singleton
binance_engine = BinanceLiveEngine()
