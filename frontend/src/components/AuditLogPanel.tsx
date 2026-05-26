import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogIn, UserPlus, UserCog, UserX, Key, Plus, Square, Archive, Trash2,
  PackagePlus, ScanLine, LogOut as LogOutIcon, UserCheck, Undo2, Activity,
  Search, Download, ChevronDown, ChevronLeft, ChevronRight, X, History,
} from "lucide-react";
import { api, AuditSatir, User } from "../lib/api";
import { useToast } from "../lib/toast";
import { cn } from "../lib/cn";

const EYLEM_CFG: Record<string, { icon: any; renk: string; etiket: string }> = {
  login:               { icon: LogIn,        renk: "text-good",   etiket: "Giris" },
  pin_degistir:        { icon: Key,          renk: "text-deep",   etiket: "PIN degistir (kendi)" },
  pin_reset:           { icon: Key,          renk: "text-warn",   etiket: "PIN sifirla" },
  kullanici_yarat:     { icon: UserPlus,     renk: "text-good",   etiket: "Kullanici yarat" },
  kullanici_guncelle:  { icon: UserCog,      renk: "text-deep",   etiket: "Kullanici guncelle" },
  kullanici_pasif:     { icon: UserX,        renk: "text-bad",    etiket: "Kullanici pasif" },
  oturum_yarat:        { icon: Plus,         renk: "text-accent", etiket: "Oturum yarat" },
  oturum_bitir:        { icon: Square,       renk: "text-deep",   etiket: "Oturum bitir" },
  oturum_arsivle:      { icon: Archive,      renk: "text-deep",   etiket: "Oturum arsivle" },
  oturum_sil:          { icon: Trash2,       renk: "text-bad",    etiket: "Oturum sil" },
  stok_ekle:           { icon: PackagePlus,  renk: "text-accent", etiket: "Stok ekle" },
  seri_ekle:           { icon: ScanLine,     renk: "text-accent", etiket: "Seri ekle" },
  toplu_giris:         { icon: PackagePlus,  renk: "text-accent", etiket: "Toplu giris" },
  toplu_cikis:         { icon: LogOutIcon,   renk: "text-bad",    etiket: "Toplu cikis" },
  toplu_zimmet:        { icon: UserCheck,    renk: "text-warn",   etiket: "Toplu zimmet" },
  toplu_iade:          { icon: Undo2,        renk: "text-deep",   etiket: "Toplu iade" },
};

const PALET = ["#BF6F34", "#7FB3E0", "#5FBE7A", "#F4B183", "#9B7EBD", "#D27A8B", "#3D9CA3", "#C9A659"];

function kullaniciRengi(ad: string | null): string {
  if (!ad) return "#9AA4B2";
  let h = 0;
  for (let i = 0; i < ad.length; i++) h = (h * 31 + ad.charCodeAt(i)) >>> 0;
  return PALET[h % PALET.length];
}

function eylemBadge(eylem: string) {
  const c = EYLEM_CFG[eylem];
  if (!c) return { icon: Activity, renk: "text-ink/60", etiket: eylem };
  return c;
}

function gunGrubu(rows: AuditSatir[]): { gun: string; items: AuditSatir[] }[] {
  const map = new Map<string, AuditSatir[]>();
  for (const r of rows) {
    const g = new Date(r.zaman).toLocaleDateString("tr-TR");
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(r);
  }
  return Array.from(map.entries()).map(([gun, items]) => ({ gun, items }));
}

const SAYFA = 50;

type Props = { users: User[] };

