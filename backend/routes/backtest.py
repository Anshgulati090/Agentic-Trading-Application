import math
import random
from dataclasses import asdict, dataclass

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import MetaData, Table
from sqlalchemy.orm import Session

from backend.api.dependencies import get_db


router = APIRouter()


class BacktestRequest(BaseModel):
    symbol: str = Field(..., description="Asset symbol to backtest, e.g. 'AAPL'.")
    strategy_name: str = Field(
        ..., description="Name of the strategy configuration to backtest."
    )


@dataclass
class BacktestMetrics:
    backtest_id: int
    sharpe: float
    max_drawdown: float
    total_return: float


def _simulate_dummy_backtest(symbol: str, strategy_name: str) -> dict:
    """
    Deterministic, yet realistic-ish dummy backtest using synthetic daily returns.
    """
    seed = hash((symbol, strategy_name)) & 0xFFFFFFFF
    rng = random.Random(seed)

    num_days = 252  # ~1 trading year
    daily_returns = [
        rng.normalvariate(0.0005, 0.01)  # mean 5 bps, 1% daily vol
        for _ in range(num_days)
    ]

    equity_curve = []
    equity = 1.0
    peak = 1.0
    max_drawdown = 0.0

    for r in daily_returns:
        equity *= 1.0 + r
        equity_curve.append(equity)
        peak = max(peak, equity)
        drawdown = (equity - peak) / peak
        max_drawdown = min(max_drawdown, drawdown)

    total_return = equity - 1.0

    mean_ret = sum(daily_returns) / num_days
    variance = sum((r - mean_ret) ** 2 for r in daily_returns) / (num_days - 1)
    std_dev = math.sqrt(variance) if variance > 0 else 0.0

    if std_dev > 0:
        sharpe = (mean_ret / std_dev) * math.sqrt(252.0)
    else:
        sharpe = 0.0

    return {
        "sharpe": float(sharpe),
        "max_drawdown": float(max_drawdown),
        "total_return": float(total_return),
    }


def _store_backtest_result(db: Session, symbol: str, strategy_name: str, metrics: dict) -> int:
    """
    Persist backtest results into the backtest_results table using SQLAlchemy Core.
    """
    metadata = MetaData()
    backtest_results = Table(
        "backtest_results",
        metadata,
        autoload_with=db.get_bind(),
    )

    insert_stmt = backtest_results.insert().values(
        symbol=symbol,
        strategy_name=strategy_name,
        sharpe=metrics["sharpe"],
        max_drawdown=metrics["max_drawdown"],
        total_return=metrics["total_return"],
    )

    result = db.execute(insert_stmt)
    db.commit()

    inserted_pk = result.inserted_primary_key
    if not inserted_pk:
        raise RuntimeError("Failed to retrieve backtest result ID from database.")

    return int(inserted_pk[0])


@router.post("/backtest", status_code=501)
def run_backtest(payload: BacktestRequest, db: Session = Depends(get_db)):
    """
    Explicitly reject backtests until the real historical execution engine is built, 
    preventing fabricated strategy metrics from being consumed downstream.
    """
    raise HTTPException(
        status_code=501,
        detail="Historical backtesting engine is pending implementation. Synthetic backtests disabled."
    )

