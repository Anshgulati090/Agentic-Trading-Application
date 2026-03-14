"""
Namespaced cache service for market data, signals, agent memory, and portfolio.
"""

from typing import Any, Optional

from backend.cache.redis_client import RedisClient


class CacheService:
    """
    High-level cache with key namespaces and default TTLs:
    - market_data:{symbol}
    - signals:{symbol}:{agent_name}
    - agent_memory:{agent_name}
    - portfolio:summary
    """

    PREFIX_MARKET = "market_data"
    PREFIX_SIGNAL = "signals"
    PREFIX_AGENT_MEMORY = "agent_memory"
    PREFIX_PORTFOLIO = "portfolio"

    DEFAULT_TTL_MARKET_SEC = 60
    DEFAULT_TTL_CHART_SEC = 180
    DEFAULT_TTL_SIGNAL_SEC = 30
    DEFAULT_TTL_AGENT_MEMORY_SEC = 300
    DEFAULT_TTL_PORTFOLIO_SEC = 10

    def __init__(
        self,
        redis_client: Optional[RedisClient] = None,
        redis_url: Optional[str] = None,
    ) -> None:
        if redis_client is not None:
            self._redis = redis_client
        else:
            self._redis = RedisClient(redis_url or "redis://localhost:6379/0")

    @property
    def is_available(self) -> bool:
        return self._redis.is_available

    def _key(self, *parts: str) -> str:
        return ":".join(str(p) for p in parts)

    # ---- Market data ----
    def get_market_data(self, symbol: str) -> Optional[dict]:
        key = self._key(self.PREFIX_MARKET, symbol.upper())
        return self._redis.get_json(key)

    def set_market_data(
        self,
        symbol: str,
        data: dict,
        ttl_seconds: Optional[int] = None,
    ) -> bool:
        key = self._key(self.PREFIX_MARKET, symbol.upper())
        return self._redis.set_json(
            key, data, ttl_seconds=ttl_seconds or self.DEFAULT_TTL_MARKET_SEC
        )

    def get_symbol_suggestions(self, query: str) -> Optional[list]:
        key = self._key("symbol_suggestions", query.lower())
        return self._redis.get_json(key)

    def set_symbol_suggestions(self, query: str, data: list, ttl_seconds: Optional[int] = None) -> bool:
        key = self._key("symbol_suggestions", query.lower())
        return self._redis.set_json(key, data, ttl_seconds=ttl_seconds or self.DEFAULT_TTL_CHART_SEC)

    # ---- Signals ----
    def get_signal(self, symbol: str, agent_name: str) -> Optional[dict]:
        key = self._key(self.PREFIX_SIGNAL, symbol.upper(), agent_name.lower())
        return self._redis.get_json(key)

    def set_signal(
        self,
        symbol: str,
        agent_name: str,
        data: dict,
        ttl_seconds: Optional[int] = None,
    ) -> bool:
        key = self._key(self.PREFIX_SIGNAL, symbol.upper(), agent_name.lower())
        return self._redis.set_json(
            key, data, ttl_seconds=ttl_seconds or self.DEFAULT_TTL_SIGNAL_SEC
        )

    # ---- Agent memory ----
    def get_agent_memory(self, agent_name: str) -> Optional[dict]:
        key = self._key(self.PREFIX_AGENT_MEMORY, agent_name.lower())
        return self._redis.get_json(key)

    def set_agent_memory(
        self,
        agent_name: str,
        data: dict,
        ttl_seconds: Optional[int] = None,
    ) -> bool:
        key = self._key(self.PREFIX_AGENT_MEMORY, agent_name.lower())
        return self._redis.set_json(
            key, data, ttl_seconds=ttl_seconds or self.DEFAULT_TTL_AGENT_MEMORY_SEC
        )

    # ---- Portfolio ----
    def get_portfolio_summary(self) -> Optional[dict]:
        key = self._key(self.PREFIX_PORTFOLIO, "summary")
        return self._redis.get_json(key)

    def set_portfolio_summary(
        self,
        data: dict,
        ttl_seconds: Optional[int] = None,
    ) -> bool:
        key = self._key(self.PREFIX_PORTFOLIO, "summary")
        return self._redis.set_json(
            key, data, ttl_seconds=ttl_seconds or self.DEFAULT_TTL_PORTFOLIO_SEC
        )
