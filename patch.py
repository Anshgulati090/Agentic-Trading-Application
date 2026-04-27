import re

with open('backend/routes/market.py', 'r', encoding='utf-8') as f:
    text = f.read()

new_logic = '''        logger.info(f"Fetching price for {original_symbol} (Yahoo: {yahoo_symbol})")

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
        change_pct = (change / float(prev_close)) if prev_close else 0.0'''

old_logic_pattern = re.compile(
    r'        logger\.info\(f"Fetching price for \{original_symbol\} \(Yahoo: \{yahoo_symbol\}\)"\)\s+'
    r'        ticker = yf\.Ticker\(yahoo_symbol\)\s+'
    r'.*?'
    r'        change_pct = \(change \/ float\(prev_close\)\) if prev_close else 0\.0\s+'
    r'        # Build lightweight sparkline history \(last 30 closes\)\s+'
    r'        spark = \[\]\s+'
    r'        hist_short = ticker\.history\(period="1mo", interval="1d"\)\s+'
    r'        if hist_short is not None and not hist_short\.empty:\s+'
    r'            for ts, row in hist_short\.tail\(30\)\.iterrows\(\):\s+'
    r'                spark\.append\(\{\s+'
    r'                    "time": int\(ts\.timestamp\(\)\),\s+'
    r'                    "close": round\(float\(row\["Close"\]\), 4\),\s+'
    r'                \}\)',
    re.DOTALL
)

if old_logic_pattern.search(text):
    text = old_logic_pattern.sub(new_logic, text)
    with open('backend/routes/market.py', 'w', encoding='utf-8') as f:
        f.write(text)
    print("Success: File patched.")
else:
    print("Error: Pattern not found in file.")
