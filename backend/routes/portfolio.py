from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, select

from backend.db.session import get_db
from backend.db.models.portfolio_position import PortfolioPosition
from backend.db.models.trade import Trade

router = APIRouter(tags=["Portfolio"])


@router.get("/metrics")
def get_portfolio_metrics(db: Session = Depends(get_db)):
    try:
        total_positions = db.execute(
            select(func.count(PortfolioPosition.id))
        ).scalar_one() or 0

        exposure = db.execute(
            select(func.coalesce(func.sum(func.abs(PortfolioPosition.quantity)), 0.0))
        ).scalar_one() or 0.0

        return {
            "status": "success",
            "data": {
                "total_positions": int(total_positions),
                "total_exposure": float(exposure),
                "portfolio_value": float(exposure),
                "cash": 100000.0 - float(exposure),
            },
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
