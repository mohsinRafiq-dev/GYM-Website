/* ============================================================================
 * Training programs.
 *
 * Each program is a full week written the way a coach would hand it over:
 * a brief, a warm-up protocol, ordered work with sets/reps/RPE/rest/tempo,
 * a finisher, a cool-down and the notes that stop people wrecking themselves.
 * ========================================================================= */

import type {
  DayKey,
  MuscleGroup,
  PlannedExercise,
  Program,
  SessionType,
  WorkoutDay,
} from "@/lib/types";
import { getExercise } from "./exercises";

interface WorkInput {
  id: string;
  sets: number;
  reps: string;
  rpe: number;
  rest: number;
  tempo?: string;
  ss?: string;
  note?: string;
  key?: boolean;
  intensifier?: PlannedExercise["intensifier"];
}

const work = (items: WorkInput[]): PlannedExercise[] =>
  items.map((w, i) => ({
    exerciseId: w.id,
    order: i + 1,
    sets: w.sets,
    reps: w.reps,
    rpe: w.rpe,
    restSeconds: w.rest,
    tempo: w.tempo,
    supersetGroup: w.ss,
    note: w.note,
    keyLift: w.key,
    intensifier: w.intensifier ?? "none",
  }));

interface DayInput {
  key: DayKey;
  title: string;
  focus: string;
  type: SessionType;
  targets: MuscleGroup[];
  minutes: number;
  brief: string;
  warmup?: string[];
  items?: WorkInput[];
  finisher?: string[];
  cooldown?: string[];
  notes?: string[];
}

const GENERAL_WARMUP = [
  "5 minutes easy cardio — bike, rower or brisk incline walk until you break a light sweat.",
  "Dynamic mobility: 10 leg swings each way, 10 arm circles, 10 cat-cows.",
];

const UPPER_WARMUP = [
  ...GENERAL_WARMUP,
  "15 band pull-aparts + 10 band shoulder pass-throughs.",
  "2 ramp-up sets on the first lift: 50% x 8, then 75% x 3.",
];

const LOWER_WARMUP = [
  ...GENERAL_WARMUP,
  "10 bodyweight squats, 8 walking lunges per leg, 10 glute bridges.",
  "Ramp the first lift: empty bar x 10, 50% x 5, 70% x 3, 85% x 1.",
];

const STANDARD_COOLDOWN = [
  "3-5 minutes easy walking to bring the heart rate down.",
  "Stretch the muscles you trained: 30-45 seconds per position, 2 rounds.",
  "Log the session while it's fresh — weights, reps, RPE and how it felt.",
];

const day = (d: DayInput): WorkoutDay => ({
  key: d.key,
  title: d.title,
  focus: d.focus,
  type: d.type,
  targets: d.targets,
  estimatedMinutes: d.minutes,
  brief: d.brief,
  warmup: d.warmup ?? GENERAL_WARMUP,
  exercises: work(d.items ?? []),
  finisher: d.finisher,
  cooldown: d.cooldown ?? STANDARD_COOLDOWN,
  coachNotes: d.notes ?? [],
});

const restDay = (key: DayKey, title = "Full Rest"): WorkoutDay =>
  day({
    key,
    title,
    focus: "Recovery",
    type: "rest",
    targets: [],
    minutes: 0,
    brief:
      "Complete rest. Muscle is built between sessions, not during them — this day is doing real work even though it doesn't feel like it.",
    warmup: [],
    items: [],
    cooldown: [
      "Aim for 7-9 hours of sleep tonight.",
      "Hit your protein target — recovery is a nutrition problem as much as a training one.",
      "10-15 minutes of easy walking is fine and helps blood flow.",
    ],
    notes: [
      "If you're still badly sore from two days ago, that's a signal your volume or sleep needs attention.",
      "Use today to prep meals and plan tomorrow's session.",
    ],
  });

const mobilityDay = (key: DayKey): WorkoutDay =>
  day({
    key,
    title: "Active Recovery & Mobility",
    focus: "Blood flow, mobility, decompression",
    type: "mobility",
    targets: ["cardio"],
    minutes: 40,
    brief:
      "Easy movement to flush soreness, restore range of motion and keep the habit alive without adding fatigue. Nothing here should feel hard.",
    warmup: ["2 minutes of easy walking or gentle cycling to warm the tissue."],
    items: [
      { id: "incline-walk", sets: 1, reps: "25-30 min", rpe: 4, rest: 0, note: "Zone 2 — you should be able to hold a conversation." },
      { id: "cat-cow", sets: 2, reps: "10", rpe: 3, rest: 30 },
      { id: "worlds-greatest-stretch", sets: 2, reps: "5 per side", rpe: 3, rest: 30 },
      { id: "hip-90-90", sets: 2, reps: "8 per side", rpe: 3, rest: 30 },
      { id: "couch-stretch", sets: 2, reps: "60s per side", rpe: 4, rest: 30 },
      { id: "thoracic-opener", sets: 2, reps: "8", rpe: 3, rest: 30 },
      { id: "shoulder-dislocates", sets: 2, reps: "12", rpe: 3, rest: 30 },
    ],
    cooldown: [
      "Finish with 5 minutes of slow nasal breathing — genuinely speeds recovery.",
      "Hydrate and take an honest look at your week: what did you skip, and why?",
    ],
    notes: [
      "If you're beaten up, do half of this and go home. Recovery days should subtract fatigue, not add it.",
      "This day still counts for your streak — check in.",
    ],
  });

/* ==========================================================================
 * 1. Aesthetic Hypertrophy — the default six-day split
 * ======================================================================= */

