import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, FlashlightOff, Flashlight, RefreshCcw, Maximize2, Minimize2, Zap, CheckCircle2, AlertTriangle, XCircle, GitMerge } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException, Result } from "@zxing/library";
import { sound } from "../lib/sound";
import { cn } from "../lib/cn";
import { Tarama } from "../lib/api";

type Props = { onKod: (kod: string) => void; sonuc?: Tarama | null };

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

export default function KameraTarayici({ onKod, sonuc }: Props) {
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
    navigator.mediaDevices?.enumerateDevices().then(d => {
      const v = d.filter(x => x.kind === "videoinput");
      setCihazlar(v);
      if (!secCihaz && v.length) {
        const arka = v.find(x => /back|rear|arka|environment/i.test(x.label)) ?? v[v.length - 1];
        setSecCihaz(arka.deviceId);
      }
    }).catch(() => {});
  }, [secCihaz]);

  useEffect(() => {
    if (!acik) return;
    let iptal = false;
    setHata(null);
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
        const constraints: MediaStreamConstraints = {
          video: secCihaz
            ? {
                deviceId: { exact: secCihaz },
                width: { ideal: 1280 }, height: { ideal: 720 },
                frameRate: { ideal: 24, max: 30 },
              }
            : {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 }, height: { ideal: 720 },
                frameRate: { ideal: 24, max: 30 },
                advanced: [{ focusMode: "continuous" }] as any,
              },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (iptal) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

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

  const icerik = (
    <div className={cn("space-y-2", tam && "fixed inset-0 z-[55] bg-deeper p-3 sm:p-6 flex flex-col overflow-auto")}
      style={tam ? { paddingTop: "max(0.75rem, env(safe-area-inset-top))" } : undefined}>
      <div className={cn("relative overflow-hidden rounded-xl bg-deeper",
        tam ? "w-full max-w-3xl mx-auto aspect-video shrink-0" : "aspect-[4/3] sm:aspect-video")}>
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover"
          playsInline muted autoPlay />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative w-[78%] h-[58%] max-w-[520px]">
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
              initial={{ opacity: 0.6 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="pointer-events-none absolute inset-0 bg-good ring-4 ring-good/80"
            />
          )}
        </AnimatePresence>

        <div className="absolute top-2 left-2 right-2 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-white/90 px-2 py-0.5 rounded bg-black/40 backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-good animate-pulse" /> tarama
          </span>
          {sayac > 0 && (
            <span className="text-[10px] font-mono text-white/80 px-2 py-0.5 rounded bg-black/40 backdrop-blur">
              {sayac} okuma
            </span>
          )}
          {torchVar && (
            <span className={cn(
              "text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 backdrop-blur inline-flex items-center gap-1",
              otoTorch ? "text-good" : "text-white/60"
            )}>
              <Zap size={11} /> oto-flas {otoTorch ? "aktif" : "kapali"}
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {torchVar && (
              <button onClick={() => setOtoTorch(v => !v)}
                title={otoTorch ? "Oto-flasi kapat" : "Oto-flasi ac"}
                className={cn(
                  "h-8 w-8 rounded-md text-white flex items-center justify-center backdrop-blur",
                  otoTorch ? "bg-good/40 hover:bg-good/60" : "bg-black/40 hover:bg-black/60"
                )}>
                <Zap size={14} />
              </button>
            )}
            {torchVar && (
              <button onClick={torchToggle} title="Flas (manuel)"
                className="h-8 w-8 rounded-md bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur">
                {torch ? <Flashlight size={14} /> : <FlashlightOff size={14} />}
              </button>
            )}
            {cihazlar.length > 1 && (
              <button onClick={digerKamera} title="Diger kamera"
                className="h-8 w-8 rounded-md bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur">
                <RefreshCcw size={14} />
              </button>
            )}
            <button onClick={() => setTam(t => !t)} title={tam ? "Kucult" : "Buyut"}
              className="h-8 w-8 rounded-md bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur">
              {tam ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          </div>
        </div>
        {hata && (
          <div className="absolute inset-x-0 bottom-0 p-3 text-center text-bad text-xs bg-black/60 backdrop-blur">
            {hata}
          </div>
        )}
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
                        {k.sonuc.portal_fark != null && (
                          <span className={cn("ml-1",
                            k.sonuc.portal_fark === 0 ? "text-good"
                              : k.sonuc.portal_fark > 0 ? "text-warn"
                              : "text-bad"
                          )}>
                            (fark {k.sonuc.portal_fark > 0 ? "+" : ""}{k.sonuc.portal_fark})
                          </span>
                        )}
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

      <div className={cn("text-[11px] flex items-center gap-2 flex-wrap",
        tam ? "text-white/65" : "text-ink/55")}>
        <Camera size={12} />
        <span>Cerceveye yerlestir; otomatik okur. {torchVar && otoTorch ? "Karanlikta oto-flas devreye girer." : ""}</span>
      </div>
    </div>
  );

  return tam && typeof document !== "undefined"
    ? createPortal(icerik, document.body)
    : icerik;
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
