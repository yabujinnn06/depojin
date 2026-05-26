import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

type Props = { onKod: (kod: string) => void };

export default function KameraTarayici({ onKod }: Props) {
  const [acik, setAcik] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const elId = "rw-kamera";
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!acik) return;
    setHata(null);
    const scanner = new Html5Qrcode(elId);
    scannerRef.current = scanner;
    scanner.start(
      { facingMode: "environment" },
      { fps: 12, qrbox: { width: 280, height: 160 } },
      (decoded) => onKod(decoded),
      () => { /* ignore per-frame errors */ }
    ).catch((e) => {
      setHata(String(e?.message ?? e));
      setAcik(false);
    });
    return () => {
      scanner.stop().catch(() => {}).finally(() => scanner.clear());
    };
  }, [acik, onKod]);

  return (
    <div>
      <div id={elId} className="rounded-lg overflow-hidden bg-deeper aspect-video" />
      {hata && <div className="text-xs text-bad mt-2">Kamera hatasi: {hata}</div>}
      <div className="text-[11px] text-ink/55 mt-2">Telefon kamerasini stok barkoduna dogrult; otomatik okur.</div>
    </div>
  );
}
