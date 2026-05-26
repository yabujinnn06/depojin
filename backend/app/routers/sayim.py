from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import SayimOturumu, Stok, Seri, TaramaLog, User
from ..schemas import OturumCreate, OturumOut, StokOzet, LogOut, OzetOut
from ..auth import current_user, require_admin
from ..audit import audit

router = APIRouter(prefix="/api/sayim", tags=["sayim"])


@router.get("", response_model=list[OturumOut])
def list_oturumlar(
    arsiv: bool = False,
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    q = select(SayimOturumu).order_by(SayimOturumu.baslangic.desc())
    if not arsiv:
        q = q.where(SayimOturumu.durum != "arsiv").where(SayimOturumu.durum != "silindi")
    return db.execute(q).scalars().all()


@router.post("", response_model=OturumOut)
def create_oturum(
    data: OturumCreate, request: Request,
    db: Session = Depends(get_db), user: User = Depends(require_admin),
):
    oturum = SayimOturumu(ad=data.ad, lokasyon=data.lokasyon, olusturan_id=user.id)
    db.add(oturum)
    db.flush()
    audit(db, "oturum_yarat", kullanici=user, kaynak_tip="oturum",
          kaynak_id=oturum.id, detay={"ad": oturum.ad}, request=request)
    db.commit()
    db.refresh(oturum)
    return oturum


@router.post("/{oturum_id}/bitir", response_model=OturumOut)
def bitir(oturum_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    oturum = db.get(SayimOturumu, oturum_id)
    if not oturum:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oturum yok")
    oturum.durum = "tamamlandi"
    oturum.bitis = datetime.utcnow()
    audit(db, "oturum_bitir", kullanici=user, kaynak_tip="oturum", kaynak_id=oturum.id, request=request)
    db.commit()
    db.refresh(oturum)
    return oturum


@router.post("/{oturum_id}/arsivle", response_model=OturumOut)
def arsivle(oturum_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    oturum = db.get(SayimOturumu, oturum_id)
    if not oturum:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oturum yok")
    oturum.durum = "arsiv"
    if oturum.bitis is None:
        oturum.bitis = datetime.utcnow()
    audit(db, "oturum_arsivle", kullanici=user, kaynak_tip="oturum", kaynak_id=oturum.id, request=request)
    db.commit()
    db.refresh(oturum)
    return oturum


@router.delete("/{oturum_id}")
def sil(oturum_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    oturum = db.get(SayimOturumu, oturum_id)
    if not oturum:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oturum yok")
    ad = oturum.ad
    audit(db, "oturum_sil", kullanici=user, kaynak_tip="oturum", kaynak_id=oturum_id,
          detay={"ad": ad}, request=request)
    db.delete(oturum)
    db.commit()
    return {"ok": True, "ad": ad}


@router.get("/{oturum_id}", response_model=OturumOut)
def get_oturum(oturum_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    oturum = db.get(SayimOturumu, oturum_id)
    if not oturum:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oturum yok")
    return oturum


@router.get("/{oturum_id}/ozet", response_model=OzetOut)
def ozet(oturum_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    toplam = db.scalar(select(func.count(Seri.id)).where(Seri.oturum_id == oturum_id)) or 0
    sayilan = db.scalar(select(func.count(Seri.id)).where(and_(Seri.oturum_id == oturum_id, Seri.sayildi == True))) or 0
    stok_sayisi = db.scalar(select(func.count(Stok.id)).where(Stok.oturum_id == oturum_id)) or 0
    son_islem = db.scalar(
        select(func.max(TaramaLog.zaman)).where(TaramaLog.oturum_id == oturum_id)
    )
    return OzetOut(
        toplam_seri=toplam,
        sayilan_seri=sayilan,
        kalan_seri=toplam - sayilan,
        stok_sayisi=stok_sayisi,
        son_islem=son_islem,
    )


@router.get("/{oturum_id}/stoklar", response_model=list[StokOzet])
def stoklar(oturum_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    toplam_sub = (
        select(Seri.stok_id, func.count(Seri.id).label("toplam"))
        .where(Seri.oturum_id == oturum_id)
        .group_by(Seri.stok_id)
        .subquery()
    )
    sayilan_sub = (
        select(Seri.stok_id, func.count(Seri.id).label("sayilan"))
        .where(and_(Seri.oturum_id == oturum_id, Seri.sayildi == True))
        .group_by(Seri.stok_id)
        .subquery()
    )
    rows = db.execute(
        select(
            Stok.id,
            Stok.stok_kodu,
            Stok.urun_adi,
            Stok.portal_sayim,
            func.coalesce(toplam_sub.c.toplam, 0),
            func.coalesce(sayilan_sub.c.sayilan, 0),
        )
        .outerjoin(toplam_sub, toplam_sub.c.stok_id == Stok.id)
        .outerjoin(sayilan_sub, sayilan_sub.c.stok_id == Stok.id)
        .where(Stok.oturum_id == oturum_id)
        .order_by(Stok.stok_kodu)
    ).all()
    return [
        StokOzet(id=r[0], stok_kodu=r[1], urun_adi=r[2], portal_sayim=r[3], toplam=r[4], sayilan=r[5])
        for r in rows
    ]


@router.get("/{oturum_id}/log", response_model=list[LogOut])
def log(oturum_id: int, limit: int = 50, db: Session = Depends(get_db), _: User = Depends(current_user)):
    rows = db.execute(
        select(TaramaLog, User.ad)
        .outerjoin(User, User.id == TaramaLog.kullanici_id)
        .where(TaramaLog.oturum_id == oturum_id)
        .order_by(TaramaLog.zaman.desc())
        .limit(limit)
    ).all()
    out = []
    for log, kullanici_ad in rows:
        item = LogOut.model_validate(log)
        item.kullanici_ad = kullanici_ad
        out.append(item)
    return out
