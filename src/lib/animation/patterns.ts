/* ============================================================================
 * Movement pattern rigs.
 *
 * Every exercise maps to one pattern. A pattern holds two poses — `a` (the
 * start of the rep) and `b` (the end of the range) — and the renderer plays
 * a → b → a on the exercise's real tempo, labelling each phase.
 * ========================================================================= */

import type { MovementPattern } from "@/lib/types";
import type { Pose } from "./rig";

export type PropKind =
  | "none"
  | "barbell-back"
  | "barbell-grip"
  | "barbell-hips"
  | "ez-bar"
  | "dumbbells"
  | "cable-high"
  | "cable-low"
  | "cables-side"
  | "machine-handles"
  | "ball";

export type EnvKind =
  | "floor"
  | "flat-bench"
  | "incline-bench"
  | "seat"
  | "pullup-bar"
  | "dip-bars"
  | "cable-tower"
  | "leg-machine"
  | "thrust-bench"
  | "step";

export interface PatternSpec {
  view: "side" | "front";
  /** Where the figure is pinned so it doesn't drift as joints rotate. */
  anchor: "feet" | "hands" | "none";
  prop: PropKind;
  env: EnvKind[];
  /** Which half of the rep runs first from pose `a`. */
  firstPhase: "eccentric" | "concentric";
  a: Pose;
  b: Pose;
  /** Short caption shown under the figure for each half. */
  labelA: string;
  labelB: string;
  /** One-line technical focus surfaced beside the animation. */
  focus: string;
}

const STAND: Pose = {
  hipX: 100,
  hipY: 90,
  torso: 0,
  neck: 0,
  upperArm: 4,
  foreArm: 4,
  thigh: 2,
  shank: -2,
  foot: 0,
};

const p = (over: Partial<Pose>): Pose => ({ ...STAND, ...over });

