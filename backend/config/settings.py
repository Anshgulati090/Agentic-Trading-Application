from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow",
    )

    # Database
    DATABASE_URL: str = "sqlite:///./agentic.db"
    SUPABASE_DB_URL: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    UPSTASH_REDIS_URL: str = ""

    # Auth
    SECRET_KEY: str = Field(
        default="insecure-dev-secret-change-in-production-32chars!!",
        validation_alias="AUTH_TOKEN_SECRET",
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    AUTH_TOKEN_TTL_HOURS: int = 24

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173",
        validation_alias="CORS_ALLOW_ORIGINS",
    )
    APP_BASE_URL: str = "http://localhost:3000"
    LOG_LEVEL: str = "INFO"

    # Demo
    DEMO_BALANCE: float = 100_000.0

    # Market provider
    MARKET_PROVIDER_ORDER: str = "polygon,finnhub,twelvedata,alpaca,yfinance"
    MARKET_PROVIDER_TIMEOUT_SECONDS: float = 3.0
    MARKET_PROVIDER_RETRY_COUNT: int = 1
    MARKET_PROVIDER_FAILURE_THRESHOLD: int = 3
    MARKET_PROVIDER_RESET_SECONDS: int = 45
    SLOW_REQUEST_THRESHOLD_MS: int = 500
    HOT_SYMBOLS: str = "AAPL,NVDA,MSFT,TSLA,AMZN,META,SPY,QQQ,BTC,ETH"
    HOT_TIMEFRAMES: str = "1D,1W,1M"
    MARKET_WARM_INTERVAL_SECONDS: int = 30

    # Provider keys
    POLYGON_API_KEY: str = ""
    FINNHUB_API_KEY: str = ""
    TWELVE_DATA_API_KEY: str = ""
    ALPACA_API_KEY: str = ""
    ALPACA_API_SECRET: str = ""
    ALPACA_DATA_FEED: str = "iex"

    # Email verification
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_USE_TLS: bool = True

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    def model_post_init(self, __context) -> None:
        if self.AUTH_TOKEN_TTL_HOURS and self.ACCESS_TOKEN_EXPIRE_MINUTES == 1440:
            self.ACCESS_TOKEN_EXPIRE_MINUTES = self.AUTH_TOKEN_TTL_HOURS * 60


@lru_cache
def get_settings() -> Settings:
    return Settings()
