from datetime import datetime, timedelta
from io import BytesIO
from collections import defaultdict
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import select, func, and_, or_, case
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import SayimOturumu, Stok, Seri, TaramaLog, User
from ..schemas import (
    LogOut, LogSayfaOut, IstatistikOut, DurumSayim,
    KullaniciIstatistik, DakikaSayim, EksikGrupOut,
)
from ..auth import current_user

router = APIRouter(prefix="/api/sayim", tags=["rapor"])


def _kontrol(db: Session, oturum_id: int) -> SayimOturumu:
    o = db.get(SayimOturumu, oturum_id)
    if not o:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oturum yok")
    return o


@router.get("/{oturum_id}/log-filtre", response_model=LogSayfaOut)
def log_filtre(
    oturum_id: int,
    durum: str | None = Query(None),
    kullanici_id: int | None = Query(None),
    q: str | None = Query(None),
    baslangic: datetime | None = Query(None),
    bitis: datetime | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    _kontrol(db, oturum_id)
    kosul = [TaramaLog.oturum_id == oturum_id]
    if durum:
        kosul.append(TaramaLog.durum == durum)
    if kullanici_id is not None:
        kosul.append(TaramaLog.kullanici_id == kullanici_id)
    if baslangic:
        kosul.append(TaramaLog.zaman >= baslangic)
    if bitis:
        kosul.append(TaramaLog.zaman <= bitis)
    if q:
        like = f"%{q.strip()}%"
        kosul.append(or_(
            TaramaLog.seri_giris.ilike(like),
            TaramaLog.stok_kodu.ilike(like),
            TaramaLog.urun_adi.ilike(like),
            TaramaLog.aciklama.ilike(like),
        ))

    toplam = db.scalar(select(func.count(TaramaLog.id)).where(and_(*kosul))) or 0
    rows = db.execute(
        select(TaramaLog, User.ad)
        .outerjoin(User, User.id == TaramaLog.kullanici_id)
        .where(and_(*kosul))
        .order_by(TaramaLog.zaman.desc())
        .offset(offset).limit(limit)
    ).all()

    items: list[LogOut] = []
    for log, ad in rows:
        it = LogOut.model_validate(log)
        it.kullanici_ad = ad
        items.append(it)
    return LogSayfaOut(toplam=toplam, items=items)


@router.get("/{oturum_id}/istatistik", response_model=IstatistikOut)
def istatistik(oturum_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    _kontrol(db, oturum_id)

    durum_rows = db.execute(
        select(TaramaLog.durum, func.count(TaramaLog.id))
        .where(TaramaLog.oturum_id == oturum_id)
        .group_by(TaramaLog.durum)
        .order_by(func.count(TaramaLog.id).desc())
    ).all()
    durum_dagilimi = [DurumSayim(durum=d, sayi=n) for d, n in durum_rows]

    kullanici_rows = db.execute(
        select(
            TaramaLog.kullanici_id,
            User.ad,
            func.sum(case((TaramaLog.durum == "basarili", 1), else_=0)),
            func.sum(case((TaramaLog.durum == "mukerrer", 1), else_=0)),
            func.sum(case((TaramaLog.durum == "bulunamadi", 1), else_=0)),
            func.sum(case((TaramaLog.durum == "cakisma", 1), else_=0)),
            func.count(TaramaLog.id),
            func.max(TaramaLog.zaman),
        )
        .outerjoin(User, User.id == TaramaLog.kullanici_id)
        .where(TaramaLog.oturum_id == oturum_id)
        .group_by(TaramaLog.kullanici_id, User.ad)
        .order_by(func.count(TaramaLog.id).desc())
    ).all()
    kullanici_basina = [
        KullaniciIstatistik(
            kullanici_id=row[0],
            ad=row[1] or "Bilinmeyen",
            basarili=int(row[2] or 0),
            mukerrer=int(row[3] or 0),
            bulunamadi=int(row[4] or 0),
            cakisma=int(row[5] or 0),
            toplam_tarama=int(row[6] or 0),
            son_tarama=row[7],
        )
        for row in kullanici_rows
    ]

    ilk = db.scalar(select(func.min(TaramaLog.zaman)).where(TaramaLog.oturum_id == oturum_id))
    son = db.scalar(select(func.max(TaramaLog.zaman)).where(TaramaLog.oturum_id == oturum_id))

    dakika_serisi: list[DakikaSayim] = []
    if ilk and son:
        kova_basarili: dict[datetime, int] = defaultdict(int)
        kova_diger: dict[datetime, int] = defaultdict(int)
        loglar = db.execute(
            select(TaramaLog.zaman, TaramaLog.durum)
            .where(TaramaLog.oturum_id == oturum_id)
        ).all()
        for z, d in loglar:
            kova = z.replace(second=0, microsecond=0)
            if d == "basarili":
                kova_basarili[kova] += 1
            else:
                kova_diger[kova] += 1
        anahtar = sorted(set(list(kova_basarili.keys()) + list(kova_diger.keys())))
        dakika_serisi = [
            DakikaSayim(zaman=z, basarili=kova_basarili[z], diger=kova_diger[z])
            for z in anahtar
        ]

    basarili_top = db.scalar(
        select(func.count(TaramaLog.id))
        .where(and_(TaramaLog.oturum_id == oturum_id, TaramaLog.durum == "basarili"))
    ) or 0
    sure_dk = 0.0
    if ilk and son and basarili_top > 0:
        delta = (son - ilk).total_seconds() / 60.0
        sure_dk = (basarili_top / delta) if delta > 0 else float(basarili_top)
    tarama_dakika_dk = round(sure_dk, 2)

    return IstatistikOut(
        durum_dagilimi=durum_dagilimi,
        kullanici_basina=kullanici_basina,
        dakika_serisi=dakika_serisi,
        ilk_tarama=ilk,
        son_tarama=son,
        tarama_dakika_dk=tarama_dakika_dk,
    )


@router.get("/{oturum_id}/eksik", response_model=list[EksikGrupOut])
def eksik_seriler(
    oturum_id: int,
    limit_seri: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(current_user),
):
    _kontrol(db, oturum_id)
    stoklar = db.execute(
        select(Stok).where(Stok.oturum_id == oturum_id).order_by(Stok.stok_kodu)
    ).scalars().all()

    sonuc: list[EksikGrupOut] = []
    for s in stoklar:
        toplam = db.scalar(select(func.count(Seri.id)).where(Seri.stok_id == s.id)) or 0
        sayilan = db.scalar(
            select(func.count(Seri.id)).where(and_(Seri.stok_id == s.id, Seri.sayildi == True))
        ) or 0
        eksik = toplam - sayilan
        if eksik <= 0:
            continue
        seriler = db.execute(
            select(Seri.seri_no)
            .where(and_(Seri.stok_id == s.id, Seri.sayildi == False))
            .order_by(Seri.seri_no)
            .limit(limit_seri)
        ).scalars().all()
        sonuc.append(EksikGrupOut(
            stok_id=s.id, stok_kodu=s.stok_kodu, urun_adi=s.urun_adi,
            toplam=toplam, sayilan=sayilan, eksik=eksik,
            portal_sayim=s.portal_sayim, seriler=list(seriler),
        ))
    return sonuc


@router.get("/{oturum_id}/log/excel")
def log_excel(oturum_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    oturum = _kontrol(db, oturum_id)

    wb = Workbook()
    ws = wb.active
    ws.title = "TaramaLog"
    ws.append(["Zaman", "Kullanici", "Seri Giris", "Durum", "Stok Kodu", "Urun Adi", "Aciklama"])

    rows = db.execute(
        select(TaramaLog, User.ad)
        .outerjoin(User, User.id == TaramaLog.kullanici_id)
        .where(TaramaLog.oturum_id == oturum_id)
        .order_by(TaramaLog.zaman.asc())
    ).all()
    for log, ad in rows:
        ws.append([
            log.zaman.strftime("%d.%m.%Y %H:%M:%S"),
            ad or "",
            log.seri_giris,
            log.durum,
            log.stok_kodu or "",
            log.urun_adi or "",
            log.aciklama or "",
        ])

    buf = BytesIO(); wb.save(buf); buf.seek(0)
    fname = f"tarama_log_{oturum.ad.replace(' ', '_')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )
