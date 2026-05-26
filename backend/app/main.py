import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from alembic import command
from alembic.config import Config as AlembicConfig
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy import select, text

from .config import settings
from .database import Base, engine, SessionLocal
from .models import User
from .auth import hash_pin
from .middleware import GuvenlikBaslikleri
from .routers import auth as auth_router
from .routers import sayim as sayim_router
from .routers import tarama as tarama_router
from .routers import import_excel as import_router
from .routers import export as export_router
from .routers import rapor as rapor_router
from .routers import admin as admin_router


log = logging.getLogger("rainwater")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)


def _migrate() -> None:
    cfg_path = Path(__file__).resolve().parent.parent / "alembic.ini"
    if not cfg_path.exists():
        log.warning("alembic.ini bulunamadi, create_all fallback")
        Base.metadata.create_all(bind=engine)
        return
    cfg = AlembicConfig(str(cfg_path))
    cfg.set_main_option("sqlalchemy.url", settings.database_url)
    cfg.set_main_option("script_location", str(cfg_path.parent / "alembic"))
    try:
        command.upgrade(cfg, "head")
        log.info("alembic migrations uygulandi")
    except Exception as e:
        log.error("alembic migration hatasi: %s", e)
        log.warning("create_all fallback ile devam ediliyor")
        Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _migrate()
    db = SessionLocal()
    try:
        var = db.execute(select(User).where(User.ad == "admin")).scalar_one_or_none()
        if not var:
            db.add(User(ad="admin", pin_hash=hash_pin(settings.admin_pin), rol="admin"))
            db.commit()
            log.info("ilk admin kullanicisi olusturuldu")
    finally:
        db.close()
    yield


app = FastAPI(title="Rainwater Sayim", lifespan=lifespan, docs_url="/api/docs", redoc_url=None, openapi_url="/api/openapi.json")

origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()] or ["*"]
allow_creds = origins != ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_creds,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GuvenlikBaslikleri)

app.include_router(auth_router.router)
app.include_router(sayim_router.router)
app.include_router(tarama_router.router)
app.include_router(import_router.router)
app.include_router(export_router.router)
app.include_router(rapor_router.router)
app.include_router(admin_router.router)


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/ready")
def ready():
    try:
        with engine.connect() as c:
            c.execute(text("SELECT 1"))
        return {"ok": True, "db": "up"}
    except Exception as e:
        return {"ok": False, "db": str(e)}


if settings.static_dir and os.path.isdir(settings.static_dir):
    static_path = settings.static_dir
    assets = os.path.join(static_path, "assets")
    if os.path.isdir(assets):
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        index = os.path.join(static_path, "index.html")
        return FileResponse(index)
