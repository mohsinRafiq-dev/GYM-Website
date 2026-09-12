"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ClipboardList,
  Copy,
  FilePlus2,
  Layers,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Chip, Field, Input, Segmented, Select, Textarea } from "@/components/ui/form";
import { EmptyState, Pill } from "@/components/ui/feedback";
import { MuscleBalanceChart } from "@/components/charts";
import { useData } from "@/lib/store/data-context";
import { EXERCISES, getExercise } from "@/lib/data/exercises";
import {
  PROGRAMS,
  blankDay,
  cloneAsCustom,
  normaliseProgram,
  totalSets,
  weeklySetsByMuscle,
} from "@/lib/data/programs";
import {
  DAY_KEYS,
  DAY_LABELS,
  MUSCLE_LABELS,
  type DayKey,
  type Difficulty,
  type PlannedExercise,
  type Program,
  type SessionType,
  type WorkoutDay,
} from "@/lib/types";
import { cn, uid as makeId } from "@/lib/utils";

export default function TeamProgramsPage() {
  return (
    <Suspense fallback={null}>
      <ProgramBuilder />
    </Suspense>
  );
}

/** Exercises grouped by their main muscle, for the picker. */
const EXERCISE_GROUPS = (() => {
  const groups = new Map<string, typeof EXERCISES>();
  for (const ex of EXERCISES) {
    const label = MUSCLE_LABELS[ex.primary[0]];
    groups.set(label, [...(groups.get(label) ?? []), ex]);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, list]) => [label, [...list].sort((a, b) => a.name.localeCompare(b.name))] as const);
})();

const lines = (value: string[]) => value.join("\n");
const toLines = (value: string) => value.split("\n");
const clean = (value: string[]) => value.map((l) => l.trim()).filter(Boolean);

