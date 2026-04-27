import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from prometheus_fastapi_instrumentator import Instrumentator

from backend.config.settings import get_settings
from backend.db.session import engine
from backend.db.base import Base
# Import all models so SQLAlchemy registers them
from backend.db.models import (  # noqa
    DemoAccount,
    DemoPosition,
    DemoTrade,
    LearningAccount,
    LearningPosition,
    LearningTrade,
    PortfolioPosition,
    Trade,
    User,
)

from backend.routes.auth import router as auth_router
from backend.routes.ai_assistant import router as ai_assistant_router
from backend.routes.demo import router as demo_router
from backend.routes.portfolio import router as portfolio_router
from backend.routes.health import router as health_router
from backend.routes.agents import router as agents_router
from backend.routes.learning import router as learning_router
from backend.routes.market import router as market_router
from backend.routes.profile import router as profile_router
from backend.routes.ws_signals import router as ws_signals_router
from backend.routes.signals import router as signals_router
from backend.routes.research import router as research_router
from backend.routes.ws_stream import router as ws_stream_router
from backend.routes.ws_binance import router as ws_binance_router
from backend.services.market_engine import start_market_engine
from backend.services.binance_websocket import binance_engine
from backend.auth.jwt_handler import hash_password
from backend.db.session import SessionLocal

settings = get_settings()
logger = logging.getLogger("agentic.api")


def _ensure_user_columns() -> None:
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("users")}
    required = {
        "full_name": "ALTER TABLE users ADD COLUMN full_name VARCHAR",
        "username": "ALTER TABLE users ADD COLUMN username VARCHAR",
        "display_name": "ALTER TABLE users ADD COLUMN display_name VARCHAR",
        "created_at": "ALTER TABLE users ADD COLUMN created_at TIMESTAMP",
        "is_active": "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1",
        "is_demo_user": "ALTER TABLE users ADD COLUMN is_demo_user BOOLEAN DEFAULT 1",
        "demo_balance": f"ALTER TABLE users ADD COLUMN demo_balance FLOAT DEFAULT {settings.DEMO_BALANCE}",
        "preferences_json": "ALTER TABLE users ADD COLUMN preferences_json TEXT DEFAULT '{}'",
        "email_verified": "ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0",
        "verification_token": "ALTER TABLE users ADD COLUMN verification_token VARCHAR",
        "verification_sent_at": "ALTER TABLE users ADD COLUMN verification_sent_at TIMESTAMP",
    }
    with engine.begin() as connection:
        for column_name, statement in required.items():
            if column_name not in existing:
                connection.execute(text(statement))



@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    Base.metadata.create_all(bind=engine)
    _ensure_user_columns()
    # Note: Auto-provisioning of Demo account disabled for security.
    
    # Start the Anti-Gravity Market Engine
    await start_market_engine()
    
    # Start Binance WebSocket Engine
    try:
        await binance_engine.startup()
    except Exception as e:
        logger.error(f"Failed to start Binance WebSocket Engine during boot: {e}", exc_info=True)
    
    yield
    
    try:
        await binance_engine.shutdown()
    except Exception as e:
        logger.error(f"Error shutting down Binance WebSocket Engine: {e}", exc_info=True)
        
    try:
        from backend.services.market_engine import stop_market_engine
        await stop_market_engine()
    except Exception as e:
        logger.error(f"Error shutting down Market Engine: {e}", exc_info=True)


app = FastAPI(
    title="AgenticTrading API",
    version="2.0.0",
    description="Production-grade AI trading learning platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instrument FastAPI for Prometheus telemetry
Instrumentator().instrument(app).expose(app)

# Routes
app.include_router(auth_router)
app.include_router(ai_assistant_router)
app.include_router(demo_router)
app.include_router(learning_router, prefix="/learning", tags=["Learning"])
app.include_router(profile_router, prefix="/profile", tags=["Profile"])
app.include_router(signals_router, prefix="/signals", tags=["Signals"])
app.include_router(portfolio_router, prefix="/portfolio", tags=["Portfolio"])
app.include_router(agents_router, prefix="/agents", tags=["Agents"])
app.include_router(market_router, prefix="/market", tags=["Market"])
app.include_router(health_router, tags=["Health"])
app.include_router(ws_signals_router, prefix="/ws", tags=["WebSocket"])
# Backward-compatible alias for clients still connecting to /signals/{symbol}
app.include_router(ws_signals_router, tags=["WebSocket Legacy"])
app.include_router(ws_stream_router, prefix="/ws", tags=["WebSocket Stream"])
app.include_router(ws_binance_router, prefix="/ws", tags=["Binance WebSocket"])
app.include_router(research_router)


@app.get("/")
def root():
    return {
        "message": "AgenticTrading API v2.0",
        "docs": "/docs",
        "health": "/health",
    }
