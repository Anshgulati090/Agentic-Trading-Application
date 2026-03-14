from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session
from functools import lru_cache

from backend.config.settings import get_settings, Settings
from backend.db.session import SessionLocal
from backend.cache.cache_service import CacheService
from backend.market.data_provider import MarketDataProvider
from backend.risk.risk_engine import RiskEngine
from backend.db.models.user import User
from backend.security.auth import decode_token
from backend.services.live_signal_service import LiveSignalService


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@lru_cache
def _cached_cache_service(redis_url: str) -> CacheService:
    return CacheService(redis_url=redis_url)


def get_cache_service() -> CacheService:
    settings = get_settings()
    return _cached_cache_service(settings.UPSTASH_REDIS_URL or settings.REDIS_URL)


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


def get_current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")

    payload = decode_token(authorization.replace("Bearer ", "", 1))
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.email == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User account is inactive")

    return user
