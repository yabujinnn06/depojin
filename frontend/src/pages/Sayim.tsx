import { motion } from "framer-motion";
import { ArrowLeft, Camera, Download, PowerOff, Boxes, ListChecks, MinusCircle, ScanBarcode, BarChart3, Archive, Trash2, Wifi, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, LogSatir, Oturum, Ozet, StokOzet, Tarama } from "../lib/api";
import { connectSayimWS, SayimWS, PresenceUser, ChatMesaji, SesMesaji } from "../lib/ws";
import { sound } from "../lib/sound";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { useNavigate } from "react-router-dom";
import BarkodInput from "../components/BarkodInput";
import DurumKarti from "../components/DurumKarti";
import StatCard from "../components/StatCard";
import StokListesi from "../components/StokListesi";
import Terminal from "../components/Terminal";
import KameraTarayici from "../components/KameraTarayici";
import { BlurFade } from "../components/magic/BlurFade";
import CanliAkis from "../components/CanliAkis";
import BilinmeyenSeriPaneli from "../components/BilinmeyenSeriPaneli";
import StokDetayModal from "../components/StokDetayModal";
import SeriDetayModal from "../components/SeriDetayModal";
import TopluIslemler from "../components/TopluIslemler";
import PortalKarsilastirma from "../components/PortalKarsilastirma";
import PresencePanel from "../components/PresencePanel";
import TelsizFloating from "../components/TelsizFloating";
import { User as UserT } from "../lib/api";

