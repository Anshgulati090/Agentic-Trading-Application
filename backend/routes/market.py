from fastapi import APIRouter, HTTPException, Query, status
from typing import Optional, Dict, Any
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta, timezone
import logging
import math
from functools import lru_cache
import time
from urllib.parse import unquote

from backend.services.market_engine import live_cache

logger = logging.getLogger("MarketRoutes")

# Symbol mapping for special Yahoo Finance symbols
SYMBOL_MAPPING = {
    "VIX": "^VIX",  # CBOE Volatility Index
    "^VIX": "^VIX",
    "%5EVIX": "^VIX",
    "$VIX": "^VIX",
    "DJI": "^DJI",  # Dow Jones Industrial Average
    "IXIC": "^IXIC",  # NASDAQ Composite
    "GSPC": "^GSPC",  # S&P 500 Index
    "RUT": "^RUT",  # Russell 2000 Index
    "FTSE": "^FTSE",  # FTSE 100 Index
    "N225": "^N225",  # Nikkei 225 Index
    "HSI": "^HSI",  # Hang Seng Index
    # Crypto spot pairs
    "BTC": "BTC-USD",
    "ETH": "ETH-USD",
    "SOL": "SOL-USD",
    "DOGE": "DOGE-USD",
    "ADA": "ADA-USD",
}


def normalize_symbol(symbol: str) -> str:
    """Convert frontend symbol to Yahoo Finance compatible symbol"""
    cleaned = unquote(str(symbol or "")).upper().strip()
    return SYMBOL_MAPPING.get(cleaned, cleaned)

def clean_float(val: Any) -> Optional[float]:
    if val is None:
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (ValueError, TypeError):
        return None

router = APIRouter(tags=["Market"])

PERIOD_MAP = {
    "1D": ("1d", "5m"),
    "1W": ("5d", "30m"),
    "1M": ("1mo", "1d"),
    "3M": ("3mo", "1d"),
    "1Y": ("1y", "1wk"),
}

POPULAR_SYMBOLS = [
    {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology", "exchange": "NASDAQ"},
    {"symbol": "MSFT", "name": "Microsoft Corp.", "sector": "Technology", "exchange": "NASDAQ"},
    {"symbol": "GOOGL", "name": "Alphabet Inc.", "sector": "Technology", "exchange": "NASDAQ"},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "sector": "Consumer", "exchange": "NASDAQ"},
    {"symbol": "TSLA", "name": "Tesla Inc.", "sector": "Auto", "exchange": "NASDAQ"},
    {"symbol": "META", "name": "Meta Platforms", "sector": "Technology", "exchange": "NASDAQ"},
    {"symbol": "NVDA", "name": "NVIDIA Corp.", "sector": "Technology", "exchange": "NASDAQ"},
    {"symbol": "BTC-USD", "name": "Bitcoin", "sector": "Crypto", "exchange": "Crypto"},
    {"symbol": "ETH-USD", "name": "Ethereum", "sector": "Crypto", "exchange": "Crypto"},
    {"symbol": "SPY", "name": "S&P 500 ETF", "sector": "ETF", "exchange": "NYSE Arca"},
]

