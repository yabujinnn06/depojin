import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, FlashlightOff, Flashlight, RefreshCcw, Maximize2, Minimize2 } from "lucide-react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType, NotFoundException, Result } from "@zxing/library";
import { cn } from "../lib/cn";

type Props = { onKod: (kod: string) => void };

const FORMATLAR = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
  BarcodeFormat.CODABAR,
  BarcodeFormat.PDF_417,
  BarcodeFormat.AZTEC,
];

const NATIVE_FORMATLAR = [
  "qr_code", "code_128", "code_39", "code_93", "ean_13", "ean_8",
  "upc_a", "upc_e", "itf", "codabar", "data_matrix", "aztec", "pdf417",
];

export default function KameraTarayici({ onKod }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sonOkumaRef = useRef<{ kod: string; t: number } | null>(null);
  const animRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);

  const [cihazlar, setCihazlar] = useState<MediaDeviceInfo[]>([]);
  const [secCihaz, setSecCihaz] = useState<string | null>(null);
  const [acik, setAcik] = useState(true);
  const [tam, setTam] = useState(false);
  const [torch, setTorch] = useState(false);
  const [torchVar, setTorchVar] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [sayac, setSayac] = useState(0);

  const tetikle = useCallback((kod: string) => {
    if (!kod) return;
    const now = Date.now();
    const son = sonOkumaRef.current;
    if (son && son.kod === kod && now - son.t < 1500) return;
    sonOkumaRef.current = { kod, t: now };
    setSayac(s => s + 1);
    try { navigator.vibrate?.(30); } catch {}
    onKod(kod);
  }, [onKod]);

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

    async function nativeBaslat(stream: MediaStream) {
      const W = window as any;
      if (!("BarcodeDetector" in W)) return false;
      try {
        const desteklenen: string[] = await W.BarcodeDetector.getSupportedFormats?.() ?? NATIVE_FORMATLAR;
        const formats = NATIVE_FORMATLAR.filter(f => desteklenen.includes(f));
        if (!formats.length) return false;
        const det = new W.BarcodeDetector({ formats });
        detectorRef.current = det;
        const v = videoRef.current!;
        const loop = async () => {
          if (iptal || !videoRef.current) return;
          try {
            const codes = await det.detect(videoRef.current);
            if (codes && codes.length) tetikle(String(codes[0].rawValue ?? ""));
          } catch { /* ignore */ }
          animRef.current = requestAnimationFrame(loop);
        };
        v.srcObject = stream;
        await v.play();
        loop();
        return true;
      } catch { return false; }
    }

    async function zxingBaslat(stream: MediaStream) {
      const hints = new Map<DecodeHintType, any>();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATLAR);
      hints.set(DecodeHintType.TRY_HARDER, true);
      const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 80 });
      readerRef.current = reader;
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      const sonuc = await new Promise<void>((resolve) => {
        reader.decodeFromStream(stream, v, (result: Result | undefined, err: any) => {
          if (iptal) { resolve(); return; }
          if (result) tetikle(result.getText());
          if (err && !(err instanceof NotFoundException)) { /* yutkulu */ }
        }).catch(() => resolve());
      });
      return sonuc;
    }

    async function baslat() {
      try {
        const constraints: MediaStreamConstraints = {
          video: secCihaz
            ? { deviceId: { exact: secCihaz }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (iptal) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;

        const track = stream.getVideoTracks()[0];
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
      if (animRef.current) cancelAnimationFrame(animRef.current);
      try { readerRef.current && (readerRef.current as any).reset?.(); } catch {}
      readerRef.current = null;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, [acik, secCihaz, tetikle]);

  async function torchToggle() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch }] as any });
      setTorch(v => !v);
    } catch { /* ignore */ }
  }

  function digerKamera() {
    if (cihazlar.length < 2) return;
    const idx = cihazlar.findIndex(c => c.deviceId === secCihaz);
    const next = cihazlar[(idx + 1) % cihazlar.length];
    setSecCihaz(next.deviceId);
  }

  return (
    <div className={cn("space-y-2", tam && "fixed inset-0 z-50 bg-deeper p-3 sm:p-6 flex flex-col")}>
      <div className="relative overflow-hidden rounded-xl bg-deeper aspect-[4/3] sm:aspect-video">
        <video ref={videoRef} className="absolute inset-0 h-full w-full object-cover"
          playsInline muted autoPlay />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative w-[80%] h-[55%] max-w-[480px]">
            <Kose pos="tl" /><Kose pos="tr" /><Kose pos="bl" /><Kose pos="br" />
            <motion.div
              className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent shadow-[0_0_20px_2px_rgba(191,111,52,0.8)]"
              initial={{ top: "0%" }}
              animate={{ top: ["0%", "100%", "0%"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </div>
        <div className="absolute top-2 left-2 right-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.18em] text-white/90 px-2 py-0.5 rounded bg-black/40 backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-good animate-pulse" /> tarama
          </span>
          {sayac > 0 && (
            <span className="text-[10px] font-mono text-white/80 px-2 py-0.5 rounded bg-black/40 backdrop-blur">
              {sayac} okuma
            </span>
          )}
          <div className="ml-auto flex items-center gap-1">
            {torchVar && (
              <button onClick={torchToggle} title="Flas"
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
      <div className="text-[11px] text-ink/55 flex items-center gap-2 flex-wrap">
        <Camera size={12} />
        <span>Cerceveye yerlestir; otomatik okur. Tekrar tetiklenmek icin 1.5sn bekle.</span>
      </div>
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
  return <div className={cn("absolute w-7 h-7 border-accent", p[pos])} />;
}
