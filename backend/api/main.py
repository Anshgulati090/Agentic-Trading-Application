import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

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


def _seed_demo_user() -> None:
    db = SessionLocal()
    try:
        demo = db.query(User).filter(User.email == "demo@agentictrading.com").first()
        if demo:
            if not demo.email_verified:
                demo.email_verified = True
                db.commit()
            return

        demo = User(
            email="demo@agentictrading.com",
            password_hash=hash_password("demo123"),
            full_name="Demo Trader",
            display_name="Demo Trader",
            username="demo",
            is_demo_user=True,
            demo_balance=settings.DEMO_BALANCE,
            email_verified=True,
        )
        db.add(demo)
        db.flush()
        db.add(
            DemoAccount(
                user_id=demo.id,
                balance=settings.DEMO_BALANCE,
                initial_balance=settings.DEMO_BALANCE,
            )
        )
        db.commit()
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    Base.metadata.create_all(bind=engine)
    _ensure_user_columns()
    _seed_demo_user()
    yield


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


@app.get("/")
def root():
    return {
        "message": "AgenticTrading API v2.0",
        "docs": "/docs",
        "health": "/health",
    }
