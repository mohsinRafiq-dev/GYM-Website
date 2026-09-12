"use client";

import type { ReactNode } from "react";
import { cn, clamp, initials, hueFromString } from "@/lib/utils";

export function Pill({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "volt" | "ember" | "ice" | "violet" | "ok" | "warn" | "danger";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-panel3 text-muted border-line",
    volt: "bg-volt/15 text-volt border-volt/30",
    ember: "bg-ember/15 text-ember border-ember/30",
    ice: "bg-ice/15 text-ice border-ice/30",
    violet: "bg-violet/15 text-violet border-violet/30",
    ok: "bg-ok/15 text-ok border-ok/30",
    warn: "bg-warn/15 text-warn border-warn/30",
    danger: "bg-danger/15 text-danger border-danger/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Progress({
  value,
  max = 100,
  className,
  tone = "volt",
  height = 6,
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: "volt" | "ember" | "ice" | "ok" | "danger";
  height?: number;
}) {
  const pct = clamp((value / (max || 1)) * 100, 0, 100);
  const colors: Record<string, string> = {
    volt: "bg-volt",
    ember: "bg-ember",
    ice: "bg-ice",
    ok: "bg-ok",
    danger: "bg-danger",
  };
  return (
    <div
      className={cn("w-full overflow-hidden rounded-full bg-panel3", className)}
      style={{ height }}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500", colors[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Ring({
  value,
  max = 100,
  size = 76,
  stroke = 7,
  label,
  sub,
  tone = "var(--c-volt)",
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  sub?: ReactNode;
  tone?: string;
}) {
  const pct = clamp((value / (max || 1)) * 100, 0, 100);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-panel-3)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-sm font-bold text-ink tnum">{label}</span>
        {sub && <span className="text-[9px] uppercase tracking-wider text-faint">{sub}</span>}
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon,
  tone = "volt",
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  icon?: ReactNode;
  tone?: "volt" | "ember" | "ice" | "violet";
  className?: string;
}) {
  const tones: Record<string, string> = {
    volt: "text-volt",
    ember: "text-ember",
    ice: "text-ice",
    violet: "text-violet",
  };
  return (
    <div className={cn("card p-3.5", className)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-faint">
          {label}
        </span>
        {icon && <span className={tones[tone]}>{icon}</span>}
      </div>
      <div className="mt-1.5 font-display text-2xl font-bold tracking-tight text-ink tnum">
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line px-6 py-12 text-center",
        className,
      )}
    >
      {icon && <div className="text-faint">{icon}</div>}
      <div>
        <p className="font-display text-sm font-semibold text-ink">{title}</p>
        {description && <p className="mt-1 max-w-sm text-xs text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-lg", className)} />;
}

export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}) {
  const hue = hueFromString(name);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={cn("rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 45) % 360} 70% 35%))`,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
