import { motion, AnimatePresence } from "framer-motion";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Send, Mic, Radio, MessageSquare } from "lucide-react";
import { ChatMesaji, SayimWS, SesMesaji } from "../lib/ws";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { cn } from "../lib/cn";

const PALET = ["#BF6F34", "#7FB3E0", "#5FBE7A", "#F4B183", "#9B7EBD", "#D27A8B", "#3D9CA3", "#C9A659"];

function rengini(ad: string): string {
  if (!ad) return "#7FB3E0";
  let h = 0;
  for (let i = 0; i < ad.length; i++) h = (h * 31 + ad.charCodeAt(i)) >>> 0;
  return PALET[h % PALET.length];
}

function saat(z: string) {
  return new Date(z).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

type Item = (ChatMesaji | SesMesaji) & { yerel_id: string; oynatildi?: boolean };

type Props = {
  ws: SayimWS | null;
  son: ChatMesaji | SesMesaji | null;
};

const MAX_KAYIT_SN = 15;

export default function TelsizPanel({ ws, son }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [metin, setMetin] = useState("");
  const [kayit, setKayit] = useState(false);
  const [kayitSn, setKayitSn] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const dipRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sayacRef = useRef<number | undefined>();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!son) return;
    setItems(prev => [...prev, { ...son, yerel_id: `${son.kullanici_id}_${son.zaman}_${Math.random()}` }].slice(-50));
  }, [son]);

  useEffect(() => {
    dipRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items.length]);

  useEffect(() => {
    if (!autoplay) return;
    const sonItem = items[items.length - 1];
    if (!sonItem || sonItem.tip !== "voice" || sonItem.oynatildi) return;
    if (sonItem.kullanici_id === user?.id) return;
    try {
      const ses = new Audio(`data:${sonItem.mime};base64,${sonItem.data}`);
      audioRef.current = ses;
      ses.play().catch(() => {});
      setItems(prev => prev.map(x => x.yerel_id === sonItem.yerel_id ? { ...x, oynatildi: true } : x));
    } catch { /* ignore */ }
  }, [items, autoplay, user?.id]);

  function gonderChat(e: FormEvent) {
    e.preventDefault();
    const v = metin.trim();
    if (!v || !ws) return;
    const ok = ws.send({ tip: "chat", mesaj: v });
    if (!ok) toast.push("err", "WS baglanti yok");
    setMetin("");
  }

  async function kayitBaslat() {
    if (kayit) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 16000 } : { audioBitsPerSecond: 16000 });
      recRef.current = rec;
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        if (blob.size === 0 || blob.size > 250_000) {
          toast.push("warn", `Ses ${blob.size === 0 ? "bos" : "cok uzun"}, gonderilmedi`);
          return;
        }
        const ab = await blob.arrayBuffer();
        const bin = new Uint8Array(ab);
        let s = ""; for (let i = 0; i < bin.byteLength; i++) s += String.fromCharCode(bin[i]);
        const b64 = btoa(s);
        const ok = ws?.send({ tip: "voice", data: b64, mime: rec.mimeType || "audio/webm", sure: kayitSn });
        if (!ok) toast.push("err", "WS baglanti yok");
      };
      rec.start();
      setKayit(true);
      setKayitSn(0);
      let sn = 0;
      sayacRef.current = window.setInterval(() => {
        sn += 1;
        setKayitSn(sn);
        if (sn >= MAX_KAYIT_SN) kayitDur();
      }, 1000);
    } catch (e: any) {
      toast.push("err", "Mikrofon izni reddedildi");
    }
  }

  function kayitDur() {
    if (!kayit) return;
    window.clearInterval(sayacRef.current);
    try { recRef.current?.stop(); } catch { /* noop */ }
    setKayit(false);
  }

  function oynat(b64: string, mime: string) {
    try {
      const ses = new Audio(`data:${mime};base64,${b64}`);
      ses.play().catch(() => {});
    } catch { /* ignore */ }
  }

  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="px-3 sm:px-4 py-2.5 bg-deep text-white flex items-center gap-2 flex-wrap">
        <Radio size={16} />
        <span className="text-sm font-semibold tracking-wide">TELSIZ</span>
        <span className="text-xs opacity-70">oturum ici iletisim</span>
        <label className="ml-auto inline-flex items-center gap-1 text-[10px] opacity-80 cursor-pointer">
          <input type="checkbox" checked={autoplay} onChange={e => setAutoplay(e.target.checked)} className="accent-accent" />
          auto-play
        </label>
      </div>

      <div className="flex-1 max-h-[320px] overflow-y-auto p-3 space-y-2 bg-cream/30 min-h-[160px]">
        {items.length === 0 && (
          <div className="text-center text-ink/45 text-xs py-4">
            <MessageSquare size={20} className="inline mb-1 opacity-40" />
            <div>Henuz mesaj yok. Yaz veya basili tutarak konus.</div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {items.map(it => {
            const benim = it.kullanici_id === user?.id;
            const renk = rengini(it.ad);
            return (
              <motion.div key={it.yerel_id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className={cn("flex gap-2 items-end", benim ? "flex-row-reverse" : "flex-row")}
              >
                {!benim && (
                  <div className="h-7 w-7 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                    style={{ backgroundColor: renk }}>
                    {it.ad.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className={cn(
                  "max-w-[78%] rounded-xl px-3 py-2 shadow-sm",
                  benim ? "bg-accent/15 border border-accent/30" : "bg-card border border-edge/50"
                )}>
                  {!benim && <div className="text-[10px] font-bold text-ink/65 mb-0.5">{it.ad}</div>}
                  {it.tip === "chat" ? (
                    <div className="text-sm whitespace-pre-wrap break-words">{it.mesaj}</div>
                  ) : (
                    <button onClick={() => oynat(it.data, it.mime)}
                      className="flex items-center gap-2 text-sm font-mono">
                      <Mic size={14} className="text-accent" />
                      <span>{it.sure ? `${Math.round(it.sure)}sn` : "ses"}</span>
                      <span className="text-ink/45 text-[10px]">tikla oynat</span>
                    </button>
                  )}
                  <div className={cn("text-[10px] mt-0.5", benim ? "text-ink/55 text-right" : "text-ink/45")}>
                    {saat(it.zaman)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={dipRef} />
      </div>

      <form onSubmit={gonderChat} className="flex items-center gap-2 border-t border-edge/40 bg-card px-2.5 py-2">
        <button type="button"
          onPointerDown={kayitBaslat} onPointerUp={kayitDur} onPointerLeave={kayitDur} onPointerCancel={kayitDur}
          className={cn(
            "shrink-0 h-9 w-9 rounded-full flex items-center justify-center transition select-none touch-none",
            kayit ? "bg-bad text-white scale-110 shadow-lg shadow-bad/40" : "bg-deep text-white hover:bg-deeper"
          )}
          title="Basili tut, konus, birak gonder"
        >
          <Mic size={16} />
        </button>
        {kayit ? (
          <div className="flex-1 flex items-center gap-2 text-bad font-mono text-sm">
            <span className="inline-block h-2 w-2 rounded-full bg-bad animate-pulse" />
            kayit ediliyor… {kayitSn}sn / {MAX_KAYIT_SN}sn (birak gonder)
          </div>
        ) : (
          <input value={metin} onChange={e => setMetin(e.target.value)}
            placeholder="Mesaj yaz veya mic'i basili tut"
            className="flex-1 px-3 py-2 rounded-lg border border-edge bg-white text-sm outline-none focus:border-deep" />
        )}
        <button type="submit" disabled={!metin.trim() || kayit}
          className="shrink-0 h-9 px-3 rounded-lg bg-accent text-white disabled:opacity-50 flex items-center gap-1 text-sm">
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
