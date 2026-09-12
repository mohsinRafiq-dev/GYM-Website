/* ============================================================================
 * Training science layer.
 * Everything a coach would compute on a clipboard: estimated maxes, warmup
 * ramps, weekly volume landmarks, progression calls, energy needs, streaks.
 * ========================================================================= */

import type {
  ActivityLevel,
  AttendanceRecord,
  DayKey,
  Goal,
  MacroTargets,
  MuscleGroup,
  Sex,
  StreakState,
  WorkoutSession,
} from "./types";
import { clamp, daysBetween, round, sum, toISODate } from "./utils";

/* ------------------------------------------------------ strength math ---- */

/** Epley — the everyday standard, accurate to ~10 reps. */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** Brzycki — slightly conservative, breaks down past 12 reps. */
export function brzycki1RM(weightKg: number, reps: number): number {
  if (reps <= 1) return weightKg;
  if (reps >= 37) return weightKg;
  return weightKg * (36 / (37 - reps));
}

/**
 * Blended estimate. We average the two common formulas below 10 reps and lean
 * on Epley beyond that, where Brzycki inflates badly.
 */
export function estimate1RM(weightKg: number, reps: number): number {
  if (!weightKg || !reps) return 0;
  if (reps === 1) return weightKg;
  if (reps > 12) return round(epley1RM(weightKg, reps), 1);
  return round((epley1RM(weightKg, reps) + brzycki1RM(weightKg, reps)) / 2, 1);
}

/** Weight predicted for a target rep count from a known 1RM. */
export function weightForReps(oneRM: number, reps: number): number {
  if (reps <= 1) return oneRM;
  return round(oneRM / (1 + reps / 30), 1);
}

/** Percentage of 1RM typically achievable for a rep count. */
export function percentOf1RM(reps: number): number {
  return round(100 / (1 + reps / 30), 0);
}

/** RPE → reps in reserve. */
export const rpeToRIR = (rpe: number) => Math.max(0, 10 - rpe);

/** Rough load adjustment to hit a target RPE from a logged set. */
export function loadForRPE(
  weightKg: number,
  reps: number,
  actualRPE: number,
  targetRPE: number,
): number {
  const oneRM = estimate1RM(weightKg, reps + rpeToRIR(actualRPE));
  const targetReps = reps + rpeToRIR(targetRPE);
  return weightForReps(oneRM, targetReps);
}

/**
 * Warmup ramp to a working weight. Empty bar → ~50/70/85% → work set.
 * Returns fewer steps for light loads; nobody ramps to a 12 kg curl.
 */
export function warmupRamp(
  workingKg: number,
  barKg = 20,
): { weightKg: number; reps: number; label: string }[] {
  if (workingKg <= barKg * 1.4) {
    return [{ weightKg: round(workingKg * 0.5, 1), reps: 12, label: "Feel it out" }];
  }
  const steps = [
    { pct: 0.4, reps: 10, label: "Groove" },
    { pct: 0.6, reps: 6, label: "Ramp" },
    { pct: 0.8, reps: 3, label: "Prime" },
    { pct: 0.9, reps: 1, label: "Potentiate" },
  ];
  const out = steps
    .filter((s) => workingKg * s.pct > barKg * 0.75)
    .map((s) => ({
      weightKg: roundToPlate(workingKg * s.pct),
      reps: s.reps,
      label: s.label,
    }));
  if (workingKg < 60) out.pop(); // no singles on light accessory work
  return out;
}

/** Round to the nearest loadable increment (2.5 kg default). */
export function roundToPlate(kg: number, increment = 2.5): number {
  return Math.max(increment, Math.round(kg / increment) * increment);
}

