/* ============================================================================
 * Coaching intelligence.
 *
 * Two jobs:
 *  1. Build the compact, grounded snapshot the AI coach reasons over.
 *  2. Provide a deterministic analyst that produces genuinely useful coaching
 *     without any API key — used for dashboard insights and as the coach's
 *     offline fallback.
 * ========================================================================= */

import type { AppData, CoachContext, MuscleGroup } from "./types";
import { MUSCLE_LABELS, DAY_LABELS } from "./types";
import { getProgram } from "./data/programs";
import { exerciseName, getExercise } from "./data/exercises";
import {
  VOLUME_LANDMARKS,
  adherence,
  bestE1RMByExercise,
  judgeVolume,
  mesocycleWeek,
  recentSessions,
  setsByMuscle,
  totalVolume,
} from "./fitness";
import { lastPerformance } from "./session-utils";
import { dayKeyOf, daysBetween, round, toISODate, weekRange } from "./utils";

export function buildCoachContext(data: AppData): CoachContext {
  const program = getProgram(data.profile.programId);
  const todayKey = dayKeyOf();
  const today = program.days[todayKey];
  const done = data.sessions.filter((s) => s.completed);
  const last14 = recentSessions(done, 14);
  const { start } = weekRange();
  const weekSessions = done.filter((s) => s.date >= toISODate(start));

  const weeklySets = setsByMuscle(weekSessions);
  const weeklySetsByMuscle: Record<string, number> = {};
  for (const [k, v] of Object.entries(weeklySets)) {
    weeklySetsByMuscle[MUSCLE_LABELS[k as MuscleGroup] ?? k] = Math.round(v ?? 0);
  }

  const latestWeight = [...data.metrics]
    .filter((m) => m.weightKg)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  return {
    profile: {
      name: data.profile.displayName,
      goals: data.profile.goals,
      experience: data.profile.experience,
      programName: program.name,
      trainingDays: data.profile.trainingDays.map((d) => DAY_LABELS[d]),
      limitations: data.profile.limitations,
      heightCm: data.profile.heightCm,
      weightKg: latestWeight?.weightKg ?? data.profile.startWeightKg,
      age: data.profile.birthYear
        ? new Date().getFullYear() - data.profile.birthYear
        : undefined,
      sex: data.profile.sex,
    },
    today:
      today.type === "rest"
        ? null
        : {
            dayKey: todayKey,
            title: today.title,
            focus: today.focus,
            exercises: today.exercises.map(
              (e) => `${exerciseName(e.exerciseId)} ${e.sets}x${e.reps} @RPE${e.rpe}`,
            ),
          },
    streak: { current: data.streak.current, longest: data.streak.longest },
    last14Days: last14.map((s) => ({
      date: s.date,
      title: s.title,
      volumeKg: Math.round(s.totalVolumeKg),
      sets: s.totalSets,
      durationMin: Math.round(s.durationSeconds / 60),
    })),
    weeklySetsByMuscle,
    recentPRs: done
      .flatMap((s) => s.prs)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 10)
      .map((p) => ({
        exercise: exerciseName(p.exerciseId),
        type: p.type,
        value: p.value,
        date: p.date,
      })),
    bodyweightTrend: [...data.metrics]
      .filter((m) => m.weightKg)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 10)
      .reverse()
      .map((m) => ({ date: m.date, kg: m.weightKg as number })),
    adherence: {
      last4Weeks: adherence(data.attendance, data.profile.trainingDays, 4),
      targetPerWeek: data.profile.trainingDays.length,
    },
  };
}

/* ------------------------------------------------------------ insights -- */

export interface Insight {
  id: string;
  title: string;
  body: string;
  tone: "good" | "warn" | "info" | "danger";
  action?: { label: string; href: string };
}

/**
 * Deterministic analysis. Every statement here is derived from the user's own
 * numbers — no guessing, no generic filler.
 */
