"use client";

import { useMemo, useState } from "react";
import { Filter, Heart, Search, X } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Chip, Input, Segmented, Select } from "@/components/ui/form";
import { EmptyState, Pill } from "@/components/ui/feedback";
import { ExerciseCard } from "@/components/workout/ExerciseCard";
import {
  ALL_EQUIPMENT,
  EQUIPMENT_LABELS,
  EXERCISES,
  filterExercises,
} from "@/lib/data/exercises";
import { useData } from "@/lib/store/data-context";
import { MUSCLE_LABELS, type Difficulty, type Equipment, type MuscleGroup } from "@/lib/types";

const MUSCLE_ORDER: MuscleGroup[] = [
  "chest",
  "lats",
  "upper-back",
  "traps",
  "front-delts",
  "side-delts",
  "rear-delts",
  "biceps",
  "triceps",
  "forearms",
  "abs",
  "obliques",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "lower-back",
  "cardio",
];

export default function ExercisesPage() {
  const { data, toggleFavorite } = useData();
  const [query, setQuery] = useState("");
  const [muscles, setMuscles] = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<Equipment | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [mechanic, setMechanic] = useState<"all" | "compound" | "isolation">("all");
  const [tab, setTab] = useState<"all" | "favorites">("all");
  const [showFilters, setShowFilters] = useState(false);

  const results = useMemo(() => {
    const base = filterExercises({
      query,
      muscles: muscles.length ? muscles : undefined,
      equipment: equipment === "all" ? undefined : [equipment],
      difficulty: difficulty === "all" ? undefined : [difficulty],
      mechanic: mechanic === "all" ? undefined : mechanic,
    });
    if (tab === "favorites") {
      return base.filter((e) => data?.favorites.includes(e.id));
    }
    return base;
  }, [query, muscles, equipment, difficulty, mechanic, tab, data?.favorites]);

  if (!data) return null;

  const activeFilters =
    muscles.length + (equipment !== "all" ? 1 : 0) + (difficulty !== "all" ? 1 : 0) + (mechanic !== "all" ? 1 : 0);

  const clear = () => {
    setMuscles([]);
    setEquipment("all");
    setDifficulty("all");
    setMechanic("all");
    setQuery("");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Exercise library"
        subtitle={`${EXERCISES.length} movements with animated demonstrations, coaching cues, the mistakes to avoid and ranked substitutions.`}
        badge={`${results.length} shown`}
      />

      {/* --------------------------------------------------- search bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises, muscles or equipment…"
            className="pl-9"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: "All" },
            {
              value: "favorites",
              label: (
                <span className="flex items-center gap-1">
                  <Heart size={11} />
                  {data.favorites.length}
                </span>
              ),
            },
          ]}
        />

        <Button
          variant={showFilters || activeFilters ? "primary" : "secondary"}
          onClick={() => setShowFilters((v) => !v)}
          icon={<Filter size={15} />}
        >
          Filters{activeFilters ? ` (${activeFilters})` : ""}
        </Button>
      </div>

      {/* ------------------------------------------------------ filters */}
      {showFilters && (
        <div className="card space-y-4 p-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-faint">
              Muscle group
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MUSCLE_ORDER.map((m) => (
                <Chip
                  key={m}
                  active={muscles.includes(m)}
                  onClick={() =>
                    setMuscles((prev) =>
                      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m],
                    )
                  }
                >
                  {MUSCLE_LABELS[m]}
                </Chip>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-faint">
                Equipment
              </p>
              <Select
                value={equipment}
                onChange={(e) => setEquipment(e.target.value as Equipment | "all")}
              >
                <option value="all">Any equipment</option>
                {ALL_EQUIPMENT.map((eq) => (
                  <option key={eq} value={eq}>
                    {EQUIPMENT_LABELS[eq]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-faint">
                Difficulty
              </p>
              <Select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty | "all")}
              >
                <option value="all">Any level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </Select>
            </div>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-faint">
                Type
              </p>
              <Select
                value={mechanic}
                onChange={(e) =>
                  setMechanic(e.target.value as "all" | "compound" | "isolation")
                }
              >
                <option value="all">Compound &amp; isolation</option>
                <option value="compound">Compound only</option>
                <option value="isolation">Isolation only</option>
              </Select>
            </div>
          </div>

          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={clear} icon={<X size={13} />}>
              Clear all filters
            </Button>
          )}
        </div>
      )}

      {/* ------------------------------------------------------- results */}
      {results.length === 0 ? (
        <EmptyState
          icon={<Search size={28} />}
          title={tab === "favorites" ? "No saved exercises yet" : "Nothing matches those filters"}
          description={
            tab === "favorites"
              ? "Tap the heart on any exercise to keep it here for quick access."
              : "Try widening the muscle group or clearing the equipment filter."
          }
          action={
            <Button variant="secondary" size="sm" onClick={clear}>
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5">
          {results.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              isFavorite={data.favorites.includes(ex.id)}
              onToggleFavorite={() => toggleFavorite(ex.id)}
              videoUrl={data.exerciseVideos[ex.id]}
            />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-faint">
        <Pill tone="volt">Rating</Pill>
        <span>
          Higher = better return on effort for most people, weighing stimulus, loadability and
          how easy the movement is to do well.
        </span>
      </div>
    </div>
  );
}