/** Plate breakdown per side for a barbell. */
export function platesPerSide(
  totalKg: number,
  barKg = 20,
  available: number[] = [25, 20, 15, 10, 5, 2.5, 1.25],
): { plates: number[]; achievableKg: number; remainderKg: number } {
  let perSide = (totalKg - barKg) / 2;
  if (perSide <= 0) return { plates: [], achievableKg: barKg, remainderKg: Math.max(0, totalKg - barKg) };
  const plates: number[] = [];
  for (const p of [...available].sort((a, b) => b - a)) {
    while (perSide >= p - 1e-9) {
      plates.push(p);
      perSide = round(perSide - p, 3);
    }
  }
  const achievable = barKg + 2 * sum(plates);
  return { plates, achievableKg: round(achievable, 2), remainderKg: round(perSide, 2) };
}

/* --------------------------------------------------- volume landmarks ---- */

/**
 * Weekly hard-set landmarks per muscle for hypertrophy, expressed as TOTAL
 * fractional sets: a set counts 1 for each primary mover and 0.5 for each
 * secondary mover — the counting method used in current volume research.
 *
 * Because compounds are included, muscles that squats, hinges and presses
 * hammer indirectly (glutes, front delts, forearms) carry higher ceilings
 * than the direct-work-only tables they are often quoted from.
 *
 * MV = maintenance, MEV = minimum effective, MAV = productive range,
 * MRV = most most people can recover from. A muscle with MEV 0 is maintained
 * by compound work alone and is never flagged as under-trained.
 */
export const VOLUME_LANDMARKS: Partial<
  Record<MuscleGroup, { mv: number; mev: number; mav: [number, number]; mrv: number }>
> = {
  chest: { mv: 4, mev: 8, mav: [12, 22], mrv: 26 },
  lats: { mv: 4, mev: 8, mav: [12, 22], mrv: 26 },
  "upper-back": { mv: 4, mev: 8, mav: [12, 24], mrv: 28 },
  traps: { mv: 0, mev: 4, mav: [8, 20], mrv: 26 },
  "front-delts": { mv: 0, mev: 4, mav: [8, 18], mrv: 24 },
  "side-delts": { mv: 4, mev: 8, mav: [12, 22], mrv: 26 },
  "rear-delts": { mv: 0, mev: 6, mav: [10, 20], mrv: 24 },
  biceps: { mv: 4, mev: 8, mav: [12, 22], mrv: 28 },
  triceps: { mv: 4, mev: 6, mav: [10, 22], mrv: 28 },
  forearms: { mv: 0, mev: 4, mav: [8, 20], mrv: 26 },
  quads: { mv: 4, mev: 8, mav: [12, 20], mrv: 24 },
  hamstrings: { mv: 3, mev: 6, mav: [10, 18], mrv: 22 },
  glutes: { mv: 3, mev: 6, mav: [10, 24], mrv: 30 },
  calves: { mv: 4, mev: 8, mav: [12, 18], mrv: 22 },
  abs: { mv: 0, mev: 4, mav: [8, 20], mrv: 25 },
  obliques: { mv: 0, mev: 0, mav: [4, 14], mrv: 18 },
  "lower-back": { mv: 0, mev: 0, mav: [4, 12], mrv: 18 },
  adductors: { mv: 0, mev: 0, mav: [4, 12], mrv: 16 },
  abductors: { mv: 0, mev: 0, mav: [4, 12], mrv: 16 },
};

export type VolumeVerdict = "under" | "optimal" | "high" | "over" | "none";

export function judgeVolume(muscle: MuscleGroup, sets: number): VolumeVerdict {
  const l = VOLUME_LANDMARKS[muscle];
  if (!l) return "none";
  if (sets === 0) return "none";
  if (sets < l.mev) return "under";
  if (sets <= l.mav[1]) return "optimal";
  if (sets <= l.mrv) return "high";
  return "over";
}

export const VOLUME_VERDICT_COPY: Record<VolumeVerdict, string> = {
  none: "Not trained this week",
  under: "Below the minimum effective dose — add a set or two",
  optimal: "In the growth sweet spot",
  high: "High but recoverable — watch fatigue",
  over: "Past your recoverable ceiling — pull it back",
};

/* ---------------------------------------------------------- analysis ---- */

/**
 * The date training started — the anchor for mesocycle weeks. Taken as the
 * minimum explicitly so it never depends on how the session list is ordered.
 */
