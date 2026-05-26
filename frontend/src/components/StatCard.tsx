import { motion } from "framer-motion";
import NumberTicker from "./ui/NumberTicker";
import ProgressBar from "./ui/ProgressBar";
import { cn } from "../lib/cn";

type Props = {
  etiket: string;
  deger: number;
  toplam?: number;
  tone?: "deep" | "good" | "warn" | "accent";
  icon?: React.ReactNode;
  hint?: string;
};

const toneText: Record<NonNullable<Props["tone"]>, string> = {
  deep: "text-deep",
  good: "text-good",
  warn: "text-warn",
  accent: "text-accent",
};

const toneRing: Record<NonNullable<Props["tone"]>, string> = {
  deep: "ring-deep/15",
  good: "ring-good/30",
  warn: "ring-warn/40",
  accent: "ring-accent/30",
};

export default function StatCard({ etiket, deger, toplam, tone = "deep", icon, hint }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "relative card p-4 ring-1 overflow-hidden",
        toneRing[tone],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-ink/60 font-medium">{etiket}</div>
        {icon && <div className={cn("opacity-70", toneText[tone])}>{icon}</div>}
      </div>
      <div className={cn("font-display text-4xl mt-1 leading-none", toneText[tone])}>
        <NumberTicker value={deger} />
      </div>
      {hint && <div className="text-[11px] text-ink/55 mt-1">{hint}</div>}
      {typeof toplam === "number" && toplam > 0 && (
        <div className="mt-3">
          <ProgressBar value={deger} max={toplam} tone={tone === "deep" ? "accent" : tone} height={5} />
          <div className="text-[10px] text-ink/55 mt-1 font-mono">
            {Math.round((deger / toplam) * 100)}% · {deger}/{toplam}
          </div>
        </div>
      )}
    </motion.div>
  );
}
