from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

router = APIRouter(tags=["Market"])

PERIOD_MAP = {
    "1D": ("1d", "5m"),
    "1W": ("5d", "15m"),
    "1M": ("1mo", "1h"),
    "3M": ("3mo", "1d"),
    "1Y": ("1y", "1wk"),
}

POPULAR_SYMBOLS = [
    {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology"},
    {"symbol": "MSFT", "name": "Microsoft Corp.", "sector": "Technology"},
    {"symbol": "GOOGL", "name": "Alphabet Inc.", "sector": "Technology"},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "sector": "Consumer Cyclical"},
    {"symbol": "TSLA", "name": "Tesla Inc.", "sector": "Auto"},
    {"symbol": "META", "name": "Meta Platforms", "sector": "Technology"},
    {"symbol": "NVDA", "name": "NVIDIA Corp.", "sector": "Technology"},
    {"symbol": "BTC-USD", "name": "Bitcoin", "sector": "Crypto"},
    {"symbol": "ETH-USD", "name": "Ethereum", "sector": "Crypto"},
    {"symbol": "SPY", "name": "S&P 500 ETF", "sector": "ETF"},
]


@router.get("/price/{symbol}")
def get_price(symbol: str):
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.fast_info
        hist = ticker.history(period="2d")
        if hist.empty:
            return {"status": "error", "message": "No data"}
        latest = hist.iloc[-1]
        prev = hist.iloc[-2] if len(hist) > 1 else hist.iloc[-1]
        price = float(latest["Close"])
        prev_close = float(prev["Close"])
        change = price - prev_close
        change_pct = change / prev_close if prev_close else 0
        return {
            "status": "success",
            "data": {
                "symbol": symbol.upper(),
                "price": price,
                "change": round(change, 4),
                "change_pct": round(change_pct, 6),
                "volume": int(latest.get("Volume", 0)),
                "open": float(latest["Open"]),
                "high": float(latest["High"]),
                "low": float(latest["Low"]),
                "prev_close": prev_close,
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/ohlcv/{symbol}")
def get_ohlcv(
    symbol: str,
    period: str = Query("1M", enum=["1D", "1W", "1M", "3M", "1Y"]),
):
    try:
        yf_period, interval = PERIOD_MAP.get(period, ("1mo", "1d"))
        ticker = yf.Ticker(symbol.upper())
        hist = ticker.history(period=yf_period, interval=interval)
        if hist.empty:
            raise HTTPException(404, "No OHLCV data found")
        records = []
        for ts, row in hist.iterrows():
            records.append({
                "time": int(ts.timestamp()),
                "date": ts.strftime("%b %d"),
                "open": round(float(row["Open"]), 4),
                "high": round(float(row["High"]), 4),
                "low": round(float(row["Low"]), 4),
                "close": round(float(row["Close"]), 4),
                "volume": int(row.get("Volume", 0)),
            })
        return {"status": "success", "symbol": symbol.upper(), "period": period, "data": records}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/info/{symbol}")
def get_symbol_info(symbol: str):
    try:
        ticker = yf.Ticker(symbol.upper())
        info = ticker.info or {}
        hist = ticker.history(period="2d")
        price = float(hist.iloc[-1]["Close"]) if not hist.empty else None
        return {
            "status": "success",
            "data": {
                "symbol": symbol.upper(),
                "name": info.get("longName") or info.get("shortName", symbol.upper()),
                "sector": info.get("sector", ""),
                "industry": info.get("industry", ""),
                "market_cap": info.get("marketCap"),
                "pe_ratio": info.get("trailingPE"),
                "eps": info.get("trailingEps"),
                "dividend_yield": info.get("dividendYield"),
                "52w_high": info.get("fiftyTwoWeekHigh"),
                "52w_low": info.get("fiftyTwoWeekLow"),
                "avg_volume": info.get("averageVolume"),
                "description": info.get("longBusinessSummary", "")[:500] if info.get("longBusinessSummary") else "",
                "price": price,
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/search")
def search_symbols(q: str = Query(..., min_length=1)):
    query = q.upper().strip()
    results = [
        s for s in POPULAR_SYMBOLS
        if query in s["symbol"].upper() or query in s["name"].upper()
    ]
    # Also try direct ticker lookup for exact matches
    if not results and len(query) <= 6:
        try:
            ticker = yf.Ticker(query)
            info = ticker.info or {}
            if info.get("regularMarketPrice") or info.get("currentPrice"):
                results.append({
                    "symbol": query,
                    "name": info.get("longName") or info.get("shortName", query),
                    "sector": info.get("sector", ""),
                })
        except Exception:
            pass
    return {"status": "success", "results": results[:10]}


@router.get("/popular")
def get_popular():
    return {"status": "success", "data": POPULAR_SYMBOLS}
