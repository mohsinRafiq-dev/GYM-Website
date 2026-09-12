"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  Heart,
  Link2,
  ListChecks,
  Megaphone,
  ShieldAlert,
  Target,
  TrendingUp,
  Wind,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { EmptyState, Pill, Stat } from "@/components/ui/feedback";
import { TrendChart } from "@/components/charts";
import { ExerciseAnimation } from "@/components/workout/ExerciseAnimation";
import { MuscleMap } from "@/components/workout/MuscleMap";
import { getExercise, substitutionsFor, EQUIPMENT_LABELS } from "@/lib/data/exercises";
import { useData } from "@/lib/store/data-context";
import { estimate1RM } from "@/lib/fitness";
import { MUSCLE_LABELS } from "@/lib/types";
import { cn, displayWeight, relativeDay, round } from "@/lib/utils";

export default function ExerciseDetailPage() {
  const params = useParams<{ id: string }>();
  const { data, toggleFavorite, setExerciseVideo } = useData();
  const [videoInput, setVideoInput] = useState("");

  const exercise = getExercise(params.id);

  const history = useMemo(() => {
    if (!data || !exercise) return [];
    return data.sessions
      .filter((s) => s.completed && s.exercises.some((e) => e.exerciseId === exercise.id))
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((s) => {
        const ex = s.exercises.find((e) => e.exerciseId === exercise.id)!;
        const working = ex.sets.filter((x) => x.completed && !x.warmup);
        const best = working.reduce(
          (m, x) => Math.max(m, estimate1RM(x.weightKg, x.reps)),
          0,
        );
        return {
          date: s.date,
          label: new Date(s.date).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          }),
          e1rm: round(best, 1),
          volume: Math.round(working.reduce((n, x) => n + x.weightKg * x.reps, 0)),
          topSet: working.sort((a, b) => b.weightKg - a.weightKg)[0],
          sets: working.length,
        };
      });
  }, [data, exercise]);

  if (!data) return null;

  if (!exercise) {
    return (
      <EmptyState
        title="Exercise not found"
        description="That movement isn't in the library."
        action={
          <ButtonLink href="/exercises" variant="primary" size="sm">
            Back to the library
          </ButtonLink>
        }
      />
    );
  }

  const favorite = data.favorites.includes(exercise.id);
  const savedVideo = data.exerciseVideos[exercise.id];
  const searchHref = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    exercise.media.searchQuery,
  )}`;
  const bestE1rm = history.length ? Math.max(...history.map((h) => h.e1rm)) : 0;
  const bestWeight = history.length
    ? Math.max(...history.map((h) => h.topSet?.weightKg ?? 0))
    : 0;

  return (
    <div className="space-y-5">
      <ButtonLink href="/exercises" variant="ghost" size="sm" icon={<ArrowLeft size={14} />}>
        Back to library
      </ButtonLink>

      <PageHeader
        title={exercise.name}
        subtitle={exercise.purpose}
        action={
          <Button
            variant={favorite ? "ember" : "outline"}
            onClick={() => toggleFavorite(exercise.id)}
            icon={<Heart size={15} fill={favorite ? "currentColor" : "none"} />}
          >
            {favorite ? "Saved" : "Save"}
          </Button>
        }
      />

      <div className="flex flex-wrap gap-1.5">
        {exercise.primary.map((m) => (
          <Pill key={m} tone="volt">
            {MUSCLE_LABELS[m]}
          </Pill>
        ))}
        {exercise.secondary.map((m) => (
          <Pill key={m} tone="ice">
            {MUSCLE_LABELS[m]}
          </Pill>
        ))}
        <Pill>{exercise.mechanic}</Pill>
        <Pill>{exercise.difficulty}</Pill>
        {exercise.equipment.map((e) => (
          <Pill key={e}>{EQUIPMENT_LABELS[e]}</Pill>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Animated demonstration"
              subtitle={`Tempo ${exercise.tempo} · ${exercise.repRange[0]}-${exercise.repRange[1]} reps · ${exercise.restSeconds}s rest`}
            />
            <CardBody>
              <ExerciseAnimation pattern={exercise.pattern} tempo={exercise.tempo} size="lg" />

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={savedVideo || searchHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-line bg-panel2 px-3 py-2 text-xs text-muted transition hover:border-volt hover:text-volt"
                >
                  <ExternalLink size={13} />
                  {savedVideo ? "Open saved video" : "Find form videos on YouTube"}
                </a>
              </div>

              <div className="mt-3 rounded-lg border border-line bg-panel2 p-3">
                <Field
                  label="Save a video link for the crew"
                  hint="Paste a link your team agrees demonstrates this properly. Everyone using this browser profile sees it."
                >
                  <div className="flex gap-2">
                    <Input
                      value={videoInput}
                      onChange={(e) => setVideoInput(e.target.value)}
                      placeholder={savedVideo ?? "https://youtube.com/watch?v=…"}
                    />
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setExerciseVideo(exercise.id, videoInput.trim());
                        setVideoInput("");
                      }}
                      icon={<Link2 size={14} />}
                    >
                      Save
                    </Button>
                  </div>
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="How to do it" icon={<ListChecks size={15} />} />
            <CardBody className="space-y-4 text-sm leading-relaxed text-muted">
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-faint">
                  Set up
                </p>
                <ol className="space-y-1.5">
                  {exercise.setup.map((s, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="font-semibold text-volt tnum">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-faint">
                  Execute
                </p>
                <ol className="space-y-1.5">
                  {exercise.execution.map((s, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="font-semibold text-volt tnum">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
              <p className="flex items-start gap-2 rounded-lg bg-panel2 p-3">
                <Wind size={15} className="mt-0.5 shrink-0 text-ice" />
                <span>
                  <strong className="text-ink">Breathing.</strong> {exercise.breathing}
                </span>
              </p>
            </CardBody>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader title="Coaching cues" icon={<Megaphone size={15} />} />
              <CardBody>
                <ul className="space-y-2">
                  {exercise.cues.map((c, i) => (
                    <li
                      key={i}
                      className="flex gap-2 rounded-lg bg-panel2 p-2.5 text-xs leading-relaxed text-muted"
                    >
                      <span className="text-volt">›</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card>
              <CardHeader title="Common mistakes" icon={<AlertTriangle size={15} />} />
              <CardBody>
                <ul className="space-y-2">
                  {exercise.mistakes.map((m, i) => (
                    <li
                      key={i}
                      className="flex gap-2 rounded-lg bg-danger/8 p-2.5 text-xs leading-relaxed text-muted"
                    >
                      <AlertTriangle size={13} className="mt-0.5 shrink-0 text-danger" />
                      {m}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>

          {exercise.safety && exercise.safety.length > 0 && (
            <Card className="border-warn/30">
              <CardHeader title="Safety" icon={<ShieldAlert size={15} />} />
              <CardBody>
                <ul className="space-y-2">
                  {exercise.safety.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted">
                      <ShieldAlert size={13} className="mt-0.5 shrink-0 text-warn" />
                      {s}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}

          {history.length > 0 && (
            <Card>
              <CardHeader
                title="Your history with this lift"
                subtitle="Estimated 1RM per session — the cleanest signal of strength progress"
                icon={<TrendingUp size={15} />}
              />
              <CardBody>
                <div className="mb-4 grid grid-cols-3 gap-3">
                  <Stat
                    label="Best e1RM"
                    value={displayWeight(bestE1rm, data.settings.units, 1)}
                  />
                  <Stat
                    label="Heaviest set"
                    value={displayWeight(bestWeight, data.settings.units, 1)}
                  />
                  <Stat label="Sessions" value={history.length} />
                </div>
                <TrendChart
                  data={history.map((h) => ({ label: h.label, value: h.e1rm }))}
                  unit="kg"
                  seriesLabel="Estimated 1RM"
                  kind="line"
                  decimals={1}
                  height={200}
                />
                <ul className="mt-4 divide-y divide-line">
                  {[...history]
                    .reverse()
                    .slice(0, 6)
                    .map((h) => (
                      <li key={h.date} className="flex items-center justify-between py-2 text-xs">
                        <span className="text-muted">{relativeDay(h.date)}</span>
                        <span className="text-ink tnum">
                          {h.topSet
                            ? `${displayWeight(h.topSet.weightKg, data.settings.units, 1)} × ${h.topSet.reps}`
                            : "—"}
                          <span className="ml-2 text-faint">
                            {h.sets} sets · {h.volume.toLocaleString()} kg
                          </span>
                        </span>
                      </li>
                    ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>

        {/* ------------------------------------------------------ sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Muscles worked" icon={<Target size={15} />} />
            <CardBody>
              <MuscleMap data={exercise.activation} />
              <ul className="mt-3 space-y-1.5">
                {Object.entries(exercise.activation)
                  .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
                  .map(([muscle, value]) => (
                    <li key={muscle} className="flex items-center gap-2 text-xs">
                      <span className="w-24 shrink-0 text-muted">
                        {MUSCLE_LABELS[muscle as keyof typeof MUSCLE_LABELS]}
                      </span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel3">
                        <span
                          className={cn(
                            "block h-full rounded-full",
                            (value ?? 0) > 0.7
                              ? "bg-ember"
                              : (value ?? 0) > 0.34
                                ? "bg-volt"
                                : "bg-ice",
                          )}
                          style={{ width: `${Math.round((value ?? 0) * 100)}%` }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right text-faint tnum">
                        {Math.round((value ?? 0) * 100)}%
                      </span>
                    </li>
                  ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Prescription"
              subtitle="Sensible defaults for hypertrophy"
            />
            <CardBody>
              <dl className="space-y-2 text-xs">
                {[
                  ["Rep range", `${exercise.repRange[0]}-${exercise.repRange[1]}`],
                  ["Rest", `${exercise.restSeconds}s`],
                  ["Tempo", exercise.tempo],
                  ["Force", exercise.force],
                  ["Mechanic", exercise.mechanic],
                  ["Rating", `${exercise.rating}/100`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <dt className="text-muted">{k}</dt>
                    <dd className="font-medium text-ink tnum">{v}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Swap it for" subtitle="Same slot, ranked" />
            <CardBody>
              <ul className="space-y-1.5">
                {substitutionsFor(exercise.id).map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/exercises/${s.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-line bg-panel2 p-2.5 text-xs transition hover:border-volt"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-ink">{s.name}</span>
                        <span className="text-[10px] text-faint">
                          {s.equipment.slice(0, 2).map((e) => EQUIPMENT_LABELS[e]).join(" · ")}
                        </span>
                      </span>
                      <Pill tone="volt">{s.rating}</Pill>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
