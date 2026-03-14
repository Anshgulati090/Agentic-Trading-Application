from datetime import datetime, timedelta
import json

from sqlalchemy.orm import Session

from backend.db.models.learning_account import LearningAccount
from backend.db.models.learning_position import LearningPosition
from backend.db.models.learning_trade import LearningTrade
from backend.db.models.user import User
from backend.market.data_provider import MarketDataProvider


AGENT_BRIEFINGS = [
    {
        "id": "momentum",
        "label": "Momentum Agent",
        "strategy": "momentum",
        "crux": "Follows strength. It enters when price trends are already moving and teaches you trend confirmation, pullback patience, and stop discipline.",
        "learning_goal": "Learn how breakouts, continuation, and trend conviction work.",
        "when_it_trades": "When price is sustaining trend strength, breaking out, or defending higher lows.",
        "example_trade": "A breakout above range resistance with volume expansion and tight risk below the pullback low.",
    },
    {
        "id": "mean_reversion",
        "label": "Mean Reversion Agent",
        "strategy": "mean_reversion",
        "crux": "Buys weakness and sells overstretched price action. It teaches you when short-term panic or euphoria often snaps back toward normal.",
        "learning_goal": "Learn reversals, overextension, and timing around reversion trades.",
        "when_it_trades": "When price is stretched away from its recent baseline and the move looks unsustainably emotional.",
        "example_trade": "A sharp intraday flush into support followed by a stabilization candle and improving breadth.",
    },
    {
        "id": "risk_manager",
        "label": "Risk Manager",
        "strategy": "risk",
        "crux": "Protects capital before chasing return. It teaches you position sizing, drawdown control, and how good trades still fail without risk limits.",
        "learning_goal": "Learn sizing, exposure caps, and survival-first trading behavior.",
        "when_it_trades": "Before every trade and during volatile portfolio conditions when risk needs to be reduced.",
        "example_trade": "Cutting a position size in half because the portfolio is already concentrated in correlated names.",
    },
    {
        "id": "executor",
        "label": "Execution Agent",
        "strategy": "execution",
        "crux": "Focuses on how orders are placed, not just what to buy. It teaches you slippage, urgency, and why entry quality changes results.",
        "learning_goal": "Learn order timing, execution quality, and trade efficiency.",
        "when_it_trades": "When entries or exits need to be timed around spread, momentum bursts, or thin liquidity.",
        "example_trade": "Scaling into strength instead of chasing a full position into a fast-moving candle.",
    },
    {
        "id": "llm_strategist",
        "label": "LLM Strategy Agent",
        "strategy": "llm",
        "crux": "Synthesizes qualitative context like sentiment and narrative shifts. It teaches you how macro stories and news can shape conviction and bias.",
        "learning_goal": "Learn narrative-driven trading and qualitative signal framing.",
        "when_it_trades": "When headlines, earnings narratives, or macro shifts are driving participation more than pure technicals.",
        "example_trade": "Staying cautious after a positive chart setup because sentiment has turned sharply risk-off after a macro event.",
    },
    {
        "id": "factor_model",
        "label": "Factor Model Agent",
        "strategy": "factor",
        "crux": "Combines multiple structured signals like momentum, quality, and value. It teaches you why diversified signal baskets are often stronger than single ideas.",
        "learning_goal": "Learn factor stacking and systematic portfolio construction.",
        "when_it_trades": "When comparing many candidate symbols and looking for a higher-quality systematic entry set.",
        "example_trade": "Preferring a stock with strong momentum, earnings quality, and relative strength over a weaker one with only one strong signal.",
    },
]

FREE_REFILL_AMOUNT = 25000.0
FREE_REFILL_COOLDOWN = timedelta(hours=12)
PAID_REFILL_AMOUNT = 10000.0