export default function Sayim() {
  const { id } = useParams();
  const oturumId = Number(id);
  const { user } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [oturum, setOturum] = useState<Oturum | null>(null);
  const [ozet, setOzet] = useState<Ozet | null>(null);
  const [stoklar, setStoklar] = useState<StokOzet[]>([]);
  const [log, setLog] = useState<LogSatir[]>([]);
  const [son, setSon] = useState<Tarama | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [kameraAcik, setKameraAcik] = useState(false);
  const [wsAcik, setWsAcik] = useState(false);
  const [detayStok, setDetayStok] = useState<StokOzet | null>(null);
  const [detayLog, setDetayLog] = useState<LogSatir | null>(null);
  const [users, setUsers] = useState<UserT[]>([]);
  const [presence, setPresence] = useState<PresenceUser[]>([]);
  const [sonChat, setSonChat] = useState<ChatMesaji | SesMesaji | null>(null);
  const [wsRef, setWsRef] = useState<SayimWS | null>(null);
  const yenileRef = useRef<number | undefined>();

  const yenile = useCallback(async () => {
    try {
      const [o, oz, st, lg] = await Promise.all([
        api.oturum(oturumId),
        api.oturumOzet(oturumId),
        api.oturumStoklar(oturumId),
        api.oturumLog(oturumId, 80),
      ]);
      setOturum(o); setOzet(oz); setStoklar(st); setLog(lg);
    } catch (e: any) { setHata(e.message); }
  }, [oturumId]);

  useEffect(() => { yenile(); }, [yenile]);
  useEffect(() => {
    if (user?.rol === "admin") {
      api.users().then(setUsers).catch(() => {});
    } else if (user) {
      setUsers([{ id: user.id, ad: user.ad, rol: user.rol, aktif: true }]);
    }
  }, [user]);

  useEffect(() => {
    const ws: SayimWS = connectSayimWS(oturumId, (m) => {
      if (m.tip === "presence") {
        setPresence(m.kullanicilar);
        return;
      }
      if (m.tip === "chat" || m.tip === "voice") {
        setSonChat(m);
        return;
      }
      window.clearTimeout(yenileRef.current);
      yenileRef.current = window.setTimeout(yenile, 400);
    });
    ws.durum(setWsAcik);
    setWsRef(ws);
    return () => { ws.close(); setWsRef(null); };
  }, [oturumId, yenile]);

  useEffect(() => {
    if (!ozet || !oturum) return;
    document.title = `${ozet.sayilan_seri}/${ozet.toplam_seri} · ${oturum.ad} · Depojin`;
    return () => { document.title = "Depojin"; };
  }, [ozet, oturum]);

  async function tara(seri: string) {
    setHata(null); setBusy(true);
    try {
      const r = await api.tara(oturumId, seri);
      setSon(r);
      if (r.durum === "basarili") {
        sound.basarili();
        if (navigator.vibrate) navigator.vibrate(40);
      } else if (r.durum === "mukerrer" || r.durum === "cakisma") {
        sound.uyari();
        if (navigator.vibrate) navigator.vibrate([20, 30, 20]);
      } else if (r.durum === "bulunamadi") {
        sound.hata();
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      }
    } catch (e: any) {
      setHata(e.message);
      sound.hata();
    } finally {
      setBusy(false);
    }
  }

  const aktif = oturum?.durum === "aktif";

  async function bitir() {
    if (!confirm("Oturum kapatilsin mi?")) return;
    try { await api.oturumBitir(oturumId); toast.push("ok", "Oturum kapatildi"); yenile(); }
    catch (e: any) { toast.push("err", e.message); }
  }

  async function arsivle() {
    if (!confirm("Oturum arsive alinsin mi?")) return;
    try { await api.oturumArsivle(oturumId); toast.push("ok", "Arsive alindi"); yenile(); }
    catch (e: any) { toast.push("err", e.message); }
  }

  async function sil() {
    if (!confirm("Oturum kalici olarak silinecek. Tum stok/seri/log veri kaybi olur. Devam edilsin mi?")) return;
    try { await api.oturumSil(oturumId); toast.push("ok", "Oturum silindi"); nav("/"); }
    catch (e: any) { toast.push("err", e.message); }
  }

  async function indir() {
    try {
      const blob = await api.excelIndir(oturumId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `sayim_${oturum?.ad ?? oturumId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.push("ok", "Excel indirildi");
    } catch (e: any) { toast.push("err", e.message); }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "F2") {
        e.preventDefault();
        const inp = document.querySelector<HTMLInputElement>('input[placeholder*="Barkod"]');
        inp?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="space-y-5">
      <motion.header
        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between gap-3 flex-wrap min-w-0"
      >
        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1 basis-full sm:basis-auto">
          <Link to="/" className="mt-1 p-2 rounded-lg border border-edge hover:bg-card transition shrink-0">
            <ArrowLeft size={16} />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.22em] text-ink/55">Sayim Oturumu</div>
            <h2 className="font-display text-xl sm:text-3xl leading-tight break-words">{oturum?.ad ?? "…"}</h2>
            <div className="text-sm text-ink/65 mt-1 flex items-center gap-1.5 flex-wrap">
              {oturum?.lokasyon && <span>{oturum.lokasyon}</span>}
              <span className={
                "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full " +
                (aktif ? "bg-good/20 text-good ring-1 ring-good/30" : "bg-edge/40 text-ink/60")
              }>
                <span className={"h-1.5 w-1.5 rounded-full " + (aktif ? "bg-good animate-pulse" : "bg-ink/30")} />
                {oturum?.durum ?? "..."}
              </span>
              <span className={
                "inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] px-1.5 py-0.5 rounded " +
                (wsAcik ? "text-good" : "text-bad")
              } title={wsAcik ? "Realtime baglanti aktif" : "Realtime baglanti yok"}>
                {wsAcik ? <Wifi size={11} /> : <WifiOff size={11} />}
                {wsAcik ? "live" : "offline"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/sayim/${oturumId}/rapor`}
            className="btn btn-ghost text-sm flex items-center gap-1.5">
            <BarChart3 size={14} /> Rapor
          </Link>
          <button onClick={indir}
            className="btn btn-ghost text-sm flex items-center gap-1.5">
            <Download size={14} /> Excel
          </button>
          {user?.rol === "admin" && (
            <>
              {aktif && (
                <button onClick={bitir}
                  className="btn text-sm bg-bad text-white hover:bg-bad/90 flex items-center gap-1.5">
                  <PowerOff size={14} /> Kapat
                </button>
              )}
              {oturum?.durum === "tamamlandi" && (
                <button onClick={arsivle}
                  className="btn btn-ghost text-sm flex items-center gap-1.5">
                  <Archive size={14} /> Arsivle
                </button>
              )}
              <button onClick={sil}
                className="btn btn-ghost text-sm flex items-center gap-1.5 text-bad border-bad/40 hover:bg-bad/10"
                title="Oturumu kalici sil">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </motion.header>

      {ozet && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <BlurFade delay={0.05}><StatCard etiket="Stok" deger={ozet.stok_sayisi} tone="deep" icon={<Boxes size={16} />} /></BlurFade>
            <BlurFade delay={0.1}><StatCard etiket="Toplam Seri" deger={ozet.toplam_seri} tone="deep" icon={<ScanBarcode size={16} />} /></BlurFade>
            <BlurFade delay={0.15}><StatCard etiket="Sayilan" deger={ozet.sayilan_seri} toplam={ozet.toplam_seri} tone="good" icon={<ListChecks size={16} />} /></BlurFade>
            <BlurFade delay={0.2}><StatCard etiket="Kalan" deger={ozet.kalan_seri} toplam={ozet.toplam_seri} tone="warn" icon={<MinusCircle size={16} />} /></BlurFade>
          </div>
          <BlurFade delay={0.22}>
            <PortalKarsilastirma ozet={ozet} son={son} stoklar={stoklar} />
          </BlurFade>
        </>
      )}

      <BlurFade delay={0.25}>
        <CanliAkis rows={log} onSec={setDetayLog} />
      </BlurFade>

      <div className="grid lg:grid-cols-5 gap-4 min-w-0">
        <div className="lg:col-span-3 space-y-4 min-w-0">
          <BlurFade delay={0.3}>
            <BarkodInput onSubmit={tara} aktif={aktif} busy={busy} pauseFocus={kameraAcik} />
          </BlurFade>
          {hata && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-bad text-sm font-mono">
              ! {hata}
            </motion.div>
          )}
          <BlurFade delay={0.35}>
            <DurumKarti son={son} />
          </BlurFade>
          {son?.durum === "bulunamadi" && aktif && (
            <BilinmeyenSeriPaneli
              oturumId={oturumId}
              seri={son.seri}
              stoklar={stoklar}
              onBitti={() => { setSon(null); yenile(); }}
            />
          )}
          <BlurFade delay={0.4}>
            <div className="card overflow-hidden">
              <button
                onClick={() => setKameraAcik(v => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-cream transition"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Camera size={16} /> Kamera tarama
                </span>
                <span className="text-xs text-ink/55">{kameraAcik ? "Kapat" : "Ac"}</span>
              </button>
              {kameraAcik && (
                <div className="p-3 border-t border-edge/60">
                  <KameraTarayici onKod={tara} sonuc={son} />
                </div>
              )}
            </div>
          </BlurFade>
          <BlurFade delay={0.42}>
            <TopluIslemler
              oturumId={oturumId}
              users={users}
              aktif={!!aktif}
              onDegisti={yenile}
            />
          </BlurFade>
          <BlurFade delay={0.45}>
            <StokListesi rows={stoklar} onSec={setDetayStok} />
          </BlurFade>
        </div>
        <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-4 self-start min-w-0">
          <BlurFade delay={0.48} direction="left">
            <PresencePanel rows={presence} benimId={user?.id ?? null} />
          </BlurFade>
          <BlurFade delay={0.5} direction="left">
            <Terminal
              rows={log}
              oturumId={oturumId}
              baslik={`oturum_${oturumId}`}
              stoklar={stoklar}
              onSec={setDetayLog}
            />
          </BlurFade>
        </div>
      </div>
      <StokDetayModal
        stokId={detayStok?.id ?? null}
        stokKodu={detayStok?.stok_kodu}
        urunAdi={detayStok?.urun_adi}
        portalSayim={detayStok?.portal_sayim}
        onClose={() => setDetayStok(null)}
      />
      <SeriDetayModal row={detayLog} onClose={() => setDetayLog(null)} />
      <TelsizFloating ws={wsRef} son={sonChat} oturumId={oturumId} />
    </div>
  );
}
