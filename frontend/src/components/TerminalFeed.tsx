import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { LogSatir } from "../lib/api";
import { cn } from "../lib/cn";

const renkler: Record<string, string> = {
  basarili: "text-emerald-400",
  mukerrer: "text-amber-300",
  bulunamadi: "text-red-400",
  cakisma: "text-orange-300",
};

const etiket: Record<string, string> = {
  basarili: "OK",
  mukerrer: "DUP",
  bulunamadi: "404",
  cakisma: "CONF",
};

function saatFormat(t: string) {
  return new Date(t).toLocaleTimeString("tr-TR", { hour12: false });
}

export default function TerminalFeed({ rows, baslik = "scan_feed" }: { rows: LogSatir[]; baslik?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [rows.length]);

  return (
    <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-[#0c0c0c] shadow-2xl shadow-black/50 font-mono">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-[#1a1a1a]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="text-[11px] tracking-wider text-zinc-400">
          root@depojin: ~/{baslik}
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-400">
          <span className="opacity-60">live</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>
      <div
        ref={ref}
        className="text-[13px] leading-[1.55] lg:h-[680px] max-h-[680px] overflow-y-auto px-3 py-3 selection:bg-emerald-500/30"
        style={{ background: "linear-gradient(180deg,#0c0c0c 0%,#101010 100%)" }}
      >
        <div className="text-zinc-400 mb-2">
          <span className="text-emerald-400">root@depojin</span>
          <span className="text-zinc-500">:</span>
          <span className="text-sky-400">~/oturum</span>
          <span className="text-zinc-500">$ </span>
          <span className="text-zinc-200">tail -f scans.log</span>
        </div>

        {rows.length === 0 && (
          <div className="text-zinc-500 py-2">
            <span className="text-zinc-600">[</span>
            <span className="text-zinc-400">{new Date().toLocaleTimeString("tr-TR")}</span>
            <span className="text-zinc-600">]</span>{" "}
            waiting for incoming scans
            <span className="inline-block w-2 h-3.5 align-middle ml-1 bg-zinc-500 animate-caret" />
          </div>
        )}

        <AnimatePresence initial={false}>
          {rows.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-start gap-2 hover:bg-white/[0.03] -mx-3 px-3"
            >
              <span className="text-zinc-600 w-8 text-right tabular-nums shrink-0 select-none">
                {String(rows.length - i).padStart(3, "0")}
              </span>
              <span className="text-zinc-500 shrink-0">[{saatFormat(r.zaman)}]</span>
              <span className={cn("shrink-0 w-9 font-bold", renkler[r.durum] ?? "text-sky-400")}>
                {etiket[r.durum] ?? r.durum.slice(0, 4).toUpperCase()}
              </span>
              <span className="text-zinc-600 shrink-0">::</span>
              <span className="text-zinc-200 truncate min-w-0">
                <span className="text-zinc-50 font-semibold">{r.seri_giris}</span>
                {r.stok_kodu && (
                  <>
                    <span className="text-zinc-600"> · </span>
                    <span className="text-amber-300">{r.stok_kodu}</span>
                    <span className="text-zinc-600"> </span>
                    <span className="text-zinc-400">{r.urun_adi}</span>
                  </>
                )}
                {!r.stok_kodu && r.aciklama && (
                  <>
                    <span className="text-zinc-600"> · </span>
                    <span className="text-zinc-500">{r.aciklama}</span>
                  </>
                )}
                {r.kullanici_ad && (
                  <>
                    <span className="text-zinc-600"> @</span>
                    <span className="text-fuchsia-300">{r.kullanici_ad}</span>
                  </>
                )}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        <div className="flex items-center gap-1 pt-2 text-zinc-300">
          <span className="text-emerald-400">root@depojin</span>
          <span className="text-zinc-500">:</span>
          <span className="text-sky-400">~/oturum</span>
          <span className="text-zinc-500">$</span>
          <span className="inline-block w-2 h-3.5 bg-zinc-300 animate-caret" />
        </div>
      </div>
    </div>
  );
}
