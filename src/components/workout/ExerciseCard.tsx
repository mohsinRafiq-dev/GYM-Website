"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  Heart,
  ListChecks,
  Megaphone,
  PlayCircle,
  Repeat2,
  ShieldAlert,
  Wind,
} from "lucide-react";
import type { Exercise, PlannedExercise } from "@/lib/types";
import { MUSCLE_LABELS } from "@/lib/types";
import { substitutionsFor } from "@/lib/data/exercises";
import { ExerciseAnimation } from "./ExerciseAnimation";
import { MuscleMap } from "./MuscleMap";
import { Pill } from "@/components/ui/feedback";
import { cn } from "@/lib/utils";

type Tab = "how" | "cues" | "mistakes" | "swap";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "how", label: "How to", icon: <ListChecks size={13} /> },
  { id: "cues", label: "Cues", icon: <Megaphone size={13} /> },
  { id: "mistakes", label: "Mistakes", icon: <AlertTriangle size={13} /> },
  { id: "swap", label: "Swap", icon: <Repeat2 size={13} /> },
];

export function ExerciseCard({
  exercise,
  prescription,
  index,
  defaultOpen = false,
  isFavorite,
  onToggleFavorite,
  videoUrl,
}: {
  exercise: Exercise;
  prescription?: PlannedExercise;
  index?: number;
  defaultOpen?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?(): void;
  videoUrl?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState<Tab>("how");
  const subs = substitutionsFor(exercise.id).slice(0, 5);

  const searchHref = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    exercise.media.searchQuery,
  )}`;

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-3 p-3.5 text-left transition hover:bg-panel2"
        aria-expanded={open}
      >
        {index !== undefined && (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-panel3 text-xs font-bold text-volt tnum">
            {index}
          </span>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-display text-sm font-semibold text-ink">{exercise.name}</span>
            {prescription?.keyLift && <Pill tone="ember">Key lift</Pill>}
            {prescription?.supersetGroup && (
              <Pill tone="violet">Superset {prescription.supersetGroup}</Pill>
            )}
            {prescription?.intensifier && prescription.intensifier !== "none" && (
              <Pill tone="ice">{prescription.intensifier.replace("-", " ")}</Pill>
            )}
          </div>

          <p className="mt-1 truncate text-[11px] text-faint">
            {exercise.primary.map((m) => MUSCLE_LABELS[m]).join(" · ")}
            {exercise.secondary.length > 0 && (
              <span className="text-faint/70">
                {" "}
                + {exercise.secondary.slice(0, 3).map((m) => MUSCLE_LABELS[m]).join(", ")}
              </span>
            )}
          </p>

          {prescription && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted tnum">
              <span className="font-semibold text-ink">
                {prescription.sets} × {prescription.reps}
              </span>
              <span>RPE {prescription.rpe}</span>
              <span>{prescription.restSeconds}s rest</span>
              {(prescription.tempo ?? exercise.tempo) && (
                <span>tempo {prescription.tempo ?? exercise.tempo}</span>
              )}
            </div>
          )}

          {prescription?.note && (
            <p className="mt-1.5 text-[11px] italic leading-relaxed text-muted">
              {prescription.note}
            </p>
          )}
        </div>

        <ChevronDown
          size={16}
          className={cn("mt-1 shrink-0 text-faint transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-line p-3.5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <ExerciseAnimation
                pattern={exercise.pattern}
                tempo={prescription?.tempo ?? exercise.tempo}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a
                  href={videoUrl || searchHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel2 px-2.5 py-1.5 text-[11px] text-muted transition hover:border-volt hover:text-volt"
                >
                  <PlayCircle size={13} />
                  {videoUrl ? "Watch saved video" : "Find form videos"}
                </a>
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={onToggleFavorite}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] transition",
                      isFavorite
                        ? "border-ember/40 bg-ember/10 text-ember"
                        : "border-line bg-panel2 text-muted hover:text-ink",
                    )}
                  >
                    <Heart size={13} fill={isFavorite ? "currentColor" : "none"} />
                    {isFavorite ? "Saved" : "Save"}
                  </button>
                )}
                <Link
                  href={`/exercises/${exercise.id}`}
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel2 px-2.5 py-1.5 text-[11px] text-muted transition hover:border-volt hover:text-volt"
                >
                  Full detail
                </Link>
              </div>
            </div>

            <div>
              <div className="mb-3 flex gap-1 rounded-lg border border-line bg-panel2 p-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition",
                      tab === t.id ? "bg-volt text-volt-ink" : "text-muted hover:text-ink",
                    )}
                  >
                    {t.icon}
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>

              {tab === "how" && (
                <div className="space-y-3 text-xs leading-relaxed text-muted">
                  <p className="text-ink">{exercise.purpose}</p>
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
                      Set up
                    </p>
                    <ol className="space-y-1">
                      {exercise.setup.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-volt">{i + 1}.</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
                      Execute
                    </p>
                    <ol className="space-y-1">
                      {exercise.execution.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-volt">{i + 1}.</span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <p className="flex items-start gap-1.5 rounded-md bg-panel2 p-2">
                    <Wind size={13} className="mt-0.5 shrink-0 text-ice" />
                    <span>{exercise.breathing}</span>
                  </p>
                </div>
              )}

              {tab === "cues" && (
                <ul className="space-y-2 text-xs leading-relaxed text-muted">
                  {exercise.cues.map((c, i) => (
                    <li key={i} className="flex gap-2 rounded-md bg-panel2 p-2">
                      <Megaphone size={13} className="mt-0.5 shrink-0 text-volt" />
                      {c}
                    </li>
                  ))}
                </ul>
              )}

              {tab === "mistakes" && (
                <div className="space-y-2">
                  <ul className="space-y-2 text-xs leading-relaxed text-muted">
                    {exercise.mistakes.map((m, i) => (
                      <li key={i} className="flex gap-2 rounded-md bg-danger/8 p-2">
                        <AlertTriangle size={13} className="mt-0.5 shrink-0 text-danger" />
                        {m}
                      </li>
                    ))}
                  </ul>
                  {exercise.safety?.map((s, i) => (
                    <p
                      key={i}
                      className="flex gap-2 rounded-md border border-warn/25 bg-warn/8 p-2 text-xs text-muted"
                    >
                      <ShieldAlert size={13} className="mt-0.5 shrink-0 text-warn" />
                      {s}
                    </p>
                  ))}
                </div>
              )}

              {tab === "swap" && (
                <div className="space-y-2">
                  <p className="text-[11px] text-faint">
                    Same training slot — pick whichever your gym has free.
                  </p>
                  {subs.map((s) => (
                    <Link
                      key={s.id}
                      href={`/exercises/${s.id}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-line bg-panel2 p-2 text-xs transition hover:border-volt"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-ink">{s.name}</span>
                        <span className="text-[10px] text-faint">
                          {s.equipment.slice(0, 2).join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-[10px] text-faint tnum">{s.rating}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 border-t border-line pt-3">
            <MuscleMap data={exercise.activation} compact />
          </div>
        </div>
      )}
    </div>
  );
}
