import type {
  LoggedExercise,
  MuscleGroup,
  PersonalRecord,
  WorkoutSession,
} from "./types";
import { getExercise } from "./data/exercises";
import { bestE1RMByExercise, bestWeightByExercise, estimate1RM, sessionXP } from "./fitness";
import { sum } from "./utils";

/** Working (non-warmup, completed) sets only. */
export function workingSets(ex: LoggedExercise) {
  return ex.sets.filter((s) => s.completed && !s.warmup);
}

export function exerciseVolume(ex: LoggedExercise): number {
  return sum(workingSets(ex).map((s) => s.weightKg * s.reps));
}

/**
 * Recompute every derived field on a session and detect personal records
 * against the user's history. Called whenever a session is saved.
 */
export function summariseSession(
  session: WorkoutSession,
  history: WorkoutSession[],
  streak = 0,
): WorkoutSession {
  const past = history.filter((s) => s.id !== session.id && s.completed);
  const bestWeight = bestWeightByExercise(past);
  const bestE1rm = bestE1RMByExercise(past);
  const bestVolume: Record<string, number> = {};
  const bestReps: Record<string, number> = {};
  const seen = new Set<string>();
  for (const s of past) {
    for (const ex of s.exercises) {
      const working = workingSets(ex);
      if (working.length === 0) continue;
      seen.add(ex.exerciseId);
      const v = exerciseVolume(ex);
      if (v > (bestVolume[ex.exerciseId] ?? 0)) bestVolume[ex.exerciseId] = v;
      const reps = Math.max(...working.map((w) => w.reps));
      if (reps > (bestReps[ex.exerciseId] ?? 0)) bestReps[ex.exerciseId] = reps;
    }
  }

  let totalVolumeKg = 0;
  let totalSets = 0;
  let totalReps = 0;
  const volumeByMuscle: Partial<Record<MuscleGroup, number>> = {};
  const prs: PersonalRecord[] = [];

  for (const ex of session.exercises) {
    const sets = workingSets(ex);
    if (sets.length === 0) continue;

    const meta = getExercise(ex.exerciseId);
    const vol = sum(sets.map((s) => s.weightKg * s.reps));
    totalVolumeKg += vol;
    totalSets += sets.length;
    totalReps += sum(sets.map((s) => s.reps));

    if (meta) {
      for (const m of meta.primary) volumeByMuscle[m] = (volumeByMuscle[m] ?? 0) + sets.length;
      for (const m of meta.secondary)
        volumeByMuscle[m] = (volumeByMuscle[m] ?? 0) + sets.length * 0.5;
    }

    // A record needs a baseline: the first time a lift is logged sets it.
    // At most one record per exercise per session, strongest signal first.
    if (!seen.has(ex.exerciseId)) continue;

    const base = { exerciseId: ex.exerciseId, date: session.date, sessionId: session.id };
    const e1rm = Math.max(...sets.map((s) => estimate1RM(s.weightKg, s.reps)));
    const heaviest = Math.max(...sets.map((s) => s.weightKg));
    const topReps = Math.max(...sets.map((s) => s.reps));
    const prevE1rm = bestE1rm[ex.exerciseId] ?? 0;
    const prevWeight = bestWeight[ex.exerciseId] ?? 0;
    const prevVolume = bestVolume[ex.exerciseId] ?? 0;
    const prevReps = bestReps[ex.exerciseId] ?? 0;

    if (e1rm > 0 && e1rm >= prevE1rm + 0.5) {
      prs.push({ ...base, type: "e1rm", value: Math.round(e1rm * 10) / 10, previous: prevE1rm || undefined });
    } else if (heaviest > 0 && heaviest > prevWeight) {
      prs.push({ ...base, type: "weight", value: heaviest, previous: prevWeight || undefined });
    } else if (heaviest === 0 && topReps > prevReps) {
      // Bodyweight movements progress in reps.
      prs.push({ ...base, type: "reps", value: topReps, previous: prevReps || undefined });
    } else if (vol > 0 && prevVolume > 0 && vol > prevVolume * 1.02) {
      prs.push({ ...base, type: "volume", value: Math.round(vol), previous: Math.round(prevVolume) });
    }
  }

  const durationSeconds =
    session.durationSeconds ||
    Math.max(0, Math.round(((session.endedAt ?? Date.now()) - session.startedAt) / 1000));

  return {
    ...session,
    durationSeconds,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalSets,
    totalReps,
    volumeByMuscle,
    prs,
    xpEarned: sessionXP({
      totalVolumeKg,
      totalSets,
      durationSeconds,
      prCount: prs.length,
      streak,
    }),
  };
}

/** The last time this exercise was trained, for "last time you did…" hints. */
export function lastPerformance(
  exerciseId: string,
  history: WorkoutSession[],
): { date: string; sets: { weightKg: number; reps: number; rpe?: number }[] } | null {
  const sorted = [...history]
    .filter((s) => s.completed)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const s of sorted) {
    const ex = s.exercises.find((e) => e.exerciseId === exerciseId);
    const sets = ex ? workingSets(ex) : [];
    if (sets.length) {
      return {
        date: s.date,
        sets: sets.map((x) => ({ weightKg: x.weightKg, reps: x.reps, rpe: x.rpe })),
      };
    }
  }
  return null;
}