export default function AuditLogPanel({ users }: Props) {
  const toast = useToast();
  const [rows, setRows] = useState<AuditSatir[]>([]);
  const [toplam, setToplam] = useState(0);
  const [eylemler, setEylemler] = useState<{ eylem: string; sayi: number }[]>([]);
  const [oturumlar, setOturumlar] = useState<{ id: number; ad: string; durum: string }[]>([]);

  const [eylem, setEylem] = useState("");
  const [kullaniciId, setKullaniciId] = useState<number | "">("");
  const [oturumId, setOturumId] = useState<number | "">("");
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");
  const [q, setQ] = useState("");
  const [sayfa, setSayfa] = useState(0);
  const [acikSatir, setAcikSatir] = useState<number | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    api.auditEylemler().then(setEylemler).catch(() => {});
    api.auditOturumlar().then(setOturumlar).catch(() => {});
  }, []);

  async function yukle() {
    setYukleniyor(true);
    try {
      const r = await api.auditFiltre({
        eylem: eylem || undefined,
        kullanici_id: kullaniciId === "" ? undefined : Number(kullaniciId),
        oturum_id: oturumId === "" ? undefined : Number(oturumId),
        baslangic: baslangic ? new Date(baslangic).toISOString() : undefined,
        bitis: bitis ? new Date(bitis).toISOString() : undefined,
        q: q.trim() || undefined,
        limit: SAYFA, offset: sayfa * SAYFA,
      });
      setRows(r.items); setToplam(r.toplam);
    } catch (e: any) {
      toast.push("err", e.message);
    } finally { setYukleniyor(false); }
  }

  useEffect(() => { setSayfa(0); }, [eylem, kullaniciId, oturumId, baslangic, bitis, q]);
  useEffect(() => { yukle(); }, [eylem, kullaniciId, oturumId, baslangic, bitis, q, sayfa]);

  const maxSayfa = Math.max(0, Math.ceil(toplam / SAYFA) - 1);
  const gruplu = useMemo(() => gunGrubu(rows), [rows]);

  function filtreleri_temizle() {
    setEylem(""); setKullaniciId(""); setOturumId("");
    setBaslangic(""); setBitis(""); setQ("");
  }

  async function excelIndir() {
    try {
      const blob = await api.auditExcel({
        eylem: eylem || undefined,
        kullanici_id: kullaniciId === "" ? undefined : Number(kullaniciId),
        oturum_id: oturumId === "" ? undefined : Number(oturumId),
        baslangic: baslangic ? new Date(baslangic).toISOString() : undefined,
        bitis: bitis ? new Date(bitis).toISOString() : undefined,
        q: q.trim() || undefined,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      a.download = `audit_log_${new Date().toISOString().slice(0,10)}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.push("ok", "Excel indirildi");
    } catch (e: any) { toast.push("err", e.message); }
  }

  const aktifFiltreSayisi = [eylem, kullaniciId, oturumId, baslangic, bitis, q.trim()].filter(Boolean).length;

  return (
    <section className="card overflow-hidden">
      <div className="px-4 py-2.5 bg-deep text-white flex items-center gap-2 flex-wrap">
        <History size={16} />
        <span className="text-sm font-semibold tracking-wide">AUDIT LOG</span>
        <span className="text-xs opacity-70 font-mono">{toplam.toLocaleString("tr-TR")} kayit</span>
        {aktifFiltreSayisi > 0 && (
          <button onClick={filtreleri_temizle}
            className="text-[10px] px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 flex items-center gap-1">
            <X size={11} /> {aktifFiltreSayisi} filtre
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={excelIndir}
            className="text-xs px-2.5 py-1 rounded-md bg-accent hover:bg-accent/90 flex items-center gap-1">
            <Download size={13} /> Excel
          </button>
        </div>
      </div>

      <div className="px-3 py-2.5 border-b border-edge/40 bg-cream/40">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <select value={eylem} onChange={e => setEylem(e.target.value)}
            className="px-2 py-1.5 rounded-md border border-edge bg-white">
            <option value="">Tum eylem ({eylemler.reduce((a,b)=>a+b.sayi,0)})</option>
            {eylemler.map(e => {
              const c = EYLEM_CFG[e.eylem];
              return <option key={e.eylem} value={e.eylem}>{c?.etiket ?? e.eylem} ({e.sayi})</option>;
            })}
          </select>
          <select value={kullaniciId === "" ? "" : String(kullaniciId)}
            onChange={e => setKullaniciId(e.target.value === "" ? "" : Number(e.target.value))}
            className="px-2 py-1.5 rounded-md border border-edge bg-white">
            <option value="">Tum kullanici</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.ad}</option>)}
          </select>
          <select value={oturumId === "" ? "" : String(oturumId)}
            onChange={e => setOturumId(e.target.value === "" ? "" : Number(e.target.value))}
            className="px-2 py-1.5 rounded-md border border-edge bg-white">
            <option value="">Tum oturum</option>
            {oturumlar.map(o => <option key={o.id} value={o.id}>{o.ad} ({o.durum})</option>)}
          </select>
          <input type="datetime-local" value={baslangic} onChange={e => setBaslangic(e.target.value)}
            className="px-2 py-1.5 rounded-md border border-edge bg-white" />
          <input type="datetime-local" value={bitis} onChange={e => setBitis(e.target.value)}
            className="px-2 py-1.5 rounded-md border border-edge bg-white" />
          <label className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-ink/45" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="arama..."
              className="w-full pl-7 pr-2 py-1.5 rounded-md border border-edge bg-white" />
          </label>
        </div>
      </div>

      <div className="max-h-[640px] overflow-auto">
        {yukleniyor && rows.length === 0 ? (
          <div className="p-8 text-center text-ink/55">Yukleniyor...</div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-ink/55">Eslesen kayit yok.</div>
        ) : gruplu.map(grup => (
          <div key={grup.gun}>
            <div className="px-3 py-1.5 bg-cream/80 sticky top-0 z-10 backdrop-blur text-[10px] uppercase tracking-[0.18em] text-ink/55 font-bold border-b border-edge/40">
              {grup.gun} <span className="text-ink/40 font-mono">· {grup.items.length} kayit</span>
            </div>
            <AnimatePresence initial={false}>
              {grup.items.map(a => {
                const b = eylemBadge(a.eylem);
                const Ikon = b.icon;
                const acik = acikSatir === a.id;
                const renk = kullaniciRengi(a.kullanici_ad);
                return (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="border-b border-edge/30"
                  >
                    <button onClick={() => setAcikSatir(acik ? null : a.id)}
                      className="w-full text-left p-2.5 hover:bg-cream/70 transition flex items-center gap-3">
                      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full shrink-0"
                        style={{ backgroundColor: renk }}>
                        <span className="text-white text-[10px] font-bold">
                          {(a.kullanici_ad ?? "?").slice(0, 1).toUpperCase()}
                        </span>
                      </span>
                      <span className="font-mono text-xs text-ink/65 w-20 shrink-0">
                        {new Date(a.zaman).toLocaleTimeString("tr-TR")}
                      </span>
                      <span className={cn("flex items-center gap-1 shrink-0", b.renk)}>
                        <Ikon size={14} />
                        <span className="text-xs font-semibold whitespace-nowrap">{b.etiket}</span>
                      </span>
                      <span className="flex-1 min-w-0 text-sm truncate">
                        <b className="text-ink">{a.kullanici_ad ?? "?"}</b>
                        {a.kaynak_tip && (
                          <span className="text-ink/55 ml-1.5 font-mono text-xs">
                            {a.kaynak_tip}#{a.kaynak_id}
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-ink/45 font-mono shrink-0 hidden sm:inline">{a.ip ?? "-"}</span>
                      <ChevronDown size={14} className={cn("text-ink/40 transition-transform shrink-0", acik && "rotate-180")} />
                    </button>
                    {acik && a.detay && (
                      <motion.pre
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        className="px-3 pb-3 pl-12 text-[11px] font-mono text-ink/75 whitespace-pre-wrap break-words bg-cream/40"
                      >
{JSON.stringify(a.detay, null, 2)}
                      </motion.pre>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="px-3 py-2 flex items-center gap-3 text-xs border-t border-edge/40 bg-cream/40">
        <span className="text-ink/65 font-mono">
          {toplam > 0 ? `${sayfa * SAYFA + 1}-${Math.min((sayfa + 1) * SAYFA, toplam)} / ${toplam.toLocaleString("tr-TR")}` : "0"}
        </span>
        <div className="flex-1" />
        <button disabled={sayfa <= 0} onClick={() => setSayfa(s => Math.max(0, s - 1))}
          className="px-2 py-1 rounded-md bg-card border border-edge hover:bg-cream disabled:opacity-40 flex items-center gap-1">
          <ChevronLeft size={14} /> Onceki
        </button>
        <button disabled={sayfa >= maxSayfa} onClick={() => setSayfa(s => Math.min(maxSayfa, s + 1))}
          className="px-2 py-1 rounded-md bg-card border border-edge hover:bg-cream disabled:opacity-40 flex items-center gap-1">
          Sonraki <ChevronRight size={14} />
        </button>
      </div>
    </section>
  );
}
