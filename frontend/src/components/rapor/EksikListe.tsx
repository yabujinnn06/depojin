import { useState } from "react";
import { ChevronDown, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { EksikGrup } from "../../lib/api";
import { cn } from "../../lib/cn";

export default function EksikListe({ rows }: { rows: EksikGrup[] }) {
  const [acik, setAcik] = useState<Set<number>>(new Set());

  function topla(id: number) {
    setAcik(s => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  const toplamEksik = rows.reduce((a, b) => a + b.eksik, 0);

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 bg-deep text-white flex items-center gap-2">
        <AlertCircle size={16} className="text-warn" />
        <span className="text-sm font-semibold tracking-wide">EKSIK SERILER</span>
        <span className="ml-auto text-xs opacity-80 font-mono">
          {rows.length} stok · {toplamEksik} seri
        </span>
      </div>
      <div className="max-h-[480px] overflow-auto divide-y divide-edge/40">
        {rows.length === 0 && (
          <div className="p-6 text-center text-good">
            Tum stoklar tam sayilmis.
          </div>
        )}
        {rows.map((g, idx) => {
          const isOpen = acik.has(g.stok_id);
          const yuzde = g.toplam > 0 ? Math.round((g.sayilan / g.toplam) * 100) : 0;
          return (
            <div key={g.stok_id}>
              <button
                onClick={() => topla(g.stok_id)}
                className="w-full text-left p-3 hover:bg-cream/70 transition flex items-center gap-3"
              >
                <ChevronDown
                  size={16}
                  className={cn("text-ink/40 transition-transform", isOpen && "rotate-180")}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-edge/30">{g.stok_kodu}</span>
                    <span className="truncate font-medium">{g.urun_adi}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-edge/40 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${yuzde}%` }}
                      transition={{ duration: 0.5, delay: idx * 0.01 }}
                      className="h-full bg-gradient-to-r from-accent/60 to-accent"
                    />
                  </div>
                </div>
                <div className="text-right text-sm shrink-0">
                  <div className="font-mono tabular-nums">
                    <span className="text-bad font-bold">{g.eksik}</span>
                    <span className="text-ink/40"> / {g.toplam}</span>
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-ink/55">eksik</div>
                </div>
              </button>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  className="px-10 pb-3"
                >
                  <div className="text-[10px] uppercase tracking-[0.16em] text-ink/55 mb-1.5">
                    Sayilmamis seriler ({g.seriler.length} ornek)
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {g.seriler.map(s => (
                      <span key={s}
                        className="px-2 py-0.5 rounded-md bg-bad/10 border border-bad/20 font-mono text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
