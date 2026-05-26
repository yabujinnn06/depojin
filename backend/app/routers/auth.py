from fastapi import APIRouter, Body, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..database import get_db
from ..models import User
from ..schemas import LoginIn, TokenOut, UserCreate, UserOut, RefreshIn, UserUpdate, PinDegistirIn
from ..auth import (
    verify_pin, create_access, create_refresh, decode_token, hash_pin,
    current_user, require_admin, client_ip,
)
from ..audit import audit
from ..ratelimit import kontrol_login_kilit, kaydet_deneme

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, request: Request, db: Session = Depends(get_db)):
    ip = client_ip(request)
    kilit, kalan = kontrol_login_kilit(db, data.ad)
    if kilit:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            f"Cok fazla yanlis giris. {kalan} saniye sonra tekrar deneyin.",
        )

    user = db.execute(select(User).where(User.ad == data.ad, User.aktif == True)).scalar_one_or_none()
    if not user or not verify_pin(data.pin, user.pin_hash):
        kaydet_deneme(db, data.ad, ip, False)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Ad veya PIN hatali")

    kaydet_deneme(db, data.ad, ip, True)
    access = create_access(user.id, user.rol)
    refresh = create_refresh(user.id, user.rol)
    audit(db, "login", kullanici=user, request=request)
    db.commit()
    return TokenOut(
        access_token=access, refresh_token=refresh,
        user_id=user.id, ad=user.ad, rol=user.rol,
    )


@router.post("/refresh", response_model=TokenOut)
def refresh(data: RefreshIn, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token, "refresh")
    try:
        user_id = int(payload["sub"])
    except (KeyError, ValueError, TypeError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token gecersiz")
    user = db.get(User, user_id)
    if not user or not user.aktif:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Kullanici yok veya pasif")
    return TokenOut(
        access_token=create_access(user.id, user.rol),
        refresh_token=create_refresh(user.id, user.rol),
        user_id=user.id, ad=user.ad, rol=user.rol,
    )


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return user


@router.post("/me/pin")
def kendi_pinim(
    data: PinDegistirIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if not verify_pin(data.eski_pin, user.pin_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Eski PIN hatali")
    if len(data.yeni_pin) < 4:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "PIN en az 4 karakter olmali")
    user.pin_hash = hash_pin(data.yeni_pin)
    audit(db, "pin_degistir", kullanici=user, request=request)
    db.commit()
    return {"ok": True}


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return db.execute(select(User).order_by(User.ad)).scalars().all()


@router.post("/users", response_model=UserOut)
def create_user(
    data: UserCreate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if db.execute(select(User).where(User.ad == data.ad)).scalar_one_or_none():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bu ad zaten kullanimda")
    if len(data.pin) < 4:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "PIN en az 4 karakter olmali")
    user = User(ad=data.ad, pin_hash=hash_pin(data.pin), rol=data.rol)
    db.add(user)
    db.flush()
    audit(db, "kullanici_yarat", kullanici=admin, kaynak_tip="user", kaynak_id=user.id,
          detay={"ad": user.ad, "rol": user.rol}, request=request)
    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(
    user_id: int,
    data: UserUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kullanici yok")
    degisen = {}
    if data.ad is not None and data.ad != u.ad:
        if db.execute(select(User).where(User.ad == data.ad)).scalar_one_or_none():
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Bu ad kullanimda")
        degisen["ad"] = [u.ad, data.ad]; u.ad = data.ad
    if data.rol is not None and data.rol != u.rol:
        degisen["rol"] = [u.rol, data.rol]; u.rol = data.rol
    if data.aktif is not None and data.aktif != u.aktif:
        degisen["aktif"] = [u.aktif, data.aktif]; u.aktif = data.aktif
    if degisen:
        audit(db, "kullanici_guncelle", kullanici=admin, kaynak_tip="user",
              kaynak_id=u.id, detay=degisen, request=request)
    db.commit()
    db.refresh(u)
    return u


@router.post("/users/{user_id}/pin-reset")
def pin_reset(
    user_id: int,
    yeni_pin: str = Body(..., embed=True),
    request: Request = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kullanici yok")
    if len(yeni_pin) < 4:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "PIN en az 4 karakter olmali")
    u.pin_hash = hash_pin(yeni_pin)
    audit(db, "pin_reset", kullanici=admin, kaynak_tip="user",
          kaynak_id=u.id, detay={"hedef": u.ad}, request=request)
    db.commit()
    return {"ok": True}


@router.delete("/users/{user_id}")
def delete_user(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Kendi hesabini silemezsin")
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Kullanici yok")
    u.aktif = False
    audit(db, "kullanici_pasif", kullanici=admin, kaynak_tip="user",
          kaynak_id=u.id, detay={"ad": u.ad}, request=request)
    db.commit()
    return {"ok": True}
