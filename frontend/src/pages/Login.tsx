import { KeyRound, User, Warehouse } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import Filigran from "../components/Filigran";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [ad, setAd] = useState("admin");
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null); setBusy(true);
    try { await login(ad, pin); nav("/"); }
    catch (e: any) { setErr(e.message ?? "Giris hatasi"); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-cream flex items-center justify-center px-4">
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-deep/12 blur-3xl pointer-events-none" />

      <form onSubmit={onSubmit} className="relative card p-7 w-full max-w-sm space-y-4 shadow-xl shadow-deep/10">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-deep text-accent">
            <Warehouse size={28} />
          </div>
          <div className="font-display text-3xl font-bold text-deep mt-3">Depojin</div>
          <div className="text-xs uppercase tracking-[0.22em] text-ink/55 mt-1">Depo sayim sistemi</div>
        </div>

        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-ink/60">Kullanici adi</span>
          <div className="mt-1.5 relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-edge bg-white focus:border-deep outline-none"
              value={ad} onChange={(e) => setAd(e.target.value)} autoFocus
            />
          </div>
        </label>

        <label className="block">
          <span className="text-[11px] uppercase tracking-[0.18em] text-ink/60">Sifre / PIN</span>
          <div className="mt-1.5 relative">
            <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
            <input
              type="password"
              autoComplete="current-password"
              className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-edge bg-white focus:border-deep outline-none"
              value={pin} onChange={(e) => setPin(e.target.value)}
            />
          </div>
        </label>

        {err && <div className="text-bad text-sm font-medium">{err}</div>}

        <button type="submit" disabled={busy}
          className="btn btn-primary w-full py-2.5 disabled:opacity-60">
          {busy ? "Giris yapiliyor..." : "Giris"}
        </button>
      </form>
      <Filigran />
    </div>
  );
}
