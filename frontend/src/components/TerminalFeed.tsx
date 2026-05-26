import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { LogSatir } from "../lib/api";
import { cn } from "../lib/cn";

const renkler: Record<string, string> = {
  basarili: "text-term-ok",
  mukerrer: "text-term-warn",
  bulunamadi: "text-term-bad",
  cakisma: "text-term-warn",
};

const etiket: Record<string, string> = {
  basarili: "OK",
  mukerrer: "DUP",
  bulunamadi: "404",
  cakisma: "CONF",
};

function saatFormat(t: string) {
  const d = new Date(t);
  return d.toLocaleTimeString("tr-TR", { hour12: false });
}

export default function TerminalFeed({ rows, baslik = "scan_feed" }: { rows: LogSatir[]; baslik?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [rows.length]);

  return (
    <div className="relative overflow-hidden rounded-[14px] border border-term-bg/40 bg-term-bg text-term-dim shadow-lg shadow-deeper/30">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-deeper/60">
        <div className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-bad/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-warn/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-good/80" />
        </div>
        <div className="font-mono text-[11px] tracking-wider text-term-dim">{baslik}.log</div>
        <div className="font-mono text-[11px] text-term-ok">
          <span className="opacity-60">live</span>
          <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-term-ok animate-pulse" />
        </div>
      </div>
      <div
        ref={ref}
        className="font-mono text-[12px] leading-relaxed max-h-[460px] overflow-y-auto px-3 py-2 space-y-0.5"
      >
        {rows.length === 0 && (
          <div className="text-term-dim/60 py-8 text-center">
            <span className="opacity-60">$</span> waiting for scans
            <span className="inline-block w-2 h-3.5 align-middle ml-1 bg-term-dim/60 animate-caret" />
          </div>
        )}
        <AnimatePresence initial={false}>
          {rows.map((r) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex items-start gap-2"
            >
              <span className="text-term-dim/70 shrink-0">{saatFormat(r.zaman)}</span>
              <span className={cn("shrink-0 w-9 font-bold", renkler[r.durum] ?? "text-term-info")}>
                {etiket[r.durum] ?? r.durum.slice(0, 4).toUpperCase()}
              </span>
              <span className="text-term-info shrink-0">{">"}</span>
              <span className="text-term-dim truncate min-w-0">
                <span className="text-white/90">{r.seri_giris}</span>
                {r.stok_kodu && (
                  <span className="text-term-dim/70"> · {r.stok_kodu} <span className="text-term-accent">{r.urun_adi}</span></span>
                )}
                {!r.stok_kodu && r.aciklama && (
                  <span className="text-term-dim/60"> · {r.aciklama}</span>
                )}
                {r.kullanici_ad && <span className="text-term-info/70"> @{r.kullanici_ad}</span>}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
        <div className="flex items-center gap-2 pt-1 text-term-info">
          <span>$</span>
          <span className="inline-block w-2 h-3.5 bg-term-info animate-caret" />
        </div>
      </div>
    </div>
  );
}