# Full global catalog for search (mirrors the frontend JS catalog)
GLOBAL_CATALOG = [
    # US Tech
    {"symbol": "AAPL",  "name": "Apple Inc.",             "sector": "Technology",    "exchange": "NASDAQ"},
    {"symbol": "MSFT",  "name": "Microsoft Corp.",         "sector": "Technology",    "exchange": "NASDAQ"},
    {"symbol": "GOOGL", "name": "Alphabet Inc.",           "sector": "Technology",    "exchange": "NASDAQ"},
    {"symbol": "AMZN",  "name": "Amazon.com Inc.",         "sector": "Consumer",      "exchange": "NASDAQ"},
    {"symbol": "TSLA",  "name": "Tesla Inc.",              "sector": "Auto",          "exchange": "NASDAQ"},
    {"symbol": "META",  "name": "Meta Platforms",          "sector": "Technology",    "exchange": "NASDAQ"},
    {"symbol": "NVDA",  "name": "NVIDIA Corp.",            "sector": "Technology",    "exchange": "NASDAQ"},
    {"symbol": "NFLX",  "name": "Netflix Inc.",            "sector": "Media",         "exchange": "NASDAQ"},
    {"symbol": "AMD",   "name": "Advanced Micro Devices",  "sector": "Technology",    "exchange": "NASDAQ"},
    {"symbol": "INTC",  "name": "Intel Corp.",             "sector": "Technology",    "exchange": "NASDAQ"},
    {"symbol": "PLTR",  "name": "Palantir Technologies",   "sector": "Technology",    "exchange": "NYSE"},
    {"symbol": "CRM",   "name": "Salesforce Inc.",         "sector": "Technology",    "exchange": "NYSE"},
    {"symbol": "ORCL",  "name": "Oracle Corp.",            "sector": "Technology",    "exchange": "NYSE"},
    {"symbol": "ADBE",  "name": "Adobe Inc.",              "sector": "Technology",    "exchange": "NASDAQ"},
    {"symbol": "PYPL",  "name": "PayPal Holdings",         "sector": "Fintech",       "exchange": "NASDAQ"},
    {"symbol": "UBER",  "name": "Uber Technologies",       "sector": "Technology",    "exchange": "NYSE"},
    {"symbol": "COIN",  "name": "Coinbase Global",         "sector": "Fintech",       "exchange": "NASDAQ"},
    {"symbol": "AVGO",  "name": "Broadcom Inc.",           "sector": "Technology",    "exchange": "NASDAQ"},
    {"symbol": "QCOM",  "name": "Qualcomm Inc.",           "sector": "Technology",    "exchange": "NASDAQ"},
    {"symbol": "MU",    "name": "Micron Technology",       "sector": "Technology",    "exchange": "NASDAQ"},
    {"symbol": "ASML",  "name": "ASML Holding",           "sector": "Technology",    "exchange": "NASDAQ"},
    {"symbol": "ARM",   "name": "Arm Holdings",           "sector": "Technology",    "exchange": "NASDAQ"},
    # US Financials
    {"symbol": "JPM",   "name": "JPMorgan Chase",          "sector": "Financials",    "exchange": "NYSE"},
    {"symbol": "GS",    "name": "Goldman Sachs",           "sector": "Financials",    "exchange": "NYSE"},
    {"symbol": "BAC",   "name": "Bank of America",         "sector": "Financials",    "exchange": "NYSE"},
    {"symbol": "V",     "name": "Visa Inc.",               "sector": "Financials",    "exchange": "NYSE"},
    {"symbol": "MA",    "name": "Mastercard Inc.",         "sector": "Financials",    "exchange": "NYSE"},
    {"symbol": "AXP",   "name": "American Express",        "sector": "Financials",    "exchange": "NYSE"},
    {"symbol": "BRK-B", "name": "Berkshire Hathaway B",   "sector": "Financials",    "exchange": "NYSE"},
    # US Healthcare
    {"symbol": "JNJ",   "name": "Johnson & Johnson",       "sector": "Healthcare",    "exchange": "NYSE"},
    {"symbol": "PFE",   "name": "Pfizer Inc.",             "sector": "Healthcare",    "exchange": "NYSE"},
    {"symbol": "LLY",   "name": "Eli Lilly & Co.",         "sector": "Healthcare",    "exchange": "NYSE"},
    {"symbol": "MRNA",  "name": "Moderna Inc.",            "sector": "Healthcare",    "exchange": "NASDAQ"},
    # US Consumer
    {"symbol": "WMT",   "name": "Walmart Inc.",            "sector": "Consumer",      "exchange": "NYSE"},
    {"symbol": "COST",  "name": "Costco Wholesale",        "sector": "Consumer",      "exchange": "NASDAQ"},
    {"symbol": "MCD",   "name": "McDonald's Corp.",        "sector": "Consumer",      "exchange": "NYSE"},
    {"symbol": "SBUX",  "name": "Starbucks Corp.",         "sector": "Consumer",      "exchange": "NASDAQ"},
    {"symbol": "NKE",   "name": "Nike Inc.",               "sector": "Consumer",      "exchange": "NYSE"},
    {"symbol": "DIS",   "name": "Walt Disney Co.",         "sector": "Media",         "exchange": "NYSE"},
    # US Energy
    {"symbol": "XOM",   "name": "Exxon Mobil Corp.",       "sector": "Energy",        "exchange": "NYSE"},
    {"symbol": "CVX",   "name": "Chevron Corp.",           "sector": "Energy",        "exchange": "NYSE"},
    # India
    {"symbol": "RELIANCE.NS",   "name": "Reliance Industries",       "sector": "Conglomerate", "exchange": "NSE"},
    {"symbol": "TCS.NS",        "name": "Tata Consultancy Services",  "sector": "IT",           "exchange": "NSE"},
    {"symbol": "INFY.NS",       "name": "Infosys Ltd.",               "sector": "IT",           "exchange": "NSE"},
    {"symbol": "HDFCBANK.NS",   "name": "HDFC Bank Ltd.",             "sector": "Banking",      "exchange": "NSE"},
    {"symbol": "ICICIBANK.NS",  "name": "ICICI Bank Ltd.",            "sector": "Banking",      "exchange": "NSE"},
    {"symbol": "SBIN.NS",       "name": "State Bank of India",        "sector": "Banking",      "exchange": "NSE"},
    {"symbol": "WIPRO.NS",      "name": "Wipro Ltd.",                 "sector": "IT",           "exchange": "NSE"},
    {"symbol": "TATASTEEL.NS",  "name": "Tata Steel Ltd.",            "sector": "Steel",        "exchange": "NSE"},
    {"symbol": "TATAMOTORS.NS", "name": "Tata Motors Ltd.",           "sector": "Auto",         "exchange": "NSE"},
    {"symbol": "HCLTECH.NS",    "name": "HCL Technologies",           "sector": "IT",           "exchange": "NSE"},
    {"symbol": "BAJFINANCE.NS", "name": "Bajaj Finance Ltd.",          "sector": "NBFC",         "exchange": "NSE"},
    {"symbol": "AXISBANK.NS",   "name": "Axis Bank Ltd.",             "sector": "Banking",      "exchange": "NSE"},
    {"symbol": "ADANIENT.NS",   "name": "Adani Enterprises",          "sector": "Conglomerate", "exchange": "NSE"},
    {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel Ltd.",         "sector": "Telecom",      "exchange": "NSE"},
    {"symbol": "MARUTI.NS",     "name": "Maruti Suzuki India",        "sector": "Auto",         "exchange": "NSE"},
    {"symbol": "ITC.NS",        "name": "ITC Ltd.",                   "sector": "FMCG",         "exchange": "NSE"},
    {"symbol": "SUNPHARMA.NS",  "name": "Sun Pharmaceutical",         "sector": "Healthcare",   "exchange": "NSE"},
    {"symbol": "TITAN.NS",      "name": "Titan Company Ltd.",         "sector": "Consumer",     "exchange": "NSE"},
    {"symbol": "ASIANPAINT.NS", "name": "Asian Paints Ltd.",          "sector": "Consumer",     "exchange": "NSE"},
    {"symbol": "ZOMATO.NS",     "name": "Zomato Ltd.",                "sector": "Consumer",     "exchange": "NSE"},
    {"symbol": "LT.NS",         "name": "Larsen & Toubro Ltd.",       "sector": "Engineering",  "exchange": "NSE"},
    {"symbol": "DMART.NS",      "name": "Avenue Supermarts (DMart)",  "sector": "Retail",       "exchange": "NSE"},
    {"symbol": "ONGC.NS",       "name": "Oil & Natural Gas Corp.",    "sector": "Energy",       "exchange": "NSE"},
    {"symbol": "NTPC.NS",       "name": "NTPC Ltd.",                  "sector": "Energy",       "exchange": "NSE"},
    # ETFs & Indices
    {"symbol": "SPY",    "name": "SPDR S&P 500 ETF",       "sector": "ETF",    "exchange": "NYSE Arca"},
    {"symbol": "QQQ",    "name": "Invesco QQQ Trust",       "sector": "ETF",    "exchange": "NASDAQ"},
    {"symbol": "IWM",    "name": "iShares Russell 2000",    "sector": "ETF",    "exchange": "NYSE Arca"},
    {"symbol": "DIA",    "name": "SPDR Dow Jones ETF",      "sector": "ETF",    "exchange": "NYSE Arca"},
    {"symbol": "GLD",    "name": "SPDR Gold Shares",        "sector": "ETF",    "exchange": "NYSE Arca"},
    {"symbol": "ARKK",   "name": "ARK Innovation ETF",      "sector": "ETF",    "exchange": "NYSE Arca"},
    {"symbol": "VIX",    "name": "CBOE Volatility Index",   "sector": "Index",  "exchange": "CBOE"},
    # Crypto
    {"symbol": "BTC-USD",  "name": "Bitcoin",      "sector": "Crypto", "exchange": "Crypto"},
    {"symbol": "ETH-USD",  "name": "Ethereum",     "sector": "Crypto", "exchange": "Crypto"},
    {"symbol": "SOL-USD",  "name": "Solana",       "sector": "Crypto", "exchange": "Crypto"},
    {"symbol": "BNB-USD",  "name": "Binance Coin", "sector": "Crypto", "exchange": "Crypto"},
    {"symbol": "XRP-USD",  "name": "XRP (Ripple)", "sector": "Crypto", "exchange": "Crypto"},
    {"symbol": "DOGE-USD", "name": "Dogecoin",     "sector": "Crypto", "exchange": "Crypto"},
    {"symbol": "ADA-USD",  "name": "Cardano",      "sector": "Crypto", "exchange": "Crypto"},
    {"symbol": "AVAX-USD", "name": "Avalanche",    "sector": "Crypto", "exchange": "Crypto"},
    {"symbol": "MATIC-USD","name": "Polygon",      "sector": "Crypto", "exchange": "Crypto"},
    {"symbol": "SHIB-USD", "name": "Shiba Inu",    "sector": "Crypto", "exchange": "Crypto"},
    # Forex
    {"symbol": "EURUSD=X", "name": "EUR/USD",  "sector": "Forex", "exchange": "FX"},
    {"symbol": "GBPUSD=X", "name": "GBP/USD",  "sector": "Forex", "exchange": "FX"},
    {"symbol": "USDINR=X", "name": "USD/INR",  "sector": "Forex", "exchange": "FX"},
    {"symbol": "USDJPY=X", "name": "USD/JPY",  "sector": "Forex", "exchange": "FX"},
    # Commodities
    {"symbol": "GC=F",  "name": "Gold Futures",             "sector": "Commodity", "exchange": "COMEX"},
    {"symbol": "CL=F",  "name": "Crude Oil Futures (WTI)",  "sector": "Commodity", "exchange": "NYMEX"},
    {"symbol": "NG=F",  "name": "Natural Gas Futures",      "sector": "Commodity", "exchange": "NYMEX"},
]


def format_error_response(message: str, details: Optional[Dict] = None) -> Dict[str, Any]:
    """Standardized error response format"""
    response = {
        "status": "error",
        "message": message,
        "timestamp": datetime.now().isoformat()
    }
    if details:
        response["details"] = details
    return response


def format_success_response(data: Any) -> Dict[str, Any]:
    """Standardized success response format"""
    return {
        "status": "success",
        "data": data,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/price/{symbol}")
def get_price(symbol: str):
    """Get current price and basic stats for a symbol with comprehensive error handling"""
    try:
        original_symbol = symbol.upper()
        # Normalize symbol for Yahoo Finance (e.g., VIX -> ^VIX)
        yahoo_symbol = normalize_symbol(original_symbol)

        cache_key = f"{original_symbol}"
        now_ts = time.time()
        
        # Priority 1: Instant memory lookup from WebSocket streaming engine
        live_tick = live_cache.get_tick(cache_key)
        if live_tick:
            return format_success_response(live_tick)
            
        cached = _price_cache.get(cache_key)
        if cached:
            cached_data, cached_at = cached
            if (now_ts - cached_at) < _PRICE_TTL_SECONDS:
                return format_success_response(cached_data)

        logger.info(f"Fetching price for {original_symbol} (Yahoo: {yahoo_symbol})")

        import requests
        price, prev_close, open_price, day_high, day_low, volume = None, None, None, None, None, None
        spark = []

        try:
            url = f"https://query2.finance.yahoo.com/v8/finance/chart/{yahoo_symbol}?interval=1d&range=1mo"
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
            res = requests.get(url, headers=headers, timeout=5)
            if res.status_code == 200:
                body = res.json()
                result = body.get("chart", {}).get("result", [])
                if result:
                    meta = result[0].get("meta", {})
                    indicators = result[0].get("indicators", {}).get("quote", [{}])[0]
                    timestamps = result[0].get("timestamp", [])
                    
                    price = clean_float(meta.get("regularMarketPrice"))
                    prev_close = clean_float(meta.get("chartPreviousClose") or meta.get("regularMarketPreviousClose"))
                    open_price = clean_float(meta.get("regularMarketOpen") or price)
                    day_high = clean_float(meta.get("regularMarketDayHigh") or price)
                    day_low = clean_float(meta.get("regularMarketDayLow") or price)
                    volume = clean_float(meta.get("regularMarketVolume"))
                    
                    closes = indicators.get("close", [])
                    for i, ts in enumerate(timestamps):
                        if i < len(closes) and closes[i] is not None:
                            spark.append({"time": ts, "close": round(float(closes[i]), 4)})
        except Exception as e:
            logger.warning(f"Fast chart API failed for {original_symbol}: {e}")

        if price is None or prev_close is None:
            ticker = yf.Ticker(yahoo_symbol)
            fast_info = getattr(ticker, "fast_info", {}) or {}
            price = clean_float(fast_info.get("last_price") or fast_info.get("last") or fast_info.get("regular_market_price"))
            prev_close = clean_float(fast_info.get("previous_close") or fast_info.get("previousClose"))
            open_price = clean_float(fast_info.get("open"))
            day_high = clean_float(fast_info.get("day_high") or fast_info.get("high"))
            day_low = clean_float(fast_info.get("day_low") or fast_info.get("low"))
            volume = clean_float(fast_info.get("volume"))

            hist = ticker.history(period="2d")
            if (price is None or prev_close is None) and hist is not None and not hist.empty:
                latest = hist.iloc[-1]
                prev = hist.iloc[-2] if len(hist) > 1 else hist.iloc[-1]
                price = clean_float(latest.get("Close"))
                prev_close = clean_float(prev.get("Close"))
                open_price = clean_float(latest.get("Open", price))
                day_high = clean_float(latest.get("High", price))
                day_low = clean_float(latest.get("Low", price))
                volume = clean_float(latest.get("Volume", 0.0))

            hist_short = ticker.history(period="1mo", interval="1d")
            if hist_short is not None and not hist_short.empty:
                for ts, row in hist_short.tail(30).iterrows():
                    spark.append({
                        "time": int(ts.timestamp()),
                        "close": round(float(row["Close"]), 4),
                    })

        if price is None or prev_close is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Symbol '{original_symbol}' not found or market is closed"
            )

        change = float(price) - float(prev_close)
        change_pct = (change / float(prev_close)) if prev_close else 0.0

        data = {
            "symbol": original_symbol,
            "price": round(float(price), 2),
            "change": round(float(change), 2),
            "change_pct": round(float(change_pct), 6),
            "volume": int(volume or 0),
            "open": round(float(open_price or price), 2),
            "high": round(float(day_high or price), 2),
            "low": round(float(day_low or price), 2),
            "prev_close": round(float(prev_close), 2),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "history": spark,
        }

        _price_cache[cache_key] = (data, now_ts)
        
        logger.debug(f"Successfully fetched price for {original_symbol}: ${price:.2f}")
        return format_success_response(data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching price for {symbol}: {str(e)}", exc_info=True)
        cached = _price_cache.get(symbol.upper())
        if cached:
            cached_data, _ = cached
            cached_data = {**cached_data, "source": "cache_fallback"}
            return format_success_response(cached_data)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch price data: {str(e)}"
        )

@router.get("/prices/bulk")
def get_prices_bulk(symbols: str):
    """
    Fetch exact pricing for multiple symbols instantly in parallel to prevent 
    FastAPI threadpool starvation on the Global Markets dashboard.
    """
    import concurrent.futures

    sym_list = [s.strip() for s in symbols.split(',') if s.strip()]
    if not sym_list:
        return format_success_response({})

    results = {}
    now_ts = time.time()

    # Fast path: serve from live cache / recent in-memory cache first.
    for sym in sym_list:
        normalized = sym.upper()
        live_tick = live_cache.get_tick(normalized)
        if live_tick:
            results[sym] = {
                "symbol": normalized,
                "price": round(float(live_tick.get("price", 0.0)), 2),
                "change": round(float(live_tick.get("change", 0.0)), 2),
                "change_pct": round(float(live_tick.get("change_pct", 0.0)), 6),
                "volume": int(live_tick.get("volume", 0) or 0),
                "open": round(float(live_tick.get("price", 0.0)), 2),
                "high": round(float(live_tick.get("price", 0.0)), 2),
                "low": round(float(live_tick.get("price", 0.0)), 2),
                "prev_close": round(float(live_tick.get("price", 0.0) - live_tick.get("change", 0.0)), 2),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "history": [],
                "source": "live_cache",
            }
            continue

        cached = _price_cache.get(normalized)
        if cached:
            cached_data, cached_at = cached
            if (now_ts - cached_at) < _PRICE_TTL_SECONDS:
                results[sym] = {**cached_data, "source": "cache_fallback"}

    unresolved = [sym for sym in sym_list if sym not in results]
    if not unresolved:
        return format_success_response(results)

    # We use a larger executor and longer timeout so the UI actually receives all quotes
    # instead of timing out and displaying missing "$-" values.
    max_workers = min(max(len(unresolved), 1), 40)
    timeout_seconds = 25.0
    # Process all requested symbols without truncating
    
    def fetch_single(sym):
        try:
            # Reusing the existing robust function safely bypasses duplicate logic
            return sym, get_price(sym)["data"]
        except Exception:
            return sym, None

    executor = concurrent.futures.ThreadPoolExecutor(max_workers=max_workers)
    try:
        future_to_sym = {executor.submit(fetch_single, sym): sym for sym in unresolved}

        try:
            for future in concurrent.futures.as_completed(future_to_sym, timeout=timeout_seconds):
                sym, data = future.result()
                if data:
                    results[sym] = data
        except concurrent.futures.TimeoutError:
            logger.warning(
                "bulk_price_timeout_partial",
                extra={"extra_data": {"requested": len(unresolved), "returned": len(results), "timeout_seconds": timeout_seconds}},
            )

        for future, sym in future_to_sym.items():
            if sym in results:
                continue
            if future.done():
                try:
                    _, data = future.result()
                    if data:
                        results[sym] = data
                        continue
                except Exception:
                    pass
            else:
                future.cancel()
    finally:
        # Do not block response on slow upstream fetchers.
        executor.shutdown(wait=False, cancel_futures=True)

    # Fast fallback layer: live cache first, then in-memory price cache
    for sym in sym_list:
        if sym in results:
            continue
        normalized = sym.upper()
        live_tick = live_cache.get_tick(normalized)
        if live_tick:
            results[sym] = {
                "symbol": normalized,
                "price": round(float(live_tick.get("price", 0.0)), 2),
                "change": round(float(live_tick.get("change", 0.0)), 2),
                "change_pct": round(float(live_tick.get("change_pct", 0.0)), 6),
                "volume": int(live_tick.get("volume", 0) or 0),
                "open": round(float(live_tick.get("price", 0.0)), 2),
                "high": round(float(live_tick.get("price", 0.0)), 2),
                "low": round(float(live_tick.get("price", 0.0)), 2),
                "prev_close": round(float(live_tick.get("price", 0.0) - live_tick.get("change", 0.0)), 2),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "history": [],
                "source": "live_cache",
            }
            continue

        cached = _price_cache.get(normalized)
        if cached:
            cached_data, _ = cached
            results[sym] = {**cached_data, "source": "cache_fallback"}

    return format_success_response(results)


# Simple in-memory cache for OHLCV data
_ohlcv_cache = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes for OHLCV data

# Simple in-memory cache for price quotes
_price_cache = {}
_PRICE_TTL_SECONDS = 30  # 30s cache to avoid yfinance rate-limiting across concurrent requests

@router.get("/ohlcv/{symbol}")
def get_ohlcv(
    symbol: str,
    period: str = Query("1M", enum=["1D", "1W", "1M", "3M", "1Y"]),
    interval: Optional[str] = Query(None, description="Override default interval")
):
    """Get OHLCV data with proper error handling and validation"""
    try:
        original_symbol = symbol.upper()
        # Normalize symbol for Yahoo Finance (e.g., VIX -> ^VIX)
        yahoo_symbol = normalize_symbol(original_symbol)
        
        cache_key = f"{original_symbol}:{period}:{interval or 'default'}"
        
        # Check cache first
        current_time = time.time()
        if cache_key in _ohlcv_cache:
            cached_data, cached_at = _ohlcv_cache[cache_key]
            if (current_time - cached_at) < _CACHE_TTL_SECONDS:
                logger.debug(f"Cache hit for {cache_key}")
                return format_success_response(cached_data)
            else:
                logger.debug(f"Cache expired for {cache_key}")
                del _ohlcv_cache[cache_key]
        
        logger.info(f"Fetching OHLCV for {original_symbol} (Yahoo: {yahoo_symbol}), period={period}")
        
        yf_period, default_interval = PERIOD_MAP.get(period, ("1mo", "1d"))
        use_interval = interval or default_interval
        
        ticker = yf.Ticker(yahoo_symbol)
        hist = ticker.history(period=yf_period, interval=use_interval)
        
        if hist.empty:
            logger.warning(f"No OHLCV data found for {original_symbol}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No data available for {original_symbol} with period {period}"
            )
        
        records = []
        for ts, row in hist.iterrows():
            records.append({
                "time": int(ts.timestamp()),
                "date": ts.strftime("%b %d, %Y"),
                "datetime": ts.isoformat(),
                "open": round(float(row["Open"]), 4),
                "high": round(float(row["High"]), 4),
                "low": round(float(row["Low"]), 4),
                "close": round(float(row["Close"]), 4),
                "volume": int(row.get("Volume", 0)),
            })
        
        data = {
            "symbol": symbol,
            "period": period,
            "interval": use_interval,
            "count": len(records),
            "first_date": records[0]["date"] if records else None,
            "last_date": records[-1]["date"] if records else None,
            "prices": records
        }
        
        # Cache the result
        _ohlcv_cache[cache_key] = (data, current_time)
        logger.debug(f"Cached {len(records)} OHLCV records for {cache_key}")
        
        logger.debug(f"Successfully fetched {len(records)} OHLCV records for {symbol}")
        return format_success_response(data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching OHLCV for {symbol}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch OHLCV data: {str(e)}"
        )


@router.get("/info/{symbol}")
def get_symbol_info(symbol: str):
    """Get detailed symbol information with comprehensive error handling"""
    try:
        original_symbol = symbol.upper()
        yahoo_symbol = normalize_symbol(original_symbol)
        logger.info(f"Fetching info for {original_symbol} (Yahoo: {yahoo_symbol})")
        
        ticker = yf.Ticker(yahoo_symbol)
        info = ticker.info or {}
        
        # Validate we got some data
        if not info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No information found for symbol '{symbol}'"
            )
        
        hist = ticker.history(period="2d")
        price = float(hist.iloc[-1]["Close"]) if not hist.empty else None
        
        data = {
            "symbol": original_symbol,
            "name": info.get("longName") or info.get("shortName", symbol),
            "sector": info.get("sector", ""),
            "industry": info.get("industry", ""),
            "market_cap": info.get("marketCap"),
            "pe_ratio": round(info.get("trailingPE"), 2) if info.get("trailingPE") else None,
            "eps": round(info.get("trailingEps"), 2) if info.get("trailingEps") else None,
            "dividend_yield": round(info.get("dividendYield") * 100, 2) if info.get("dividendYield") else None,
            "52w_high": info.get("fiftyTwoWeekHigh"),
            "52w_low": info.get("fiftyTwoWeekLow"),
            "avg_volume": info.get("averageVolume"),
            "description": (info.get("longBusinessSummary", "")[:500] 
                          if info.get("longBusinessSummary") else ""),
            "price": round(price, 2) if price else None,
            "website": info.get("website"),
            "employees": info.get("fullTimeEmployees"),
            "headquarters": info.get("city")
        }
        
        logger.debug(f"Successfully fetched info for {symbol}")
        return format_success_response(data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching info for {symbol}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch symbol information: {str(e)}"
        )


