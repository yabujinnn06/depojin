# Rainwater Sayim

Excel VBA macro sisteminin internet-erisimli halefi. Coklu kullanici, mobil + USB barkod, canli senkron, audit, refresh token auth, PWA.

## Stack

- **Backend**: FastAPI + SQLAlchemy + Alembic + Postgres (prod) / SQLite (dev)
- **Frontend**: React + Vite + TypeScript + Tailwind + Magic UI tarzi component'ler (framer-motion)
- **Realtime**: WebSocket, otomatik reconnect (exp backoff)
- **Barkod**: USB HID + kamera (html5-qrcode)
- **Auth**: PIN + JWT (24h access + 30g refresh) + login rate limit
- **Deploy**: Render (1 web + 1 Postgres + persistent build)
- **PWA**: manifest + shell SW (offline shell)

## Klasor

```
backend/
  app/
    main.py        app + alembic auto-upgrade + security headers + health/ready
    config.py      pydantic-settings (DATABASE_URL, JWT_SECRET, ADMIN_PIN, ...)
    database.py    engine + session
    models.py      User, SayimOturumu, Stok, Seri, TaramaLog, AuditLog, LoginDeneme
    schemas.py
    auth.py        access+refresh JWT + bcrypt PIN + require_admin + client_ip
    audit.py       audit(db, eylem, ...) helper
    ratelimit.py   login rate limit (5 yanlis / 5dk)
    middleware.py  GuvenlikBaslikleri (HSTS, X-Frame, nosniff, referrer, permissions)
    ws.py          WSManager (room=oturum_id)
    utils.py       normalize_seri, candidate_seri_keys, junk header skip
    routers/
      auth.py      login/refresh/me/pin + users CRUD + admin reset
      sayim.py     oturum CRUD + bitir/arsivle/sil + ozet/stoklar/log
      tarama.py    POST tarama + WS endpoint
      rapor.py     log-filtre + istatistik + eksik + log/excel
      import_excel.py  Excel import (auto-sheet detect, junk skip, devam modu)
      export.py    Sayim Excel export
      admin.py     audit log listele
  alembic/         migrations (initial: dbc4f2d9c299)
  requirements.txt
  run.ps1 / run.sh

frontend/
  src/
    main.tsx       ErrorBoundary + ToastSaglayici + AuthProvider + SW register
    App.tsx
    lib/
      api.ts       fetch + 401 -> refresh -> retry + setTokens
      auth.tsx     AuthProvider + useAuth + onUnauth callback
      ws.ts        SayimWS class with exp backoff reconnect
      toast.tsx    Toast + ToastSaglayici + useToast
      sound.ts, cn.ts
    pages/
      Login.tsx, Oturumlar.tsx, Sayim.tsx, Rapor.tsx, Admin.tsx
    components/
      Layout, BarkodInput, KameraTarayici, DurumKarti,
      StokListesi, TerminalFeed, CanliAkis, StatCard, ErrorBoundary
      magic/ (BorderBeam, MagicCard, ShimmerButton, ShineCard, AnimatedGradientText,
              Marquee, BlurFade, AnimatedList, AnimatedBeam, DotPattern, Ripple)
      rapor/ (DurumDonut, HizChart, KullaniciKartlari, LogTablo, EksikListe)
      ui/ (NumberTicker, ProgressBar, ScanPulse, ...)
  public/
    manifest.webmanifest, sw.js, icon.svg
  vite.config.ts (5173 dev, /api proxy)
  tailwind.config.js

render.yaml      Render Blueprint (1 web + 1 basic-256mb Postgres)
```

## Lokal calistirma

### Backend

```powershell
cd backend
copy .env.example .env
.\run.ps1
```

