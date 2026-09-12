/* ============================================================================
 * IronPulse domain model
 * Single source of truth for every entity that crosses the data layer.
 * ========================================================================= */

/* ------------------------------------------------------------ anatomy ---- */

export type MuscleGroup =
  | "chest"
  | "upper-back"
  | "lats"
  | "traps"
  | "lower-back"
  | "front-delts"
  | "side-delts"
  | "rear-delts"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "obliques"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "adductors"
  | "abductors"
  | "neck"
  | "cardio";

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  "upper-back": "Upper Back",
  lats: "Lats",
  traps: "Traps",
  "lower-back": "Lower Back",
  "front-delts": "Front Delts",
  "side-delts": "Side Delts",
  "rear-delts": "Rear Delts",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  abs: "Abs",
  obliques: "Obliques",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  adductors: "Adductors",
  abductors: "Abductors",
  neck: "Neck",
  cardio: "Cardio",
};

/** Coarse buckets used for volume balance charts and program tagging. */
export type MuscleRegion = "push" | "pull" | "legs" | "core" | "cardio";

export const MUSCLE_REGION: Record<MuscleGroup, MuscleRegion> = {
  chest: "push",
  "front-delts": "push",
  "side-delts": "push",
  triceps: "push",
  "upper-back": "pull",
  lats: "pull",
  traps: "pull",
  "rear-delts": "pull",
  biceps: "pull",
  forearms: "pull",
  "lower-back": "pull",
  quads: "legs",
  hamstrings: "legs",
  glutes: "legs",
  calves: "legs",
  adductors: "legs",
  abductors: "legs",
  abs: "core",
  obliques: "core",
  neck: "core",
  cardio: "cardio",
};

export type Equipment =
  | "barbell"
  | "dumbbell"
  | "machine"
  | "cable"
  | "smith"
  | "bodyweight"
  | "kettlebell"
  | "band"
  | "ez-bar"
  | "bench"
  | "pullup-bar"
  | "medicine-ball"
  | "cardio-machine"
  | "none";

export type Mechanic = "compound" | "isolation";
export type ForceType = "push" | "pull" | "static" | "hinge" | "carry";
export type Difficulty = "beginner" | "intermediate" | "advanced";

/**
 * Movement pattern drives the animated SVG demonstration.
 * Each value maps to a keyframe rig in `lib/animation/patterns.ts`.
 */
export type MovementPattern =
  | "squat"
  | "hinge"
  | "lunge"
  | "bench-press"
  | "pushup"
  | "overhead-press"
  | "lateral-raise"
  | "chest-fly"
  | "row"
  | "pulldown"
  | "pullup"
  | "curl"
  | "triceps-extension"
  | "triceps-pushdown"
  | "dip"
  | "shrug"
  | "face-pull"
  | "leg-extension"
  | "leg-curl"
  | "hip-thrust"
  | "calf-raise"
  | "crunch"
  | "plank"
  | "russian-twist"
  | "run"
  | "jump";

/* ----------------------------------------------------------- exercise ---- */

export interface ExerciseMedia {
  /** YouTube video id — embedded when present. */
  youtubeId?: string;
  /** Fallback search phrase used to open a form-video search. */
  searchQuery: string;
  /** Optional still image (remote or /public). */
  image?: string;
}

export interface Exercise {
  id: string;
  name: string;
  aliases?: string[];
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
  equipment: Equipment[];
  mechanic: Mechanic;
  force: ForceType;
  difficulty: Difficulty;
  pattern: MovementPattern;
  /** Unilateral movements are logged per side. */
  unilateral?: boolean;
  /** One-line "why this exercise earns a slot". */
  purpose: string;
  setup: string[];
  execution: string[];
  cues: string[];
  mistakes: string[];
  breathing: string;
  /** eccentric-pause-concentric-pause, e.g. "3-1-1-0" */
  tempo: string;
  /** Range of motion / safety notes a coach would shout across the floor. */
  safety?: string[];
  /** Exercise ids that train the same slot. */
  substitutions: string[];
  /** Typical working range for hypertrophy. */
  repRange: [number, number];
  /** Seconds. */
  restSeconds: number;
  /** Rough activation weight per muscle, 0–1, for the heat map. */
  activation: Partial<Record<MuscleGroup, number>>;
  media: ExerciseMedia;
  /** Higher = better bang-for-buck; used to rank library + substitutions. */
  rating: number;
}

/* ------------------------------------------------------------ program ---- */

export type DayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export const DAY_KEYS: DayKey[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const DAY_LABELS: Record<DayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

export const DAY_SHORT: Record<DayKey, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

export type SessionType =
  | "strength"
  | "hypertrophy"
  | "conditioning"
  | "mobility"
  | "rest";

export interface PrescribedSet {
  sets: number;
  /** Display string: "8-10", "12", "AMRAP", "30s" */
  reps: string;
  /** Rate of perceived exertion target (reps in reserve = 10 - rpe). */
  rpe: number;
  restSeconds: number;
  tempo?: string;
  /** Same letter = superset performed back to back. */
  supersetGroup?: string;
  note?: string;
  /** Drop set / rest-pause / myo-reps intensifier on the final set. */
  intensifier?: "drop-set" | "rest-pause" | "myo-reps" | "partials" | "none";
}

export interface PlannedExercise extends PrescribedSet {
  exerciseId: string;
  /** Order within the session. */
  order: number;
  /** Marks the session's main strength lift for PR tracking. */
  keyLift?: boolean;
}

export interface WorkoutDay {
  key: DayKey;
  /** "Chest & Triceps" */
  title: string;
  /** "Push A" */
  focus: string;
  type: SessionType;
  /** Muscles hammered this day, for the weekly map. */
  targets: MuscleGroup[];
  estimatedMinutes: number;
  /** Trainer's brief for the day. */
  brief: string;
  /** Warmup protocol. */
  warmup: string[];
  exercises: PlannedExercise[];
  /** Finisher / conditioning block. */
  finisher?: string[];
  cooldown: string[];
  /** Coaching notes: what to chase, what to avoid. */
  coachNotes: string[];
}

export interface Program {
  id: string;
  name: string;
  tagline: string;
  description: string;
  daysPerWeek: number;
  level: Difficulty;
  goal: Goal[];
  /** Weeks in one mesocycle before the deload. */
  mesocycleWeeks: number;
  equipmentNeeded: Equipment[];
  days: Record<DayKey, WorkoutDay>;
  /** Progression policy shown to the user and used by the coach. */
  progression: string[];
}

/* --------------------------------------------------------------- user ---- */

export type Goal =
  | "build-muscle"
  | "lose-fat"
  | "get-strong"
  | "recomp"
  | "endurance"
  | "general-health";

export const GOAL_LABELS: Record<Goal, string> = {
  "build-muscle": "Build Muscle",
  "lose-fat": "Lose Fat",
  "get-strong": "Get Stronger",
  recomp: "Recomposition",
  endurance: "Endurance",
  "general-health": "General Health",
};

export type Units = "metric" | "imperial";
export type Sex = "male" | "female" | "other";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very-active";
export type ExperienceLevel = Difficulty;

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  handle: string;
  bio?: string;
  createdAt: number;

  sex: Sex;
  birthYear?: number;
  heightCm?: number;
  startWeightKg?: number;
  targetWeightKg?: number;

  goals: Goal[];
  experience: ExperienceLevel;
  activity: ActivityLevel;
  programId: string;
  /** Days the user commits to training. */
  trainingDays: DayKey[];
  /** Injuries / limitations the coach must respect. */
  limitations?: string;

  units: Units;
  onboarded: boolean;
}

