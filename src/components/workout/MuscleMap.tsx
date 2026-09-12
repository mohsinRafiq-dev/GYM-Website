"use client";

import { useMemo } from "react";
import type { MuscleGroup } from "@/lib/types";
import { MUSCLE_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  /** Muscle → intensity, 0-1. Values above 1 are clamped. */
  data: Partial<Record<MuscleGroup, number>>;
  className?: string;
  view?: "front" | "back" | "both";
  showLegend?: boolean;
  compact?: boolean;
}

type Shape =
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number; rot?: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number; r?: number };

const FRONT: Partial<Record<MuscleGroup, Shape[]>> = {
  traps: [
    { kind: "ellipse", cx: 47, cy: 35, rx: 9, ry: 5, rot: -20 },
    { kind: "ellipse", cx: 73, cy: 35, rx: 9, ry: 5, rot: 20 },
  ],
  "front-delts": [
    { kind: "ellipse", cx: 34, cy: 47, rx: 9, ry: 9 },
    { kind: "ellipse", cx: 86, cy: 47, rx: 9, ry: 9 },
  ],
  "side-delts": [
    { kind: "ellipse", cx: 29, cy: 50, rx: 6, ry: 8 },
    { kind: "ellipse", cx: 91, cy: 50, rx: 6, ry: 8 },
  ],
  chest: [
    { kind: "ellipse", cx: 50, cy: 55, rx: 13, ry: 9 },
    { kind: "ellipse", cx: 70, cy: 55, rx: 13, ry: 9 },
  ],
  biceps: [
    { kind: "ellipse", cx: 27, cy: 74, rx: 6, ry: 13 },
    { kind: "ellipse", cx: 93, cy: 74, rx: 6, ry: 13 },
  ],
  forearms: [
    { kind: "ellipse", cx: 23, cy: 100, rx: 5.5, ry: 15 },
    { kind: "ellipse", cx: 97, cy: 100, rx: 5.5, ry: 15 },
  ],
  abs: [{ kind: "rect", x: 52, y: 66, w: 16, h: 38, r: 6 }],
  obliques: [
    { kind: "ellipse", cx: 45, cy: 84, rx: 5, ry: 15 },
    { kind: "ellipse", cx: 75, cy: 84, rx: 5, ry: 15 },
  ],
  adductors: [
    { kind: "ellipse", cx: 54, cy: 122, rx: 5, ry: 18 },
    { kind: "ellipse", cx: 66, cy: 122, rx: 5, ry: 18 },
  ],
  quads: [
    { kind: "ellipse", cx: 47, cy: 133, rx: 11, ry: 26 },
    { kind: "ellipse", cx: 73, cy: 133, rx: 11, ry: 26 },
  ],
  abductors: [
    { kind: "ellipse", cx: 36, cy: 116, rx: 5, ry: 11 },
    { kind: "ellipse", cx: 84, cy: 116, rx: 5, ry: 11 },
  ],
  calves: [
    { kind: "ellipse", cx: 48, cy: 182, rx: 7, ry: 16 },
    { kind: "ellipse", cx: 72, cy: 182, rx: 7, ry: 16 },
  ],
  neck: [{ kind: "rect", x: 54, y: 27, w: 12, h: 8, r: 3 }],
};

const BACK: Partial<Record<MuscleGroup, Shape[]>> = {
  traps: [
    { kind: "ellipse", cx: 60, cy: 44, rx: 20, ry: 13 },
    { kind: "ellipse", cx: 60, cy: 32, rx: 9, ry: 6 },
  ],
  "rear-delts": [
    { kind: "ellipse", cx: 32, cy: 48, rx: 9, ry: 9 },
    { kind: "ellipse", cx: 88, cy: 48, rx: 9, ry: 9 },
  ],
  "upper-back": [
    { kind: "ellipse", cx: 49, cy: 60, rx: 10, ry: 8 },
    { kind: "ellipse", cx: 71, cy: 60, rx: 10, ry: 8 },
  ],
  lats: [
    { kind: "ellipse", cx: 44, cy: 78, rx: 12, ry: 20, rot: 12 },
    { kind: "ellipse", cx: 76, cy: 78, rx: 12, ry: 20, rot: -12 },
  ],
  triceps: [
    { kind: "ellipse", cx: 27, cy: 74, rx: 6, ry: 14 },
    { kind: "ellipse", cx: 93, cy: 74, rx: 6, ry: 14 },
  ],
  forearms: [
    { kind: "ellipse", cx: 23, cy: 100, rx: 5.5, ry: 15 },
    { kind: "ellipse", cx: 97, cy: 100, rx: 5.5, ry: 15 },
  ],
  "lower-back": [{ kind: "ellipse", cx: 60, cy: 98, rx: 13, ry: 11 }],
  glutes: [
    { kind: "ellipse", cx: 50, cy: 118, rx: 12, ry: 12 },
    { kind: "ellipse", cx: 70, cy: 118, rx: 12, ry: 12 },
  ],
  hamstrings: [
    { kind: "ellipse", cx: 48, cy: 148, rx: 11, ry: 24 },
    { kind: "ellipse", cx: 72, cy: 148, rx: 11, ry: 24 },
  ],
  calves: [
    { kind: "ellipse", cx: 48, cy: 184, rx: 7.5, ry: 17 },
    { kind: "ellipse", cx: 72, cy: 184, rx: 7.5, ry: 17 },
  ],
};