@router.get("/search")
async def search_symbols(q: str = Query(..., min_length=1, max_length=50)):
    """Search global symbols — searches full catalog first, falls back to yfinance."""
    try:
        query_raw = q.strip()
        query_up = query_raw.upper()
        query_lo = query_raw.lower()
        logger.info(f"Searching for: {query_raw}")

        def score(item: dict) -> int:
            sym  = item["symbol"].upper()
            name = item["name"].lower()
            sect = item.get("sector", "").lower()
            exch = item.get("exchange", "").lower()
            s = 0
            if sym == query_up:               s += 100
            elif sym.startswith(query_up):    s += 80
            elif query_up in sym:             s += 60
            elif name.startswith(query_lo):   s += 50
            elif query_lo in name:            s += 40
            elif query_lo in sect:            s += 20
            elif query_lo in exch:            s += 10
            return s

        scored = [(score(item), item) for item in GLOBAL_CATALOG]
        results = [
            item for sc, item in sorted(scored, key=lambda x: -x[0])
            if sc > 0
        ][:10]

        return format_success_response({
            "query": query_raw,
            "count": len(results),
            "results": results,
        })

    except Exception as e:
        logger.error(f"Error searching symbols: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}"
        )



@router.get("/popular")
async def get_popular():
    """Get list of popular symbols"""
    return format_success_response({
        "count": len(POPULAR_SYMBOLS),
        "symbols": POPULAR_SYMBOLS
    })


