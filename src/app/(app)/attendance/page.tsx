"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Home,
  Plane,
  Snowflake,
  Thermometer,
  TreePine,
  Trophy,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Pill, Progress, Ring, Stat } from "@/components/ui/feedback";
import { Segmented } from "@/components/ui/form";
import { AttendanceHeatmap, type HeatCell } from "@/components/charts";
import { useData } from "@/lib/store/data-context";
import { getProgram } from "@/lib/data/programs";
import { adherence } from "@/lib/fitness";
import {
  DAY_SHORT,
  DAY_KEYS,
  type AttendanceStatus,
} from "@/lib/types";
import { cn, dayKeyOf, formatDateLong, relativeDay, toISODate } from "@/lib/utils";

const STATUS_META: Record<
  AttendanceStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  trained: { label: "Trained", color: "var(--c-volt)", icon: <Check size={13} /> },
  "active-recovery": {
    label: "Active recovery",
    color: "var(--c-ice)",
    icon: <TreePine size={13} />,
  },
  rest: { label: "Planned rest", color: "var(--c-panel-3)", icon: <Snowflake size={13} /> },
  missed: { label: "Missed", color: "var(--c-danger)", icon: <X size={13} /> },
  sick: { label: "Sick", color: "var(--c-warn)", icon: <Thermometer size={13} /> },
  travel: { label: "Travelling", color: "var(--c-violet)", icon: <Plane size={13} /> },
};

