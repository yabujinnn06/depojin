import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, AlertTriangle, XCircle, GitMerge, Clock, User, Hash, Package } from "lucide-react";
import { LogSatir } from "../lib/api";
import { cn } from "../lib/cn";

const cfg: Record<string, { icon: any; renk: string; etiket: string }> = {
  basarili:   { icon: CheckCircle2,  renk: "text-good", etiket: "Sayim basarili" },
  mukerrer:   { icon: AlertTriangle, renk: "text-warn", etiket: "Mukerrer tarama" },
  bulunamadi: { icon: XCircle,       renk: "text-bad",  etiket: "Listede yok" },
  cakisma:    { icon: GitMerge,      renk: "text-warn", etiket: "Birden cok stokta" },
};

export default function SeriDetayModal({ row, onClose }: { row: LogSatir | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {row && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[60] bg-deep/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-md p-5 space-y-4"
          >
            <div className="flex items-start gap-3">
              {(() => {
                const c = cfg[row.durum] ?? cfg.basarili;
                const I = c.icon;
                return (
                  <>
                    <I size={28} className={cn("shrink-0 mt-0.5", c.renk)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-ink/55">{c.etiket}</div>
                      <div className="font-display text-2xl break-all leading-tight">{row.seri_giris}</div>
                    </div>
                  </>
                );
              })()}
              <button onClick={onClose} className="p-1.5 hover:bg-edge/30 rounded">
                <X size={16} />
              </button>
            </div>

            <ul className="space-y-2 text-sm">
              <Sat icon={<Hash size={14} />} k="Durum" v={<span className={cn("font-mono", cfg[row.durum]?.renk)}>{row.durum}</span>} />
              <Sat icon={<Clock size={14} />} k="Zaman" v={<span className="font-mono">{new Date(row.zaman).toLocaleString("tr-TR")}</span>} />
              <Sat icon={<User size={14} />} k="Sayan" v={row.kullanici_ad ?? "—"} />
              {row.stok_kodu && (
                <Sat icon={<Package size={14} />} k="Stok" v={<><b className="font-mono">{row.stok_kodu}</b>{" "}<span className="text-ink/70">{row.urun_adi}</span></>} />
              )}
              {row.aciklama && (
                <Sat icon={null} k="Aciklama" v={<span className="text-ink/70">{row.aciklama}</span>} />
              )}
            </ul>

            <div className="text-[11px] text-ink/55 text-center">
              Detay - sayim degismez.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Sat({ icon, k, v }: { icon: React.ReactNode; k: string; v: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="w-5 text-ink/45 mt-0.5">{icon}</span>
      <span className="w-16 text-[10px] uppercase tracking-[0.16em] text-ink/55 pt-1">{k}</span>
      <span className="flex-1 min-w-0">{v}</span>
    </li>
  );
}