export interface UserSettings {
  theme: "dark" | "light" | "system";
  units: Units;
  defaultRestSeconds: number;
  restAutoStart: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  tempoMetronome: boolean;
  weekStartsOn: "monday" | "sunday";
  /** Per-day reminder times, "HH:mm" or null when off. */
  reminders: Partial<Record<DayKey, string | null>>;
  reminderLeadMinutes: number;
  notificationsEnabled: boolean;
  publicProfile: boolean;
  shareStatsWithTeam: boolean;
  /** Weekly rest-day allowance that will not break a streak. */
  streakRestAllowance: number;
}

/* -------------------------------------------------------------- logs ----- */

export interface LoggedSet {
  id: string;
  setNumber: number;
  weightKg: number;
  reps: number;
  rpe?: number;
  /** Warmup sets do not count toward working volume. */
  warmup?: boolean;
  completed: boolean;
  /** Unilateral: "left" | "right" | undefined for bilateral. */
  side?: "left" | "right";
  note?: string;
  timestamp: number;
}

export interface LoggedExercise {
  exerciseId: string;
  sets: LoggedSet[];
  note?: string;
  /** Swapped in for the planned exercise. */
  substitutedFor?: string;
}

export interface WorkoutSession {
  id: string;
  uid: string;
  /** ISO date, "2026-09-03" */
  date: string;
  dayKey: DayKey;
  programId: string;
  title: string;
  startedAt: number;
  endedAt?: number;
  durationSeconds: number;
  exercises: LoggedExercise[];
  /** Derived, denormalised for cheap dashboard reads. */
  totalVolumeKg: number;
  totalSets: number;
  totalReps: number;
  /** Per-muscle set counts, denormalised. */
  volumeByMuscle: Partial<Record<MuscleGroup, number>>;
  mood?: 1 | 2 | 3 | 4 | 5;
  energy?: 1 | 2 | 3 | 4 | 5;
  soreness?: 1 | 2 | 3 | 4 | 5;
  note?: string;
  prs: PersonalRecord[];
  xpEarned: number;
  completed: boolean;
}

export interface PersonalRecord {
  exerciseId: string;
  type: "weight" | "reps" | "volume" | "e1rm";
  value: number;
  previous?: number;
  date: string;
  sessionId?: string;
}

/* -------------------------------------------------------- attendance ---- */

export type AttendanceStatus =
  | "trained"
  | "rest"
  | "missed"
  | "active-recovery"
  | "sick"
  | "travel";

export interface AttendanceRecord {
  /** ISO date, doc id. */
  date: string;
  uid: string;
  status: AttendanceStatus;
  dayKey: DayKey;
  sessionId?: string;
  checkInAt: number;
  location?: "gym" | "home" | "outdoor" | "other";
  note?: string;
  /** Consumes a freeze token to protect a streak. */
  usedFreeze?: boolean;
}

export interface StreakState {
  current: number;
  longest: number;
  lastTrainedDate?: string;
  freezesAvailable: number;
  /** Weeks in a row hitting the weekly target. */
  weeklyStreak: number;
}

/* ---------------------------------------------------------- body data ---- */

export interface BodyMetric {
  id: string;
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
  /** All circumferences in cm. */
  chest?: number;
  waist?: number;
  hips?: number;
  leftArm?: number;
  rightArm?: number;
  leftThigh?: number;
  rightThigh?: number;
  calf?: number;
  shoulders?: number;
  neck?: number;
  note?: string;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  pose: "front" | "side" | "back";
  /** Data URL in local mode, Storage URL in Firebase mode. */
  url: string;
  weightKg?: number;
  note?: string;
}

/* --------------------------------------------------------- nutrition ---- */

export interface MacroTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  waterMl: number;
}

export interface NutritionLog {
  date: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
  entries: { id: string; name: string; kcal: number; p: number; c: number; f: number }[];
}

export interface MealItem {
  name: string;
  qty: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
}

export interface Meal {
  slot: "breakfast" | "mid-morning" | "lunch" | "pre-workout" | "post-workout" | "dinner" | "before-bed";
  title: string;
  time: string;
  items: MealItem[];
  note?: string;
}

export interface MealPlan {
  id: string;
  name: string;
  goal: Goal;
  diet: "veg" | "non-veg" | "eggetarian";
  /** kcal the template is written for; scales linearly. */
  baseCalories: number;
  meals: Meal[];
  notes: string[];
}

/* -------------------------------------------------------------- team ---- */

export type TeamRole = "owner" | "coach" | "member";

export interface TeamMember {
  uid: string;
  displayName: string;
  photoURL?: string;
  handle: string;
  role: TeamRole;
  joinedAt: number;
  acceptedTermsAt?: number;
  /** Denormalised for a fast leaderboard read. */
  stats: {
    currentStreak: number;
    sessionsThisWeek: number;
    sessionsTotal: number;
    volumeThisWeekKg: number;
    xp: number;
    level: number;
    lastActive: number;
  };
}

export interface TeamChallenge {
  id: string;
  title: string;
  description: string;
  metric: "sessions" | "volume" | "streak" | "attendance";
  target: number;
  startDate: string;
  endDate: string;
  createdBy: string;
}

export interface TeamPost {
  id: string;
  uid: string;
  authorName: string;
  authorPhoto?: string;
  body: string;
  kind: "announcement" | "cheer" | "pr" | "checkin";
  createdAt: number;
  pinned?: boolean;
}

export interface Team {
  id: string;
  name: string;
  motto: string;
  /** Shareable join code. */
  code: string;
  ownerUid: string;
  createdAt: number;
  photoURL?: string;
  maxMembers: number;
  /** Everyone must accept these before full access. */
  rules: string[];
  terms: string;
  programId?: string;
  /** Weekly session target every member signs up to. */
  weeklyTarget: number;
  privacy: "invite-only" | "open";
  members: TeamMember[];
  challenge?: TeamChallenge;
  posts: TeamPost[];
}

/* ------------------------------------------------------ gamification ---- */

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: BadgeTier;
  /** Human-readable unlock condition. */
  criteria: string;
  xp: number;
}

export interface EarnedBadge {
  badgeId: string;
  earnedAt: number;
}

export interface GamificationState {
  xp: number;
  level: number;
  badges: EarnedBadge[];
}

/* ---------------------------------------------------------- ai coach ---- */

export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  /** Set when produced by the offline analyst instead of the API. */
  offline?: boolean;
}

/** Compact snapshot handed to the coach so answers are grounded in real data. */
export interface CoachContext {
  profile: {
    name: string;
    goals: string[];
    experience: string;
    programName: string;
    trainingDays: string[];
    limitations?: string;
    heightCm?: number;
    weightKg?: number;
    age?: number;
    sex?: string;
  };
  today: { dayKey: string; title: string; focus: string; exercises: string[] } | null;
  streak: { current: number; longest: number };
  last14Days: {
    date: string;
    title: string;
    volumeKg: number;
    sets: number;
    durationMin: number;
  }[];
  weeklySetsByMuscle: Record<string, number>;
  recentPRs: { exercise: string; type: string; value: number; date: string }[];
  bodyweightTrend: { date: string; kg: number }[];
  adherence: { last4Weeks: number; targetPerWeek: number };
}

/* ------------------------------------------------------------ misc ------ */

export interface AppData {
  profile: UserProfile;
  settings: UserSettings;
  sessions: WorkoutSession[];
  attendance: AttendanceRecord[];
  metrics: BodyMetric[];
  photos: ProgressPhoto[];
  nutrition: NutritionLog[];
  gamification: GamificationState;
  streak: StreakState;
  favorites: string[];
  /** Per-exercise custom video links the crew adds themselves. */
  exerciseVideos: Record<string, string>;
  teamId?: string;
  coachThread: CoachMessage[];
}
