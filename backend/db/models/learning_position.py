from sqlalchemy import Column, Float, ForeignKey, Integer, String

from backend.db.base import Base


class LearningPosition(Base):
    __tablename__ = "learning_positions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    symbol = Column(String, nullable=False, index=True)
    quantity = Column(Float, nullable=False, default=0.0)
    avg_cost = Column(Float, nullable=False, default=0.0)