export function generateInsights(data: AppData): Insight[] {
  const out: Insight[] = [];
  const done = data.sessions.filter((s) => s.completed);
  const program = getProgram(data.profile.programId);
  const { start } = weekRange();
  const weekSessions = done.filter((s) => s.date >= toISODate(start));
  const target = data.profile.trainingDays.length || program.daysPerWeek;

  /* --- consistency ------------------------------------------------------ */
  const adh = adherence(data.attendance, data.profile.trainingDays, 4);
  if (done.length === 0) {
    out.push({
      id: "start",
      title: "Nothing logged yet",
      body: `Your programme is loaded and ${DAY_LABELS[dayKeyOf()]} is ${program.days[dayKeyOf()].title}. The first session is the only one that's genuinely hard.`,
      tone: "info",
      action: { label: "Start today's session", href: "/train" },
    });
  } else if (adh >= 90) {
    out.push({
      id: "adherence-high",
      title: `${adh}% adherence over four weeks`,
      body: "That is elite-level consistency. At this rate your programme is limited by recovery and nutrition, not by effort.",
      tone: "good",
    });
  } else if (adh < 60) {
    out.push({
      id: "adherence-low",
      title: `Adherence is ${adh}%`,
      body: `You're hitting roughly ${Math.round((adh / 100) * target)} of ${target} planned sessions a week. Consider dropping to a ${Math.max(3, Math.round((adh / 100) * target))}-day programme you'll actually complete — a finished 4-day week beats a skipped 6-day one.`,
      tone: "warn",
      action: { label: "Change programme", href: "/settings" },
    });
  }

  /* --- weekly volume ---------------------------------------------------- */
  const weekly = setsByMuscle(weekSessions);
  const under: string[] = [];
  const over: string[] = [];
  for (const muscle of Object.keys(VOLUME_LANDMARKS) as MuscleGroup[]) {
    const sets = Math.round(weekly[muscle] ?? 0);
    const verdict = judgeVolume(muscle, sets);
    if (verdict === "over") over.push(MUSCLE_LABELS[muscle]);
    // Only flag "under" once the week is genuinely underway.
    if (verdict === "under" && weekSessions.length >= Math.max(2, target - 2)) {
      under.push(MUSCLE_LABELS[muscle]);
    }
  }
  if (over.length) {
    out.push({
      id: "volume-over",
      title: `${over.slice(0, 3).join(", ")} past your recoverable ceiling`,
      body: "Sets beyond your maximum recoverable volume add fatigue without adding growth. Cut 2-4 sets there next week and put the effort into a muscle that's under-trained.",
      tone: "danger",
      action: { label: "See the balance", href: "/progress" },
    });
  }
  if (under.length) {
    out.push({
      id: "volume-under",
      title: `${under.slice(0, 3).join(", ")} below the minimum effective dose`,
      body: `You're not doing enough weekly sets there to drive growth. Two or three extra sets — ideally on a day you're already training those muscles — closes the gap.`,
      tone: "warn",
      action: { label: "Find exercises", href: "/exercises" },
    });
  }

  /* --- stalled lifts ---------------------------------------------------- */
  const e1rm = bestE1RMByExercise(done);
  const keyLifts = Object.values(program.days)
    .flatMap((d) => d.exercises.filter((e) => e.keyLift))
    .map((e) => e.exerciseId);
  for (const liftId of Array.from(new Set(keyLifts)).slice(0, 6)) {
    const perf = lastPerformance(liftId, done);
    if (!perf) continue;
    const attempts = done
      .filter((s) => s.exercises.some((e) => e.exerciseId === liftId))
      .slice(0, 4);
    if (attempts.length < 3) continue;
    const tops = attempts.map((s) => {
      const ex = s.exercises.find((e) => e.exerciseId === liftId)!;
      return Math.max(0, ...ex.sets.filter((x) => !x.warmup).map((x) => x.weightKg));
    });
    const stalled = tops.every((t) => Math.abs(t - tops[0]) < 0.01);
    if (stalled && tops[0] > 0) {
      const ex = getExercise(liftId);
      out.push({
        id: `stall-${liftId}`,
        title: `${exerciseName(liftId)} has stalled at ${tops[0]} kg`,
        body: `Three or more sessions at the same load. Options, in order: push for extra reps until every set hits ${ex?.repRange[1] ?? 10}, then add the smallest increment; or drop 10% and rebuild with better bar speed. Estimated 1RM right now: ${round(e1rm[liftId] ?? 0, 1)} kg.`,
        tone: "warn",
        action: { label: "Open the lift", href: `/exercises/${liftId}` },
      });
      break; // one stall callout is enough
    }
  }

  /* --- deload ----------------------------------------------------------- */
  if (done.length >= 8) {
    const firstDate = done[done.length - 1].date;
    const meso = mesocycleWeek(firstDate, toISODate(), program.mesocycleWeeks);
    if (meso.phase === "deload") {
      out.push({
        id: "deload",
        title: `Week ${meso.week} — deload`,
        body: meso.note,
        tone: "info",
      });
    } else {
      out.push({
        id: "meso",
        title: `Week ${meso.week} — ${meso.phase}`,
        body: meso.note,
        tone: "info",
      });
    }
  }

  /* --- bodyweight vs goal ---------------------------------------------- */
  const weights = [...data.metrics]
    .filter((m) => m.weightKg)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  if (weights.length >= 3) {
    const first = weights[Math.max(0, weights.length - 5)];
    const last = weights[weights.length - 1];
    const days = Math.max(1, daysBetween(first.date, last.date));
    const perWeek = (((last.weightKg ?? 0) - (first.weightKg ?? 0)) / days) * 7;
    const goal = data.profile.goals[0];
    const direction = perWeek > 0.05 ? "gaining" : perWeek < -0.05 ? "losing" : "holding";
    let verdict = "That's a sensible rate.";
    if (goal === "build-muscle" && perWeek > 0.6) {
      verdict = "That's faster than you can build muscle — trim 200 kcal or you're mostly adding fat.";
    } else if (goal === "build-muscle" && perWeek < 0) {
      verdict = "You're in a deficit while trying to grow. Add roughly 300 kcal a day.";
    } else if (goal === "lose-fat" && perWeek > -0.2) {
      verdict = "Fat loss has stalled. Tighten the food logging for a week before cutting calories further.";
    } else if (goal === "lose-fat" && perWeek < -1) {
      verdict = "That's fast enough to cost you muscle. Ease the deficit and keep protein high.";
    }
    out.push({
      id: "weight-trend",
      title: `${direction === "holding" ? "Bodyweight steady" : `${direction} ${Math.abs(round(perWeek, 2))} kg/week`}`,
      body: `${round(last.weightKg ?? 0, 1)} kg as of ${last.date}. ${verdict}`,
      tone: "info",
      action: { label: "Log a weigh-in", href: "/progress" },
    });
  } else if (data.metrics.length < 2) {
    out.push({
      id: "no-metrics",
      title: "No bodyweight data",
      body: "Weigh in every Monday morning after the toilet, before food. Without a trend line, nothing about your nutrition can be judged.",
      tone: "info",
      action: { label: "Add a measurement", href: "/progress" },
    });
  }

  /* --- weekly pace ------------------------------------------------------ */
  if (weekSessions.length && weekSessions.length < target) {
    const left = target - weekSessions.length;
    out.push({
      id: "week-pace",
      title: `${weekSessions.length} of ${target} sessions done this week`,
      body: `${left} session${left === 1 ? "" : "s"} left to hit your target. Total volume so far: ${Math.round(totalVolume(weekSessions)).toLocaleString()} kg.`,
      tone: "info",
    });
  }

  return out;
}

