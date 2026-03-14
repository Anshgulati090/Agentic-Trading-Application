from contextlib import asynccontextmanager
import time

from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect

from backend.db.base import Base
from backend.db.models.portfolio_position import PortfolioPosition
from backend.db.models.trade import Trade
from backend.db.models.user import User
from backend.db.models.learning_account import LearningAccount
from backend.db.models.learning_position import LearningPosition
from backend.db.models.learning_trade import LearningTrade
from backend.db.session import SessionLocal, engine
from backend.routes.auth import router as auth_router
from backend.routes.agents import router as agents_router
from backend.routes.health import router as health_router
from backend.routes.learning import router as learning_router
from backend.routes.market import router as market_router
from backend.routes.portfolio import router as portfolio_router
from backend.routes.profile import router as profile_router
from backend.routes.signals import router as signals_router
from backend.routes.ws_signals import router as ws_signals_router
from backend.security.auth import hash_password
from backend.config.settings import get_settings
from backend.cache.cache_service import CacheService
from backend.services.market_warm_service import MarketWarmService
from backend.logging_config import configure_logging
import logging


def ensure_sqlite_schema() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        Base.metadata.create_all(bind=engine)
        return

    user_columns = {column["name"] for column in inspector.get_columns("users")}
    required_user_columns = {
        "email",
        "username",
        "display_name",
        "created_at",
        "is_demo_user",
        "is_active",
        "demo_balance",
        "preferences_json",
    }
    learning_account_columns = set()
    if "learning_accounts" in inspector.get_table_names():
        learning_account_columns = {column["name"] for column in inspector.get_columns("learning_accounts")}
    required_learning_columns = {"demo_balance", "realized_pnl", "completed_trades", "wins", "losses", "refill_count", "last_free_refill_at"}
    if required_user_columns.issubset(user_columns) and required_learning_columns.issubset(learning_account_columns or required_learning_columns):
        Base.metadata.create_all(bind=engine)
        return

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def ensure_seed_users() -> None:
    db = SessionLocal()
    try:
        seed_users = [
            ("trader01@agentic.dev", "Trader One", "Trader@123"),
            ("analyst01@agentic.dev", "Analyst One", "Analyst@123"),
        ]
        for email, display_name, password in seed_users:
            exists = db.query(User).filter(User.email == email).first()
            if exists:
                continue
            password_hash = hash_password(password)
            username = email.split("@")[0]
            db.add(
                User(
                    email=email,
                    username=username,
                    display_name=display_name,
                    password_hash=password_hash,
                    is_demo_user=True,
                    is_active=True,
                    demo_balance=100000.0,
                    preferences_json="{}",
                )
            )
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    ensure_sqlite_schema()
    ensure_seed_users()
    warm_service = None
    cache = CacheService(redis_url=settings.REDIS_URL)
    if cache.is_available:
        warm_service = MarketWarmService(
            cache=cache,
            symbols=[item.strip() for item in settings.HOT_SYMBOLS.split(",") if item.strip()],
            timeframes=[item.strip() for item in settings.HOT_TIMEFRAMES.split(",") if item.strip()],
            interval_seconds=settings.MARKET_WARM_INTERVAL_SECONDS,
        )
        await warm_service.start()
    yield
    if warm_service:
        await warm_service.stop()


app = FastAPI(
    title="Agentic Trading API",
    version="1.0.0",
    description="Production-grade API for Agentic Trading System",
    lifespan=lifespan,
)

settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ALLOW_ORIGINS.split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def monitor_requests(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    duration_ms = int((time.perf_counter() - started) * 1000)
    if duration_ms > settings.SLOW_REQUEST_THRESHOLD_MS:
        logger.warning(
            "slow_http_request",
            extra={"extra_data": {"path": request.url.path, "method": request.method, "duration_ms": duration_ms, "status_code": response.status_code}},
        )
    return response

app.include_router(signals_router, prefix="/signals", tags=["Signals"])
app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(learning_router, prefix="/learning", tags=["Learning"])
app.include_router(portfolio_router, prefix="/portfolio", tags=["Portfolio"])
app.include_router(profile_router, prefix="/profile", tags=["Profile"])
app.include_router(agents_router, prefix="/agents", tags=["Agents"])
app.include_router(market_router, prefix="/market", tags=["Market"])
app.include_router(health_router, tags=["Health"])
app.include_router(ws_signals_router, prefix="/ws", tags=["WebSocket"])


@app.get("/")
def root():
    return {
        "message": "Agentic Trading API is running",
        "docs": "/docs",
        "health": "/health",
    }
configure_logging()
logger = logging.getLogger("agentic.api")