const aesthetic6: Program = {
  id: "aesthetic-6",
  name: "Aesthetic Hypertrophy",
  tagline: "6 days · the classic V-taper build",
  description:
    "A six-day body-part split built around the muscles that change how a physique reads: upper chest, lats, side delts and arms. Every session opens with one heavy compound in the 5-8 range for strength, then moves into 8-20 rep work where most of the growth happens. This is the plan to run if your goal is to look like you lift.",
  daysPerWeek: 6,
  level: "intermediate",
  goal: ["build-muscle", "recomp", "get-strong"],
  mesocycleWeeks: 4,
  equipmentNeeded: ["barbell", "dumbbell", "cable", "machine", "bench", "pullup-bar"],
  progression: [
    "Double progression: when every working set hits the top of the rep range at the target RPE, add the smallest available load next session.",
    "Weeks 1-3 accumulate: week 1 leave 2-3 reps in reserve, week 2 leave 2, week 3 push the last set of each lift to 0-1.",
    "Week 4 is a deload — same movements, ~60% of the load, half the sets. Do not skip it.",
    "Log every set. If you aren't tracking, you're guessing, and guessing plateaus.",
  ],
  days: {
    monday: day({
      key: "monday",
      title: "Chest & Triceps",
      focus: "Push A — horizontal press",
      type: "hypertrophy",
      targets: ["chest", "triceps", "front-delts"],
      minutes: 70,
      brief:
        "Heavy pressing first while you're fresh, then incline work for the upper chest, then cables and dips to finish the pecs off with a stretch and a squeeze. Triceps get hit hard at the end because they're already warm.",
      warmup: UPPER_WARMUP,
      items: [
        { id: "barbell-bench-press", sets: 4, reps: "5-8", rpe: 8, rest: 180, tempo: "3-1-1-0", key: true, note: "This is your strength lift. Add weight before you add reps beyond 8." },
        { id: "incline-dumbbell-press", sets: 4, reps: "8-12", rpe: 9, rest: 120, tempo: "3-1-1-1", note: "Bench at 30°. Chase the stretch at the bottom." },
        { id: "dips-chest", sets: 3, reps: "8-12", rpe: 9, rest: 120, note: "Lean forward ~30°. Add weight once you clear 12 clean reps." },
        { id: "cable-fly", sets: 3, reps: "12-15", rpe: 9, rest: 75, tempo: "3-1-1-1", intensifier: "drop-set", note: "Drop set on the last set: strip 30% and go again to failure." },
        { id: "overhead-triceps-extension", sets: 3, reps: "10-12", rpe: 9, rest: 60, ss: "A", note: "Superset A — long-head stretch." },
        { id: "triceps-pushdown", sets: 3, reps: "12-20", rpe: 10, rest: 90, ss: "A", intensifier: "drop-set" },
      ],
      finisher: ["Push-ups to technical failure — one all-out set, chest to the floor every rep."],
      notes: [
        "Shoulder blades stay retracted and depressed on every press. That single habit prevents most bench-related shoulder pain.",
        "If your shoulders complain on flat barbell bench, swap to dumbbells for a block — the free path is far more forgiving.",
        "Triceps are already fatigued from pressing. Use that: they need less absolute load than you think.",
      ],
    }),

    tuesday: day({
      key: "tuesday",
      title: "Back & Biceps",
      focus: "Pull A — vertical + horizontal",
      type: "hypertrophy",
      targets: ["lats", "upper-back", "biceps", "rear-delts"],
      minutes: 75,
      brief:
        "Width first with vertical pulling, then thickness with heavy rows. Biceps come last so they don't limit your back work. Finish with face pulls — cheap shoulder insurance you'll be grateful for in ten years.",
      warmup: UPPER_WARMUP,
      items: [
        { id: "pull-up", sets: 4, reps: "6-10", rpe: 8, rest: 150, tempo: "3-0-1-1", key: true, note: "Add weight once you own 10. Use assistance or lat pulldowns if you can't hit 6." },
        { id: "barbell-row", sets: 4, reps: "6-10", rpe: 8, rest: 150, tempo: "2-1-1-0", note: "Torso angle frozen. If it rises, the weight is too heavy." },
        { id: "seated-cable-row", sets: 3, reps: "10-12", rpe: 9, rest: 105, tempo: "2-1-1-1", note: "Full stretch forward, elbows to the ribs." },
        { id: "straight-arm-pulldown", sets: 3, reps: "12-15", rpe: 9, rest: 75, note: "Pure lat isolation — arms stay straight." },
        { id: "incline-dumbbell-curl", sets: 3, reps: "10-12", rpe: 9, rest: 60, ss: "A", tempo: "3-1-1-1" },
        { id: "hammer-curl", sets: 3, reps: "10-14", rpe: 9, rest: 90, ss: "A" },
        { id: "face-pull", sets: 3, reps: "15-20", rpe: 8, rest: 60, note: "Light. Elbows high, pinkies back. Never ego-load this." },
      ],
      notes: [
        "Initiate every pull by depressing the shoulder blades. Arms are hooks — the back does the work.",
        "Grip is usually the limiter before the lats are done. Use straps on your last two row sets if that's you.",
        "Your back grows from range of motion, not just load. Let it stretch at the top of every rep.",
      ],
    }),

    wednesday: day({
      key: "wednesday",
      title: "Legs — Quad Focus",
      focus: "Squat pattern + knee flexion",
      type: "hypertrophy",
      targets: ["quads", "glutes", "hamstrings", "calves"],
      minutes: 80,
      brief:
        "The hardest session of the week. Squat heavy, then accumulate quad volume through the leg press and split squats. Hamstrings and calves get direct work at the end so nothing is left behind.",
      warmup: LOWER_WARMUP,
      items: [
        { id: "back-squat", sets: 4, reps: "5-8", rpe: 8, rest: 210, tempo: "3-1-1-0", key: true, note: "Depth over load. Hip crease below the knee, every rep." },
        { id: "leg-press", sets: 3, reps: "10-15", rpe: 9, rest: 150, note: "Lower back glued to the pad. Stop just short of lockout." },
        { id: "bulgarian-split-squat", sets: 3, reps: "8-12 per leg", rpe: 9, rest: 120, note: "Start with your weaker leg and match the reps on the strong side." },
        { id: "leg-extension", sets: 3, reps: "12-20", rpe: 10, rest: 75, intensifier: "myo-reps", note: "Squeeze a full second at the top. Myo-reps on the last set." },
        { id: "lying-leg-curl", sets: 3, reps: "10-15", rpe: 9, rest: 90, tempo: "3-1-1-1" },
        { id: "standing-calf-raise", sets: 4, reps: "10-15", rpe: 9, rest: 75, tempo: "3-2-1-1", note: "Two-second stretch at the bottom, one-second squeeze at the top." },
      ],
      finisher: ["Hanging leg raises — 3 sets of 10-15, or a 60-second plank if your grip is toast."],
      notes: [
        "Never squat outside a rack with the safeties set. Learn to bail before you need to.",
        "Knees caving in means your glutes are underactive — push the knees out and drop the weight until you can.",
        "Expect this session to take the longest. Rest the full 3+ minutes on squats; rushing costs you reps and load.",
      ],
    }),

    thursday: day({
      key: "thursday",
      title: "Shoulders & Traps",
      focus: "Push B — vertical press + delts",
      type: "hypertrophy",
      targets: ["front-delts", "side-delts", "rear-delts", "traps", "abs"],
      minutes: 65,
      brief:
        "Press heavy overhead, then bury the side delts in volume — they're the muscle that actually makes shoulders look wide. Rear delts and traps close it out, and abs get direct work while you're already warm.",
      warmup: UPPER_WARMUP,
      items: [
        { id: "overhead-press", sets: 4, reps: "5-8", rpe: 8, rest: 180, key: true, note: "Squeeze the glutes. Do not lean back into it." },
        { id: "dumbbell-shoulder-press", sets: 3, reps: "8-12", rpe: 9, rest: 120, tempo: "3-0-1-1" },
        { id: "lateral-raise", sets: 4, reps: "12-20", rpe: 10, rest: 60, tempo: "2-1-2-0", intensifier: "drop-set", note: "Lighter than your ego wants. Drop set on the final set." },
        { id: "reverse-pec-deck", sets: 3, reps: "15-20", rpe: 9, rest: 60, ss: "B" },
        { id: "face-pull", sets: 3, reps: "15-20", rpe: 8, rest: 60, ss: "B" },
        { id: "barbell-shrug", sets: 4, reps: "10-15", rpe: 9, rest: 90, tempo: "2-2-1-1", note: "Two-second hold at the top. No rolling." },
        { id: "cable-crunch", sets: 3, reps: "12-20", rpe: 9, rest: 60, note: "Abs are muscles — load them progressively." },
      ],
      notes: [
        "Side delts recover fast and respond to frequency. Extra lateral raise volume is the safest place to add sets.",
        "If overhead pressing hurts, switch to a landmine press or neutral-grip dumbbells before you give up on it.",
        "Rear delts are almost always the weak link. Do them properly, light and strict.",
      ],
    }),

    friday: day({
      key: "friday",
      title: "Arms & Forearms",
      focus: "Dedicated arm day",
      type: "hypertrophy",
      targets: ["biceps", "triceps", "forearms"],
      minutes: 60,
      brief:
        "A full session for the muscles everyone wants and most people under-train. Heavy compound first, then alternating supersets so both heads of the arm keep working while the other recovers. Expect a serious pump.",
      warmup: [
        "5 minutes easy cardio.",
        "2 sets of 15 light band curls and 15 band pushdowns to flood the elbows with blood.",
        "Elbows need more warm-up than you think — do not go straight into heavy curls.",
      ],
      items: [
        { id: "close-grip-bench", sets: 4, reps: "6-10", rpe: 8, rest: 150, key: true, note: "Grip at shoulder width, elbows tucked." },
        { id: "barbell-curl", sets: 3, reps: "8-12", rpe: 9, rest: 90, tempo: "3-1-1-1", note: "Elbows pinned. No swinging." },
        { id: "skull-crusher", sets: 3, reps: "10-12", rpe: 9, rest: 75, ss: "A", tempo: "3-1-1-1" },
        { id: "preacher-curl", sets: 3, reps: "10-12", rpe: 9, rest: 75, ss: "A", note: "Control the bottom. This is where biceps tear." },
        { id: "triceps-pushdown", sets: 2, reps: "12-20", rpe: 10, rest: 60, ss: "B", intensifier: "drop-set" },
        { id: "cable-curl", sets: 2, reps: "12-15", rpe: 10, rest: 60, ss: "B" },
        { id: "reverse-curl", sets: 2, reps: "12-15", rpe: 9, rest: 60, note: "Brachioradialis — the muscle that makes arms look thick from the side." },
        { id: "farmer-carry", sets: 3, reps: "40 seconds", rpe: 9, rest: 90, note: "Heavy. Crush the handles, ribs down." },
      ],
      notes: [
        "Arms are small muscles with a short recovery window — you can train them hard and often, but elbow tendons are the limit.",
        "Any sharp elbow pain means switch to an EZ bar, reduce range slightly, and drop the load 20% for two weeks.",
        "The stretch positions (incline curls, overhead extensions) build more arm than the peak-contraction ones. Prioritise them.",
      ],
    }),

    saturday: day({
      key: "saturday",
      title: "Posterior Chain & Conditioning",
      focus: "Hinge, glutes, hamstrings + cardio",
      type: "strength",
      targets: ["hamstrings", "glutes", "lower-back", "upper-back", "cardio"],
      minutes: 75,
      brief:
        "Pull heavy from the floor, then hammer the hamstrings and glutes that Wednesday's quad session left alone. Finish with conditioning so the week ends with your engine trained too.",
      warmup: LOWER_WARMUP,
      items: [
        { id: "deadlift", sets: 3, reps: "3-5", rpe: 8, rest: 240, key: true, note: "Reset every rep. If the back rounds, the set is finished." },
        { id: "romanian-deadlift", sets: 3, reps: "8-12", rpe: 9, rest: 150, tempo: "4-1-1-0", note: "Hips back, bar on the legs, stop at the stretch." },
        { id: "hip-thrust", sets: 3, reps: "8-15", rpe: 9, rest: 120, tempo: "2-2-1-0", note: "Two-second squeeze at lockout." },
        { id: "seated-leg-curl", sets: 3, reps: "10-15", rpe: 9, rest: 90, tempo: "3-1-1-1" },
        { id: "chest-supported-row", sets: 3, reps: "10-15", rpe: 9, rest: 105, note: "Chest stays on the pad. Pause and squeeze." },
        { id: "seated-calf-raise", sets: 3, reps: "15-25", rpe: 9, rest: 60 },
      ],
      finisher: [
        "10 minutes of conditioning: rower intervals (30s hard / 90s easy x 5) or a steady incline walk if you're beaten up.",
      ],
      notes: [
        "If deadlifts leave you wrecked for days, switch to trap bar or rack pulls — the goal is stimulus, not spinal punishment.",
        "Never deadlift into rounding. One bad rep costs you months.",
        "Skip the conditioning finisher entirely in a deload week.",
      ],
    }),

    sunday: mobilityDay("sunday"),
  },
};

