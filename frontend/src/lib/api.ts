const BASE = import.meta.env.VITE_API_BASE ?? "";

export type User = { id: number; ad: string; rol: string; aktif: boolean };
export type Oturum = {
  id: number; ad: string; lokasyon: string | null;
  durum: string; baslangic: string; bitis: string | null;
};
export type StokOzet = {
  id: number; stok_kodu: string; urun_adi: string;
  toplam: number; sayilan: number; portal_sayim: number;
};
export type Tarama = {
  durum: "basarili" | "mukerrer" | "bulunamadi" | "cakisma" | "bos";
  mesaj: string; seri: string;
  stok_kodu?: string | null; urun_adi?: string | null;
  toplam?: number | null; sayilan?: number | null; kalan?: number | null;
  cakisan_stoklar?: string[] | null;
};
export type LogSatir = {
  id: number; zaman: string; seri_giris: string; durum: string;
  stok_kodu: string | null; urun_adi: string | null; aciklama: string | null;
  kullanici_ad: string | null;
};
export type Ozet = {
  toplam_seri: number; sayilan_seri: number; kalan_seri: number;
  stok_sayisi: number; son_islem: string | null;
};
export type LogSayfa = { toplam: number; items: LogSatir[] };
export type DurumSayim = { durum: string; sayi: number };
export type KullaniciIstatistik = {
  kullanici_id: number | null; ad: string;
  basarili: number; mukerrer: number; bulunamadi: number; cakisma: number;
  toplam_tarama: number; son_tarama: string | null;
};
export type DakikaSayim = { zaman: string; basarili: number; diger: number };
export type Istatistik = {
  durum_dagilimi: DurumSayim[];
  kullanici_basina: KullaniciIstatistik[];
  dakika_serisi: DakikaSayim[];
  ilk_tarama: string | null; son_tarama: string | null;
  tarama_dakika_dk: number;
};
export type EksikGrup = {
  stok_id: number; stok_kodu: string; urun_adi: string;
  toplam: number; sayilan: number; eksik: number;
  portal_sayim: number; seriler: string[];
};
export type LogFiltre = {
  durum?: string; kullanici_id?: number; q?: string;
  baslangic?: string; bitis?: string;
  limit?: number; offset?: number;
};
export type AuditSatir = {
  id: number; zaman: string;
  kullanici_ad: string | null;
  eylem: string; kaynak_tip: string | null; kaynak_id: string | null;
  ip: string | null; detay: Record<string, any> | null;
};

const TOKEN_KEY = "rw_token";
const REFRESH_KEY = "rw_refresh";

export function tokens() {
  return {
    access: localStorage.getItem(TOKEN_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
  };
}

export function setTokens(access: string | null, refresh: string | null = null) {
  if (access) localStorage.setItem(TOKEN_KEY, access);
  else localStorage.removeItem(TOKEN_KEY);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  else if (refresh === null && !access) localStorage.removeItem(REFRESH_KEY);
}

let refreshing: Promise<string | null> | null = null;
let onUnauth: () => void = () => {};
export function setOnUnauth(fn: () => void) { onUnauth = fn; }

async function tryRefresh(): Promise<string | null> {
  if (refreshing) return refreshing;
  const r = tokens().refresh;
  if (!r) return null;
  refreshing = (async () => {
    try {
      const resp = await fetch(BASE + "/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: r }),
      });
      if (!resp.ok) return null;
      const j = await resp.json();
      setTokens(j.access_token, j.refresh_token);
      return j.access_token as string;
    } catch { return null; }
    finally { refreshing = null; }
  })();
  return refreshing;
}

