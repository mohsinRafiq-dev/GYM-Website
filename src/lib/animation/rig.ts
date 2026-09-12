/* ============================================================================
 * Figure rig — forward kinematics for the animated exercise demonstrations.
 *
 * A pose is a small set of joint ANGLES rather than coordinates, so keyframes
 * stay readable and interpolate naturally. Angles are absolute, measured in
 * degrees from straight-down, positive rotating toward +x.
 *
 *   0   = segment points straight down
 *   90  = points forward (+x, the direction the side-view figure faces)
 *   180 = points straight up
 *   -30 = points down and backward
 *
 * Torso is the exception: it is measured from straight-up, positive = leaning
 * forward. Standing tall is 0.
 * ========================================================================= */

export interface Pose {
  /** Pelvis position in viewBox units. */
  hipX: number;
  hipY: number;
  /** Torso lean from vertical, + = forward. */
  torso: number;
  /** Head tilt relative to the torso. */
  neck: number;
  /** Near-side arm. */
  upperArm: number;
  foreArm: number;
  /** Near-side leg. */
  thigh: number;
  shank: number;
  /** Foot angle from horizontal, + = toes up. */
  foot: number;
  /** Far-side limbs. Default to the near side (symmetric movement). */
  upperArmB?: number;
  foreArmB?: number;
  thighB?: number;
  shankB?: number;
  /** Extra hand separation in front view (0 = shoulder width). */
  gripSpread?: number;
  /** Scapular elevation in viewBox units — drives shrugs and hangs. */
  shoulderLift?: number;
}

export const SEG = {
  TORSO: 38,
  NECK: 7,
  HEAD_R: 8.5,
  UPPER: 24,
  FORE: 22,
  HAND: 4,
  THIGH: 32,
  SHANK: 30,
  FOOT: 14,
  SHOULDER_HALF: 12,
  HIP_HALF: 8,
} as const;

export const STAGE = {
  width: 200,
  height: 170,
  floorY: 152,
} as const;

export type Pt = { x: number; y: number };

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Direction of a segment hanging from a joint at `deg` (0 = straight down). */
function dirDown(deg: number, mirror = false): Pt {
  const s = Math.sin(rad(deg));
  return { x: mirror ? -s : s, y: Math.cos(rad(deg)) };
}

function add(p: Pt, d: Pt, len: number): Pt {
  return { x: p.x + d.x * len, y: p.y + d.y * len };
}

export interface Skeleton {
  pelvis: Pt;
  hipL: Pt;
  hipR: Pt;
  chest: Pt;
  shoulderL: Pt;
  shoulderR: Pt;
  neck: Pt;
  head: Pt;
  elbowL: Pt;
  elbowR: Pt;
  handL: Pt;
  handR: Pt;
  kneeL: Pt;
  kneeR: Pt;
  ankleL: Pt;
  ankleR: Pt;
  toeL: Pt;
  toeR: Pt;
  /** Mid-point between the hands — where a bar or handle sits. */
  grip: Pt;
}

/**
 * Build joint coordinates from a pose.
 * In `front` view the limb angles are mirrored on the far side so raises and
 * pulldowns read symmetrically. In `side` view the far limbs are drawn behind
 * with their own angles (useful for lunges and split stances).
 */