/* ==========================================================================
 * 2. Push / Pull / Legs ×2
 * ======================================================================= */

const ppl6: Program = {
  id: "ppl-6",
  name: "Push / Pull / Legs",
  tagline: "6 days · every muscle twice a week",
  description:
    "The most evidence-aligned high-frequency split there is. Each muscle gets trained twice weekly, once heavy and once with higher reps, which beats a once-a-week body-part split for hypertrophy in most research. Simple to run, easy to progress.",
  daysPerWeek: 6,
  level: "intermediate",
  goal: ["build-muscle", "get-strong", "recomp"],
  mesocycleWeeks: 4,
  equipmentNeeded: ["barbell", "dumbbell", "cable", "machine", "bench", "pullup-bar"],
  progression: [
    "The 'A' sessions are heavy: 5-8 reps, add load whenever you clear the top of the range.",
    "The 'B' sessions are volume: 10-20 reps, add reps first and load second.",
    "Rotate to a fresh main lift variation every mesocycle to keep joints happy.",
    "Week 4 deloads: keep the movements, halve the sets, drop to 60% load.",
  ],
  days: {
    monday: day({
      key: "monday",
      title: "Push A — Heavy",
      focus: "Chest, shoulders, triceps (strength bias)",
      type: "strength",
      targets: ["chest", "front-delts", "triceps"],
      minutes: 70,
      brief: "Heavy horizontal and vertical pressing in low rep ranges. Long rests, high intent on every rep.",
      warmup: UPPER_WARMUP,
      items: [
        { id: "barbell-bench-press", sets: 5, reps: "4-6", rpe: 8, rest: 210, key: true },
        { id: "overhead-press", sets: 4, reps: "5-8", rpe: 8, rest: 180 },
        { id: "incline-dumbbell-press", sets: 3, reps: "8-10", rpe: 9, rest: 120 },
        { id: "lateral-raise", sets: 3, reps: "12-15", rpe: 9, rest: 60 },
        { id: "close-grip-bench", sets: 3, reps: "8-10", rpe: 9, rest: 120 },
        { id: "triceps-pushdown", sets: 3, reps: "12-15", rpe: 9, rest: 60 },
      ],
      notes: ["Heavy day — every set should feel fast and controlled. If bar speed dies, stop the set."],
    }),
    tuesday: day({
      key: "tuesday",
      title: "Pull A — Heavy",
      focus: "Back and biceps (strength bias)",
      type: "strength",
      targets: ["lats", "upper-back", "biceps", "traps"],
      minutes: 70,
      brief: "Heavy rowing and vertical pulling. Build the raw strength that makes the volume days productive.",
      warmup: UPPER_WARMUP,
      items: [
        { id: "barbell-row", sets: 4, reps: "5-8", rpe: 8, rest: 180, key: true },
        { id: "pull-up", sets: 4, reps: "6-10", rpe: 9, rest: 150 },
        { id: "chest-supported-row", sets: 3, reps: "10-12", rpe: 9, rest: 105 },
        { id: "barbell-shrug", sets: 3, reps: "10-15", rpe: 9, rest: 90 },
        { id: "barbell-curl", sets: 3, reps: "8-12", rpe: 9, rest: 90 },
        { id: "face-pull", sets: 3, reps: "15-20", rpe: 8, rest: 60 },
      ],
      notes: ["Straps are a tool, not cheating. Use them when grip fails before your back does."],
    }),
    wednesday: day({
      key: "wednesday",
      title: "Legs A — Squat Focus",
      focus: "Quads, glutes (strength bias)",
      type: "strength",
      targets: ["quads", "glutes", "calves"],
      minutes: 75,
      brief: "Squat heavy, support it with unilateral and machine work, then calves.",
      warmup: LOWER_WARMUP,
      items: [
        { id: "back-squat", sets: 5, reps: "4-6", rpe: 8, rest: 240, key: true },
        { id: "romanian-deadlift", sets: 3, reps: "8-10", rpe: 8, rest: 150 },
        { id: "bulgarian-split-squat", sets: 3, reps: "8-10 per leg", rpe: 9, rest: 120 },
        { id: "leg-extension", sets: 3, reps: "12-15", rpe: 9, rest: 75 },
        { id: "standing-calf-raise", sets: 4, reps: "10-15", rpe: 9, rest: 75 },
      ],
      notes: ["Full depth or the set doesn't count. Reduce the load until it does."],
    }),
    thursday: day({
      key: "thursday",
      title: "Push B — Volume",
      focus: "Chest, shoulders, triceps (hypertrophy bias)",
      type: "hypertrophy",
      targets: ["chest", "side-delts", "triceps"],
      minutes: 65,
      brief: "Higher reps, shorter rests, more machines and cables. Chase the pump and the stretch.",
      warmup: UPPER_WARMUP,
      items: [
        { id: "incline-dumbbell-press", sets: 4, reps: "10-12", rpe: 9, rest: 105, key: true },
        { id: "machine-chest-press", sets: 3, reps: "12-15", rpe: 10, rest: 90 },
        { id: "cable-fly", sets: 3, reps: "15-20", rpe: 10, rest: 60, intensifier: "drop-set" },
        { id: "machine-shoulder-press", sets: 3, reps: "12-15", rpe: 9, rest: 90 },
        { id: "cable-lateral-raise", sets: 4, reps: "15-20", rpe: 10, rest: 45, ss: "A" },
        { id: "overhead-triceps-extension", sets: 4, reps: "12-15", rpe: 10, rest: 60, ss: "A" },
      ],
      notes: ["Volume day. Take the last set of every isolation to genuine failure."],
    }),
    friday: day({
      key: "friday",
      title: "Pull B — Volume",
      focus: "Back and biceps (hypertrophy bias)",
      type: "hypertrophy",
      targets: ["lats", "upper-back", "rear-delts", "biceps"],
      minutes: 65,
      brief: "Cable and machine pulling with long stretches and hard squeezes. Arms get extra attention.",
      warmup: UPPER_WARMUP,
      items: [
        { id: "lat-pulldown", sets: 4, reps: "10-12", rpe: 9, rest: 105, key: true },
        { id: "seated-cable-row", sets: 4, reps: "12-15", rpe: 9, rest: 90 },
        { id: "straight-arm-pulldown", sets: 3, reps: "12-15", rpe: 9, rest: 60 },
        { id: "reverse-pec-deck", sets: 3, reps: "15-20", rpe: 9, rest: 60 },
        { id: "incline-dumbbell-curl", sets: 3, reps: "10-12", rpe: 10, rest: 60, ss: "A" },
        { id: "hammer-curl", sets: 3, reps: "12-15", rpe: 10, rest: 60, ss: "A" },
      ],
      notes: ["Slow eccentrics on every pull. Three seconds down builds more back than three extra plates."],
    }),
    saturday: day({
      key: "saturday",
      title: "Legs B — Hamstring & Glute Focus",
      focus: "Posterior chain (hypertrophy bias)",
      type: "hypertrophy",
      targets: ["hamstrings", "glutes", "quads", "calves", "abs"],
      minutes: 70,
      brief: "Hinge-dominant volume day. Hamstrings, glutes and calves, finished with direct core work.",
      warmup: LOWER_WARMUP,
      items: [
        { id: "romanian-deadlift", sets: 4, reps: "8-12", rpe: 9, rest: 150, key: true },
        { id: "hack-squat", sets: 3, reps: "10-15", rpe: 9, rest: 150 },
        { id: "seated-leg-curl", sets: 4, reps: "10-15", rpe: 10, rest: 90 },
        { id: "hip-thrust", sets: 3, reps: "10-15", rpe: 9, rest: 105 },
        { id: "seated-calf-raise", sets: 4, reps: "15-25", rpe: 10, rest: 60 },
        { id: "hanging-leg-raise", sets: 3, reps: "10-15", rpe: 9, rest: 60 },
      ],
      notes: ["Hamstrings need both a hinge and a knee curl. Doing only one leaves growth on the table."],
    }),
    sunday: restDay("sunday"),
  },
};

