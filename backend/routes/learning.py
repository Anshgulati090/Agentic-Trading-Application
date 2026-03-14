from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session

from backend.api.dependencies import get_current_user, get_db, get_market_data_provider
from backend.db.models.user import User
from backend.market.data_provider import MarketDataProvider
from backend.services.learning_service import LearningService


router = APIRouter(tags=["Learning"])


class LearningTradeRequest(BaseModel):
    symbol: str = Field(..., example="AAPL")
    action: str = Field(..., pattern="^(BUY|SELL)$")
    quantity: float = Field(..., gt=0)
    agent_id: str | None = None
    market_mode: str = "live_practice"
    understood: bool = False

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, value: str) -> str:
        return value.upper()


@router.get("/account")
def get_learning_account(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    provider: MarketDataProvider = Depends(get_market_data_provider),
):
    service = LearningService(db, provider)
    return {
        "status": "success",
        "data": service.get_account_snapshot(user),
    }


@router.get("/agents")
def get_learning_agents():
    return {
        "status": "success",
        "data": LearningService.get_agent_briefings(),
    }


@router.get("/agents/{agent_id}")
def get_learning_agent(agent_id: str):
    detail = LearningService.get_agent_detail(agent_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Agent not found")
    return {"status": "success", "data": detail}


@router.post("/trade")
def execute_learning_trade(
    payload: LearningTradeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    provider: MarketDataProvider = Depends(get_market_data_provider),
):
    if not payload.understood:
        raise HTTPException(status_code=400, detail="Please review the agent crux before trading")

    service = LearningService(db, provider)
    try:
        result = service.execute_learning_trade(user, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {
        "status": "success",
        "data": result,
    }
