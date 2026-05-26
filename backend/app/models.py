from datetime import datetime
from sqlalchemy import String, Integer, DateTime, ForeignKey, Boolean, Text, UniqueConstraint, Index, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    ad: Mapped[str] = mapped_column(String(80))
    pin_hash: Mapped[str] = mapped_column(String(200))
    rol: Mapped[str] = mapped_column(String(20), default="sayan")
    aktif: Mapped[bool] = mapped_column(Boolean, default=True)
    olusturma: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class SayimOturumu(Base):
    __tablename__ = "sayim_oturumlari"

    id: Mapped[int] = mapped_column(primary_key=True)
    ad: Mapped[str] = mapped_column(String(120))
    lokasyon: Mapped[str | None] = mapped_column(String(80), nullable=True)
    durum: Mapped[str] = mapped_column(String(20), default="aktif")
    baslangic: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    bitis: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    olusturan_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    stoklar: Mapped[list["Stok"]] = relationship(back_populates="oturum", cascade="all, delete-orphan")
    taramalar: Mapped[list["TaramaLog"]] = relationship(back_populates="oturum", cascade="all, delete-orphan")


class Stok(Base):
    __tablename__ = "stoklar"
    __table_args__ = (
        UniqueConstraint("oturum_id", "stok_kodu", name="uq_stok_oturum_kod"),
        Index("ix_stok_oturum", "oturum_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    oturum_id: Mapped[int] = mapped_column(ForeignKey("sayim_oturumlari.id"))
    stok_kodu: Mapped[str] = mapped_column(String(80))
    urun_adi: Mapped[str] = mapped_column(String(200))
    portal_sayim: Mapped[int] = mapped_column(Integer, default=0)
    sonradan_eklendi: Mapped[bool] = mapped_column(Boolean, default=False)
    olusturma: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    oturum: Mapped[SayimOturumu] = relationship(back_populates="stoklar")
    seriler: Mapped[list["Seri"]] = relationship(back_populates="stok", cascade="all, delete-orphan")


class Seri(Base):
    __tablename__ = "seriler"
    __table_args__ = (
        UniqueConstraint("oturum_id", "stok_id", "seri_no", name="uq_seri_oturum_stok_no"),
        Index("ix_seri_oturum_norm", "oturum_id", "seri_no_norm"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    oturum_id: Mapped[int] = mapped_column(ForeignKey("sayim_oturumlari.id"))
    stok_id: Mapped[int] = mapped_column(ForeignKey("stoklar.id"))
    seri_no: Mapped[str] = mapped_column(String(120))
    seri_no_norm: Mapped[str] = mapped_column(String(120))
    sayildi: Mapped[bool] = mapped_column(Boolean, default=False)
    sayim_tarihi: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sayan_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    notlar: Mapped[str | None] = mapped_column(Text, nullable=True)
    sonradan_eklendi: Mapped[bool] = mapped_column(Boolean, default=False)

    cikis_zaman: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cikis_kullanici_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    cikis_notu: Mapped[str | None] = mapped_column(Text, nullable=True)

    zimmet_kullanici_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    zimmet_zaman: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    zimmet_notu: Mapped[str | None] = mapped_column(Text, nullable=True)

    stok: Mapped[Stok] = relationship(back_populates="seriler")
    sayan: Mapped[User | None] = relationship(foreign_keys=[sayan_id])


class TaramaLog(Base):
    __tablename__ = "tarama_loglari"
    __table_args__ = (Index("ix_log_oturum_zaman", "oturum_id", "zaman"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    oturum_id: Mapped[int] = mapped_column(ForeignKey("sayim_oturumlari.id"))
    zaman: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    kullanici_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    seri_giris: Mapped[str] = mapped_column(String(160))
    durum: Mapped[str] = mapped_column(String(20))
    stok_kodu: Mapped[str | None] = mapped_column(String(80), nullable=True)
    urun_adi: Mapped[str | None] = mapped_column(String(200), nullable=True)
    aciklama: Mapped[str | None] = mapped_column(Text, nullable=True)

    oturum: Mapped[SayimOturumu] = relationship(back_populates="taramalar")
    kullanici: Mapped[User | None] = relationship()


class AuditLog(Base):
    __tablename__ = "audit_loglari"
    __table_args__ = (
        Index("ix_audit_zaman", "zaman"),
        Index("ix_audit_kullanici", "kullanici_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    zaman: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    kullanici_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    kullanici_ad: Mapped[str | None] = mapped_column(String(80), nullable=True)
    eylem: Mapped[str] = mapped_column(String(60))
    kaynak_tip: Mapped[str | None] = mapped_column(String(40), nullable=True)
    kaynak_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    detay: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class LoginDeneme(Base):
    __tablename__ = "login_denemeleri"
    __table_args__ = (Index("ix_login_ad_zaman", "ad", "zaman"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    ad: Mapped[str] = mapped_column(String(80))
    ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    basarili: Mapped[bool] = mapped_column(Boolean, default=False)
    zaman: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
