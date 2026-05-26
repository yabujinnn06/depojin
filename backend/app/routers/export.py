from io import BytesIO
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import SayimOturumu, Stok, Seri, User
from ..auth import current_user

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/{oturum_id}/excel")
def export_excel(oturum_id: int, db: Session = Depends(get_db), _: User = Depends(current_user)):
    oturum = db.get(SayimOturumu, oturum_id)
    if not oturum:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oturum yok")

    wb = Workbook()
    ws = wb.active
    ws.title = "StokVeri"
    ws.append(["Stok Kodu", "Urun Adi", "Seri No", "Sayildi", "Sayim Tarihi", "Kullanici", "Notlar"])

    stoklar = db.execute(
        select(Stok).where(Stok.oturum_id == oturum_id).order_by(Stok.stok_kodu)
    ).scalars().all()

    for stok in stoklar:
        ws.append([stok.stok_kodu, stok.urun_adi, "", "", "", "", ""])
        seriler = db.execute(
            select(Seri, User.ad)
            .outerjoin(User, User.id == Seri.sayan_id)
            .where(Seri.stok_id == stok.id)
            .order_by(Seri.seri_no)
        ).all()
        for seri, sayan in seriler:
            ws.append([
                "",
                "",
                seri.seri_no,
                1 if seri.sayildi else 0,
                seri.sayim_tarihi.strftime("%d.%m.%Y %H:%M:%S") if seri.sayim_tarihi else "",
                sayan or "",
                seri.notlar or "",
            ])

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    fname = f"sayim_{oturum.ad.replace(' ', '_')}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )
