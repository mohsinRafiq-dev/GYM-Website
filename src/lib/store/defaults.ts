import type { AppData, UserProfile, UserSettings } from "@/lib/types";
import { DEFAULT_PROGRAM_ID, getProgram } from "@/lib/data/programs";
import { slugify } from "@/lib/utils";

export function defaultSettings(): UserSettings {
  return {
    theme: "dark",
    units: "metric",
    defaultRestSeconds: 90,
    restAutoStart: true,
    soundEnabled: true,
    vibrationEnabled: true,
    tempoMetronome: false,
    weekStartsOn: "monday",
    reminders: {
      monday: "18:30",
      tuesday: "18:30",
      wednesday: "18:30",
      thursday: "18:30",
      friday: "18:30",
      saturday: "10:00",
      sunday: null,
    },
    reminderLeadMinutes: 30,
    notificationsEnabled: false,
    publicProfile: true,
    shareStatsWithTeam: true,
    streakRestAllowance: 2,
  };
}

export function defaultProfile(
  uid: string,
  email: string,
  displayName: string,
): UserProfile {
  const program = getProgram(DEFAULT_PROGRAM_ID);
  return {
    uid,
    email,
    displayName,
    handle: slugify(displayName || email.split("@")[0] || "lifter").slice(0, 20),
    createdAt: Date.now(),
    sex: "male",
    goals: ["build-muscle"],
    experience: "beginner",
    activity: "moderate",
    programId: program.id,
    trainingDays: (Object.values(program.days) as { key: UserProfile["trainingDays"][number]; type: string }[])
      .filter((d) => d.type !== "rest")
      .map((d) => d.key),
    units: "metric",
    onboarded: false,
  };
}

export function emptyAppData(profile: UserProfile): AppData {
  return {
    profile,
    settings: defaultSettings(),
    sessions: [],
    attendance: [],
    metrics: [],
    photos: [],
    nutrition: [],
    gamification: { xp: 0, level: 1, badges: [] },
    streak: { current: 0, longest: 0, freezesAvailable: 2, weeklyStreak: 0 },
    favorites: [],
    exerciseVideos: {},
    coachThread: [],
  };
}

/** Fill in anything a stored payload is missing after a schema change. */
export function hydrate(raw: Partial<AppData> | null, fallback: AppData): AppData {
  if (!raw) return fallback;
  return {
    profile: { ...fallback.profile, ...raw.profile },
    settings: { ...fallback.settings, ...raw.settings },
    sessions: raw.sessions ?? [],
    attendance: raw.attendance ?? [],
    metrics: raw.metrics ?? [],
    photos: raw.photos ?? [],
    nutrition: raw.nutrition ?? [],
    gamification: { ...fallback.gamification, ...raw.gamification },
    streak: { ...fallback.streak, ...raw.streak },
    favorites: raw.favorites ?? [],
    exerciseVideos: raw.exerciseVideos ?? {},
    teamId: raw.teamId,
    coachThread: raw.coachThread ?? [],
  };
}
