import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, CheckCircle2, AlertTriangle, XCircle, GitMerge, Clock, Radio } from "lucide-react";
import { LogSatir } from "../lib/api";
import NumberTicker from "./ui/NumberTicker";
import { Marquee } from "./magic/Marquee";
import { BorderBeam } from "./magic/BorderBeam";
import { cn } from "../lib/cn";

const PALET = ["#BF6F34", "#7FB3E0", "#5FBE7A", "#F4B183", "#9B7EBD", "#D27A8B", "#3D9CA3", "#C9A659"];

function kullaniciRengi(ad: string): string {
  if (!ad) return "#7FB3E0";
  let h = 0;
  for (let i = 0; i < ad.length; i++) h = (h * 31 + ad.charCodeAt(i)) >>> 0;
  return PALET[h % PALET.length];
}

const DURUM_CFG: Record<string, { icon: any; bg: string; ring: string; dot: string; etiket: string }> = {
  basarili:   { icon: CheckCircle2,  bg: "bg-good/12",  ring: "border-good/40 hover:border-good/70",  dot: "bg-good",  etiket: "OK"   },
  mukerrer:   { icon: AlertTriangle, bg: "bg-warn/15",  ring: "border-warn/50 hover:border-warn/80",  dot: "bg-warn",  etiket: "DUP"  },
  bulunamadi: { icon: XCircle,       bg: "bg-bad/12",   ring: "border-bad/40 hover:border-bad/70",    dot: "bg-bad",   etiket: "404"  },
  cakisma:    { icon: GitMerge,      bg: "bg-warn/20",  ring: "border-warn/60 hover:border-warn/90",  dot: "bg-warn",  etiket: "CONF" },
};

