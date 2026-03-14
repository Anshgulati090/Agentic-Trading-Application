import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import httpx
import yfinance as yf

from backend.cache.cache_service import CacheService
from backend.config.settings import get_settings


logger = logging.getLogger("agentic.market")

RANGE_TO_PERIOD = {
    "15M": ("1d", "15m", 32),
    "1H": ("5d", "60m", 48),
    "4H": ("1mo", "1h", 42),
    "1D": ("1d", "5m", 78),
    "5D": ("5d", "30m", 65),
    "1W": ("5d", "1h", 45),
    "1M": ("1mo", "1d", 30),
    "3M": ("3mo", "1d", 90),
    "1Y": ("1y", "1wk", 52),
}

SHORT_TTL_TIMEFRAMES = {"15M", "1H", "4H", "1D", "5D"}


class CircuitBreaker:
    def __init__(self, name: str, failure_threshold: int, reset_seconds: int) -> None:
        self._name = name
        self._failure_threshold = failure_threshold
        self._reset_seconds = reset_seconds
        self._failures = 0
        self._opened_at: float | None = None

    def is_open(self) -> bool:
        if self._opened_at is None:
            return False
        if (time.time() - self._opened_at) > self._reset_seconds:
            self._opened_at = None
            self._failures = 0
            return False
        return True

    def record_success(self) -> None:
        self._failures = 0
        self._opened_at = None

    def record_failure(self) -> None:
        self._failures += 1
        if self._failures >= self._failure_threshold:
            self._opened_at = time.time()


class BaseQuoteProvider:
    def __init__(self, name: str, timeout: float, retries: int, breaker: CircuitBreaker) -> None:
        self.name = name
        self.timeout = timeout
        self.retries = retries
        self.breaker = breaker

    def is_configured(self) -> bool:
        return True

    def fetch(self, symbol: str, timeframe: str) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def _request_json(self, method: str, url: str, **kwargs) -> Any:
        for attempt in range(self.retries + 1):
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    response = client.request(method, url, **kwargs)
                    response.raise_for_status()
                    return response.json()
            except Exception:
                if attempt >= self.retries:
                    raise


class PolygonProvider(BaseQuoteProvider):
    def __init__(self, api_key: str, timeout: float, retries: int, breaker: CircuitBreaker) -> None:
        super().__init__("polygon", timeout, retries, breaker)
        self._api_key = api_key

    def is_configured(self) -> bool:
        return bool(self._api_key)

    def fetch(self, symbol: str, timeframe: str) -> Optional[Dict[str, Any]]:
        period, interval, limit = RANGE_TO_PERIOD.get(timeframe, RANGE_TO_PERIOD["1M"])
        multiplier, timespan = {
            "15m": (15, "minute"),
            "60m": (1, "hour"),
            "1h": (1, "hour"),
            "5m": (5, "minute"),
            "30m": (30, "minute"),
            "1d": (1, "day"),
            "1wk": (1, "week"),
        }.get(interval, (1, "day"))
        end = datetime.utcnow().date()
        start = end - timedelta(days=370)
        url = f"https://api.polygon.io/v2/aggs/ticker/{symbol}/range/{multiplier}/{timespan}/{start}/{end}"
        payload = self._request_json("GET", url, params={"adjusted": "true", "sort": "asc", "limit": limit, "apiKey": self._api_key})
        results = payload.get("results") or []
        if not results:
            return None
        history = []
        for item in results[-limit:]:
            moment = datetime.utcfromtimestamp(item["t"] / 1000)
            history.append({
                "date": _format_label(moment, interval),
                "timestamp": moment.isoformat(),
                "open": round(float(item["o"]), 2),
                "high": round(float(item["h"]), 2),
                "low": round(float(item["l"]), 2),
                "close": round(float(item["c"]), 2),
                "volume": int(item.get("v", 0)),
            })
        return _build_quote(symbol, timeframe, history)


