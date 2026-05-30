import { FormEvent, KeyboardEvent, memo, useEffect, useMemo, useRef, useState } from "react";
import { api, LogSatir, StokOzet } from "../lib/api";
import { cn } from "../lib/cn";

const RENK: Record<string, string> = {
  basarili: "text-emerald-400",
  mukerrer: "text-amber-300",
  bulunamadi: "text-red-400",
  cakisma: "text-orange-300",
  ok: "text-emerald-400",
  warn: "text-amber-300",
  err: "text-red-400",
  input: "text-sky-300",
  info: "text-zinc-300",
};

const ET: Record<string, string> = {
  basarili: "OK",
  mukerrer: "DUP",
  bulunamadi: "404",
  cakisma: "CONF",
};

function saat(t: number) {
  return new Date(t).toLocaleTimeString("tr-TR", { hour12: false });
}

type CmdOut = { id: string; ts: number; lines: string[]; renk: string };
type Item =
  | { id: string; ts: number; tip: "scan"; row: LogSatir }
  | { id: string; ts: number; tip: "cmd"; lines: string[]; renk: string };

type Props = {
  rows: LogSatir[];
  oturumId: number;
  baslik?: string;
  stoklar: StokOzet[];
  onSec?: (row: LogSatir) => void;
};

const KOMUTLAR = ["help", "clear", "tara", "ozet", "bul", "stok", "users", "audit", "kim", "history"];

