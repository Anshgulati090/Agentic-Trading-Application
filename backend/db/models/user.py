from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    username = Column(String, unique=True, index=True, nullable=True)
    display_name = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_active = Column(Boolean, default=True)
    is_demo_user = Column(Boolean, default=True)
    demo_balance = Column(Float, default=100_000.0, nullable=False)
    preferences_json = Column(Text, nullable=True, default="{}")
    email_verified = Column(Boolean, default=False, nullable=False)
    verification_token = Column(String, nullable=True, index=True)
    verification_sent_at = Column(DateTime, nullable=True)

    # Relationships
    demo_account = relationship("DemoAccount", back_populates="user", uselist=False, cascade="all, delete-orphan")
    demo_trades = relationship("DemoTrade", back_populates="user", cascade="all, delete-orphan")
    learning_account = relationship("LearningAccount", uselist=False, cascade="all, delete-orphan")


class DemoAccount(Base):
    __tablename__ = "demo_accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    balance = Column(Float, default=100_000.0, nullable=False)
    initial_balance = Column(Float, default=100_000.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="demo_account")
    positions = relationship("DemoPosition", back_populates="account", cascade="all, delete-orphan")


class DemoPosition(Base):
    __tablename__ = "demo_positions"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("demo_accounts.id"), nullable=False)
    symbol = Column(String, nullable=False, index=True)
    quantity = Column(Float, nullable=False, default=0.0)
    avg_cost = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    account = relationship("DemoAccount", back_populates="positions")


class DemoTrade(Base):
    __tablename__ = "demo_trades"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("demo_accounts.id"), nullable=False)
    symbol = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False)  # BUY / SELL
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    total_value = Column(Float, nullable=False)
    commission = Column(Float, default=0.0)
    pnl = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="demo_trades")
