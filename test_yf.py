import yfinance as yf
ticker = yf.Ticker("META")
print("FAST INFO:")
print(getattr(ticker, "fast_info", {}))
print("HISTORY:")
print(ticker.history(period="2d"))
