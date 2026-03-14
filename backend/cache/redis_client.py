"""
Low-level Redis client with JSON get/set and configurable TTL.
Degrades gracefully when Redis is unavailable.
"""

import json
import time
from typing import Any, Optional

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False


class RedisClient:
    """
    Thin wrapper around redis.Redis for get/set/delete with optional TTL.
    Uses JSON for complex values. Returns None on miss or connection error.
    """

    def __init__(self, url: str = "redis://localhost:6379/0") -> None:
        self._url = url
        self._client: Optional[Any] = None
        self._last_healthcheck_at = 0.0
        self._last_healthcheck_ok = False
        if REDIS_AVAILABLE:
            try:
                self._client = redis.from_url(
                    url,
                    decode_responses=True,
                    socket_connect_timeout=0.4,
                    socket_timeout=0.4,
                    retry_on_timeout=False,
                    health_check_interval=30,
                )
                self._client.ping()
            except Exception:
                self._client = None

    @property
    def is_available(self) -> bool:
        if not self._client:
            return False
        if (time.time() - self._last_healthcheck_at) < 5:
            return self._last_healthcheck_ok
        try:
            self._client.ping()
            self._last_healthcheck_at = time.time()
            self._last_healthcheck_ok = True
            return True
        except Exception:
            self._last_healthcheck_at = time.time()
            self._last_healthcheck_ok = False
            return False

    def get(self, key: str) -> Optional[str]:
        """Get raw string value. Returns None on miss or error."""
        if not self._client:
            return None
        try:
            return self._client.get(key)
        except Exception:
            return None

    def set(self, key: str, value: str, ttl_seconds: Optional[int] = None) -> bool:
        """Set string value. Optional TTL in seconds. Returns True on success."""
        if not self._client:
            return False
        try:
            if ttl_seconds is not None:
                self._client.setex(key, ttl_seconds, value)
            else:
                self._client.set(key, value)
            return True
        except Exception:
            return False

    def delete(self, key: str) -> bool:
        """Delete key. Returns True if key was removed."""
        if not self._client:
            return False
        try:
            self._client.delete(key)
            return True
        except Exception:
            return False

    def get_json(self, key: str) -> Optional[Any]:
        """Get value as JSON. Returns None on miss or error."""
        raw = self.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (json.JSONDecodeError, TypeError):
            return None

    def set_json(
        self,
        key: str,
        value: Any,
        ttl_seconds: Optional[int] = None,
    ) -> bool:
        """Set value as JSON. Optional TTL. Returns True on success."""
        try:
            raw = json.dumps(value)
            return self.set(key, raw, ttl_seconds=ttl_seconds)
        except (TypeError, ValueError):
            return False
