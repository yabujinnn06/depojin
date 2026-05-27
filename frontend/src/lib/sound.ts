let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const C = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!C) return null;
  if (!ctx) ctx = new C();
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

function ton(freq: number, sure: number, baslangic = 0, tip: OscillatorType = "sine", vol = 0.18, freq2?: number) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + baslangic;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = tip;
  o.frequency.setValueAtTime(freq, t0);
  if (freq2 != null) o.frequency.exponentialRampToValueAtTime(freq2, t0 + sure / 1000);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + sure / 1000);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + sure / 1000 + 0.02);
}

export const sound = {
  arm() { ac(); },
  basarili() {
    ton(720, 90, 0,    "triangle", 0.22, 1180);
    ton(1180, 110, 0.10, "triangle", 0.18);
  },
  uyari() {
    ton(740, 90, 0,    "square", 0.18);
    ton(740, 90, 0.16, "square", 0.18);
  },
  hata() {
    ton(380, 90, 0,    "sawtooth", 0.20, 200);
    ton(220, 180, 0.10, "sawtooth", 0.18, 140);
  },
};

if (typeof window !== "undefined") {
  const arm = () => { sound.arm(); };
  window.addEventListener("click", arm, { once: true });
  window.addEventListener("touchstart", arm, { once: true });
  window.addEventListener("keydown", arm, { once: true });
}