export function firstSessionDate(sessions: WorkoutSession[]): string | undefined {
  let first: string | undefined;
  for (const s of sessions) if (s.completed && (!first || s.date < first)) first = s.date;
  return first;
}

/** Hard (non-warmup, completed) working sets per muscle across sessions. */
export function setsByMuscle(
  sessions: WorkoutSession[],
): Partial<Record<MuscleGroup, number>> {
  const out: Partial<Record<MuscleGroup, number>> = {};
  for (const s of sessions) {
    for (const [muscle, count] of Object.entries(s.volumeByMuscle)) {
      const m = muscle as MuscleGroup;
      out[m] = (out[m] ?? 0) + (count ?? 0);
    }
  }
  return out;
}

export function totalVolume(sessions: WorkoutSession[]): number {
  return sum(sessions.map((s) => s.totalVolumeKg));
}

/** Sessions in the last N days, newest first. */
export function recentSessions(sessions: WorkoutSession[], days: number): WorkoutSession[] {
  const today = toISODate();
  return sessions
    .filter((s) => s.completed && daysBetween(s.date, today) < days && daysBetween(s.date, today) >= 0)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/** Best estimated 1RM per exercise across all history. */
export function bestE1RMByExercise(sessions: WorkoutSession[]): Record<string, number> {
  const best: Record<string, number> = {};
  for (const s of sessions) {
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (!set.completed || set.warmup || !set.reps || !set.weightKg) continue;
        const e = estimate1RM(set.weightKg, set.reps);
        if (e > (best[ex.exerciseId] ?? 0)) best[ex.exerciseId] = e;
      }
    }
  }
  return best;
}

/** Heaviest completed working set per exercise. */
export function bestWeightByExercise(sessions: WorkoutSession[]): Record<string, number> {
  const best: Record<string, number> = {};
  for (const s of sessions) {
    for (const ex of s.exercises) {
      for (const set of ex.sets) {
        if (!set.completed || set.warmup) continue;
        if (set.weightKg > (best[ex.exerciseId] ?? 0)) best[ex.exerciseId] = set.weightKg;
      }
    }
  }
  return best;
}

/**
 * Double progression: hit the top of the rep range on every working set at or
 * below the target RPE → add load next time. Miss the bottom → back off.
 */
export function progressionAdvice(
  lastSets: { weightKg: number; reps: number; rpe?: number }[],
  repRange: [number, number],
  incrementKg = 2.5,
): { action: "increase" | "hold" | "decrease"; nextWeightKg: number; reason: string } {
  const working = lastSets.filter((s) => s.weightKg > 0 && s.reps > 0);
  if (working.length === 0) {
    return { action: "hold", nextWeightKg: 0, reason: "No logged sets yet — establish a baseline." };
  }
  const top = working[0].weightKg;
  const allAtTop = working.every((s) => s.reps >= repRange[1]);
  const anyBelowFloor = working.some((s) => s.reps < repRange[0]);
  const avgRPE = working.filter((s) => s.rpe).length
    ? sum(working.filter((s) => s.rpe).map((s) => s.rpe as number)) /
      working.filter((s) => s.rpe).length
    : undefined;

  if (allAtTop && (avgRPE === undefined || avgRPE <= 9)) {
    return {
      action: "increase",
      nextWeightKg: roundToPlate(top + incrementKg, incrementKg),
      reason: `You cleared ${repRange[1]} reps on every set. Add ${incrementKg} kg and rebuild the range.`,
    };
  }
  if (anyBelowFloor && (avgRPE ?? 10) >= 9.5) {
    return {
      action: "decrease",
      nextWeightKg: roundToPlate(top * 0.92, incrementKg),
      reason: `Sets fell under ${repRange[0]} reps at max effort. Drop ~8% and earn it back.`,
    };
  }
  return {
    action: "hold",
    nextWeightKg: top,
    reason: `Stay at ${top} kg and add reps until every set hits ${repRange[1]}.`,
  };
}

