from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="allow",
    )

    # Database
    DATABASE_URL: str = "sqlite:///./agentic.db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False
    CORS_ALLOW_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173"

    # Auth
    AUTH_TOKEN_SECRET: str = "change-me"
    AUTH_TOKEN_TTL_HOURS: int = 12

    # Market data
    HOT_SYMBOLS: str = "AAPL,NVDA,MSFT,TSLA,AMZN,META,SPY,QQQ,BTC,ETH"
    HOT_TIMEFRAMES: str = "15M,1H,1D,1W,1M"
    MARKET_WARM_INTERVAL_SECONDS: int = 20
    MARKET_PROVIDER_ORDER: str = "polygon,finnhub,twelvedata,alpaca,yfinance"
    MARKET_PROVIDER_TIMEOUT_SECONDS: float = 3.0
    MARKET_PROVIDER_RETRY_COUNT: int = 1
    MARKET_PROVIDER_FAILURE_THRESHOLD: int = 3
    MARKET_PROVIDER_RESET_SECONDS: int = 45
    SLOW_REQUEST_THRESHOLD_MS: int = 500

    POLYGON_API_KEY: str = ""
    FINNHUB_API_KEY: str = ""
    TWELVE_DATA_API_KEY: str = ""
    ALPACA_API_KEY: str = ""
    ALPACA_API_SECRET: str = ""
    ALPACA_DATA_FEED: str = "iex"

    SUPABASE_DB_URL: str = ""
    UPSTASH_REDIS_URL: str = ""
    RAILWAY_PUBLIC_DOMAIN: str = ""
    RENDER_EXTERNAL_URL: str = ""

    # Email verification
    APP_BASE_URL: str = "http://localhost:3000"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_USE_TLS: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