function _Terminal({ rows, oturumId, baslik = "oturum", stoklar, onSec }: Props) {
  const [cmds, setCmds] = useState<CmdOut[]>([]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const sonRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cikisRef = useRef<HTMLDivElement>(null);

  const items = useMemo<Item[]>(() => {
    const arr: Item[] = [];
    rows.forEach(r => arr.push({ id: `s${r.id}`, ts: new Date(r.zaman).getTime(), tip: "scan", row: r }));
    cmds.forEach(c => arr.push({ id: c.id, ts: c.ts, tip: "cmd", lines: c.lines, renk: c.renk }));
    return arr.sort((a, b) => a.ts - b.ts);
  }, [rows, cmds]);

  useEffect(() => {
    const el = cikisRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length]);

  function pushOut(lines: string[], renk: string = "info") {
    setCmds(prev => [...prev, { id: `c${Date.now()}_${Math.random()}`, ts: Date.now(), lines, renk }]);
  }

  function pushInput(line: string) {
    pushOut([`$ ${line}`], "input");
  }

  async function calistir(raw: string) {
    const cmd = raw.trim();
    if (!cmd) return;
    setHistory(h => [...h.filter(x => x !== cmd), cmd].slice(-50));
    setHistIdx(-1);
    pushInput(cmd);
    const [name, ...rest] = cmd.split(/\s+/);
    const arg = rest.join(" ").trim();
    try {
      switch (name) {
        case "help":
          pushOut([
            "depojin terminal v1",
            "  help                komut listesi",
            "  clear               cikti temizle",
            "  tara <seri>         barkod tara",
            "  ozet                oturum ozeti",
            "  bul <q>             stok ara",
            "  stok <kod>          stok detayi",
            "  users               kullanici listesi (admin)",
            "  audit               son aksiyonlar (admin)",
            "  kim                 mevcut kullanici",
            "  history             komut gecmisi",
          ]);
          break;
        case "clear":
          setCmds([]);
          break;
        case "tara": {
          if (!arg) { pushOut(["! seri argumani bekleniyor: tara <seri>"], "err"); break; }
          const r = await api.tara(oturumId, arg);
          const cizgi = [
            `  durum: ${r.durum}  ${r.mesaj}`,
            r.stok_kodu ? `  stok:  ${r.stok_kodu} ${r.urun_adi ?? ""}` : "",
            (r.sayilan != null) ? `  sayim: ${r.sayilan}/${r.toplam}  kalan ${r.kalan}  portal ${r.portal_sayim ?? "—"} (fark ${r.portal_fark ?? "—"})` : "",
            r.cakisan_stoklar ? `  cakisan: ${r.cakisan_stoklar.join(", ")}` : "",
          ].filter(Boolean);
          pushOut(cizgi, r.durum);
          break;
        }
        case "ozet": {
          const o = await api.oturumOzet(oturumId);
          pushOut([
            `  stok        ${o.stok_sayisi}`,
            `  toplam seri ${o.toplam_seri}`,
            `  sayilan     ${o.sayilan_seri}  (kalan ${o.kalan_seri})`,
            `  portal      ${o.portal_toplam}  (fark ${o.portal_fark})`,
            o.son_islem ? `  son islem   ${new Date(o.son_islem).toLocaleString("tr-TR")}` : "",
          ].filter(Boolean));
          break;
        }
        case "bul": {
          if (!arg) { pushOut(["! sorgu lazim"], "err"); break; }
          const q = arg.toLowerCase();
          const hits = stoklar.filter(s => `${s.stok_kodu} ${s.urun_adi}`.toLowerCase().includes(q)).slice(0, 12);
          pushOut(hits.length ? hits.map(s => `  ${s.stok_kodu.padEnd(10)} ${s.sayilan}/${s.toplam}  ${s.urun_adi}`) : ["  eslesen yok"]);
          break;
        }
        case "stok": {
          if (!arg) { pushOut(["! stok kodu lazim"], "err"); break; }
          const s = stoklar.find(x => x.stok_kodu === arg);
          if (!s) { pushOut([`! ${arg} bulunamadi`], "err"); break; }
          pushOut([
            `  ${s.stok_kodu}  ${s.urun_adi}`,
            `  sayim ${s.sayilan}/${s.toplam}  portal ${s.portal_sayim}  fark ${s.sayilan - s.portal_sayim}`,
            s.sonradan_eklendi ? "  not: sonradan eklenen stok" : "",
          ].filter(Boolean));
          break;
        }
        case "users":
        case "kullanicilar": {
          const us = await api.users();
          pushOut(us.map(u => `  ${u.ad.padEnd(20)} ${u.rol}${u.aktif ? "" : "  (pasif)"}`));
          break;
        }
        case "audit": {
          const a = await api.audit(undefined, undefined, 10, 0);
          pushOut(a.items.map(x =>
            `  ${new Date(x.zaman).toLocaleString("tr-TR")} ${(x.kullanici_ad ?? "?").padEnd(12)} ${x.eylem}` +
            (x.kaynak_tip ? ` ${x.kaynak_tip}#${x.kaynak_id}` : "")
          ));
          break;
        }
        case "kim": {
          const me = await api.me();
          pushOut([`  ${me.ad} (${me.rol})`]);
          break;
        }
        case "history": {
          pushOut(history.length ? history.slice(-20).map((c, i) => `  ${String(i+1).padStart(3)} ${c}`) : ["  gecmis bos"]);
          break;
        }
        default:
          pushOut([`! bilinmeyen komut: ${name}. 'help' yaz.`], "err");
      }
    } catch (e: any) {
      pushOut([`! ${e.message ?? "hata"}`], "err");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = input;
    setInput("");
    calistir(v);
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length === 0) return;
      const idx = histIdx < 0 ? history.length - 1 : Math.max(0, histIdx - 1);
      setHistIdx(idx); setInput(history[idx] ?? "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (histIdx < 0) return;
      const idx = histIdx + 1;
      if (idx >= history.length) { setHistIdx(-1); setInput(""); }
      else { setHistIdx(idx); setInput(history[idx]); }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const eslesme = KOMUTLAR.find(k => k.startsWith(input));
      if (eslesme) setInput(eslesme + " ");
    }
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-zinc-800 bg-[#0c0c0c] shadow-2xl shadow-black/50 font-mono">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800 bg-[#1a1a1a]">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        </div>
        <div className="text-[11px] tracking-wider text-zinc-400 truncate">
          root@depojin: ~/{baslik}
        </div>
        <button onClick={() => inputRef.current?.focus()}
          className="text-[11px] text-emerald-400 flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          live
        </button>
      </div>

      <div
        ref={cikisRef}
        className="text-[12px] sm:text-[13px] leading-[1.55] h-[420px] lg:h-[640px] max-h-[640px] overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3 cursor-text"
        style={{ background: "linear-gradient(180deg,#0c0c0c 0%,#101010 100%)" }}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="text-zinc-400 mb-2">
          <span className="text-emerald-400">root@depojin</span><span className="text-zinc-500">:</span>
          <span className="text-sky-400">~/{baslik}</span><span className="text-zinc-500">$ </span>
          <span className="text-zinc-200">tail -f scans.log  &amp;&amp;  help</span>
        </div>

        {items.length === 0 && (
          <div className="text-zinc-500 py-2 whitespace-pre-wrap break-words">
            <span className="text-zinc-600">[</span>
            <span className="text-zinc-400">{saat(Date.now())}</span>
            <span className="text-zinc-600">]</span> waiting for scans; "help" komut listesi.
          </div>
        )}

        {items.map(it => it.tip === "scan" ? (
          <div
            key={it.id}
            onClick={() => onSec?.(it.row)}
            className="flex items-start gap-2 hover:bg-white/[0.04] -mx-3 px-3 cursor-pointer whitespace-pre-wrap break-words"
          >
            <span className="text-zinc-500 shrink-0">[{saat(it.ts)}]</span>
            <span className={cn("shrink-0 w-9 font-bold", RENK[it.row.durum] ?? "text-sky-400")}>
              {ET[it.row.durum] ?? it.row.durum.slice(0, 4).toUpperCase()}
            </span>
            <span className="text-zinc-600 shrink-0">::</span>
            <span className="text-zinc-200 min-w-0 break-words">
              <span className="text-zinc-50 font-semibold">{it.row.seri_giris}</span>
              {it.row.stok_kodu && (
                <>
                  <span className="text-zinc-600"> · </span>
                  <span className="text-amber-300">{it.row.stok_kodu}</span>{" "}
                  <span className="text-zinc-400">{it.row.urun_adi}</span>
                </>
              )}
              {!it.row.stok_kodu && it.row.aciklama && (
                <><span className="text-zinc-600"> · </span><span className="text-zinc-500">{it.row.aciklama}</span></>
              )}
              {it.row.kullanici_ad && (
                <><span className="text-zinc-600"> @</span><span className="text-fuchsia-300">{it.row.kullanici_ad}</span></>
              )}
            </span>
          </div>
        ) : (
          <div
            key={it.id}
            className={cn("py-0.5 whitespace-pre-wrap break-words", RENK[it.renk] ?? "text-zinc-300")}
          >
            {it.lines.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        ))}

        <div ref={sonRef} />
      </div>

      <form onSubmit={onSubmit}
        className="flex items-center gap-2 border-t border-zinc-800 bg-[#0c0c0c] px-3 py-2 text-[13px]">
        <span className="text-emerald-400 shrink-0">root@depojin</span>
        <span className="text-zinc-500">:</span>
        <span className="text-sky-400 shrink-0">~/{baslik}</span>
        <span className="text-zinc-500 shrink-0">$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          spellCheck={false}
          autoComplete="off"
          placeholder="'help' yaz"
          className="flex-1 bg-transparent outline-none text-zinc-100 placeholder:text-zinc-600 caret-emerald-400"
        />
      </form>
    </div>
  );
}

export default memo(_Terminal);
