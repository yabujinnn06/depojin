import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from ..database import SessionLocal, get_db
from ..models import SayimOturumu, Stok, Seri, TaramaLog, User
from ..schemas import TaramaIn, TaramaOut
from ..auth import current_user, decode_token
from ..utils import normalize_seri, candidate_seri_keys
from ..ws import manager

router = APIRouter(prefix="/api", tags=["tarama"])


def _stok_sayilari(db: Session, stok_id: int) -> tuple[int, int]:
    toplam = db.scalar(select(func.count(Seri.id)).where(Seri.stok_id == stok_id)) or 0
    sayilan = db.scalar(
        select(func.count(Seri.id)).where(and_(Seri.stok_id == stok_id, Seri.sayildi == True))
    ) or 0
    return toplam, sayilan


def _log(db: Session, oturum_id: int, user_id: int | None, seri: str, durum: str,
         stok_kodu: str | None, urun_adi: str | None, aciklama: str | None) -> TaramaLog:
    log = TaramaLog(
        oturum_id=oturum_id, kullanici_id=user_id, seri_giris=seri, durum=durum,
        stok_kodu=stok_kodu, urun_adi=urun_adi, aciklama=aciklama,
    )
    db.add(log)
    return log


def _islem(db: Session, oturum_id: int, user: User, seri_giris: str) -> TaramaOut:
    anahtarlar = candidate_seri_keys(seri_giris)
    if not anahtarlar:
        return TaramaOut(durum="bos", mesaj="Bos giris", seri=seri_giris)

    oturum = db.get(SayimOturumu, oturum_id)
    if not oturum:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oturum yok")
    if oturum.durum != "aktif":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Oturum aktif degil")

    eslesenler = db.execute(
        select(Seri, Stok)
        .join(Stok, Stok.id == Seri.stok_id)
        .where(and_(Seri.oturum_id == oturum_id, Seri.seri_no_norm.in_(anahtarlar)))
        .with_for_update()
    ).all()

    if not eslesenler:
        _log(db, oturum_id, user.id, seri_giris, "bulunamadi", None, None, "Seri listede yok")
        db.commit()
        return TaramaOut(durum="bulunamadi", mesaj=f"Seri bulunamadi: {seri_giris}", seri=seri_giris)

    if len(eslesenler) > 1:
        kodlar = sorted({s.stok_kodu for _, s in eslesenler})
        _log(db, oturum_id, user.id, seri_giris, "cakisma", None, None, ", ".join(kodlar))
        db.commit()
        return TaramaOut(
            durum="cakisma",
            mesaj=f"Seri birden cok stokta: {', '.join(kodlar)}",
            seri=seri_giris,
            cakisan_stoklar=kodlar,
        )

    seri, stok = eslesenler[0]
    if seri.sayildi:
        toplam, sayilan = _stok_sayilari(db, stok.id)
        _log(db, oturum_id, user.id, seri_giris, "mukerrer", stok.stok_kodu, stok.urun_adi, "Daha once sayildi")
        db.commit()
        return TaramaOut(
            durum="mukerrer",
            mesaj="Bu seri daha once sayildi",
            seri=seri.seri_no,
            stok_kodu=stok.stok_kodu,
            urun_adi=stok.urun_adi,
            toplam=toplam,
            sayilan=sayilan,
            kalan=toplam - sayilan,
            portal_sayim=stok.portal_sayim,
            portal_fark=sayilan - stok.portal_sayim,
        )

    seri.sayildi = True
    seri.sayim_tarihi = datetime.utcnow()
    seri.sayan_id = user.id
    _log(db, oturum_id, user.id, seri_giris, "basarili", stok.stok_kodu, stok.urun_adi, "Sayim kaydedildi")
    db.commit()
    toplam, sayilan = _stok_sayilari(db, stok.id)
    return TaramaOut(
        durum="basarili",
        mesaj=f"Seri sayildi: {seri.seri_no}",
        seri=seri.seri_no,
        stok_kodu=stok.stok_kodu,
        urun_adi=stok.urun_adi,
        toplam=toplam,
        sayilan=sayilan,
        kalan=toplam - sayilan,
        portal_sayim=stok.portal_sayim,
        portal_fark=sayilan - stok.portal_sayim,
    )


@router.post("/tarama", response_model=TaramaOut)
async def tarama(data: TaramaIn, db: Session = Depends(get_db), user: User = Depends(current_user)):
    sonuc = _islem(db, data.oturum_id, user, data.seri)
    manager.update_aktivite(data.oturum_id, user.id, sonuc.seri, sonuc.durum)
    await manager.broadcast(data.oturum_id, {
        "tip": "tarama",
        "kullanici": user.ad,
        "kullanici_id": user.id,
        "zaman": datetime.utcnow().isoformat(),
        "sonuc": sonuc.model_dump(),
    })
    await manager.broadcast_presence(data.oturum_id)
    return sonuc


@router.websocket("/ws/sayim/{oturum_id}")
async def ws_oturum(ws: WebSocket, oturum_id: int, token: str | None = Query(None)):
    if not token:
        await ws.close(code=1008)
        return
    try:
        payload = decode_token(token, "access")
        user_id = int(payload.get("sub"))
        rol = payload.get("rol", "sayan")
    except Exception:
        await ws.close(code=1008)
        return
    db = SessionLocal()
    try:
        user = db.get(User, user_id)
        if not user or not user.aktif:
            await ws.close(code=1008)
            return
        ad = user.ad
    finally:
        db.close()
    await manager.connect(oturum_id, ws, user_id, ad, rol)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(oturum_id, ws)