class FinnhubProvider(BaseQuoteProvider):
    def __init__(self, api_key: str, timeout: float, retries: int, breaker: CircuitBreaker) -> None:
        super().__init__("finnhub", timeout, retries, breaker)
        self._api_key = api_key

    def is_configured(self) -> bool:
        return bool(self._api_key)

    def fetch(self, symbol: str, timeframe: str) -> Optional[Dict[str, Any]]:
        _, interval, limit = RANGE_TO_PERIOD.get(timeframe, RANGE_TO_PERIOD["1M"])
        resolution = {"15m": "15", "60m": "60", "1h": "60", "5m": "5", "30m": "30", "1d": "D", "1wk": "W"}.get(interval, "D")
        end = int(time.time())
        start = end - 365 * 24 * 60 * 60
        payload = self._request_json(
            "GET",
            "https://finnhub.io/api/v1/stock/candle",
            params={"symbol": symbol, "resolution": resolution, "from": start, "to": end, "token": self._api_key},
        )
        if payload.get("s") != "ok":
            return None
        history = []
        timestamps = payload.get("t", [])
        for idx, ts in enumerate(timestamps[-limit:]):
            moment = datetime.utcfromtimestamp(ts)
            offset = len(timestamps[-limit:]) - len(timestamps[-limit:]) + idx
            history.append({
                "date": _format_label(moment, interval),
                "timestamp": moment.isoformat(),
                "open": round(float(payload["o"][-limit:][idx]), 2),
                "high": round(float(payload["h"][-limit:][idx]), 2),
                "low": round(float(payload["l"][-limit:][idx]), 2),
                "close": round(float(payload["c"][-limit:][idx]), 2),
                "volume": int(payload["v"][-limit:][idx]),
            })
        return _build_quote(symbol, timeframe, history)


class TwelveDataProvider(BaseQuoteProvider):
    def __init__(self, api_key: str, timeout: float, retries: int, breaker: CircuitBreaker) -> None:
        super().__init__("twelvedata", timeout, retries, breaker)
        self._api_key = api_key

    def is_configured(self) -> bool:
        return bool(self._api_key)

    def fetch(self, symbol: str, timeframe: str) -> Optional[Dict[str, Any]]:
        _, interval, limit = RANGE_TO_PERIOD.get(timeframe, RANGE_TO_PERIOD["1M"])
        td_interval = {"15m": "15min", "60m": "1h", "1h": "1h", "5m": "5min", "30m": "30min", "1d": "1day", "1wk": "1week"}.get(interval, "1day")
        payload = self._request_json(
            "GET",
            "https://api.twelvedata.com/time_series",
            params={"symbol": symbol, "interval": td_interval, "outputsize": limit, "apikey": self._api_key},
        )
        values = payload.get("values") or []
        if not values:
            return None
        history = []
        for item in reversed(values[-limit:]):
            moment = datetime.fromisoformat(item["datetime"].replace(" ", "T"))
            history.append({
                "date": _format_label(moment, interval),
                "timestamp": moment.isoformat(),
                "open": round(float(item["open"]), 2),
                "high": round(float(item["high"]), 2),
                "low": round(float(item["low"]), 2),
                "close": round(float(item["close"]), 2),
                "volume": int(float(item.get("volume", 0) or 0)),
            })
        return _build_quote(symbol, timeframe, history)


class AlpacaProvider(BaseQuoteProvider):
    def __init__(self, api_key: str, api_secret: str, feed: str, timeout: float, retries: int, breaker: CircuitBreaker) -> None:
        super().__init__("alpaca", timeout, retries, breaker)
        self._api_key = api_key
        self._api_secret = api_secret
        self._feed = feed

    def is_configured(self) -> bool:
        return bool(self._api_key and self._api_secret)

    def fetch(self, symbol: str, timeframe: str) -> Optional[Dict[str, Any]]:
        _, interval, limit = RANGE_TO_PERIOD.get(timeframe, RANGE_TO_PERIOD["1M"])
        tf = {"15m": "15Min", "60m": "1Hour", "1h": "1Hour", "5m": "5Min", "30m": "30Min", "1d": "1Day", "1wk": "1Week"}.get(interval, "1Day")
        url = f"https://data.alpaca.markets/v2/stocks/{symbol}/bars"
        payload = self._request_json(
            "GET",
            url,
            headers={"APCA-API-KEY-ID": self._api_key, "APCA-API-SECRET-KEY": self._api_secret},
            params={"timeframe": tf, "limit": limit, "feed": self._feed},
        )
        bars = payload.get("bars") or []
        if not bars:
            return None
        history = []
        for item in bars[-limit:]:
            moment = datetime.fromisoformat(item["t"].replace("Z", "+00:00")).replace(tzinfo=None)
            history.append({
                "date": _format_label(moment, interval),
                "timestamp": moment.isoformat(),
                "open": round(float(item["o"]), 2),
                "high": round(float(item["h"]), 2),
                "low": round(float(item["l"]), 2),
                "close": round(float(item["c"]), 2),
                "volume": int(item.get("v", 0)),
            })
        return _build_quote(symbol, timeframe, history)


