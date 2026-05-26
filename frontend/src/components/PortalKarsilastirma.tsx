import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { Scale, TrendingDown, TrendingUp, Equal, Target, ArrowRight } from "lucide-react";
import { Ozet, StokOzet, Tarama } from "../lib/api";
import NumberTicker from "./ui/NumberTicker";
import { cn } from "../lib/cn";

type Props = {
  ozet: Ozet;
  son: Tarama | null;
  stoklar: StokOzet[];
};

function farkRenk(fark: number): string {
  if (fark === 0) return "text-good";
  if (fark > 0) return "text-warn";
  return "text-bad";
}

function farkIkon(fark: number) {
  if (fark === 0) return Equal;
  if (fark > 0) return TrendingUp;
  return TrendingDown;
}

function farkEt(fark: number): string {
  if (fark === 0) return "TAM";
  if (fark > 0) return "FAZLA";
  return "EKSIK";
}

export default function PortalKarsilastirma({ ozet, son, stoklar }: Props) {
  const yuzde = ozet.portal_toplam > 0 ? Math.min(100, (ozet.sayilan_seri / ozet.portal_toplam) * 100) : 0;

  const sonStok = useMemo(() => {
    if (!son?.stok_kodu) return null;
    return stoklar.find(s => s.stok_kodu === son.stok_kodu) ?? null;
  }, [son, stoklar]);

  const topSapma = useMemo(() => {
    return [...stoklar]
      .filter(s => s.portal_sayim > 0 || s.toplam > 0)
      .map(s => ({ ...s, fark: s.sayilan - s.portal_sayim, mutlak: Math.abs(s.sayilan - s.portal_sayim) }))
      .filter(s => s.fark !== 0)
      .sort((a, b) => b.mutlak - a.mutlak)
      .slice(0, 5);
  }, [stoklar]);

  const GenelIkon = farkIkon(ozet.portal_fark);

  return (
    <div className="card overflow-hidden">
      <div className="px-3 sm:px-4 py-2.5 bg-deep text-white flex items-center gap-2 flex-wrap">
        <Scale size={16} />
        <span className="text-sm font-semibold tracking-wide">PORTAL KARSILASTIRMA</span>
        <span className="ml-auto text-[10px] uppercase tracking-[0.18em] opacity-70">
          Portal: depoda olmasi gereken miktar
        </span>
      </div>

      <div className="p-3 sm:p-4 space-y-4">
        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 min-w-0">
          <Kart
            etiket="Portalda"
            deger={ozet.portal_toplam}
            ikon={<Target size={14} className="text-deep" />}
            renk="text-deep"
          />
          <Kart
            etiket="Sayilan"
            deger={ozet.sayilan_seri}
            ikon={<ArrowRight size={14} className="text-good" />}
            renk="text-good"
            altYazi={`${yuzde.toFixed(1)}%`}
          />
          <Kart
            etiket={`Fark · ${farkEt(ozet.portal_fark)}`}
            deger={ozet.portal_fark}
            ikon={<GenelIkon size={14} className={farkRenk(ozet.portal_fark)} />}
            renk={farkRenk(ozet.portal_fark)}
            isaret
          />
        </div>

        <div className="relative h-2.5 rounded-full bg-edge/40 overflow-hidden">
          <motion.div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-good/70 to-good"
            initial={false}
            animate={{ width: `${yuzde}%` }}
            transition={{ type: "spring", damping: 22, stiffness: 130 }}
          />
          {ozet.portal_toplam > 0 && ozet.sayilan_seri > ozet.portal_toplam && (
            <motion.div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-warn/40 to-warn/70 mix-blend-multiply"
              initial={false}
              animate={{ width: `${(ozet.sayilan_seri / ozet.portal_toplam) * 100 - 100}%` }}
            />
          )}
        </div>

        <AnimatePresence mode="wait">
          {sonStok && (
            <motion.div
              key={sonStok.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="rounded-xl border-2 border-accent/40 bg-accent/5 p-3 space-y-2"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] uppercase tracking-[0.22em] text-accent font-bold">Son okutulan stok</span>
                <span className="font-mono text-xs bg-deep text-white px-2 py-0.5 rounded">{sonStok.stok_kodu}</span>
                <span className="font-medium truncate flex-1 min-w-0">{sonStok.urun_adi}</span>
              </div>
              <SonStokSatiri stok={sonStok} />
            </motion.div>
          )}
        </AnimatePresence>

        {topSapma.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-ink/55 font-bold">
              En buyuk sapmalar
            </div>
            <ul className="space-y-1">
              {topSapma.map(s => {
                const Ikon = farkIkon(s.fark);
                return (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="font-mono text-xs bg-edge/30 px-1.5 py-0.5 rounded shrink-0">{s.stok_kodu}</span>
                    <span className="truncate flex-1 min-w-0 text-ink/80">{s.urun_adi}</span>
                    <span className="font-mono text-xs text-ink/55 shrink-0">{s.sayilan}/{s.portal_sayim}</span>
                    <span className={cn("inline-flex items-center gap-0.5 font-mono text-sm font-bold tabular-nums shrink-0", farkRenk(s.fark))}>
                      <Ikon size={12} />
                      {s.fark > 0 ? "+" : ""}{s.fark}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Kart({
  etiket, deger, ikon, renk, altYazi, isaret,
}: { etiket: string; deger: number; ikon?: React.ReactNode; renk: string; altYazi?: string; isaret?: boolean }) {
  const gosterilen = isaret && deger > 0 ? `+${deger}` : String(deger);
  return (
    <div className="rounded-lg bg-cream/60 p-2 sm:p-3 ring-1 ring-edge/40 min-w-0">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-ink/55 truncate">
        {ikon} <span className="truncate">{etiket}</span>
      </div>
      <div className={cn("font-display text-lg sm:text-3xl mt-1 leading-none tabular-nums truncate", renk)}>
        {isaret ? (
          <span>{gosterilen.charAt(0) === "+" ? "+" : gosterilen.charAt(0) === "-" ? "-" : ""}
            <NumberTicker value={Math.abs(deger)} />
          </span>
        ) : <NumberTicker value={deger} />}
      </div>
      {altYazi && <div className="text-[11px] text-ink/55 mt-1 font-mono">{altYazi}</div>}
    </div>
  );
}

function SonStokSatiri({ stok }: { stok: StokOzet & { fark?: number } }) {
  const fark = stok.sayilan - stok.portal_sayim;
  const Ikon = farkIkon(fark);
  const yuzde = stok.portal_sayim > 0 ? Math.min(150, (stok.sayilan / stok.portal_sayim) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-3 gap-2">
        <Mini etiket="Portal" deger={stok.portal_sayim} renk="text-deep" />
        <Mini etiket="Sayilan" deger={stok.sayilan} renk="text-good" />
        <Mini etiket={farkEt(fark)} deger={fark} renk={farkRenk(fark)} isaret ikon={<Ikon size={12} />} />
      </div>
      {stok.portal_sayim > 0 && (
        <div className="relative h-1.5 rounded-full bg-edge/40 overflow-hidden">
          <motion.div
            className={cn("absolute left-0 top-0 h-full",
              fark >= 0 ? "bg-good" : "bg-bad")}
            initial={false}
            animate={{ width: `${Math.min(100, yuzde)}%` }}
            transition={{ type: "spring", damping: 22 }}
          />
          {yuzde > 100 && (
            <motion.div
              className="absolute left-0 top-0 h-full bg-warn/70"
              initial={false}
              animate={{ width: `${Math.min(50, yuzde - 100)}%` }}
            />
          )}
        </div>
      )}
      <div className="text-[11px] text-ink/55 font-mono">
        Stokta toplam {stok.toplam} seri kayitli · sayilan {stok.sayilan}
      </div>
    </div>
  );
}

function Mini({ etiket, deger, renk, isaret, ikon }: { etiket: string; deger: number; renk: string; isaret?: boolean; ikon?: React.ReactNode }) {
  return (
    <div className="rounded-md bg-white/80 px-2 py-1 border border-edge/50">
      <div className="text-[9px] uppercase tracking-[0.14em] text-ink/55 flex items-center gap-1">
        {ikon}{etiket}
      </div>
      <div className={cn("font-mono text-base font-bold leading-tight tabular-nums", renk)}>
        {isaret && deger > 0 ? "+" : ""}{deger}
      </div>
    </div>
  );
}
