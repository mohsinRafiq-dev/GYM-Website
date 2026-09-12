"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import {
  ArrowLeft,
  Clock,
  Dumbbell,
  Flame,
  Layers,
  Lightbulb,
  Play,
  Snowflake,
  Sparkles,
  Target,
  Thermometer,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Pill } from "@/components/ui/feedback";
import { ExerciseCard } from "@/components/workout/ExerciseCard";
import { MuscleMap } from "@/components/workout/MuscleMap";
import { getProgram, dayActivation, totalSets } from "@/lib/data/programs";
import { getExercise } from "@/lib/data/exercises";
import { useData } from "@/lib/store/data-context";
import { DAY_KEYS, DAY_LABELS, MUSCLE_LABELS, type DayKey } from "@/lib/types";
import { dayKeyOf } from "@/lib/utils";

export default function PlanDayPage() {
  const params = useParams<{ day: string }>();
  const { data, toggleFavorite } = useData();

  const dayKey = (DAY_KEYS.includes(params.day as DayKey) ? params.day : "monday") as DayKey;
  const program = getProgram(data?.profile.programId);
  const day = program.days[dayKey];
  const isToday = dayKey === dayKeyOf();

  const grouped = useMemo(() => {
    const out: { group?: string; items: typeof day.exercises }[] = [];
    for (const ex of day.exercises) {
      const last = out[out.length - 1];
      if (ex.supersetGroup && last?.group === ex.supersetGroup) last.items.push(ex);
      else out.push({ group: ex.supersetGroup, items: [ex] });
    }
    return out;
  }, [day]);

  if (!data) return null;

  const rest = day.type === "rest";

  return (
    <div className="space-y-6">
      <ButtonLink href="/plan" variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
        Back to the week
      </ButtonLink>

      <PageHeader
        title={day.title}
        subtitle={day.brief}
        badge={isToday ? "Today" : DAY_LABELS[dayKey]}
        action={
          !rest && (
            <ButtonLink href="/train" variant="primary" size="lg" icon={<Play size={16} />}>
              {isToday ? "Start this session" : "Train this session"}
            </ButtonLink>
          )
        }
      />

      {!rest && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Exercises", value: day.exercises.length, icon: <Dumbbell size={14} /> },
            { label: "Working sets", value: totalSets(day), icon: <Layers size={14} /> },
            { label: "Est. duration", value: `${day.estimatedMinutes}m`, icon: <Clock size={14} /> },
            { label: "Focus", value: day.focus.split(" — ")[0], icon: <Target size={14} /> },
          ].map((s) => (
            <Card key={s.label} className="p-3">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-faint">
                <span className="text-volt">{s.icon}</span>
                {s.label}
              </p>
              <p className="mt-1 truncate font-display text-lg font-bold tnum">{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div className="space-y-5">
          {/* ------------------------------------------------- warm-up */}
          {day.warmup.length > 0 && (
            <Card>
              <CardHeader
                title="Warm-up"
                subtitle="Non-negotiable. It is the cheapest injury insurance you can buy."
                icon={<Thermometer size={15} />}
              />
              <CardBody>
                <ol className="space-y-2">
                  {day.warmup.map((w, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-muted">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ember/15 text-[10px] font-bold text-ember">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{w}</span>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          )}

          {/* ------------------------------------------------ exercises */}
          {day.exercises.length > 0 && (
            <div>
              <h2 className="mb-3 font-display text-lg font-semibold">
                {rest ? "Recovery work" : "The session"}
              </h2>
              <div className="space-y-3">
                {grouped.map((block, bi) => (
                  <div
                    key={bi}
                    className={
                      block.group
                        ? "space-y-2 rounded-xl border border-violet/25 bg-violet/5 p-2"
                        : undefined
                    }
                  >
                    {block.group && (
                      <p className="px-1.5 pt-1 text-[10px] font-semibold uppercase tracking-widest text-violet">
                        Superset {block.group} — alternate with minimal rest
                      </p>
                    )}
                    {block.items.map((planned) => {
                      const ex = getExercise(planned.exerciseId);
                      if (!ex) return null;
                      return (
                        <ExerciseCard
                          key={planned.exerciseId}
                          exercise={ex}
                          prescription={planned}
                          index={planned.order}
                          isFavorite={data.favorites.includes(ex.id)}
                          onToggleFavorite={() => toggleFavorite(ex.id)}
                          videoUrl={data.exerciseVideos[ex.id]}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ------------------------------------------------- finisher */}
          {day.finisher && day.finisher.length > 0 && (
            <Card className="border-ember/30">
              <CardHeader
                title="Finisher"
                subtitle="Optional, but it's where the character is built."
                icon={<Flame size={15} />}
              />
              <CardBody>
                <ul className="space-y-1.5">
                  {day.finisher.map((f, i) => (
                    <li key={i} className="text-sm leading-relaxed text-muted">
                      {f}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {/* ------------------------------------------------ cool-down */}
          <Card>
            <CardHeader
              title="Cool-down"
              subtitle="Two minutes here saves you three days of stiffness."
              icon={<Snowflake size={15} />}
            />
            <CardBody>
              <ul className="space-y-1.5">
                {day.cooldown.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-muted">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ice" />
                    {c}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>

        {/* -------------------------------------------------- sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="What this session hits" icon={<Target size={15} />} />
            <CardBody>
              <MuscleMap data={dayActivation(day)} />
              {day.targets.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {day.targets.map((t) => (
                    <Pill key={t} tone="volt">
                      {MUSCLE_LABELS[t]}
                    </Pill>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {day.coachNotes.length > 0 && (
            <Card className="border-volt/25">
              <CardHeader
                title="Coach's notes"
                subtitle="The things that actually go wrong"
                icon={<Lightbulb size={15} />}
              />
              <CardBody>
                <ul className="space-y-2.5">
                  {day.coachNotes.map((n, i) => (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted">
                      <Sparkles size={13} className="mt-0.5 shrink-0 text-volt" />
                      {n}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="The rest of the week" />
            <CardBody>
              <ul className="space-y-1">
                {DAY_KEYS.map((k) => {
                  const d = program.days[k];
                  const current = k === dayKey;
                  return (
                    <li key={k}>
                      <ButtonLink
                        href={`/plan/${k}`}
                        variant={current ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-between"
                      >
                        <span className="truncate">{DAY_LABELS[k].slice(0, 3)} · {d.title}</span>
                        {d.type !== "rest" && (
                          <span className="text-[10px] text-faint tnum">
                            {d.exercises.length}
                          </span>
                        )}
                      </ButtonLink>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