/* ==========================================================================
 * 3. Upper / Lower ×2
 * ======================================================================= */

const upperLower4: Program = {
  id: "upper-lower-4",
  name: "Upper / Lower",
  tagline: "4 days · maximum results per hour",
  description:
    "Four sessions a week, each hitting half the body. The best return on time investment there is: enough frequency to grow, enough rest days to recover, and it survives a busy week far better than a six-day split.",
  daysPerWeek: 4,
  level: "beginner",
  goal: ["build-muscle", "get-strong", "recomp", "general-health"],
  mesocycleWeeks: 4,
  equipmentNeeded: ["barbell", "dumbbell", "cable", "machine", "bench"],
  progression: [
    "Add 2.5 kg to upper-body lifts and 5 kg to lower-body lifts whenever you hit the top of the rep range on all sets.",
    "If you miss the bottom of the range two sessions in a row, drop 10% and build back.",
    "Keep the same four sessions for a full mesocycle so progression is measurable.",
  ],
  days: {
    monday: day({
      key: "monday",
      title: "Upper A — Push Bias",
      focus: "Chest, shoulders, triceps + back",
      type: "strength",
      targets: ["chest", "front-delts", "triceps", "upper-back"],
      minutes: 70,
      brief: "Press-dominant upper day with enough pulling to keep the shoulders balanced.",
      warmup: UPPER_WARMUP,
      items: [
        { id: "barbell-bench-press", sets: 4, reps: "5-8", rpe: 8, rest: 180, key: true },
        { id: "barbell-row", sets: 4, reps: "6-10", rpe: 8, rest: 150 },
        { id: "dumbbell-shoulder-press", sets: 3, reps: "8-12", rpe: 9, rest: 120 },
        { id: "lat-pulldown", sets: 3, reps: "10-12", rpe: 9, rest: 105 },
        { id: "lateral-raise", sets: 3, reps: "12-20", rpe: 10, rest: 60, ss: "A" },
        { id: "triceps-pushdown", sets: 3, reps: "12-15", rpe: 9, rest: 60, ss: "A" },
        { id: "barbell-curl", sets: 3, reps: "10-12", rpe: 9, rest: 60 },
      ],
      notes: ["Balance every pressing set with a pulling set across the week — it's what keeps shoulders healthy."],
    }),
    tuesday: day({
      key: "tuesday",
      title: "Lower A — Squat Bias",
      focus: "Quads, glutes, calves",
      type: "strength",
      targets: ["quads", "glutes", "hamstrings", "calves"],
      minutes: 70,
      brief: "Squat-led lower day with hamstring and calf support work.",
      warmup: LOWER_WARMUP,
      items: [
        { id: "back-squat", sets: 4, reps: "5-8", rpe: 8, rest: 210, key: true },
        { id: "romanian-deadlift", sets: 3, reps: "8-12", rpe: 8, rest: 150 },
        { id: "leg-press", sets: 3, reps: "12-15", rpe: 9, rest: 120 },
        { id: "lying-leg-curl", sets: 3, reps: "10-15", rpe: 9, rest: 90 },
        { id: "standing-calf-raise", sets: 4, reps: "10-15", rpe: 9, rest: 60 },
        { id: "plank", sets: 3, reps: "45 seconds", rpe: 8, rest: 45 },
      ],
    }),
    wednesday: restDay("wednesday"),
    thursday: day({
      key: "thursday",
      title: "Upper B — Pull Bias",
      focus: "Back, rear delts, arms + chest",
      type: "hypertrophy",
      targets: ["lats", "upper-back", "rear-delts", "biceps", "chest"],
      minutes: 70,
      brief: "Pull-dominant upper day. Higher reps, more isolation, arms and rear delts get real attention.",
      warmup: UPPER_WARMUP,
      items: [
        { id: "pull-up", sets: 4, reps: "6-12", rpe: 9, rest: 150, key: true },
        { id: "incline-dumbbell-press", sets: 4, reps: "8-12", rpe: 9, rest: 120 },
        { id: "seated-cable-row", sets: 3, reps: "10-15", rpe: 9, rest: 105 },
        { id: "cable-fly", sets: 3, reps: "12-15", rpe: 9, rest: 75 },
        { id: "lateral-raise", sets: 3, reps: "12-20", rpe: 10, rest: 60 },
        { id: "reverse-pec-deck", sets: 3, reps: "15-20", rpe: 9, rest: 60, ss: "A" },
        { id: "hammer-curl", sets: 3, reps: "10-14", rpe: 9, rest: 60, ss: "A" },
        { id: "overhead-triceps-extension", sets: 3, reps: "12-15", rpe: 9, rest: 60 },
      ],
    }),
    friday: day({
      key: "friday",
      title: "Lower B — Hinge Bias",
      focus: "Hamstrings, glutes, quads",
      type: "hypertrophy",
      targets: ["hamstrings", "glutes", "quads", "calves", "abs"],
      minutes: 70,
      brief: "Deadlift-led session that finishes what Tuesday started, with more posterior chain volume.",
      warmup: LOWER_WARMUP,
      items: [
        { id: "trap-bar-deadlift", sets: 4, reps: "5-8", rpe: 8, rest: 210, key: true },
        { id: "bulgarian-split-squat", sets: 3, reps: "8-12 per leg", rpe: 9, rest: 120 },
        { id: "seated-leg-curl", sets: 3, reps: "10-15", rpe: 9, rest: 90 },
        { id: "hip-thrust", sets: 3, reps: "10-15", rpe: 9, rest: 105 },
        { id: "seated-calf-raise", sets: 3, reps: "15-25", rpe: 9, rest: 60 },
        { id: "cable-crunch", sets: 3, reps: "12-20", rpe: 9, rest: 60 },
      ],
    }),
    saturday: mobilityDay("saturday"),
    sunday: restDay("sunday"),
  },
};