class YFinanceProvider(BaseQuoteProvider):
    def __init__(self, breaker: CircuitBreaker) -> None:
        settings = get_settings()
        super().__init__("yfinance", settings.MARKET_PROVIDER_TIMEOUT_SECONDS, settings.MARKET_PROVIDER_RETRY_COUNT, breaker)

    def fetch(self, symbol: str, timeframe: str) -> Optional[Dict[str, Any]]:
        period, interval, limit = RANGE_TO_PERIOD.get(timeframe, RANGE_TO_PERIOD["1M"])
        ticker = yf.Ticker(symbol)
        data = ticker.history(period=period, interval=interval)
        if data.empty:
            return None
        history = []
        for index, row in data.tail(limit).iterrows():
            moment = index.to_pydatetime() if hasattr(index, "to_pydatetime") else index
            history.append(
                {
                    "date": _format_label(moment, interval),
                    "timestamp": index.isoformat() if hasattr(index, "isoformat") else str(index),
                    "open": round(float(row.get("Open", row.get("Close", 0.0))), 2),
                    "high": round(float(row.get("High", row.get("Close", 0.0))), 2),
                    "low": round(float(row.get("Low", row.get("Close", 0.0))), 2),
                    "close": round(float(row.get("Close", 0.0)), 2),
                    "volume": int(row.get("Volume", 0) or 0),
                }
            )
        return _build_quote(symbol, timeframe, history)


def _build_quote(symbol: str, timeframe: str, history: list[Dict[str, Any]]) -> Dict[str, Any]:
    first_close = history[0]["close"]
    last_close = history[-1]["close"]
    return {
        "symbol": symbol,
        "price": round(last_close, 2),
        "change": round(last_close - first_close, 2),
        "changePct": round((last_close - first_close) / max(first_close, 1e-9), 4),
        "timestamp": datetime.utcnow().isoformat(),
        "history": history,
        "timeframe": timeframe,
    }


def _format_label(moment: datetime, interval: str) -> str:
    if interval in {"1m", "5m", "15m", "30m", "1h", "60m"}:
        return moment.strftime("%b %d %H:%M")
    return moment.strftime("%b %d")


