import { KeyRound, User } from "lucide-react";
import DepoJinLogo from "../components/DepoJinLogo";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { DotPattern } from "../components/magic/DotPattern";
import { AnimatedGradientText } from "../components/magic/AnimatedGradientText";
import { ShimmerButton } from "../components/magic/ShimmerButton";
import { BlurFade } from "../components/magic/BlurFade";
import { Ripple } from "../components/magic/Ripple";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [ad, setAd] = useState("admin");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try { await login(ad, pin); nav("/"); }
    catch (e: any) { setErr(e.message ?? "Giris hatasi"); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-cream">
      <DotPattern
        glow
        className="text-deep/20 [mask-image:radial-gradient(circle_at_center,white,transparent_75%)]"
      />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[420px]">
          <Ripple color="rgba(15,42,68,0.20)" mainCircleOpacity={0.18} numCircles={6} />
        </div>
      </div>
      <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-accent/12 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-deep/15 blur-3xl pointer-events-none" />

      <div className="relative min-h-screen flex items-center justify-center px-4">
        <BlurFade delay={0.05} duration={0.5} offset={20}>
          <form
            onSubmit={onSubmit}
            className="card p-8 w-full max-w-sm space-y-5 shadow-2xl shadow-deep/15 backdrop-blur-sm"
          >
            <div className="text-center">
              <BlurFade delay={0.2} duration={0.5}>
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-deep shadow-lg shadow-deep/30 p-1">
                  <DepoJinLogo size={56} />
                </div>
              </BlurFade>
              <BlurFade delay={0.3} duration={0.4}>
                <div className="font-display text-4xl font-bold mt-3">
                  <AnimatedGradientText
                    colorFrom="#0F2A44"
                    colorTo="#BF6F34"
                    speed={1.2}
                  >
                    Depojin
                  </AnimatedGradientText>
                </div>
              </BlurFade>
              <BlurFade delay={0.4} duration={0.4}>
                <div className="text-xs uppercase tracking-[0.22em] text-ink/55 mt-1">
                  Depo sayim sistemi
                </div>
              </BlurFade>
            </div>

            <BlurFade delay={0.5} duration={0.4}>
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.18em] text-ink/60">Kullanici adi</span>
                <div className="mt-1.5 relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                  <input
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-edge bg-white focus:border-deep outline-none transition"
                    value={ad} onChange={(e) => setAd(e.target.value)} autoFocus
                  />
                </div>
              </label>
            </BlurFade>

            <BlurFade delay={0.6} duration={0.4}>
              <label className="block">
                <span className="text-[11px] uppercase tracking-[0.18em] text-ink/60">PIN</span>
                <div className="mt-1.5 relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
                  <input
                    type="password" inputMode="numeric"
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-edge bg-white tracking-[0.5em] text-xl text-center focus:border-deep outline-none transition"
                    value={pin} onChange={(e) => setPin(e.target.value)}
                  />
                </div>
              </label>
            </BlurFade>

            {err && (
              <BlurFade direction="up" offset={8}>
                <div className="text-bad text-sm font-medium">{err}</div>
              </BlurFade>
            )}

            <BlurFade delay={0.7} duration={0.4}>
              <ShimmerButton
                type="submit"
                disabled={busy}
                background="rgb(15,42,68)"
                shimmerColor="#BF8F6F"
                shimmerDuration="2.6s"
                borderRadius="12px"
                className="w-full py-3 font-semibold tracking-wide disabled:opacity-60"
              >
                {busy ? "Giris yapiliyor..." : "Giris"}
              </ShimmerButton>
            </BlurFade>

            <BlurFade delay={0.85} duration={0.4}>
              <div className="text-[11px] text-ink/55 text-center">
                Varsayilan admin PIN: <span className="font-mono">ADMIN_PIN env</span>
              </div>
            </BlurFade>
          </form>
        </BlurFade>
      </div>
    </div>
  );
}
