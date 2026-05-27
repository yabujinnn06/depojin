import { motion, AnimatePresence } from "framer-motion";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Send, Mic, Radio, MessageSquare, Signal, BatteryFull, Volume2 } from "lucide-react";
import { ChatMesaji, SayimWS, SesMesaji } from "../lib/ws";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { sound } from "../lib/sound";
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
  oturumId?: number;
};

const MAX_KAYIT_SN = 15;

export default function TelsizPanel({ ws, son, oturumId }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [metin, setMetin] = useState("");
  const [kayit, setKayit] = useState(false);
  const [kayitSn, setKayitSn] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [seviyeler, setSeviyeler] = useState<number[]>(Array(12).fill(0));
  const listRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sayacRef = useRef<number | undefined>();
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!son) return;
    setItems(prev => [...prev, { ...son, yerel_id: `${son.kullanici_id}_${son.zaman}_${Math.random()}` }].slice(-50));
    if (son.kullanici_id !== user?.id) {
      const tip = son.tip === "voice" ? "ses" : "mesaj";
      const onIzleme = son.tip === "chat" ? `: ${son.mesaj.slice(0, 60)}` : "";
      toast.push("info", `${son.ad} yeni ${tip}${onIzleme}`, 3500);
    }
  }, [son]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length]);

  useEffect(() => {
    if (!autoplay) return;
    const sonItem = items[items.length - 1];
    if (!sonItem || sonItem.tip !== "voice" || sonItem.oynatildi) return;
    if (sonItem.kullanici_id === user?.id) return;
    try {
      const ses = new Audio(`data:${sonItem.mime};base64,${sonItem.data}`);
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
    sound.telsizBaslat();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 16000 } : { audioBitsPerSecond: 16000 });
      recRef.current = rec;

      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const an = ctx.createAnalyser();
        an.fftSize = 64;
        src.connect(an);
        analyzerRef.current = an;
        const buf = new Uint8Array(an.frequencyBinCount);
        const tik = () => {
          if (!analyzerRef.current) return;
          analyzerRef.current.getByteFrequencyData(buf);
          const bars: number[] = [];
          const step = Math.floor(buf.length / 12);
          for (let i = 0; i < 12; i++) {
            const v = buf[i * step] / 255;
            bars.push(v);
          }
          setSeviyeler(bars);
          animRef.current = requestAnimationFrame(tik);
        };
        tik();
      }

      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (animRef.current) cancelAnimationFrame(animRef.current);
        try { audioCtxRef.current?.close(); } catch {}
        analyzerRef.current = null;
        audioCtxRef.current = null;
        setSeviyeler(Array(12).fill(0));
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
    } catch {
      toast.push("err", "Mikrofon izni reddedildi");
    }
  }

  function kayitDur() {
    if (!kayit) return;
    window.clearInterval(sayacRef.current);
    try { recRef.current?.stop(); } catch { /* noop */ }
    setKayit(false);
    sound.telsizBitir();
  }

  function oynat(b64: string, mime: string) {
    try { new Audio(`data:${mime};base64,${b64}`).play().catch(() => {}); } catch { /* ignore */ }
  }

  const kanal = oturumId != null ? `CH-${String(oturumId).padStart(2, "0")}` : "CH-00";
  const baglantili = !!ws;
  const seviyeOrt = seviyeler.reduce((a, b) => a + b, 0) / seviyeler.length;

  return (
    <div className="relative">
      <div className="absolute left-1/2 -translate-x-1/2 -top-5 flex flex-col items-center pointer-events-none">
        <motion.div
          animate={kayit ? { y: [0, -2, 0], rotate: [-1, 1, -1] } : { y: 0, rotate: 0 }}
          transition={{ duration: 0.8, repeat: kayit ? Infinity : 0 }}
          className="w-1 h-5 bg-gradient-to-b from-zinc-700 to-zinc-500 rounded-t-full"
        />
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700 -mt-0.5" />
      </div>

      <div className="relative rounded-2xl overflow-hidden border-2 border-zinc-700 shadow-2xl shadow-black/40"
        style={{
          background: "linear-gradient(180deg, #1f1f23 0%, #0f0f13 100%)",
        }}>
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-zinc-700 via-zinc-500 to-zinc-700" />

        <div className="p-3 pt-5">
          <div className="rounded-lg p-2.5 border border-zinc-700"
            style={{
              background: "linear-gradient(180deg, #2a3a2a 0%, #1a2a1a 100%)",
              boxShadow: "inset 0 2px 6px rgba(0,0,0,0.5)",
            }}>
            <div className="flex items-start justify-between gap-2">
              <div className="font-mono text-emerald-300 tracking-widest">
                <div className="text-[10px] opacity-70">CHANNEL</div>
                <div className="text-lg font-bold leading-none">{kanal}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1">
                  <Signal size={11} className={cn(baglantili ? "text-emerald-300" : "text-red-400")} />
                  <span className="font-mono text-[10px] text-emerald-300/80 tracking-widest">
                    {baglantili ? "ON-AIR" : "OFFLINE"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <BatteryFull size={11} className="text-emerald-300/80" />
                  <Volume2 size={11} className="text-emerald-300/80" />
                  <label className="cursor-pointer">
                    <input type="checkbox" checked={autoplay} onChange={e => setAutoplay(e.target.checked)} className="sr-only" />
                    <span className={cn(
                      "font-mono text-[9px] tracking-widest px-1 rounded",
                      autoplay ? "bg-emerald-500/40 text-emerald-200" : "bg-zinc-700 text-zinc-400"
                    )}>{autoplay ? "AUTO" : "MUTE"}</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-2 flex items-end gap-0.5 h-5">
              {seviyeler.map((v, i) => (
                <div key={i}
                  className={cn("w-1 rounded-sm",
                    v > 0.6 ? "bg-red-400" : v > 0.3 ? "bg-amber-300" : "bg-emerald-400")}
                  style={{ height: `${Math.max(2, v * 100)}%`, opacity: kayit ? 1 : 0.25 }} />
              ))}
              <div className="flex-1" />
              <span className="font-mono text-[10px] text-emerald-300/60">
                {kayit ? `REC ${kayitSn}s` : seviyeOrt > 0 ? "VU" : "—"}
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <motion.span
                animate={kayit ? { opacity: [0.4, 1, 0.4] } : { opacity: 0.3 }}
                transition={{ duration: 0.6, repeat: kayit ? Infinity : 0 }}
                className={cn("inline-block h-2 w-2 rounded-full shadow-md",
                  kayit ? "bg-red-500 shadow-red-500/60" : "bg-red-500/30")}
              />
              <span className="font-mono text-[10px] text-zinc-400 tracking-widest">TX</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[10px] text-zinc-400 tracking-widest">RX</span>
              <span className={cn("inline-block h-2 w-2 rounded-full",
                items.length > 0 ? "bg-emerald-400 shadow-emerald-400/60 shadow-md" : "bg-zinc-700")} />
            </div>
          </div>
        </div>

        <div className="px-3">
          <div className="h-2 rounded-sm relative overflow-hidden"
            style={{
              background: "repeating-linear-gradient(90deg, #2a2a30 0 2px, #18181d 2px 5px)",
            }} />
        </div>

        <div ref={listRef}
          className="overflow-y-auto p-3 space-y-1.5 overscroll-contain min-h-[160px] max-h-[300px]"
          style={{ background: "#0a0a0f" }}>
          {items.length === 0 && (
            <div className="text-center text-zinc-500 text-xs py-4">
              <MessageSquare size={18} className="inline mb-1 opacity-40" />
              <div>Telsiz sessiz. Mic'i tut, konus.</div>
            </div>
          )}
          <AnimatePresence initial={false}>
            {items.map(it => {
              const benim = it.kullanici_id === user?.id;
              const renk = rengini(it.ad);
              return (
                <motion.div key={it.yerel_id}
                  initial={{ opacity: 0, x: benim ? 10 : -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-mono text-[12px] leading-relaxed flex items-baseline gap-2"
                >
                  <span className="text-zinc-500 shrink-0">[{saat(it.zaman)}]</span>
                  <span className="font-bold shrink-0" style={{ color: renk }}>
                    {benim ? "→ BEN" : it.ad}:
                  </span>
                  {it.tip === "chat" ? (
                    <span className={cn("break-words", benim ? "text-zinc-200" : "text-emerald-200")}>
                      {it.mesaj}
                    </span>
                  ) : (
                    <button onClick={() => oynat(it.data, it.mime)}
                      className="inline-flex items-center gap-1 text-amber-300 hover:underline">
                      <Mic size={12} />
                      <span>«ses {it.sure ? `${Math.round(it.sure)}sn` : ""}»</span>
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="px-3 pt-2">
          <div className="h-2 rounded-sm"
            style={{ background: "repeating-linear-gradient(90deg, #2a2a30 0 2px, #18181d 2px 5px)" }} />
        </div>

        <form onSubmit={gonderChat}
          className="p-3 grid grid-cols-[1fr,auto] gap-2 items-center">
          {kayit ? (
            <div className="flex items-center gap-2 text-red-400 font-mono text-xs px-3 py-2 rounded-md bg-zinc-900 border border-red-500/40">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              KAYIT … {kayitSn}sn / {MAX_KAYIT_SN}sn  (birak gonder)
            </div>
          ) : (
            <input value={metin} onChange={e => setMetin(e.target.value)}
              placeholder="mesaj yaz veya PTT bas"
              className="px-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-emerald-100 placeholder:text-zinc-500 font-mono text-sm outline-none focus:border-emerald-500/60" />
          )}
          <div className="flex items-center gap-2">
            {!kayit && metin.trim() && (
              <button type="submit"
                className="h-10 w-10 rounded-md bg-zinc-700 hover:bg-zinc-600 text-emerald-200 flex items-center justify-center"
                title="Gonder">
                <Send size={16} />
              </button>
            )}
            <button type="button"
              onPointerDown={kayitBaslat} onPointerUp={kayitDur}
              onPointerLeave={kayitDur} onPointerCancel={kayitDur}
              className={cn(
                "relative h-14 w-14 rounded-full flex items-center justify-center select-none touch-none transition",
                "shadow-[0_4px_0_#0a0a0f,inset_0_2px_3px_rgba(255,255,255,0.1)]",
                kayit
                  ? "bg-gradient-to-b from-red-500 to-red-700 scale-95 shadow-[0_0_18px_4px_rgba(220,90,90,0.6)]"
                  : "bg-gradient-to-b from-zinc-600 to-zinc-800 hover:from-zinc-500 hover:to-zinc-700"
              )}
              title="Basili tut: konus"
            >
              <Mic size={22} className="text-white" />
              <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 font-mono text-[9px] tracking-widest text-zinc-400">
                PTT
              </span>
            </button>
          </div>
        </form>

        <div className="absolute -left-0.5 top-12 w-1 h-12 rounded-r-sm bg-gradient-to-b from-zinc-700 to-zinc-500 shadow-md" />
        <div className="absolute -right-0.5 top-12 w-1 h-12 rounded-l-sm bg-gradient-to-b from-zinc-700 to-zinc-500 shadow-md" />
        <div className="absolute right-1.5 top-2 flex items-center gap-1">
          <span className="text-[8px] font-mono text-zinc-600 tracking-widest">YBJ-D</span>
          <Radio size={9} className="text-zinc-600" />
        </div>
      </div>
    </div>
  );
}