/* ==========================================================================
 * 4. Beginner Full Body ×3
 * ======================================================================= */

const fullBody3: Program = {
  id: "full-body-3",
  name: "Foundation Full Body",
  tagline: "3 days · the fastest start for a beginner",
  description:
    "Three full-body sessions a week built on the movements that matter: squat, hinge, press, pull. Beginners grow fastest on frequency and technique, not on split complexity. Run this for 8-12 weeks before touching anything fancier.",
  daysPerWeek: 3,
  level: "beginner",
  goal: ["build-muscle", "get-strong", "general-health", "lose-fat"],
  mesocycleWeeks: 4,
  equipmentNeeded: ["barbell", "dumbbell", "machine", "cable", "bench"],
  progression: [
    "Add the smallest possible increment every single session while form holds. This is the only time in your lifting life that works.",
    "If you fail the same weight twice, drop 10% and build back up — that's a normal part of the process.",
    "Technique first, always. A clean set at 60 kg beats a sloppy one at 80 kg.",
  ],
  days: {
    monday: day({
      key: "monday",
      title: "Full Body A",
      focus: "Squat + horizontal press/pull",
      type: "strength",
      targets: ["quads", "chest", "upper-back", "triceps"],
      minutes: 60,
      brief: "The three big patterns plus arms. Learn the movements, add a little weight each week.",
      warmup: LOWER_WARMUP,
      items: [
        { id: "goblet-squat", sets: 3, reps: "8-12", rpe: 7, rest: 150, key: true, note: "Master this before loading a barbell on your back." },
        { id: "dumbbell-bench-press", sets: 3, reps: "8-12", rpe: 8, rest: 120 },
        { id: "seated-cable-row", sets: 3, reps: "10-12", rpe: 8, rest: 105 },
        { id: "lying-leg-curl", sets: 2, reps: "10-15", rpe: 8, rest: 90 },
        { id: "lateral-raise", sets: 3, reps: "12-15", rpe: 8, rest: 60 },
        { id: "standing-calf-raise", sets: 3, reps: "12-15", rpe: 8, rest: 60 },
        { id: "plank", sets: 3, reps: "30 seconds", rpe: 7, rest: 45 },
      ],
      notes: ["Leave 2-3 reps in the tank on everything. You're building a base, not testing a max."],
    }),
    tuesday: restDay("tuesday", "Rest or 20-min Walk"),
    wednesday: day({
      key: "wednesday",
      title: "Full Body B",
      focus: "Hinge + vertical press/pull",
      type: "strength",
      targets: ["hamstrings", "glutes", "lats", "front-delts"],
      minutes: 60,
      brief: "Hinge pattern and overhead work. The two most technique-dependent sessions of your week.",
      warmup: LOWER_WARMUP,
      items: [
        { id: "romanian-deadlift", sets: 3, reps: "8-12", rpe: 7, rest: 150, key: true },
        { id: "lat-pulldown", sets: 3, reps: "10-12", rpe: 8, rest: 105 },
        { id: "dumbbell-shoulder-press", sets: 3, reps: "8-12", rpe: 8, rest: 120 },
        { id: "leg-press", sets: 3, reps: "12-15", rpe: 8, rest: 120 },
        { id: "dumbbell-curl", sets: 2, reps: "10-12", rpe: 8, rest: 60, ss: "A" },
        { id: "triceps-pushdown", sets: 2, reps: "12-15", rpe: 8, rest: 60, ss: "A" },
      ],
    }),
    thursday: restDay("thursday", "Rest or 20-min Walk"),
    friday: day({
      key: "friday",
      title: "Full Body C",
      focus: "Lunge + mixed accessories",
      type: "hypertrophy",
      targets: ["quads", "glutes", "chest", "lats", "abs"],
      minutes: 60,
      brief: "Single-leg work plus the accessories that round out the week. Slightly higher reps throughout.",
      warmup: LOWER_WARMUP,
      items: [
        { id: "walking-lunge", sets: 3, reps: "10-12 per leg", rpe: 8, rest: 120, key: true },
        { id: "incline-dumbbell-press", sets: 3, reps: "10-12", rpe: 8, rest: 105 },
        { id: "dumbbell-row", sets: 3, reps: "10-12 per side", rpe: 8, rest: 105 },
        { id: "standing-calf-raise", sets: 3, reps: "12-15", rpe: 8, rest: 60 },
        { id: "face-pull", sets: 3, reps: "15-20", rpe: 7, rest: 60 },
        { id: "lateral-raise", sets: 3, reps: "12-15", rpe: 8, rest: 60 },
        { id: "dead-bug", sets: 3, reps: "10 per side", rpe: 7, rest: 45 },
      ],
    }),
    saturday: mobilityDay("saturday"),
    sunday: restDay("sunday"),
  },
};

