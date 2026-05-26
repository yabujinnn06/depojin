from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def hash_pin(pin: str) -> str:
    return pwd.hash(pin)


def verify_pin(pin: str, hashed: str) -> bool:
    return pwd.verify(pin, hashed)


def _build(user_id: int, rol: str, tip: str, minutes: int) -> str:
    exp = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    payload = {"sub": str(user_id), "rol": rol, "tip": tip, "exp": exp}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def create_access(user_id: int, rol: str) -> str:
    return _build(user_id, rol, "access", settings.jwt_expire_minutes)


def create_refresh(user_id: int, rol: str) -> str:
    return _build(user_id, rol, "refresh", settings.refresh_expire_minutes)


def decode_token(token: str, beklenen_tip: str = "access") -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token gecersiz")
    if payload.get("tip", "access") != beklenen_tip:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token turu yanlis")
    return payload


def current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token gerekli")
    payload = decode_token(token, "access")
    try:
        user_id = int(payload.get("sub"))
    except (ValueError, TypeError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token gecersiz")
    user = db.get(User, user_id)
    if not user or not user.aktif:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Kullanici yok veya pasif")
    return user


def require_admin(user: User = Depends(current_user)) -> User:
    if user.rol != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admin yetkisi gerekli")
    return user


def client_ip(request: Request) -> str | None:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else None
