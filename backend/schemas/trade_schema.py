from pydantic import BaseModel, Field, field_validator
from typing import Literal


class TradeRequest(BaseModel):

    symbol: str = Field(..., example="AAPL")

    action: Literal["BUY", "SELL"]

    quantity: float = Field(..., gt=0)

    price: float = Field(..., gt=0)

    @field_validator("symbol")
    @classmethod
    def normalize_symbol(cls, v: str) -> str:
        return v.upper()


class ExecuteAgentRequest(BaseModel):

    agent_id: str | None = None

    strategy: str | None = None

    symbol: str = Field(default="AAPL", example="AAPL")

    action: Literal["BUY", "SELL"] = "BUY"

    quantity: float = Field(default=10, gt=0)

    price: float = Field(default=180, gt=0)

    @field_validator("symbol")
    @classmethod
    def normalize_execute_symbol(cls, v: str) -> str:
        return v.upper()


class TradeResponse(BaseModel):

    status: Literal["executed", "rejected", "error"]

    trade_id: int | None = None

    reason: str | None = None