/**
 * Parse a prescription into a rep range: "8-12" → [8, 12], "10" → [10, 10],
 * "8-12 per leg" → [8, 12]. Timed or open-ended work ("30 seconds", "AMRAP")
 * has no rep range, so the fallback is returned.
 */
export function parseRepRange(reps: string, fallback: [number, number]): [number, number] {
  if (/ds*(s|sec|second|seconds|min|minutes?)/i.test(reps)) return fallback;
  const m = reps.match(/^s*(d+)s*(?:-s*(d+))?/);
  if (!m) return fallback;
  const lo = Number(m[1]);
  const hi = m[2] ? Number(m[2]) : lo;
  return lo > 0 && hi >= lo ? [lo, hi] : fallback;
}

/** Week 1-3 accumulate, week 4 deloads. Returns intensity/volume modifiers. */
export function mesocycleWeek(
  startDateISO: string,
  today = toISODate(),
  weeks = 4,
): { week: number; phase: "accumulation" | "intensification" | "peak" | "deload"; loadPct: number; setModifier: number; note: string } {
  const elapsed = Math.max(0, daysBetween(startDateISO, today));
  const week = (Math.floor(elapsed / 7) % weeks) + 1;
  if (week === weeks) {
    return {
      week,
      phase: "deload",
      loadPct: 0.6,
      setModifier: -0.4,
      note: "Deload week. Same movements, ~60% load, half the sets. Recover so week 1 hits harder.",
    };
  }
  const table = [
    { phase: "accumulation" as const, loadPct: 1, setModifier: 0, note: "Baseline week. Own the technique, log everything, leave 2-3 reps in reserve." },
    { phase: "intensification" as const, loadPct: 1.025, setModifier: 0.1, note: "Add a little load or a set. Target 1-2 reps in reserve." },
    { phase: "peak" as const, loadPct: 1.05, setModifier: 0.2, note: "Hardest week. Push the last set of each lift to 0-1 reps in reserve." },
  ];
  const t = table[Math.min(week - 1, table.length - 1)];
  return { week, ...t };
}

/* ---------------------------------------------------------- streaks ----- */

/**
 * A streak survives rest days. It breaks when a *scheduled training day* is
 * missed without a freeze, or when more than `restAllowance` consecutive
 * non-training days pass.
 */
export function computeStreak(
  attendance: AttendanceRecord[],
  opts: { restAllowance?: number; freezesAvailable?: number } = {},
): StreakState {
  const restAllowance = opts.restAllowance ?? 2;
  const byDate = new Map(attendance.map((a) => [a.date, a]));
  const trained = attendance
    .filter((a) => a.status === "trained" || a.status === "active-recovery")
    .map((a) => a.date)
    .sort();

  if (trained.length === 0) {
    return {
      current: 0,
      longest: 0,
      freezesAvailable: opts.freezesAvailable ?? 2,
      weeklyStreak: 0,
    };
  }

  const countRun = (dates: string[]): { runs: number[]; last: number } => {
    const runs: number[] = [];
    let run = 1;
    for (let i = 1; i < dates.length; i++) {
      const gap = daysBetween(dates[i - 1], dates[i]);
      let bridged = gap - 1 <= restAllowance;
      if (!bridged) {
        // A gap can still be bridged by explicit rest/freeze records.
        let excused = 0;
        for (let d = 1; d < gap; d++) {
          const iso = shiftISO(dates[i - 1], d);
          const rec = byDate.get(iso);
          if (rec && (rec.status === "rest" || rec.usedFreeze || rec.status === "sick" || rec.status === "travel")) {
            excused++;
          }
        }
        bridged = gap - 1 - excused <= restAllowance;
      }
      if (bridged) run++;
      else {
        runs.push(run);
        run = 1;
      }
    }
    runs.push(run);
    return { runs, last: run };
  };

  const { runs, last } = countRun(trained);
  const longest = Math.max(...runs);

  // The current run only stands if the last session is recent enough.
  const gapFromToday = daysBetween(trained[trained.length - 1], toISODate());
  const current = gapFromToday <= restAllowance + 1 ? last : 0;

  // Weekly streak: consecutive Mon-start weeks containing >= 1 session.
  const weeks = new Set(trained.map((d) => weekStamp(d)));
  let weeklyStreak = 0;
  let cursor = new Date();
  for (;;) {
    const stamp = weekStamp(toISODate(cursor));
    if (weeks.has(stamp)) {
      weeklyStreak++;
      cursor.setDate(cursor.getDate() - 7);
    } else if (weeklyStreak === 0 && weeks.has(weekStamp(toISODate(new Date(cursor.getTime() - 7 * 86400000))))) {
      // Current week not started yet — look back one week before giving up.
      cursor = new Date(cursor.getTime() - 7 * 86400000);
    } else break;
    if (weeklyStreak > 520) break;
  }

  return {
    current,
    longest,
    lastTrainedDate: trained[trained.length - 1],
    freezesAvailable: opts.freezesAvailable ?? 2,
    weeklyStreak,
  };
}

function shiftISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return toISODate(date);
}

function weekStamp(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return toISODate(date);
}

/** Share of scheduled training days actually trained over a window. */
export function adherence(
  attendance: AttendanceRecord[],
  trainingDays: DayKey[],
  weeks = 4,
): number {
  if (!trainingDays.length || attendance.length === 0) return 0;
  const today = toISODate();
  // Don't penalise a young account for weeks before it started tracking.
  const firstRecord = attendance.reduce((min, a) => (a.date < min ? a.date : min), today);
  const weeksTracked = Math.max(1, Math.ceil((daysBetween(firstRecord, today) + 1) / 7));
  const span = Math.min(weeks, weeksTracked);
  const target = trainingDays.length * span;
  const cutoff = span * 7;
  const hit = attendance.filter(
    (a) =>
      (a.status === "trained" || a.status === "active-recovery") &&
      daysBetween(a.date, today) < cutoff &&
      daysBetween(a.date, today) >= 0,
  ).length;
  return clamp(Math.round((hit / target) * 100), 0, 100);
}

/* ------------------------------------------------------ gamification ---- */

/**
 * Cumulative XP required to *reach* a level. Level 1 starts at 0.
 * Tuned so a consistent lifter reaches roughly level 8 in two months,
 * level 15 in five, and level 30 in about a year.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(400 * (level - 1) ** 1.6);
}

export function levelFromXP(xp: number): { level: number; into: number; need: number; pct: number } {
  let level = 1;
  while (level < 100 && xp >= xpForLevel(level + 1)) level++;
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const into = xp - base;
  const need = Math.max(1, next - base);
  return { level, into, need, pct: clamp(Math.round((into / need) * 100), 0, 100) };
}

export const LEVEL_TITLES: { min: number; title: string }[] = [
  { min: 1, title: "Rookie" },
  { min: 3, title: "Regular" },
  { min: 6, title: "Grinder" },
  { min: 10, title: "Iron Apprentice" },
  { min: 15, title: "Iron Veteran" },
  { min: 22, title: "Beast" },
  { min: 30, title: "Machine" },
  { min: 40, title: "Titan" },
  { min: 55, title: "Legend" },
];

export function levelTitle(level: number): string {
  return [...LEVEL_TITLES].reverse().find((t) => level >= t.min)?.title ?? "Rookie";
}

export function sessionXP(opts: {
  totalVolumeKg: number;
  totalSets: number;
  durationSeconds: number;
  prCount: number;
  streak: number;
}): number {
  // Showing up is most of the reward; effort, records and consistency top
  // it up, each capped so no single factor dominates the curve.
  const base = 60;
  const volume = Math.min(40, opts.totalVolumeKg / 250);
  const sets = Math.min(40, opts.totalSets * 2);
  const time = Math.min(20, opts.durationSeconds / 180);
  const prs = Math.min(60, opts.prCount * 20);
  const streakBonus = Math.min(30, opts.streak);
  return Math.round(base + volume + sets + time + prs + streakBonus);
}

/* --------------------------------------------------------- nutrition ---- */

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  "very-active": 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: "Desk job, little movement",
  light: "Light activity, 1-2 sessions/week",
  moderate: "Training 3-4x/week",
  active: "Training 5-6x/week",
  "very-active": "Training daily + physical job",
};

