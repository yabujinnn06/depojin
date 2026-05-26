from datetime import datetime
from pydantic import BaseModel, ConfigDict


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    user_id: int
    ad: str
    rol: str


class RefreshIn(BaseModel):
    refresh_token: str


class LoginIn(BaseModel):
    ad: str
    pin: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ad: str
    rol: str
    aktif: bool


class UserCreate(BaseModel):
    ad: str
    pin: str
    rol: str = "sayan"


class UserUpdate(BaseModel):
    ad: str | None = None
    rol: str | None = None
    aktif: bool | None = None


class PinDegistirIn(BaseModel):
    eski_pin: str
    yeni_pin: str


class OturumOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ad: str
    lokasyon: str | None
    durum: str
    baslangic: datetime
    bitis: datetime | None


class OturumCreate(BaseModel):
    ad: str
    lokasyon: str | None = None


class StokOzet(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    stok_kodu: str
    urun_adi: str
    toplam: int
    sayilan: int
    portal_sayim: int
    sonradan_eklendi: bool = False


class TaramaIn(BaseModel):
    oturum_id: int
    seri: str


class TaramaOut(BaseModel):
    durum: str
    mesaj: str
    seri: str
    stok_kodu: str | None = None
    urun_adi: str | None = None
    toplam: int | None = None
    sayilan: int | None = None
    kalan: int | None = None
    portal_sayim: int | None = None
    portal_fark: int | None = None
    cakisan_stoklar: list[str] | None = None


class LogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    zaman: datetime
    seri_giris: str
    durum: str
    stok_kodu: str | None
    urun_adi: str | None
    aciklama: str | None
    kullanici_ad: str | None = None


class OzetOut(BaseModel):
    toplam_seri: int
    sayilan_seri: int
    kalan_seri: int
    stok_sayisi: int
    portal_toplam: int
    portal_fark: int
    son_islem: datetime | None


class LogSayfaOut(BaseModel):
    toplam: int
    items: list[LogOut]


class DurumSayim(BaseModel):
    durum: str
    sayi: int


class KullaniciIstatistik(BaseModel):
    kullanici_id: int | None
    ad: str
    basarili: int
    mukerrer: int
    bulunamadi: int
    cakisma: int
    toplam_tarama: int
    son_tarama: datetime | None


class DakikaSayim(BaseModel):
    zaman: datetime
    basarili: int
    diger: int


class IstatistikOut(BaseModel):
    durum_dagilimi: list[DurumSayim]
    kullanici_basina: list[KullaniciIstatistik]
    dakika_serisi: list[DakikaSayim]
    ilk_tarama: datetime | None
    son_tarama: datetime | None
    tarama_dakika_dk: float


class EksikSeri(BaseModel):
    seri_id: int
    seri_no: str
    stok_kodu: str
    urun_adi: str


class EksikGrupOut(BaseModel):
    stok_id: int
    stok_kodu: str
    urun_adi: str
    toplam: int
    sayilan: int
    eksik: int
    portal_sayim: int
    seriler: list[str]
