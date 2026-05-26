import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, Circle, LogOut as LogOutIcon, UserCheck } from "lucide-react";
import { api } from "../lib/api";
import { cn } from "../lib/cn";

type Seri = {
  id: number; seri_no: string; sayildi: boolean; sayim_tarihi: string | null;
  sayan_ad: string | null; sonradan_eklendi: boolean;
  cikis_zaman: string | null; cikis_kullanici_ad: string | null; cikis_notu: string | null;
  zimmet_kullanici_id: number | null; zimmet_kullanici_ad: string | null;
  zimmet_zaman: string | null; zimmet_notu: string | null;
};

type Props = {
  stokId: number | null;
  stokKodu?: string;
  urunAdi?: string;
  portalSayim?: number;
  onClose: () => void;
};

export default function StokDetayModal({ stokId, stokKodu, urunAdi, portalSayim, onClose }: Props) {
  const [seriler, setSeriler] = useState<Seri[]>([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [filtre, setFiltre] = useState<"tum" | "sayilan" | "kalan" | "cikti" | "zimmet">("tum");

  useEffect(() => {
    if (stokId == null) return;
    setYukleniyor(true);
    api.stokSeriler(stokId)
      .then(setSeriler)
      .finally(() => setYukleniyor(false));
  }, [stokId]);

  if (stokId == null) return null;

  const sayilan = seriler.filter(s => s.sayildi).length;
  const cikti = seriler.filter(s => s.cikis_zaman).length;
  const zimmette = seriler.filter(s => s.zimmet_kullanici_id).length;

  const gosterilen = seriler.filter(s => {
    if (filtre === "sayilan") return s.sayildi;
    if (filtre === "kalan") return !s.sayildi && !s.cikis_zaman;
    if (filtre === "cikti") return !!s.cikis_zaman;
    if (filtre === "zimmet") return !!s.zimmet_kullanici_id;
    return true;
  });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-deep/60 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="card w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-5 py-3 border-b border-edge/60 flex items-center gap-3">
            <span className="font-mono text-xs bg-edge/30 px-2 py-0.5 rounded">{stokKodu}</span>
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg truncate">{urunAdi}</div>
              <div className="text-xs text-ink/55 font-mono">
                {seriler.length} seri · sayilan {sayilan} · kalan {seriler.length - sayilan - cikti}
                {cikti > 0 && ` · cikis ${cikti}`}
                {zimmette > 0 && ` · zimmet ${zimmette}`}
                {portalSayim ? ` · portal ${portalSayim} (fark ${sayilan - portalSayim > 0 ? "+" : ""}${sayilan - portalSayim})` : ""}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-edge/30 rounded-md">
              <X size={16} />
            </button>
          </div>

          <div className="px-4 py-2 border-b border-edge/40 flex items-center gap-1 text-xs">
            {(["tum", "sayilan", "kalan", "cikti", "zimmet"] as const).map(f => (
              <button key={f} onClick={() => setFiltre(f)} className={cn(
                "px-2.5 py-1 rounded-md",
                filtre === f ? "bg-deep text-white font-semibold" : "bg-edge/20 hover:bg-edge/40")}>
                {f}
              </button>
            ))}
            <span className="ml-auto text-ink/55 font-mono">{gosterilen.length} satir</span>
          </div>

          <div className="flex-1 overflow-auto">
            {yukleniyor ? (
              <div className="p-6 text-center text-ink/55">Yukleniyor...</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-cream/80 sticky top-0">
                  <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-ink/55">
                    <th className="px-3 py-2 w-8"></th>
                    <th className="px-3 py-2">Seri</th>
                    <th className="px-3 py-2">Durum</th>
                    <th className="px-3 py-2">Sayan</th>
                    <th className="px-3 py-2">Zaman</th>
                  </tr>
                </thead>
                <tbody>
                  {gosterilen.map(s => {
                    const status = s.cikis_zaman ? "cikti" : s.zimmet_kullanici_id ? "zimmet" : s.sayildi ? "sayilan" : "kalan";
                    return (
                      <tr key={s.id} className={cn(
                        "border-t border-edge/40",
                        status === "sayilan" && "bg-good/8",
                        status === "cikti" && "bg-bad/8",
                        status === "zimmet" && "bg-warn/10",
                      )}>
                        <td className="px-3 py-1.5">
                          {status === "sayilan" && <CheckCircle2 size={14} className="text-good" />}
                          {status === "kalan" && <Circle size={14} className="text-ink/30" />}
                          {status === "cikti" && <LogOutIcon size={14} className="text-bad" />}
                          {status === "zimmet" && <UserCheck size={14} className="text-warn" />}
                        </td>
                        <td className="px-3 py-1.5 font-mono">
                          {s.seri_no}
                          {s.sonradan_eklendi && <span className="ml-1 text-[9px] uppercase tracking-wide text-accent">+ek</span>}
                        </td>
                        <td className="px-3 py-1.5 text-xs">
                          {status === "sayilan" && "Sayildi"}
                          {status === "kalan" && "Sayilmadi"}
                          {status === "cikti" && (<span>Cikti{s.cikis_notu ? ` · ${s.cikis_notu}` : ""}</span>)}
                          {status === "zimmet" && (<span>Zimmet → <b>{s.zimmet_kullanici_ad}</b>{s.zimmet_notu ? ` · ${s.zimmet_notu}` : ""}</span>)}
                        </td>
                        <td className="px-3 py-1.5 text-xs text-ink/65">{s.sayan_ad ?? s.cikis_kullanici_ad ?? "-"}</td>
                        <td className="px-3 py-1.5 text-xs text-ink/65 whitespace-nowrap font-mono">
                          {s.cikis_zaman ?? s.zimmet_zaman ?? s.sayim_tarihi ?? "-"}
                        </td>
                      </tr>
                    );
                  })}
                  {gosterilen.length === 0 && (
                    <tr><td colSpan={5} className="p-6 text-center text-ink/55">Eslesen yok.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
