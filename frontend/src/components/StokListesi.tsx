import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { StokOzet } from "../lib/api";
import ProgressBar from "./ui/ProgressBar";
import { cn } from "../lib/cn";

export default function StokListesi({ rows, onSec }: { rows: StokOzet[]; onSec?: (s: StokOzet) => void }) {
  const [q, setQ] = useState("");
  const [filtre, setFiltre] = useState<"tum" | "eksik" | "tam">("tum");

  const filtered = useMemo(() => {
    const qNorm = q.trim().toLowerCase();
    return rows.filter(s => {
      if (qNorm && !(`${s.stok_kodu} ${s.urun_adi}`.toLowerCase().includes(qNorm))) return false;
      const tam = s.toplam > 0 && s.sayilan >= s.toplam;
      if (filtre === "eksik" && tam) return false;
      if (filtre === "tam" && !tam) return false;
      return true;
    });
  }, [rows, q, filtre]);

  const tamSayisi = rows.filter(s => s.toplam > 0 && s.sayilan >= s.toplam).length;

  return (
    <div className="card overflow-hidden">
      <div className="px-3 py-2.5 bg-deep text-white flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold tracking-wide">STOKLAR</span>
        <span className="text-xs opacity-70 font-mono">{rows.length} kalem · {tamSayisi} tam</span>
        <div className="flex-1" />
        <div className="flex items-center gap-1 text-xs">
          {(["tum", "eksik", "tam"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={cn(
                "px-2.5 py-1 rounded-md transition",
                filtre === f ? "bg-white text-deep font-semibold" : "bg-white/10 hover:bg-white/20"
              )}
            >{f}</button>
          ))}
        </div>
        <label className="relative flex items-center">
          <Search size={14} className="absolute left-2 opacity-70" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="ara..."
            className="pl-7 pr-2 py-1 rounded-md bg-white/10 placeholder:text-white/50 text-xs w-32 focus:w-44 transition-all outline-none focus:bg-white/20"
          />
        </label>
      </div>
      <div className="max-h-[460px] overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-cream/80 sticky top-0 z-10 backdrop-blur">
            <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-ink/55">
              <th className="px-3 py-2">Kod</th>
              <th className="px-3 py-2">Urun</th>
              <th className="px-3 py-2 text-right">Sayilan</th>
              <th className="px-3 py-2 text-right">Toplam</th>
              <th className="px-3 py-2 text-right">Portal</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, idx) => {
              const tam = s.toplam > 0 && s.sayilan >= s.toplam;
              const fark = s.sayilan - s.portal_sayim;
              return (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: Math.min(idx, 12) * 0.01 }}
                  onClick={() => onSec?.(s)}
                  className={cn(
                    "border-t border-edge/40 hover:bg-cream/60 transition",
                    onSec && "cursor-pointer",
                    tam && "bg-good/10",
                  )}
                >
                  <td className="px-3 py-2 font-mono text-xs">{s.stok_kodu}</td>
                  <td className="px-3 py-2 max-w-[260px]">
                    <div className="truncate">{s.urun_adi}</div>
                    {s.toplam > 0 && (
                      <ProgressBar
                        value={s.sayilan}
                        max={s.toplam}
                        tone={tam ? "good" : "accent"}
                        height={3}
                        className="mt-1"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">{s.sayilan}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-ink/70">{s.toplam}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">
                    <span className="text-ink/55">{s.portal_sayim || "-"}</span>
                    {s.portal_sayim > 0 && s.sayilan > 0 && (
                      <span className={cn(
                        "ml-1 text-[10px]",
                        fark === 0 ? "text-good" : fark < 0 ? "text-bad" : "text-warn"
                      )}>
                        {fark > 0 ? `+${fark}` : fark}
                      </span>
                    )}
                  </td>
                </motion.tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-ink/55">
                {rows.length === 0 ? "Stok yok. Excel import edin." : "Eslesen yok."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
