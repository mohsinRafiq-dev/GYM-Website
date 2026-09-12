"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  Check,
  ChevronDown,
  Clock,
  Dumbbell,
  Flag,
  Info,
  Layers,
  Lightbulb,
  Minus,
  NotebookPen,
  Play,
  Plus,
  Repeat2,
  Scale,
  Timer,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Segmented, Textarea } from "@/components/ui/form";
import { Pill, Progress, Stat } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { ExerciseAnimation } from "@/components/workout/ExerciseAnimation";
import { RestTimer } from "@/components/workout/RestTimer";
import { useData } from "@/lib/store/data-context";
import { getProgram } from "@/lib/data/programs";
import { getExercise, substitutionsFor, exerciseName } from "@/lib/data/exercises";
import { lastPerformance, suggestLoad, summariseSession } from "@/lib/session-utils";
import {
  estimate1RM,
  firstSessionDate,
  mesocycleWeek,
  parseRepRange,
  platesPerSide,
  warmupRamp,
} from "@/lib/fitness";
import { TempoMetronome } from "@/components/workout/TempoMetronome";
import { sound, vibrate } from "@/lib/sound";
import {
  clock,
  cn,
  compact,
  dayKeyOf,
  displayWeight,
  formatDuration,
  relativeDay,
  round,
  toISODate,
  uid as makeId,
} from "@/lib/utils";
import {
  DAY_KEYS,
  DAY_LABELS,
  type DayKey,
  type LoggedExercise,
  type LoggedSet,
  type WorkoutSession,
} from "@/lib/types";

const ACTIVE_KEY = "ironpulse:active-session";

