from fastapi import Depends
from sqlalchemy.orm import Session
from functools import lru_cache

from backend.auth.jwt_handler import get_current_user
from backend.cache.cache_service import CacheService
from backend.config.settings import Settings, get_settings
from backend.db.session import get_db
from backend.market.data_provider import MarketDataProvider
from backend.risk.risk_engine import RiskEngine
from backend.services.live_signal_service import LiveSignalService


@lru_cache
def _cached_cache_service(redis_url: str) -> CacheService:
    return CacheService(redis_url=redis_url)


def get_cache_service() -> CacheService:
    settings = get_settings()
    redis_url = settings.UPSTASH_REDIS_URL or settings.REDIS_URL
    return _cached_cache_service(redis_url)


def get_market_data_provider(
    cache: CacheService = Depends(get_cache_service),
) -> MarketDataProvider:
    return MarketDataProvider(cache=cache)


def get_risk_engine() -> RiskEngine:
    return RiskEngine()


def get_live_signal_service(
    provider: MarketDataProvider = Depends(get_market_data_provider),
    risk_engine: RiskEngine = Depends(get_risk_engine),
    cache: CacheService = Depends(get_cache_service),
) -> LiveSignalService:
    return LiveSignalService(provider, risk_engine, cache=cache)


def get_app_settings() -> Settings:
    return get_settings()