async function req<T>(path: string, opts: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = { ...(opts.headers as any) };
  if (!(opts.body instanceof FormData) && opts.body) headers["Content-Type"] = "application/json";
  const t = tokens().access;
  if (t) headers["Authorization"] = `Bearer ${t}`;
  const r = await fetch(BASE + path, { ...opts, headers });
  if (r.status === 401 && retry) {
    const yeni = await tryRefresh();
    if (yeni) {
      return req<T>(path, opts, false);
    }
    setTokens(null, null);
    onUnauth();
    throw new Error("Yetki gerekli, tekrar giris yap");
  }
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try { const j = await r.json(); msg = j.detail ?? msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (r.status === 204) return undefined as T;
  const ct = r.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return r.json() as Promise<T>;
  return undefined as T;
}

export const api = {
  login: (ad: string, pin: string) =>
    req<{ access_token: string; refresh_token: string; user_id: number; ad: string; rol: string }>(
      "/api/auth/login", { method: "POST", body: JSON.stringify({ ad, pin }) }, false
    ),
  me: () => req<User>("/api/auth/me"),
  kendiPinim: (eski_pin: string, yeni_pin: string) =>
    req<{ ok: boolean }>("/api/auth/me/pin", { method: "POST", body: JSON.stringify({ eski_pin, yeni_pin }) }),
  users: () => req<User[]>("/api/auth/users"),
  createUser: (ad: string, pin: string, rol: string) =>
    req<User>("/api/auth/users", { method: "POST", body: JSON.stringify({ ad, pin, rol }) }),
  updateUser: (id: number, data: Partial<Pick<User, "ad" | "rol" | "aktif">>) =>
    req<User>(`/api/auth/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  pinReset: (id: number, yeni_pin: string) =>
    req<{ ok: boolean }>(`/api/auth/users/${id}/pin-reset`, { method: "POST", body: JSON.stringify({ yeni_pin }) }),
  silUser: (id: number) =>
    req<{ ok: boolean }>(`/api/auth/users/${id}`, { method: "DELETE" }),

  oturumlar: (arsiv = false) => req<Oturum[]>(`/api/sayim?arsiv=${arsiv}`),
  yeniOturum: (ad: string, lokasyon: string) =>
    req<Oturum>("/api/sayim", { method: "POST", body: JSON.stringify({ ad, lokasyon }) }),
  oturum: (id: number) => req<Oturum>(`/api/sayim/${id}`),
  oturumOzet: (id: number) => req<Ozet>(`/api/sayim/${id}/ozet`),
  oturumStoklar: (id: number) => req<StokOzet[]>(`/api/sayim/${id}/stoklar`),
  oturumLog: (id: number, limit = 50) => req<LogSatir[]>(`/api/sayim/${id}/log?limit=${limit}`),
  oturumBitir: (id: number) => req<Oturum>(`/api/sayim/${id}/bitir`, { method: "POST" }),
  oturumArsivle: (id: number) => req<Oturum>(`/api/sayim/${id}/arsivle`, { method: "POST" }),
  oturumSil: (id: number) => req<{ ok: boolean }>(`/api/sayim/${id}`, { method: "DELETE" }),

  tara: (oturum_id: number, seri: string) =>
    req<Tarama>("/api/tarama", { method: "POST", body: JSON.stringify({ oturum_id, seri }) }),

  excelYukle: (oturum_id: number, file: File, devam = false) => {
    const fd = new FormData();
    fd.append("file", file);
    return req<{
      sayfa: string; eklenen_stok: number; eklenen_seri: number;
      mukerrer_seri: number; atlanan_junk_header: number; bos_satir: number;
      devam_modu: boolean; onceden_sayilan_olarak_isaretlenen: number;
    }>(`/api/import/${oturum_id}/stok-excel?devam=${devam}`, { method: "POST", body: fd });
  },

  excelIndir: (oturum_id: number) => {
    const t = tokens().access;
    return fetch(BASE + `/api/export/${oturum_id}/excel`, {
      headers: t ? { Authorization: `Bearer ${t}` } : {}
    }).then(r => r.blob());
  },

  logFiltre: (oturum_id: number, f: LogFiltre = {}) => {
    const p = new URLSearchParams();
    if (f.durum) p.set("durum", f.durum);
    if (f.kullanici_id != null) p.set("kullanici_id", String(f.kullanici_id));
    if (f.q) p.set("q", f.q);
    if (f.baslangic) p.set("baslangic", f.baslangic);
    if (f.bitis) p.set("bitis", f.bitis);
    p.set("limit", String(f.limit ?? 100));
    p.set("offset", String(f.offset ?? 0));
    return req<LogSayfa>(`/api/sayim/${oturum_id}/log-filtre?${p.toString()}`);
  },
  istatistik: (oturum_id: number) => req<Istatistik>(`/api/sayim/${oturum_id}/istatistik`),
  eksik: (oturum_id: number) => req<EksikGrup[]>(`/api/sayim/${oturum_id}/eksik?limit_seri=50`),
  logExcel: (oturum_id: number) => {
    const t = tokens().access;
    return fetch(BASE + `/api/sayim/${oturum_id}/log/excel`, {
      headers: t ? { Authorization: `Bearer ${t}` } : {}
    }).then(r => r.blob());
  },

  audit: (eylem?: string, kullanici_id?: number, limit = 100, offset = 0) => {
    const p = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (eylem) p.set("eylem", eylem);
    if (kullanici_id != null) p.set("kullanici_id", String(kullanici_id));
    return req<{ toplam: number; items: AuditSatir[] }>(`/api/admin/audit?${p.toString()}`);
  },
};
