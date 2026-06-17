/** Phone call — classic dual-tone ring */
export function createPhoneRing(ctx: AudioContext): () => void {
  let stopped = false;
  let tid: ReturnType<typeof setTimeout>;

  function play() {
    if (stopped || ctx.state === "closed") return;
    const go = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
    go.then(() => {
      if (stopped) return;
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const g = ctx.createGain();
      o1.type = "sine";
      o1.frequency.value = 440;
      o2.type = "sine";
      o2.frequency.value = 480;
      o1.connect(g);
      o2.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.28, t + 0.05);
      g.gain.setValueAtTime(0.28, t + 1.85);
      g.gain.linearRampToValueAtTime(0, t + 2.0);
      o1.start(t);
      o2.start(t);
      o1.stop(t + 2.0);
      o2.stop(t + 2.0);
      tid = setTimeout(play, 5000);
    }).catch(() => {});
  }

  play();
  return () => {
    stopped = true;
    clearTimeout(tid);
    try {
      ctx.close();
    } catch {
      /* skip */
    }
  };
}

/** Meet — strong Teams-style repeating chime (louder, faster) */
export function createMeetRing(ctx: AudioContext): () => void {
  let stopped = false;
  let tid: ReturnType<typeof setTimeout>;
  const pattern = [523, 659, 784, 1047];

  function play() {
    if (stopped || ctx.state === "closed") return;
    const go = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
    go.then(() => {
      if (stopped) return;
      pattern.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        osc.connect(g);
        g.connect(ctx.destination);
        const t = ctx.currentTime + i * 0.22;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.35, t + 0.03);
        g.gain.setValueAtTime(0.35, t + 0.15);
        g.gain.linearRampToValueAtTime(0, t + 0.2);
        osc.start(t);
        osc.stop(t + 0.22);
      });
      tid = setTimeout(play, 2800);
    }).catch(() => {});
  }

  play();
  return () => {
    stopped = true;
    clearTimeout(tid);
    try {
      ctx.close();
    } catch {
      /* skip */
    }
  };
}

export type RingKind = "audio" | "meet";

export function startCallRing(kind: RingKind): () => void {
  try {
    const ctx = new AudioContext();
    return kind === "meet" ? createMeetRing(ctx) : createPhoneRing(ctx);
  } catch {
    return () => {};
  }
}
