from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AuditLog, User
from ..auth import require_admin
from pydantic import BaseModel, ConfigDict

router = APIRouter(prefix="/api/admin", tags=["admin"])


class AuditOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    zaman: datetime
    kullanici_ad: str | None
    eylem: str
    kaynak_tip: str | None
    kaynak_id: str | None
    ip: str | None
    detay: dict | None


class AuditSayfa(BaseModel):
    toplam: int
    items: list[AuditOut]


@router.get("/audit", response_model=AuditSayfa)
def audit_list(
    eylem: str | None = Query(None),
    kullanici_id: int | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    kosul = []
    if eylem:
        kosul.append(AuditLog.eylem == eylem)
    if kullanici_id is not None:
        kosul.append(AuditLog.kullanici_id == kullanici_id)

    toplam = db.scalar(select(func.count(AuditLog.id)).where(*kosul)) or 0
    q = select(AuditLog).where(*kosul).order_by(AuditLog.zaman.desc()).offset(offset).limit(limit)
    items = db.execute(q).scalars().all()
    return AuditSayfa(toplam=toplam, items=items)
