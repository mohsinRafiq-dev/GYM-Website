"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock,
  Dumbbell,
  Info,
  Layers,
  Moon,
  Repeat,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Pill } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { MuscleBalanceChart } from "@/components/charts";
import { allPrograms, getProgram, weeklySetsByMuscle, totalSets } from "@/lib/data/programs";
import { exerciseName } from "@/lib/data/exercises";
import { useData } from "@/lib/store/data-context";
import { DAY_KEYS, DAY_LABELS } from "@/lib/types";
import { cn, dayKeyOf } from "@/lib/utils";

export default function PlanPage() {
  const { data, updateProfile } = useData();
  const [switching, setSwitching] = useState(false);

  const program = getProgram(data?.profile.programId);
  const today = dayKeyOf();
  const weekly = useMemo(() => weeklySetsByMuscle(program), [program]);

  if (!data) return null;

  const switchTo = (id: string) => {
    const next = getProgram(id);
    updateProfile({
      programId: id,
      trainingDays: Object.values(next.days)
        .filter((d) => d.type !== "rest")
        .map((d) => d.key),
    });
    setSwitching(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={program.name}
        subtitle={program.description}
        badge={`${program.daysPerWeek} days / week`}
        action={
          <Button variant="outline" onClick={() => setSwitching(true)} icon={<Repeat size={15} />}>
            Change programme
          </Button>
        }
      />

      {/* -------------------------------------------------------- week */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {DAY_KEYS.map((key) => {
          const d = program.days[key];
          const isToday = key === today;
          const rest = d.type === "rest";
          const mobility = d.type === "mobility";
          return (
            <Card
              key={key}
              className={cn(
                "transition hover:border-volt/40",
                isToday && "border-volt/60 shadow-[0_0_36px_-16px_var(--c-volt)]",
              )}
            >
              <Link href={`/plan/${key}`} className="block p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-faint">
                    {DAY_LABELS[key]}
                  </span>
                  {isToday && <Pill tone="volt">Today</Pill>}
                </div>

                <h3 className="mt-2 flex items-center gap-1.5 font-display text-base font-semibold">
                  {rest && <Moon size={14} className="text-faint" />}
                  {d.title}
                </h3>
                <p className="mt-0.5 text-[11px] text-faint">{d.focus}</p>

                {!rest && (
                  <>
                    <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted">
                      <span className="flex items-center gap-1">
                        <Dumbbell size={11} className="text-volt" />
                        {d.exercises.length} moves
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers size={11} className="text-volt" />
                        {totalSets(d)} sets
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} className="text-volt" />
                        {d.estimatedMinutes}m
                      </span>
                    </div>

                    <ul className="mt-3 space-y-1">
                      {d.exercises.slice(0, 4).map((e) => (
                        <li
                          key={e.exerciseId}
                          className="flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="truncate text-muted">
                            {exerciseName(e.exerciseId)}
                          </span>
                          <span className="shrink-0 text-faint tnum">
                            {e.sets}×{e.reps}
                          </span>
                        </li>
                      ))}
                      {d.exercises.length > 4 && (
                        <li className="text-[11px] text-faint">
                          +{d.exercises.length - 4} more
                        </li>
                      )}
                    </ul>
                  </>
                )}

                {rest && (
                  <p className="mt-3 text-[11px] leading-relaxed text-muted">
                    Recovery is where the adaptation happens. Sleep, eat, walk.
                  </p>
                )}

                <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-volt">
                  {mobility || rest ? "Open" : "Session detail"} <ChevronRight size={12} />
                </span>
              </Link>
            </Card>
          );
        })}
      </div>

      {/* ----------------------------------------------- volume + rules */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Programmed weekly volume"
            subtitle="Prescribed hard sets per muscle, judged against recoverable landmarks"
            icon={<Layers size={15} />}
          />
          <CardBody>
            <MuscleBalanceChart sets={weekly} height={340} limit={13} />
            <p className="mt-3 text-[11px] leading-relaxed text-faint">
              Primary movers count as a full set, secondary movers as half — the convention the
              volume landmarks are written against.
            </p>
          </CardBody>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader
              title="How you progress"
              subtitle={`${program.mesocycleWeeks}-week mesocycle`}
              icon={<ArrowRight size={15} />}
            />
            <CardBody>
              <ol className="space-y-2.5">
                {program.progression.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-sm text-muted">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-volt/15 text-[10px] font-bold text-volt">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{p}</span>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Equipment you'll need" icon={<Info size={15} />} />
            <CardBody className="flex flex-wrap gap-1.5">
              {program.equipmentNeeded.map((e) => (
                <Pill key={e} tone="ice">
                  {e.replace("-", " ")}
                </Pill>
              ))}
            </CardBody>
          </Card>

          <Card className="border-volt/30">
            <CardBody className="pt-4">
              <p className="font-display text-sm font-semibold">Today: {program.days[today].title}</p>
              <p className="mt-1 text-xs text-muted">{program.days[today].focus}</p>
              <div className="mt-3 flex gap-2">
                <ButtonLink href="/train" variant="primary" size="sm">
                  Start session
                </ButtonLink>
                <ButtonLink href={`/plan/${today}`} variant="outline" size="sm">
                  See detail
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* ------------------------------------------------------ switcher */}
      <Modal
        open={switching}
        onClose={() => setSwitching(false)}
        title="Choose a programme"
        description="Switching keeps all your history — only the upcoming sessions change."
        size="lg"
      >
        <div className="space-y-2.5">
          {allPrograms().map((p) => {
            const active = p.id === program.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => switchTo(p.id)}
                className={cn(
                  "w-full rounded-lg border p-4 text-left transition",
                  active ? "border-volt bg-volt/8" : "border-line bg-panel2 hover:border-line-strong",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-sm font-semibold">{p.name}</p>
                    <p className="mt-0.5 text-[11px] text-faint">{p.tagline}</p>
                  </div>
                  {active && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-volt text-volt-ink">
                      <Check size={12} />
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">{p.description}</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Pill tone="volt">{p.daysPerWeek} days</Pill>
                  <Pill>{p.level}</Pill>
                  {p.custom && <Pill tone="violet">by {p.custom.createdByName}</Pill>}
                  {p.goal.slice(0, 2).map((g) => (
                    <Pill key={g} tone="ice">
                      {g.replace("-", " ")}
                    </Pill>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
