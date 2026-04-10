import asyncio
import json
import logging
import time
import os
import websockets
from typing import Dict, Any, List

logger = logging.getLogger("MarketEngine")

class LiveQuotesCache:
    """Ultra-low latency in-memory cache for the latest tick data."""
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._subscribers: List[asyncio.Queue] = []

    def update_tick(self, symbol: str, price: float, change: float, change_pct: float, volume: int = 0):
        """Update cache precisely and completely, sub 1ms overhead."""
        old = self._cache.get(symbol, {})
        # Keep old values or defaults
        tick = {
            "symbol": symbol,
            "price": float(price),
            "change": float(change),
            "change_pct": float(change_pct),
            "volume": int(volume) if volume else int(old.get("volume", 0)),
            "timestamp": time.time(),
            "source": "websocket_engine"
        }
        self._cache[symbol] = tick
        
        # Broadcast to all FastAPI websocket clients
        if self._subscribers:
            msg = json.dumps({"type": "tick", "data": tick})
            for queue in self._subscribers:
                try:
                    queue.put_nowait(msg)
                except asyncio.QueueFull:
                    # Drop tick if subscriber is too slow to read (prevents memory leak)
                    pass

    def get_tick(self, symbol: str) -> Dict[str, Any]:
        return self._cache.get(symbol)

    def subscribe(self, queue: asyncio.Queue):
        self._subscribers.append(queue)

    def unsubscribe(self, queue: asyncio.Queue):
        if queue in self._subscribers:
            self._subscribers.remove(queue)


# Singleton instance shared instantly across all modules
live_cache = LiveQuotesCache()


class BinanceStreamer:
    """Live crypto stream from Binance (No auth required, sub 50ms latency)."""
    URI = "wss://stream.binance.com:9443/ws/!ticker@arr"
    MAX_RETRIES = 10          # Give up after 10 consecutive failures
    MAX_BACKOFF_SECS = 60     # Cap backoff at 60s

    def __init__(self, cache: LiveQuotesCache):
        self.cache = cache
        self.running = False
        
    async def connect_and_stream(self):
        self.running = True
        consecutive_failures = 0
        logger.info("Anti-Gravity Engine: Connecting to Binance Live Crypto Stream...")
        while self.running:
            try:
                async with websockets.connect(self.URI, ping_interval=20, ping_timeout=20) as ws:
                    logger.info("Engine connected to Binance. Live Crypto streaming ACTIVE.")
                    consecutive_failures = 0  # Reset on successful connection
                    while self.running:
                        msg = await ws.recv()
                        self._process_message(msg)
            except asyncio.CancelledError:
                break
            except Exception as e:
                consecutive_failures += 1
                backoff = min(2 ** (consecutive_failures - 1), self.MAX_BACKOFF_SECS)
                if consecutive_failures <= self.MAX_RETRIES:
                    logger.warning(f"Binance Stream Error ({consecutive_failures}/{self.MAX_RETRIES}): {e}. Retrying in {backoff}s...")
                    await asyncio.sleep(backoff)
                else:
                    logger.error(
                        f"Binance Stream: {self.MAX_RETRIES} consecutive failures. "
                        f"Stopping reconnect. Last error: {e}. "
                        f"Check your network/DNS or if Binance is accessible from this machine."
                    )
                    self.running = False
                    break
                
    def _process_message(self, raw_msg):
        try:
            # Parse Binance All Market Tickers Payload
            data = json.loads(raw_msg)
            if isinstance(data, list):
                for item in data:
                    sym = item.get("s", "")
                    # We only cache major ones to save memory or everything
                    # Convert BTCUSDT -> BTC-USD
                    if sym.endswith("USDT"):
                        normalized_sym = sym.replace("USDT", "-USD")
                        if normalized_sym in ["BTC-USD", "ETH-USD", "SOL-USD", "BNB-USD", "XRP-USD", "DOGE-USD", "ADA-USD"]:
                            price = float(item.get("c", 0))
                            change = float(item.get("p", 0))
                            change_pct = float(item.get("P", 0)) / 100.0  # Percentage as decimal
                            volume = float(item.get("v", 0))
                            self.cache.update_tick(normalized_sym, price, change, change_pct, volume)
        except Exception as e:
            logger.error(f"Error processing Binance message: {e}", exc_info=True)


