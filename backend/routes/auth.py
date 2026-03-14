from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, field_validator
from datetime import datetime
from typing import Optional

from backend.db.session import get_db
from backend.db.models.user import User, DemoAccount
from backend.auth.jwt_handler import hash_password, verify_password, create_access_token, get_current_user
from backend.config.settings import get_settings

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


# ── Schemas ────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    created_at: datetime
    is_demo_user: bool
    demo_balance: Optional[float] = None

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ── Helpers ────────────────────────────────────────────────────────────────

def _user_to_response(user: User) -> UserResponse:
    balance = user.demo_account.balance if user.demo_account else None
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        created_at=user.created_at,
        is_demo_user=user.is_demo_user,
        demo_balance=balance,
    )


def _create_demo_account(db: Session, user: User):
    account = DemoAccount(
        user_id=user.id,
        balance=settings.DEMO_BALANCE,
        initial_balance=settings.DEMO_BALANCE,
    )
    db.add(account)
    db.flush()
    return account


# ── Routes ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        is_demo_user=True,
    )
    db.add(user)
    db.flush()
    _create_demo_account(db, user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=_user_to_response(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    # Ensure demo account exists
    if not user.demo_account:
        _create_demo_account(db, user)
        db.commit()
        db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return TokenResponse(access_token=token, user=_user_to_response(user))


@router.post("/logout")
def logout():
    # JWT is stateless; client discards the token
    return {"message": "Logged out successfully"}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return _user_to_response(current_user)
