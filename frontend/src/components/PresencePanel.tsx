import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Users, Wifi, ShieldCheck, Eye } from "lucide-react";
import { PresenceUser } from "../lib/ws";
import { cn } from "../lib/cn";

const PALET = ["#BF6F34", "#7FB3E0", "#5FBE7A", "#F4B183", "#9B7EBD", "#D27A8B", "#3D9CA3", "#C9A659"];

function kullaniciRengi(ad: string): string {
  if (!ad) return "#7FB3E0";
  let h = 0;
  for (let i = 0; i < ad.length; i++) h = (h * 31 + ad.charCodeAt(i)) >>> 0;
  return PALET[h % PALET.length];
}

const DURUM_RENK: Record<string, string> = {
  basarili: "text-good", mukerrer: "text-warn",
  bulunamadi: "text-bad", cakisma: "text-warn",
};

const DURUM_ET: Record<string, string> = {
  basarili: "OK", mukerrer: "DUP", bulunamadi: "404", cakisma: "CONF",
};

const ROL_ICON: Record<string, any> = {
  admin: ShieldCheck, sayan: Wifi, izleyici: Eye,
};

function relativeSure(s: string, now: number): string {
  const t = new Date(s).getTime();
  const dif = Math.max(0, Math.floor((now - t) / 1000));
  if (dif < 5) return "az once";
  if (dif < 60) return `${dif}sn`;
  const dk = Math.floor(dif / 60);
  if (dk < 60) return `${dk}dk`;
  const sa = Math.floor(dk / 60);
  return `${sa}sa`;
}

export default function PresencePanel({
  rows, benimId,
}: { rows: PresenceUser[]; benimId: number | null }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="card overflow-hidden">
      <div className="px-3 sm:px-4 py-2.5 bg-deep text-white flex items-center gap-2 flex-wrap">
        <Users size={16} />
        <span className="text-sm font-semibold tracking-wide">AKTIF SAYANLAR</span>
        <span className="text-xs opacity-70 font-mono">{rows.length} kisi cevrimici</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] opacity-80">
          <span className="h-1.5 w-1.5 rounded-full bg-good animate-pulse" /> live
        </span>
      </div>
      <div className="divide-y divide-edge/40 max-h-[420px] overflow-auto">
        {rows.length === 0 && (
          <div className="p-4 text-center text-ink/55 text-sm">
            Henuz baska kimse bagli degil.
          </div>
        )}
        <AnimatePresence initial={false}>
          {rows.map((u) => {
            const renk = kullaniciRengi(u.ad);
            const Rol = ROL_ICON[u.rol] ?? Wifi;
            const aktif = (now - new Date(u.son_aktivite).getTime()) < 60_000;
            const benMi = u.kullanici_id === benimId;
            return (
              <motion.div
                key={u.kullanici_id}
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className={cn("p-3 flex items-center gap-3", benMi && "bg-accent/8")}
              >
                <div className="relative">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                    style={{ backgroundColor: renk }}>
                    {u.ad.slice(0, 2).toUpperCase()}
                  </div>
                  <span className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card",
                    aktif ? "bg-good" : "bg-edge"
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{u.ad}</span>
                    {benMi && <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent text-white">sen</span>}
                    <span className="text-[10px] uppercase tracking-[0.16em] text-ink/55 inline-flex items-center gap-1">
                      <Rol size={10} /> {u.rol}
                    </span>
                    {u.baglanti_sayisi > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-edge/30 font-mono" title="acik baglanti sayisi">
                        ×{u.baglanti_sayisi}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink/65 mt-0.5 flex items-center gap-2 flex-wrap">
                    {u.son_seri ? (
                      <>
                        <span className="text-ink/45">son:</span>
                        <span className="font-mono text-ink">{u.son_seri}</span>
                        {u.son_durum && (
                          <span className={cn("font-bold text-[10px]", DURUM_RENK[u.son_durum] ?? "text-ink/55")}>
                            {DURUM_ET[u.son_durum] ?? u.son_durum.toUpperCase()}
                          </span>
                        )}
                        <span className="text-ink/40 font-mono">· {relativeSure(u.son_aktivite, now)}</span>
                      </>
                    ) : (
                      <span className="text-ink/45 italic">henuz tarama yok</span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
