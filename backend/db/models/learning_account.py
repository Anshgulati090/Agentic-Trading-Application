from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer

from backend.db.base import Base


class LearningAccount(Base):
    __tablename__ = "learning_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    demo_balance = Column(Float, nullable=False, default=100000.0)
    realized_pnl = Column(Float, nullable=False, default=0.0)
    completed_trades = Column(Integer, nullable=False, default=0)
    wins = Column(Integer, nullable=False, default=0)
    losses = Column(Integer, nullable=False, default=0)
    refill_count = Column(Integer, nullable=False, default=0)
    last_free_refill_at = Column(DateTime, nullable=True)
