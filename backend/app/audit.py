from typing import Any
from fastapi import Request
from sqlalchemy.orm import Session

from .models import AuditLog, User


def audit(
    db: Session,
    eylem: str,
    *,
    kullanici: User | None = None,
    kaynak_tip: str | None = None,
    kaynak_id: Any = None,
    detay: dict | None = None,
    request: Request | None = None,
) -> None:
    ip = None
    if request is not None:
        ip = request.headers.get("x-forwarded-for", "").split(",")[0].strip() or request.client.host
    db.add(AuditLog(
        kullanici_id=kullanici.id if kullanici else None,
        kullanici_ad=kullanici.ad if kullanici else None,
        eylem=eylem,
        kaynak_tip=kaynak_tip,
        kaynak_id=str(kaynak_id) if kaynak_id is not None else None,
        ip=ip,
        detay=detay,
    ))