export default function AttendancePage() {
  const { data, checkIn, undoCheckIn } = useData();
  const [monthOffset, setMonthOffset] = useState(0);
  const [location, setLocation] = useState<"gym" | "home" | "outdoor" | "other">("gym");

  const view = useMemo(() => {
    if (!data) return null;
    const byDate = new Map(data.attendance.map((a) => [a.date, a]));
    const today = toISODate();
    const program = getProgram(data.profile.programId);

    const cursor = new Date();
    cursor.setDate(1);
    cursor.setMonth(cursor.getMonth() + monthOffset);
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leading = (first.getDay() + 6) % 7; // Monday-first

    const cells: (null | { iso: string; day: number })[] = [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => ({
        iso: toISODate(new Date(year, month, i + 1)),
        day: i + 1,
      })),
    ];

    const monthRecords = data.attendance.filter(
      (a) => a.date.startsWith(`${year}-${`${month + 1}`.padStart(2, "0")}`),
    );

    const heat: HeatCell[] = data.attendance.map((a) => ({
      date: a.date,
      status:
        a.status === "sick" || a.status === "travel"
          ? "rest"
          : (a.status as HeatCell["status"]),
      title: a.sessionId
        ? data.sessions.find((s) => s.id === a.sessionId)?.title
        : STATUS_META[a.status].label,
    }));

    return {
      byDate,
      today,
      todayRecord: byDate.get(today),
      program,
      monthLabel: cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      cells,
      monthRecords,
      heat,
      adherence4: adherence(data.attendance, data.profile.trainingDays, 4),
      adherence12: adherence(data.attendance, data.profile.trainingDays, 12),
    };
  }, [data, monthOffset]);

  if (!data || !view) return null;

  const todayPlan = view.program.days[dayKeyOf()];
  const trainedTotal = data.attendance.filter((a) => a.status === "trained").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Attendance & streaks"
        subtitle="Check in every day you train. Rest days are part of the plan and never break your streak — only skipping a scheduled session does."
      />

      {/* ------------------------------------------------------- streak */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card glow={data.streak.current > 0}>
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <Ring
              value={Math.min(100, (data.streak.current / Math.max(7, data.streak.longest)) * 100)}
              label={`${data.streak.current}`}
              sub="streak"
              tone="var(--c-ember)"
              size={96}
              stroke={8}
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-xl font-bold">
                {data.streak.current === 0
                  ? "Start a new streak today"
                  : `${data.streak.current} sessions in a row`}
              </h2>
              <p className="mt-1 text-sm text-muted">
                Longest ever: {data.streak.longest}. Weekly streak:{" "}
                {data.streak.weeklyStreak} week{data.streak.weeklyStreak === 1 ? "" : "s"}.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Pill tone="ember">
                  <Flame size={11} /> {data.streak.current} current
                </Pill>
                <Pill tone="violet">
                  <Trophy size={11} /> {data.streak.longest} best
                </Pill>
                <Pill tone="ice">
                  <Snowflake size={11} /> {data.streak.freezesAvailable} freezes
                </Pill>
              </div>
              <NextMilestone current={data.streak.current} />
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title={`Check in — ${formatDateLong(view.today)}`}
            subtitle={
              view.todayRecord
                ? `Logged as: ${STATUS_META[view.todayRecord.status].label}`
                : `Scheduled: ${todayPlan.title}`
            }
            icon={<CalendarDays size={15} />}
          />
          <CardBody className="space-y-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(STATUS_META) as AttendanceStatus[])
                .filter((s) => s !== "missed")
                .map((status) => {
                  const active = view.todayRecord?.status === status;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => checkIn(status, { location })}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition",
                        active
                          ? "border-volt bg-volt/15 text-volt"
                          : "border-line bg-panel2 text-muted hover:border-line-strong hover:text-ink",
                      )}
                    >
                      <span style={{ color: active ? undefined : STATUS_META[status].color }}>
                        {STATUS_META[status].icon}
                      </span>
                      {STATUS_META[status].label}
                    </button>
                  );
                })}
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-faint">
                Where
              </p>
              <Segmented
                value={location}
                onChange={setLocation}
                size="sm"
                options={[
                  { value: "gym", label: <span className="flex items-center gap-1"><Building2 size={11} /> Gym</span> },
                  { value: "home", label: <span className="flex items-center gap-1"><Home size={11} /> Home</span> },
                  { value: "outdoor", label: "Outdoor" },
                  { value: "other", label: "Other" },
                ]}
              />
            </div>

            {view.todayRecord && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => undoCheckIn(view.today)}
                icon={<X size={13} />}
              >
                Undo today&apos;s check-in
              </Button>
            )}
          </CardBody>
        </Card>
      </div>

      {/* -------------------------------------------------------- stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="4-week adherence"
          value={`${view.adherence4}%`}
          sub={`of ${data.profile.trainingDays.length} days/week`}
          icon={<Check size={15} />}
        />
        <Stat
          label="12-week adherence"
          value={`${view.adherence12}%`}
          sub="the number that actually matters"
          icon={<CalendarDays size={15} />}
          tone="ice"
        />
        <Stat
          label="Sessions logged"
          value={trainedTotal}
          sub="all time"
          icon={<Flame size={15} />}
          tone="ember"
        />
        <Stat
          label="Days tracked"
          value={data.attendance.length}
          sub="including rest days"
          icon={<CalendarDays size={15} />}
          tone="violet"
        />
      </div>

      {/* ------------------------------------------------------ calendar */}
      <Card>
        <CardHeader
          title={view.monthLabel}
          subtitle="Tap any past day to correct its status."
          action={
            <div className="flex gap-1">
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setMonthOffset((m) => m - 1)}
                aria-label="Previous month"
              >
                <ChevronLeft size={15} />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setMonthOffset(0)}
                aria-label="This month"
              >
                <CalendarDays size={15} />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setMonthOffset((m) => m + 1)}
                aria-label="Next month"
              >
                <ChevronRight size={15} />
              </Button>
            </div>
          }
        />
        <CardBody>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_KEYS.map((d) => (
              <div
                key={d}
                className="pb-1 text-center text-[10px] font-semibold uppercase tracking-wider text-faint"
              >
                {DAY_SHORT[d]}
              </div>
            ))}
            {view.cells.map((cell, i) => {
              if (!cell) return <div key={`pad-${i}`} />;
              const record = view.byDate.get(cell.iso);
              const isToday = cell.iso === view.today;
              const future = cell.iso > view.today;
              const planned = view.program.days[dayKeyOf(cell.iso)];
              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={future}
                  onClick={() => {
                    // Cycle: trained → rest → missed → clear
                    const order: AttendanceStatus[] = ["trained", "rest", "missed"];
                    const current = record?.status;
                    const idx = current ? order.indexOf(current) : -1;
                    if (idx === order.length - 1) undoCheckIn(cell.iso);
                    else
                      checkIn(order[idx + 1] ?? "trained", {
                        date: cell.iso,
                        dayKey: dayKeyOf(cell.iso),
                      });
                  }}
                  title={`${cell.iso} — ${planned.title}${record ? ` · ${STATUS_META[record.status].label}` : ""}`}
                  className={cn(
                    "relative h-12 rounded-lg border text-xs transition sm:h-16",
                    future
                      ? "cursor-not-allowed border-line/50 text-faint/50"
                      : "border-line hover:border-volt",
                    isToday && "ring-1 ring-volt",
                  )}
                  style={
                    record
                      ? {
                          background: `color-mix(in oklab, ${STATUS_META[record.status].color} 22%, transparent)`,
                          borderColor: STATUS_META[record.status].color,
                        }
                      : undefined
                  }
                >
                  <span className="absolute left-1.5 top-1 text-[10px] tnum">{cell.day}</span>
                  {record && (
                    <span
                      className="absolute bottom-1.5 right-1.5"
                      style={{ color: STATUS_META[record.status].color }}
                    >
                      {STATUS_META[record.status].icon}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 text-[10px] text-faint">
            {(Object.keys(STATUS_META) as AttendanceStatus[]).map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <i
                  className="h-2.5 w-2.5 rounded-[3px]"
                  style={{ background: STATUS_META[s].color }}
                />
                {STATUS_META[s].label}
              </span>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* ------------------------------------------------------- heatmap */}
      <Card>
        <CardHeader
          title="The last six months"
          subtitle="One square per day. Consistency is visible from across the room."
        />
        <CardBody>
          <AttendanceHeatmap cells={view.heat} weeks={26} />
        </CardBody>
      </Card>

      {/* -------------------------------------------------------- recent */}
      <Card>
        <CardHeader title="Recent check-ins" />
        <CardBody>
          {data.attendance.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Nothing logged yet. Check in above to start your streak.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {[...data.attendance]
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .slice(0, 10)
                .map((a) => {
                  const session = a.sessionId
                    ? data.sessions.find((s) => s.id === a.sessionId)
                    : undefined;
                  return (
                    <li key={a.date} className="flex items-center gap-3 py-2.5">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{
                          background: `color-mix(in oklab, ${STATUS_META[a.status].color} 18%, transparent)`,
                          color: STATUS_META[a.status].color,
                        }}
                      >
                        {STATUS_META[a.status].icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">
                          {session?.title ?? STATUS_META[a.status].label}
                        </p>
                        <p className="text-[11px] text-faint">
                          {relativeDay(a.date)}
                          {a.location ? ` · ${a.location}` : ""}
                        </p>
                      </div>
                      {session && (
                        <span className="text-xs text-muted tnum">
                          {session.totalSets} sets
                        </span>
                      )}
                    </li>
                  );
                })}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

const MILESTONES = [3, 7, 14, 21, 30, 50, 75, 100, 150, 200, 365];

/** Progress toward the next streak milestone — a reason to show up tomorrow. */
function NextMilestone({ current }: { current: number }) {
  const next = MILESTONES.find((m) => m > current) ?? current + 50;
  const previous = [...MILESTONES].reverse().find((m) => m <= current) ?? 0;
  const left = next - current;
  return (
    <div className="mt-4 max-w-md">
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="text-muted">Next milestone: {next} sessions</span>
        <span className="font-medium text-ink tnum">
          {left} to go
        </span>
      </div>
      <Progress value={current - previous} max={next - previous} tone="ember" />
    </div>
  );
}
