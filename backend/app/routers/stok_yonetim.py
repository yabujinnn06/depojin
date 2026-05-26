from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import SayimOturumu, Stok, Seri, User
from ..auth import current_user, require_admin
from ..audit import audit
from ..utils import normalize_seri, normalize_stok_kodu, temizle_metin

router = APIRouter(prefix="/api", tags=["stok_yonetim"])


class StokIn(BaseModel):
    stok_kodu: str
    urun_adi: str
    portal_sayim: int = 0


class StokOut(BaseModel):
    id: int
    stok_kodu: str
    urun_adi: str
    portal_sayim: int
    sonradan_eklendi: bool


class SeriIn(BaseModel):
    seri_no: str
    sayildi_olarak_ekle: bool = False


class SeriOut(BaseModel):
    id: int
    seri_no: str
    sayildi: bool
    sayim_tarihi: datetime | None
    sayan_ad: str | None
    sonradan_eklendi: bool
    cikis_zaman: datetime | None
    cikis_kullanici_ad: str | None
    cikis_notu: str | None
    zimmet_kullanici_id: int | None
    zimmet_kullanici_ad: str | None
    zimmet_zaman: datetime | None
    zimmet_notu: str | None


def _kontrol(db: Session, oturum_id: int) -> SayimOturumu:
    o = db.get(SayimOturumu, oturum_id)
    if not o:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oturum yok")
    return o


@router.post("/sayim/{oturum_id}/stok", response_model=StokOut)
def stok_ekle(oturum_id: int, data: StokIn, request: Request,
              db: Session = Depends(get_db), user: User = Depends(current_user)):
    _kontrol(db, oturum_id)
    kod = normalize_stok_kodu(data.stok_kodu)
    ad = temizle_metin(data.urun_adi) or kod
    if not kod:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Stok kodu bos olamaz")
    mevcut = db.execute(
        select(Stok).where(and_(Stok.oturum_id == oturum_id, Stok.stok_kodu == kod))
    ).scalar_one_or_none()
    if mevcut:
        return StokOut(id=mevcut.id, stok_kodu=mevcut.stok_kodu, urun_adi=mevcut.urun_adi,
                       portal_sayim=mevcut.portal_sayim, sonradan_eklendi=mevcut.sonradan_eklendi)
    s = Stok(oturum_id=oturum_id, stok_kodu=kod, urun_adi=ad,
             portal_sayim=data.portal_sayim, sonradan_eklendi=True)
    db.add(s); db.flush()
    audit(db, "stok_ekle", kullanici=user, kaynak_tip="stok", kaynak_id=s.id,
          detay={"oturum": oturum_id, "kod": kod, "ad": ad}, request=request)
    db.commit(); db.refresh(s)
    return StokOut(id=s.id, stok_kodu=s.stok_kodu, urun_adi=s.urun_adi,
                   portal_sayim=s.portal_sayim, sonradan_eklendi=True)


@router.post("/stok/{stok_id}/seri", response_model=SeriOut)
def seri_ekle(stok_id: int, data: SeriIn, request: Request,
              db: Session = Depends(get_db), user: User = Depends(current_user)):
    stok = db.get(Stok, stok_id)
    if not stok:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Stok yok")
    seri_no = temizle_metin(data.seri_no)
    norm = normalize_seri(seri_no)
    if not norm:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Seri bos olamaz")
    mevcut = db.execute(
        select(Seri).where(and_(Seri.stok_id == stok_id, Seri.seri_no_norm == norm))
    ).scalar_one_or_none()
    if mevcut:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bu seri zaten kayitli")
    s = Seri(
        oturum_id=stok.oturum_id, stok_id=stok.id,
        seri_no=seri_no, seri_no_norm=norm,
        sayildi=data.sayildi_olarak_ekle,
        sayim_tarihi=datetime.utcnow() if data.sayildi_olarak_ekle else None,
        sayan_id=user.id if data.sayildi_olarak_ekle else None,
        sonradan_eklendi=True,
    )
    db.add(s); db.flush()
    audit(db, "seri_ekle", kullanici=user, kaynak_tip="seri", kaynak_id=s.id,
          detay={"stok": stok.stok_kodu, "seri": seri_no, "sayildi": data.sayildi_olarak_ekle},
          request=request)
    db.commit(); db.refresh(s)
    return _serileri_doldur([s], db)[0]