export default function TrainPage() {
  const { data, saveSession } = useData();
  const router = useRouter();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [restSeconds, setRestSeconds] = useState<number | null>(null);
  const [restKey, setRestKey] = useState(0);
  const [openExercise, setOpenExercise] = useState<string | null>(null);
  const [pickDay, setPickDay] = useState<DayKey>(dayKeyOf());
  const [summary, setSummary] = useState<WorkoutSession | null>(null);
  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [plateFor, setPlateFor] = useState<{ id: string; weight: number } | null>(null);
  const [notesFor, setNotesFor] = useState<string | null>(null);
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [energy, setEnergy] = useState<1 | 2 | 3 | 4 | 5>(4);
  const restoredRef = useRef(false);

  const program = getProgram(data?.profile.programId);

  /* --------------------------------------------------- restore in-flight */
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      // Resuming an interrupted workout from localStorage — an external store.
      const raw = window.localStorage.getItem(ACTIVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WorkoutSession;
        /* eslint-disable react-hooks/set-state-in-effect */
        setSession(parsed);
        setOpenExercise(parsed.exercises[0]?.exerciseId ?? null);
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!session) {
      window.localStorage.removeItem(ACTIVE_KEY);
      return;
    }
    window.localStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
  }, [session]);

  /* ------------------------------------------------------------- clock */
  useEffect(() => {
    if (!session) return;
    // A half-second tick keeps the clock honest after a restore without a
    // synchronous setState in the effect body.
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - session.startedAt) / 1000)),
      500,
    );
    return () => clearInterval(id);
  }, [session]);

  const startSession = useCallback(
    (dayKey: DayKey) => {
      if (!data) return;
      const day = program.days[dayKey];
      const exercises: LoggedExercise[] = day.exercises.map((planned) => {
        const meta = getExercise(planned.exerciseId);
        // Deload-aware: never pre-fill from a deload session, and drop to ~60%
        // when today is itself a deload.
        const suggested = suggestLoad({
          exercise: meta,
          exerciseId: planned.exerciseId,
          history: data.sessions,
          repRange: parseRepRange(planned.reps, meta?.repRange ?? [8, 12]),
          today: toISODate(),
          startDate: firstSessionDate(data.sessions),
          mesocycleWeeks: program.mesocycleWeeks,
        }).weightKg;
        return {
          exerciseId: planned.exerciseId,
          sets: Array.from({ length: planned.sets }).map((_, i) => ({
            id: makeId("set"),
            setNumber: i + 1,
            weightKg: suggested,
            reps: 0,
            rpe: planned.rpe,
            completed: false,
            timestamp: 0,
          })),
          note: undefined,
        } satisfies LoggedExercise;
      });

      const fresh: WorkoutSession = {
        id: makeId("ses"),
        uid: data.profile.uid,
        date: toISODate(),
        dayKey,
        programId: program.id,
        title: day.title,
        startedAt: Date.now(),
        durationSeconds: 0,
        exercises,
        totalVolumeKg: 0,
        totalSets: 0,
        totalReps: 0,
        volumeByMuscle: {},
        prs: [],
        xpEarned: 0,
        completed: false,
      };
      setSession(fresh);
      setOpenExercise(exercises[0]?.exerciseId ?? null);
    },
    [data, program],
  );

  const patchSet = useCallback(
    (exerciseId: string, setId: string, patch: Partial<LoggedSet>) => {
      setSession((s) =>
        s
          ? {
              ...s,
              exercises: s.exercises.map((ex) =>
                ex.exerciseId === exerciseId
                  ? {
                      ...ex,
                      sets: ex.sets.map((set) =>
                        set.id === setId ? { ...set, ...patch } : set,
                      ),
                    }
                  : ex,
              ),
            }
          : s,
      );
    },
    [],
  );

  const completeSet = useCallback(
    (exerciseId: string, setId: string) => {
      if (!data) return;
      const ex = session?.exercises.find((e) => e.exerciseId === exerciseId);
      const set = ex?.sets.find((s) => s.id === setId);
      if (!set) return;
      const nowComplete = !set.completed;

      patchSet(exerciseId, setId, {
        completed: nowComplete,
        timestamp: nowComplete ? Date.now() : 0,
      });

      if (nowComplete) {
        if (data.settings.soundEnabled) sound.tick();
        if (data.settings.vibrationEnabled) vibrate(35);
        if (data.settings.restAutoStart && !set.warmup) {
          const planned = program.days[session!.dayKey].exercises.find(
            (p) => p.exerciseId === exerciseId,
          );
          setRestSeconds(planned?.restSeconds ?? data.settings.defaultRestSeconds);
          setRestKey((k) => k + 1);
        }
      }
    },
    [data, session, patchSet, program],
  );

  const addSet = useCallback((exerciseId: string) => {
    setSession((s) =>
      s
        ? {
            ...s,
            exercises: s.exercises.map((ex) =>
              ex.exerciseId === exerciseId
                ? {
                    ...ex,
                    sets: [
                      ...ex.sets,
                      {
                        id: makeId("set"),
                        setNumber: ex.sets.length + 1,
                        weightKg: ex.sets[ex.sets.length - 1]?.weightKg ?? 0,
                        reps: 0,
                        rpe: ex.sets[ex.sets.length - 1]?.rpe,
                        completed: false,
                        timestamp: 0,
                      },
                    ],
                  }
                : ex,
            ),
          }
        : s,
    );
  }, []);

  const removeSet = useCallback((exerciseId: string, setId: string) => {
    setSession((s) =>
      s
        ? {
            ...s,
            exercises: s.exercises.map((ex) =>
              ex.exerciseId === exerciseId
                ? {
                    ...ex,
                    sets: ex.sets
                      .filter((x) => x.id !== setId)
                      .map((x, i) => ({ ...x, setNumber: i + 1 })),
                  }
                : ex,
            ),
          }
        : s,
    );
  }, []);

  const swapExercise = useCallback(
    (fromId: string, toId: string) => {
      setSession((s) =>
        s
          ? {
              ...s,
              exercises: s.exercises.map((ex) =>
                ex.exerciseId === fromId
                  ? { ...ex, exerciseId: toId, substitutedFor: fromId }
                  : ex,
              ),
            }
          : s,
      );
      setSwapFor(null);
      setOpenExercise(toId);
    },
    [],
  );

  const finish = useCallback(() => {
    if (!session || !data) return;
    const ended = Date.now();
    const draft: WorkoutSession = {
      ...session,
      endedAt: ended,
      durationSeconds: Math.floor((ended - session.startedAt) / 1000),
      mood,
      energy,
      completed: true,
    };
    const stored = saveSession(draft);
    setSummary(summariseSession(draft, data.sessions, data.streak.current));
    setSession(null);
    window.localStorage.removeItem(ACTIVE_KEY);
    if (stored.prs.length) {
      if (data.settings.soundEnabled) sound.celebrate();
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.7 } });
    }
  }, [session, data, mood, energy, saveSession]);

  const totals = useMemo(() => {
    if (!session) return { volume: 0, sets: 0, done: 0, planned: 0 };
    let volume = 0;
    let done = 0;
    let planned = 0;
    for (const ex of session.exercises) {
      planned += ex.sets.length;
      for (const s of ex.sets) {
        if (s.completed && !s.warmup) {
          volume += s.weightKg * s.reps;
          done++;
        }
      }
    }
    return { volume, sets: planned, done, planned };
  }, [session]);

  if (!data) return null;

  /* =============================================================== start */
  if (!session) {
    const day = program.days[pickDay];
    const rest = day.type === "rest";
    return (
      <div className="space-y-6">
        <PageHeader
          title="Start a session"
          subtitle="Pick the day you're training. The plan loads with your last weights already filled in."
        />

        <div className="flex flex-wrap gap-1.5">
          {DAY_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setPickDay(k)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                k === pickDay
                  ? "border-volt bg-volt/15 text-volt"
                  : "border-line bg-panel2 text-muted hover:text-ink",
              )}
            >
              {DAY_LABELS[k].slice(0, 3)}
              {k === dayKeyOf() && <span className="ml-1 text-[9px] text-ember">•</span>}
            </button>
          ))}
        </div>

        <Card glow={!rest}>
          <div className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone="volt">{DAY_LABELS[pickDay]}</Pill>
              <Pill>{program.name}</Pill>
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold">{day.title}</h2>
            <p className="mt-1 text-sm text-muted">{day.focus}</p>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{day.brief}</p>

            {!rest && (
              <>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-faint">
                  <span className="flex items-center gap-1.5">
                    <Dumbbell size={13} className="text-volt" /> {day.exercises.length} exercises
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Layers size={13} className="text-volt" />
                    {day.exercises.reduce((n, e) => n + e.sets, 0)} sets
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-volt" /> ~{day.estimatedMinutes} min
                  </span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  <Button
                    variant="primary"
                    size="lg"
                    icon={<Play size={17} />}
                    onClick={() => startSession(pickDay)}
                  >
                    Begin {day.title}
                  </Button>
                  <ButtonLink href={`/plan/${pickDay}`} variant="outline" size="lg">
                    Review the session
                  </ButtonLink>
                </div>
              </>
            )}

            {rest && (
              <div className="mt-5">
                <p className="text-sm text-muted">
                  This is a rest day. You can still train it if you&apos;ve shifted your week
                  around — pick another day above, or check in on the attendance page.
                </p>
                <ButtonLink href="/attendance" variant="secondary" size="lg" className="mt-4">
                  Log a rest day
                </ButtonLink>
              </div>
            )}
          </div>
        </Card>

        {day.warmup.length > 0 && !rest && (
          <Card>
            <CardHeader title="Warm up first" icon={<Info size={15} />} />
            <CardBody>
              <ol className="space-y-1.5 text-sm text-muted">
                {day.warmup.map((w, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-volt">{i + 1}.</span>
                    {w}
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        )}

        <SummaryModal
          summary={summary}
          onClose={() => setSummary(null)}
          units={data.settings.units}
          onViewProgress={() => router.push("/progress")}
        />
      </div>
    );
  }

  /* ============================================================== active */
  const day = program.days[session.dayKey];
  const trainingStart = firstSessionDate(data.sessions);
  const deloadToday =
    Boolean(trainingStart) &&
    mesocycleWeek(trainingStart!, session.date, program.mesocycleWeeks).phase === "deload";

  return (
    <div className="space-y-4 pb-24">
      {/* --------------------------------------------------- session bar */}
      <div className="sticky top-14 z-10 -mx-4 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-base font-bold">{session.title}</p>
            <p className="text-[11px] text-faint">
              {totals.done}/{totals.planned} sets · {compact(totals.volume)} kg
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-lg font-bold tnum">{clock(elapsed)}</p>
            <p className="text-[10px] uppercase tracking-wider text-faint">elapsed</p>
          </div>
          <Button variant="primary" onClick={finish} icon={<Flag size={15} />}>
            Finish
          </Button>
        </div>
        <Progress
          value={totals.planned ? (totals.done / totals.planned) * 100 : 0}
          className="mt-2"
          height={3}
        />
      </div>

      {deloadToday && (
        <div className="rounded-lg border border-ice/30 bg-ice/8 p-3 text-xs leading-relaxed text-muted">
          <span className="font-semibold text-ice">Deload week.</span> Loads are pre-filled at about
          60% of your last working weights. Same movements, nowhere near failure — this is the week
          that makes next week&apos;s numbers go up.
        </div>
      )}

      {/* ---------------------------------------------------- exercises */}
      <div className="space-y-3">
        {session.exercises.map((logged, idx) => {
          const ex = getExercise(logged.exerciseId);
          if (!ex) return null;
          const planned = day.exercises.find(
            (p) => p.exerciseId === (logged.substitutedFor ?? logged.exerciseId),
          );
          const open = openExercise === logged.exerciseId;
          const last = lastPerformance(logged.exerciseId, data.sessions);
          const doneSets = logged.sets.filter((s) => s.completed).length;
          const suggestion = suggestLoad({
            exercise: ex,
            exerciseId: logged.exerciseId,
            history: data.sessions,
            // Judge against today's prescription, not the exercise default.
            repRange: planned ? parseRepRange(planned.reps, ex.repRange) : ex.repRange,
            today: session.date,
            startDate: trainingStart,
            mesocycleWeeks: program.mesocycleWeeks,
          });

          return (
            <Card key={logged.exerciseId} className={open ? "border-volt/40" : undefined}>
              <button
                type="button"
                onClick={() => setOpenExercise(open ? null : logged.exerciseId)}
                className="flex w-full items-center gap-3 p-3.5 text-left"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tnum",
                    doneSets === logged.sets.length && doneSets > 0
                      ? "bg-volt text-volt-ink"
                      : "bg-panel3 text-volt",
                  )}
                >
                  {doneSets === logged.sets.length && doneSets > 0 ? (
                    <Check size={15} />
                  ) : (
                    idx + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-display text-sm font-semibold">
                    {ex.name}
                    {logged.substitutedFor && <Pill tone="ice">swapped</Pill>}
                  </p>
                  <p className="text-[11px] text-faint tnum">
                    {planned ? `${planned.sets} × ${planned.reps} @ RPE ${planned.rpe}` : "Freestyle"}
                    {" · "}
                    {doneSets}/{logged.sets.length} done
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={cn("shrink-0 text-faint transition-transform", open && "rotate-180")}
                />
              </button>

              {open && (
                <div className="border-t border-line p-3.5">
                  {/* hints */}
                  <div className="mb-3 grid gap-2 sm:grid-cols-2">
                    {last ? (
                      <div className="rounded-lg border border-line bg-panel2 p-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">
                          Last time · {relativeDay(last.date)}
                        </p>
                        <p className="mt-1 text-xs text-ink tnum">
                          {last.sets
                            .map(
                              (s) =>
                                `${displayWeight(s.weightKg, data.settings.units, 0)} × ${s.reps}`,
                            )
                            .join("  ·  ")}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-line bg-panel2 p-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">
                          First time
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          Start conservatively and leave 2-3 reps in reserve. Today is about
                          setting a baseline.
                        </p>
                      </div>
                    )}

                    {last && (
                      <div
                        className={cn(
                          "rounded-lg border p-2.5",
                          suggestion.basis === "deload"
                            ? "border-ice/30 bg-ice/8"
                            : suggestion.basis === "return"
                              ? "border-violet/30 bg-violet/8"
                              : "border-ok/30 bg-ok/8",
                        )}
                      >
                        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
                          <Lightbulb size={11} />
                          Today&apos;s call
                          {suggestion.weightKg > 0 && (
                            <span className="ml-auto text-xs normal-case tracking-normal text-ink tnum">
                              {displayWeight(suggestion.weightKg, data.settings.units, 1)}
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{suggestion.reason}</p>
                      </div>
                    )}
                  </div>

                  {/* set table */}
                  <div className="overflow-hidden rounded-lg border border-line">
                    <div className="grid grid-cols-[32px_1fr_1fr_60px_44px] items-center gap-2 border-b border-line bg-panel2 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
                      <span>Set</span>
                      <span>{data.settings.units === "metric" ? "kg" : "lb"}</span>
                      <span>Reps</span>
                      <span>RPE</span>
                      <span />
                    </div>
                    {logged.sets.map((set) => (
                      <div
                        key={set.id}
                        className={cn(
                          "grid grid-cols-[32px_1fr_1fr_60px_44px] items-center gap-2 border-b border-line px-2 py-1.5 last:border-0",
                          set.completed && "bg-volt/6",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            patchSet(logged.exerciseId, set.id, { warmup: !set.warmup })
                          }
                          className={cn(
                            "text-xs font-semibold tnum",
                            set.warmup ? "text-ice" : "text-faint",
                          )}
                          title="Toggle warm-up set"
                        >
                          {set.warmup ? "W" : set.setNumber}
                        </button>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          value={set.weightKg || ""}
                          onChange={(e) =>
                            patchSet(logged.exerciseId, set.id, {
                              weightKg: Number(e.target.value),
                            })
                          }
                          className="h-8 px-2 text-sm tnum"
                          placeholder="0"
                        />
                        <Input
                          type="number"
                          inputMode="numeric"
                          value={set.reps || ""}
                          onChange={(e) =>
                            patchSet(logged.exerciseId, set.id, { reps: Number(e.target.value) })
                          }
                          className="h-8 px-2 text-sm tnum"
                          placeholder="0"
                        />
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          min={5}
                          max={10}
                          value={set.rpe ?? ""}
                          onChange={(e) =>
                            patchSet(logged.exerciseId, set.id, { rpe: Number(e.target.value) })
                          }
                          className="h-8 px-1.5 text-center text-sm tnum"
                        />
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => completeSet(logged.exerciseId, set.id)}
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-md border transition",
                              set.completed
                                ? "border-volt bg-volt text-volt-ink"
                                : "border-line text-faint hover:border-volt hover:text-volt",
                            )}
                            aria-label={set.completed ? "Mark set incomplete" : "Complete set"}
                          >
                            <Check size={14} />
                          </button>
                          {logged.sets.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSet(logged.exerciseId, set.id)}
                              className="text-faint transition hover:text-danger"
                              aria-label="Remove set"
                            >
                              <Minus size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* actions */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => addSet(logged.exerciseId)} icon={<Plus size={13} />}>
                      Add set
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setRestSeconds(planned?.restSeconds ?? data.settings.defaultRestSeconds);
                        setRestKey((k) => k + 1);
                      }}
                      icon={<Timer size={13} />}
                    >
                      Rest
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setPlateFor({
                          id: logged.exerciseId,
                          weight: logged.sets.find((s) => !s.completed)?.weightKg ?? 60,
                        })
                      }
                      icon={<Scale size={13} />}
                    >
                      Plates
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSwapFor(logged.exerciseId)}
                      icon={<Repeat2 size={13} />}
                    >
                      Swap
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setNotesFor(logged.exerciseId)}
                      icon={<NotebookPen size={13} />}
                    >
                      Note
                    </Button>
                  </div>

                  {logged.note && (
                    <p className="mt-2 rounded-md bg-panel2 p-2 text-xs italic text-muted">
                      {logged.note}
                    </p>
                  )}

                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <div className="space-y-2">
                      <ExerciseAnimation
                        pattern={ex.pattern}
                        tempo={planned?.tempo ?? ex.tempo}
                        size="sm"
                        showCaption={false}
                      />
                      <TempoMetronome
                        tempo={planned?.tempo ?? ex.tempo}
                        autoStart={data.settings.tempoMetronome}
                        vibrationEnabled={data.settings.vibrationEnabled}
                      />
                    </div>
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
                        Cues
                      </p>
                      <ul className="space-y-1 text-xs leading-relaxed text-muted">
                        {ex.cues.slice(0, 3).map((c, i) => (
                          <li key={i} className="flex gap-1.5">
                            <span className="text-volt">›</span>
                            {c}
                          </li>
                        ))}
                      </ul>
                      {planned?.note && (
                        <p className="mt-2 rounded-md border border-volt/25 bg-volt/8 p-2 text-[11px] text-muted">
                          {planned.note}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* --------------------------------------------------- how it felt */}
      <Card>
        <CardHeader title="How did that feel?" subtitle="Feeds the coach's recovery advice." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Mood">
            <Segmented
              value={String(mood)}
              onChange={(v) => setMood(Number(v) as 1 | 2 | 3 | 4 | 5)}
              options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
            />
          </Field>
          <Field label="Energy">
            <Segmented
              value={String(energy)}
              onChange={(v) => setEnergy(Number(v) as 1 | 2 | 3 | 4 | 5)}
              options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
            />
          </Field>
        </CardBody>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="lg" onClick={finish} icon={<Flag size={16} />}>
          Finish and save
        </Button>
        <Button
          variant="danger"
          size="lg"
          onClick={() => {
            if (confirm("Discard this session? Nothing will be saved.")) setSession(null);
          }}
          icon={<X size={16} />}
        >
          Discard
        </Button>
      </div>

      {/* -------------------------------------------------------- timers */}
      {restSeconds !== null && (
        <RestTimer
          key={restKey}
          seconds={restSeconds}
          onDismiss={() => setRestSeconds(null)}
          soundEnabled={data.settings.soundEnabled}
          vibrationEnabled={data.settings.vibrationEnabled}
        />
      )}

      {/* --------------------------------------------------------- modals */}
      <Modal
        open={Boolean(swapFor)}
        onClose={() => setSwapFor(null)}
        title="Swap this exercise"
        description="Same training slot, different equipment. Your logged sets carry over."
      >
        <div className="space-y-2">
          {swapFor &&
            substitutionsFor(swapFor).map((alt) => (
              <button
                key={alt.id}
                type="button"
                onClick={() => swapExercise(swapFor, alt.id)}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-panel2 p-3 text-left transition hover:border-volt"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{alt.name}</span>
                  <span className="text-[11px] text-faint">
                    {alt.equipment.slice(0, 3).join(" · ")} · {alt.mechanic}
                  </span>
                </span>
                <Pill tone="volt">{alt.rating}</Pill>
              </button>
            ))}
        </div>
      </Modal>

      <Modal
        open={Boolean(plateFor)}
        onClose={() => setPlateFor(null)}
        title="Plate calculator"
        description="What to load on each side of a 20 kg bar."
        size="sm"
      >
        {plateFor && <PlateCalculator initial={plateFor.weight} />}
      </Modal>

      <Modal
        open={Boolean(notesFor)}
        onClose={() => setNotesFor(null)}
        title="Exercise note"
        description="Anything worth remembering for next time."
        size="sm"
      >
        <Textarea
          autoFocus
          defaultValue={
            session.exercises.find((e) => e.exerciseId === notesFor)?.note ?? ""
          }
          onChange={(e) => {
            const value = e.target.value;
            setSession((s) =>
              s
                ? {
                    ...s,
                    exercises: s.exercises.map((ex) =>
                      ex.exerciseId === notesFor ? { ...ex, note: value } : ex,
                    ),
                  }
                : s,
            );
          }}
          placeholder="Left shoulder felt tight on the third set…"
        />
      </Modal>

      <SummaryModal
        summary={summary}
        onClose={() => setSummary(null)}
        units={data.settings.units}
        onViewProgress={() => router.push("/progress")}
      />
    </div>
  );
}

/* ------------------------------------------------------- plate calculator */

function PlateCalculator({ initial }: { initial: number }) {
  const [weight, setWeight] = useState(initial || 60);
  const [bar, setBar] = useState(20);
  const result = platesPerSide(weight, bar);
  const ramp = warmupRamp(weight, bar);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Target weight (kg)">
          <Input
            type="number"
            step="2.5"
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
          />
        </Field>
        <Field label="Bar weight (kg)">
          <Segmented
            value={String(bar)}
            onChange={(v) => setBar(Number(v))}
            options={[
              { value: "20", label: "20" },
              { value: "15", label: "15" },
              { value: "10", label: "10" },
            ]}
          />
        </Field>
      </div>

      <div className="rounded-lg border border-line bg-panel2 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-faint">
          Per side
        </p>
        {result.plates.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {result.plates.map((p, i) => (
              <span
                key={i}
                className="rounded-md bg-ember/15 px-2 py-1 text-xs font-semibold text-ember tnum"
              >
                {p}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted">Empty bar.</p>
        )}
        <p className="mt-2 text-xs text-muted tnum">
          Loads to {result.achievableKg} kg
          {result.remainderKg > 0 && ` (${result.remainderKg} kg short — closest possible)`}
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
          Warm-up ramp
        </p>
        <ul className="space-y-1">
          {ramp.map((r, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-md bg-panel2 px-2.5 py-1.5 text-xs"
            >
              <span className="text-muted">{r.label}</span>
              <span className="font-semibold text-ink tnum">
                {r.weightKg} kg × {r.reps}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/* ------------------------------------------------------- session summary */

function SummaryModal({
  summary,
  onClose,
  units,
  onViewProgress,
}: {
  summary: WorkoutSession | null;
  onClose(): void;
  units: "metric" | "imperial";
  onViewProgress(): void;
}) {
  if (!summary) return null;
  const best = summary.exercises
    .map((ex) => {
      const top = ex.sets
        .filter((s) => s.completed && !s.warmup)
        .sort((a, b) => estimate1RM(b.weightKg, b.reps) - estimate1RM(a.weightKg, a.reps))[0];
      return top ? { name: exerciseName(ex.exerciseId), set: top } : null;
    })
    .filter(Boolean)
    .slice(0, 5) as { name: string; set: LoggedSet }[];

  return (
    <Modal
      open
      onClose={onClose}
      title="Session complete"
      description={`${summary.title} · ${formatDuration(summary.durationSeconds)}`}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
          <Button variant="outline" onClick={onViewProgress}>
            See progress
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Volume" value={`${compact(summary.totalVolumeKg)} kg`} icon={<TrendingUp size={14} />} />
          <Stat label="Sets" value={summary.totalSets} icon={<Layers size={14} />} />
          <Stat label="Reps" value={summary.totalReps} icon={<Dumbbell size={14} />} />
          <Stat label="XP" value={`+${summary.xpEarned}`} icon={<Trophy size={14} />} tone="violet" />
        </div>

        {summary.prs.length > 0 && (
          <div className="rounded-lg border border-ember/30 bg-ember/8 p-3">
            <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-ember">
              <Trophy size={14} /> {summary.prs.length} personal record
              {summary.prs.length > 1 ? "s" : ""}
            </p>
            <ul className="mt-2 space-y-1">
              {summary.prs.slice(0, 6).map((pr, i) => (
                <li key={i} className="flex items-center justify-between text-xs">
                  <span className="text-ink">{exerciseName(pr.exerciseId)}</span>
                  <span className="text-muted tnum">
                    {pr.type === "volume"
                      ? `${compact(pr.value)} kg volume`
                      : pr.type === "e1rm"
                        ? `${round(pr.value, 1)} kg est. 1RM`
                        : `${displayWeight(pr.value, units, 1)}`}
                    {pr.previous ? ` (was ${round(pr.previous, 1)})` : " — first record"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {best.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
              Top set per exercise
            </p>
            <ul className="space-y-1">
              {best.map((b) => (
                <li
                  key={b.name}
                  className="flex items-center justify-between rounded-md bg-panel2 px-2.5 py-1.5 text-xs"
                >
                  <span className="truncate text-ink">{b.name}</span>
                  <span className="shrink-0 text-muted tnum">
                    {displayWeight(b.set.weightKg, units, 1)} × {b.set.reps}
                    {b.set.rpe ? ` @ ${b.set.rpe}` : ""} · e1RM{" "}
                    {round(estimate1RM(b.set.weightKg, b.set.reps), 1)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
}
