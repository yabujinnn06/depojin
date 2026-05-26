import { motion } from "framer-motion";
import { FormEvent, useEffect, useRef, useState } from "react";
import { ScanLine } from "lucide-react";
import { cn } from "../lib/cn";
import { ShimmerButton } from "./magic/ShimmerButton";

type Props = { onSubmit: (deger: string) => void; aktif?: boolean; busy?: boolean };

export default function BarkodInput({ onSubmit, aktif = true, busy = false }: Props) {
  const [val, setVal] = useState("");
  const [focused, setFocused] = useState(true);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aktif) ref.current?.focus();
  }, [aktif]);

  useEffect(() => {
    if (!aktif) return;
    const tut = () => { if (document.activeElement !== ref.current) ref.current?.focus(); };
    const t = setInterval(tut, 1200);
    return () => clearInterval(t);
  }, [aktif]);

  function handle(e: FormEvent) {
    e.preventDefault();
    const v = val.trim();
    if (!v) return;
    onSubmit(v);
    setVal("");
  }

  return (
    <form onSubmit={handle} className="relative">
      <motion.div
        animate={{ scale: focused ? 1 : 0.995 }}
        className={cn(
          "relative flex items-stretch overflow-hidden rounded-2xl bg-card",
          "border-2 transition-colors duration-200",
          focused ? "border-deep" : "border-edge",
          busy && "ring-2 ring-accent/40",
        )}
      >
        <div className="pl-4 flex items-center pointer-events-none">
          <ScanLine
            size={22}
            className={cn("text-deep transition-transform", focused && "scale-110")}
          />
        </div>
        <input
          ref={ref}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Barkod veya seri numarasi"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 px-4 py-4 text-xl font-mono tracking-wider bg-transparent outline-none placeholder:text-ink/35"
          disabled={!aktif}
        />
        <ShimmerButton
          type="submit"
          disabled={!aktif}
          background="rgb(15,42,68)"
          shimmerColor="#BF8F6F"
          shimmerDuration="2.4s"
          borderRadius="0px"
          className="px-7 font-bold tracking-wider disabled:opacity-50 [border-radius:0_14px_14px_0]"
        >
          TARA
        </ShimmerButton>
        {focused && aktif && (
          <motion.div
            layoutId="scan-line"
            className="pointer-events-none absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"
            initial={{ top: 0 }}
            animate={{ top: "100%" }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
          />
        )}
      </motion.div>
      <div className="absolute -bottom-5 left-2 text-[10px] uppercase tracking-[0.18em] text-ink/40">
        {aktif ? "USB barkod okuyucu icin Enter; veya yaz" : "Oturum kapali"}
      </div>
    </form>
  );
}
