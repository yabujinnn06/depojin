import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, FlashlightOff, Flashlight, RefreshCcw, Maximize2, Minimize2, Zap, CheckCircle2, AlertTriangle, XCircle, GitMerge, X, Loader2 } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException, Result } from "@zxing/library";
import { sound } from "../lib/sound";
import { cn } from "../lib/cn";
import { Ozet, Tarama } from "../lib/api";

type Props = {
  onKod: (kod: string) => void;
  sonuc?: Tarama | null;
  ozet?: Ozet | null;
};

type Kayit = {
  id: number;
  kod: string;
  ts: number;
  sonuc?: Tarama;
};

const D_RENK: Record<string, string> = {
  basarili: "border-good/40 bg-good/15 text-good",
  mukerrer: "border-warn/40 bg-warn/15 text-warn",
  bulunamadi: "border-bad/40 bg-bad/15 text-bad",
  cakisma: "border-warn/50 bg-warn/20 text-warn",
};
const D_IKON: Record<string, any> = {
  basarili: CheckCircle2, mukerrer: AlertTriangle,
  bulunamadi: XCircle, cakisma: GitMerge,
};
const D_ET: Record<string, string> = {
  basarili: "OK", mukerrer: "DUP", bulunamadi: "404", cakisma: "CONF",
};

const FORMATLAR = [
  BarcodeFormat.QR_CODE, BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.CODE_128, BarcodeFormat.CODE_39, BarcodeFormat.CODE_93,
  BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
  BarcodeFormat.ITF, BarcodeFormat.CODABAR, BarcodeFormat.PDF_417, BarcodeFormat.AZTEC,
];

const NATIVE_FORMATLAR = [
  "qr_code", "code_128", "code_39", "code_93", "ean_13", "ean_8",
  "upc_a", "upc_e", "itf", "codabar", "data_matrix", "aztec", "pdf417",
];

const COOLDOWN_MS = 700;
const ZORLANMA_ESIK_MS = 6000;
const TORCH_AC_MS = 1500;
const TORCH_KAPA_MS = 800;
const TORCH_DENEME_MAX = 4;
const NATIVE_TARAMA_MS = 110;
const ZXING_GECIKME_MS = 140;

function normalize(s: string): string {
  return s.toUpperCase().replace(/[\s\r\n\t]/g, "");
}

let _seq = 1;