/** Body outline shared by both views. */
function Silhouette() {
  return (
    <g className="fill-panel2 stroke-line" strokeWidth={1.2}>
      <circle cx={60} cy={17} r={11} />
      <rect x={53} y={26} width={14} height={9} rx={4} />
      <path d="M60 33 C 42 33, 30 40, 27 52 L 22 84 C 20 96, 18 106, 17 116 L 27 118 L 33 88 L 36 106 C 36 118, 38 128, 40 140 L 42 172 L 40 200 L 54 200 L 56 172 L 60 146 L 64 172 L 66 200 L 80 200 L 78 172 L 80 140 C 82 128, 84 118, 84 106 L 87 88 L 93 118 L 103 116 C 102 106, 100 96, 98 84 L 93 52 C 90 40, 78 33, 60 33 Z" />
    </g>
  );
}

function intensityColor(v: number): { fill: string; opacity: number } {
  if (v <= 0) return { fill: "var(--c-panel-3)", opacity: 0.9 };
  if (v < 0.34) return { fill: "var(--c-ice)", opacity: 0.35 + v };
  if (v < 0.7) return { fill: "var(--c-volt)", opacity: 0.45 + v * 0.4 };
  return { fill: "var(--c-ember)", opacity: 0.6 + v * 0.35 };
}

function Region({
  muscle,
  shapes,
  value,
}: {
  muscle: MuscleGroup;
  shapes: Shape[];
  value: number;
}) {
  const { fill, opacity } = intensityColor(value);
  return (
    <g>
      <title>{`${MUSCLE_LABELS[muscle]}${value > 0 ? ` — ${Math.round(value * 100)}%` : " — not targeted"}`}</title>
      {shapes.map((s, i) =>
        s.kind === "ellipse" ? (
          <ellipse
            key={i}
            cx={s.cx}
            cy={s.cy}
            rx={s.rx}
            ry={s.ry}
            fill={fill}
            opacity={opacity}
            transform={s.rot ? `rotate(${s.rot} ${s.cx} ${s.cy})` : undefined}
          />
        ) : (
          <rect
            key={i}
            x={s.x}
            y={s.y}
            width={s.w}
            height={s.h}
            rx={s.r ?? 3}
            fill={fill}
            opacity={opacity}
          />
        ),
      )}
    </g>
  );
}

export function MuscleMap({
  data,
  className,
  view = "both",
  showLegend = true,
  compact = false,
}: Props) {
  const norm = useMemo(() => {
    const max = Math.max(1, ...Object.values(data).map((v) => v ?? 0));
    const out: Partial<Record<MuscleGroup, number>> = {};
    for (const [k, v] of Object.entries(data)) {
      out[k as MuscleGroup] = Math.min(1, (v ?? 0) / max);
    }
    return out;
  }, [data]);

  const views: ("front" | "back")[] =
    view === "both" ? ["front", "back"] : [view];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className={cn("flex items-start justify-center", compact ? "gap-2" : "gap-4")}>
        {views.map((v) => {
          const map = v === "front" ? FRONT : BACK;
          return (
            <figure key={v} className="flex flex-1 flex-col items-center gap-1">
              <svg viewBox="0 0 120 210" className="w-full max-w-[150px]" role="img" aria-label={`${v} view muscle activation`}>
                <Silhouette />
                {Object.entries(map).map(([muscle, shapes]) => (
                  <Region
                    key={muscle}
                    muscle={muscle as MuscleGroup}
                    shapes={shapes as Shape[]}
                    value={norm[muscle as MuscleGroup] ?? 0}
                  />
                ))}
              </svg>
              <figcaption className="text-[10px] uppercase tracking-widest text-faint">
                {v}
              </figcaption>
            </figure>
          );
        })}
      </div>

      {showLegend && (
        <div className="flex items-center justify-center gap-3 text-[10px] text-faint">
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-4 rounded-full" style={{ background: "var(--c-panel-3)" }} />
            None
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-4 rounded-full" style={{ background: "var(--c-ice)" }} />
            Secondary
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-4 rounded-full" style={{ background: "var(--c-volt)" }} />
            Primary
          </span>
          <span className="flex items-center gap-1.5">
            <i className="h-2 w-4 rounded-full" style={{ background: "var(--c-ember)" }} />
            Heavy
          </span>
        </div>
      )}
    </div>
  );
}