# Cache for technicals (2 minutes TTL)
_technicals_cache: dict = {}
_TECH_TTL = 120

@router.get("/technicals/{symbol}")
def get_technicals(symbol: str):
    """
    Compute real technical indicators from 60-day OHLCV history:
    - SMA-20, SMA-50 (trend direction)
    - RSI-14 (momentum / signal state)
    - Support & resistance levels
    - Volatility (20-day std of daily returns)
    """
    original_symbol = symbol.upper()
    yahoo_symbol = normalize_symbol(original_symbol)
    cache_key = original_symbol
    now_ts = time.time()

    cached = _technicals_cache.get(cache_key)
    if cached:
        data, cached_at = cached
        if now_ts - cached_at < _TECH_TTL:
            return format_success_response(data)

    try:
        ticker = yf.Ticker(yahoo_symbol)
        hist = ticker.history(period="3mo", interval="1d")

        if hist is None or hist.empty or len(hist) < 15:
            # Return neutral fallback if not enough data
            return format_success_response({
                "symbol": original_symbol,
                "trend_bias": "Neutral",
                "signal_state": "HOLD",
                "rsi_14": None,
                "sma_20": None,
                "sma_50": None,
                "current_price": None,
                "support": None,
                "resistance": None,
                "volatility_pct": None,
                "note": "Insufficient history",
            })

        closes = hist["Close"].astype(float)
        current_price = float(closes.iloc[-1])

        # ── SMA ──────────────────────────────────────────────────────────────
        sma_20 = float(closes.tail(20).mean()) if len(closes) >= 20 else None
        sma_50 = float(closes.tail(50).mean()) if len(closes) >= 50 else None

        # ── RSI-14 ────────────────────────────────────────────────────────────
        delta = closes.diff().dropna()
        gain = delta.clip(lower=0)
        loss = (-delta).clip(lower=0)
        # Wilder's smoothing
        avg_gain = gain.ewm(com=13, adjust=False).mean().iloc[-1]
        avg_loss = loss.ewm(com=13, adjust=False).mean().iloc[-1]
        if avg_loss == 0:
            rsi = 100.0
        else:
            rs = avg_gain / avg_loss
            rsi = round(100.0 - (100.0 / (1.0 + rs)), 2)

        # ── Trend Bias ───────────────────────────────────────────────────────
        if sma_20 and sma_50:
            if current_price > sma_20 > sma_50:
                trend_bias = "Bullish"
            elif current_price < sma_20 < sma_50:
                trend_bias = "Bearish"
            elif current_price > sma_50:
                trend_bias = "Mildly Bullish"
            else:
                trend_bias = "Mildly Bearish"
        elif sma_20:
            trend_bias = "Bullish" if current_price > sma_20 else "Bearish"
        else:
            trend_bias = "Neutral"

        # ── Signal State from RSI ────────────────────────────────────────────
        if rsi >= 65:
            signal_state = "SELL"   # overbought
        elif rsi <= 35:
            signal_state = "BUY"    # oversold
        else:
            signal_state = "HOLD"

        # ── Support / Resistance (20-day low/high) ───────────────────────────
        window_20 = hist.tail(20)
        support = round(float(window_20["Low"].min()), 2)
        resistance = round(float(window_20["High"].max()), 2)

        # ── Volatility ───────────────────────────────────────────────────────
        daily_returns = closes.pct_change().dropna().tail(20)
        volatility_pct = round(float(daily_returns.std() * 100), 2) if len(daily_returns) > 1 else None

        data = {
            "symbol": original_symbol,
            "trend_bias": trend_bias,
            "signal_state": signal_state,
            "rsi_14": rsi,
            "sma_20": round(sma_20, 2) if sma_20 else None,
            "sma_50": round(sma_50, 2) if sma_50 else None,
            "current_price": round(current_price, 2),
            "support": support,
            "resistance": resistance,
            "volatility_pct": volatility_pct,
        }
        _technicals_cache[cache_key] = (data, now_ts)
        return format_success_response(data)

    except Exception as e:
        logger.error(f"Technicals error for {symbol}: {e}", exc_info=True)
        return format_success_response({
            "symbol": original_symbol,
            "trend_bias": "Neutral",
            "signal_state": "HOLD",
            "rsi_14": None,
            "sma_20": None,
            "sma_50": None,
            "current_price": None,
            "support": None,
            "resistance": None,
            "volatility_pct": None,
            "note": str(e),
        })