@router.get("/stok/{stok_id}/seriler", response_model=list[SeriOut])
def stok_seriler(stok_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    seriler = db.execute(
        select(Seri).where(Seri.stok_id == stok_id).order_by(Seri.seri_no)
    ).scalars().all()
    return _serileri_doldur(seriler, db)


def _kullanici_map(db: Session, ids: set[int]) -> dict[int, str]:
    if not ids:
        return {}
    rows = db.execute(select(User.id, User.ad).where(User.id.in_(ids))).all()
    return {r[0]: r[1] for r in rows}


def _serileri_doldur(seriler: list[Seri], db: Session) -> list[SeriOut]:
    ids: set[int] = set()
    for s in seriler:
        for x in (s.sayan_id, s.cikis_kullanici_id, s.zimmet_kullanici_id):
            if x: ids.add(x)
    adlar = _kullanici_map(db, ids)
    out = []
    for s in seriler:
        out.append(SeriOut(
            id=s.id, seri_no=s.seri_no, sayildi=s.sayildi, sayim_tarihi=s.sayim_tarihi,
            sayan_ad=adlar.get(s.sayan_id) if s.sayan_id else None,
            sonradan_eklendi=s.sonradan_eklendi,
            cikis_zaman=s.cikis_zaman,
            cikis_kullanici_ad=adlar.get(s.cikis_kullanici_id) if s.cikis_kullanici_id else None,
            cikis_notu=s.cikis_notu,
            zimmet_kullanici_id=s.zimmet_kullanici_id,
            zimmet_kullanici_ad=adlar.get(s.zimmet_kullanici_id) if s.zimmet_kullanici_id else None,
            zimmet_zaman=s.zimmet_zaman, zimmet_notu=s.zimmet_notu,
        ))
    return out


class TopluGirisSatir(BaseModel):
    stok_kodu: str
    urun_adi: str | None = None
    seri_no: str
    portal_sayim: int = 0


class TopluGirisIn(BaseModel):
    satirlar: list[TopluGirisSatir]


@router.post("/sayim/{oturum_id}/toplu-giris")
def toplu_giris(oturum_id: int, data: TopluGirisIn, request: Request,
                db: Session = Depends(get_db), user: User = Depends(current_user)):
    _kontrol(db, oturum_id)
    stok_idx: dict[str, Stok] = {}
    seri_idx: set[tuple[int, str]] = set()
    for s in db.execute(select(Stok).where(Stok.oturum_id == oturum_id)).scalars():
        stok_idx[s.stok_kodu] = s
        for seri in s.seriler:
            seri_idx.add((s.id, seri.seri_no_norm))

    simdi = datetime.utcnow()
    yeni_stok = 0; yeni_seri = 0; mukerrer = 0; bos = 0
    for r in data.satirlar:
        kod = normalize_stok_kodu(r.stok_kodu)
        seri = temizle_metin(r.seri_no)
        norm = normalize_seri(seri)
        if not kod and not seri:
            bos += 1; continue
        stok = stok_idx.get(kod)
        if not stok and kod:
            stok = Stok(oturum_id=oturum_id, stok_kodu=kod,
                        urun_adi=temizle_metin(r.urun_adi) or kod,
                        portal_sayim=r.portal_sayim, sonradan_eklendi=True)
            db.add(stok); db.flush()
            stok_idx[kod] = stok; yeni_stok += 1
        if seri and stok:
            if (stok.id, norm) in seri_idx:
                mukerrer += 1; continue
            seri_idx.add((stok.id, norm))
            db.add(Seri(
                oturum_id=oturum_id, stok_id=stok.id,
                seri_no=seri, seri_no_norm=norm,
                sayildi=True, sayim_tarihi=simdi, sayan_id=user.id,
                sonradan_eklendi=True,
            ))
            yeni_seri += 1
    audit(db, "toplu_giris", kullanici=user, kaynak_tip="oturum", kaynak_id=oturum_id,
          detay={"yeni_stok": yeni_stok, "yeni_seri": yeni_seri,
                 "mukerrer": mukerrer, "bos": bos}, request=request)
    db.commit()
    return {"yeni_stok": yeni_stok, "yeni_seri": yeni_seri, "mukerrer": mukerrer, "bos": bos}


class TopluSeriIn(BaseModel):
    oturum_id: int
    seri_no_listesi: list[str]
    not_alani: str | None = None


class TopluZimmetIn(TopluSeriIn):
    kullanici_id: int


def _seri_bul(db: Session, oturum_id: int, seri_no_listesi: list[str]) -> tuple[list[Seri], list[str]]:
    bulunamadi = []
    bulunanlar = []
    for s in seri_no_listesi:
        norm = normalize_seri(s)
        if not norm:
            continue
        rows = db.execute(
            select(Seri).where(and_(Seri.oturum_id == oturum_id, Seri.seri_no_norm == norm))
        ).scalars().all()
        if not rows:
            bulunamadi.append(s)
        else:
            bulunanlar.extend(rows)
    return bulunanlar, bulunamadi


@router.post("/sayim/{oturum_id}/toplu-cikis")
def toplu_cikis(oturum_id: int, data: TopluSeriIn, request: Request,
                db: Session = Depends(get_db), user: User = Depends(current_user)):
    if data.oturum_id != oturum_id:
        raise HTTPException(400, "Oturum id uyusmuyor")
    _kontrol(db, oturum_id)
    seriler, bulunamadi = _seri_bul(db, oturum_id, data.seri_no_listesi)
    zaman = datetime.utcnow()
    isaretlenen = 0; zaten = 0
    for s in seriler:
        if s.cikis_zaman:
            zaten += 1; continue
        s.cikis_zaman = zaman
        s.cikis_kullanici_id = user.id
        s.cikis_notu = data.not_alani
        isaretlenen += 1
    audit(db, "toplu_cikis", kullanici=user, kaynak_tip="oturum", kaynak_id=oturum_id,
          detay={"isaretlenen": isaretlenen, "zaten": zaten,
                 "bulunamadi": len(bulunamadi)}, request=request)
    db.commit()
    return {"isaretlenen": isaretlenen, "zaten_cikis": zaten,
            "bulunamadi": bulunamadi}


@router.post("/sayim/{oturum_id}/toplu-zimmet")
def toplu_zimmet(oturum_id: int, data: TopluZimmetIn, request: Request,
                 db: Session = Depends(get_db), user: User = Depends(current_user)):
    if data.oturum_id != oturum_id:
        raise HTTPException(400, "Oturum id uyusmuyor")
    _kontrol(db, oturum_id)
    hedef = db.get(User, data.kullanici_id)
    if not hedef:
        raise HTTPException(404, "Zimmet hedefi yok")
    seriler, bulunamadi = _seri_bul(db, oturum_id, data.seri_no_listesi)
    zaman = datetime.utcnow()
    zimmetlenen = 0; zaten = 0
    for s in seriler:
        if s.zimmet_kullanici_id:
            zaten += 1; continue
        s.zimmet_kullanici_id = hedef.id
        s.zimmet_zaman = zaman
        s.zimmet_notu = data.not_alani
        zimmetlenen += 1
    audit(db, "toplu_zimmet", kullanici=user, kaynak_tip="user", kaynak_id=hedef.id,
          detay={"oturum": oturum_id, "zimmetlenen": zimmetlenen, "zaten": zaten,
                 "bulunamadi": len(bulunamadi), "hedef": hedef.ad}, request=request)
    db.commit()
    return {"zimmetlenen": zimmetlenen, "zaten_zimmette": zaten,
            "bulunamadi": bulunamadi, "hedef": hedef.ad}


@router.post("/sayim/{oturum_id}/toplu-iade")
def toplu_iade(oturum_id: int, data: TopluSeriIn, request: Request,
               db: Session = Depends(get_db), user: User = Depends(current_user)):
    if data.oturum_id != oturum_id:
        raise HTTPException(400, "Oturum id uyusmuyor")
    _kontrol(db, oturum_id)
    seriler, bulunamadi = _seri_bul(db, oturum_id, data.seri_no_listesi)
    iade = 0; zimmette_degil = 0
    for s in seriler:
        if not s.zimmet_kullanici_id:
            zimmette_degil += 1; continue
        s.zimmet_kullanici_id = None
        s.zimmet_zaman = None
        s.zimmet_notu = None
        iade += 1
    audit(db, "toplu_iade", kullanici=user, kaynak_tip="oturum", kaynak_id=oturum_id,
          detay={"iade": iade, "zimmette_degil": zimmette_degil,
                 "bulunamadi": len(bulunamadi)}, request=request)
    db.commit()
    return {"iade": iade, "zimmette_olmayan": zimmette_degil, "bulunamadi": bulunamadi}
