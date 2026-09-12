"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MuscleGroup } from "@/lib/types";
import { MUSCLE_LABELS } from "@/lib/types";
import { VOLUME_LANDMARKS, judgeVolume, type VolumeVerdict } from "@/lib/fitness";
import { compact, cn } from "@/lib/utils";

const AXIS = {
  stroke: "var(--c-faint)",
  fontSize: 10,
  tickLine: false,
  axisLine: false,
} as const;

function TooltipCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string; color?: string }[];
}) {
  return (
    <div className="rounded-lg border border-line bg-panel px-2.5 py-2 shadow-(--shadow-pop)">
      <p className="text-[10px] uppercase tracking-wider text-faint">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="mt-1 flex items-center gap-1.5 text-xs text-ink">
          {r.color && (
            <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
          )}
          <span className="text-muted">{r.label}</span>
          <span className="ml-auto font-semibold tnum">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

/* ------------------------------------------------------- trend (1 series) */

export function TrendChart({
  data,
  unit = "",
  height = 200,
  tone = "var(--c-volt)",
  kind = "area",
  seriesLabel = "Value",
  decimals = 0,
}: {
  data: { label: string; value: number }[];
  unit?: string;
  height?: number;
  tone?: string;
  kind?: "area" | "line";
  seriesLabel?: string;
  decimals?: number;
}) {
  const fmt = (v: number) =>
    `${decimals ? v.toFixed(decimals) : compact(v)}${unit ? ` ${unit}` : ""}`;

  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-line text-xs text-faint"
        style={{ height }}
      >
        Not enough data yet — log a couple more sessions.
      </div>
    );
  }

  const Chart = kind === "area" ? AreaChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id="ip-trend" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tone} stopOpacity={0.35} />
            <stop offset="100%" stopColor={tone} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
        <XAxis dataKey="label" {...AXIS} minTickGap={24} />
        {/* Area charts encode magnitude, so they keep a zero baseline. Line
            charts encode change, so they zoom to the data (a 74→77 kg
            bodyweight trend is invisible on a 0-80 axis). */}
        <YAxis
          {...AXIS}
          width={44}
          allowDecimals={false}
          domain={
            kind === "line"
              ? [(min: number) => Math.floor(min * 0.97), (max: number) => Math.ceil(max * 1.02)]
              : [0, "auto"]
          }
          tickFormatter={(v: number) => compact(v)}
        />
        <Tooltip
          cursor={{ stroke: "var(--c-border-strong)", strokeWidth: 1 }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TooltipCard
                title={String(label)}
                rows={[
                  {
                    label: seriesLabel,
                    value: fmt(Number(payload[0].value)),
                    color: tone,
                  },
                ]}
              />
            ) : null
          }
        />
        {kind === "area" ? (
          <Area
            type="monotone"
            dataKey="value"
            stroke={tone}
            strokeWidth={2}
            fill="url(#ip-trend)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--c-panel)" }}
          />
        ) : (
          <Line
            type="monotone"
            dataKey="value"
            stroke={tone}
            strokeWidth={2}
            dot={{ r: 2.5, strokeWidth: 0, fill: tone }}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--c-panel)" }}
          />
        )}
      </Chart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------- weekly volume balance */

const VERDICT_COLOR: Record<VolumeVerdict, string> = {
  none: "var(--c-panel-3)",
  under: "var(--c-warn)",
  optimal: "var(--c-success)",
  high: "var(--c-ice)",
  over: "var(--c-danger)",
};

const VERDICT_LABEL: Record<VolumeVerdict, string> = {
  none: "Untrained",
  under: "Below minimum",
  optimal: "Growth range",
  high: "High",
  over: "Over ceiling",
};

