from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter(tags=["Agents"])

AGENT_DESCRIPTIONS = {
    "momentum": "Trend-following using 20/50-day MA crossovers",
    "mean_reversion": "Z-score based reversion from statistical mean",
    "risk": "Portfolio risk controls — position sizing, drawdown limits",
    "execution": "Smart order routing with slippage minimization",
    "llm": "LLM-assisted sentiment and signal generation",
    "factor": "Multi-factor alpha: value, quality, momentum, low-vol",
}


class ExecuteRequest(BaseModel):
    agent_id: str
    strategy: str
    symbol: Optional[str] = "AAPL"
    quantity: Optional[float] = 1.0


@router.post("/execute")
def execute_agent(payload: ExecuteRequest):
    desc = AGENT_DESCRIPTIONS.get(payload.strategy, "Unknown strategy")
    return {
        "status": "executed",
        "agent_id": payload.agent_id,
        "strategy": payload.strategy,
        "symbol": payload.symbol,
        "description": desc,
        "message": f"Agent '{payload.agent_id}' cycle complete",
    }


@router.get("/list")
def list_agents():
    return {
        "agents": [
            {"id": k, "description": v} for k, v in AGENT_DESCRIPTIONS.items()
        ]
    }
