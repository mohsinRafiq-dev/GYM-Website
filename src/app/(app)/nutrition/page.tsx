"use client";

import { useMemo, useState } from "react";
import {
  Apple,
  Beef,
  Calculator,
  Droplets,
  Flame,
  Info,
  Pill as PillIcon,
  Plus,
  Utensils,
  Wheat,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Segmented } from "@/components/ui/form";
import { Pill, Ring } from "@/components/ui/feedback";
import { NUTRITION_PRINCIPLES, SUPPLEMENTS, planFor, scalePlan } from "@/lib/data/nutrition";
import { macroTargets } from "@/lib/fitness";
import { useData } from "@/lib/store/data-context";
import { GOAL_LABELS, type Goal } from "@/lib/types";
import { toISODate, uid as makeId } from "@/lib/utils";

export default function NutritionPage() {
  const { data, logNutrition, updateProfile } = useData();
  const [diet, setDiet] = useState<"veg" | "non-veg">("non-veg");
  const [foodName, setFoodName] = useState("");
  const [foodKcal, setFoodKcal] = useState("");
  const [foodP, setFoodP] = useState("");
  const [foodC, setFoodC] = useState("");
  const [foodF, setFoodF] = useState("");

  const today = toISODate();

  const targets = useMemo(() => {
    if (!data) return null;
    const latest = [...data.metrics].filter((m) => m.weightKg).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    const weightKg = latest?.weightKg ?? data.profile.startWeightKg ?? 75;
    return macroTargets({
      weightKg,
      heightCm: data.profile.heightCm ?? 175,
      age: data.profile.birthYear ? new Date().getFullYear() - data.profile.birthYear : 25,
      sex: data.profile.sex,
      activity: data.profile.activity,
      goal: data.profile.goals[0] ?? "build-muscle",
    });
  }, [data]);

  const log = data?.nutrition.find((n) => n.date === today);

  const plan = useMemo(() => {
    if (!data || !targets) return null;
    const base = planFor(
      data.profile.goals[0] === "lose-fat" ? "lose-fat" : "build-muscle",
      diet,
    );
    return scalePlan(base, targets.calories);
  }, [data, targets, diet]);

  if (!data || !targets || !plan) return null;

  const consumed = {
    calories: log?.calories ?? 0,
    proteinG: log?.proteinG ?? 0,
    carbsG: log?.carbsG ?? 0,
    fatG: log?.fatG ?? 0,
    waterMl: log?.waterMl ?? 0,
  };

  const addWater = (ml: number) =>
    logNutrition(today, { waterMl: Math.max(0, consumed.waterMl + ml) });

  const addFood = () => {
    if (!foodName.trim() || !foodKcal) return;
    const entry = {
      id: makeId("food"),
      name: foodName.trim(),
      kcal: Number(foodKcal) || 0,
      p: Number(foodP) || 0,
      c: Number(foodC) || 0,
      f: Number(foodF) || 0,
    };
    logNutrition(today, {
      entries: [...(log?.entries ?? []), entry],
      calories: consumed.calories + entry.kcal,
      proteinG: consumed.proteinG + entry.p,
      carbsG: consumed.carbsG + entry.c,
      fatG: consumed.fatG + entry.f,
    });
    setFoodName("");
    setFoodKcal("");
    setFoodP("");
    setFoodC("");
    setFoodF("");
  };

  const removeFood = (id: string) => {
    const entry = log?.entries.find((e) => e.id === id);
    if (!entry) return;
    logNutrition(today, {
      entries: (log?.entries ?? []).filter((e) => e.id !== id),
      calories: Math.max(0, consumed.calories - entry.kcal),
      proteinG: Math.max(0, consumed.proteinG - entry.p),
      carbsG: Math.max(0, consumed.carbsG - entry.c),
      fatG: Math.max(0, consumed.fatG - entry.f),
    });
  };

  const macroRows = [
    { key: "protein", label: "Protein", value: consumed.proteinG, target: targets.proteinG, color: "var(--viz-1)", icon: <Beef size={13} /> },
    { key: "carbs", label: "Carbs", value: consumed.carbsG, target: targets.carbsG, color: "var(--viz-4)", icon: <Wheat size={13} /> },
    { key: "fat", label: "Fat", value: consumed.fatG, target: targets.fatG, color: "var(--viz-2)", icon: <Apple size={13} /> },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nutrition"
        subtitle="Training is the stimulus; food is the raw material. These numbers come from your own height, weight, age and activity level."
        action={
          <Segmented
            value={data.profile.goals[0] ?? "build-muscle"}
            onChange={(g) => updateProfile({ goals: [g as Goal, ...data.profile.goals.slice(1)] })}
            options={[
              { value: "build-muscle", label: "Build" },
              { value: "recomp", label: "Recomp" },
              { value: "lose-fat", label: "Cut" },
            ]}
          />
        }
      />

      {/* ------------------------------------------------------- targets */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card glow>
          <CardHeader
            title="Today's targets"
            subtitle={`${GOAL_LABELS[data.profile.goals[0] ?? "build-muscle"]} · ${targets.adjustment >= 0 ? "+" : ""}${targets.adjustment} kcal vs maintenance`}
            icon={<Calculator size={15} />}
          />
          <CardBody>
            <div className="flex flex-wrap items-center gap-5">
              <Ring
                value={consumed.calories}
                max={targets.calories}
                size={104}
                stroke={9}
                label={`${consumed.calories}`}
                sub={`of ${targets.calories}`}
              />
              <div className="min-w-52 flex-1 space-y-3">
                {macroRows.map((m) => (
                  <div key={m.key}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted">
                        <span style={{ color: m.color }}>{m.icon}</span>
                        {m.label}
                      </span>
                      <span className="text-ink tnum">
                        {Math.round(m.value)} / {m.target} g
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel3">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, (m.value / m.target) * 100)}%`,
                          background: m.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { k: targets.bmr, v: "BMR" },
                { k: targets.tdee, v: "Maintenance" },
                { k: `${targets.fiberG}g`, v: "Fibre" },
              ].map((s) => (
                <div key={s.v} className="rounded-lg border border-line bg-panel2 p-2.5">
                  <p className="font-display text-base font-bold tnum">{s.k}</p>
                  <p className="text-[10px] text-faint">{s.v}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Hydration"
            subtitle={`Target ${(targets.waterMl / 1000).toFixed(1)} litres today`}
            icon={<Droplets size={15} />}
          />
          <CardBody>
            <div className="flex items-center gap-4">
              <Ring
                value={consumed.waterMl}
                max={targets.waterMl}
                size={88}
                label={`${(consumed.waterMl / 1000).toFixed(1)}L`}
                sub="today"
                tone="var(--c-ice)"
              />
              <div className="flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {[250, 500, 750].map((ml) => (
                    <Button key={ml} size="sm" variant="secondary" onClick={() => addWater(ml)}>
                      +{ml}ml
                    </Button>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => addWater(-250)}>
                    −250ml
                  </Button>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted">
                  Even 2% dehydration measurably reduces strength output. Add another 500-750 ml on
                  training days.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* ---------------------------------------------------- quick add */}
      <Card>
        <CardHeader title="Log food" subtitle="Rough numbers beat no numbers." icon={<Plus size={15} />} />
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
            <Field label="Food">
              <Input value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="Chicken and rice" />
            </Field>
            <Field label="kcal">
              <Input type="number" value={foodKcal} onChange={(e) => setFoodKcal(e.target.value)} placeholder="0" />
            </Field>
            <Field label="P (g)">
              <Input type="number" value={foodP} onChange={(e) => setFoodP(e.target.value)} placeholder="0" />
            </Field>
            <Field label="C (g)">
              <Input type="number" value={foodC} onChange={(e) => setFoodC(e.target.value)} placeholder="0" />
            </Field>
            <Field label="F (g)">
              <Input type="number" value={foodF} onChange={(e) => setFoodF(e.target.value)} placeholder="0" />
            </Field>
            <div className="flex items-end">
              <Button variant="primary" onClick={addFood} className="w-full">
                Add
              </Button>
            </div>
          </div>

          {log?.entries.length ? (
            <ul className="mt-4 divide-y divide-line">
              {log.entries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-ink">{e.name}</span>
                  <span className="text-muted tnum">
                    {e.kcal} kcal · {e.p}P {e.c}C {e.f}F
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFood(e.id)}
                    className="text-faint transition hover:text-danger"
                    aria-label="Remove entry"
                  >
                    <X size={13} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-center text-xs text-faint">
              Nothing logged today. You don&apos;t have to track forever — two honest weeks teaches
              you portion sizes for life.
            </p>
          )}
        </CardBody>
      </Card>

      {/* ------------------------------------------------------ meal plan */}
      <Card>
        <CardHeader
          title={plan.name}
          subtitle={`Scaled to your ${targets.calories} kcal target`}
          icon={<Utensils size={15} />}
          action={
            <Segmented
              value={diet}
              onChange={setDiet}
              size="sm"
              options={[
                { value: "non-veg", label: "Non-veg" },
                { value: "veg", label: "Vegetarian" },
              ]}
            />
          }
        />
        <CardBody>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {plan.meals.map((meal) => {
              const kcal = meal.items.reduce((n, i) => n + i.kcal, 0);
              const protein = meal.items.reduce((n, i) => n + i.p, 0);
              return (
                <div key={meal.slot} className="rounded-lg border border-line bg-panel2 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-sm font-semibold">{meal.title}</p>
                    <span className="text-[10px] text-faint tnum">{meal.time}</span>
                  </div>
                  <div className="mt-1 flex gap-2 text-[10px] text-faint tnum">
                    <span>{kcal} kcal</span>
                    <span>·</span>
                    <span>{protein}g protein</span>
                  </div>
                  <ul className="mt-2 space-y-1">
                    {meal.items.map((i) => (
                      <li key={i.name} className="flex items-start justify-between gap-2 text-xs">
                        <span className="text-muted">
                          {i.name}
                          <span className="text-faint"> · {i.qty}</span>
                        </span>
                        <span className="shrink-0 text-faint tnum">{i.kcal}</span>
                      </li>
                    ))}
                  </ul>
                  {meal.note && (
                    <p className="mt-2 text-[11px] italic leading-relaxed text-faint">{meal.note}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-lg border border-line bg-panel2 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink">
              <Info size={13} className="text-volt" /> Notes on this plan
            </p>
            <ul className="space-y-1.5">
              {plan.notes.map((n, i) => (
                <li key={i} className="flex gap-2 text-xs leading-relaxed text-muted">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-volt" />
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </CardBody>
      </Card>

      {/* ---------------------------------------------------- principles */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="The six rules that decide everything" icon={<Flame size={15} />} />
          <CardBody>
            <ul className="space-y-3">
              {NUTRITION_PRINCIPLES.map((p, i) => (
                <li key={p.title} className="flex gap-2.5">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-volt/15 text-[10px] font-bold text-volt">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">{p.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Supplements, honestly"
            subtitle="Most of the shelf is a waste of money. These are the exceptions."
            icon={<PillIcon size={15} />}
          />
          <CardBody>
            <ul className="space-y-2.5">
              {SUPPLEMENTS.map((s) => (
                <li key={s.name} className="rounded-lg border border-line bg-panel2 p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">{s.name}</span>
                    <Pill
                      tone={
                        s.verdict === "strong evidence"
                          ? "ok"
                          : s.verdict === "decent evidence"
                            ? "volt"
                            : s.verdict === "situational"
                              ? "ice"
                              : "danger"
                      }
                    >
                      {s.verdict}
                    </Pill>
                  </div>
                  {s.dose !== "—" && (
                    <p className="mt-1 text-[11px] font-medium text-volt tnum">{s.dose}</p>
                  )}
                  <p className="mt-1 text-xs leading-relaxed text-muted">{s.why}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] leading-relaxed text-faint">
              Nothing here is medical advice. If you take medication or have a health condition,
              check with a doctor or dietitian before adding supplements.
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