export const PATTERNS: Record<MovementPattern, PatternSpec> = {
  squat: {
    view: "side",
    anchor: "feet",
    prop: "barbell-back",
    env: ["floor"],
    firstPhase: "eccentric",
    a: p({ torso: 8, thigh: 4, shank: -3, hipY: 90, upperArm: -30, foreArm: 185 }),
    b: p({ torso: 35, thigh: 87, shank: -25, hipY: 121, upperArm: -3, foreArm: 212 }),
    labelA: "Standing — braced",
    labelB: "Below parallel",
    focus: "Hips and chest rise together. Knees track over the toes.",
  },

  hinge: {
    view: "side",
    anchor: "feet",
    prop: "barbell-grip",
    env: ["floor"],
    firstPhase: "eccentric",
    a: p({ torso: 5, thigh: 2, shank: -2, hipY: 90, upperArm: 0, foreArm: 0 }),
    b: p({ torso: 72, thigh: 15, shank: -10, hipY: 92, upperArm: 0, foreArm: 0 }),
    labelA: "Hips locked out",
    labelB: "Hips back, bar on the legs",
    focus: "Push the hips back, not down. The bar never leaves your legs.",
  },

  lunge: {
    view: "side",
    anchor: "feet",
    prop: "dumbbells",
    env: ["floor"],
    firstPhase: "eccentric",
    a: p({
      torso: 6,
      hipY: 92,
      thigh: 20,
      shank: -20,
      thighB: -18,
      shankB: -50,
      upperArm: 0,
      foreArm: 0,
    }),
    b: p({
      torso: 10,
      hipY: 112,
      thigh: 55,
      shank: -50,
      thighB: -35,
      shankB: -75,
      upperArm: 0,
      foreArm: 0,
    }),
    labelA: "Split stance, tall",
    labelB: "Back knee to the floor",
    focus: "All the weight through the front heel. The back leg is a kickstand.",
  },

  "bench-press": {
    view: "side",
    anchor: "none",
    prop: "barbell-grip",
    env: ["flat-bench", "floor"],
    firstPhase: "eccentric",
    a: p({ hipX: 104, hipY: 104, torso: -90, thigh: 100, shank: 12, upperArm: 180, foreArm: 180 }),
    b: p({ hipX: 104, hipY: 104, torso: -90, thigh: 100, shank: 12, upperArm: 32, foreArm: 192 }),
    labelA: "Locked out over the shoulders",
    labelB: "Bar to the lower chest",
    focus: "Shoulder blades pinned back. Elbows at 45°, forearms vertical.",
  },

  pushup: {
    view: "side",
    anchor: "none",
    prop: "none",
    env: ["floor"],
    firstPhase: "eccentric",
    a: p({ hipX: 100, hipY: 110, torso: -95, thigh: 92, shank: 4, upperArm: 0, foreArm: 0 }),
    b: p({ hipX: 100, hipY: 124, torso: -95, thigh: 92, shank: 4, upperArm: 45, foreArm: -45 }),
    labelA: "Plank — long body line",
    labelB: "Chest a fist from the floor",
    focus: "Glutes and abs squeezed so the hips never sag.",
  },

  "overhead-press": {
    view: "front",
    anchor: "feet",
    prop: "barbell-grip",
    env: ["floor"],
    firstPhase: "concentric",
    a: p({ upperArm: 30, foreArm: 170, gripSpread: 4 }),
    b: p({ upperArm: 165, foreArm: 175, gripSpread: 2 }),
    labelA: "Bar on the front delts",
    labelB: "Locked out overhead",
    focus: "Squeeze the glutes. Head moves back, then through, at the top.",
  },

  "lateral-raise": {
    view: "front",
    anchor: "feet",
    prop: "dumbbells",
    env: ["floor"],
    firstPhase: "concentric",
    a: p({ upperArm: 6, foreArm: 10, torso: 4 }),
    b: p({ upperArm: 88, foreArm: 94, torso: 6 }),
    labelA: "Arms at your sides",
    labelB: "Elbows at shoulder height",
    focus: "Lead with the elbows and stop at shoulder height.",
  },

  "chest-fly": {
    view: "front",
    anchor: "feet",
    prop: "cables-side",
    env: ["cable-tower", "floor"],
    firstPhase: "concentric",
    a: p({ upperArm: 96, foreArm: 78, torso: 8, gripSpread: 6 }),
    b: p({ upperArm: 28, foreArm: 52, torso: 10, gripSpread: -16 }),
    labelA: "Stretched, chest open",
    labelB: "Hands together, squeeze",
    focus: "Fixed elbow angle. If it opens and closes, you're pressing.",
  },

  row: {
    view: "side",
    anchor: "feet",
    prop: "barbell-grip",
    env: ["floor"],
    firstPhase: "concentric",
    a: p({ torso: 65, thigh: 12, shank: -8, hipY: 93, upperArm: 0, foreArm: 0 }),
    b: p({ torso: 65, thigh: 12, shank: -8, hipY: 93, upperArm: -30, foreArm: -120 }),
    labelA: "Arms long, lats stretched",
    labelB: "Bar to the lower ribs",
    focus: "The torso angle never changes. Pull with the elbows.",
  },

  pulldown: {
    view: "front",
    anchor: "none",
    prop: "cable-high",
    env: ["cable-tower", "seat"],
    firstPhase: "concentric",
    a: p({
      hipY: 106,
      torso: 10,
      thigh: 95,
      shank: 8,
      upperArm: 162,
      foreArm: 172,
      gripSpread: 12,
      shoulderLift: 4,
    }),
    b: p({
      hipY: 106,
      torso: 14,
      thigh: 95,
      shank: 8,
      upperArm: 22,
      foreArm: 152,
      gripSpread: 8,
      shoulderLift: -2,
    }),
    labelA: "Full stretch overhead",
    labelB: "Bar to the upper chest",
    focus: "Depress the shoulder blades first, then drive the elbows down.",
  },

  pullup: {
    view: "front",
    anchor: "hands",
    prop: "none",
    env: ["pullup-bar"],
    firstPhase: "concentric",
    a: p({
      hipY: 96,
      torso: 2,
      upperArm: 168,
      foreArm: 176,
      thigh: 6,
      shank: 6,
      gripSpread: 8,
      shoulderLift: 5,
    }),
    b: p({
      hipY: 96,
      torso: -8,
      upperArm: 32,
      foreArm: 158,
      thigh: -12,
      shank: 10,
      gripSpread: 6,
      shoulderLift: -3,
    }),
    labelA: "Dead hang, shoulders set",
    labelB: "Chest to the bar",
    focus: "Lead with the chest. Elbows drive down into your back pockets.",
  },

  curl: {
    view: "front",
    anchor: "feet",
    prop: "ez-bar",
    env: ["floor"],
    firstPhase: "concentric",
    a: p({ upperArm: 5, foreArm: 6, torso: 2 }),
    b: p({ upperArm: 8, foreArm: 158, torso: 2 }),
    labelA: "Full stretch, elbows locked in",
    labelB: "Squeeze at the top",
    focus: "Elbows stay pinned to your sides for every single rep.",
  },

  "triceps-extension": {
    view: "side",
    anchor: "feet",
    prop: "dumbbells",
    env: ["floor"],
    firstPhase: "eccentric",
    a: p({ torso: 6, upperArm: 175, foreArm: 178 }),
    b: p({ torso: 6, upperArm: 172, foreArm: -70 }),
    labelA: "Arms locked overhead",
    labelB: "Deep stretch behind the head",
    focus: "Upper arms stay beside the ears. Only the elbow moves.",
  },

  "triceps-pushdown": {
    view: "front",
    anchor: "feet",
    prop: "cable-high",
    env: ["cable-tower", "floor"],
    firstPhase: "concentric",
    a: p({ torso: 8, upperArm: 8, foreArm: 148 }),
    b: p({ torso: 8, upperArm: 8, foreArm: 10 }),
    labelA: "Forearms parallel to the floor",
    labelB: "Locked out, triceps squeezed",
    focus: "Elbows are hinges pinned at your sides — they never travel.",
  },

  dip: {
    view: "side",
    anchor: "hands",
    prop: "none",
    env: ["dip-bars"],
    firstPhase: "eccentric",
    a: p({ hipY: 96, torso: 14, upperArm: 2, foreArm: 2, thigh: -30, shank: -62 }),
    b: p({ hipY: 96, torso: 24, upperArm: 32, foreArm: -42, thigh: -34, shank: -66 }),
    labelA: "Locked out, shoulders down",
    labelB: "Upper arms parallel",
    focus: "Lean forward for chest, stay upright for triceps.",
  },

  shrug: {
    view: "front",
    anchor: "feet",
    prop: "barbell-grip",
    env: ["floor"],
    firstPhase: "concentric",
    a: p({ upperArm: 6, foreArm: 6, shoulderLift: 0, neck: 0 }),
    b: p({ upperArm: 6, foreArm: 6, shoulderLift: 9, neck: -4 }),
    labelA: "Full stretch, shoulders down",
    labelB: "Shrug to the ears, pause",
    focus: "Straight up and down. Hold the top squeeze for two seconds.",
  },

  "face-pull": {
    view: "front",
    anchor: "feet",
    prop: "cable-high",
    env: ["cable-tower", "floor"],
    firstPhase: "concentric",
    a: p({ torso: 4, upperArm: 82, foreArm: 88, gripSpread: 6 }),
    b: p({ torso: 4, upperArm: 96, foreArm: 166, gripSpread: 22 }),
    labelA: "Arms extended at eye level",
    labelB: "Hands beside the ears, elbows high",
    focus: "Finish in a double-biceps pose with the pinkies rotated back.",
  },

  "leg-extension": {
    view: "side",
    anchor: "none",
    prop: "machine-handles",
    env: ["leg-machine", "seat"],
    firstPhase: "concentric",
    a: p({ hipX: 92, hipY: 102, torso: -6, thigh: 95, shank: 2, upperArm: -20, foreArm: 40 }),
    b: p({ hipX: 92, hipY: 102, torso: -6, thigh: 95, shank: 86, upperArm: -20, foreArm: 40 }),
    labelA: "Knees bent, tension on",
    labelB: "Full extension, quads squeezed",
    focus: "Squeeze hard at the top for a full second on every rep.",
  },

  "leg-curl": {
    view: "side",
    anchor: "none",
    prop: "machine-handles",
    env: ["leg-machine", "seat"],
    firstPhase: "concentric",
    a: p({ hipX: 92, hipY: 102, torso: -6, thigh: 95, shank: 62, upperArm: -20, foreArm: 40 }),
    b: p({ hipX: 92, hipY: 102, torso: -6, thigh: 95, shank: -34, upperArm: -20, foreArm: 40 }),
    labelA: "Legs extended, hamstrings long",
    labelB: "Heels curled under, squeeze",
    focus: "Hips stay planted. Control the stretch on the way back.",
  },

  "hip-thrust": {
    view: "side",
    anchor: "none",
    prop: "barbell-hips",
    env: ["thrust-bench", "floor"],
    firstPhase: "concentric",
    a: p({ hipX: 104, hipY: 128, torso: -58, thigh: 68, shank: 26, upperArm: 60, foreArm: 60 }),
    b: p({ hipX: 104, hipY: 110, torso: -86, thigh: 96, shank: 4, upperArm: 40, foreArm: 40 }),
    labelA: "Hips down, glutes stretched",
    labelB: "Full lockout, ribs down",
    focus: "Finish with the glutes, not with a lower-back arch.",
  },

  "calf-raise": {
    view: "side",
    anchor: "feet",
    prop: "machine-handles",
    env: ["step", "floor"],
    firstPhase: "concentric",
    a: p({ hipY: 92, foot: 26, torso: 3, upperArm: 4, foreArm: 4 }),
    b: p({ hipY: 80, foot: -42, torso: 3, upperArm: 4, foreArm: 4 }),
    labelA: "Heels dropped, deep stretch",
    labelB: "Up on the toes, hard squeeze",
    focus: "Full stretch at the bottom, full contraction at the top. No bouncing.",
  },

  crunch: {
    view: "side",
    anchor: "none",
    prop: "none",
    env: ["floor"],
    firstPhase: "concentric",
    a: p({ hipX: 104, hipY: 128, torso: -92, thigh: 105, shank: 22, upperArm: -140, foreArm: -160 }),
    b: p({ hipX: 104, hipY: 128, torso: -62, thigh: 105, shank: 22, upperArm: -140, foreArm: -160 }),
    labelA: "Lower back flat on the floor",
    labelB: "Ribs curled toward the hips",
    focus: "Flex the spine — exhale hard as the ribs come down.",
  },

  plank: {
    view: "side",
    anchor: "none",
    prop: "none",
    env: ["floor"],
    firstPhase: "eccentric",
    a: p({ hipX: 100, hipY: 118, torso: -96, thigh: 92, shank: 4, upperArm: 8, foreArm: -78 }),
    b: p({ hipX: 100, hipY: 120, torso: -95, thigh: 92, shank: 4, upperArm: 8, foreArm: -78 }),
    labelA: "Braced, straight line",
    labelB: "Hold — hips never sag",
    focus: "Squeeze glutes and abs. A hard 30 seconds beats a sloppy 3 minutes.",
  },

  "russian-twist": {
    view: "front",
    anchor: "none",
    prop: "ball",
    env: ["floor"],
    firstPhase: "concentric",
    a: p({ hipX: 100, hipY: 120, torso: -26, thigh: 118, shank: 30, upperArm: 60, foreArm: 30 }),
    b: p({ hipX: 100, hipY: 120, torso: 26, thigh: 118, shank: 30, upperArm: 60, foreArm: 30 }),
    labelA: "Rotate left, chest up",
    labelB: "Rotate right, chest up",
    focus: "Rotate from the ribcage. Slow beats fast every time.",
  },

  run: {
    view: "side",
    anchor: "feet",
    prop: "none",
    env: ["floor"],
    firstPhase: "concentric",
    a: p({
      torso: 12,
      hipY: 88,
      thigh: 38,
      shank: -22,
      thighB: -26,
      shankB: 42,
      upperArm: -38,
      foreArm: -110,
      upperArmB: 34,
      foreArmB: 108,
    }),
    b: p({
      torso: 12,
      hipY: 88,
      thigh: -26,
      shank: 42,
      thighB: 38,
      shankB: -22,
      upperArm: 34,
      foreArm: 108,
      upperArmB: -38,
      foreArmB: -110,
    }),
    labelA: "Drive knee up",
    labelB: "Opposite knee drives",
    focus: "Tall posture, relaxed shoulders, quick turnover.",
  },

  jump: {
    view: "side",
    anchor: "feet",
    prop: "none",
    env: ["floor"],
    firstPhase: "concentric",
    a: p({ torso: 30, hipY: 108, thigh: 58, shank: -30, upperArm: -50, foreArm: -30 }),
    b: p({ torso: 4, hipY: 80, thigh: 2, shank: -2, upperArm: 170, foreArm: 176 }),
    labelA: "Load — hips back, arms behind",
    labelB: "Triple extension, arms up",
    focus: "Explode up, land soft with bent knees.",
  },
};

export function patternFor(pattern: MovementPattern): PatternSpec {
  return PATTERNS[pattern] ?? PATTERNS.squat;
}

/**
 * Parse a tempo string ("3-1-1-0") into seconds per phase.
 * Falls back to a neutral 2-0-1-0 for holds and non-numeric tempos.
 */
export function parseTempo(tempo: string): {
  eccentric: number;
  pauseBottom: number;
  concentric: number;
  pauseTop: number;
} {
  const parts = tempo.split("-").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return { eccentric: 2, pauseBottom: 0.3, concentric: 1, pauseTop: 0.3 };
  }
  const [eccentric, pauseBottom, concentric, pauseTop] = parts;
  return {
    eccentric: Math.max(0.4, eccentric),
    pauseBottom: Math.max(0.15, pauseBottom),
    concentric: Math.max(0.4, concentric),
    pauseTop: Math.max(0.15, pauseTop),
  };
}
