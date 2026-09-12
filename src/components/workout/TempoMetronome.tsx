"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { sound, vibrate } from "@/lib/sound";
import { cn } from "@/lib/utils";

type Phase = "lower" | "pause-bottom" | "lift" | "pause-top";

interface Beat {
  phase: Phase;
  /** 1-based count within the phase. */
  count: number;
  length: number;
}

const PHASE_LABEL: Record<Phase, string> = {
  lower: "Lower",
  "pause-bottom": "Pause",
  lift: "Lift",
  "pause-top": "Squeeze",
};

/**
 * Build one rep as a list of one-second beats from a tempo string.
 * "3-1-1-0" → lower×3, pause×1, lift×1. Lifting always gets at least one beat;
 * "X" (explosive) counts as one.
 */
function beatsFor(tempo: string): Beat[] | null {
  const parts = tempo.split("-").map((p) => (/^x$/i.test(p.trim()) ? 1 : Number(p)));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  const [lower, pauseBottom, lift, pauseTop] = parts;
  const phases: [Phase, number][] = [
    ["lower", lower],
    ["pause-bottom", pauseBottom],
    ["lift", Math.max(1, lift)],
    ["pause-top", pauseTop],
  ];
  const beats: Beat[] = [];
  for (const [phase, length] of phases) {
    for (let i = 1; i <= length; i++) beats.push({ phase, count: i, length });
  }
  return beats.length ? beats : null;
}

/**
 * Counts reps out loud (well, in beeps) on the prescribed tempo. Pitch tells
 * you the phase, so you can keep your eyes on the floor instead of the phone.
 */
export function TempoMetronome({
  tempo,
  autoStart = false,
  vibrationEnabled = true,
  className,
}: {
  tempo: string;
  autoStart?: boolean;
  vibrationEnabled?: boolean;
  className?: string;
}) {
  const beats = useMemo(() => beatsFor(tempo), [tempo]);
  const [running, setRunning] = useState(autoStart && Boolean(beats));
  const [index, setIndex] = useState(0);
  const [reps, setReps] = useState(0);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!running || !beats) return;
    // Each tick plays the beat it lands on, then advances — driven by a
    // self-correcting timeout so beats don't drift over a long set.
    let expected = performance.now();
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      const i = indexRef.current;
      const beat = beats[i];
      if (i === 0) {
        sound.beat("accent");
        if (vibrationEnabled) vibrate(40);
      } else {
        sound.beat(beat.phase === "lower" ? "lower" : beat.phase === "lift" ? "lift" : "pause");
      }
      setIndex(i);
      const next = (i + 1) % beats.length;
      if (next === 0) setReps((r) => r + 1);
      indexRef.current = next;

      expected += 1000;
      timer = setTimeout(tick, Math.max(0, expected - performance.now()));
    };

    tick();
    return () => clearTimeout(timer);
  }, [running, beats, vibrationEnabled]);

  if (!beats) {
    return (
      <p className={cn("text-[11px] text-faint", className)}>
        No fixed tempo for this movement — control every rep.
      </p>
    );
  }

  const beat = beats[index];
  const toggle = () => {
    if (running) {
      setRunning(false);
      return;
    }
    indexRef.current = 0;
    setIndex(0);
    setReps(0);
    setRunning(true);
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border p-2.5",
        running ? "border-volt/40 bg-volt/6" : "border-line bg-panel2",
        className,
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition",
          running ? "bg-volt text-volt-ink" : "border border-line text-muted hover:text-ink",
        )}
        aria-label={running ? "Stop tempo metronome" : "Start tempo metronome"}
        aria-pressed={running}
      >
        {running ? <Pause size={15} /> : <Play size={15} />}
      </button>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">
          Tempo {tempo} metronome
        </p>
        {running ? (
          <p className="font-display text-sm font-bold text-ink" aria-live="polite">
            <span
              className={cn(
                beat.phase === "lift" ? "text-volt" : beat.phase === "lower" ? "text-ice" : "text-muted",
              )}
            >
              {PHASE_LABEL[beat.phase]}
            </span>{" "}
            <span className="tnum">
              {beat.count}/{beat.length}
            </span>
          </p>
        ) : (
          <p className="text-xs text-muted">Beeps each second: low to lower, high to lift.</p>
        )}
      </div>

      {running && (
        <div className="text-right">
          <p className="font-display text-lg font-bold text-ink tnum">{reps}</p>
          <p className="text-[9px] uppercase tracking-wider text-faint">reps</p>
        </div>
      )}
    </div>
  );
}