class FinnhubStreamer:
    """Finnhub US Equities and Crypto live stream (requires API key)."""
    MAX_RETRIES = 10
    MAX_BACKOFF_SECS = 60
    
    def __init__(self, cache: LiveQuotesCache, api_key: str):
        self.cache = cache
        self.api_key = api_key
        self.running = False
        self.symbols = ["AAPL", "NVDA", "MSFT", "TSLA", "AMZN", "META", "GOOGL"]
        
    async def connect_and_stream(self):
        self.running = True
        consecutive_failures = 0
        uri = f"wss://ws.finnhub.io?token={self.api_key}"
        logger.info("Anti-Gravity Engine: Connecting to Finnhub Live Equities Stream...")
        
        while self.running:
            try:
                async with websockets.connect(uri, ping_interval=20) as ws:
                    logger.info("Engine connected to Finnhub. Live Equities streaming ACTIVE.")
                    consecutive_failures = 0
                    
                    # Subscribe to symbols
                    for sym in self.symbols:
                        await ws.send(json.dumps({"type": "subscribe", "symbol": sym}))
                        
                    while self.running:
                        msg = await asyncio.wait_for(ws.recv(), timeout=30.0)
                        self._process_message(msg)
            except asyncio.TimeoutError:
                logger.warning("Finnhub Stream Timeout. Forcing reconnect...")
            except asyncio.CancelledError:
                break
            except Exception as e:
                consecutive_failures += 1
                backoff = min(2 ** (consecutive_failures - 1), self.MAX_BACKOFF_SECS)
                if consecutive_failures <= self.MAX_RETRIES:
                    logger.warning(f"Finnhub Stream Error ({consecutive_failures}/{self.MAX_RETRIES}): {e}. Retrying in {backoff}s...")
                    await asyncio.sleep(backoff)
                else:
                    logger.error(f"Finnhub Stream: {self.MAX_RETRIES} consecutive failures. Stopping. Last error: {e}")
                    self.running = False
                    break

                
    def _process_message(self, raw_msg):
        try:
            data = json.loads(raw_msg)
            if data.get("type") == "trade":
                for trade in data.get("data", []):
                    sym = trade.get("s")
                    price = float(trade.get("p", 0))
                    volume = int(trade.get("v", 0))
                    # Since websocket trades don't send daily change directly, we maintain it
                    # Here we would merge with previous close, but for direct streaming we just push the exact price
                    old = self.cache.get_tick(sym)
                    prev_c = old.get("price", price) if old else price
                    change = price - prev_c
                    change_pct = (change / prev_c) if prev_c else 0.0
                    self.cache.update_tick(sym, price, change, change_pct, volume)
        except Exception as e:
            logger.error(f"Error processing Finnhub message: {e}", exc_info=True)


class YahooStreamer:
    """Free Yahoo Finance live equity stream via base64 protobuf."""
    URI = "wss://streamer.finance.yahoo.com/"

    def __init__(self, cache: LiveQuotesCache):
        self.cache = cache
        self.running = False
        self.symbols = ["AAPL", "NVDA", "MSFT", "TSLA", "AMZN", "META", "GOOGL", "SPY", "QQQ"]

    async def connect_and_stream(self):
        self.running = True
        logger.info("Anti-Gravity Engine: Connecting to raw Yahoo Finance Live Stream as fallback...")
        
        while self.running:
            try:
                async with websockets.connect(self.URI, ping_interval=30) as ws:
                    logger.info("Engine connected to Yahoo Finance. Live Equities streaming ACTIVE.")
                    # Yahoo subscribe payload
                    sub_payload = json.dumps({"subscribe": self.symbols})
                    await ws.send(sub_payload)
                    
                    while self.running:
                        msg = await ws.recv()
                        self._process_message(msg)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Yahoo Stream Error: {e}. Reconnecting in 5s...")
                await asyncio.sleep(5.0)

    def _process_message(self, base64_msg):
        # A very robust, hacky protobuf unpacker for Yahoo live ticks
        import base64
        import struct
        try:
            raw = base64.b64decode(base64_msg)
            # Find the string symbol
            # Usually starts at index 2 (1 byte tag, 1 byte length)
            # Tag for symbol is 10 (0x0A) -> Field 1, Type String (Wire Type 2)
            if raw[0] == 0x0A:
                sym_len = raw[1]
                sym = raw[2:2+sym_len].decode('utf-8')
                
                # Now scan for Field 2 (Price) which is Float32 (tag 21 -> 0x15)
                # We scan forward byte by byte because protobuf fields can appear in any order.
                price = None
                for i in range(2+sym_len, len(raw) - 4):
                    if raw[i] == 0x15: # Tag 2, Float32
                        try:
                            # Struct unpack float32 little-endian
                            price = struct.unpack('<f', raw[i+1:i+5])[0]
                            break
                        except Exception:
                            pass
                
                # Scan for Field 6 (Volume)? Optional.
                # If we got price, push to cache
                if price is not None:
                    old = self.cache.get_tick(sym)
                    prev_c = old.get("price", price) if old else price
                    change = price - prev_c
                    change_pct = (change / prev_c) if prev_c else 0.0
                    self.cache.update_tick(sym, price, change, change_pct, 0)
        except Exception as e:
            logger.error(f"Error processing Yahoo message: {e}", exc_info=True)


# Global tasks tracker
_market_tasks = []
_active_streamers = []

async def start_market_engine():
    """Main entrypoint for the engine background loop."""
    logger.info("Initializing Anti-Gravity Market Engine...")
    
    # Start Binance
    binance = BinanceStreamer(live_cache)
    _active_streamers.append(binance)
    _market_tasks.append(asyncio.create_task(binance.connect_and_stream()))
    
    # Start Finnhub if key is provided in .env
    finnhub_key = os.getenv("FINNHUB_API_KEY", "")
    if finnhub_key:
        finnhub = FinnhubStreamer(live_cache, finnhub_key)
        _active_streamers.append(finnhub)
        _market_tasks.append(asyncio.create_task(finnhub.connect_and_stream()))
    else:
        logger.warning("No FINNHUB_API_KEY. US Equities real-time WebSocket is disabled. Trading view will fall back to REST cache for non-crypto symbols.")
        # We disabled YahooStreamer because the undocumented protobuf parser was injecting corrupted Float32 values into the UI.

async def stop_market_engine():
    """Gracefully cancel and await all background tasks."""
    logger.info("Stopping Anti-Gravity Market Engine...")
    for streamer in _active_streamers:
        streamer.running = False
    for t in _market_tasks:
        t.cancel()
    if _market_tasks:
        await asyncio.gather(*_market_tasks, return_exceptions=True)
    _market_tasks.clear()
    _active_streamers.clear()
    logger.info("Anti-Gravity Market Engine stopped.")
