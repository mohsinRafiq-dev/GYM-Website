/* ============================================================================
 * Demo data generator.
 *
 * Produces eight weeks of plausible history so the dashboard, charts, streaks
 * and the AI coach all have something real to work with the moment someone
 * opens the demo account.
 * ========================================================================= */

import type {
  AppData,
  AttendanceRecord,
  BodyMetric,
  LoggedSet,
  WorkoutSession,
} from "@/lib/types";
import { getProgram } from "@/lib/data/programs";
import { getExercise } from "@/lib/data/exercises";
import { computeStreak, levelFromXP } from "@/lib/fitness";
import { summariseSession } from "@/lib/session-utils";
import { addDays, dayKeyOf, round, toISODate, uid } from "@/lib/utils";
import { evaluateBadges, getBadge } from "@/lib/data/badges";

/** Deterministic PRNG so the demo looks the same on every machine. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const STARTING_LOAD: Record<string, number> = {
  "barbell-bench-press": 60,
  "incline-barbell-press": 50,
  "incline-dumbbell-press": 22,
  "dumbbell-bench-press": 24,
  "machine-chest-press": 45,
  "cable-fly": 12,
  "dips-chest": 0,
  "close-grip-bench": 50,
  "back-squat": 80,
  "front-squat": 55,
  "leg-press": 140,
  "hack-squat": 80,
  "bulgarian-split-squat": 16,
  "romanian-deadlift": 70,
  deadlift: 100,
  "trap-bar-deadlift": 90,
  "leg-extension": 45,
  "lying-leg-curl": 40,
  "seated-leg-curl": 45,
  "hip-thrust": 80,
  "standing-calf-raise": 60,
  "seated-calf-raise": 40,
  "overhead-press": 40,
  "dumbbell-shoulder-press": 18,
  "lateral-raise": 8,
  "cable-lateral-raise": 6,
  "reverse-pec-deck": 25,
  "face-pull": 20,
  "barbell-shrug": 70,
  "pull-up": 0,
  "lat-pulldown": 55,
  "barbell-row": 60,
  "seated-cable-row": 55,
  "chest-supported-row": 20,
  "straight-arm-pulldown": 25,
  "barbell-curl": 30,
  "incline-dumbbell-curl": 12,
  "hammer-curl": 14,
  "preacher-curl": 25,
  "cable-curl": 20,
  "reverse-curl": 18,
  "skull-crusher": 25,
  "overhead-triceps-extension": 22,
  "triceps-pushdown": 30,
  "farmer-carry": 30,
  "cable-crunch": 30,
  "hanging-leg-raise": 0,
};

function baseLoad(exerciseId: string): number {
  if (STARTING_LOAD[exerciseId] !== undefined) return STARTING_LOAD[exerciseId];
  const ex = getExercise(exerciseId);
  if (!ex) return 20;
  if (ex.equipment.includes("bodyweight")) return 0;
  if (ex.equipment.includes("dumbbell")) return 12;
  if (ex.equipment.includes("barbell")) return 40;
  return 30;
}

function targetReps(reps: string): number {
  const m = reps.match(/\d+/);
  return m ? Number(m[0]) : 10;
}

export function buildDemoData(base: AppData): AppData {
  const rand = rng(20260903);
  const program = getProgram("aesthetic-6");
  const sessions: WorkoutSession[] = [];
  const attendance: AttendanceRecord[] = [];
  const metrics: BodyMetric[] = [];

  const WEEKS = 8;
  const start = addDays(new Date(), -(WEEKS * 7 - 1));

  for (let i = 0; i < WEEKS * 7; i++) {
    const date = addDays(start, i);
    const iso = toISODate(date);
    const dayKey = dayKeyOf(date);
    const plan = program.days[dayKey];
    const week = Math.floor(i / 7);
    const deload = week % 4 === 3;

    if (plan.type === "rest") {
      attendance.push({
        date: iso,
        uid: base.profile.uid,
        status: "rest",
        dayKey,
        checkInAt: date.getTime(),
      });
      continue;
    }

    // A realistic person misses the odd session.
    const showedUp = rand() > (deload ? 0.25 : 0.12);
    if (!showedUp) {
      attendance.push({
        date: iso,
        uid: base.profile.uid,
        status: rand() > 0.5 ? "rest" : "missed",
        dayKey,
        checkInAt: date.getTime(),
      });
      continue;
    }

    if (plan.type === "mobility") {
      attendance.push({
        date: iso,
        uid: base.profile.uid,
        status: "active-recovery",
        dayKey,
        checkInAt: date.getTime(),
        location: "home",
      });
      continue;
    }

    const startedAt = new Date(date).setHours(18, 30, 0, 0);
    const exercises = plan.exercises.map((planned) => {
      const load = baseLoad(planned.exerciseId);
      // Load steps up every second week (~4.5%), the way an intermediate
      // actually progresses; deload weeks drop to 65%.
      const growth = 1 + Math.floor(week / 2) * 0.045;
      const factor = deload ? 0.65 : growth;
      const working = load
        ? Math.max(2.5, Math.round((load * factor) / 2.5) * 2.5)
        : 0;
      const reps = targetReps(planned.reps);

      const sets: LoggedSet[] = Array.from({ length: planned.sets }).map((_, idx) => ({
        id: uid("set"),
        setNumber: idx + 1,
        weightKg: working,
        // Reps drift down slightly across sets, as they do in real life.
        reps: Math.max(3, reps - Math.floor(idx / 2) - (rand() > 0.75 ? 1 : 0)),
        rpe: Math.min(10, planned.rpe + (idx >= planned.sets - 1 ? 0.5 : 0)),
        completed: true,
        timestamp: startedAt + idx * 180_000,
      }));

      return { exerciseId: planned.exerciseId, sets };
    });

    const durationSeconds = Math.round((plan.estimatedMinutes + (rand() * 16 - 8)) * 60);
    const draft: WorkoutSession = {
      id: uid("ses"),
      uid: base.profile.uid,
      date: iso,
      dayKey,
      programId: program.id,
      title: plan.title,
      startedAt,
      endedAt: startedAt + durationSeconds * 1000,
      durationSeconds,
      exercises,
      totalVolumeKg: 0,
      totalSets: 0,
      totalReps: 0,
      volumeByMuscle: {},
      mood: (Math.min(5, Math.max(2, Math.round(3 + rand() * 2))) as 2 | 3 | 4 | 5),
      energy: (Math.min(5, Math.max(2, Math.round(3 + rand() * 2))) as 2 | 3 | 4 | 5),
      note: deload ? "Deload week — kept everything light and crisp." : undefined,
      prs: [],
      xpEarned: 0,
      completed: true,
    };

    sessions.push(summariseSession(draft, sessions, 0));
    attendance.push({
      date: iso,
      uid: base.profile.uid,
      status: "trained",
      dayKey,
      sessionId: draft.id,
      checkInAt: startedAt,
      location: "gym",
    });

    // Weekly weigh-in every Monday.
    if (dayKey === "monday") {
      metrics.push({
        id: uid("m"),
        date: iso,
        weightKg: round(74 + week * 0.35 + (rand() - 0.5) * 0.6, 1),
        waist: round(83 - week * 0.15 + (rand() - 0.5) * 0.4, 1),
        chest: round(99 + week * 0.2, 1),
        rightArm: round(35.5 + week * 0.12, 1),
        leftArm: round(35.2 + week * 0.12, 1),
        rightThigh: round(57 + week * 0.2, 1),
        neck: 38,
      });
    }
  }

  const xp = sessions.reduce((n, s) => n + s.xpEarned, 0);
  const streak = computeStreak(attendance, { restAllowance: 2 });

  const data: AppData = {
    ...base,
    profile: {
      ...base.profile,
      displayName: "Demo Lifter",
      handle: "demo",
      sex: "male",
      birthYear: 1999,
      heightCm: 178,
      startWeightKg: 74,
      targetWeightKg: 82,
      goals: ["build-muscle", "get-strong"],
      experience: "intermediate",
      activity: "active",
      programId: "aesthetic-6",
      onboarded: true,
      bio: "Chasing a proper V-taper with the crew. Bench 100 by December.",
    },
    sessions,
    attendance,
    metrics,
    streak,
    gamification: {
      xp,
      level: levelFromXP(xp).level,
      badges: [],
    },
    favorites: ["barbell-bench-press", "pull-up", "romanian-deadlift"],
    coachThread: [],
  };

  // Replay the history so each badge carries the moment it was actually
  // earned, instead of every badge claiming it unlocked today.
  const earnedAt = new Map<string, number>();
  const chronological = [...sessions].sort((a, b) => (a.date < b.date ? -1 : 1));
  for (let i = 0; i < chronological.length; i++) {
    const cutoff = chronological[i].date;
    const partial: AppData = {
      ...data,
      sessions: chronological.slice(0, i + 1),
      attendance: attendance.filter((a) => a.date <= cutoff),
      metrics: metrics.filter((m) => m.date <= cutoff),
    };
    const at = chronological[i].endedAt ?? chronological[i].startedAt;
    for (const id of evaluateBadges(partial)) if (!earnedAt.has(id)) earnedAt.set(id, at);
  }
  // Badges judged against "this week" can only be confirmed now.
  for (const id of evaluateBadges(data)) if (!earnedAt.has(id)) earnedAt.set(id, Date.now());

  data.gamification.badges = [...earnedAt.entries()].map(([badgeId, at]) => ({
    badgeId,
    earnedAt: at,
  }));
  data.gamification.xp =
    xp + data.gamification.badges.reduce((n, b) => n + (getBadge(b.badgeId)?.xp ?? 0), 0);
  data.gamification.level = levelFromXP(data.gamification.xp).level;

  return data;
}
