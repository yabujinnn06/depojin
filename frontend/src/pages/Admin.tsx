import { ChangeEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, Trash2, UserPlus, Power, ShieldCheck, History } from "lucide-react";
import { api, AuditSatir, Oturum, User } from "../lib/api";
import { useToast } from "../lib/toast";
import { useAuth } from "../lib/auth";
import { BlurFade } from "../components/magic/BlurFade";
import { cn } from "../lib/cn";

export default function Admin() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [oturumlar, setOturumlar] = useState<Oturum[]>([]);
  const [audit, setAudit] = useState<AuditSatir[]>([]);
  const [yeniAd, setYeniAd] = useState("");
  const [yeniPin, setYeniPin] = useState("");
  const [yeniRol, setYeniRol] = useState("sayan");
  const [secOturum, setSecOturum] = useState<number | null>(null);
  const [devam, setDevam] = useState(false);
  const [yuklenen, setYuklenen] = useState<string | null>(null);

  async function refresh() {
    try {
      const [u, o, a] = await Promise.all([
        api.users(),
        api.oturumlar(true),
        api.audit(undefined, undefined, 30, 0),
      ]);
      setUsers(u); setOturumlar(o); setAudit(a.items);
      if (!secOturum && o.length) setSecOturum(o.find(x => x.durum === "aktif")?.id ?? o[0].id);
    } catch (e: any) { toast.push("err", e.message); }
  }
  useEffect(() => { refresh(); }, []);

  async function ekleKullanici() {
    if (!yeniAd.trim()) { toast.push("warn", "Ad bos olamaz"); return; }
    if (yeniPin.length < 4) { toast.push("warn", "PIN en az 4 karakter"); return; }
    try {
      await api.createUser(yeniAd, yeniPin, yeniRol);
      setYeniAd(""); setYeniPin(""); setYeniRol("sayan");
      toast.push("ok", "Kullanici eklendi");
      refresh();
    } catch (e: any) { toast.push("err", e.message); }
  }

  async function pinReset(u: User) {
    const p = prompt(`${u.ad} icin yeni PIN (en az 4 karakter):`);
    if (!p || p.length < 4) { if (p !== null) toast.push("warn", "PIN en az 4 karakter"); return; }
    try { await api.pinReset(u.id, p); toast.push("ok", `${u.ad} PIN sifirlandi`); }
    catch (e: any) { toast.push("err", e.message); }
  }

  async function toggleAktif(u: User) {
    try { await api.updateUser(u.id, { aktif: !u.aktif }); toast.push("ok", "Durum guncellendi"); refresh(); }
    catch (e: any) { toast.push("err", e.message); }
  }

  async function silKullanici(u: User) {
    if (!confirm(`${u.ad} pasif yapilsin mi?`)) return;
    try { await api.silUser(u.id); toast.push("ok", "Pasif yapildi"); refresh(); }
    catch (e: any) { toast.push("err", e.message); }
  }

  async function silOturum(o: Oturum) {
    if (!confirm(`"${o.ad}" oturumu silinsin mi? Tum veri kaybolur.`)) return;
    try { await api.oturumSil(o.id); toast.push("ok", "Oturum silindi"); refresh(); }
    catch (e: any) { toast.push("err", e.message); }
  }

  async function arsivleOturum(o: Oturum) {
    try { await api.oturumArsivle(o.id); toast.push("ok", "Arsivlendi"); refresh(); }
    catch (e: any) { toast.push("err", e.message); }
  }

  async function dosyaSec(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !secOturum) return;
    setYuklenen("Yukleniyor...");
    try {
      const r = await api.excelYukle(secOturum, f, devam);
      const parts = [
        `Sayfa: ${r.sayfa}`,
        `Stok: ${r.eklenen_stok}`,
        `Seri: ${r.eklenen_seri}`,
        `Mukerrer: ${r.mukerrer_seri}`,
        `Junk: ${r.atlanan_junk_header}`,
      ];
      if (r.devam_modu) parts.push(`Onceden sayilan: ${r.onceden_sayilan_olarak_isaretlenen}`);
      setYuklenen(parts.join(" · "));
      toast.push("ok", `${r.eklenen_seri} seri eklendi`);
    } catch (err: any) { setYuklenen(null); toast.push("err", err.message); }
    finally { e.target.value = ""; }
  }

  return (
    <div className="space-y-6">
      <BlurFade>
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-ink/55">Admin paneli</div>
          <h2 className="font-display text-3xl">Sistem yonetimi</h2>
        </div>
      </BlurFade>

      <div className="grid md:grid-cols-2 gap-6">
        <BlurFade delay={0.1}>
          <section className="card p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              Excel ile stok yukle
            </h3>
            <label className="block text-sm">
              Oturum
              <select className="mt-1 w-full px-3 py-2 rounded-lg border border-edge bg-white"
                value={secOturum ?? ""} onChange={e => setSecOturum(Number(e.target.value))}>
                {oturumlar.filter(o => o.durum === "aktif").map(o => (
                  <option key={o.id} value={o.id}>{o.ad}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={devam} onChange={e => setDevam(e.target.checked)} />
              Devam modu (I/J/K kolonundan eski sayim durumunu yukle)
            </label>
            <label className="block text-sm">
              Dosya (.xlsx / .xlsm)
              <input type="file" accept=".xlsx,.xlsm" onChange={dosyaSec}
                className="mt-1 w-full text-sm" />
            </label>
            {yuklenen && <div className="text-sm text-good break-all">{yuklenen}</div>}
            <div className="text-xs text-ink/55">
              Sayfa otomatik tespit (sistem sayfalari atlanir). Junk header ("Stok Kod") skip edilir.
              Stok kodu sayisalsa string'e cevrilir. Portal D, yoksa E'den okunur.
            </div>
          </section>
        </BlurFade>

        <BlurFade delay={0.15}>
          <section className="card p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <UserPlus size={16} className="text-accent" /> Yeni kullanici
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <input className="px-3 py-2 rounded-lg border border-edge" placeholder="Ad"
                value={yeniAd} onChange={e => setYeniAd(e.target.value)} />
              <input className="px-3 py-2 rounded-lg border border-edge" placeholder="PIN (>=4)" type="password"
                value={yeniPin} onChange={e => setYeniPin(e.target.value)} />
              <select className="px-3 py-2 rounded-lg border border-edge bg-white"
                value={yeniRol} onChange={e => setYeniRol(e.target.value)}>
                <option value="sayan">Sayan</option>
                <option value="izleyici">Izleyici</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn btn-primary" onClick={ekleKullanici}>Ekle</button>
            </div>
          </section>
        </BlurFade>
      </div>

      <BlurFade delay={0.2}>
        <section className="card overflow-hidden">
          <div className="px-4 py-2.5 bg-deep text-white flex items-center gap-2">
            <ShieldCheck size={16} />
            <span className="text-sm font-semibold tracking-wide">KULLANICILAR</span>
            <span className="ml-auto text-xs opacity-70 font-mono">{users.length}</span>
          </div>
          <ul className="divide-y divide-edge/40">
            <AnimatePresence>
              {users.map(u => (
                <motion.li key={u.id}
                  initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className={cn("flex items-center gap-3 p-3 hover:bg-cream/70 transition", !u.aktif && "opacity-60")}>
                  <div className="h-9 w-9 rounded-full bg-deep text-white flex items-center justify-center font-bold">
                    {u.ad.slice(0,1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{u.ad}{u.id === me?.id && <span className="ml-2 text-xs text-ink/55">(sen)</span>}</div>
                    <div className="text-xs text-ink/55">{u.rol}{!u.aktif && " · pasif"}</div>
                  </div>
                  <button onClick={() => pinReset(u)}
                    title="PIN sifirla" className="p-2 rounded-md hover:bg-edge/30 text-ink/65">
                    <Key size={14} />
                  </button>
                  <button onClick={() => toggleAktif(u)} disabled={u.id === me?.id}
                    title={u.aktif ? "Pasif yap" : "Aktif yap"}
                    className={cn("p-2 rounded-md hover:bg-edge/30 disabled:opacity-30",
                      u.aktif ? "text-good" : "text-bad")}>
                    <Power size={14} />
                  </button>
                  <button onClick={() => silKullanici(u)} disabled={u.id === me?.id}
                    title="Pasif yap (soft delete)"
                    className="p-2 rounded-md hover:bg-bad/10 text-bad disabled:opacity-30">
                    <Trash2 size={14} />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </section>
      </BlurFade>

      <BlurFade delay={0.25}>
        <section className="card overflow-hidden">
          <div className="px-4 py-2.5 bg-deep text-white flex items-center gap-2">
            <span className="text-sm font-semibold tracking-wide">OTURUMLAR (arsiv dahil)</span>
            <span className="ml-auto text-xs opacity-70 font-mono">{oturumlar.length}</span>
          </div>
          <ul className="divide-y divide-edge/40 max-h-80 overflow-auto">
            {oturumlar.map(o => (
              <li key={o.id} className="p-3 flex items-center gap-3 hover:bg-cream/70 transition">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{o.ad}</div>
                  <div className="text-xs text-ink/55">{o.lokasyon ?? "-"} · {new Date(o.baslangic).toLocaleString("tr-TR")}</div>
                </div>
                <span className={cn(
                  "text-[10px] uppercase tracking-[0.16em] px-2 py-0.5 rounded-full font-semibold",
                  o.durum === "aktif" ? "bg-good/20 text-good" :
                  o.durum === "tamamlandi" ? "bg-deep/15 text-deep" :
                  o.durum === "arsiv" ? "bg-edge/40 text-ink/60" :
                  "bg-bad/20 text-bad"
                )}>{o.durum}</span>
                {o.durum === "tamamlandi" && (
                  <button onClick={() => arsivleOturum(o)} title="Arsivle"
                    className="p-2 rounded-md hover:bg-edge/30 text-ink/65">
                    <History size={14} />
                  </button>
                )}
                <button onClick={() => silOturum(o)} title="Kalici sil"
                  className="p-2 rounded-md hover:bg-bad/10 text-bad">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
            {oturumlar.length === 0 && (
              <li className="p-6 text-center text-ink/55">Oturum yok.</li>
            )}
          </ul>
        </section>
      </BlurFade>

      <BlurFade delay={0.3}>
        <section className="card overflow-hidden">
          <div className="px-4 py-2.5 bg-deep text-white flex items-center gap-2">
            <History size={16} />
            <span className="text-sm font-semibold tracking-wide">AUDIT LOG</span>
            <span className="ml-auto text-xs opacity-70 font-mono">son {audit.length}</span>
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-cream/80 sticky top-0">
                <tr className="text-left text-[10px] uppercase tracking-[0.14em] text-ink/55">
                  <th className="px-3 py-2">Zaman</th>
                  <th className="px-3 py-2">Kullanici</th>
                  <th className="px-3 py-2">Eylem</th>
                  <th className="px-3 py-2">Kaynak</th>
                  <th className="px-3 py-2">IP</th>
                </tr>
              </thead>
              <tbody>
                {audit.map(a => (
                  <tr key={a.id} className="border-t border-edge/40">
                    <td className="px-3 py-1.5 font-mono text-xs text-ink/70 whitespace-nowrap">
                      {new Date(a.zaman).toLocaleString("tr-TR")}
                    </td>
                    <td className="px-3 py-1.5">{a.kullanici_ad ?? "-"}</td>
                    <td className="px-3 py-1.5 font-mono text-xs">{a.eylem}</td>
                    <td className="px-3 py-1.5 text-xs text-ink/65">
                      {a.kaynak_tip ? `${a.kaynak_tip}#${a.kaynak_id}` : "-"}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-xs text-ink/55">{a.ip ?? "-"}</td>
                  </tr>
                ))}
                {audit.length === 0 && (
                  <tr><td colSpan={5} className="p-6 text-center text-ink/55">Henuz log yok.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </BlurFade>
    </div>
  );
}
