"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Pause, Play, Plus, SkipForward, Timer } from "lucide-react";
import { sound, vibrate } from "@/lib/sound";
import { clock, cn } from "@/lib/utils";

/**
 * Floating rest timer. Counts down, warns at three seconds, then alerts.
 * Uses wall-clock deltas so a backgrounded tab doesn't drift.
 */
export function RestTimer({
  seconds,
  onDone,
  onDismiss,
  soundEnabled = true,
  vibrationEnabled = true,
}: {
  seconds: number;
  onDone?(): void;
  onDismiss(): void;
  soundEnabled?: boolean;
  vibrationEnabled?: boolean;
}) {
  const [total, setTotal] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(true);
  // Set on the first tick rather than during render — Date.now() is impure.
  const endsAt = useRef<number>(0);
  const warned = useRef(false);
  const finished = useRef(false);

  useEffect(() => {
    if (!running) return;
    endsAt.current ||= Date.now() + seconds * 1000;
    const id = setInterval(() => {
      const left = Math.max(0, (endsAt.current - Date.now()) / 1000);
      setRemaining(left);

      if (left <= 3.2 && left > 0.2 && !warned.current) {
        warned.current = true;
        if (soundEnabled) sound.countdown();
      }
      if (left <= 0 && !finished.current) {
        finished.current = true;
        if (soundEnabled) sound.restOver();
        if (vibrationEnabled) vibrate([120, 60, 120]);
        onDone?.();
      }
    }, 200);
    return () => clearInterval(id);
  }, [running, seconds, soundEnabled, vibrationEnabled, onDone]);

  const adjust = useCallback((delta: number) => {
    endsAt.current += delta * 1000;
    setTotal((t) => Math.max(5, t + delta));
    setRemaining(Math.max(0, (endsAt.current - Date.now()) / 1000));
    finished.current = false;
    warned.current = false;
  }, []);

  const toggle = () => {
    if (running) {
      const left = endsAt.current - Date.now();
      setRunning(false);
      endsAt.current = left; // store remaining ms while paused
    } else {
      endsAt.current = Date.now() + (endsAt.current as number);
      setRunning(true);
    }
  };

  const pct = total > 0 ? (remaining / total) * 100 : 0;
  const done = remaining <= 0;

  return (
    <div className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-md lg:bottom-6">
      <div
        className={cn(
          "glass flex items-center gap-3 rounded-xl p-3 shadow-(--shadow-pop)",
          done && "border-volt",
        )}
      >
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center">
          <svg className="absolute -rotate-90" width={48} height={48}>
            <circle cx={24} cy={24} r={20} fill="none" stroke="var(--c-panel-3)" strokeWidth={4} />
            <circle
              cx={24}
              cy={24}
              r={20}
              fill="none"
              stroke={done ? "var(--c-volt)" : "var(--c-ice)"}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 20}
              strokeDashoffset={2 * Math.PI * 20 * (1 - pct / 100)}
            />
          </svg>
          <Timer size={16} className={done ? "text-volt" : "text-ice"} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold tnum">
            {done ? "Go!" : clock(remaining)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-faint">
            {done ? "Rest complete — next set" : "Resting"}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => adjust(-15)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted transition hover:text-ink"
            aria-label="Subtract 15 seconds"
          >
            <Minus size={14} />
          </button>
          <button
            type="button"
            onClick={toggle}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted transition hover:text-ink"
            aria-label={running ? "Pause timer" : "Resume timer"}
          >
            {running ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            type="button"
            onClick={() => adjust(15)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-muted transition hover:text-ink"
            aria-label="Add 15 seconds"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-8 items-center gap-1 rounded-md bg-volt px-2.5 text-[11px] font-semibold text-volt-ink"
          >
            <SkipForward size={13} />
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}
