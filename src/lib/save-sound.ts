/** Short success chime for note saved feedback */
export function playSaveSound(): void {
  if (typeof window === "undefined") return;
  try {
    const ctx = new AudioContext();
    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };
    playTone(523.25, ctx.currentTime, 0.18);
    playTone(659.25, ctx.currentTime + 0.12, 0.22);
    playTone(783.99, ctx.currentTime + 0.24, 0.28);
    setTimeout(() => void ctx.close(), 700);
  } catch {
    /* audio not available */
  }
}
