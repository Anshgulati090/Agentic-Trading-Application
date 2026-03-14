from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.config.settings import get_settings
from backend.db.session import engine
from backend.db.base import Base
# Import all models so SQLAlchemy registers them
from backend.db.models import User, DemoAccount, DemoPosition, DemoTrade, Trade, PortfolioPosition  # noqa

from backend.routes.auth import router as auth_router
from backend.routes.demo import router as demo_router
from backend.routes.portfolio import router as portfolio_router
from backend.routes.health import router as health_router
from backend.routes.agents import router as agents_router
from backend.routes.market import router as market_router
from backend.routes.ws_signals import router as ws_signals_router
from backend.routes.signals import router as signals_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="AgenticTrading API",
    version="2.0.0",
    description="Production-grade AI trading learning platform",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_router)
app.include_router(demo_router)
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
