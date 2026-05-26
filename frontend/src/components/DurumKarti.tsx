import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, XCircle, GitMerge, Hourglass } from "lucide-react";
import { Tarama } from "../lib/api";
import { cn } from "../lib/cn";
import { BorderBeam } from "./magic/BorderBeam";

const cfg = {
  basarili: {
    bg: "from-good/15 via-good/10 to-transparent",
    border: "border-good/40",
    icon: <CheckCircle2 size={22} className="text-good" />,
    label: "SAYIM BASARILI",
    beam: { colorFrom: "#5FBE7A", colorTo: "#BFE8CC" },
  },
  mukerrer: {
    bg: "from-warn/25 via-warn/15 to-transparent",
    border: "border-warn/50",
    icon: <AlertTriangle size={22} className="text-warn" />,
    label: "MUKERRER",
    beam: { colorFrom: "#F4B183", colorTo: "#FFE2CC" },
  },
  bulunamadi: {
    bg: "from-bad/20 via-bad/10 to-transparent",
    border: "border-bad/40",
    icon: <XCircle size={22} className="text-bad" />,
    label: "BULUNAMADI",
    beam: { colorFrom: "#DC5A5A", colorTo: "#FFC8C8" },
  },
  cakisma: {
    bg: "from-warn/30 via-warn/20 to-transparent",
    border: "border-warn/60",
    icon: <GitMerge size={22} className="text-warn" />,
    label: "CAKISMA",
    beam: { colorFrom: "#F4B183", colorTo: "#F8D8C0" },
  },
  bos: {
    bg: "from-cream to-card",
    border: "border-edge",
    icon: <Hourglass size={20} className="text-ink/40" />,
    label: "HAZIR",
    beam: { colorFrom: "#1F4E79", colorTo: "#7FB3E0" },
  },
} as const;

export default function DurumKarti({ son }: { son: Tarama | null }) {
  const durum = (son?.durum ?? "bos") as keyof typeof cfg;
  const c = cfg[durum];
  const aktif = durum !== "bos";

  return (
    <motion.div
      animate={aktif ? { scale: [1, 1.015, 1] } : { scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-[18px] border bg-card p-5",
        "bg-gradient-to-br shadow-sm",
        c.bg, c.border,
      )}
    >
      {aktif && (
        <>
          <BorderBeam size={90} duration={4} colorFrom={c.beam.colorFrom} colorTo={c.beam.colorTo} borderWidth={1.5} />
          <BorderBeam size={90} duration={4} delay={2} colorFrom={c.beam.colorTo} colorTo={c.beam.colorFrom} reverse borderWidth={1.5} />
        </>
      )}
      <div className="relative z-10">
        <div className="flex items-center gap-2">
          {c.icon}
          <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-ink/80">{c.label}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={(son?.seri ?? "bos") + (son?.durum ?? "")}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <div className="font-display text-3xl mt-2 break-all leading-tight">
              {son?.seri ?? "—"}
            </div>
            <div className="text-sm text-ink/80 mt-1">{son?.mesaj ?? "Tarama bekleniyor"}</div>
          </motion.div>
        </AnimatePresence>

        {son?.stok_kodu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="mt-4 grid grid-cols-4 gap-2 text-sm"
          >
            <Mini k="Stok" v={son.stok_kodu} />
            <Mini k="Sayilan" v={son.sayilan} accent />
            <Mini k="Stokta" v={son.toplam} />
            <Mini
              k="Portal"
              v={son.portal_sayim ?? "—"}
              fark={typeof son.portal_fark === "number" ? son.portal_fark : null}
            />
            <div className="col-span-4 text-sm">
              <span className="text-ink/55">Urun:</span> <b className="text-ink">{son.urun_adi}</b>
            </div>
          </motion.div>
        )}

        {son?.cakisan_stoklar && (
          <div className="mt-3 text-sm">
            <span className="text-ink/55">Cakisan stoklar:</span>{" "}
            <b className="font-mono">{son.cakisan_stoklar.join(", ")}</b>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Mini({ k, v, accent, fark }: { k: string; v: any; accent?: boolean; fark?: number | null }) {
  const farkRenk = fark == null ? "" : fark === 0 ? "text-good" : fark > 0 ? "text-warn" : "text-bad";
  return (
    <div className={cn(
      "rounded-lg px-2.5 py-1.5 bg-white/60 backdrop-blur border border-edge/60",
      accent && "bg-good/15 border-good/40",
    )}>
      <div className="text-[9px] uppercase tracking-[0.15em] text-ink/55">{k}</div>
      <div className="font-mono text-base font-bold leading-tight">{v ?? "—"}</div>
      {fark != null && (
        <div className={cn("text-[10px] font-mono leading-tight", farkRenk)}>
          {fark > 0 ? `+${fark}` : fark}
        </div>
      )}
    </div>
  );
}