`http://localhost:8000`. SQLite `backend/rainwater.db`. Alembic ilk startup'ta migration uygular.
Default admin: `admin` / `1234` (env'den `ADMIN_PIN` ile degistir).

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

`http://localhost:5173`. `/api/*` proxy ile backend'e gider.

### Yeni migration olustur

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
alembic revision --autogenerate -m "aciklama"
# olusan dosyayi gozden gecir, sonra:
alembic upgrade head
```

## Production deploy (Render)

### 1. GitHub'a push

```bash
cd /c/tmp/rainwater-sayim
git init -b main
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<user>/rainwater-sayim.git
git push -u origin main
```

### 2. Render'da Blueprint

1. Render dashboard -> **New** -> **Blueprint**
2. Repo'yu sec
3. `render.yaml` otomatik tespit edilir; tek "Apply" tikla
4. Olusturulanlar:
   - `rainwater-sayim` (web service, starter $7/ay)
   - `rainwater-db` (basic-256mb Postgres)
5. Web service environment ekraninda:
   - `ADMIN_PIN` -> guclu PIN gir (manuel)
   - `CORS_ORIGINS` -> deploy URL'ini ekle (orn `https://rainwater-sayim.onrender.com`)
   - `JWT_SECRET` -> Render generateValue ile otomatik dolar
6. Deploy bitince:
   - Frontend ve API ayni URL'de
   - `/api/ready` -> DB durumu OK
   - `https://<url>` -> Login

### 3. Ilk giris

- `admin` / `<ADMIN_PIN>`
- Yeni kullanici ekle (Admin paneli)
- Excel import (Admin -> Stok Yukle)
- Sayim ekraninda barkod tara

### 4. Domain (opsiyonel)

Render -> Settings -> Custom Domain ekle, DNS CNAME.

## API ozet

| Yontem | Path | Aciklama |
|--------|------|----------|
| POST | `/api/auth/login` | PIN + access + refresh token |
| POST | `/api/auth/refresh` | Refresh -> yeni access |
| GET  | `/api/auth/me` | Mevcut kullanici |
| POST | `/api/auth/me/pin` | Kendi PIN'ini degistir |
| GET/POST | `/api/auth/users` | (admin) liste + yarat |
| PATCH | `/api/auth/users/{id}` | (admin) ad/rol/aktif guncelle |
| POST | `/api/auth/users/{id}/pin-reset` | (admin) PIN sifirla |
| DELETE | `/api/auth/users/{id}` | (admin) pasif yap |
| GET/POST | `/api/sayim` | Oturumlar / yeni |
| POST | `/api/sayim/{id}/bitir` | Kapat |
| POST | `/api/sayim/{id}/arsivle` | Arsivle |
| DELETE | `/api/sayim/{id}` | Sil (kalici) |
| GET  | `/api/sayim/{id}/ozet` | Sayim ozeti |
| GET  | `/api/sayim/{id}/stoklar` | Stok listesi |
| GET  | `/api/sayim/{id}/log` | Son taramalar |
| GET  | `/api/sayim/{id}/log-filtre` | Filtreli paginated log |
| GET  | `/api/sayim/{id}/istatistik` | Durum dagilimi + kullanici basina + hiz |
| GET  | `/api/sayim/{id}/eksik` | Sayilmamis seriler |
| GET  | `/api/sayim/{id}/log/excel` | Log Excel |
| GET  | `/api/export/{id}/excel` | Sayim Excel |
| POST | `/api/import/{id}/stok-excel` | (admin) Excel yukle |
| POST | `/api/tarama` | Bir seri tara |
| WS   | `/api/ws/sayim/{id}` | Canli broadcast |
| GET  | `/api/admin/audit` | (admin) Audit log |
| GET  | `/api/health` | Liveness |
| GET  | `/api/ready` | DB ping |

## Guvenlik

- PIN bcrypt hash (passlib).
- JWT 24h access + 30g refresh; access tek tipte, refresh ayri claim.
- Login rate limit: 5 yanlis girisin ardindan 5 dakika kilit (per kullanici-adi).
- Audit log: login, kullanici_yarat, kullanici_guncelle, kullanici_pasif, pin_reset, pin_degistir, oturum_yarat, oturum_bitir, oturum_arsivle, oturum_sil.
- Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy, HSTS (https'de).
- CORS: env'den whitelist; wildcard sadece dev'de.
- WebSocket reconnect: client tarafinda exp backoff (1s -> 15s tavan).

## Tarama durumlari

- `basarili` - seri ilk defa sayildi
- `mukerrer` - daha once sayilmis
- `bulunamadi` - listede yok
- `cakisma` - ayni seri birden cok stokta
- `bos` - bos giris

## Henuz yok

- Backup endpoint (Render otomatik backup zaten var)
- 2FA (PIN tek faktor; ihtiyac olursa eklenecek)
- Cok dilli (sadece TR)
- Offline scan queue (PWA shell var ama scan endpoint cache yok)
- Stok bazli notlar duzenleme UI (DB destekliyor)
