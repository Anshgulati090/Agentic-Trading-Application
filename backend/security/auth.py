import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt


TOKEN_TTL_HOURS = int(os.getenv("AUTH_TOKEN_TTL_HOURS", "12"))
TOKEN_SECRET = os.getenv("AUTH_TOKEN_SECRET", "agentic-trading-dev-secret")
TOKEN_ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except Exception:
        return False


def create_token(subject: str) -> str:
    payload = {
        "sub": subject,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_TTL_HOURS),
    }
    return jwt.encode(payload, TOKEN_SECRET, algorithm=TOKEN_ALGORITHM)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, TOKEN_SECRET, algorithms=[TOKEN_ALGORITHM])
    except Exception:
        return None
