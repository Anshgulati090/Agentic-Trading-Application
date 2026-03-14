import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.db.models.user import User, DemoAccount
from backend.auth.jwt_handler import hash_password, verify_password, create_access_token, get_current_user
from backend.config.settings import get_settings
from backend.services.email_service import build_verification_link, send_verification_email

router = APIRouter(prefix="/auth", tags=["Authentication"])
settings = get_settings()


# ── Schemas ────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

    @field_validator("email")
    @classmethod
    def email_format(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or "." not in normalized.split("@")[-1]:
            raise ValueError("Enter a valid email address")
        return normalized

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def login_email_format(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or "." not in normalized.split("@")[-1]:
            raise ValueError("Enter a valid email address")
        return normalized


class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    created_at: datetime
    is_active: bool
    is_demo_user: bool
    email_verified: bool
    demo_balance: Optional[float] = None

    class Config:
        from_attributes = True


class RegisterResponse(BaseModel):
    message: str
    verification_required: bool = True
    email: str
    verification_preview_url: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class VerificationRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def resend_email_format(cls, value: str) -> str:
        normalized = value.strip().lower()
        if "@" not in normalized or "." not in normalized.split("@")[-1]:
            raise ValueError("Enter a valid email address")
        return normalized


# ── Helpers ────────────────────────────────────────────────────────────────

def _user_to_response(user: User) -> UserResponse:
    balance = user.demo_account.balance if user.demo_account else None
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        created_at=user.created_at,
        is_active=user.is_active,
        is_demo_user=user.is_demo_user,
        email_verified=user.email_verified,
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


def _build_username(db: Session, email: str) -> str:
    base = email.split("@")[0].strip().lower() or "trader"
    candidate = base
    index = 1
    while db.query(User).filter(User.username == candidate).first():
        index += 1
        candidate = f"{base}{index}"
    return candidate


# ── Routes ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    verification_token = secrets.token_urlsafe(32)
    username = _build_username(db, payload.email)
    user = User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        is_demo_user=True,
        display_name=payload.full_name or username,
        username=username,
        demo_balance=settings.DEMO_BALANCE,
        email_verified=False,
        verification_token=verification_token,
        verification_sent_at=datetime.utcnow(),
    )
    db.add(user)
    db.flush()
    _create_demo_account(db, user)
    db.commit()
    send_verification_email(user.email, verification_token)
    preview_url = build_verification_link(verification_token) if settings.DEBUG else None
    return RegisterResponse(
        message="Account created. Please verify your email before logging in.",
        email=user.email,
        verification_preview_url=preview_url,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Please verify your email before signing in")

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


@router.post("/verify-email")
def verify_email(payload: VerificationRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.verification_token == payload.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification token")

    user.email_verified = True
    user.verification_token = None
    db.commit()
    return {"message": "Email verified successfully"}


@router.post("/resend-verification")
def resend_verification(payload: ResendVerificationRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Account not found")
    if user.email_verified:
        return {"message": "Email already verified"}

    user.verification_token = secrets.token_urlsafe(32)
    user.verification_sent_at = datetime.utcnow()
    db.commit()
    send_verification_email(user.email, user.verification_token)
    preview_url = build_verification_link(user.verification_token) if settings.DEBUG else None
    return {"message": "Verification email sent", "verification_preview_url": preview_url}


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return _user_to_response(current_user)
