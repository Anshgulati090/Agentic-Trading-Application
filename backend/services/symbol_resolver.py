from typing import Any


CATALOG = [
    {"symbol": "AAPL", "name": "Apple", "type": "Equity", "exchange": "NASDAQ", "aliases": ["apple", "apple stock", "iphone", "apple inc"]},
    {"symbol": "MSFT", "name": "Microsoft", "type": "Equity", "exchange": "NASDAQ", "aliases": ["microsoft", "microsoft stock", "windows", "azure"]},
    {"symbol": "GOOGL", "name": "Alphabet", "type": "Equity", "exchange": "NASDAQ", "aliases": ["google", "alphabet", "google stock"]},
    {"symbol": "AMZN", "name": "Amazon", "type": "Equity", "exchange": "NASDAQ", "aliases": ["amazon", "amazon stock", "aws"]},
    {"symbol": "TSLA", "name": "Tesla", "type": "Equity", "exchange": "NASDAQ", "aliases": ["tesla", "tesla stock", "elon stock"]},
    {"symbol": "META", "name": "Meta Platforms", "type": "Equity", "exchange": "NASDAQ", "aliases": ["meta", "facebook", "facebook stock"]},
    {"symbol": "NVDA", "name": "NVIDIA", "type": "Equity", "exchange": "NASDAQ", "aliases": ["nvidia", "nvidia stock", "nvidea", "gpu stock"]},
    {"symbol": "NFLX", "name": "Netflix", "type": "Equity", "exchange": "NASDAQ", "aliases": ["netflix"]},
    {"symbol": "AMD", "name": "Advanced Micro Devices", "type": "Equity", "exchange": "NASDAQ", "aliases": ["amd", "advanced micro devices"]},
    {"symbol": "INTC", "name": "Intel", "type": "Equity", "exchange": "NASDAQ", "aliases": ["intel"]},
    {"symbol": "PLTR", "name": "Palantir", "type": "Equity", "exchange": "NYSE", "aliases": ["palantir"]},
    {"symbol": "CRM", "name": "Salesforce", "type": "Equity", "exchange": "NYSE", "aliases": ["salesforce"]},
    {"symbol": "ORCL", "name": "Oracle", "type": "Equity", "exchange": "NYSE", "aliases": ["oracle"]},
    {"symbol": "JPM", "name": "JPMorgan Chase", "type": "Equity", "exchange": "NYSE", "aliases": ["jpmorgan", "jp morgan", "jpm"]},
    {"symbol": "GS", "name": "Goldman Sachs", "type": "Equity", "exchange": "NYSE", "aliases": ["goldman", "goldman sachs"]},
    {"symbol": "V", "name": "Visa", "type": "Equity", "exchange": "NYSE", "aliases": ["visa"]},
    {"symbol": "WMT", "name": "Walmart", "type": "Equity", "exchange": "NYSE", "aliases": ["walmart", "walmart stock"]},
    {"symbol": "COST", "name": "Costco", "type": "Equity", "exchange": "NASDAQ", "aliases": ["costco"]},
    {"symbol": "XOM", "name": "Exxon Mobil", "type": "Equity", "exchange": "NYSE", "aliases": ["exxon", "exxon mobil"]},
    {"symbol": "CVX", "name": "Chevron", "type": "Equity", "exchange": "NYSE", "aliases": ["chevron"]},
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "type": "ETF", "exchange": "NYSE Arca", "aliases": ["spy", "s&p 500", "sp500", "s and p"]},
    {"symbol": "QQQ", "name": "Invesco QQQ Trust", "type": "ETF", "exchange": "NASDAQ", "aliases": ["qqq", "nasdaq 100", "nasdaq"]},
    {"symbol": "IWM", "name": "iShares Russell 2000 ETF", "type": "ETF", "exchange": "NYSE Arca", "aliases": ["iwm", "russell 2000"]},
    {"symbol": "GLD", "name": "SPDR Gold Shares", "type": "ETF", "exchange": "NYSE Arca", "aliases": ["gold", "gld"]},
    {"symbol": "BTC", "name": "Bitcoin", "type": "Crypto", "exchange": "Crypto", "aliases": ["bitcoin", "btc", "bitcoin price"]},
    {"symbol": "ETH", "name": "Ethereum", "type": "Crypto", "exchange": "Crypto", "aliases": ["ethereum", "eth", "ether"]},
    {"symbol": "SOL", "name": "Solana", "type": "Crypto", "exchange": "Crypto", "aliases": ["solana", "sol"]},
]


class SymbolResolverService:
    def __init__(self) -> None:
        self._catalog = CATALOG

    def resolve(self, query: str) -> dict | None:
        normalized = self._normalize(query)
        if not normalized:
            return None
        for item in self._catalog:
            if normalized == item["symbol"].lower():
                return item
            if normalized == item["name"].lower():
                return item
            if normalized in item.get("aliases", []):
                return item
        ranked = self.suggest(query, limit=1)
        return ranked[0] if ranked else None

    def suggest(self, query: str, limit: int = 6) -> list[dict]:
        normalized = self._normalize(query)
        if not normalized:
            return self._catalog[:limit]
        scored = []
        for item in self._catalog:
            tokens = [item["symbol"], item["name"], *item.get("aliases", [])]
            haystack = " ".join(tokens).lower()
            score = 0
            if item["symbol"].lower().startswith(normalized):
                score += 100
            if item["name"].lower().startswith(normalized):
                score += 80
            if any(alias.startswith(normalized) for alias in item.get("aliases", [])):
                score += 70
            if normalized in haystack:
                score += 40
            if score:
                scored.append((score, item))
        scored.sort(key=lambda pair: (-pair[0], pair[1]["symbol"]))
        return [item for _, item in scored[:limit]]

    @staticmethod
    def _normalize(query: str) -> str:
        return " ".join(str(query or "").strip().lower().replace("-", " ").split())
