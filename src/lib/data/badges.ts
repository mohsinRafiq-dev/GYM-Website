import type { AppData, Badge } from "@/lib/types";
import { bestE1RMByExercise, computeStreak, totalVolume } from "@/lib/fitness";
import { daysBetween, toISODate } from "@/lib/utils";

export const BADGES: Badge[] = [
  { id: "first-rep", name: "First Rep", description: "You showed up and logged a session. Everything starts here.", icon: "🎯", tier: "bronze", criteria: "Complete 1 workout", xp: 50 },
  { id: "week-one", name: "Week One Down", description: "Seven days in and still moving.", icon: "📅", tier: "bronze", criteria: "Complete 3 workouts", xp: 75 },
  { id: "ten-sessions", name: "Double Digits", description: "Ten sessions logged. The habit is forming.", icon: "🔟", tier: "bronze", criteria: "Complete 10 workouts", xp: 120 },
  { id: "fifty-sessions", name: "Half Century", description: "Fifty sessions. You're not a beginner any more.", icon: "🏋️", tier: "silver", criteria: "Complete 50 workouts", xp: 400 },
  { id: "hundred-sessions", name: "Centurion", description: "One hundred logged sessions. Serious territory.", icon: "💯", tier: "gold", criteria: "Complete 100 workouts", xp: 900 },
  { id: "two-hundred", name: "Iron Lifer", description: "Two hundred sessions. This is who you are now.", icon: "⚔️", tier: "platinum", criteria: "Complete 200 workouts", xp: 2000 },

  { id: "streak-3", name: "Warming Up", description: "Three sessions in a row without breaking the chain.", icon: "🔥", tier: "bronze", criteria: "3-session streak", xp: 60 },
  { id: "streak-7", name: "On Fire", description: "A full week of consistency.", icon: "🔥", tier: "silver", criteria: "7-session streak", xp: 150 },
  { id: "streak-21", name: "Habit Locked", description: "Twenty-one sessions unbroken. This is what discipline looks like.", icon: "🧠", tier: "gold", criteria: "21-session streak", xp: 500 },
  { id: "streak-50", name: "Unbreakable", description: "Fifty in a row. Very few people ever see this badge.", icon: "💎", tier: "platinum", criteria: "50-session streak", xp: 1500 },
  { id: "weekly-4", name: "Four Weeks Straight", description: "Four consecutive weeks hitting the gym.", icon: "📈", tier: "silver", criteria: "4-week attendance streak", xp: 250 },
  { id: "weekly-12", name: "Quarter Committed", description: "Twelve straight weeks. A full training block, done.", icon: "🗓️", tier: "gold", criteria: "12-week attendance streak", xp: 700 },

  { id: "volume-10k", name: "Ten Tonnes", description: "10,000 kg moved across all your sessions.", icon: "🪨", tier: "bronze", criteria: "10,000 kg lifted", xp: 100 },
  { id: "volume-100k", name: "Hundred Tonnes", description: "100,000 kg of total volume. That's a loaded lorry.", icon: "🚛", tier: "silver", criteria: "100,000 kg lifted", xp: 450 },
  { id: "volume-500k", name: "Half a Million", description: "500,000 kg. Genuinely absurd.", icon: "🏔️", tier: "gold", criteria: "500,000 kg lifted", xp: 1200 },
  { id: "volume-1m", name: "Millionaire", description: "One million kilograms lifted. Legendary status.", icon: "👑", tier: "platinum", criteria: "1,000,000 kg lifted", xp: 3000 },

  { id: "bodyweight-bench", name: "Bodyweight Bench", description: "Benched your own bodyweight for a rep.", icon: "🛏️", tier: "silver", criteria: "Bench press ≥ bodyweight", xp: 300 },
  { id: "bodyweight-squat-2x", name: "Double Bodyweight Squat", description: "Squatted twice your bodyweight.", icon: "🦵", tier: "gold", criteria: "Squat ≥ 2× bodyweight", xp: 800 },
  { id: "deadlift-2x", name: "Double Bodyweight Deadlift", description: "Pulled twice your bodyweight off the floor.", icon: "🪝", tier: "gold", criteria: "Deadlift ≥ 2× bodyweight", xp: 800 },
  { id: "ten-pullups", name: "Ten Strict Pull-Ups", description: "Ten clean pull-ups in a single set.", icon: "🎪", tier: "silver", criteria: "10 reps in one pull-up set", xp: 300 },
  { id: "plate-club", name: "100 kg Club", description: "Hit a 100 kg lift on any barbell movement.", icon: "💪", tier: "silver", criteria: "Any lift ≥ 100 kg", xp: 250 },
  { id: "plate-club-140", name: "140 kg Club", description: "Three plates a side, for real.", icon: "🔩", tier: "gold", criteria: "Any lift ≥ 140 kg", xp: 600 },

  { id: "pr-first", name: "First PR", description: "Your first personal record. There will be many more.", icon: "⭐", tier: "bronze", criteria: "Set 1 personal record", xp: 80 },
  { id: "pr-25", name: "Record Breaker", description: "Twenty-five personal records set.", icon: "🏆", tier: "gold", criteria: "Set 25 personal records", xp: 700 },

  { id: "early-bird", name: "Early Bird", description: "Trained before 7am. The gym is empty and so are the excuses.", icon: "🌅", tier: "bronze", criteria: "Start a session before 07:00", xp: 100 },
  { id: "night-owl", name: "Night Owl", description: "Trained after 9pm.", icon: "🌙", tier: "bronze", criteria: "Start a session after 21:00", xp: 100 },
  { id: "marathon-session", name: "The Long Haul", description: "A session over 90 minutes. Respect.", icon: "⏱️", tier: "silver", criteria: "90+ minute session", xp: 180 },
  { id: "no-skip-leg-day", name: "Never Skips Leg Day", description: "Twenty leg sessions completed.", icon: "🍗", tier: "silver", criteria: "20 leg sessions", xp: 350 },
  { id: "full-week", name: "Perfect Week", description: "Every scheduled training day hit in one week.", icon: "✅", tier: "silver", criteria: "Hit every training day in a week", xp: 220 },
  { id: "comeback", name: "The Comeback", description: "Returned to training after two weeks away. Restarting is the hardest rep.", icon: "🔄", tier: "bronze", criteria: "Train again after a 14+ day gap", xp: 150 },

  { id: "tracker", name: "Data Nerd", description: "Logged ten body-weight measurements.", icon: "📊", tier: "bronze", criteria: "10 body metric entries", xp: 120 },
  { id: "team-player", name: "Team Player", description: "Joined a crew and trained alongside them.", icon: "🤝", tier: "bronze", criteria: "Join a team", xp: 100 },
  { id: "coach-curious", name: "Coachable", description: "Asked the AI coach for help ten times.", icon: "🧭", tier: "bronze", criteria: "10 coach conversations", xp: 100 },
  { id: "hydrated", name: "Hydrated", description: "Hit your water target seven days running.", icon: "💧", tier: "bronze", criteria: "7 days at water goal", xp: 120 },
];

