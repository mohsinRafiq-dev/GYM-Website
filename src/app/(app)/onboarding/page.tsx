"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Dumbbell, Sparkles, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Segmented, Select, Chip } from "@/components/ui/form";
import { Pill, Progress } from "@/components/ui/feedback";
import { useData } from "@/lib/store/data-context";
import { PROGRAMS } from "@/lib/data/programs";
import { ACTIVITY_LABELS, macroTargets } from "@/lib/fitness";
import {
  DAY_KEYS,
  DAY_LABELS,
  GOAL_LABELS,
  type ActivityLevel,
  type DayKey,
  type Difficulty,
  type Goal,
  type Sex,
  type Units,
} from "@/lib/types";
import { cn, lbToKg, kgToLb, inToCm, cmToIn, round } from "@/lib/utils";

const STEPS = ["You", "Goals", "Programme", "Schedule", "Done"];

export default function OnboardingPage() {
  const { data, updateProfile, updateSettings } = useData();
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [units, setUnits] = useState<Units>(data?.profile.units ?? "metric");
  const [displayName, setDisplayName] = useState(data?.profile.displayName ?? "");
  const [sex, setSex] = useState<Sex>(data?.profile.sex ?? "male");
  const [birthYear, setBirthYear] = useState(data?.profile.birthYear ?? 2000);
  const [heightCm, setHeightCm] = useState(data?.profile.heightCm ?? 175);
  const [weightKg, setWeightKg] = useState(data?.profile.startWeightKg ?? 75);
  const [targetKg, setTargetKg] = useState(data?.profile.targetWeightKg ?? 80);

  const [goals, setGoals] = useState<Goal[]>(data?.profile.goals ?? ["build-muscle"]);
  const [experience, setExperience] = useState<Difficulty>(data?.profile.experience ?? "beginner");
  const [activity, setActivity] = useState<ActivityLevel>(data?.profile.activity ?? "moderate");
  const [limitations, setLimitations] = useState(data?.profile.limitations ?? "");

  const [programId, setProgramId] = useState(data?.profile.programId ?? "aesthetic-6");
  const program = PROGRAMS.find((p) => p.id === programId) ?? PROGRAMS[0];

  const [trainingDays, setTrainingDays] = useState<DayKey[]>(
    Object.values(program.days)
      .filter((d) => d.type !== "rest")
      .map((d) => d.key),
  );
  const [trainTime, setTrainTime] = useState("18:30");

  const macros = useMemo(
    () =>
      macroTargets({
        weightKg,
        heightCm,
        age: Math.max(14, new Date().getFullYear() - birthYear),
        sex,
        activity,
        goal: goals[0] ?? "build-muscle",
      }),
    [weightKg, heightCm, birthYear, sex, activity, goals],
  );

  if (!data) return null;

  const selectProgram = (id: string) => {
    setProgramId(id);
    const p = PROGRAMS.find((x) => x.id === id);
    if (p) {
      setTrainingDays(
        Object.values(p.days)
          .filter((d) => d.type !== "rest")
          .map((d) => d.key),
      );
    }
  };

  const finish = () => {
    updateProfile({
      displayName: displayName.trim() || data.profile.displayName,
      sex,
      birthYear,
      heightCm,
      startWeightKg: weightKg,
      targetWeightKg: targetKg,
      goals,
      experience,
      activity,
      programId,
      trainingDays,
      limitations: limitations.trim() || undefined,
      units,
      onboarded: true,
    });
    const reminders: Partial<Record<DayKey, string | null>> = {};
    for (const d of DAY_KEYS) reminders[d] = trainingDays.includes(d) ? trainTime : null;
    updateSettings({ units, reminders });
    router.push("/dashboard");
  };

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-volt text-volt-ink">
          <Dumbbell size={20} />
        </span>
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Let&apos;s build your plan
        </h1>
        <p className="mt-1 text-sm text-muted">
          Five quick steps. Everything here can be changed later.
        </p>
      </div>

      <div className="mb-6">
        <Progress value={((step + 1) / STEPS.length) * 100} />
        <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-faint">
          {STEPS.map((s, i) => (
            <span key={s} className={i <= step ? "text-volt" : undefined}>
              {s}
            </span>
          ))}
        </div>
      </div>

      <Card className="p-5">
        {/* ------------------------------------------------------ step 0 */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">The basics</h2>
            <Field label="What should we call you?">
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Units">
                <Segmented
                  value={units}
                  onChange={setUnits}
                  options={[
                    { value: "metric", label: "kg / cm" },
                    { value: "imperial", label: "lb / in" },
                  ]}
                />
              </Field>
              <Field label="Sex (for calorie maths)">
                <Segmented
                  value={sex}
                  onChange={setSex}
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Year of birth">
                <Input
                  type="number"
                  value={birthYear}
                  onChange={(e) => setBirthYear(Number(e.target.value))}
                  min={1930}
                  max={new Date().getFullYear() - 12}
                />
              </Field>
              <Field label={units === "metric" ? "Height (cm)" : "Height (in)"}>
                <Input
                  type="number"
                  value={units === "metric" ? round(heightCm, 0) : round(cmToIn(heightCm), 1)}
                  onChange={(e) =>
                    setHeightCm(
                      units === "metric" ? Number(e.target.value) : inToCm(Number(e.target.value)),
                    )
                  }
                />
              </Field>
              <Field label={units === "metric" ? "Weight (kg)" : "Weight (lb)"}>
                <Input
                  type="number"
                  value={units === "metric" ? round(weightKg, 1) : round(kgToLb(weightKg), 1)}
                  onChange={(e) =>
                    setWeightKg(
                      units === "metric" ? Number(e.target.value) : lbToKg(Number(e.target.value)),
                    )
                  }
                />
              </Field>
            </div>

            <Field
              label={`Target weight (${units === "metric" ? "kg" : "lb"})`}
              hint="A direction of travel, not a deadline."
            >
              <Input
                type="number"
                value={units === "metric" ? round(targetKg, 1) : round(kgToLb(targetKg), 1)}
                onChange={(e) =>
                  setTargetKg(
                    units === "metric" ? Number(e.target.value) : lbToKg(Number(e.target.value)),
                  )
                }
              />
            </Field>
          </div>
        )}

        {/* ------------------------------------------------------ step 1 */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-display text-lg font-semibold">What are you chasing?</h2>
            <div>
              <p className="mb-2 text-xs text-muted">Pick one or two. The first is your primary.</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                  <Chip
                    key={g}
                    active={goals.includes(g)}
                    onClick={() =>
                      setGoals((prev) =>
                        prev.includes(g)
                          ? prev.filter((x) => x !== g)
                          : [...prev, g].slice(-2),
                      )
                    }
                  >
                    {GOAL_LABELS[g]}
                  </Chip>
                ))}
              </div>
            </div>

            <Field label="Training experience">
              <Segmented
                value={experience}
                onChange={setExperience}
                options={[
                  { value: "beginner", label: "Under 1 year" },
                  { value: "intermediate", label: "1-3 years" },
                  { value: "advanced", label: "3+ years" },
                ]}
              />
            </Field>

            <Field label="Daily activity outside the gym">
              <Select
                value={activity}
                onChange={(e) => setActivity(e.target.value as ActivityLevel)}
              >
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
                  <option key={a} value={a}>
                    {ACTIVITY_LABELS[a]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Injuries or limitations"
              hint="The coach will respect these when suggesting swaps."
            >
              <Input
                value={limitations}
                onChange={(e) => setLimitations(e.target.value)}
                placeholder="e.g. dodgy left shoulder, no overhead pressing"
              />
            </Field>

            <div className="rounded-lg border border-line bg-panel2 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
                <Target size={13} className="text-volt" /> Your starting targets
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                {[
                  { k: macros.calories, v: "kcal" },
                  { k: `${macros.proteinG}g`, v: "protein" },
                  { k: `${macros.carbsG}g`, v: "carbs" },
                  { k: `${macros.fatG}g`, v: "fat" },
                ].map((m) => (
                  <div key={m.v}>
                    <p className="font-display text-sm font-bold text-volt tnum">{m.k}</p>
                    <p className="text-[10px] text-faint">{m.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------ step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">Choose your programme</h2>
            <div className="space-y-2.5">
              {PROGRAMS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectProgram(p.id)}
                  className={cn(
                    "w-full rounded-lg border p-3.5 text-left transition",
                    p.id === programId
                      ? "border-volt bg-volt/8"
                      : "border-line bg-panel2 hover:border-line-strong",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-sm font-semibold">{p.name}</p>
                      <p className="mt-0.5 text-[11px] text-faint">{p.tagline}</p>
                    </div>
                    {p.id === programId && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-volt text-volt-ink">
                        <Check size={12} />
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{p.description}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    <Pill tone="volt">{p.daysPerWeek} days/week</Pill>
                    <Pill>{p.level}</Pill>
                    <Pill tone="ice">{p.mesocycleWeeks}-week cycle</Pill>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------ step 3 */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-display text-lg font-semibold">When are you training?</h2>
            <div>
              <p className="mb-2 text-xs text-muted">
                {program.name} suggests {program.daysPerWeek} days. Adjust if your week looks
                different.
              </p>
              <div className="flex flex-wrap gap-2">
                {DAY_KEYS.map((d) => (
                  <Chip
                    key={d}
                    active={trainingDays.includes(d)}
                    onClick={() =>
                      setTrainingDays((prev) =>
                        prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
                      )
                    }
                  >
                    {DAY_LABELS[d].slice(0, 3)}
                  </Chip>
                ))}
              </div>
            </div>

            <Field
              label="Usual training time"
              hint="We'll set reminders for these days. You can fine-tune each day later."
            >
              <Input
                type="time"
                value={trainTime}
                onChange={(e) => setTrainTime(e.target.value)}
                className="max-w-40"
              />
            </Field>

            <div className="rounded-lg border border-line bg-panel2 p-3 text-xs text-muted">
              <p className="font-medium text-ink">Your week</p>
              <ul className="mt-2 space-y-1">
                {DAY_KEYS.map((d) => {
                  const plan = program.days[d];
                  const on = trainingDays.includes(d);
                  return (
                    <li key={d} className="flex items-center justify-between">
                      <span className={on ? "text-ink" : "text-faint"}>
                        {DAY_LABELS[d]} — {plan.title}
                      </span>
                      {on && <span className="text-volt tnum">{trainTime}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------ step 4 */}
        {step === 4 && (
          <div className="space-y-4 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-volt/15 text-volt">
              <Sparkles size={26} />
            </span>
            <h2 className="font-display text-xl font-bold">You&apos;re set, {displayName || "lifter"}</h2>
            <p className="mx-auto max-w-md text-sm text-muted">
              {program.name} is loaded, {trainingDays.length} training days are scheduled, and your
              nutrition targets are calculated. Your first session is waiting on the dashboard.
            </p>
            <div className="mx-auto grid max-w-sm grid-cols-3 gap-2 pt-2">
              {[
                { k: `${program.daysPerWeek}`, v: "days/week" },
                { k: `${macros.calories}`, v: "kcal target" },
                { k: `${macros.proteinG}g`, v: "protein" },
              ].map((s) => (
                <div key={s.v} className="rounded-lg border border-line bg-panel2 p-3">
                  <p className="font-display text-lg font-bold text-volt tnum">{s.k}</p>
                  <p className="text-[10px] text-faint">{s.v}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-4">
          <Button variant="ghost" onClick={back} disabled={step === 0} icon={<ArrowLeft size={15} />}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onClick={next}>
              Continue <ArrowRight size={15} />
            </Button>
          ) : (
            <Button variant="primary" onClick={finish}>
              Enter IronPulse <ArrowRight size={15} />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