class MarketDataProvider:
    def __init__(self, cache: Optional[CacheService] = None) -> None:
        self._cache = cache
        self._settings = get_settings()
        threshold = self._settings.MARKET_PROVIDER_FAILURE_THRESHOLD
        reset = self._settings.MARKET_PROVIDER_RESET_SECONDS
        timeout = self._settings.MARKET_PROVIDER_TIMEOUT_SECONDS
        retries = self._settings.MARKET_PROVIDER_RETRY_COUNT
        providers = {
            "polygon": PolygonProvider(self._settings.POLYGON_API_KEY, timeout, retries, CircuitBreaker("polygon", threshold, reset)),
            "finnhub": FinnhubProvider(self._settings.FINNHUB_API_KEY, timeout, retries, CircuitBreaker("finnhub", threshold, reset)),
            "twelvedata": TwelveDataProvider(self._settings.TWELVE_DATA_API_KEY, timeout, retries, CircuitBreaker("twelvedata", threshold, reset)),
            "alpaca": AlpacaProvider(self._settings.ALPACA_API_KEY, self._settings.ALPACA_API_SECRET, self._settings.ALPACA_DATA_FEED, timeout, retries, CircuitBreaker("alpaca", threshold, reset)),
            "yfinance": YFinanceProvider(CircuitBreaker("yfinance", threshold, reset)),
        }
        self._providers = [providers[name.strip().lower()] for name in self._settings.MARKET_PROVIDER_ORDER.split(",") if name.strip().lower() in providers]

    def get_latest_price(self, symbol: str, timeframe: str = "1M") -> Dict[str, Any]:
        if not symbol:
            raise ValueError("Symbol cannot be empty")
        symbol = symbol.upper()
        timeframe = timeframe.upper()
        cache_key = f"{symbol}:{timeframe}"

        if self._cache and self._cache.is_available:
            cached = self._cache.get_market_data(cache_key)
            if cached is not None:
                return cached

        last_error = None
        for provider in self._providers:
            if not provider.is_configured():
                continue
            if provider.breaker.is_open():
                logger.warning("provider_circuit_open", extra={"extra_data": {"provider": provider.name, "symbol": symbol, "timeframe": timeframe}})
                continue
            started = time.perf_counter()
            try:
                result = provider.fetch(symbol, timeframe)
                if not result:
                    raise ValueError("provider returned no data")
                provider.breaker.record_success()
                duration_ms = int((time.perf_counter() - started) * 1000)
                if duration_ms > self._settings.SLOW_REQUEST_THRESHOLD_MS:
                    logger.warning("slow_market_provider", extra={"extra_data": {"provider": provider.name, "symbol": symbol, "timeframe": timeframe, "duration_ms": duration_ms}})
                result["provider"] = provider.name
                if self._cache and self._cache.is_available:
                    self._cache.set_market_data(cache_key, result, ttl_seconds=self._ttl_for_timeframe(timeframe))
                return result
            except Exception as exc:
                last_error = exc
                provider.breaker.record_failure()
                logger.warning(
                    "market_fetch_failed",
                    extra={"extra_data": {"provider": provider.name, "symbol": symbol, "timeframe": timeframe, "error": str(exc)}},
                )

        logger.error("all_market_providers_failed", extra={"extra_data": {"symbol": symbol, "timeframe": timeframe, "error": str(last_error) if last_error else "unknown"}})
        fallback = self._fallback_quote(symbol, timeframe)
        if self._cache and self._cache.is_available:
            self._cache.set_market_data(cache_key, fallback, ttl_seconds=self._ttl_for_timeframe(timeframe))
        return fallback

    def _ttl_for_timeframe(self, timeframe: str) -> int:
        return 12 if timeframe in SHORT_TTL_TIMEFRAMES else 180

    def _fallback_quote(self, symbol: str, timeframe: str) -> Dict[str, Any]:
        period, interval, limit = RANGE_TO_PERIOD.get(timeframe, RANGE_TO_PERIOD["1M"])
        seed = sum(ord(char) for char in symbol)
        bucket = int(datetime.utcnow().timestamp() // 60)
        drift = ((seed * 17 + bucket) % 400) / 100.0
        base = 120 + (seed % 250)
        if symbol == "BTC":
            base = 68000 + (seed % 2000)
        price = round(base + drift, 2)
        history = self._fallback_history(symbol, price, interval, limit)
        out = _build_quote(symbol, timeframe, history)
        out["provider"] = "fallback"
        return out

    def _fallback_history(self, symbol: str, price: float, interval: str, limit: int) -> list[Dict[str, Any]]:
        seed = sum(ord(char) for char in symbol)
        history = []
        current = price - min(price * 0.06, 20 if symbol != "BTC" else 2500)
        step_delta = {
            "1m": timedelta(minutes=1),
            "5m": timedelta(minutes=5),
            "15m": timedelta(minutes=15),
            "30m": timedelta(minutes=30),
            "1h": timedelta(hours=1),
            "60m": timedelta(hours=1),
            "1d": timedelta(days=1),
            "1wk": timedelta(weeks=1),
        }.get(interval, timedelta(days=1))
        start = datetime.utcnow() - step_delta * (limit - 1)
        for offset in range(limit):
            moment = start + step_delta * offset
            step = ((seed + offset * 19) % 11) - 5
            amplitude = 0.7 if symbol != "BTC" else 120.0
            open_price = round(current, 2)
            close = round(max(1.0, open_price + step * amplitude), 2)
            high = round(max(open_price, close) + amplitude * 0.8, 2)
            low = round(max(0.5, min(open_price, close) - amplitude * 0.8), 2)
            history.append(
                {
                    "date": _format_label(moment, interval),
                    "timestamp": moment.isoformat(),
                    "open": open_price,
                    "high": high,
                    "low": low,
                    "close": close,
                    "volume": 1000000 + offset * 25000,
                }
            )
            current = close
        return history
