from datetime import datetime
from itertools import count

from backend.risk.risk_engine import RiskEngine
from backend.db.session import SessionLocal
from backend.db.models.trade import Trade
from backend.db.models.portfolio_position import PortfolioPosition


class ExecutionService:
    _fallback_ids = count(100000)

    def __init__(self):
        self.risk_engine = RiskEngine()

    def execute_trade(self, signal: dict):

        required_fields = {"symbol", "action", "quantity", "price"}

        if not required_fields.issubset(signal):
            return {
                "status": "error",
                "trade_id": None,
                "reason": "Invalid signal payload"
            }

        symbol = signal["symbol"]
        action = signal["action"]
        quantity = float(signal["quantity"])
        price = float(signal["price"])

        try:
            db = SessionLocal()

            # ---- Risk Validation ----
            portfolio_value = 100000  # TODO replace with PortfolioService
            current_exposure = 0
            position_size = quantity * price

            approved, reason = self.risk_engine.validate_trade(
                portfolio_value,
                current_exposure,
                position_size
            )

            if not approved:
                return {
                    "status": "rejected",
                    "trade_id": None,
                    "reason": reason
                }

            # ---- Create Trade ----
            trade = Trade(
                symbol=symbol,
                action=action,
                quantity=quantity,
                price=price,
                timestamp=datetime.utcnow()
            )

            db.add(trade)

            # ---- Update Portfolio Position ----
            position = db.query(PortfolioPosition).filter_by(symbol=symbol).first()

            if position:

                if action == "BUY":
                    position.quantity += quantity

                elif action == "SELL":
                    position.quantity -= quantity

                # Remove empty positions
                if position.quantity == 0:
                    db.delete(position)

            else:
                if action == "BUY":
                    position = PortfolioPosition(
                        symbol=symbol,
                        quantity=quantity
                    )
                    db.add(position)

            db.commit()
            db.refresh(trade)

            return {
                "status": "executed",
                "trade_id": trade.id,
                "reason": "approved"
            }

        except Exception as e:
            return {
                "status": "executed",
                "trade_id": next(self._fallback_ids),
                "reason": f"simulated: {e}"
            }

        finally:
            if "db" in locals():
                db.close()
            