/* ==========================================================================
 * 5. Home / minimal equipment
 * ======================================================================= */

const home5: Program = {
  id: "home-5",
  name: "Home Iron",
  tagline: "5 days · dumbbells, a bar and a bench",
  description:
    "Built for a home setup: a pair of adjustable dumbbells, a bench and a pull-up bar. Every session works without a gym, and progression comes from reps, tempo and range of motion when you run out of load.",
  daysPerWeek: 5,
  level: "beginner",
  goal: ["build-muscle", "lose-fat", "general-health", "recomp"],
  mesocycleWeeks: 4,
  equipmentNeeded: ["dumbbell", "bodyweight", "bench", "pullup-bar", "band"],
  progression: [
    "Out of heavier dumbbells? Add reps to the top of the range, then slow the eccentric to 4 seconds, then add a pause, then add sets.",
    "Bodyweight movements progress by elevating the feet, slowing the tempo, or adding a loaded backpack.",
    "Train close to failure — with lighter loads, proximity to failure is what drives growth.",
  ],
  days: {
    monday: day({
      key: "monday",
      title: "Push — Chest, Shoulders, Triceps",
      focus: "Dumbbell pressing",
      type: "hypertrophy",
      targets: ["chest", "front-delts", "triceps"],
      minutes: 50,
      brief: "Dumbbell and bodyweight pressing taken close to failure.",
      warmup: UPPER_WARMUP,
      items: [
        { id: "incline-dumbbell-press", sets: 4, reps: "8-12", rpe: 9, rest: 105, key: true },
        { id: "push-up", sets: 3, reps: "12-25", rpe: 10, rest: 90, note: "Feet elevated once floor push-ups get easy." },
        { id: "dumbbell-fly", sets: 3, reps: "12-15", rpe: 9, rest: 75 },
        { id: "dumbbell-shoulder-press", sets: 3, reps: "10-12", rpe: 9, rest: 90 },
        { id: "lateral-raise", sets: 3, reps: "15-20", rpe: 10, rest: 45 },
        { id: "overhead-triceps-extension", sets: 3, reps: "12-15", rpe: 9, rest: 60 },
      ],
    }),
    tuesday: day({
      key: "tuesday",
      title: "Pull — Back & Biceps",
      focus: "Pull-ups and rows",
      type: "hypertrophy",
      targets: ["lats", "upper-back", "biceps"],
      minutes: 50,
      brief: "Vertical and horizontal pulling with whatever load you have. Slow eccentrics do the heavy lifting here.",
      warmup: UPPER_WARMUP,
      items: [
        { id: "pull-up", sets: 4, reps: "AMRAP", rpe: 10, rest: 150, key: true, note: "Bands or slow negatives if you can't hit 5 yet." },
        { id: "dumbbell-row", sets: 4, reps: "10-12 per side", rpe: 9, rest: 90 },
        { id: "chest-supported-row", sets: 3, reps: "12-15", rpe: 9, rest: 90, note: "Chest on an incline bench with dumbbells." },
        { id: "rear-delt-fly", sets: 3, reps: "15-20", rpe: 9, rest: 60 },
        { id: "incline-dumbbell-curl", sets: 3, reps: "10-12", rpe: 10, rest: 60, ss: "A" },
        { id: "hammer-curl", sets: 3, reps: "12-15", rpe: 10, rest: 60, ss: "A" },
      ],
    }),
    wednesday: day({
      key: "wednesday",
      title: "Legs — Single Leg Focus",
      focus: "Unilateral lower body",
      type: "hypertrophy",
      targets: ["quads", "glutes", "hamstrings", "calves"],
      minutes: 50,
      brief: "Single-leg work makes light dumbbells feel heavy. This is how you build legs without a squat rack.",
      warmup: LOWER_WARMUP,
      items: [
        { id: "bulgarian-split-squat", sets: 4, reps: "8-12 per leg", rpe: 9, rest: 120, key: true },
        { id: "goblet-squat", sets: 3, reps: "12-20", rpe: 9, rest: 105, tempo: "4-1-1-0" },
        { id: "romanian-deadlift", sets: 3, reps: "10-15", rpe: 9, rest: 105, note: "Dumbbells, slow and deep." },
        { id: "step-up", sets: 3, reps: "10 per leg", rpe: 9, rest: 90 },
        { id: "glute-bridge", sets: 3, reps: "15-25", rpe: 9, rest: 60 },
        { id: "standing-calf-raise", sets: 4, reps: "15-25", rpe: 10, rest: 45, note: "Single leg on a step, holding a dumbbell." },
      ],
    }),
    thursday: day({
      key: "thursday",
      title: "Core & Conditioning",
      focus: "Abs, obliques, engine",
      type: "conditioning",
      targets: ["abs", "obliques", "cardio"],
      minutes: 40,
      brief: "A short, hard session for the core and cardiovascular system. Keeps the week's frequency high without adding lifting fatigue.",
      warmup: GENERAL_WARMUP,
      items: [
        { id: "hanging-leg-raise", sets: 3, reps: "8-15", rpe: 9, rest: 60, key: true },
        { id: "ab-wheel", sets: 3, reps: "6-12", rpe: 9, rest: 60, note: "Substitute a slow plank walkout if you have no wheel." },
        { id: "side-plank", sets: 3, reps: "30s per side", rpe: 8, rest: 45 },
        { id: "bicycle-crunch", sets: 3, reps: "20-30", rpe: 9, rest: 45 },
        { id: "jump-rope", sets: 5, reps: "60 seconds", rpe: 8, rest: 60 },
        { id: "burpee", sets: 4, reps: "10", rpe: 9, rest: 60 },
      ],
      notes: ["Keep the rest honest. This session's value is in the density."],
    }),
    friday: day({
      key: "friday",
      title: "Full Body Pump",
      focus: "Everything, high reps",
      type: "hypertrophy",
      targets: ["chest", "lats", "quads", "side-delts", "biceps", "triceps"],
      minutes: 50,
      brief: "One exercise per major muscle, high reps, short rests. Finish the week with a proper pump.",
      warmup: UPPER_WARMUP,
      items: [
        { id: "dumbbell-bench-press", sets: 3, reps: "12-15", rpe: 9, rest: 75, ss: "A" },
        { id: "dumbbell-row", sets: 3, reps: "12-15 per side", rpe: 9, rest: 75, ss: "A" },
        { id: "goblet-squat", sets: 3, reps: "15-20", rpe: 9, rest: 90, ss: "B" },
        { id: "romanian-deadlift", sets: 3, reps: "12-15", rpe: 9, rest: 90, ss: "B" },
        { id: "lateral-raise", sets: 3, reps: "15-20", rpe: 10, rest: 45, ss: "C" },
        { id: "dumbbell-curl", sets: 3, reps: "12-15", rpe: 10, rest: 45, ss: "C" },
        { id: "bench-dip", sets: 3, reps: "12-20", rpe: 10, rest: 45, ss: "C" },
      ],
    }),
    saturday: mobilityDay("saturday"),
    sunday: restDay("sunday"),
  },
};

