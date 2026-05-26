import { Plus, MapPin, Calendar, ArrowRight, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Oturum } from "../lib/api";
import { useAuth } from "../lib/auth";
import { cn } from "../lib/cn";
import { BlurFade } from "../components/magic/BlurFade";
import { MagicCard } from "../components/magic/MagicCard";
import { ShimmerButton } from "../components/magic/ShimmerButton";
import { AnimatedGradientText } from "../components/magic/AnimatedGradientText";

export default function Oturumlar() {
  const { user } = useAuth();
  const [list, setList] = useState<Oturum[]>([]);
  const [ad, setAd] = useState("");
  const [lokasyon, setLokasyon] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh() { setList(await api.oturumlar()); }
  useEffect(() => { refresh(); }, []);

  async function yeni() {
    setErr(null);
    if (!ad.trim()) { setErr("Ad bos olamaz"); return; }
    setBusy(true);
    try { await api.yeniOturum(ad, lokasyon); setAd(""); setLokasyon(""); refresh(); }
    catch (e: any) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <section className="lg:col-span-2 space-y-3">
        <BlurFade>
          <header>
            <div className="text-[10px] uppercase tracking-[0.22em] text-ink/55">Aktif islemler</div>
            <h2 className="font-display text-3xl">
              <AnimatedGradientText colorFrom="#0F2A44" colorTo="#BF6F34" speed={1}>
                Sayim oturumlari
              </AnimatedGradientText>
            </h2>
          </header>
        </BlurFade>
        <div className="space-y-2">
          {list.length === 0 && (
            <BlurFade>
              <div className="card p-8 text-center text-ink/60">
                Henuz oturum yok. {user?.rol === "admin" && "Sagdan yeni olustur."}
              </div>
            </BlurFade>
          )}
          {list.map((o, i) => {
            const aktif = o.durum === "aktif";
            return (
              <BlurFade key={o.id} delay={i * 0.05} duration={0.35} offset={10}>
                <MagicCard
                  className="rounded-[14px] border border-edge"
                  gradientFrom="#BF6F34"
                  gradientTo="#7FB3E0"
                  gradientColor="rgba(191,111,52,0.14)"
                  gradientSize={260}
                  background="#FFFCF8"
                >
                  <Link
                    to={`/sayim/${o.id}`}
                    className={cn(
                      "block p-4 transition group",
                      aktif && "ring-1 ring-good/20",
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-display text-xl font-semibold truncate">{o.ad}</div>
                        <div className="text-xs text-ink/65 mt-1 flex items-center gap-3 flex-wrap">
                          {o.lokasyon && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin size={12} />{o.lokasyon}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(o.baslangic).toLocaleString("tr-TR")}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <Link
                          to={`/sayim/${o.id}/rapor`}
                          onClick={(e) => e.stopPropagation()}
                          title="Rapor"
                          className="p-1.5 rounded-md text-ink/55 hover:text-deep hover:bg-cream transition"
                        >
                          <BarChart3 size={14} />
                        </Link>
                        <span className={cn(
                          "text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-full font-semibold",
                          aktif ? "bg-good/20 text-good ring-1 ring-good/30"
                                : "bg-edge/40 text-ink/55",
                        )}>
                          {aktif && <span className="inline-block h-1.5 w-1.5 rounded-full bg-good animate-pulse mr-1 align-middle" />}
                          {o.durum}
                        </span>
                        <ArrowRight size={16} className="text-ink/40 group-hover:translate-x-1 group-hover:text-deep transition" />
                      </div>
                    </div>
                  </Link>
                </MagicCard>
              </BlurFade>
            );
          })}
        </div>
      </section>

      {user?.rol === "admin" && (
        <BlurFade direction="left" delay={0.1}>
          <aside className="card p-5 h-fit space-y-3 lg:sticky lg:top-20">
            <h3 className="font-display text-xl font-semibold flex items-center gap-2">
              <Plus size={16} className="text-accent" /> Yeni oturum
            </h3>
            <label className="block text-sm">
              <span className="text-[11px] uppercase tracking-[0.16em] text-ink/55">Ad</span>
              <input className="mt-1.5 w-full px-3 py-2 rounded-lg border border-edge bg-white focus:border-deep outline-none"
                value={ad} onChange={(e) => setAd(e.target.value)} placeholder="2026-05 Ankara" />
            </label>
            <label className="block text-sm">
              <span className="text-[11px] uppercase tracking-[0.16em] text-ink/55">Lokasyon</span>
              <input className="mt-1.5 w-full px-3 py-2 rounded-lg border border-edge bg-white focus:border-deep outline-none"
                value={lokasyon} onChange={(e) => setLokasyon(e.target.value)} placeholder="Ankara depo" />
            </label>
            {err && <div className="text-bad text-sm">{err}</div>}
            <ShimmerButton
              type="button"
              onClick={yeni}
              disabled={busy}
              background="rgb(191,111,52)"
              shimmerColor="#FFE2CC"
              borderRadius="10px"
              className="w-full py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {busy ? "Olusturuluyor..." : "Olustur"}
            </ShimmerButton>
          </aside>
        </BlurFade>
      )}
    </div>
  );
}