export function solve(pose: Pose, view: "side" | "front"): Skeleton {
  const front = view === "front";
  const pelvis: Pt = { x: pose.hipX, y: pose.hipY };

  // torso: up-vector rotated forward by `torso` degrees
  const up: Pt = { x: Math.sin(rad(pose.torso)), y: -Math.cos(rad(pose.torso)) };
  const chest = add(pelvis, up, SEG.TORSO * 0.55);
  const shoulderMid = add(pelvis, up, SEG.TORSO);
  const neckDir: Pt = {
    x: Math.sin(rad(pose.torso + pose.neck)),
    y: -Math.cos(rad(pose.torso + pose.neck)),
  };
  const neck = add(shoulderMid, neckDir, SEG.NECK);
  const head = add(neck, neckDir, SEG.HEAD_R * 0.9);

  // lateral offsets only exist in the front view; the side view stacks limbs
  // with a small parallax offset so the far side stays visible.
  const sw = front ? SEG.SHOULDER_HALF : 3.5;
  const hw = front ? SEG.HIP_HALF : 3;

  const lift = pose.shoulderLift ?? 0;
  const shoulderR: Pt = { x: shoulderMid.x + sw, y: shoulderMid.y - lift };
  const shoulderL: Pt = { x: shoulderMid.x - sw, y: shoulderMid.y - lift };
  const hipR: Pt = { x: pelvis.x + hw, y: pelvis.y };
  const hipL: Pt = { x: pelvis.x - hw, y: pelvis.y };

  const spread = pose.gripSpread ?? 0;

  const upperB = pose.upperArmB ?? pose.upperArm;
  const foreB = pose.foreArmB ?? pose.foreArm;
  const thighB = pose.thighB ?? pose.thigh;
  const shankB = pose.shankB ?? pose.shank;

  // near side (right, drawn in front)
  const elbowR = add(shoulderR, dirDown(pose.upperArm), SEG.UPPER);
  const handR0 = add(elbowR, dirDown(pose.foreArm), SEG.FORE);
  const handR: Pt = { x: handR0.x + (front ? spread : 0), y: handR0.y };

  // far side (left) — mirrored in the front view
  const elbowL = add(shoulderL, dirDown(upperB, front), SEG.UPPER);
  const handL0 = add(elbowL, dirDown(foreB, front), SEG.FORE);
  const handL: Pt = { x: handL0.x - (front ? spread : 0), y: handL0.y };

  const kneeR = add(hipR, dirDown(pose.thigh), SEG.THIGH);
  const ankleR = add(kneeR, dirDown(pose.shank), SEG.SHANK);
  const kneeL = add(hipL, dirDown(thighB, front), SEG.THIGH);
  const ankleL = add(kneeL, dirDown(shankB, front), SEG.SHANK);

  const footDir = (a: number, mirror: boolean): Pt => ({
    x: (mirror ? -1 : 1) * Math.cos(rad(a)),
    y: -Math.sin(rad(a)),
  });
  const toeR = add(ankleR, footDir(pose.foot, false), front ? SEG.FOOT * 0.5 : SEG.FOOT);
  const toeL = add(ankleL, footDir(pose.foot, front), front ? SEG.FOOT * 0.5 : SEG.FOOT);

  return {
    pelvis,
    hipL,
    hipR,
    chest,
    shoulderL,
    shoulderR,
    neck,
    head,
    elbowL,
    elbowR,
    handL,
    handR,
    kneeL,
    kneeR,
    ankleL,
    ankleR,
    toeL,
    toeR,
    grip: { x: (handL.x + handR.x) / 2, y: (handL.y + handR.y) / 2 },
  };
}

/** Linear interpolation between two poses. */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const k = <K extends keyof Pose>(key: K): number => {
    const av = (a[key] ?? 0) as number;
    const bv = (b[key] ?? a[key] ?? 0) as number;
    return av + (bv - av) * t;
  };
  return {
    hipX: k("hipX"),
    hipY: k("hipY"),
    torso: k("torso"),
    neck: k("neck"),
    upperArm: k("upperArm"),
    foreArm: k("foreArm"),
    thigh: k("thigh"),
    shank: k("shank"),
    foot: k("foot"),
    upperArmB: a.upperArmB !== undefined || b.upperArmB !== undefined ? k("upperArmB") : undefined,
    foreArmB: a.foreArmB !== undefined || b.foreArmB !== undefined ? k("foreArmB") : undefined,
    thighB: a.thighB !== undefined || b.thighB !== undefined ? k("thighB") : undefined,
    shankB: a.shankB !== undefined || b.shankB !== undefined ? k("shankB") : undefined,
    gripSpread: a.gripSpread !== undefined || b.gripSpread !== undefined ? k("gripSpread") : undefined,
    shoulderLift:
      a.shoulderLift !== undefined || b.shoulderLift !== undefined ? k("shoulderLift") : undefined,
  };
}

/** Ease in/out so the figure decelerates into each end position. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