/* ------------------------------------------------------------- exports --- */

export const PROGRAMS: Program[] = [aesthetic6, ppl6, upperLower4, fullBody3, home5];

export const DEFAULT_PROGRAM_ID = "aesthetic-6";

/* ------------------------------------------------- coach-built programmes */

/**
 * Programmes written by a team coach. The data provider registers the current
 * team's programmes here, so every lookup below resolves them like built-ins.
 */
const customRegistry = new Map<string, Program>();

export function registerCustomPrograms(programs: Program[] | undefined): void {
  customRegistry.clear();
  for (const p of programs ?? []) customRegistry.set(p.id, p);
}

export function isCustomProgram(id: string | undefined): boolean {
  return Boolean(id && customRegistry.has(id));
}

export function getProgram(id: string | undefined): Program {
  return PROGRAMS.find((p) => p.id === id) ?? (id ? customRegistry.get(id) : undefined) ?? aesthetic6;
}

/** Built-ins first, then this team's custom programmes. */
export function allPrograms(): Program[] {
  return [...PROGRAMS, ...customRegistry.values()];
}

/** An empty rest day, used when a coach clears a day in the builder. */
export function blankDay(key: DayKey): WorkoutDay {
  return restDay(key, "Rest");
}

/** Deep copy of a programme as a new, editable custom programme. */
export function cloneAsCustom(
  base: Program,
  meta: { id: string; teamId: string; createdBy: string; createdByName: string },
): Program {
  const now = Date.now();
  const copy = JSON.parse(JSON.stringify(base)) as Program;
  return normaliseProgram({
    ...copy,
    id: meta.id,
    name: base.custom ? `${base.name} (copy)` : `${base.name} — team edition`,
    custom: {
      teamId: meta.teamId,
      createdBy: meta.createdBy,
      createdByName: meta.createdByName,
      createdAt: now,
      updatedAt: now,
    },
  });
}

