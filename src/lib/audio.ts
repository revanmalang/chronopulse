let ctx: AudioContext | null = null;

type AC = typeof AudioContext;

export function unlockAudio(): void {
  try {
    if (typeof window === "undefined") return;
    const Ctor: AC | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext;
    if (!Ctor) return;
    if (!ctx) ctx = new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {}
}

export function beep(freqs: number[]): void {
  try {
    const c = ctx;
    if (!c) return;
    freqs.forEach((f, i) => {
      const t0 = c.currentTime + i * 0.3;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = "sine";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.26);
      osc.connect(gain).connect(c.destination);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
  } catch {}
}
