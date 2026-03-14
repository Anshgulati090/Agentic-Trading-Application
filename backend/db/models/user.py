from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String

from backend.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    is_demo_user = Column(Boolean, default=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified = Column(Boolean, default=False, nullable=False)
    email_verification_token = Column(String, nullable=True)
    verification_sent_at = Column(DateTime, nullable=True)
    demo_balance = Column(Float, default=100000.0, nullable=False)
    preferences_json = Column(String, default="{}", nullable=False)