function saatFormat(t: string) {
  return new Date(t).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function relativeSure(saniye: number) {
  if (saniye < 5) return "az once";
  if (saniye < 60) return `${saniye}sn once`;
  const dk = Math.floor(saniye / 60);
  if (dk < 60) return `${dk}dk once`;
  const sa = Math.floor(dk / 60);
  return `${sa}sa once`;
}

function Sparkline({ buckets }: { buckets: number[] }) {
  const w = 120;
  const h = 28;
  const max = Math.max(1, ...buckets);
  const bw = w / buckets.length;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      {buckets.map((v, i) => {
        const bh = (v / max) * h;
        return (
          <motion.rect
            key={i}
            x={i * bw + 0.5}
            width={Math.max(bw - 1, 1)}
            initial={false}
            animate={{ y: h - bh, height: bh }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            fill={v > 0 ? "#5FBE7A" : "#C6BDAC"}
            opacity={v > 0 ? 0.85 : 0.3}
            rx={1}
          />
        );
      })}
    </svg>
  );
}

type Props = {
  rows: LogSatir[];
  onSec?: (row: LogSatir) => void;
};

export default function CanliAkis({ rows, onSec }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const son = rows[0] ?? null;
  const sonZaman = son ? new Date(son.zaman).getTime() : 0;
  const sonGecenSn = sonZaman > 0 ? Math.max(0, Math.floor((now - sonZaman) / 1000)) : 0;

  const taramaDk = useMemo(() => {
    if (rows.length < 2) return 0;
    const enYeni = new Date(rows[0].zaman).getTime();
    const enEski = new Date(rows[rows.length - 1].zaman).getTime();
    const sn = (enYeni - enEski) / 1000;
    if (sn <= 0) return rows.length;
    return Math.round((rows.length / sn) * 60);
  }, [rows]);

  const buckets = useMemo(() => {
    const N = 30;
    const pencereSn = 60;
    const kovaSn = pencereSn / N;
    const arr = new Array<number>(N).fill(0);
    const simdi = now;
    for (const r of rows) {
      const t = new Date(r.zaman).getTime();
      const yas = (simdi - t) / 1000;
      if (yas < 0 || yas > pencereSn) continue;
      const idx = N - 1 - Math.floor(yas / kovaSn);
      if (idx >= 0 && idx < N) arr[idx] += 1;
    }
    return arr;
  }, [rows, now]);

  const aktif = sonGecenSn < 5 && rows.length > 0;
  const goster = rows.slice(0, 30);

  return (
    <div className="card overflow-hidden relative">
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-edge/50 bg-gradient-to-r from-cream/80 to-card flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative inline-flex h-2.5 w-2.5">
            <span className={cn("absolute inset-0 rounded-full", aktif ? "bg-good" : "bg-edge")} />
            {aktif && (
              <span className="absolute inset-0 rounded-full bg-good/60 animate-ping" />
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink/80">
            {aktif ? "Canli" : "Beklemede"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-deep" />
          <div className="font-display text-2xl leading-none text-deep">
            <NumberTicker value={taramaDk} />
          </div>
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink/55 self-end pb-0.5">tarama/dk</span>
        </div>

        <div className="hidden sm:block">
          <Sparkline buckets={buckets} />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-ink/65">
            <Clock size={12} />
            {son ? (
              <span className="font-mono">
                son: <b className="text-ink">{saatFormat(son.zaman)}</b>{" "}
                <span className="text-ink/50">({relativeSure(sonGecenSn)})</span>
              </span>
            ) : <span>henuz yok</span>}
          </div>
          <div className="hidden md:flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-ink/55">
            <Radio size={11} />
            ws aktif
          </div>
        </div>
      </div>

      <div className="relative">
        {goster.length === 0 ? (
          <div className="px-4 py-4 text-sm text-ink/55 font-mono">
            <span className="opacity-60">$</span> first scan bekleniyor
            <span className="inline-block w-2 h-3.5 ml-1 align-middle bg-ink/30 animate-caret" />
          </div>
        ) : (
          <>
            <Marquee duration="55s" pauseOnHover repeat={3} className="py-2.5 px-3">
              {goster.map((r, i) => {
                const cfg = DURUM_CFG[r.durum];
                if (!cfg) return null;
                const Ikon = cfg.icon;
                const kAd = r.kullanici_ad ?? "?";
                const kRenk = kullaniciRengi(kAd);
                return (
                  <button
                    key={r.id}
                    onClick={() => onSec?.(r)}
                    className={cn(
                      "group inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border whitespace-nowrap shrink-0",
                      "transition-all hover:scale-[1.03]",
                      cfg.bg, cfg.ring,
                      i === 0 && "relative",
                    )}
                  >
                    <span className="text-[10px] font-mono text-ink/55 tabular-nums">
                      {saatFormat(r.zaman)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Ikon size={12} className={cn(
                        r.durum === "basarili" && "text-good",
                        r.durum === "mukerrer" && "text-warn",
                        r.durum === "bulunamadi" && "text-bad",
                        r.durum === "cakisma" && "text-warn",
                      )} />
                      <span className="text-[10px] font-bold tracking-wider opacity-80">{cfg.etiket}</span>
                    </span>
                    <span className="font-mono text-sm text-ink font-semibold max-w-[140px] truncate">
                      {r.seri_giris}
                    </span>
                    {r.stok_kodu && (
                      <span className="text-[10px] font-mono text-ink/55 px-1 py-0.5 rounded bg-edge/30">
                        {r.stok_kodu}
                      </span>
                    )}
                    {r.urun_adi && (
                      <span className="text-[11px] text-ink/65 max-w-[120px] truncate">
                        {r.urun_adi}
                      </span>
                    )}
                    <span
                      title={kAd}
                      className="inline-flex items-center justify-center h-5 w-5 rounded-full text-[9px] font-bold text-white"
                      style={{ backgroundColor: kRenk }}
                    >
                      {kAd.slice(0, 1).toUpperCase()}
                    </span>
                    {i === 0 && aktif && (
                      <BorderBeam size={50} duration={2.5} colorFrom="#BF6F34" colorTo="#FFE2CC" borderWidth={1} />
                    )}
                  </button>
                );
              })}
            </Marquee>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-card to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-card to-transparent" />
          </>
        )}
      </div>

      {son && aktif && (
        <AnimatePresence mode="wait">
          <motion.div
            key={son.id}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-0 left-0 h-0.5 origin-left bg-gradient-to-r from-accent via-good to-transparent"
            style={{ width: "60%" }}
          />
        </AnimatePresence>
      )}
    </div>
  );
}
