import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity, CheckCircle2, AlertTriangle, XCircle, GitMerge,
  Clock, Radio, Users, Filter as FilterIcon,
} from "lucide-react";
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

const DURUM_CFG: Record<string, { icon: any; bg: string; ring: string; text: string; etiket: string; filtreRenk: string }> = {
  basarili:   { icon: CheckCircle2,  bg: "bg-good/12",  ring: "border-good/40 hover:border-good/70",  text: "text-good", etiket: "OK",   filtreRenk: "bg-good/30 text-good" },
  mukerrer:   { icon: AlertTriangle, bg: "bg-warn/15",  ring: "border-warn/50 hover:border-warn/80",  text: "text-warn", etiket: "DUP",  filtreRenk: "bg-warn/30 text-warn" },
  bulunamadi: { icon: XCircle,       bg: "bg-bad/12",   ring: "border-bad/40 hover:border-bad/70",    text: "text-bad",  etiket: "404",  filtreRenk: "bg-bad/30 text-bad" },
  cakisma:    { icon: GitMerge,      bg: "bg-warn/20",  ring: "border-warn/60 hover:border-warn/90",  text: "text-warn", etiket: "CONF", filtreRenk: "bg-warn/40 text-warn" },
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

function WaveBars({ buckets }: { buckets: number[] }) {
  const w = 140;
  const h = 32;
  const max = Math.max(2, ...buckets);
  const bw = w / buckets.length;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible shrink-0">
      <defs>
        <linearGradient id="wave-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5FBE7A" />
          <stop offset="100%" stopColor="#BF6F34" />
        </linearGradient>
      </defs>
      {buckets.map((v, i) => {
        const oran = Math.min(1, v / max);
        const bh = Math.max(2, oran * h);
        return (
          <motion.rect
            key={i}
            x={i * bw + 0.6}
            width={Math.max(bw - 1.2, 1.5)}
            initial={false}
            animate={{ y: h - bh, height: bh }}
            transition={{ type: "spring", stiffness: 240, damping: 18 }}
            fill={v > 0 ? "url(#wave-grad)" : "#C6BDAC"}
            opacity={v > 0 ? 0.95 : 0.25}
            rx={1.2}
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

type FiltreTip = "tum" | "basarili" | "mukerrer" | "bulunamadi" | "cakisma";

export default function CanliAkis({ rows, onSec }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [filtre, setFiltre] = useState<FiltreTip>("tum");

  useEffect(() => {
    if (document.visibilityState !== "visible") return;
    const t = setInterval(() => setNow(Date.now()), 2000);
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
    const N = 24;
    const pencereSn = 60;
    const kovaSn = pencereSn / N;
    const arr = new Array<number>(N).fill(0);
    for (const r of rows) {
      const t = new Date(r.zaman).getTime();
      const yas = (now - t) / 1000;
      if (yas < 0 || yas > pencereSn) continue;
      const idx = N - 1 - Math.floor(yas / kovaSn);
      if (idx >= 0 && idx < N) arr[idx] += 1;
    }
    return arr;
  }, [rows, now]);

  const kullaniciOzeti = useMemo(() => {
    const map = new Map<string, { ad: string; sayi: number; son: number; renk: string }>();
    for (const r of rows) {
      const ad = r.kullanici_ad ?? "?";
      const t = new Date(r.zaman).getTime();
      const m = map.get(ad);
      if (m) { m.sayi++; if (t > m.son) m.son = t; }
      else map.set(ad, { ad, sayi: 1, son: t, renk: kullaniciRengi(ad) });
    }
    return Array.from(map.values()).sort((a, b) => b.sayi - a.sayi).slice(0, 4);
  }, [rows]);

  const durumSayim = useMemo(() => {
    const o = { basarili: 0, mukerrer: 0, bulunamadi: 0, cakisma: 0 } as Record<string, number>;
    rows.forEach(r => { if (o[r.durum] != null) o[r.durum]++; });
    return o;
  }, [rows]);

  const goster = useMemo(() => {
    const filt = filtre === "tum" ? rows : rows.filter(r => r.durum === filtre);
    return filt.slice(0, 40);
  }, [rows, filtre]);

  const aktif = sonGecenSn < 5 && rows.length > 0;

  return (
    <div className="card overflow-hidden relative min-w-0">
      <div className="px-3 sm:px-4 py-2.5 border-b border-edge/50 bg-gradient-to-r from-cream/80 to-card">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative inline-flex h-2.5 w-2.5">
              <span className={cn("absolute inset-0 rounded-full", aktif ? "bg-good" : "bg-edge")} />
              {aktif && <span className="absolute inset-0 rounded-full bg-good/60 animate-ping" />}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-ink/80">
              {aktif ? "Canli" : "Beklemede"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Activity size={14} className="text-deep" />
            <div className="font-display text-2xl leading-none text-deep">
              <NumberTicker value={taramaDk} />
            </div>
            <span className="text-[10px] uppercase tracking-[0.16em] text-ink/55 self-end pb-0.5">tarama/dk</span>
          </div>

          <div className="hidden sm:block">
            <WaveBars buckets={buckets} />
          </div>

          <div className="ml-auto flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-[11px] text-ink/65">
              <Clock size={12} />
              {son ? (
                <span className="font-mono">
                  <b className="text-ink">{saatFormat(son.zaman)}</b>{" "}
                  <span className="text-ink/50">({relativeSure(sonGecenSn)})</span>
                </span>
              ) : <span>henuz yok</span>}
            </div>
            <div className="hidden md:flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-ink/55">
              <Radio size={11} /> ws
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex items-center gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1 text-[11px] overflow-x-auto pb-1 -mb-1 max-w-full">
            <FilterIcon size={12} className="text-ink/45" />
            {(["tum", "basarili", "mukerrer", "bulunamadi", "cakisma"] as FiltreTip[]).map(t => {
              const c = t === "tum" ? null : DURUM_CFG[t];
              const sayi = t === "tum" ? rows.length : durumSayim[t];
              return (
                <button key={t} onClick={() => setFiltre(t)}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition",
                    filtre === t
                      ? c ? c.filtreRenk : "bg-deep text-white"
                      : "bg-edge/25 text-ink/70 hover:bg-edge/45"
                  )}>
                  {t === "tum" ? "TUM" : c?.etiket} <span className="opacity-70 font-mono">{sayi}</span>
                </button>
              );
            })}
          </div>

          {kullaniciOzeti.length > 0 && (
            <div className="ml-auto flex items-center gap-1">
              <Users size={12} className="text-ink/45" />
              {kullaniciOzeti.map(u => (
                <div key={u.ad}
                  title={`${u.ad}: ${u.sayi} tarama, son ${relativeSure(Math.floor((now - u.son)/1000))}`}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-card border border-edge/60">
                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full text-[8px] font-bold text-white"
                    style={{ backgroundColor: u.renk }}>
                    {u.ad.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums font-bold">{u.sayi}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative">
        {goster.length === 0 ? (
          <div className="px-4 py-4 text-sm text-ink/55 font-mono">
            <span className="opacity-60">$</span> {filtre === "tum" ? "first scan bekleniyor" : `${filtre} icin kayit yok`}
            <span className="inline-block w-2 h-3.5 ml-1 align-middle bg-ink/30 animate-caret" />
          </div>
        ) : (
          <>
            <Marquee duration="60s" pauseOnHover repeat={3} className="py-3 px-3">
              {goster.map((r, i) => {
                const cfg = DURUM_CFG[r.durum];
                if (!cfg) return null;
                const Ikon = cfg.icon;
                const kAd = r.kullanici_ad ?? "?";
                const kRenk = kullaniciRengi(kAd);
                const isLatest = i === 0;
                return (
                  <button
                    key={r.id}
                    onClick={() => onSec?.(r)}
                    className={cn(
                      "group inline-flex items-center gap-2 px-3 py-2 rounded-xl border whitespace-nowrap shrink-0",
                      "transition-all hover:scale-[1.04] hover:shadow-md",
                      cfg.bg, cfg.ring,
                      isLatest && "relative ring-2 ring-accent/40",
                    )}
                  >
                    <span className="flex items-center gap-1 shrink-0">
                      <Ikon size={14} className={cfg.text} />
                      <span className={cn("text-[10px] font-bold tracking-wider", cfg.text)}>{cfg.etiket}</span>
                    </span>
                    <span className="text-[10px] font-mono text-ink/55 tabular-nums shrink-0">
                      {saatFormat(r.zaman)}
                    </span>
                    <span className="font-mono text-sm text-ink font-bold max-w-[160px] truncate">
                      {r.seri_giris}
                    </span>
                    {r.stok_kodu && (
                      <span className="text-[10px] font-mono text-ink/65 px-1.5 py-0.5 rounded bg-card border border-edge/50">
                        {r.stok_kodu}
                      </span>
                    )}
                    {r.urun_adi && (
                      <span className="text-[11px] text-ink/70 max-w-[140px] truncate">
                        {r.urun_adi}
                      </span>
                    )}
                    <span title={kAd}
                      className="inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: kRenk }}>
                      {kAd.slice(0, 1).toUpperCase()}
                    </span>
                    {isLatest && aktif && (
                      <BorderBeam size={60} duration={2.5} colorFrom="#BF6F34" colorTo="#FFE2CC" borderWidth={1.5} />
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
            style={{ width: "70%" }}
          />
        </AnimatePresence>
      )}
    </div>
  );
}
