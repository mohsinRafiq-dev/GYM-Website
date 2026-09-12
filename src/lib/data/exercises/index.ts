import type { Difficulty, Equipment, Exercise, MuscleGroup } from "@/lib/types";
import { armExercises } from "./arms";
import { backExercises } from "./back";
import { chestExercises } from "./chest";
import { conditioningExercises } from "./conditioning";
import { coreExercises } from "./core";
import { legExercises } from "./legs";
import { shoulderExercises } from "./shoulders";

export const EXERCISES: Exercise[] = [
  ...chestExercises,
  ...backExercises,
  ...shoulderExercises,
  ...armExercises,
  ...legExercises,
  ...coreExercises,
  ...conditioningExercises,
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise | undefined {
  return BY_ID.get(id);
}

/** Throws in development if a program references an id that doesn't exist. */
export function requireExercise(id: string): Exercise {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown exercise id: ${id}`);
  return found;
}

export function exerciseName(id: string): string {
  return BY_ID.get(id)?.name ?? id;
}

export function exercisesByMuscle(muscle: MuscleGroup): Exercise[] {
  return EXERCISES.filter(
    (e) => e.primary.includes(muscle) || e.secondary.includes(muscle),
  ).sort((a, b) => b.rating - a.rating);
}

export interface ExerciseFilter {
  query?: string;
  muscles?: MuscleGroup[];
  equipment?: Equipment[];
  difficulty?: Difficulty[];
  mechanic?: "compound" | "isolation";
}

export function filterExercises(filter: ExerciseFilter): Exercise[] {
  const q = filter.query?.trim().toLowerCase();
  return EXERCISES.filter((e) => {
    if (q) {
      const haystack = [e.name, ...(e.aliases ?? []), ...e.primary, e.purpose]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filter.muscles?.length) {
      const hit = filter.muscles.some(
        (m) => e.primary.includes(m) || e.secondary.includes(m),
      );
      if (!hit) return false;
    }
    if (filter.equipment?.length) {
      const hit = filter.equipment.some((eq) => e.equipment.includes(eq));
      if (!hit) return false;
    }
    if (filter.difficulty?.length && !filter.difficulty.includes(e.difficulty)) {
      return false;
    }
    if (filter.mechanic && e.mechanic !== filter.mechanic) return false;
    return true;
  }).sort((a, b) => b.rating - a.rating);
}

/** Ranked alternatives: declared substitutions first, then same-pattern matches. */
export function substitutionsFor(id: string, availableEquipment?: Equipment[]): Exercise[] {
  const base = BY_ID.get(id);
  if (!base) return [];
  const declared = base.substitutions
    .map((s) => BY_ID.get(s))
    .filter((e): e is Exercise => Boolean(e));

  const sameSlot = EXERCISES.filter(
    (e) =>
      e.id !== id &&
      !declared.some((d) => d.id === e.id) &&
      e.primary.some((m) => base.primary.includes(m)) &&
      e.pattern === base.pattern,
  );

  let out = [...declared, ...sameSlot];
  if (availableEquipment?.length) {
    out = out.filter((e) => e.equipment.some((eq) => availableEquipment.includes(eq)));
  }
  return out.slice(0, 8);
}

export const ALL_MUSCLES: MuscleGroup[] = Array.from(
  new Set(EXERCISES.flatMap((e) => [...e.primary, ...e.secondary])),
);

export const ALL_EQUIPMENT: Equipment[] = Array.from(
  new Set(EXERCISES.flatMap((e) => e.equipment)),
).sort();

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine: "Machine",
  cable: "Cable",
  smith: "Smith Machine",
  bodyweight: "Bodyweight",
  kettlebell: "Kettlebell",
  band: "Resistance Band",
  "ez-bar": "EZ Bar",
  bench: "Bench",
  "pullup-bar": "Pull-Up Bar",
  "medicine-ball": "Medicine Ball",
  "cardio-machine": "Cardio Machine",
  none: "No Equipment",
};

export { chestExercises, backExercises, shoulderExercises, armExercises, legExercises, coreExercises, conditioningExercises };
