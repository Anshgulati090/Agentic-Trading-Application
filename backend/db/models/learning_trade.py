from datetime import datetime

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String

from backend.db.base import Base


class LearningTrade(Base):
    __tablename__ = "learning_trades"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    market_mode = Column(String, nullable=False, default="live_practice")
    agent_id = Column(String, nullable=True)
    agent_summary = Column(String, nullable=True)
    realized_pnl = Column(Float, nullable=False, default=0.0)
    outcome = Column(String, nullable=False, default="OPEN")
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