class LearningService:
    def __init__(self, db: Session, provider: MarketDataProvider) -> None:
        self._db = db
        self._provider = provider

    def get_or_create_account(self, user: User) -> LearningAccount:
        account = self._db.query(LearningAccount).filter(LearningAccount.user_id == user.id).first()
        if account:
            return account

        account = LearningAccount(user_id=user.id, demo_balance=user.demo_balance)
        self._db.add(account)
        self._db.commit()
        self._db.refresh(account)
        return account

    def get_account_snapshot(self, user: User) -> dict:
        account = self.get_or_create_account(user)
        positions = self._db.query(LearningPosition).filter(LearningPosition.user_id == user.id).all()
        trades = (
            self._db.query(LearningTrade)
            .filter(LearningTrade.user_id == user.id)
            .order_by(LearningTrade.timestamp.desc())
            .limit(10)
            .all()
        )

        mark_to_market = 0.0
        serialized_positions = []
        for position in positions:
            quote = self._provider.get_latest_price(position.symbol)
            market_price = float(quote.get("price", position.avg_cost or 0.0))
            market_value = market_price * position.quantity
            unrealized = (market_price - position.avg_cost) * position.quantity
            mark_to_market += market_value
            serialized_positions.append(
                {
                    "symbol": position.symbol,
                    "quantity": position.quantity,
                    "avg_cost": position.avg_cost,
                    "market_price": market_price,
                    "market_value": round(market_value, 2),
                    "unrealized_pnl": round(unrealized, 2),
                }
            )

        strategies_used = sorted({trade.agent_id for trade in trades if trade.agent_id})
        total_trades = account.completed_trades + len([trade for trade in trades if trade.action == "BUY"])
        preferences = self._safe_preferences(user.preferences_json)
        cooldown_remaining = self._cooldown_remaining(account)

        return {
            "demo_balance": round(account.demo_balance, 2),
            "portfolio_equity": round(account.demo_balance + mark_to_market, 2),
            "realized_pnl": round(account.realized_pnl, 2),
            "completed_trades": account.completed_trades,
            "wins": account.wins,
            "losses": account.losses,
            "refill_count": account.refill_count,
            "free_refill_available": cooldown_remaining == 0,
            "free_refill_cooldown_seconds": cooldown_remaining,
            "positions": serialized_positions,
            "recent_trades": [
                {
                    "id": trade.id,
                    "symbol": trade.symbol,
                    "action": trade.action,
                    "quantity": trade.quantity,
                    "price": trade.price,
                    "agent_id": trade.agent_id,
                    "agent_summary": trade.agent_summary,
                    "realized_pnl": trade.realized_pnl,
                    "outcome": trade.outcome,
                    "market_mode": trade.market_mode,
                    "timestamp": trade.timestamp.isoformat(),
                }
                for trade in trades
            ],
            "profile_stats": {
                "total_simulated_profit": round(account.realized_pnl, 2),
                "trades_completed": total_trades,
                "strategies_used": strategies_used,
                "learning_progress": min(100, 10 + len(strategies_used) * 15 + account.completed_trades * 5),
                "preferences": preferences,
            },
        }

    @staticmethod
    def get_agent_briefings() -> list[dict]:
        return AGENT_BRIEFINGS

    @staticmethod
    def get_agent_detail(agent_id: str) -> dict | None:
        return next((agent for agent in AGENT_BRIEFINGS if agent["id"] == agent_id), None)

    def execute_learning_trade(self, user: User, payload: dict) -> dict:
        account = self.get_or_create_account(user)
        symbol = str(payload["symbol"]).upper()
        action = str(payload["action"]).upper()
        quantity = float(payload["quantity"])
        agent_id = payload.get("agent_id")
        market_mode = payload.get("market_mode", "live_practice")
        briefing = next((agent for agent in AGENT_BRIEFINGS if agent["id"] == agent_id), None)

        quote = self._provider.get_latest_price(symbol)
        price = float(quote.get("price", payload.get("price", 0.0)))
        if price <= 0:
            raise ValueError("No live price available for this symbol")

        position = (
            self._db.query(LearningPosition)
            .filter(LearningPosition.user_id == user.id, LearningPosition.symbol == symbol)
            .first()
        )

        realized_pnl = 0.0
        outcome = "OPEN"

        if action == "BUY":
            total_cost = price * quantity
            if account.demo_balance < total_cost:
                raise ValueError("Not enough demo credits for this trade")

            account.demo_balance -= total_cost
            user.demo_balance = account.demo_balance
            if position:
                combined_qty = position.quantity + quantity
                position.avg_cost = ((position.avg_cost * position.quantity) + total_cost) / combined_qty
                position.quantity = combined_qty
            else:
                position = LearningPosition(
                    user_id=user.id,
                    symbol=symbol,
                    quantity=quantity,
                    avg_cost=price,
                )
                self._db.add(position)
        elif action == "SELL":
            if not position or position.quantity < quantity:
                raise ValueError("You do not have enough demo position to sell")

            proceeds = price * quantity
            account.demo_balance += proceeds
            user.demo_balance = account.demo_balance
            realized_pnl = (price - position.avg_cost) * quantity
            account.realized_pnl += realized_pnl
            account.completed_trades += 1
            if realized_pnl >= 0:
                account.wins += 1
                outcome = "WIN"
            else:
                account.losses += 1
                outcome = "LOSS"

            position.quantity -= quantity
            if position.quantity <= 0:
                self._db.delete(position)
            else:
                outcome = "PARTIAL"
        else:
            raise ValueError("Unsupported learning trade action")

        trade = LearningTrade(
            user_id=user.id,
            symbol=symbol,
            action=action,
            quantity=quantity,
            price=price,
            market_mode=market_mode,
            agent_id=agent_id,
            agent_summary=briefing["crux"] if briefing else None,
            realized_pnl=realized_pnl,
            outcome=outcome,
            timestamp=datetime.utcnow(),
        )
        self._db.add(trade)
        self._db.commit()
        self._db.refresh(trade)

        return {
            "trade_id": trade.id,
            "price": round(price, 2),
            "realized_pnl": round(realized_pnl, 2),
            "outcome": outcome,
            "account": self.get_account_snapshot(user),
        }

    def refill_demo_balance(self, user: User, mode: str = "free") -> dict:
        account = self.get_or_create_account(user)
        mode = mode.lower()

        if mode == "free":
            cooldown_remaining = self._cooldown_remaining(account)
            if cooldown_remaining > 0:
                raise ValueError(f"Free refill available in {cooldown_remaining} seconds")
            amount = FREE_REFILL_AMOUNT
            account.last_free_refill_at = datetime.utcnow()
        elif mode == "paid":
            amount = PAID_REFILL_AMOUNT
        else:
            raise ValueError("Unsupported refill mode")

        account.demo_balance += amount
        user.demo_balance = account.demo_balance
        account.refill_count += 1
        self._db.commit()

        return {
            "mode": mode,
            "amount": round(amount, 2),
            "account": self.get_account_snapshot(user),
        }

    def _cooldown_remaining(self, account: LearningAccount) -> int:
        if not account.last_free_refill_at:
            return 0
        ready_at = account.last_free_refill_at + FREE_REFILL_COOLDOWN
        remaining = ready_at - datetime.utcnow()
        return max(0, int(remaining.total_seconds()))

    @staticmethod
    def _safe_preferences(raw: str) -> dict:
        try:
            return json.loads(raw or "{}")
        except Exception:
            return {}
