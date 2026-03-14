import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.api.dependencies import get_current_user, get_db, get_market_data_provider
from backend.db.models.user import User
from backend.market.data_provider import MarketDataProvider
from backend.security.auth import hash_password, verify_password
from backend.services.learning_service import LearningService


router = APIRouter(tags=["Profile"])


class ProfileUpdateRequest(BaseModel):
    username: str | None = Field(default=None, min_length=2)
    display_name: str | None = Field(default=None, min_length=2)
    preferences: dict | None = None


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class RefillRequest(BaseModel):
    mode: str = Field(default="free", pattern="^(free|paid)$")


def _serialize_user(user: User, learning: dict) -> dict:
    statistics = dict(learning.get("profile_stats", {}))
    statistics["free_refill_cooldown_seconds"] = learning.get("free_refill_cooldown_seconds", 0)
    statistics["free_refill_available"] = learning.get("free_refill_available", True)
    statistics["refill_count"] = learning.get("refill_count", 0)
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "display_name": user.display_name,
        "created_at": user.created_at.isoformat(),
        "demo_balance": user.demo_balance,
        "is_active": user.is_active,
        "is_demo_user": user.is_demo_user,
        "preferences": learning.get("profile_stats", {}).get("preferences", {}),
        "statistics": statistics,
    }


@router.get("/me")
def get_profile(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    provider: MarketDataProvider = Depends(get_market_data_provider),
):
    learning = LearningService(db, provider).get_account_snapshot(user)
    return {"status": "success", "data": _serialize_user(user, learning)}


@router.put("/me")
def update_profile(
    payload: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    provider: MarketDataProvider = Depends(get_market_data_provider),
):
    if payload.username:
        normalized_username = payload.username.strip().lower()
        if normalized_username != user.username:
            exists = db.query(User).filter(User.username == normalized_username, User.id != user.id).first()
            if exists:
                raise HTTPException(status_code=400, detail="Username is already taken")
            user.username = normalized_username

    if payload.display_name:
        user.display_name = payload.display_name.strip()

    if payload.preferences is not None:
        user.preferences_json = json.dumps(payload.preferences)

    db.commit()
    db.refresh(user)
    learning = LearningService(db, provider).get_account_snapshot(user)
    return {"status": "success", "data": _serialize_user(user, learning)}


@router.post("/password")
def change_password(
    payload: PasswordChangeRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different")

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"status": "success", "data": {"message": "Password updated"}}


@router.post("/refill")
def refill_demo_balance(
    payload: RefillRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    provider: MarketDataProvider = Depends(get_market_data_provider),
):
    service = LearningService(db, provider)
    try:
        result = service.refill_demo_balance(user, payload.mode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {"status": "success", "data": result}