export function MuscleBalanceChart({
  sets,
  height = 320,
  limit = 12,
}: {
  sets: Partial<Record<MuscleGroup, number>>;
  height?: number;
  limit?: number;
}) {
  const rows = useMemo(() => {
    return (Object.keys(VOLUME_LANDMARKS) as MuscleGroup[])
      .map((m) => {
        const value = Math.round(sets[m] ?? 0);
        const l = VOLUME_LANDMARKS[m]!;
        return {
          muscle: m,
          name: MUSCLE_LABELS[m],
          value,
          mev: l.mev,
          mavHigh: l.mav[1],
          mrv: l.mrv,
          verdict: judgeVolume(m, value),
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  }, [sets, limit]);

  const max = Math.max(24, ...rows.map((r) => Math.max(r.value, r.mrv)));
  const present = Array.from(new Set(rows.map((r) => r.verdict)));

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={rows}
          layout="vertical"
          margin={{ top: 4, right: 16, bottom: 0, left: 4 }}
          barCategoryGap={6}
        >
          <CartesianGrid stroke="var(--viz-grid)" horizontal={false} />
          <XAxis type="number" domain={[0, max]} {...AXIS} />
          <YAxis
            type="category"
            dataKey="name"
            width={86}
            {...AXIS}
            tick={{ fill: "var(--c-muted)", fontSize: 10 }}
          />
          <Tooltip
            cursor={{ fill: "var(--c-panel-2)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload as (typeof rows)[number];
              return (
                <TooltipCard
                  title={r.name}
                  rows={[
                    { label: "This week", value: `${r.value} sets`, color: VERDICT_COLOR[r.verdict] },
                    { label: "Minimum effective", value: `${r.mev} sets` },
                    { label: "Growth range tops out", value: `${r.mavHigh} sets` },
                    { label: "Recoverable ceiling", value: `${r.mrv} sets` },
                    { label: "Verdict", value: VERDICT_LABEL[r.verdict] },
                  ]}
                />
              );
            }}
          />
          {/* The band where growth actually happens, drawn behind the bars. */}
          <ReferenceArea x1={0} x2={max} fill="transparent" />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={13} isAnimationActive={false}>
            {rows.map((r) => (
              <Cell key={r.muscle} fill={VERDICT_COLOR[r.verdict]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-faint">
        {present.map((v) => (
          <span key={v} className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full" style={{ background: VERDICT_COLOR[v] }} />
            {VERDICT_LABEL[v]}
          </span>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------- multi-series bars -- */

export function GroupedBars({
  data,
  series,
  height = 220,
  unit = "",
}: {
  data: Record<string, string | number>[];
  series: { key: string; label: string }[];
  height?: number;
  unit?: string;
}) {
  const colors = ["var(--viz-1)", "var(--viz-2)", "var(--viz-3)", "var(--viz-4)"];
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke="var(--viz-grid)" vertical={false} />
          <XAxis dataKey="label" {...AXIS} />
          <YAxis {...AXIS} width={40} tickFormatter={(v: number) => compact(v)} />
          <Tooltip
            cursor={{ fill: "var(--c-panel-2)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipCard
                  title={String(label)}
                  rows={payload.map((p, i) => ({
                    label: series[i]?.label ?? String(p.dataKey),
                    value: `${Math.round(Number(p.value))}${unit ? ` ${unit}` : ""}`,
                    color: colors[i % colors.length],
                  }))}
                />
              ) : null
            }
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              fill={colors[i % colors.length]}
              radius={[4, 4, 0, 0]}
              maxBarSize={26}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      {series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-faint">
          {series.map((s, i) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <i
                className="h-2 w-2 rounded-full"
                style={{ background: colors[i % colors.length] }}
              />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- heatmap -- */

export type HeatCell = {
  date: string;
  status: "trained" | "active-recovery" | "rest" | "missed" | "none";
  title?: string;
};

const HEAT_COLOR: Record<HeatCell["status"], string> = {
  trained: "var(--c-volt)",
  "active-recovery": "var(--c-ice)",
  rest: "var(--c-panel-3)",
  missed: "var(--c-danger)",
  none: "transparent",
};

const HEAT_LABEL: Record<HeatCell["status"], string> = {
  trained: "Trained",
  "active-recovery": "Active recovery",
  rest: "Planned rest",
  missed: "Missed",
  none: "No record",
};

export function AttendanceHeatmap({
  cells,
  weeks = 26,
  className,
}: {
  cells: HeatCell[];
  weeks?: number;
  className?: string;
}) {
  const byDate = useMemo(() => new Map(cells.map((c) => [c.date, c])), [cells]);

  // Build week columns ending on the current week, Monday-first rows.
  const columns = useMemo(() => {
    const out: { date: string; cell?: HeatCell }[][] = [];
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    for (let w = weeks - 1; w >= 0; w--) {
      const col: { date: string; cell?: HeatCell }[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() - w * 7 + d);
        const iso = `${day.getFullYear()}-${`${day.getMonth() + 1}`.padStart(2, "0")}-${`${day.getDate()}`.padStart(2, "0")}`;
        col.push({ date: iso, cell: byDate.get(iso) });
      }
      out.push(col);
    }
    return out;
  }, [byDate, weeks]);

  const present = Array.from(
    new Set(cells.map((c) => c.status).filter((s) => s !== "none")),
  );

  return (
    <div className={cn("w-full", className)}>
      <div className="scroll-thin overflow-x-auto pb-1">
        <div className="flex gap-[3px]">
          {columns.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {col.map(({ date, cell }) => {
                const status = cell?.status ?? "none";
                const future = date > new Date().toISOString().slice(0, 10);
                return (
                  <span
                    key={date}
                    title={`${date} — ${future ? "Upcoming" : HEAT_LABEL[status]}${cell?.title ? ` · ${cell.title}` : ""}`}
                    className="h-3 w-3 rounded-[3px] border"
                    style={{
                      background: future ? "transparent" : HEAT_COLOR[status],
                      opacity: status === "missed" ? 0.5 : 1,
                      borderColor:
                        status === "none" || future ? "var(--c-border)" : "transparent",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-faint">
        {present.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <i
              className="h-2.5 w-2.5 rounded-[3px]"
              style={{ background: HEAT_COLOR[s], opacity: s === "missed" ? 0.5 : 1 }}
            />
            {HEAT_LABEL[s]}
          </span>
        ))}
      </div>
    </div>
  );
}
