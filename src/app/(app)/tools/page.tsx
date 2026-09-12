"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calculator,
  Dumbbell,
  Flame,
  Pause,
  Play,
  RotateCcw,
  Ruler,
  Scale,
  Timer,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Segmented } from "@/components/ui/form";
import { Pill } from "@/components/ui/feedback";
import { useData } from "@/lib/store/data-context";
import {
  ACTIVITY_LABELS,
  bmi,
  bmiBand,
  estimate1RM,
  macroTargets,
  navyBodyFat,
  percentOf1RM,
  platesPerSide,
  warmupRamp,
  weightForReps,
} from "@/lib/fitness";
import { sound } from "@/lib/sound";
import { clock, cmToIn, inToCm, kgToLb, lbToKg, round } from "@/lib/utils";
import type { ActivityLevel, Goal, Sex } from "@/lib/types";

export default function ToolsPage() {
  const { data } = useData();
  if (!data) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Gym tools"
        subtitle="The maths you'd otherwise do on your phone's calculator between sets."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <OneRepMax />
        <PlateLoader />
        <IntervalTimer soundOn={data.settings.soundEnabled} />
        <BodyCalculators />
        <MacroCalculator />
        <UnitConverter />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 1RM --- */

function OneRepMax() {
  const [weight, setWeight] = useState(80);
  const [reps, setReps] = useState(5);
  const max = estimate1RM(weight, reps);

  const table = [1, 2, 3, 5, 8, 10, 12, 15].map((r) => ({
    reps: r,
    weight: round(weightForReps(max, r), 1),
    pct: percentOf1RM(r),
  }));

  return (
    <Card>
      <CardHeader
        title="One-rep max calculator"
        subtitle="Blended Epley/Brzycki estimate — accurate up to about 10 reps"
        icon={<TrendingUp size={15} />}
      />
      <CardBody>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Weight lifted (kg)">
            <Input type="number" step="2.5" value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
          </Field>
          <Field label="Reps completed">
            <Input type="number" value={reps} onChange={(e) => setReps(Number(e.target.value))} />
          </Field>
        </div>

        <div className="mt-3 rounded-lg border border-volt/30 bg-volt/8 p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-faint">Estimated 1RM</p>
          <p className="font-display text-3xl font-bold text-volt tnum">{max} kg</p>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {table.map((t) => (
            <div key={t.reps} className="rounded-md bg-panel2 p-2 text-center">
              <p className="text-[10px] text-faint tnum">{t.reps} rep{t.reps > 1 ? "s" : ""}</p>
              <p className="text-sm font-semibold text-ink tnum">{t.weight}</p>
              <p className="text-[9px] text-faint tnum">{t.pct}%</p>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

/* -------------------------------------------------------------- plates --- */

function PlateLoader() {
  const [target, setTarget] = useState(100);
  const [bar, setBar] = useState(20);
  const result = platesPerSide(target, bar);
  const ramp = warmupRamp(target, bar);

  return (
    <Card>
      <CardHeader
        title="Plate loader & warm-up ramp"
        subtitle="What to hang on each side, and how to build up to it"
        icon={<Dumbbell size={15} />}
      />
      <CardBody>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Target weight (kg)">
            <Input type="number" step="2.5" value={target} onChange={(e) => setTarget(Number(e.target.value))} />
          </Field>
          <Field label="Bar">
            <Segmented
              value={String(bar)}
              onChange={(v) => setBar(Number(v))}
              options={[
                { value: "20", label: "20 kg" },
                { value: "15", label: "15 kg" },
                { value: "10", label: "10 kg" },
              ]}
            />
          </Field>
        </div>

        <div className="mt-3 rounded-lg border border-line bg-panel2 p-3">
          <p className="text-[10px] uppercase tracking-widest text-faint">Per side</p>
          {result.plates.length ? (
            <div className="mt-2 flex flex-wrap items-end gap-1.5">
              {result.plates.map((p, i) => (
                <span
                  key={i}
                  className="flex items-center justify-center rounded bg-ember/20 px-2 font-semibold text-ember tnum"
                  style={{ height: 24 + p * 1.1, fontSize: 11 }}
                >
                  {p}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-muted">Empty bar.</p>
          )}
          <p className="mt-2 text-xs text-muted tnum">
            Total on the bar: {result.achievableKg} kg
            {result.remainderKg > 0 && ` · ${result.remainderKg} kg short of target`}
          </p>
        </div>

        <div className="mt-3">
          <p className="mb-1.5 text-[10px] uppercase tracking-widest text-faint">Warm-up ramp</p>
          <ul className="space-y-1">
            {ramp.map((r, i) => (
              <li key={i} className="flex items-center justify-between rounded-md bg-panel2 px-2.5 py-1.5 text-xs">
                <span className="text-muted">{r.label}</span>
                <span className="font-semibold text-ink tnum">
                  {r.weightKg} kg × {r.reps}
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between rounded-md bg-volt/10 px-2.5 py-1.5 text-xs">
              <span className="font-medium text-volt">Working set</span>
              <span className="font-semibold text-volt tnum">{target} kg</span>
            </li>
          </ul>
        </div>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------- timer ---- */

function IntervalTimer({ soundOn }: { soundOn: boolean }) {
  const [mode, setMode] = useState<"stopwatch" | "interval">("interval");
  const [work, setWork] = useState(30);
  const [rest, setRest] = useState(90);
  const [rounds, setRounds] = useState(6);

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [phase, setPhase] = useState<"work" | "rest">("work");
  const [roundNo, setRoundNo] = useState(1);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      if (tick.current) clearInterval(tick.current);
      return;
    }
    tick.current = setInterval(() => {
      setElapsed((e) => {
        const next = e + 1;
        if (mode === "stopwatch") return next;

        const limit = phase === "work" ? work : rest;
        if (next >= limit) {
          if (soundOn) sound.restOver();
          if (phase === "work") {
            setPhase("rest");
          } else {
            if (roundNo >= rounds) {
              setRunning(false);
              setRoundNo(1);
              setPhase("work");
              return 0;
            }
            setRoundNo((r) => r + 1);
            setPhase("work");
          }
          return 0;
        }
        if (next === limit - 3 && soundOn) sound.countdown();
        return next;
      });
    }, 1000);
    return () => {
      if (tick.current) clearInterval(tick.current);
    };
  }, [running, mode, phase, work, rest, roundNo, rounds, soundOn]);

  const reset = () => {
    setRunning(false);
    setElapsed(0);
    setPhase("work");
    setRoundNo(1);
  };

  const limit = phase === "work" ? work : rest;
  const display = mode === "stopwatch" ? elapsed : Math.max(0, limit - elapsed);

  return (
    <Card>
      <CardHeader
        title="Timer"
        subtitle="Stopwatch for carries and planks, intervals for conditioning"
        icon={<Timer size={15} />}
        action={
          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m);
              reset();
            }}
            size="sm"
            options={[
              { value: "interval", label: "Interval" },
              { value: "stopwatch", label: "Stopwatch" },
            ]}
          />
        }
      />
      <CardBody>
        <div
          className={`rounded-lg border p-6 text-center ${
            mode === "interval" && phase === "work"
              ? "border-volt/40 bg-volt/8"
              : "border-line bg-panel2"
          }`}
        >
          <p className="font-display text-5xl font-bold tnum">{clock(display)}</p>
          {mode === "interval" && (
            <p className="mt-1 text-xs uppercase tracking-widest text-faint">
              {phase} · round {roundNo} of {rounds}
            </p>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => setRunning((r) => !r)}
            icon={running ? <Pause size={15} /> : <Play size={15} />}
          >
            {running ? "Pause" : "Start"}
          </Button>
          <Button variant="secondary" onClick={reset} icon={<RotateCcw size={15} />}>
            Reset
          </Button>
        </div>

        {mode === "interval" && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Field label="Work (s)">
              <Input type="number" value={work} onChange={(e) => setWork(Number(e.target.value))} />
            </Field>
            <Field label="Rest (s)">
              <Input type="number" value={rest} onChange={(e) => setRest(Number(e.target.value))} />
            </Field>
            <Field label="Rounds">
              <Input type="number" value={rounds} onChange={(e) => setRounds(Number(e.target.value))} />
            </Field>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------- body metrics --- */

function BodyCalculators() {
  const { data } = useData();
  const [heightCm, setHeightCm] = useState(data?.profile.heightCm ?? 175);
  const [weightKg, setWeightKg] = useState(data?.profile.startWeightKg ?? 75);
  const [waist, setWaist] = useState(82);
  const [neck, setNeck] = useState(38);
  const [hips, setHips] = useState(95);
  const [sex, setSex] = useState<Sex>(data?.profile.sex ?? "male");

  const bmiValue = bmi(weightKg, heightCm);
  const band = bmiBand(bmiValue);
  const bf = navyBodyFat({ sex, heightCm, waistCm: waist, neckCm: neck, hipsCm: hips });
  const leanMass = bf ? round(weightKg * (1 - bf / 100), 1) : null;

  return (
    <Card>
      <CardHeader
        title="Body composition"
        subtitle="BMI plus the US Navy tape estimate — track the trend, not the absolute"
        icon={<Ruler size={15} />}
      />
      <CardBody>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Height (cm)">
            <Input type="number" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} />
          </Field>
          <Field label="Weight (kg)">
            <Input type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} />
          </Field>
          <Field label="Waist (cm)">
            <Input type="number" step="0.5" value={waist} onChange={(e) => setWaist(Number(e.target.value))} />
          </Field>
          <Field label="Neck (cm)">
            <Input type="number" step="0.5" value={neck} onChange={(e) => setNeck(Number(e.target.value))} />
          </Field>
          {sex === "female" && (
            <Field label="Hips (cm)">
              <Input type="number" step="0.5" value={hips} onChange={(e) => setHips(Number(e.target.value))} />
            </Field>
          )}
          <Field label="Sex">
            <Segmented
              value={sex}
              onChange={setSex}
              size="sm"
              options={[
                { value: "male", label: "M" },
                { value: "female", label: "F" },
                { value: "other", label: "—" },
              ]}
            />
          </Field>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-line bg-panel2 p-3">
            <p className="text-[10px] uppercase tracking-widest text-faint">BMI</p>
            <p className="font-display text-xl font-bold tnum">{bmiValue}</p>
            <Pill tone={band.tone === "ok" ? "ok" : band.tone === "warn" ? "warn" : "danger"}>
              {band.label}
            </Pill>
          </div>
          <div className="rounded-lg border border-line bg-panel2 p-3">
            <p className="text-[10px] uppercase tracking-widest text-faint">Body fat</p>
            <p className="font-display text-xl font-bold tnum">{bf ? `${bf}%` : "—"}</p>
            <p className="text-[9px] text-faint">Navy estimate</p>
          </div>
          <div className="rounded-lg border border-line bg-panel2 p-3">
            <p className="text-[10px] uppercase tracking-widest text-faint">Lean mass</p>
            <p className="font-display text-xl font-bold tnum">{leanMass ? `${leanMass}` : "—"}</p>
            <p className="text-[9px] text-faint">kg</p>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-faint">
          BMI ignores muscle mass entirely — a lean, well-trained lifter will often read
          &ldquo;overweight&rdquo;. Use the waist measurement and photos as your real signal.
        </p>
      </CardBody>
    </Card>
  );
}

/* ----------------------------------------------------------- macros ----- */

function MacroCalculator() {
  const { data } = useData();
  const [weightKg, setWeightKg] = useState(data?.profile.startWeightKg ?? 75);
  const [heightCm, setHeightCm] = useState(data?.profile.heightCm ?? 175);
  const [age, setAge] = useState(
    data?.profile.birthYear ? new Date().getFullYear() - data.profile.birthYear : 25,
  );
  const [sex, setSex] = useState<Sex>(data?.profile.sex ?? "male");
  const [activity, setActivity] = useState<ActivityLevel>(data?.profile.activity ?? "moderate");
  const [goal, setGoal] = useState<Goal>(data?.profile.goals[0] ?? "build-muscle");

  const t = useMemo(
    () => macroTargets({ weightKg, heightCm, age, sex, activity, goal }),
    [weightKg, heightCm, age, sex, activity, goal],
  );

  return (
    <Card>
      <CardHeader
        title="Calorie & macro calculator"
        subtitle="Mifflin-St Jeor, then goal-adjusted"
        icon={<Calculator size={15} />}
      />
      <CardBody>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Weight (kg)">
            <Input type="number" step="0.5" value={weightKg} onChange={(e) => setWeightKg(Number(e.target.value))} />
          </Field>
          <Field label="Height (cm)">
            <Input type="number" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} />
          </Field>
          <Field label="Age">
            <Input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} />
          </Field>
        </div>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <Field label="Sex">
            <Segmented
              value={sex}
              onChange={setSex}
              size="sm"
              options={[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
                { value: "other", label: "Other" },
              ]}
            />
          </Field>
          <Field label="Goal">
            <Segmented
              value={goal}
              onChange={setGoal}
              size="sm"
              options={[
                { value: "build-muscle", label: "Build" },
                { value: "recomp", label: "Recomp" },
                { value: "lose-fat", label: "Cut" },
              ]}
            />
          </Field>
        </div>

        <Field label="Activity" className="mt-2">
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value as ActivityLevel)}
            className="h-10 w-full rounded-lg border border-line bg-panel2 px-3 text-sm text-ink"
          >
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
              <option key={a} value={a}>
                {ACTIVITY_LABELS[a]}
              </option>
            ))}
          </select>
        </Field>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { k: t.calories, v: "kcal/day", tone: "text-volt" },
            { k: `${t.proteinG}g`, v: "protein", tone: "text-ink" },
            { k: `${t.carbsG}g`, v: "carbs", tone: "text-ink" },
            { k: `${t.fatG}g`, v: "fat", tone: "text-ink" },
          ].map((s) => (
            <div key={s.v} className="rounded-lg border border-line bg-panel2 p-2.5 text-center">
              <p className={`font-display text-lg font-bold tnum ${s.tone}`}>{s.k}</p>
              <p className="text-[10px] text-faint">{s.v}</p>
            </div>
          ))}
        </div>

        <p className="mt-2 text-[11px] text-faint tnum">
          BMR {t.bmr} · maintenance {t.tdee} · adjustment {t.adjustment >= 0 ? "+" : ""}
          {t.adjustment} kcal · water {(t.waterMl / 1000).toFixed(1)} L
        </p>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------- conversions ---- */

function UnitConverter() {
  const [kg, setKg] = useState(100);
  const [cm, setCm] = useState(180);

  return (
    <Card>
      <CardHeader title="Unit converter" subtitle="For plates, tape measures and imported programmes" icon={<Scale size={15} />} />
      <CardBody className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kilograms">
            <Input type="number" step="0.5" value={kg} onChange={(e) => setKg(Number(e.target.value))} />
          </Field>
          <Field label="Pounds">
            <Input
              type="number"
              step="0.5"
              value={round(kgToLb(kg), 1)}
              onChange={(e) => setKg(lbToKg(Number(e.target.value)))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Centimetres">
            <Input type="number" step="0.5" value={cm} onChange={(e) => setCm(Number(e.target.value))} />
          </Field>
          <Field label="Inches">
            <Input
              type="number"
              step="0.1"
              value={round(cmToIn(cm), 1)}
              onChange={(e) => setCm(inToCm(Number(e.target.value)))}
            />
          </Field>
        </div>
        <div className="rounded-lg bg-panel2 p-2.5 text-xs text-muted">
          <p className="flex items-center gap-1.5">
            <Flame size={12} className="text-ember" />
            Common plate maths: 60 kg ≈ 132 lb · 100 kg ≈ 225 lb · 140 kg ≈ 315 lb
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
