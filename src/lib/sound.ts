/** Tiny Web Audio helpers — no asset files, works offline, never blocks. */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, durationMs: number, gain = 0.08, type: OscillatorType = "sine") {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const vol = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  vol.gain.setValueAtTime(0, a.currentTime);
  vol.gain.linearRampToValueAtTime(gain, a.currentTime + 0.01);
  vol.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + durationMs / 1000);
  osc.connect(vol).connect(a.destination);
  osc.start();
  osc.stop(a.currentTime + durationMs / 1000 + 0.02);
}

export const sound = {
  /** Set logged. */
  tick() {
    tone(880, 90, 0.05, "triangle");
  },
  /** Three seconds left on the rest timer. */
  countdown() {
    tone(660, 110, 0.06, "square");
  },
  /** Rest is over — get back under the bar. */
  restOver() {
    tone(520, 140, 0.09, "sawtooth");
    setTimeout(() => tone(780, 200, 0.09, "sawtooth"), 150);
  },
  /** Personal record. */
  celebrate() {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => tone(f, 180, 0.07, "triangle"), i * 110),
    );
  },
  /** Tempo metronome click. */
  click() {
    tone(1200, 40, 0.04, "square");
  },
  /** Reminder alarm. */
  alarm() {
    [0, 1, 2].forEach((i) =>
      setTimeout(() => {
        tone(880, 200, 0.1, "square");
        setTimeout(() => tone(660, 200, 0.1, "square"), 220);
      }, i * 520),
    );
  },
};

export function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* unsupported */
    }
  }
}