function ProgramBuilder() {
  const params = useSearchParams();
  const router = useRouter();
  const { data, team, canCoach, saveCustomProgram } = useData();
  const editingId = params.get("id");

  const existing = useMemo(
    () => team?.customPrograms?.find((p) => p.id === editingId),
    [team, editingId],
  );
  const [draft, setDraft] = useState<Program | null>(null);
  const [dirty, setDirty] = useState(false);
  const [dayKey, setDayKey] = useState<DayKey>("monday");
  const [saving, setSaving] = useState(false);

  // Editing starts from the stored programme until the first change.
  const program = draft ?? (existing ? (JSON.parse(JSON.stringify(existing)) as Program) : null);

  const weekly = useMemo(
    () => (program ? weeklySetsByMuscle(normaliseProgram(program)) : {}),
    [program],
  );

  if (!data) return null;

  if (!team) {
    return (
      <EmptyState
        icon={<ClipboardList size={28} />}
        title="Team programmes need a team"
        description="Create or join a team first."
        action={
          <ButtonLink href="/team" variant="primary" size="sm">
            Go to Team
          </ButtonLink>
        }
      />
    );
  }

  if (!canCoach) {
    return (
      <EmptyState
        icon={<ClipboardList size={28} />}
        title="Only the owner or a coach can write programmes"
        description="Ask your team owner to make you a coach."
        action={
          <ButtonLink href="/team" variant="secondary" size="sm">
            Back to Team
          </ButtonLink>
        }
      />
    );
  }

  const meta = {
    teamId: team.id,
    createdBy: data.profile.uid,
    createdByName: data.profile.displayName,
  };

  const change = (mutate: (p: Program) => Program) => {
    if (!program) return;
    setDraft(mutate(program));
    setDirty(true);
  };

  const changeDay = (mutate: (d: WorkoutDay) => WorkoutDay) =>
    change((p) => ({ ...p, days: { ...p.days, [dayKey]: mutate(p.days[dayKey]) } }));

  const changeExercise = (index: number, patch: Partial<PlannedExercise>) =>
    changeDay((d) => ({
      ...d,
      exercises: d.exercises.map((e, i) => (i === index ? { ...e, ...patch } : e)),
    }));

  /* --------------------------------------------------- template chooser */
  if (!program) {
    const startFrom = (template: Program | null) => {
      const id = makeId("prog");
      const now = Date.now();
      const start: Program = template
        ? cloneAsCustom(template, { id, ...meta })
        : normaliseProgram({
            id,
            name: "New team programme",
            tagline: "",
            description: "",
            daysPerWeek: 0,
            level: "intermediate",
            goal: ["build-muscle"],
            mesocycleWeeks: 4,
            equipmentNeeded: [],
            days: Object.fromEntries(DAY_KEYS.map((k) => [k, blankDay(k)])) as Record<DayKey, WorkoutDay>,
            progression: [
              "When every working set reaches the top of the rep range, add the smallest load increment next session.",
              "The last week of each cycle is a deload: same movements, about 60% load, half the sets.",
            ],
            custom: { ...meta, createdAt: now, updatedAt: now },
          });
      setDraft(start);
      setDirty(true);
    };

    return (
      <div className="space-y-5">
        <ButtonLink href="/team" variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
          Back to team
        </ButtonLink>
        <PageHeader
          title={editingId ? "Programme not found" : "New team programme"}
          subtitle={
            editingId
              ? "That programme may have been deleted. Start a new one instead."
              : "Start from a proven built-in plan and adapt it, or build a week from scratch."
          }
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => startFrom(null)}
            className="card flex flex-col items-start gap-2 border-dashed p-4 text-left transition hover:border-volt"
          >
            <FilePlus2 size={20} className="text-volt" />
            <p className="font-display text-sm font-semibold">Blank week</p>
            <p className="text-xs text-muted">Seven rest days. Add the sessions you want.</p>
          </button>
          {PROGRAMS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => startFrom(p)}
              className="card flex flex-col items-start gap-2 p-4 text-left transition hover:border-volt"
            >
              <Copy size={18} className="text-ice" />
              <p className="font-display text-sm font-semibold">{p.name}</p>
              <p className="text-xs text-muted">{p.tagline}</p>
              <div className="flex gap-1.5">
                <Pill tone="volt">{p.daysPerWeek} days</Pill>
                <Pill>{p.level}</Pill>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------ editor */
  const day = program.days[dayKey];
  const normalised = normaliseProgram(program);

  const save = async () => {
    setSaving(true);
    try {
      const tidy: Program = {
        ...program,
        progression: clean(program.progression),
        days: Object.fromEntries(
          DAY_KEYS.map((k) => {
            const d = program.days[k];
            return [
              k,
              {
                ...d,
                title: d.title.trim() || (d.exercises.length ? "Training session" : "Rest"),
                warmup: clean(d.warmup),
                cooldown: clean(d.cooldown),
                coachNotes: clean(d.coachNotes),
                finisher: d.finisher ? clean(d.finisher) : undefined,
                exercises: d.exercises.map((e) => ({
                  ...e,
                  reps: e.reps.trim() || "8-12",
                  supersetGroup: e.supersetGroup?.trim().toUpperCase() || undefined,
                  tempo: e.tempo?.trim() || undefined,
                  note: e.note?.trim() || undefined,
                })),
              },
            ];
          }),
        ) as Record<DayKey, WorkoutDay>,
      };
      const saved = await saveCustomProgram(tidy);
      setDraft(saved);
      setDirty(false);
      toast.success(`${saved.name} saved`);
      if (editingId !== saved.id) router.replace(`/team/programs?id=${saved.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the programme.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <ButtonLink href="/team" variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
        Back to team
      </ButtonLink>

      <PageHeader
        title={program.name || "Untitled programme"}
        subtitle="Changes are saved to the team when you press Save. Members switch to it from the assignment banner."
        badge={`${normalised.daysPerWeek} days / week`}
        action={
          <Button variant="primary" onClick={save} loading={saving} icon={<Save size={15} />}>
            {dirty ? "Save programme" : "Saved"}
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-5">
          {/* ------------------------------------------------ programme */}
          <Card>
            <CardHeader title="Programme details" icon={<ClipboardList size={15} />} />
            <CardBody className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <Input
                    value={program.name}
                    onChange={(e) => change((p) => ({ ...p, name: e.target.value }))}
                    maxLength={60}
                  />
                </Field>
                <Field label="Tagline">
                  <Input
                    value={program.tagline}
                    onChange={(e) => change((p) => ({ ...p, tagline: e.target.value }))}
                    placeholder="5 days · strength first"
                    maxLength={60}
                  />
                </Field>
              </div>
              <Field label="Description">
                <Textarea
                  value={program.description}
                  onChange={(e) => change((p) => ({ ...p, description: e.target.value }))}
                  className="min-h-16"
                  placeholder="Who this is for and what it's built to do."
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Level">
                  <Segmented
                    value={program.level}
                    onChange={(v) => change((p) => ({ ...p, level: v as Difficulty }))}
                    size="sm"
                    options={[
                      { value: "beginner", label: "Beginner" },
                      { value: "intermediate", label: "Intermediate" },
                      { value: "advanced", label: "Advanced" },
                    ]}
                  />
                </Field>
                <Field label="Cycle length (last week is a deload)">
                  <Select
                    value={String(program.mesocycleWeeks)}
                    onChange={(e) => change((p) => ({ ...p, mesocycleWeeks: Number(e.target.value) }))}
                  >
                    {[3, 4, 5, 6].map((w) => (
                      <option key={w} value={w}>
                        {w} weeks
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Progression rules" hint="One per line.">
                <Textarea
                  value={lines(program.progression)}
                  onChange={(e) => change((p) => ({ ...p, progression: toLines(e.target.value) }))}
                  className="min-h-20"
                />
              </Field>
            </CardBody>
          </Card>

          {/* ------------------------------------------------------ day */}
          <div className="flex flex-wrap gap-1.5">
            {DAY_KEYS.map((k) => (
              <Chip key={k} active={k === dayKey} onClick={() => setDayKey(k)}>
                {DAY_LABELS[k].slice(0, 3)}
                {program.days[k].exercises.length > 0 && (
                  <span className="ml-1 text-faint">{program.days[k].exercises.length}</span>
                )}
              </Chip>
            ))}
          </div>

          <Card>
            <CardHeader
              title={`${DAY_LABELS[dayKey]} — ${day.title || "Untitled"}`}
              subtitle={
                day.exercises.length
                  ? `${day.exercises.length} exercises · ${totalSets(day)} sets · ~${normalised.days[dayKey].estimatedMinutes} min`
                  : "Rest day — add an exercise to make it a training day"
              }
              icon={<Layers size={15} />}
              action={
                <Select
                  value=""
                  onChange={(e) => {
                    const from = e.target.value as DayKey;
                    if (!from) return;
                    changeDay(() => ({
                      ...(JSON.parse(JSON.stringify(program.days[from])) as WorkoutDay),
                      key: dayKey,
                    }));
                  }}
                  className="h-8 max-w-36 text-xs"
                  aria-label="Copy another day into this one"
                >
                  <option value="">Copy from…</option>
                  {DAY_KEYS.filter((k) => k !== dayKey).map((k) => (
                    <option key={k} value={k}>
                      {DAY_LABELS[k]}
                    </option>
                  ))}
                </Select>
              }
            />
            <CardBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Session title">
                  <Input
                    value={day.title}
                    onChange={(e) => changeDay((d) => ({ ...d, title: e.target.value }))}
                    placeholder="Chest & Triceps"
                  />
                </Field>
                <Field label="Focus">
                  <Input
                    value={day.focus}
                    onChange={(e) => changeDay((d) => ({ ...d, focus: e.target.value }))}
                    placeholder="Push — horizontal press"
                  />
                </Field>
              </div>

              <Field label="Session type">
                <Segmented
                  value={day.exercises.length === 0 ? "rest" : day.type}
                  onChange={(v) => {
                    const type = v as SessionType;
                    if (type === "rest" && day.exercises.length > 0) {
                      if (!confirm("Make this a rest day? Its exercises will be removed.")) return;
                      changeDay((d) => ({ ...blankDay(dayKey), title: d.title || "Rest" }));
                      return;
                    }
                    changeDay((d) => ({ ...d, type }));
                  }}
                  size="sm"
                  options={[
                    { value: "hypertrophy", label: "Hypertrophy" },
                    { value: "strength", label: "Strength" },
                    { value: "conditioning", label: "Conditioning" },
                    { value: "mobility", label: "Mobility" },
                    { value: "rest", label: "Rest" },
                  ]}
                />
              </Field>

              <Field label="Brief" hint="What the session is for, in a sentence or two.">
                <Textarea
                  value={day.brief}
                  onChange={(e) => changeDay((d) => ({ ...d, brief: e.target.value }))}
                  className="min-h-16"
                />
              </Field>

              {/* exercises */}
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-faint">
                  Exercises
                </p>
                <div className="space-y-2">
                  {day.exercises.map((e, i) => {
                    const ex = getExercise(e.exerciseId);
                    return (
                      <div key={`${e.exerciseId}-${i}`} className="rounded-lg border border-line bg-panel2 p-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-panel3 text-[11px] font-bold text-volt tnum">
                            {i + 1}
                          </span>
                          <Select
                            value={e.exerciseId}
                            onChange={(event) => {
                              const next = getExercise(event.target.value);
                              changeExercise(i, {
                                exerciseId: event.target.value,
                                restSeconds: next?.restSeconds ?? e.restSeconds,
                                reps: next ? `${next.repRange[0]}-${next.repRange[1]}` : e.reps,
                              });
                            }}
                            className="h-9 flex-1 text-sm"
                            aria-label={`Exercise ${i + 1}`}
                          >
                            {EXERCISE_GROUPS.map(([label, list]) => (
                              <optgroup key={label} label={label}>
                                {list.map((option) => (
                                  <option key={option.id} value={option.id}>
                                    {option.name}
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </Select>
                          <div className="flex shrink-0 gap-0.5">
                            <IconButton
                              label="Move up"
                              disabled={i === 0}
                              onClick={() =>
                                changeDay((d) => {
                                  const list = [...d.exercises];
                                  [list[i - 1], list[i]] = [list[i], list[i - 1]];
                                  return { ...d, exercises: list };
                                })
                              }
                            >
                              <ArrowUp size={13} />
                            </IconButton>
                            <IconButton
                              label="Move down"
                              disabled={i === day.exercises.length - 1}
                              onClick={() =>
                                changeDay((d) => {
                                  const list = [...d.exercises];
                                  [list[i + 1], list[i]] = [list[i], list[i + 1]];
                                  return { ...d, exercises: list };
                                })
                              }
                            >
                              <ArrowDown size={13} />
                            </IconButton>
                            <IconButton
                              label="Remove exercise"
                              danger
                              onClick={() =>
                                changeDay((d) => ({
                                  ...d,
                                  exercises: d.exercises.filter((_, idx) => idx !== i),
                                }))
                              }
                            >
                              <Trash2 size={13} />
                            </IconButton>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                          <MiniField label="Sets">
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={e.sets}
                              onChange={(ev) => changeExercise(i, { sets: Math.max(1, Number(ev.target.value)) })}
                              className="h-8 px-2 text-sm tnum"
                            />
                          </MiniField>
                          <MiniField label="Reps">
                            <Input
                              value={e.reps}
                              onChange={(ev) => changeExercise(i, { reps: ev.target.value })}
                              className="h-8 px-2 text-sm"
                              placeholder="8-12"
                            />
                          </MiniField>
                          <MiniField label="RPE">
                            <Input
                              type="number"
                              min={5}
                              max={10}
                              step={0.5}
                              value={e.rpe}
                              onChange={(ev) => changeExercise(i, { rpe: Number(ev.target.value) })}
                              className="h-8 px-2 text-sm tnum"
                            />
                          </MiniField>
                          <MiniField label="Rest (s)">
                            <Input
                              type="number"
                              min={0}
                              step={15}
                              value={e.restSeconds}
                              onChange={(ev) => changeExercise(i, { restSeconds: Number(ev.target.value) })}
                              className="h-8 px-2 text-sm tnum"
                            />
                          </MiniField>
                          <MiniField label="Tempo">
                            <Input
                              value={e.tempo ?? ""}
                              onChange={(ev) => changeExercise(i, { tempo: ev.target.value })}
                              className="h-8 px-2 text-sm"
                              placeholder={ex?.tempo ?? "3-1-1-0"}
                            />
                          </MiniField>
                          <MiniField label="Superset">
                            <Input
                              value={e.supersetGroup ?? ""}
                              onChange={(ev) => changeExercise(i, { supersetGroup: ev.target.value.slice(0, 1) })}
                              className="h-8 px-2 text-sm uppercase"
                              placeholder="—"
                            />
                          </MiniField>
                        </div>
                        <Input
                          value={e.note ?? ""}
                          onChange={(ev) => changeExercise(i, { note: ev.target.value })}
                          className="mt-2 h-8 text-xs"
                          placeholder="Coaching note for this exercise (optional)"
                        />
                      </div>
                    );
                  })}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  icon={<Plus size={13} />}
                  onClick={() =>
                    changeDay((d) => {
                      const ex = EXERCISES[0];
                      return {
                        ...d,
                        type: d.type === "rest" ? "hypertrophy" : d.type,
                        title: d.title === "Rest" ? "" : d.title,
                        exercises: [
                          ...d.exercises,
                          {
                            exerciseId: ex.id,
                            order: d.exercises.length + 1,
                            sets: 3,
                            reps: `${ex.repRange[0]}-${ex.repRange[1]}`,
                            rpe: 8,
                            restSeconds: ex.restSeconds,
                            intensifier: "none",
                          },
                        ],
                      };
                    })
                  }
                >
                  Add exercise
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Warm-up" hint="One step per line.">
                  <Textarea
                    value={lines(day.warmup)}
                    onChange={(e) => changeDay((d) => ({ ...d, warmup: toLines(e.target.value) }))}
                    className="min-h-20"
                  />
                </Field>
                <Field label="Cool-down" hint="One step per line.">
                  <Textarea
                    value={lines(day.cooldown)}
                    onChange={(e) => changeDay((d) => ({ ...d, cooldown: toLines(e.target.value) }))}
                    className="min-h-20"
                  />
                </Field>
              </div>
              <Field label="Coach's notes" hint="One per line — shown on the session page.">
                <Textarea
                  value={lines(day.coachNotes)}
                  onChange={(e) => changeDay((d) => ({ ...d, coachNotes: toLines(e.target.value) }))}
                  className="min-h-16"
                />
              </Field>
            </CardBody>
          </Card>
        </div>

        {/* ---------------------------------------------------- summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="Weekly volume check"
              subtitle="Hard sets per muscle against recoverable landmarks"
            />
            <CardBody>
              <MuscleBalanceChart sets={weekly} height={320} limit={12} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="The week" />
            <CardBody>
              <ul className="space-y-1">
                {DAY_KEYS.map((k) => {
                  const d = normalised.days[k];
                  return (
                    <li key={k}>
                      <button
                        type="button"
                        onClick={() => setDayKey(k)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs transition",
                          k === dayKey ? "bg-volt/12 text-volt" : "text-muted hover:bg-panel2 hover:text-ink",
                        )}
                      >
                        <span className="truncate">
                          {DAY_LABELS[k].slice(0, 3)} · {d.type === "rest" ? "Rest" : d.title || "Untitled"}
                        </span>
                        {d.type !== "rest" && (
                          <span className="shrink-0 text-faint tnum">
                            {totalSets(d)} sets · {d.estimatedMinutes}m
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-faint">{label}</span>
      {children}
    </label>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string;
  onClick(): void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md text-faint transition disabled:opacity-30",
        danger ? "hover:text-danger" : "hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