export default function KameraTarayici({ onKod, sonuc, ozet }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sonOkumaRef = useRef<{ kod: string; t: number } | null>(null);
  const sonAktiviteRef = useRef<number>(Date.now());
  const loopTimerRef = useRef<number | null>(null);
  const torchPatternRef = useRef<number | null>(null);
  const torchDenemeRef = useRef<number>(0);

  const [cihazlar, setCihazlar] = useState<MediaDeviceInfo[]>([]);
  const [secCihaz, setSecCihaz] = useState<string | null>(null);
  const [acik] = useState(true);
  const [tam, setTam] = useState(false);
  const [torch, setTorch] = useState(false);
  const [torchVar, setTorchVar] = useState(false);
  const [otoTorch, setOtoTorch] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [sayac, setSayac] = useState(0);
  const [flas, setFlas] = useState(0);
  const [gecmis, setGecmis] = useState<Kayit[]>([]);
  const [hazir, setHazir] = useState(false);

  const torchUygula = useCallback(async (acik: boolean) => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: acik }] as any });
      setTorch(acik);
    } catch { /* ignore */ }
  }, []);

  const otoTorchDur = useCallback(async () => {
    if (torchPatternRef.current) {
      window.clearTimeout(torchPatternRef.current);
      torchPatternRef.current = null;
    }
    torchDenemeRef.current = 0;
    if (torch) await torchUygula(false);
  }, [torch, torchUygula]);

  const otoTorchDongu = useCallback(async () => {
    if (!torchVar || !otoTorch) return;
    if (torchDenemeRef.current >= TORCH_DENEME_MAX) { await otoTorchDur(); return; }
    torchDenemeRef.current += 1;
    await torchUygula(true);
    torchPatternRef.current = window.setTimeout(async () => {
      await torchUygula(false);
      torchPatternRef.current = window.setTimeout(otoTorchDongu, TORCH_KAPA_MS);
    }, TORCH_AC_MS);
  }, [torchVar, otoTorch, torchUygula, otoTorchDur]);

  const tetikle = useCallback((kod: string) => {
    if (!kod) return;
    const now = Date.now();
    const son = sonOkumaRef.current;
    if (son && son.kod === kod && now - son.t < COOLDOWN_MS) return;
    sonOkumaRef.current = { kod, t: now };
    sonAktiviteRef.current = now;
    setSayac(s => s + 1);
    setFlas(f => f + 1);
    try { navigator.vibrate?.([35, 20, 35]); } catch {}
    sound.kameraBip();
    setGecmis(g => [{ id: _seq++, kod, ts: now }, ...g].slice(0, 6));
    onKod(kod);
    otoTorchDur();
  }, [onKod, otoTorchDur]);

  useEffect(() => {
    if (!sonuc?.seri) return;
    const hedef = normalize(sonuc.seri);
    setGecmis(g => {
      let bulundu = false;
      const arr = g.map(k => {
        if (bulundu) return k;
        if (k.sonuc) return k;
        if (normalize(k.kod) === hedef) {
          bulundu = true;
          return { ...k, sonuc };
        }
        return k;
      });
      return arr;
    });
  }, [sonuc]);

  useEffect(() => {
    if (!secCihaz) return;
    navigator.mediaDevices?.enumerateDevices().then(d => {
      const v = d.filter(x => x.kind === "videoinput");
      if (v.length) setCihazlar(v);
    }).catch(() => {});
  }, [secCihaz]);

  useEffect(() => {
    if (!acik) return;
    let iptal = false;
    setHata(null);
    setHazir(false);
    sonAktiviteRef.current = Date.now();

    async function nativeBaslat(stream: MediaStream) {
      const W = window as any;
      if (!("BarcodeDetector" in W)) return false;
      try {
        const desteklenen: string[] = await W.BarcodeDetector.getSupportedFormats?.() ?? NATIVE_FORMATLAR;
        const formats = NATIVE_FORMATLAR.filter(f => desteklenen.includes(f));
        if (!formats.length) return false;
        const det = new W.BarcodeDetector({ formats });
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        let calisiyor = false;
        const tek = async () => {
          if (iptal || !videoRef.current) return;
          if (calisiyor || document.visibilityState !== "visible") return;
          calisiyor = true;
          try {
            const codes = await det.detect(videoRef.current);
            if (codes && codes.length) tetikle(String(codes[0].rawValue ?? ""));
          } catch { /* ignore */ }
          calisiyor = false;
        };
        loopTimerRef.current = window.setInterval(tek, NATIVE_TARAMA_MS);
        return true;
      } catch { return false; }
    }

    async function zxingBaslat(stream: MediaStream) {
      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATLAR);
      hints.set(DecodeHintType.TRY_HARDER, false);
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: ZXING_GECIKME_MS });
      readerRef.current = reader;
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      reader.decodeFromStream(stream, v, (result: Result | undefined, err: any) => {
        if (iptal) return;
        if (result) tetikle(result.getText());
        if (err && !(err instanceof NotFoundException)) { /* ignore */ }
      }).catch(() => {});
    }

    async function baslat() {
      try {
        const video: MediaTrackConstraints = secCihaz
          ? { deviceId: { exact: secCihaz } }
          : { facingMode: { ideal: "environment" } };
        Object.assign(video, {
          width: { ideal: 1280 }, height: { ideal: 720 },
          frameRate: { ideal: 24, max: 30 },
        });
        const stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
        if (iptal) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        setHazir(true);

        if (!secCihaz) {
          try {
            const allDev = await navigator.mediaDevices.enumerateDevices();
            const vs = allDev.filter(x => x.kind === "videoinput");
            if (vs.length) {
              setCihazlar(vs);
              const arka = vs.find(x => /back|rear|arka|environment/i.test(x.label)) ?? vs[vs.length - 1];
              setSecCihaz(arka.deviceId);
            }
          } catch { /* ignore */ }
        }

        const track = stream.getVideoTracks()[0];
        try {
          await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] });
        } catch { /* ignore */ }
        const caps = track.getCapabilities ? track.getCapabilities() as any : {};
        setTorchVar(!!caps.torch);

        const nativeOK = await nativeBaslat(stream);
        if (!nativeOK) await zxingBaslat(stream);
      } catch (e: any) {
        setHata(e?.message ?? "Kamera acilamadi");
      }
    }
    baslat();

    return () => {
      iptal = true;
      if (loopTimerRef.current) window.clearInterval(loopTimerRef.current);
      loopTimerRef.current = null;
      if (torchPatternRef.current) window.clearTimeout(torchPatternRef.current);
      try { readerRef.current && (readerRef.current as any).reset?.(); } catch {}
      readerRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [acik, secCihaz, tetikle]);

  useEffect(() => {
    if (!otoTorch || !torchVar) return;
    const t = setInterval(() => {
      if (torchPatternRef.current) return;
      const gecen = Date.now() - sonAktiviteRef.current;
      if (gecen > ZORLANMA_ESIK_MS) {
        torchDenemeRef.current = 0;
        otoTorchDongu();
      }
    }, 1500);
    return () => clearInterval(t);
  }, [otoTorch, torchVar, otoTorchDongu]);

  async function torchToggle() {
    if (!torchVar) return;
    await otoTorchDur();
    await torchUygula(!torch);
  }

  function digerKamera() {
    if (cihazlar.length < 2) return;
    const idx = cihazlar.findIndex(c => c.deviceId === secCihaz);
    const next = cihazlar[(idx + 1) % cihazlar.length];
    setSecCihaz(next.deviceId);
  }

  const sonAktif = gecmis[0];

  const videoBlok = (
    <div className={cn("relative overflow-hidden bg-deeper",
      tam ? "h-full w-full" : "aspect-[4/3] sm:aspect-video rounded-xl")}>
      <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover"
        playsInline muted autoPlay />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative w-[78%] h-[58%] max-w-[640px]">
          <Kose pos="tl" /><Kose pos="tr" /><Kose pos="bl" /><Kose pos="br" />
          <div
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_20px_2px_rgba(191,111,52,0.85)]"
            style={{ animation: "km-scan 2.4s linear infinite", top: 0 }}
          />
        </div>
      </div>

      <AnimatePresence>
        {flas > 0 && (
          <motion.div
            key={flas}
            initial={{ opacity: 0.55 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none absolute inset-0 bg-good ring-4 ring-good/80"
          />
        )}
      </AnimatePresence>

      {!hazir && !hata && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-deeper/70 text-white">
          <Loader2 size={28} className="animate-spin text-accent" />
          <div className="text-xs uppercase tracking-[0.22em] opacity-80">Kamera baslatiliyor</div>
        </div>
      )}

      {hata && (
        <div className="absolute inset-0 flex items-center justify-center text-bad text-xs p-3 text-center bg-black/70 backdrop-blur">
          {hata}
        </div>
      )}
    </div>
  );

  const ucBar = (
    <div className={cn("flex items-center gap-1",
      tam ? "" : "ml-auto"
    )}>
      {torchVar && (
        <button onClick={() => setOtoTorch(v => !v)}
          title={otoTorch ? "Oto-flasi kapat" : "Oto-flasi ac"}
          className={cn(
            "rounded-md text-white flex items-center justify-center backdrop-blur",
            tam ? "h-11 w-11" : "h-8 w-8",
            otoTorch ? "bg-good/40 hover:bg-good/60" : "bg-black/40 hover:bg-black/60"
          )}>
          <Zap size={tam ? 18 : 14} />
        </button>
      )}
      {torchVar && (
        <button onClick={torchToggle} title="Flas"
          className={cn("rounded-md bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur",
            tam ? "h-11 w-11" : "h-8 w-8")}>
          {torch ? <Flashlight size={tam ? 18 : 14} /> : <FlashlightOff size={tam ? 18 : 14} />}
        </button>
      )}
      {cihazlar.length > 1 && (
        <button onClick={digerKamera} title="Diger kamera"
          className={cn("rounded-md bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur",
            tam ? "h-11 w-11" : "h-8 w-8")}>
          <RefreshCcw size={tam ? 18 : 14} />
        </button>
      )}
      <button onClick={() => setTam(t => !t)} title={tam ? "Kucult" : "Buyut"}
        className={cn("rounded-md bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur",
          tam ? "h-11 w-11" : "h-8 w-8")}>
        {tam ? <X size={tam ? 20 : 14} /> : <Maximize2 size={14} />}
      </button>
    </div>
  );

  if (tam) {
    const dur = sonAktif?.sonuc?.durum;
    const Ikon = dur && D_IKON[dur];
    const sayilanYuzde = ozet && ozet.toplam_seri > 0 ? Math.round(ozet.sayilan_seri / ozet.toplam_seri * 100) : 0;
    const stokKodu = sonAktif?.sonuc?.stok_kodu ?? null;
    const stokTaramaSayisi = stokKodu
      ? gecmis.filter(k => k.sonuc?.stok_kodu === stokKodu).length
      : 0;
    const stokSayilan = sonAktif?.sonuc?.sayilan ?? 0;
    const stokToplam = sonAktif?.sonuc?.toplam ?? 0;
    const stokKalan = sonAktif?.sonuc?.kalan ?? (stokToplam - stokSayilan);
    const stokYuzde = stokToplam > 0 ? Math.min(100, Math.round((stokSayilan / stokToplam) * 100)) : 0;
    const stokPortal = sonAktif?.sonuc?.portal_sayim ?? null;
    const stokFark = sonAktif?.sonuc?.portal_fark;
    const bilinmeyenSayisi = gecmis.filter(k => k.sonuc?.durum === "bulunamadi").length;
    const basariliSayisi = gecmis.filter(k => k.sonuc?.durum === "basarili").length;
    const tamBody = (
      <div className="fixed inset-0 z-[55] bg-deeper text-white flex flex-col"
        style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="px-3 py-2 flex items-center gap-3 bg-deeper/95 backdrop-blur border-b border-white/5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.22em] text-good">
              <span className="h-1.5 w-1.5 rounded-full bg-good animate-pulse" /> Tarama
            </span>
            <span className="text-[11px] font-mono text-white/55">{sayac} okuma</span>
            {otoTorch && torchVar && (
              <span className="text-[10px] font-mono text-good/85 inline-flex items-center gap-1">
                <Zap size={11} /> oto-flas
              </span>
            )}
          </div>
          {ucBar}
        </div>

        <div className="relative flex-1 min-h-0">
          {videoBlok}
        </div>

        <div className="px-3 py-2 bg-deeper/95 backdrop-blur border-t border-white/5">
          {sonAktif ? (
            <div className={cn("rounded-xl border-2 p-3 transition-colors",
              dur === "basarili" && "bg-good/20 border-good/60",
              dur === "mukerrer" && "bg-warn/20 border-warn/60",
              dur === "bulunamadi" && "bg-bad/20 border-bad/60",
              dur === "cakisma" && "bg-warn/25 border-warn/70",
              !dur && "bg-white/5 border-white/20"
            )}>
              <div className="flex items-center gap-2">
                {Ikon ? <Ikon size={22} className={cn(
                  dur === "basarili" && "text-good",
                  dur === "mukerrer" && "text-warn",
                  dur === "bulunamadi" && "text-bad",
                  dur === "cakisma" && "text-warn",
                )} /> : (
                  <Loader2 size={22} className="animate-spin text-white/60" />
                )}
                <span className="font-mono text-base font-bold text-white break-all flex-1 min-w-0">
                  {sonAktif.kod}
                </span>
                <span className="text-[10px] font-mono text-white/55 shrink-0">
                  {new Date(sonAktif.ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
              {stokKodu && (
                <div className="mt-1.5 text-sm">
                  <span className="font-mono font-bold text-accent">{stokKodu}</span>
                  <span className="text-white/80"> · {sonAktif.sonuc?.urun_adi}</span>
                </div>
              )}
              {stokKodu && stokToplam > 0 && (
                <>
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <KStat etiket="Bizde Var" deger={stokSayilan} renk="text-good" buyuk />
                    <KStat etiket="Stokta" deger={stokToplam} renk="text-white" />
                    <KStat etiket="Portal" deger={stokPortal ?? 0} renk="text-sky-300" />
                    <KStat etiket="Fark"
                      deger={stokFark ?? 0}
                      renk={stokFark == null ? "text-white/50"
                        : stokFark === 0 ? "text-good"
                        : stokFark > 0 ? "text-warn"
                        : "text-bad"}
                      isaret />
                  </div>
                  <div className="mt-2.5 h-2.5 rounded-full bg-white/10 overflow-hidden ring-1 ring-white/15">
                    <div className={cn("h-full transition-all duration-300",
                      stokKalan === 0 ? "bg-good" : "bg-gradient-to-r from-accent/70 to-accent")}
                      style={{ width: `${stokYuzde}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-white/70 flex-wrap gap-2">
                    <span className="font-bold">%{stokYuzde} tamamlandi</span>
                    <span>Kalan: <b className={stokKalan === 0 ? "text-good" : "text-amber-300"}>{stokKalan}</b></span>
                    <span>Bu stoga {stokTaramaSayisi}. okuma</span>
                  </div>
                </>
              )}
              {sonAktif.sonuc?.mesaj && !stokKodu && (
                <div className="mt-2 space-y-1.5">
                  <div className="text-sm text-white/85">{sonAktif.sonuc.mesaj}</div>
                  {dur === "bulunamadi" && (
                    <div className="text-[11px] text-white/65 leading-relaxed">
                      Bu kod stok listende yok. Kameradan cik (
                      <X size={11} className="inline -mt-0.5" />
                      ), <b className="text-white">Bilinmeyen Seri</b> panelinden mevcut stoga ekle
                      ya da yeni stok yarat. Bu oturumda <b>{bilinmeyenSayisi}</b> bilinmeyen okuma.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-white/15 p-3 text-center text-white/65 text-sm">
              Cerceveye barkod yerlestir, otomatik okuyacak. Bilinen bir kod okuyunca stoga ait <b>Bizde Var / Stokta / Portal / Fark</b> detayini gosterir.
            </div>
          )}

          {(basariliSayisi > 0 || bilinmeyenSayisi > 0) && (
            <div className="mt-1.5 flex items-center justify-center gap-3 text-[11px] font-mono text-white/65">
              <span><b className="text-good">{basariliSayisi}</b> basarili</span>
              <span className="opacity-40">·</span>
              <span><b className="text-bad">{bilinmeyenSayisi}</b> bilinmeyen</span>
              <span className="opacity-40">·</span>
              <span><b className="text-white">{sayac}</b> toplam</span>
            </div>
          )}

          {ozet && (
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              <Pill etiket="Sayilan" deger={ozet.sayilan_seri} renk="text-good" alt={`${sayilanYuzde}%`} />
              <Pill etiket="Kalan" deger={ozet.kalan_seri} renk="text-amber-300" />
              <Pill etiket="Portal Fark" deger={ozet.portal_fark} renk={ozet.portal_fark === 0 ? "text-good" : ozet.portal_fark > 0 ? "text-warn" : "text-bad"} isaret />
            </div>
          )}

          {gecmis.length > 1 && (
            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
              {gecmis.slice(1, 6).map(k => {
                const d = k.sonuc?.durum;
                const Ik = d && D_IKON[d];
                return (
                  <div key={k.id} className={cn(
                    "shrink-0 px-2 py-1 rounded-md text-[11px] font-mono inline-flex items-center gap-1 border",
                    d === "basarili" && "bg-good/15 border-good/40 text-good",
                    d === "mukerrer" && "bg-warn/15 border-warn/40 text-warn",
                    d === "bulunamadi" && "bg-bad/15 border-bad/40 text-bad",
                    d === "cakisma" && "bg-warn/20 border-warn/50 text-warn",
                    !d && "bg-white/10 border-white/20 text-white/70"
                  )}>
                    {Ik && <Ik size={11} />}
                    <span className="truncate max-w-[120px]">{k.kod}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
    return typeof document !== "undefined" ? createPortal(tamBody, document.body) : tamBody;
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        {videoBlok}
        <div className="absolute top-2 left-2 right-2 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-white/90 px-2 py-0.5 rounded bg-black/40 backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-good animate-pulse" /> tarama
          </span>
          {sayac > 0 && (
            <span className="text-[10px] font-mono text-white/80 px-2 py-0.5 rounded bg-black/40 backdrop-blur">
              {sayac} okuma
            </span>
          )}
          {ucBar}
        </div>
      </div>
      {gecmis.length > 0 && (
        <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
          <AnimatePresence initial={false}>
            {gecmis.map((k, idx) => {
              const dur = k.sonuc?.durum;
              const Ikon = dur && D_IKON[dur];
              const aktif = idx === 0;
              return (
                <motion.div
                  key={k.id}
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: aktif ? 1 : 0.65, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  className={cn(
                    "card border px-3 py-2 flex items-start gap-2 text-sm",
                    dur ? D_RENK[dur] : "border-edge/60 bg-card text-ink/80",
                    aktif && "ring-2 ring-accent/30"
                  )}
                >
                  <div className="text-[10px] font-mono text-ink/50 w-12 shrink-0 mt-0.5">
                    {new Date(k.ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </div>
                  <div className="flex items-center gap-1.5 w-14 shrink-0 mt-0.5">
                    {Ikon ? <Ikon size={14} /> : (
                      <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin opacity-60" />
                    )}
                    <span className="text-[10px] font-bold tracking-wider">
                      {dur ? D_ET[dur] : "..."}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-semibold text-ink break-all">{k.kod}</div>
                    {k.sonuc?.stok_kodu && (
                      <div className="text-xs text-ink/70 mt-0.5">
                        <span className="font-mono font-bold">{k.sonuc.stok_kodu}</span>{" · "}
                        <span className="text-ink/65">{k.sonuc.urun_adi}</span>
                      </div>
                    )}
                    {k.sonuc && (k.sonuc.toplam != null) && (
                      <div className="text-[11px] text-ink/65 mt-0.5 font-mono">
                        sayim {k.sonuc.sayilan}/{k.sonuc.toplam}
                        {k.sonuc.portal_sayim != null && <> · portal {k.sonuc.portal_sayim}</>}
                      </div>
                    )}
                    {k.sonuc?.mesaj && !k.sonuc?.stok_kodu && (
                      <div className="text-[11px] text-ink/60 mt-0.5">{k.sonuc.mesaj}</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function KStat({ etiket, deger, renk, isaret, buyuk }: { etiket: string; deger: number; renk: string; isaret?: boolean; buyuk?: boolean }) {
  return (
    <div className="rounded-md bg-white/8 px-1.5 py-1 ring-1 ring-white/12 text-center">
      <div className="text-[8.5px] uppercase tracking-[0.14em] text-white/55 leading-none">{etiket}</div>
      <div className={cn("font-display font-bold leading-none tabular-nums mt-1", renk,
        buyuk ? "text-2xl" : "text-lg")}>
        {isaret && deger > 0 ? "+" : ""}{deger}
      </div>
    </div>
  );
}

function Pill({ etiket, deger, renk, alt, isaret }: { etiket: string; deger: number; renk: string; alt?: string; isaret?: boolean }) {
  return (
    <div className="rounded-lg bg-white/8 px-2 py-1.5 ring-1 ring-white/15">
      <div className="text-[9px] uppercase tracking-[0.18em] text-white/55">{etiket}</div>
      <div className={cn("font-display text-xl font-bold leading-none tabular-nums mt-0.5", renk)}>
        {isaret && deger > 0 ? "+" : ""}{deger.toLocaleString("tr-TR")}
      </div>
      {alt && <div className="text-[10px] text-white/55 font-mono mt-0.5">{alt}</div>}
    </div>
  );
}

function Kose({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const p: Record<typeof pos, string> = {
    tl: "top-0 left-0 border-t-4 border-l-4 rounded-tl-xl",
    tr: "top-0 right-0 border-t-4 border-r-4 rounded-tr-xl",
    bl: "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl",
    br: "bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl",
  };
  return <div className={cn("absolute w-8 h-8 border-accent", p[pos])} />;
}