/**
 * Offline coach. Routes a free-text question to the most relevant deterministic
 * answer. Not as flexible as the API, but never wrong about the user's numbers.
 */
export function offlineCoachReply(question: string, data: AppData): string {
  const q = question.toLowerCase();
  const insights = generateInsights(data);
  const program = getProgram(data.profile.programId);
  const done = data.sessions.filter((s) => s.completed);
  const { start } = weekRange();
  const weekSessions = done.filter((s) => s.date >= toISODate(start));

  const bullet = (items: string[]) => items.map((i) => `• ${i}`).join("\n");

  if (/plateau|stall|stuck|not progress/.test(q)) {
    const stall = insights.find((i) => i.id.startsWith("stall-"));
    return [
      stall ? `**${stall.title}**\n\n${stall.body}` : "Nothing in your log has stalled for three or more sessions yet.",
      "",
      "**The standard plateau checklist, in order:**",
      bullet([
        "Sleep — under 7 hours reliably kills strength progress before anything else does.",
        "Calories — you cannot add load indefinitely at maintenance.",
        "Volume — if a muscle is under its minimum effective sets, add 2-3 sets before changing anything clever.",
        "Fatigue — three hard weeks then a deload. Skipping deloads is the most common cause of a 'sudden' plateau.",
        "Technique — a stall at a consistent sticking point is usually a positional weakness, not a strength one.",
      ]),
    ].join("\n");
  }

  if (/volume|sets|how much/.test(q)) {
    const weekly = setsByMuscle(weekSessions);
    const rows = (Object.keys(VOLUME_LANDMARKS) as MuscleGroup[])
      .map((m) => ({ m, sets: Math.round(weekly[m] ?? 0), verdict: judgeVolume(m, Math.round(weekly[m] ?? 0)) }))
      .filter((r) => r.sets > 0)
      .sort((a, b) => b.sets - a.sets)
      .slice(0, 8);
    return [
      `**Your week so far** (${weekSessions.length} session${weekSessions.length === 1 ? "" : "s"}):`,
      "",
      rows.length
        ? bullet(
            rows.map(
              (r) =>
                `${MUSCLE_LABELS[r.m]}: ${r.sets} hard sets — ${
                  r.verdict === "optimal"
                    ? "in the growth range"
                    : r.verdict === "under"
                      ? "below the minimum effective dose"
                      : r.verdict === "high"
                        ? "high but recoverable"
                        : "past your recoverable ceiling"
                }`,
            ),
          )
        : "No working sets logged this week yet.",
      "",
      "10-20 hard sets per muscle per week is the range most people grow in. Under 10 is maintenance; past your ceiling just adds fatigue.",
    ].join("\n");
  }

  if (/diet|nutrition|eat|calorie|protein|macro/.test(q)) {
    const w = data.metrics.find((m) => m.weightKg)?.weightKg ?? data.profile.startWeightKg ?? 75;
    return [
      `**Protein first:** ${Math.round(w * 1.8)}-${Math.round(w * 2.2)} g a day at your bodyweight. That single number matters more than every other nutrition decision combined.`,
      "",
      bullet([
        `Calories: your targets are on the Nutrition page, calculated from your height, weight, age and activity.`,
        "Carbs go around training — before for fuel, after for recovery.",
        "Fat has a floor of about 0.6 g/kg for hormonal health. Don't go below it.",
        "Judge progress on a 7-day weight average, never a single morning.",
      ]),
    ].join("\n");
  }

  if (/today|what should i do|workout now/.test(q)) {
    const todayPlan = program.days[dayKeyOf()];
    if (todayPlan.type === "rest") {
      return `Today is a scheduled rest day on ${program.name}. ${todayPlan.brief}`;
    }
    return [
      `**${todayPlan.title}** — ${todayPlan.focus}`,
      "",
      todayPlan.brief,
      "",
      bullet(
        todayPlan.exercises.map(
          (e) => `${exerciseName(e.exerciseId)} — ${e.sets} × ${e.reps} @ RPE ${e.rpe}, ${e.restSeconds}s rest`,
        ),
      ),
    ].join("\n");
  }

  if (/streak|attendance|consistent/.test(q)) {
    return [
      `**Current streak: ${data.streak.current}** (best: ${data.streak.longest}).`,
      `Four-week adherence: ${adherence(data.attendance, data.profile.trainingDays, 4)}% of your ${data.profile.trainingDays.length} scheduled days.`,
      "",
      "Rest days don't break a streak — only missing a scheduled training day does. You have freeze tokens for genuine emergencies.",
    ].join("\n");
  }

  // Default: a full readout.
  return [
    `Here's where you actually stand, ${data.profile.displayName}:`,
    "",
    bullet([
      `${done.length} sessions logged, ${Math.round(totalVolume(done)).toLocaleString()} kg moved in total.`,
      `Current streak ${data.streak.current}, best ${data.streak.longest}.`,
      `Programme: ${program.name} (${program.daysPerWeek} days/week).`,
      `This week: ${weekSessions.length} of ${data.profile.trainingDays.length} planned sessions.`,
    ]),
    "",
    ...insights.slice(0, 3).map((i) => `**${i.title}** — ${i.body}`),
    "",
    "_Offline coach: add an ANTHROPIC_API_KEY to .env.local for full conversational coaching._",
  ].join("\n");
}