const BADGE_BY_ID = new Map(BADGES.map((b) => [b.id, b]));
export const getBadge = (id: string) => BADGE_BY_ID.get(id);

/**
 * Evaluate every badge against the user's data and return the ids they qualify
 * for. Pure function — the caller diffs it against what's already earned.
 */
export function evaluateBadges(data: AppData): string[] {
  const done = data.sessions.filter((s) => s.completed);
  const count = done.length;
  const streak = computeStreak(data.attendance, {
    restAllowance: data.settings.streakRestAllowance,
  });
  const volume = totalVolume(done);
  const e1rm = bestE1RMByExercise(done);
  const bw =
    [...data.metrics]
      .filter((m) => m.weightKg)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0]?.weightKg ??
    data.profile.startWeightKg ??
    0;
  const prCount = done.reduce((n, s) => n + s.prs.length, 0);
  const earned: string[] = [];
  const give = (id: string, ok: boolean) => {
    if (ok) earned.push(id);
  };

  give("first-rep", count >= 1);
  give("week-one", count >= 3);
  give("ten-sessions", count >= 10);
  give("fifty-sessions", count >= 50);
  give("hundred-sessions", count >= 100);
  give("two-hundred", count >= 200);

  give("streak-3", streak.longest >= 3);
  give("streak-7", streak.longest >= 7);
  give("streak-21", streak.longest >= 21);
  give("streak-50", streak.longest >= 50);
  give("weekly-4", streak.weeklyStreak >= 4);
  give("weekly-12", streak.weeklyStreak >= 12);

  give("volume-10k", volume >= 10_000);
  give("volume-100k", volume >= 100_000);
  give("volume-500k", volume >= 500_000);
  give("volume-1m", volume >= 1_000_000);

  const maxLift = Math.max(0, ...Object.values(e1rm));
  give("plate-club", maxLift >= 100);
  give("plate-club-140", maxLift >= 140);
  give("bodyweight-bench", bw > 0 && (e1rm["barbell-bench-press"] ?? 0) >= bw);
  give("bodyweight-squat-2x", bw > 0 && (e1rm["back-squat"] ?? 0) >= bw * 2);
  give("deadlift-2x", bw > 0 && (e1rm["deadlift"] ?? 0) >= bw * 2);

  const pullupBest = done
    .flatMap((s) => s.exercises.filter((e) => e.exerciseId === "pull-up"))
    .flatMap((e) => e.sets)
    .filter((s) => s.completed && !s.warmup)
    .reduce((m, s) => Math.max(m, s.reps), 0);
  give("ten-pullups", pullupBest >= 10);

  give("pr-first", prCount >= 1);
  give("pr-25", prCount >= 25);

  give(
    "early-bird",
    done.some((s) => new Date(s.startedAt).getHours() < 7),
  );
  give(
    "night-owl",
    done.some((s) => new Date(s.startedAt).getHours() >= 21),
  );
  give(
    "marathon-session",
    done.some((s) => s.durationSeconds >= 90 * 60),
  );
  give(
    "no-skip-leg-day",
    done.filter((s) => /leg|lower|squat|posterior/i.test(s.title)).length >= 20,
  );

  // Perfect week: every scheduled day trained inside the current week.
  const today = toISODate();
  const thisWeek = data.attendance.filter(
    (a) => daysBetween(a.date, today) < 7 && daysBetween(a.date, today) >= 0,
  );
  const trainedDays = new Set(
    thisWeek.filter((a) => a.status === "trained").map((a) => a.dayKey),
  );
  give(
    "full-week",
    data.profile.trainingDays.length > 0 &&
      data.profile.trainingDays.every((d) => trainedDays.has(d)),
  );

  // Comeback: any 14+ day gap between consecutive sessions.
  const dates = done.map((s) => s.date).sort();
  give(
    "comeback",
    dates.some((d, i) => i > 0 && daysBetween(dates[i - 1], d) >= 14),
  );

  give("tracker", data.metrics.length >= 10);
  give("team-player", Boolean(data.teamId));
  give(
    "coach-curious",
    data.coachThread.filter((m) => m.role === "user").length >= 10,
  );
  give(
    "hydrated",
    data.nutrition.filter((n) => n.waterMl >= 2500).length >= 7,
  );

  return earned;
}