/** Mifflin-St Jeor. The most reliable predictive equation for general use. */
export function bmr(opts: { weightKg: number; heightCm: number; age: number; sex: Sex }): number {
  const { weightKg, heightCm, age, sex } = opts;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === "male") return Math.round(base + 5);
  if (sex === "female") return Math.round(base - 161);
  return Math.round(base - 78); // midpoint for unspecified
}

export function tdee(bmrValue: number, activity: ActivityLevel): number {
  return Math.round(bmrValue * ACTIVITY_FACTOR[activity]);
}

/**
 * Goal-adjusted calories and macros.
 * Protein is set per kg of bodyweight (the evidence-backed lever), fat gets a
 * floor for hormonal health, carbs take the remainder to fuel training.
 */
export function macroTargets(opts: {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activity: ActivityLevel;
  goal: Goal;
}): MacroTargets & { bmr: number; tdee: number; adjustment: number } {
  const b = bmr(opts);
  const maintenance = tdee(b, opts.activity);

  const adjust: Record<Goal, number> = {
    "build-muscle": 0.12,
    "lose-fat": -0.2,
    "get-strong": 0.08,
    recomp: -0.05,
    endurance: 0.05,
    "general-health": 0,
  };
  const factor = adjust[opts.goal] ?? 0;
  const calories = Math.round(maintenance * (1 + factor));

  const proteinPerKg = opts.goal === "lose-fat" || opts.goal === "recomp" ? 2.2 : 1.9;
  const proteinG = Math.round(opts.weightKg * proteinPerKg);
  const fatG = Math.max(
    Math.round(opts.weightKg * 0.8),
    Math.round((calories * 0.22) / 9),
  );
  const remaining = calories - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(50, Math.round(remaining / 4));

  return {
    calories,
    proteinG,
    carbsG,
    fatG,
    fiberG: Math.round((calories / 1000) * 14),
    waterMl: Math.round(opts.weightKg * 35 + 500),
    bmr: b,
    tdee: maintenance,
    adjustment: Math.round(calories - maintenance),
  };
}

export function bmi(weightKg: number, heightCm: number): number {
  if (!heightCm) return 0;
  return round(weightKg / (heightCm / 100) ** 2, 1);
}

export function bmiBand(value: number): { label: string; tone: "ok" | "warn" | "danger" } {
  if (value < 18.5) return { label: "Underweight", tone: "warn" };
  if (value < 25) return { label: "Healthy range", tone: "ok" };
  if (value < 30) return { label: "Overweight", tone: "warn" };
  return { label: "Obese range", tone: "danger" };
}

/**
 * U.S. Navy body-fat estimate. Waist/neck/height in cm (hips too, for women).
 * Cheap and repeatable — trend matters far more than the absolute number.
 */
export function navyBodyFat(opts: {
  sex: Sex;
  heightCm: number;
  waistCm: number;
  neckCm: number;
  hipsCm?: number;
}): number | null {
  const { sex, heightCm, waistCm, neckCm, hipsCm } = opts;
  if (!heightCm || !waistCm || !neckCm) return null;
  try {
    if (sex === "female") {
      if (!hipsCm) return null;
      const v =
        163.205 * Math.log10(waistCm + hipsCm - neckCm) -
        97.684 * Math.log10(heightCm) -
        78.387;
      return v > 0 ? round(v, 1) : null;
    }
    const v =
      86.01 * Math.log10(waistCm - neckCm) - 70.041 * Math.log10(heightCm) + 36.76;
    return v > 0 ? round(v, 1) : null;
  } catch {
    return null;
  }
}

/** Litres of water for a training day. */
export function hydrationTarget(weightKg: number, trainingDay: boolean): number {
  return round((weightKg * 0.035 + (trainingDay ? 0.7 : 0.2)), 2);
}
