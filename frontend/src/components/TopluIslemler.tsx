import { useState } from "react";
import { motion } from "framer-motion";
import { PackagePlus, LogOut as LogOutIcon, UserCheck, Undo2, ChevronDown, Layers } from "lucide-react";
import { api, User } from "../lib/api";
import { useToast } from "../lib/toast";
import { cn } from "../lib/cn";

type Props = {
  oturumId: number;
  users: User[];
  aktif: boolean;
  onDegisti?: () => void;
};

export default function TopluIslemler({ oturumId, users, aktif, onDegisti }: Props) {
  const toast = useToast();
  const [acik, setAcik] = useState(false);
  const [mod, setMod] = useState<"giris" | "cikis" | "zimmet" | "iade">("giris");
  const [metin, setMetin] = useState("");
  const [not, setNot] = useState("");
  const [hedef, setHedef] = useState<number | "">("");
  const [sonuc, setSonuc] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function _seriListesi() {
    return metin.split(/[\r\n,;]+/).map(s => s.trim()).filter(Boolean);
  }
  function _girisSatirlari() {
    const out: { stok_kodu: string; urun_adi?: string; seri_no: string; portal_sayim?: number }[] = [];
    metin.split(/\r?\n/).forEach(line => {
      const parts = line.split(/[\t;,]/).map(p => p.trim());
      if (parts.length >= 3) {
        out.push({
          stok_kodu: parts[0], urun_adi: parts[1] || undefined,
          seri_no: parts[2], portal_sayim: Number(parts[3]) || 0,
        });
      }
    });
    return out;
  }

  async function calistir() {
    setBusy(true); setSonuc(null);
    try {
      if (mod === "giris") {
        const satirlar = _girisSatirlari();
        if (!satirlar.length) { toast.push("warn", "Format: STOK,URUN,SERI[,PORTAL]"); return; }
        const r = await api.topluGiris(oturumId, satirlar);
        setSonuc(`stok+${r.yeni_stok} · seri+${r.yeni_seri} · mukerrer ${r.mukerrer} · bos ${r.bos}`);
      } else {
        const seriler = _seriListesi();
        if (!seriler.length) { toast.push("warn", "Seri no listesi bos"); return; }
        if (mod === "cikis") {
          const r = await api.topluCikis(oturumId, seriler, not || undefined);
          setSonuc(`isaretlenen ${r.isaretlenen} · zaten cikis ${r.zaten_cikis} · bulunamadi ${r.bulunamadi.length}`);
        } else if (mod === "zimmet") {
          if (hedef === "") { toast.push("warn", "Hedef sec"); return; }
          const r = await api.topluZimmet(oturumId, seriler, Number(hedef), not || undefined);
          setSonuc(`${r.hedef} -> zimmet ${r.zimmetlenen} · zaten ${r.zaten_zimmette} · bulunamadi ${r.bulunamadi.length}`);
        } else {
          const r = await api.topluIade(oturumId, seriler);
          setSonuc(`iade ${r.iade} · zimmette degil ${r.zimmette_olmayan} · bulunamadi ${r.bulunamadi.length}`);
        }
      }
      toast.push("ok", `Toplu ${mod} tamam`);
      setMetin(""); setNot("");
      onDegisti?.();
    } catch (e: any) {
      toast.push("err", e.message);
    } finally { setBusy(false); }
  }

  const cfg = {
    giris:  { icon: PackagePlus, etiket: "Giris",  renk: "bg-deep text-white",   placeholder: "Her satir: STOK,URUN,SERI,PORTAL\n10036,NEW OSMOS,RW96578,15" },
    cikis:  { icon: LogOutIcon,  etiket: "Cikis",  renk: "bg-bad text-white",     placeholder: "Her satir: SERI NO\nRW96578\nRW96580" },
    zimmet: { icon: UserCheck,   etiket: "Zimmet", renk: "bg-accent text-white",  placeholder: "Her satir: SERI NO" },
    iade:   { icon: Undo2,       etiket: "Iade",   renk: "bg-warn text-ink",      placeholder: "Her satir: SERI NO" },
  }[mod];

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setAcik(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-cream transition"
        disabled={!aktif}
      >
        <span className="flex items-center gap-2 font-medium">
          <Layers size={16} className="text-accent" />
          Toplu islemler
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink/55">
            giris · cikis · zimmet · iade
          </span>
        </span>
        <ChevronDown size={16} className={cn("transition-transform", acik && "rotate-180")} />
      </button>

      {acik && aktif && (
        <motion.div
          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="border-t border-edge/60 p-4 space-y-3"
        >
          <div className="flex gap-1 text-xs flex-wrap">
            {(["giris", "cikis", "zimmet", "iade"] as const).map(m => {
              const c = {
                giris: { icon: PackagePlus, et: "Giris" },
                cikis: { icon: LogOutIcon, et: "Cikis" },
                zimmet: { icon: UserCheck, et: "Zimmet" },
                iade: { icon: Undo2, et: "Iade" },
              }[m];
              const I = c.icon;
              return (
                <button key={m} onClick={() => setMod(m)} className={cn(
                  "px-3 py-1.5 rounded-md flex items-center gap-1.5",
                  mod === m ? "bg-deep text-white font-semibold" : "bg-edge/20 hover:bg-edge/40"
                )}>
                  <I size={13} /> {c.et}
                </button>
              );
            })}
          </div>

          <textarea value={metin} onChange={e => setMetin(e.target.value)}
            rows={5}
            placeholder={cfg.placeholder}
            className="w-full px-3 py-2 rounded-lg border border-edge bg-white font-mono text-sm" />

          {(mod === "cikis" || mod === "zimmet") && (
            <input value={not} onChange={e => setNot(e.target.value)}
              placeholder="Not (opsiyonel)"
              className="w-full px-3 py-2 rounded-lg border border-edge bg-white text-sm" />
          )}

          {mod === "zimmet" && (
            <select value={hedef === "" ? "" : String(hedef)}
              onChange={e => setHedef(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-edge bg-white text-sm">
              <option value="">-- Zimmet hedefi sec --</option>
              {users.filter(u => u.aktif).map(u => (
                <option key={u.id} value={u.id}>{u.ad} ({u.rol})</option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={calistir} disabled={busy}
              className={cn("btn text-sm flex items-center gap-1.5 disabled:opacity-50", cfg.renk)}>
              <cfg.icon size={14} /> {cfg.etiket} calistir
            </button>
            {sonuc && <span className="text-sm text-good font-mono break-all">{sonuc}</span>}
          </div>
        </motion.div>
      )}
    </div>
  );
}
