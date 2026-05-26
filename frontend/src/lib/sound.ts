const ctx = () => {
  const C = (window as any).AudioContext || (window as any).webkitAudioContext;
  return C ? new C() : null;
};

function beep(freq: number, ms: number) {
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.value = freq;
  o.type = "sine";
  g.gain.value = 0.1;
  o.connect(g).connect(c.destination);
  o.start();
  setTimeout(() => { o.stop(); c.close(); }, ms);
}

export const sound = {
  basarili: () => beep(880, 120),
  uyari:    () => { beep(440, 80); setTimeout(() => beep(440, 80), 110); },
  hata:     () => beep(200, 220),
};
