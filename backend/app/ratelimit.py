from datetime import datetime, timedelta
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from .models import LoginDeneme


PENCERE_DK = 5
MAX_BASARISIZ = 5


def kontrol_login_kilit(db: Session, ad: str) -> tuple[bool, int]:
    """Returns (locked, kalan_saniye)."""
    sinir = datetime.utcnow() - timedelta(minutes=PENCERE_DK)
    basarisiz = db.scalar(
        select(func.count(LoginDeneme.id)).where(
            and_(
                LoginDeneme.ad == ad,
                LoginDeneme.basarili == False,
                LoginDeneme.zaman > sinir,
            )
        )
    ) or 0
    if basarisiz < MAX_BASARISIZ:
        return False, 0
    son = db.scalar(
        select(func.max(LoginDeneme.zaman)).where(
            and_(LoginDeneme.ad == ad, LoginDeneme.basarili == False)
        )
    )
    if son is None:
        return False, 0
    kilit_bitis = son + timedelta(minutes=PENCERE_DK)
    kalan = int((kilit_bitis - datetime.utcnow()).total_seconds())
    return (kalan > 0), max(0, kalan)


def kaydet_deneme(db: Session, ad: str, ip: str | None, basarili: bool) -> None:
    db.add(LoginDeneme(ad=ad, ip=ip, basarili=basarili))
    db.commit()
