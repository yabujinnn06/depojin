import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Search, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { api, KullaniciIstatistik, LogSatir } from "../../lib/api";
import { cn } from "../../lib/cn";

const PAGE = 50;

const durumRengi: Record<string, string> = {
  basarili: "bg-good/20 text-good border-good/30",
  mukerrer: "bg-warn/20 text-warn border-warn/40",
  bulunamadi: "bg-bad/20 text-bad border-bad/30",
  cakisma: "bg-warn/30 text-warn border-warn/50",
};

const durumKisa: Record<string, string> = {
  basarili: "OK",
  mukerrer: "DUP",
  bulunamadi: "404",
  cakisma: "CONF",
};

type Props = { oturumId: number; kullanicilar: KullaniciIstatistik[] };

export default function LogTablo({ oturumId, kullanicilar }: Props) {
  const [rows, setRows] = useState<LogSatir[]>([]);
  const [toplam, setToplam] = useState(0);
  const [durum, setDurum] = useState<string>("");
  const [kullaniciId, setKullaniciId] = useState<number | "">("");
  const [q, setQ] = useState("");
  const [sayfa, setSayfa] = useState(0);
  const [yukleniyor, setYukleniyor] = useState(false);

  async function yukle() {
    setYukleniyor(true);
    try {
      const r = await api.logFiltre(oturumId, {
        durum: durum || undefined,
        kullanici_id: kullaniciId === "" ? undefined : Number(kullaniciId),
        q: q.trim() || undefined,
        limit: PAGE,
        offset: sayfa * PAGE,
      });
      setRows(r.items);
      setToplam(r.toplam);
    } finally {
      setYukleniyor(false);
    }
  }

  useEffect(() => { setSayfa(0); }, [durum, kullaniciId, q]);
  useEffect(() => { yukle(); }, [oturumId, durum, kullaniciId, q, sayfa]);

  const maxSayfa = Math.max(0, Math.ceil(toplam / PAGE) - 1);

  async function excelIndir() {
    const b = await api.logExcel(oturumId);
    const url = URL.createObjectURL(b);
    const a = document.createElement("a"); a.href = url;
    a.download = `tarama_log_${oturumId}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 bg-deep text-white flex items-center gap-3 flex-wrap">
        <Filter size={16} />
        <span className="text-sm font-semibold tracking-wide">TARAMA LOG</span>
        <div className="flex-1" />

        <select value={durum} onChange={e => setDurum(e.target.value)}
          className="bg-white/15 hover:bg-white/20 text-sm px-2.5 py-1 rounded-md outline-none">
          <option value="" className="text-ink">Tum durum</option>
          {Object.entries(durumKisa).map(([k, v]) => (
            <option key={k} value={k} className="text-ink">{v} - {k}</option>
          ))}
        </select>

        <select
          value={kullaniciId}
          onChange={e => setKullaniciId(e.target.value === "" ? "" : Number(e.target.value))}
          className="bg-white/15 hover:bg-white/20 text-sm px-2.5 py-1 rounded-md outline-none"
        >
          <option value="" className="text-ink">Tum kullanici</option>
          {kullanicilar.map(k => (
            <option key={k.kullanici_id ?? "x"} value={k.kullanici_id ?? ""} className="text-ink">
              {k.ad} ({k.toplam_tarama})
            </option>
          ))}
        </select>

        <label className="relative flex items-center">
          <Search size={14} className="absolute left-2 opacity-70" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="seri, stok, urun..."
            className="pl-7 pr-2 py-1 rounded-md bg-white/15 placeholder:text-white/50 text-sm w-44 focus:w-56 transition-all outline-none focus:bg-white/25"
          />
        </label>

        <button onClick={excelIndir}
          className="text-xs px-2.5 py-1 rounded-md bg-accent text-white hover:bg-accent/90">
          Excel indir
        </button>
      </div>

      <div className="max-h-[520px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream/90 sticky top-0 z-10 backdrop-blur">
            <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-ink/55">
              <th className="px-3 py-2">Zaman</th>
              <th className="px-3 py-2">Durum</th>
              <th className="px-3 py-2">Seri</th>
              <th className="px-3 py-2">Stok</th>
              <th className="px-3 py-2">Urun</th>
              <th className="px-3 py-2">Kullanici</th>
              <th className="px-3 py-2">Aciklama</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {rows.map((r, i) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(i, 8) * 0.01 }}
                  className="border-t border-edge/40 hover:bg-cream/60"
                >
                  <td className="px-3 py-1.5 font-mono text-xs whitespace-nowrap text-ink/70">
                    {new Date(r.zaman).toLocaleString("tr-TR")}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className={cn(
                      "inline-block px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide border",
                      durumRengi[r.durum] ?? "bg-edge/30 text-ink/70 border-edge",
                    )}>
                      {durumKisa[r.durum] ?? r.durum}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 font-mono">{r.seri_giris}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{r.stok_kodu ?? "-"}</td>
                  <td className="px-3 py-1.5 max-w-[220px] truncate text-ink/80">{r.urun_adi ?? "-"}</td>
                  <td className="px-3 py-1.5 text-xs text-ink/70">{r.kullanici_ad ?? "-"}</td>
                  <td className="px-3 py-1.5 text-xs text-ink/60 max-w-[220px] truncate">{r.aciklama ?? "-"}</td>
                </motion.tr>
              ))}
            </AnimatePresence>
            {rows.length === 0 && (
              <tr><td colSpan={7} className="p-6 text-center text-ink/55">
                {yukleniyor ? "Yukleniyor..." : "Eslesen kayit yok."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 flex items-center gap-3 text-xs border-t border-edge/40 bg-cream/40">
        <span className="text-ink/65 font-mono">
          {toplam.toLocaleString("tr-TR")} kayit · sayfa {sayfa + 1}/{maxSayfa + 1}
        </span>
        <div className="flex-1" />
        <button
          disabled={sayfa <= 0}
          onClick={() => setSayfa(s => Math.max(0, s - 1))}
          className="px-2 py-1 rounded-md bg-card border border-edge hover:bg-cream disabled:opacity-40 flex items-center gap-1"
        >
          <ChevronLeft size={14} /> Onceki
        </button>
        <button
          disabled={sayfa >= maxSayfa}
          onClick={() => setSayfa(s => Math.min(maxSayfa, s + 1))}
          className="px-2 py-1 rounded-md bg-card border border-edge hover:bg-cream disabled:opacity-40 flex items-center gap-1"
        >
          Sonraki <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
