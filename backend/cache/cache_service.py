"""
Namespaced cache service with 2-level caching (L1 Memory + L2 Redis).
Ultra-low latency for hot data with Redis fallback.
"""

from typing import Any, Optional
import time
import threading
from functools import lru_cache

from backend.cache.redis_client import RedisClient


class MemoryCache:
    """Thread-safe in-memory LRU cache with TTL support"""
    
    def __init__(self, max_size: int = 1024):
        self._cache = {}
        self._max_size = max_size
        self._lock = threading.Lock()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value if exists and not expired"""
        with self._lock:
            if key not in self._cache:
                return None
            
            value, expires_at = self._cache[key]
            if expires_at and time.time() > expires_at:
                del self._cache[key]
                return None
            
            return value
    
    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> bool:
        """Set value with optional TTL"""
        with self._lock:
            # Evict oldest if at capacity
            if len(self._cache) >= self._max_size:
                oldest_key = next(iter(self._cache))
                del self._cache[oldest_key]
            
            expires_at = None
            if ttl_seconds is not None:
                expires_at = time.time() + ttl_seconds
            
            self._cache[key] = (value, expires_at)
            return True
    
    def delete(self, key: str) -> bool:
        """Delete key"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    def clear(self):
        """Clear all cached data"""
        with self._lock:
            self._cache.clear()


class CacheService:
    """
    High-performance 2-level cache:
    - L1: In-memory cache (instant access, <1ms)
    - L2: Redis cache (network access, ~5-10ms)
    
    Namespaces:
    - market_data:{symbol}
    - signals:{symbol}:{agent_name}
    - agent_memory:{agent_name}
    - portfolio:summary
    """

    PREFIX_MARKET = "market_data"
    PREFIX_SIGNAL = "signals"
    PREFIX_AGENT_MEMORY = "agent_memory"
    PREFIX_PORTFOLIO = "portfolio"

    # Ultra-fast TTLs for low-latency data
    DEFAULT_TTL_MARKET_SEC = 30      # Reduced from 60s for fresher data
    DEFAULT_TTL_CHART_SEC = 120      # Reduced from 180s
    DEFAULT_TTL_SIGNAL_SEC = 15      # Reduced from 30s for real-time signals
    DEFAULT_TTL_AGENT_MEMORY_SEC = 300
    DEFAULT_TTL_PORTFOLIO_SEC = 5    # Reduced from 10s

    def __init__(
        self,
        redis_client: Optional[RedisClient] = None,
        redis_url: Optional[str] = None,
    ) -> None:
        # L1: In-memory cache (always available)
        self._memory_cache = MemoryCache(max_size=2048)
        
        # L2: Redis cache (optional, degrades gracefully)
        if redis_client is not None:
            self._redis = redis_client
        else:
            self._redis = RedisClient(redis_url or "redis://localhost:6379/0")

    @property
    def is_available(self) -> bool:
        return self._memory_cache is not None
    
    @property
    def redis_available(self) -> bool:
        return self._redis.is_available

    def _key(self, *parts: str) -> str:
        return ":".join(str(p) for p in parts)

    # ---- Market data (HOT PATH - Optimized for speed) ----
    def get_market_data(self, symbol: str) -> Optional[dict]:
        """Get market data with L1+L2 caching for ultra-low latency"""
        key = self._key(self.PREFIX_MARKET, symbol.upper())
        
        # L1: Try memory cache first (<1ms)
        data = self._memory_cache.get(key)
        if data is not None:
            return data
        
        # L2: Try Redis cache (~5-10ms)
        if self._redis.is_available:
            data = self._redis.get_json(key)
            if data is not None:
                # Populate L1 cache for next request
                self._memory_cache.set(key, data, ttl_seconds=15)
                return data
        
        return None

    def set_market_data(
        self,
        symbol: str,
        data: dict,
        ttl_seconds: Optional[int] = None,
    ) -> bool:
        """Set market data in both L1 and L2 caches"""
        key = self._key(self.PREFIX_MARKET, symbol.upper())
        ttl = ttl_seconds or self.DEFAULT_TTL_MARKET_SEC
        
        # Always set in L1 (instant)
        self._memory_cache.set(key, data, ttl_seconds=min(ttl, 30))
        
        # Also set in L2 if available (for other processes/servers)
        if self._redis.is_available:
            return self._redis.set_json(key, data, ttl_seconds=ttl)
        
        return True

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
