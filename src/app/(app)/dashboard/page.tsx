"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  ArrowRight,
  Bot,
  CalendarCheck,
  ChevronRight,
  Clock,
  Dumbbell,
  Flame,
  Info,
  Play,
  Timer,
  TrendingUp,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader, SectionTitle } from "@/components/ui/card";
import { Avatar, Pill, Progress, Ring, Stat } from "@/components/ui/feedback";
import { MuscleBalanceChart, TrendChart } from "@/components/charts";
import { MuscleMap } from "@/components/workout/MuscleMap";
import { useData } from "@/lib/store/data-context";
import { getProgram, dayActivation } from "@/lib/data/programs";
import { exerciseName } from "@/lib/data/exercises";
import { generateInsights } from "@/lib/coach";
import {
  levelFromXP,
  levelTitle,
  mesocycleWeek,
  setsByMuscle,
  totalVolume,
} from "@/lib/fitness";
import {
  compact,
  dayKeyOf,
  formatDuration,
  relativeDay,
  toISODate,
  weekRange,
} from "@/lib/utils";
import { DAY_LABELS } from "@/lib/types";

export default function DashboardPage() {
  const { data, team } = useData();

  const view = useMemo(() => {
    if (!data) return null;
    const program = getProgram(data.profile.programId);
    const todayKey = dayKeyOf();
    const today = program.days[todayKey];
    const done = data.sessions.filter((s) => s.completed);
    const { start } = weekRange();
    const weekStart = toISODate(start);
    const weekSessions = done.filter((s) => s.date >= weekStart);
    const target = data.profile.trainingDays.length || program.daysPerWeek;

    // Weekly volume for the last eight weeks.
    const weeks: { label: string; value: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const ws = new Date(start);
      ws.setDate(ws.getDate() - i * 7);
      const we = new Date(ws);
      we.setDate(we.getDate() + 6);
      const from = toISODate(ws);
      const to = toISODate(we);
      const inWeek = done.filter((s) => s.date >= from && s.date <= to);
      weeks.push({
        label: ws.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        value: Math.round(totalVolume(inWeek)),
      });
    }

    const meso = done.length
      ? mesocycleWeek(done[done.length - 1].date, toISODate(), program.mesocycleWeeks)
      : null;

    const alreadyLoggedToday = done.some((s) => s.date === toISODate());

    return {
      program,
      todayKey,
      today,
      done,
      weekSessions,
      target,
      weeks,
      meso,
      alreadyLoggedToday,
      weeklySets: setsByMuscle(weekSessions),
      insights: generateInsights(data),
      level: levelFromXP(data.gamification.xp),
    };
  }, [data]);

  if (!data || !view) return null;

  const {
    program,
    todayKey,
    today,
    done,
    weekSessions,
    target,
    weeks,
    meso,
    alreadyLoggedToday,
    weeklySets,
    insights,
    level,
  } = view;

  const isRest = today.type === "rest";
  const weekVolume = Math.round(totalVolume(weekSessions));

  return (
    <div className="space-y-6">
      {/* --------------------------------------------------------- hero */}
      <Card glow className="overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-[1.6fr_1fr]">
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="volt">
                <CalendarCheck size={11} /> {DAY_LABELS[todayKey]}
              </Pill>
              <Pill>{program.name}</Pill>
              {meso && (
                <Pill tone={meso.phase === "deload" ? "ice" : "ember"}>
                  Week {meso.week} · {meso.phase}
                </Pill>
              )}
              {alreadyLoggedToday && <Pill tone="ok">Logged today</Pill>}
            </div>

            <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">
              {today.title}
            </h1>
            <p className="mt-1 text-sm text-muted">{today.focus}</p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{today.brief}</p>

            {!isRest && (
              <>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-faint">
                  <span className="flex items-center gap-1.5">
                    <Dumbbell size={13} className="text-volt" />
                    {today.exercises.length} exercises
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Timer size={13} className="text-volt" />
                    ~{today.estimatedMinutes} min
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Zap size={13} className="text-volt" />
                    {today.exercises.reduce((n, e) => n + e.sets, 0)} working sets
                  </span>
                </div>

                <ul className="mt-4 grid gap-1.5 sm:grid-cols-2">
                  {today.exercises.slice(0, 6).map((e) => (
                    <li
                      key={e.exerciseId}
                      className="flex items-center justify-between gap-2 rounded-md bg-panel2 px-2.5 py-1.5 text-xs"
                    >
                      <span className="truncate text-ink">{exerciseName(e.exerciseId)}</span>
                      <span className="shrink-0 text-faint tnum">
                        {e.sets} × {e.reps}
                      </span>
                    </li>
                  ))}
                  {today.exercises.length > 6 && (
                    <li className="px-2.5 py-1.5 text-xs text-faint">
                      +{today.exercises.length - 6} more
                    </li>
                  )}
                </ul>
              </>
            )}

            <div className="mt-5 flex flex-wrap gap-2.5">
              {isRest ? (
                <ButtonLink href="/plan" variant="secondary" size="lg">
                  See the week <ChevronRight size={16} />
                </ButtonLink>
              ) : (
                <ButtonLink href="/train" variant="primary" size="lg" icon={<Play size={17} />}>
                  Start {today.title}
                </ButtonLink>
              )}
              <ButtonLink href={`/plan/${todayKey}`} variant="outline" size="lg">
                View session detail
              </ButtonLink>
            </div>
          </div>

          <div className="border-t border-line p-5 lg:border-l lg:border-t-0">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-faint">
              Today&apos;s targets
            </p>
            <MuscleMap data={dayActivation(today)} compact showLegend={false} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {today.targets.slice(0, 5).map((t) => (
                <Pill key={t} tone="ice">
                  {t.replace("-", " ")}
                </Pill>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* -------------------------------------------------------- stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Current streak"
          value={data.streak.current}
          sub={`Best ${data.streak.longest} · ${data.streak.freezesAvailable} freezes left`}
          icon={<Flame size={15} />}
          tone="ember"
        />
        <Stat
          label="This week"
          value={`${weekSessions.length}/${target}`}
          sub={`${target - weekSessions.length > 0 ? `${target - weekSessions.length} to go` : "Target hit"}`}
          icon={<CalendarCheck size={15} />}
        />
        <Stat
          label="Week volume"
          value={`${compact(weekVolume)} kg`}
          sub={`${weekSessions.reduce((n, s) => n + s.totalSets, 0)} working sets`}
          icon={<TrendingUp size={15} />}
          tone="ice"
        />
        <Stat
          label={`Level ${level.level}`}
          value={levelTitle(level.level)}
          sub={`${level.into}/${level.need} XP`}
          icon={<Trophy size={15} />}
          tone="violet"
        />
      </div>

      {/* ----------------------------------------------------- insights */}
      {insights.length > 0 && (
        <div>
          <SectionTitle
            action={
              <ButtonLink href="/coach" variant="ghost" size="sm">
                Ask the coach <ArrowRight size={13} />
              </ButtonLink>
            }
          >
            What your data says
          </SectionTitle>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {insights.slice(0, 6).map((i) => (
              <Card key={i.id} className="p-4">
                <div className="flex items-start gap-2.5">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      i.tone === "good"
                        ? "bg-ok/15 text-ok"
                        : i.tone === "warn"
                          ? "bg-warn/15 text-warn"
                          : i.tone === "danger"
                            ? "bg-danger/15 text-danger"
                            : "bg-ice/15 text-ice"
                    }`}
                  >
                    <Info size={14} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-sm font-semibold text-ink">{i.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{i.body}</p>
                    {i.action && (
                      <Link
                        href={i.action.href}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-volt hover:underline"
                      >
                        {i.action.label} <ChevronRight size={12} />
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Weekly training volume"
            subtitle="Total kilograms moved per week, last 8 weeks"
            icon={<TrendingUp size={15} />}
          />
          <CardBody>
            <TrendChart data={weeks} unit="kg" seriesLabel="Volume" height={210} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Muscle balance this week"
            subtitle="Hard sets against evidence-based weekly landmarks"
            icon={<Dumbbell size={15} />}
            action={
              <ButtonLink href="/progress" variant="ghost" size="sm">
                Details
              </ButtonLink>
            }
          />
          <CardBody>
            <MuscleBalanceChart sets={weeklySets} height={260} limit={9} />
          </CardBody>
        </Card>
      </div>

      {/* --------------------------------------------- recent + team */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent sessions"
            subtitle={`${done.length} logged in total`}
            icon={<Clock size={15} />}
            action={
              <ButtonLink href="/progress" variant="ghost" size="sm">
                All history
              </ButtonLink>
            }
          />
          <CardBody>
            {done.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                No sessions yet. Your first one is one tap away.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {done.slice(0, 6).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel3 text-volt">
                      <Dumbbell size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{s.title}</p>
                      <p className="text-[11px] text-faint">
                        {relativeDay(s.date)} · {formatDuration(s.durationSeconds)} ·{" "}
                        {s.totalSets} sets
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink tnum">
                        {compact(s.totalVolumeKg)} kg
                      </p>
                      {s.prs.length > 0 && (
                        <p className="text-[10px] font-semibold text-ember">
                          {s.prs.length} PR{s.prs.length > 1 ? "s" : ""}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Level progress"
              subtitle={`${data.gamification.xp.toLocaleString()} XP earned`}
              icon={<Trophy size={15} />}
            />
            <CardBody className="flex items-center gap-4">
              <Ring
                value={level.pct}
                label={`${level.level}`}
                sub="level"
                tone="var(--c-violet)"
              />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold">{levelTitle(level.level)}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {level.need - level.into} XP to level {level.level + 1}
                </p>
                <Progress value={level.pct} className="mt-2" tone="volt" />
                <p className="mt-2 text-[11px] text-faint">
                  {data.gamification.badges.length} badges unlocked
                </p>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Team pulse"
              subtitle={team ? team.name : "You're not in a crew yet"}
              icon={<Users size={15} />}
              action={
                <ButtonLink href="/team" variant="ghost" size="sm">
                  {team ? "Open" : "Join"}
                </ButtonLink>
              }
            />
            <CardBody>
              {team ? (
                <ul className="space-y-2">
                  {[...team.members]
                    .sort((a, b) => b.stats.currentStreak - a.stats.currentStreak)
                    .slice(0, 4)
                    .map((m, i) => (
                      <li key={m.uid} className="flex items-center gap-2.5">
                        <span className="w-4 text-center text-[11px] font-semibold text-faint tnum">
                          {i + 1}
                        </span>
                        <Avatar name={m.displayName} src={m.photoURL} size={28} />
                        <span className="min-w-0 flex-1 truncate text-xs text-ink">
                          {m.displayName}
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-ember tnum">
                          <Flame size={11} />
                          {m.stats.currentStreak}
                        </span>
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="text-xs leading-relaxed text-muted">
                  Create a team or join one with a six-character code. Shared streaks and a
                  leaderboard turn out to be the most reliable motivation there is.
                </p>
              )}
            </CardBody>
          </Card>

          <Card className="border-volt/30">
            <CardBody className="pt-4">
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-volt/15 text-volt">
                  <Bot size={16} />
                </span>
                <div>
                  <p className="font-display text-sm font-semibold">Ask your coach</p>
                  <p className="mt-1 text-xs text-muted">
                    It already knows your programme, your last fortnight and every PR.
                  </p>
                  <ButtonLink href="/coach" variant="primary" size="sm" className="mt-3">
                    Open coach <ArrowRight size={13} />
                  </ButtonLink>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
