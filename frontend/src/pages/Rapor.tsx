import { motion } from "framer-motion";
import { ArrowLeft, ScanLine, Download } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, EksikGrup, Istatistik, Oturum, Ozet } from "../lib/api";
import StatCard from "../components/StatCard";
import DurumDonut from "../components/rapor/DurumDonut";
import KullaniciKartlari from "../components/rapor/KullaniciKartlari";
import HizChart from "../components/rapor/HizChart";
import EksikListe from "../components/rapor/EksikListe";
import LogTablo from "../components/rapor/LogTablo";
import { BlurFade } from "../components/magic/BlurFade";
import { AnimatedGradientText } from "../components/magic/AnimatedGradientText";

export default function Rapor() {
  const { id } = useParams();
  const oturumId = Number(id);
  const [oturum, setOturum] = useState<Oturum | null>(null);
  const [ozet, setOzet] = useState<Ozet | null>(null);
  const [stat, setStat] = useState<Istatistik | null>(null);
  const [eksik, setEksik] = useState<EksikGrup[]>([]);

  const yenile = useCallback(async () => {
    const [o, oz, st, ek] = await Promise.all([
      api.oturum(oturumId),
      api.oturumOzet(oturumId),
      api.istatistik(oturumId),
      api.eksik(oturumId),
    ]);
    setOturum(o); setOzet(oz); setStat(st); setEksik(ek);
  }, [oturumId]);

  useEffect(() => { yenile(); }, [yenile]);
  useEffect(() => {
    let t: number | undefined;
    function plan() {
      window.clearInterval(t);
      if (document.visibilityState === "visible") {
        t = window.setInterval(yenile, 15_000);
      }
    }
    plan();
    document.addEventListener("visibilitychange", plan);
    return () => { window.clearInterval(t); document.removeEventListener("visibilitychange", plan); };
  }, [yenile]);

  async function excelIndir() {
    const blob = await api.excelIndir(oturumId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `sayim_${oturum?.ad ?? oturumId}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <motion.header
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between gap-3 flex-wrap"
      >
        <div className="flex items-start gap-3">
          <Link to="/" className="mt-1 p-2 rounded-lg border border-edge hover:bg-card transition">
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-ink/55">Rapor</div>
            <h2 className="font-display text-3xl leading-tight">{oturum?.ad ?? "…"}</h2>
            <div className="text-sm text-ink/65 mt-0.5">{oturum?.lokasyon ?? "-"} · {oturum?.durum}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/sayim/${oturumId}`}
            className="btn btn-ghost text-sm flex items-center gap-1.5">
            <ScanLine size={14} /> Tarama ekranina don
          </Link>
          <button onClick={excelIndir}
            className="btn btn-primary text-sm flex items-center gap-1.5">
            <Download size={14} /> Sayim Excel
          </button>
        </div>
      </motion.header>

      {ozet && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <BlurFade delay={0.05}><StatCard etiket="Stok" deger={ozet.stok_sayisi} tone="deep" /></BlurFade>
          <BlurFade delay={0.10}><StatCard etiket="Toplam Seri" deger={ozet.toplam_seri} tone="deep" /></BlurFade>
          <BlurFade delay={0.15}><StatCard etiket="Sayilan" deger={ozet.sayilan_seri} toplam={ozet.toplam_seri} tone="good" /></BlurFade>
          <BlurFade delay={0.20}><StatCard etiket="Kalan" deger={ozet.kalan_seri} toplam={ozet.toplam_seri} tone="warn" /></BlurFade>
        </div>
      )}

      {stat && (
        <div className="grid lg:grid-cols-2 gap-4">
          <BlurFade delay={0.25}><DurumDonut data={stat.durum_dagilimi} /></BlurFade>
          <BlurFade delay={0.30}><HizChart rows={stat.dakika_serisi} hiz={stat.tarama_dakika_dk} /></BlurFade>
        </div>
      )}

      {stat && (
        <BlurFade delay={0.35}>
          <section>
            <div className="font-display text-xl mb-3">
              <AnimatedGradientText colorFrom="#0F2A44" colorTo="#BF6F34" speed={1}>
                Kullanici basina
              </AnimatedGradientText>
            </div>
            <KullaniciKartlari rows={stat.kullanici_basina} />
          </section>
        </BlurFade>
      )}

      <BlurFade delay={0.4} inView>
        <section>
          <div className="font-display text-xl mb-3">
            <AnimatedGradientText colorFrom="#0F2A44" colorTo="#BF6F34" speed={1}>
              Tarama log
            </AnimatedGradientText>
          </div>
          <LogTablo oturumId={oturumId} kullanicilar={stat?.kullanici_basina ?? []} />
        </section>
      </BlurFade>

      <BlurFade delay={0.45} inView>
        <section>
          <div className="font-display text-xl mb-3">
            <AnimatedGradientText colorFrom="#0F2A44" colorTo="#BF6F34" speed={1}>
              Eksik analizi
            </AnimatedGradientText>
          </div>
          <EksikListe rows={eksik} />
        </section>
      </BlurFade>
    </div>
  );
}
