from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Literal, List, Optional
from datetime import datetime

from backend.db.session import get_db
from backend.db.models.user import User, DemoAccount, DemoPosition, DemoTrade
from backend.auth.jwt_handler import get_current_user

router = APIRouter(prefix="/demo", tags=["Demo Trading"])


# ── Schemas ────────────────────────────────────────────────────────────────

class TradeRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=10)
    action: Literal["BUY", "SELL"]
    quantity: float = Field(..., gt=0)
    price: float = Field(..., gt=0) # Kept for backward compatibility, but overridden by server
    notes: Optional[str] = None


class PositionOut(BaseModel):
    symbol: str
    quantity: float
    avg_cost: float
    market_value: float
    unrealized_pnl: float
    unrealized_pnl_pct: float


class AccountOut(BaseModel):
    balance: float
    initial_balance: float
    total_invested: float
    total_value: float
    total_pnl: float
    total_pnl_pct: float
    positions: List[PositionOut]


# ── Helpers ────────────────────────────────────────────────────────────────

def _get_account(db: Session, user: User) -> DemoAccount:
    acct = db.query(DemoAccount).filter(DemoAccount.user_id == user.id).first()
    if not acct:
        raise HTTPException(status_code=404, detail="Demo account not found")
    return acct


def _position_out(pos: DemoPosition, current_price: float) -> PositionOut:
    market_value = pos.quantity * current_price
    cost_basis = pos.quantity * pos.avg_cost
    upnl = market_value - cost_basis
    upnl_pct = (upnl / cost_basis) if cost_basis else 0.0
    return PositionOut(
        symbol=pos.symbol,
        quantity=pos.quantity,
        avg_cost=pos.avg_cost,
        market_value=market_value,
        unrealized_pnl=upnl,
        unrealized_pnl_pct=upnl_pct,
    )


# ── Routes ─────────────────────────────────────────────────────────────────

@router.get("/account", response_model=AccountOut)
def get_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    acct = _get_account(db, current_user)
    positions = db.query(DemoPosition).filter(
        DemoPosition.account_id == acct.id,
        DemoPosition.quantity > 0,
    ).all()

    total_invested = sum(p.quantity * p.avg_cost for p in positions)
    # Use avg_cost as a proxy for current price when no live feed
    total_value = acct.balance + total_invested

    return AccountOut(
        balance=acct.balance,
        initial_balance=acct.initial_balance,
        total_invested=total_invested,
        total_value=total_value,
        total_pnl=total_value - acct.initial_balance,
        total_pnl_pct=(total_value - acct.initial_balance) / acct.initial_balance,
        positions=[_position_out(p, p.avg_cost) for p in positions],
    )


@router.post("/trade")
def execute_demo_trade(
    payload: TradeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from backend.routes.market import get_price
    
    acct = _get_account(db, current_user)
    symbol = payload.symbol.upper()
    
    try:
        price_res = get_price(symbol)
        true_price = float(price_res["data"]["price"])
    except Exception:
        raise HTTPException(status_code=400, detail=f"Market closed or could not verify price for {symbol}")
        
    total_cost = payload.quantity * true_price

    if payload.action == "BUY":
        if acct.balance < total_cost:
            raise HTTPException(status_code=400, detail=f"Insufficient balance. Need ${total_cost:.2f}, have ${acct.balance:.2f}")

        # Update/create position
        pos = db.query(DemoPosition).filter(
            DemoPosition.account_id == acct.id,
            DemoPosition.symbol == symbol,
        ).first()

        if pos:
            total_qty = pos.quantity + payload.quantity
            pos.avg_cost = (pos.quantity * pos.avg_cost + total_cost) / total_qty
            pos.quantity = total_qty
        else:
            pos = DemoPosition(
                account_id=acct.id,
                symbol=symbol,
                quantity=payload.quantity,
                avg_cost=true_price,
            )
            db.add(pos)

        acct.balance -= total_cost
        realized_pnl = None

    elif payload.action == "SELL":
        pos = db.query(DemoPosition).filter(
            DemoPosition.account_id == acct.id,
            DemoPosition.symbol == symbol,
        ).first()
        if not pos or pos.quantity < payload.quantity:
            have = pos.quantity if pos else 0
            raise HTTPException(status_code=400, detail=f"Insufficient shares. Have {have:.4f}, need {payload.quantity:.4f}")

        realized_pnl = (true_price - pos.avg_cost) * payload.quantity
        pos.quantity -= payload.quantity
        if pos.quantity <= 0.0001:
            db.delete(pos)

        acct.balance += total_cost

    # Record trade
    trade = DemoTrade(
        user_id=current_user.id,
        account_id=acct.id,
        symbol=symbol,
        action=payload.action,
        quantity=payload.quantity,
        price=true_price,
        total_value=total_cost,
        pnl=realized_pnl,
        notes=payload.notes,
    )
    db.add(trade)
    db.commit()

    return {
        "status": "executed",
        "trade_id": trade.id,
        "symbol": symbol,
        "action": payload.action,
        "quantity": payload.quantity,
        "price": true_price,
        "total_value": total_cost,
        "new_balance": acct.balance,
        "pnl": realized_pnl,
    }


@router.get("/trades")
def get_trade_history(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trades = (
        db.query(DemoTrade)
        .filter(DemoTrade.user_id == current_user.id)
        .order_by(DemoTrade.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": t.id,
            "symbol": t.symbol,
            "action": t.action,
            "quantity": t.quantity,
            "price": t.price,
            "total_value": t.total_value,
            "pnl": t.pnl,
            "timestamp": t.timestamp.isoformat(),
            "notes": t.notes,
        }
        for t in trades
    ]


@router.delete("/reset")
def reset_demo_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reset demo account to initial balance."""
    acct = _get_account(db, current_user)
    db.query(DemoPosition).filter(DemoPosition.account_id == acct.id).delete()
    db.query(DemoTrade).filter(DemoTrade.user_id == current_user.id).delete()
    acct.balance = acct.initial_balance
    db.commit()
    return {"message": "Demo account reset", "balance": acct.balance}
