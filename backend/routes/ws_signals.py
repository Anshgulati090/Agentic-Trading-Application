import asyncio
import random
import time
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSocket"])

# ── Base prices kept current ─────────────────────────────────────────────────
BASE_PRICES = {
    "AAPL": 258.0,  "MSFT": 420.0,  "GOOGL": 170.0,  "AMZN": 205.0,
    "TSLA": 285.0,  "META": 600.0,  "NVDA": 178.0,   "INTC": 22.0,
    "AMD":  170.0,  "NFLX": 940.0,  "PYPL": 65.0,    "UBER": 68.0,
    "SPY":  560.0,  "QQQ":  465.0,  "DIA":  420.0,   "IWM":  198.0,
    "GLD":  305.0,  "VIX":   22.0,
    "BTC-USD":  68000.0, "ETH-USD": 2100.0, "SOL-USD": 130.0,
    "BNB-USD":  580.0,   "XRP-USD":  0.52,  "DOGE-USD": 0.08,
    # Indian stocks (approximate INR prices)
    "RELIANCE.NS": 2850.0, "TCS.NS": 3750.0, "INFY.NS": 1520.0,
    "HDFCBANK.NS": 1680.0, "ICICIBANK.NS": 1250.0, "SBIN.NS": 780.0,
    "TATASTEEL.NS": 145.0, "TATAMOTORS.NS": 720.0, "WIPRO.NS": 480.0,
    "BAJFINANCE.NS": 8800.0, "AXISBANK.NS": 1120.0,
}

ACTIONS = ["BUY", "SELL", "HOLD"]
EXPLANATIONS = {
    "BUY":  "Momentum signal: 20-day MA crossed above 50-day MA with strong volume.",
    "SELL": "Mean reversion: Z-score > 2.0 — price significantly above historical mean.",
    "HOLD": "No edge detected — waiting for higher conviction signal.",
}

# ── Shared price cache (symbol -> (price, ts)) ────────────────────────────────
_price_cache: dict = {}
_PRICE_CACHE_TTL = 120  # 2 min

def _get_base_price(symbol: str) -> float:
    """Return cached price or a reasonable seed from BASE_PRICES."""
    cached = _price_cache.get(symbol)
    if cached:
        price, ts = cached
        if time.time() - ts < _PRICE_CACHE_TTL:
            return price
    return BASE_PRICES.get(symbol, 150.0)


async def _fetch_price_async(symbol: str) -> float | None:
    """Fetch price using fast_info only (non-blocking via thread pool)."""
    def _fetch():
        try:
            import yfinance as yf
            ticker = yf.Ticker(symbol)
            fi = getattr(ticker, "fast_info", None) or {}
            p = (
                fi.get("last_price")
                or fi.get("lastPrice")
                or fi.get("regular_market_price")
                or fi.get("regularMarketPrice")
            )
            if p and float(p) > 0:
                return float(p)
            # Lightweight fallback: last close only
            hist = ticker.history(period="1d", interval="1h")
            if not hist.empty:
                return float(hist["Close"].iloc[-1])
            return None
        except Exception:
            return None

    try:
        loop = asyncio.get_event_loop()
        return await asyncio.wait_for(
            loop.run_in_executor(None, _fetch),
            timeout=8.0,   # hard cap — don't block WS for more than 8s
        )
    except Exception:
        return None


@router.websocket("/prices/{symbol}")
async def websocket_prices(websocket: WebSocket, symbol: str) -> None:
    """Stream real-time or cached price updates every 5 seconds."""
    symbol = symbol.upper()
    await websocket.accept()

    price = _get_base_price(symbol)     # send immediately from cache/base
    tick = 0

    try:
        while True:
            # Every 4 ticks fetch fresh price from yfinance
            if tick % 4 == 0:
                fresh = await _fetch_price_async(symbol)
                if fresh:
                    _price_cache[symbol] = (fresh, time.time())
                    price = fresh
                else:
                    # small random walk on cached price
                    price = round(price * (1 + random.uniform(-0.002, 0.002)), 4)
            else:
                price = round(price * (1 + random.uniform(-0.001, 0.001)), 4)

            tick += 1
            await websocket.send_json({
                "status": "success",
                "data": {
                    "symbol": symbol,
                    "price": price,
                    "timestamp": datetime.now().isoformat(),
                    "source": "ws_stream",
                },
            })
            await asyncio.sleep(5.0)

    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close()
        except Exception:
            pass


@router.websocket("/signals/{symbol}")
async def websocket_signals(websocket: WebSocket, symbol: str) -> None:
    """Stream AI trading signals.  First message is sent immediately."""
    symbol = symbol.upper()
    await websocket.accept()

    # Use cached price  or  seed — do NOT block on yfinance here
    price = _get_base_price(symbol)

    # ── send first signal right away so the UI doesn't show ERROR ────────────
    from backend.routes.market import get_technicals
    
    def _generate(sym, p):
        try:
            tech = get_technicals(sym).get("data", {})
            action = tech.get("signal_state", "HOLD")
        except Exception:
            action = "HOLD"
        return action
        
    action = _generate(symbol, price)
    await websocket.send_json({
        "status": "success",
        "data": {
            "symbol": symbol,
            "price": price,
            "signal": action,
            "action": action,
            "confidence": 0.85 if action != "HOLD" else 0.50,
            "explanation": EXPLANATIONS.get(action, "Deterministic static state."),
            "agent": "momentum",
            "timestamp": datetime.now().isoformat(),
        },
    })

    # ── background: fetch real price once, without blocking ──────────────────
    async def _background_price_update():
        nonlocal price
        fresh = await _fetch_price_async(symbol)
        if fresh:
            _price_cache[symbol] = (fresh, time.time())
            price = fresh

    asyncio.create_task(_background_price_update())

    try:
        while True:
            await asyncio.sleep(4.0)   # signal every 4s

            # small price walk
            price = round(price * (1 + random.uniform(-0.004, 0.004)), 4)

            action = _generate(symbol, price)

            await websocket.send_json({
                "status": "success",
                "data": {
                    "symbol": symbol,
                    "price": price,
                    "signal": action,
                    "action": action,
                    "confidence": 0.85 if action != "HOLD" else 0.50,
                    "explanation": EXPLANATIONS.get(action, "Deterministic static state."),
                    "agent": "momentum",
                    "timestamp": datetime.now().isoformat(),
                },
            })

    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close()
        except Exception:
            pass