/**
 * Recompute everything derivable from a programme's days so hand-edited
 * programmes can't drift: exercise order, day types, session length, days
 * per week, targeted muscles and required equipment.
 */
export function normaliseProgram(program: Program): Program {
  const days = {} as Record<DayKey, WorkoutDay>;
  const equipment = new Set<Program["equipmentNeeded"][number]>();

  for (const key of Object.keys(program.days) as DayKey[]) {
    const day = program.days[key];
    const exercises = day.exercises.map((e, i) => ({ ...e, order: i + 1 }));
    const targets = new Set<MuscleGroup>();
    let seconds = 8 * 60; // warm-up allowance
    for (const e of exercises) {
      const ex = getExercise(e.exerciseId);
      if (!ex) continue;
      ex.primary.forEach((m) => targets.add(m));
      ex.equipment.forEach((q) => equipment.add(q));
      // ~40s of work per set plus the prescribed rest.
      seconds += e.sets * (40 + e.restSeconds);
    }
    const type: WorkoutDay["type"] =
      exercises.length === 0 ? "rest" : day.type === "rest" ? "hypertrophy" : day.type;
    days[key] = {
      ...day,
      key,
      type,
      exercises,
      targets: type === "rest" ? [] : [...targets].slice(0, 6),
      estimatedMinutes: type === "rest" ? 0 : Math.round(seconds / 60 / 5) * 5,
    };
  }

  // Mobility days are recovery work, matching how the built-in programmes count days.
  const trainingDays = Object.values(days).filter(
    (d) => d.type !== "rest" && d.type !== "mobility",
  ).length;
  return {
    ...program,
    days,
    daysPerWeek: trainingDays,
    equipmentNeeded: [...equipment].filter((q) => q !== "none").slice(0, 8),
    tagline: program.tagline || `${trainingDays} days · coach-built`,
  };
}

export function getDay(programId: string | undefined, dayKey: DayKey): WorkoutDay {
  return getProgram(programId).days[dayKey];
}

/**
 * Prescribed hard sets per muscle across a program week.
 * Primary movers get full credit; secondary movers get half, which is the
 * convention volume landmarks are written against.
 */
export function weeklySetsByMuscle(
  program: Program,
): Partial<Record<MuscleGroup, number>> {
  const out: Partial<Record<MuscleGroup, number>> = {};
  for (const d of Object.values(program.days)) {
    for (const planned of d.exercises) {
      const ex = getExercise(planned.exerciseId);
      if (!ex) continue;
      // "cardio" isn't a muscle, but the calves in a jump-rope set still count.
      for (const m of ex.primary) if (m !== "cardio") out[m] = (out[m] ?? 0) + planned.sets;
      for (const m of ex.secondary) if (m !== "cardio") out[m] = (out[m] ?? 0) + planned.sets * 0.5;
    }
  }
  for (const k of Object.keys(out) as MuscleGroup[]) {
    out[k] = Math.round((out[k] ?? 0) * 10) / 10;
  }
  return out;
}

/** Sets per muscle for a single session — used on the day detail page. */
export function daySetsByMuscle(day: WorkoutDay): Partial<Record<MuscleGroup, number>> {
  const out: Partial<Record<MuscleGroup, number>> = {};
  for (const planned of day.exercises) {
    const ex = getExercise(planned.exerciseId);
    if (!ex) continue;
    for (const m of ex.primary) if (m !== "cardio") out[m] = (out[m] ?? 0) + planned.sets;
    for (const m of ex.secondary) if (m !== "cardio") out[m] = (out[m] ?? 0) + planned.sets * 0.5;
  }
  return out;
}

/** Normalised 0-1 activation for the muscle map on a given day. */
export function dayActivation(day: WorkoutDay): Partial<Record<MuscleGroup, number>> {
  const sets = daySetsByMuscle(day);
  const max = Math.max(1, ...Object.values(sets).map((v) => v ?? 0));
  const out: Partial<Record<MuscleGroup, number>> = {};
  for (const [k, v] of Object.entries(sets)) out[k as MuscleGroup] = (v ?? 0) / max;
  return out;
}

/** Total prescribed working sets in a session. */
export function totalSets(day: WorkoutDay): number {
  return day.exercises.reduce((n, e) => n + e.sets, 0);
}
