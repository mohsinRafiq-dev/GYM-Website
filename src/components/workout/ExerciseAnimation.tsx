"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Gauge } from "lucide-react";
import type { MovementPattern } from "@/lib/types";
import { parseTempo, patternFor, type EnvKind, type PropKind } from "@/lib/animation/patterns";
import { easeInOut, lerpPose, solve, STAGE, type Pose, type Skeleton } from "@/lib/animation/rig";
import { cn } from "@/lib/utils";

interface Props {
  pattern: MovementPattern;
  tempo?: string;
  className?: string;
  showControls?: boolean;
  showCaption?: boolean;
  autoPlay?: boolean;
  /** Rendering scale hint — "sm" is used in list rows. */
  size?: "sm" | "md" | "lg";
}

type PhaseName = "Eccentric" | "Stretch" | "Concentric" | "Squeeze";

export function ExerciseAnimation({
  pattern,
  tempo = "3-1-1-0",
  className,
  showControls = true,
  showCaption = true,
  autoPlay = true,
  size = "md",
}: Props) {
  const spec = patternFor(pattern);
  const timing = useMemo(() => parseTempo(tempo), [tempo]);

  const [playing, setPlaying] = useState(autoPlay);
  const [speed, setSpeed] = useState(1);
  const [t, setT] = useState(0); // seconds into the rep cycle
  const raf = useRef<number | null>(null);
  const last = useRef<number>(0);

  const cycle =
    timing.eccentric + timing.pauseBottom + timing.concentric + timing.pauseTop;

  useEffect(() => {
    // Reading the OS motion preference is a subscription to an external store,
    // which is exactly the case this effect exists for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing) {
      last.current = 0;
      return;
    }
    const step = (now: number) => {
      if (!last.current) last.current = now;
      const dt = ((now - last.current) / 1000) * speed;
      last.current = now;
      setT((prev) => (prev + dt) % cycle);
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
      last.current = 0;
    };
  }, [playing, speed, cycle]);

  /** Resolve the cycle clock into a blend factor and a phase label. */
  const { blend, phase } = useMemo(() => {
    const eccFirst = spec.firstPhase === "eccentric";
    const first = eccFirst ? timing.eccentric : timing.concentric;
    const holdEnd = eccFirst ? timing.pauseBottom : timing.pauseTop;
    const second = eccFirst ? timing.concentric : timing.eccentric;

    if (t < first) {
      return {
        blend: easeInOut(t / first),
        phase: (eccFirst ? "Eccentric" : "Concentric") as PhaseName,
      };
    }
    if (t < first + holdEnd) {
      return { blend: 1, phase: (eccFirst ? "Stretch" : "Squeeze") as PhaseName };
    }
    if (t < first + holdEnd + second) {
      return {
        blend: 1 - easeInOut((t - first - holdEnd) / second),
        phase: (eccFirst ? "Concentric" : "Eccentric") as PhaseName,
      };
    }
    return { blend: 0, phase: (eccFirst ? "Squeeze" : "Stretch") as PhaseName };
  }, [t, spec.firstPhase, timing]);

  const pose: Pose = useMemo(() => lerpPose(spec.a, spec.b, blend), [spec, blend]);
  const skel = useMemo(() => {
    const raw = solve(pose, spec.view);
    return anchorSkeleton(raw, spec.anchor);
  }, [pose, spec.view, spec.anchor]);

  const reset = useCallback(() => setT(0), []);

  const heights = { sm: "h-40", md: "h-64", lg: "h-80" };
  const behindFigure = spec.prop === "barbell-back" && spec.view === "side";
  const caption = blend > 0.5 ? spec.labelB : spec.labelA;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-lg border border-line bg-bg2",
          heights[size],
        )}
      >
        <svg
          viewBox={`0 0 ${STAGE.width} ${STAGE.height}`}
          className="h-full w-full"
          role="img"
          aria-label={`Animated demonstration: ${spec.labelA} to ${spec.labelB}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="ip-fig" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--c-volt)" />
              <stop offset="100%" stopColor="var(--c-volt-dim)" />
            </linearGradient>
          </defs>

          <Environment env={spec.env} skel={skel} />
          {behindFigure && <Equipment prop={spec.prop} skel={skel} view={spec.view} />}
          <Figure skel={skel} />
          {!behindFigure && <Equipment prop={spec.prop} skel={skel} view={spec.view} />}
        </svg>

        <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
              phase === "Concentric"
                ? "bg-volt/20 text-volt"
                : phase === "Eccentric"
                  ? "bg-ice/20 text-ice"
                  : "bg-panel3 text-muted",
            )}
          >
            {phase}
          </span>
          <span className="rounded-full bg-panel3/80 px-2 py-0.5 text-[10px] text-faint">
            {spec.view === "side" ? "Side view" : "Front view"}
          </span>
        </div>
      </div>

      {showCaption && (
        <p className="text-xs text-muted">
          <span className="font-medium text-ink">{caption}.</span> {spec.focus}
        </p>
      )}

      {showControls && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((v) => !v)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-panel2 text-ink transition hover:border-volt hover:text-volt"
            aria-label={playing ? "Pause animation" : "Play animation"}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-panel2 text-muted transition hover:border-volt hover:text-volt"
            aria-label="Restart animation"
          >
            <RotateCcw size={14} />
          </button>

          <input
            type="range"
            min={0}
            max={cycle}
            step={0.01}
            value={t}
            onChange={(e) => {
              setPlaying(false);
              setT(Number(e.target.value));
            }}
            className="h-1 flex-1 cursor-pointer appearance-none rounded-full bg-panel3"
            aria-label="Scrub through the movement"
          />

          <button
            type="button"
            onClick={() => setSpeed((s) => (s === 1 ? 0.5 : s === 0.5 ? 1.5 : 1))}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-panel2 px-2 text-[11px] text-muted transition hover:border-volt hover:text-volt tnum"
            aria-label="Change playback speed"
          >
            <Gauge size={12} />
            {speed}x
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ drawing ---- */

function anchorSkeleton(s: Skeleton, anchor: "feet" | "hands" | "none"): Skeleton {
  let dx = 0;
  let dy = 0;
  if (anchor === "feet") {
    const lowest = Math.max(s.ankleL.y, s.ankleR.y, s.toeL.y, s.toeR.y);
    dy = STAGE.floorY - lowest;
    dx = 100 - (s.ankleL.x + s.ankleR.x) / 2;
  } else if (anchor === "hands") {
    dx = 100 - s.grip.x;
    dy = 30 - s.grip.y;
  }
  if (!dx && !dy) return s;
  const move = (p: { x: number; y: number }) => ({ x: p.x + dx, y: p.y + dy });
  return {
    pelvis: move(s.pelvis),
    hipL: move(s.hipL),
    hipR: move(s.hipR),
    chest: move(s.chest),
    shoulderL: move(s.shoulderL),
    shoulderR: move(s.shoulderR),
    neck: move(s.neck),
    head: move(s.head),
    elbowL: move(s.elbowL),
    elbowR: move(s.elbowR),
    handL: move(s.handL),
    handR: move(s.handR),
    kneeL: move(s.kneeL),
    kneeR: move(s.kneeR),
    ankleL: move(s.ankleL),
    ankleR: move(s.ankleR),
    toeL: move(s.toeL),
    toeR: move(s.toeR),
    grip: move(s.grip),
  };
}

function Bone({
  a,
  b,
  width = 9,
  className,
  opacity = 1,
}: {
  a: { x: number; y: number };
  b: { x: number; y: number };
  width?: number;
  className?: string;
  opacity?: number;
}) {
  return (
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      strokeWidth={width}
      strokeLinecap="round"
      stroke={className ? undefined : "url(#ip-fig)"}
      className={className}
      opacity={opacity}
    />
  );
}

function Figure({ skel: s }: { skel: Skeleton }) {
  const far = "stroke-line-strong";
  return (
    <g>
      {/* far side, drawn behind and dimmer for depth */}
      <Bone a={s.hipL} b={s.kneeL} className={far} opacity={0.55} />
      <Bone a={s.kneeL} b={s.ankleL} className={far} width={8} opacity={0.55} />
      <Bone a={s.ankleL} b={s.toeL} className={far} width={6} opacity={0.55} />
      <Bone a={s.shoulderL} b={s.elbowL} className={far} width={8} opacity={0.55} />
      <Bone a={s.elbowL} b={s.handL} className={far} width={7} opacity={0.55} />

      {/* torso */}
      <polygon
        points={`${s.shoulderL.x},${s.shoulderL.y} ${s.shoulderR.x},${s.shoulderR.y} ${s.hipR.x},${s.hipR.y} ${s.hipL.x},${s.hipL.y}`}
        fill="var(--c-volt-dim)"
        fillOpacity={0.3}
        stroke="var(--c-volt-dim)"
        strokeOpacity={0.6}
        strokeWidth={11}
        strokeLinejoin="round"
      />

      {/* head */}
      <line
        x1={s.neck.x}
        y1={s.neck.y}
        x2={s.head.x}
        y2={s.head.y}
        strokeWidth={6}
        strokeLinecap="round"
        stroke="var(--c-volt-dim)"
        strokeOpacity={0.6}
      />
      <circle cx={s.head.x} cy={s.head.y} r={8.5} className="fill-panel3 stroke-volt" strokeWidth={2.5} />

      {/* near side */}
      <Bone a={s.hipR} b={s.kneeR} />
      <Bone a={s.kneeR} b={s.ankleR} width={8} />
      <Bone a={s.ankleR} b={s.toeR} width={6} />
      <Bone a={s.shoulderR} b={s.elbowR} width={8} />
      <Bone a={s.elbowR} b={s.handR} width={7} />

      {/* joints */}
      {[s.elbowR, s.kneeR, s.handR].map((j, i) => (
        <circle key={i} cx={j.x} cy={j.y} r={2.4} className="fill-bg" opacity={0.5} />
      ))}
    </g>
  );
}

function Environment({ env, skel: s }: { env: EnvKind[]; skel: Skeleton }) {
  const floorY = STAGE.floorY;
  return (
    <g>
      {env.includes("floor") && (
        <g>
          <line
            x1={6}
            y1={floorY + 4}
            x2={STAGE.width - 6}
            y2={floorY + 4}
            className="stroke-line-strong"
            strokeWidth={2}
          />
          {Array.from({ length: 12 }).map((_, i) => (
            <line
              key={i}
              x1={10 + i * 16}
              y1={floorY + 5}
              x2={4 + i * 16}
              y2={floorY + 12}
              className="stroke-line"
              strokeWidth={1.5}
              opacity={0.6}
            />
          ))}
        </g>
      )}

      {env.includes("flat-bench") && (
        <g>
          <rect
            x={s.pelvis.x - 58}
            y={s.pelvis.y + 8}
            width={92}
            height={9}
            rx={3}
            className="fill-panel3 stroke-line-strong"
            strokeWidth={1.5}
          />
          <rect x={s.pelvis.x - 50} y={s.pelvis.y + 17} width={6} height={floorY - s.pelvis.y - 13} className="fill-line-strong" />
          <rect x={s.pelvis.x + 22} y={s.pelvis.y + 17} width={6} height={floorY - s.pelvis.y - 13} className="fill-line-strong" />
        </g>
      )}

      {env.includes("thrust-bench") && (
        <rect
          x={s.shoulderR.x - 34}
          y={s.shoulderR.y + 6}
          width={40}
          height={floorY - s.shoulderR.y - 2}
          rx={3}
          className="fill-panel3 stroke-line-strong"
          strokeWidth={1.5}
        />
      )}

      {(env.includes("seat") || env.includes("leg-machine")) && (
        <g>
          <rect
            x={s.pelvis.x - 26}
            y={s.pelvis.y + 8}
            width={52}
            height={9}
            rx={3}
            className="fill-panel3 stroke-line-strong"
            strokeWidth={1.5}
          />
          <rect
            x={s.pelvis.x - 30}
            y={s.pelvis.y - 34}
            width={9}
            height={44}
            rx={3}
            className="fill-panel3 stroke-line-strong"
            strokeWidth={1.5}
          />
          <rect x={s.pelvis.x - 6} y={s.pelvis.y + 17} width={7} height={floorY - s.pelvis.y - 13} className="fill-line-strong" />
        </g>
      )}

      {env.includes("pullup-bar") && (
        <g>
          <line x1={40} y1={26} x2={160} y2={26} className="stroke-line-strong" strokeWidth={5} strokeLinecap="round" />
          <line x1={44} y1={26} x2={44} y2={6} className="stroke-line-strong" strokeWidth={4} />
          <line x1={156} y1={26} x2={156} y2={6} className="stroke-line-strong" strokeWidth={4} />
        </g>
      )}

      {env.includes("dip-bars") && (
        <g>
          <line x1={s.handR.x - 34} y1={s.handR.y} x2={s.handR.x + 30} y2={s.handR.y} className="stroke-line-strong" strokeWidth={5} strokeLinecap="round" />
          <line x1={s.handR.x + 26} y1={s.handR.y} x2={s.handR.x + 26} y2={floorY} className="stroke-line-strong" strokeWidth={4} />
        </g>
      )}

      {env.includes("cable-tower") && (
        <g>
          <line x1={100} y1={4} x2={100} y2={12} className="stroke-line-strong" strokeWidth={4} />
          <circle cx={100} cy={14} r={5} className="fill-panel3 stroke-line-strong" strokeWidth={2} />
        </g>
      )}

      {env.includes("step") && (
        <rect
          x={s.toeR.x - 30}
          y={floorY - 6}
          width={54}
          height={10}
          rx={2}
          className="fill-panel3 stroke-line-strong"
          strokeWidth={1.5}
        />
      )}
    </g>
  );
}

function Equipment({
  prop,
  skel: s,
  view,
}: {
  prop: PropKind;
  skel: Skeleton;
  view: "side" | "front";
}) {
  const bar = (cx: number, cy: number, halfWidth: number) => (
    <g>
      <line
        x1={cx - halfWidth}
        y1={cy}
        x2={cx + halfWidth}
        y2={cy}
        className="stroke-ink"
        strokeWidth={4}
        strokeLinecap="round"
        opacity={0.85}
      />
      {[-1, 1].map((side) => (
        <rect
          key={side}
          x={cx + side * halfWidth - (side > 0 ? 0 : 7)}
          y={cy - 11}
          width={7}
          height={22}
          rx={2}
          className="fill-ember"
          opacity={0.9}
        />
      ))}
    </g>
  );

  const plateSide = (cx: number, cy: number) => (
    <g>
      <circle cx={cx} cy={cy} r={13} className="fill-panel3 stroke-ember" strokeWidth={3} />
      <circle cx={cx} cy={cy} r={3} className="fill-ember" />
    </g>
  );

  switch (prop) {
    case "barbell-grip":
      return view === "front" ? bar(s.grip.x, s.grip.y, 46) : plateSide(s.grip.x, s.grip.y);
    case "ez-bar":
      return view === "front" ? bar(s.grip.x, s.grip.y, 30) : plateSide(s.grip.x, s.grip.y);
    case "barbell-back": {
      // Side view: the bar rests on the traps, just behind the neck.
      const cx = (s.shoulderL.x + s.shoulderR.x) / 2 - (view === "side" ? 6 : 0);
      const cy = (s.shoulderL.y + s.shoulderR.y) / 2 - 2;
      return view === "front" ? bar(cx, cy, 48) : plateSide(cx, cy);
    }
    case "barbell-hips":
      return view === "front" ? bar(s.pelvis.x, s.pelvis.y, 44) : plateSide(s.pelvis.x, s.pelvis.y);
    case "dumbbells":
      return (
        <g>
          {[s.handR, s.handL].map((h, i) => (
            <g key={i} opacity={i === 1 ? 0.6 : 1}>
              <line x1={h.x - 8} y1={h.y} x2={h.x + 8} y2={h.y} className="stroke-ink" strokeWidth={3} />
              <rect x={h.x - 12} y={h.y - 6} width={5} height={12} rx={1.5} className="fill-ember" />
              <rect x={h.x + 7} y={h.y - 6} width={5} height={12} rx={1.5} className="fill-ember" />
            </g>
          ))}
        </g>
      );
    case "cable-high":
      return (
        <g>
          <line x1={100} y1={16} x2={s.grip.x} y2={s.grip.y} className="stroke-line-strong" strokeWidth={2} />
          <rect x={s.grip.x - 14} y={s.grip.y - 2.5} width={28} height={5} rx={2.5} className="fill-ink" opacity={0.8} />
        </g>
      );
    case "cable-low":
      return (
        <g>
          <line x1={100} y1={STAGE.floorY} x2={s.grip.x} y2={s.grip.y} className="stroke-line-strong" strokeWidth={2} />
          <rect x={s.grip.x - 12} y={s.grip.y - 2.5} width={24} height={5} rx={2.5} className="fill-ink" opacity={0.8} />
        </g>
      );
    case "cables-side":
      return (
        <g>
          <line x1={8} y1={44} x2={s.handL.x} y2={s.handL.y} className="stroke-line-strong" strokeWidth={2} />
          <line x1={192} y1={44} x2={s.handR.x} y2={s.handR.y} className="stroke-line-strong" strokeWidth={2} />
          {[s.handL, s.handR].map((h, i) => (
            <circle key={i} cx={h.x} cy={h.y} r={4} className="fill-ember" />
          ))}
        </g>
      );
    case "machine-handles":
      return (
        <g>
          {[s.handR, s.handL].map((h, i) => (
            <circle key={i} cx={h.x} cy={h.y} r={4} className="fill-line-strong" opacity={i ? 0.5 : 1} />
          ))}
        </g>
      );
    case "ball":
      return <circle cx={s.grip.x} cy={s.grip.y} r={10} className="fill-ember/30 stroke-ember" strokeWidth={2.5} />;
    default:
      return null;
  }
}
