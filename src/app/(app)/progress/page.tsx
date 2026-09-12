"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Camera,
  ChevronRight,
  Dumbbell,
  ImagePlus,
  LineChart as LineIcon,
  Plus,
  Ruler,
  Scale,
  Trash2,
  TrendingUp,
  Trophy,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/form";
import { EmptyState, Pill, Stat } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { MuscleBalanceChart, TrendChart } from "@/components/charts";
import { ImportMetricsDialog } from "@/components/progress/ImportMetricsDialog";
import { useData } from "@/lib/store/data-context";
import { exerciseName } from "@/lib/data/exercises";
import {
  bmi,
  bmiBand,
  estimate1RM,
  navyBodyFat,
  setsByMuscle,
  totalVolume,
} from "@/lib/fitness";
import {
  compact,
  displayWeight,
  formatDuration,
  lbToKg,
  relativeDay,
  round,
  toISODate,
  weekRange,
} from "@/lib/utils";

type Range = "4w" | "12w" | "all";

export default function ProgressPage() {
  const { data, addMetric, deleteMetric, addPhoto, deletePhoto } = useData();
  const [range, setRange] = useState<Range>("12w");
  const [liftId, setLiftId] = useState<string>("");
  const [metricOpen, setMetricOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const view = useMemo(() => {
    if (!data) return null;
    const done = data.sessions.filter((s) => s.completed);
    const cutoffDays = range === "4w" ? 28 : range === "12w" ? 84 : 3650;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - cutoffDays);
    const cutoffISO = toISODate(cutoff);
    const inRange = done.filter((s) => s.date >= cutoffISO);

    // Weekly volume series
    const weekly = new Map<string, number>();
    for (const s of inRange) {
      const { start } = weekRange(new Date(s.date));
      const key = toISODate(start);
      weekly.set(key, (weekly.get(key) ?? 0) + s.totalVolumeKg);
    }
    const volumeSeries = [...weekly.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([k, v]) => ({
        label: new Date(k).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        value: Math.round(v),
      }));

    const weights = [...data.metrics]
      .filter((m) => m.weightKg && m.date >= cutoffISO)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    const weightSeries = weights.map((m) => ({
      label: new Date(m.date).toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      value: m.weightKg as number,
    }));

    // Every lift the user has actually logged
    const liftIds = Array.from(
      new Set(done.flatMap((s) => s.exercises.map((e) => e.exerciseId))),
    ).sort((a, b) => exerciseName(a).localeCompare(exerciseName(b)));

    const selected = liftId || liftIds[0] || "";
    const liftSeries = done
      .filter((s) => s.exercises.some((e) => e.exerciseId === selected))
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((s) => {
        const ex = s.exercises.find((e) => e.exerciseId === selected)!;
        const best = ex.sets
          .filter((x) => x.completed && !x.warmup)
          .reduce((m, x) => Math.max(m, estimate1RM(x.weightKg, x.reps)), 0);
        return {
          label: new Date(s.date).toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
          }),
          value: round(best, 1),
        };
      })
      .filter((p) => p.value > 0);

    const { start } = weekRange();
    const weekSessions = done.filter((s) => s.date >= toISODate(start));

    const prs = done
      .flatMap((s) => s.prs.map((p) => ({ ...p, sessionTitle: s.title })))
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    const latest = [...data.metrics].sort((a, b) => (a.date < b.date ? 1 : -1))[0];

    return {
      done,
      inRange,
      volumeSeries,
      weightSeries,
      liftIds,
      selected,
      liftSeries,
      weekSets: setsByMuscle(weekSessions),
      prs,
      latest,
    };
  }, [data, range, liftId]);

  if (!data || !view) return null;

  const units = data.settings.units;
  const bodyMass = view.latest?.weightKg ?? data.profile.startWeightKg ?? 0;
  const bmiValue = data.profile.heightCm ? bmi(bodyMass, data.profile.heightCm) : 0;
  const band = bmiValue ? bmiBand(bmiValue) : null;
  const bodyFat =
    data.profile.heightCm && view.latest?.waist && view.latest?.neck
      ? navyBodyFat({
          sex: data.profile.sex,
          heightCm: data.profile.heightCm,
          waistCm: view.latest.waist,
          neckCm: view.latest.neck,
          hipsCm: view.latest.hips,
        })
      : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Progress"
        subtitle="Strength, size and bodyweight over time. Trends matter — single data points don't."
        action={
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: "4w", label: "4 weeks" },
              { value: "12w", label: "12 weeks" },
              { value: "all", label: "All time" },
            ]}
          />
        }
      />

      {/* -------------------------------------------------------- stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Sessions"
          value={view.inRange.length}
          sub={`${view.done.length} all time`}
          icon={<Dumbbell size={15} />}
        />
        <Stat
          label="Volume"
          value={`${compact(totalVolume(view.inRange))} kg`}
          sub={`${compact(totalVolume(view.done))} kg all time`}
          icon={<TrendingUp size={15} />}
          tone="ice"
        />
        <Stat
          label="Bodyweight"
          value={bodyMass ? displayWeight(bodyMass, units, 1) : "—"}
          sub={
            data.profile.targetWeightKg
              ? `target ${displayWeight(data.profile.targetWeightKg, units, 0)}`
              : "no target set"
          }
          icon={<Scale size={15} />}
          tone="ember"
        />
        <Stat
          label="Personal records"
          value={view.prs.length}
          sub={view.prs[0] ? `latest ${relativeDay(view.prs[0].date)}` : "none yet"}
          icon={<Trophy size={15} />}
          tone="violet"
        />
      </div>

      {/* ------------------------------------------------------- charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Weekly training volume"
            subtitle="Total load moved per week"
            icon={<TrendingUp size={15} />}
          />
          <CardBody>
            <TrendChart data={view.volumeSeries} unit="kg" seriesLabel="Volume" height={220} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Strength on one lift"
            subtitle="Estimated 1RM per session"
            icon={<LineIcon size={15} />}
            action={
              view.liftIds.length > 0 && (
                <Select
                  value={view.selected}
                  onChange={(e) => setLiftId(e.target.value)}
                  className="h-8 max-w-44 text-xs"
                >
                  {view.liftIds.map((id) => (
                    <option key={id} value={id}>
                      {exerciseName(id)}
                    </option>
                  ))}
                </Select>
              )
            }
          />
          <CardBody>
            {view.liftIds.length === 0 ? (
              <EmptyState
                title="No lifts logged yet"
                description="Complete a session and your strength curve appears here."
              />
            ) : (
              <TrendChart
                data={view.liftSeries}
                unit="kg"
                seriesLabel="Estimated 1RM"
                kind="line"
                decimals={1}
                height={220}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Bodyweight trend"
            subtitle="Weigh in the same way every time: morning, after the toilet, before food"
            icon={<Scale size={15} />}
            action={
              <Button size="sm" variant="secondary" onClick={() => setMetricOpen(true)} icon={<Plus size={13} />}>
                Log
              </Button>
            }
          />
          <CardBody>
            <TrendChart
              data={view.weightSeries}
              unit="kg"
              seriesLabel="Bodyweight"
              kind="line"
              decimals={1}
              tone="var(--c-ember)"
              height={220}
            />
            {bmiValue > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                <Pill tone={band?.tone === "ok" ? "ok" : band?.tone === "warn" ? "warn" : "danger"}>
                  BMI {bmiValue}
                </Pill>
                <span>{band?.label}</span>
                {bodyFat && (
                  <>
                    <Pill tone="ice">~{bodyFat}% body fat</Pill>
                    <span className="text-faint">Navy estimate — track the trend, not the number.</span>
                  </>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Muscle balance this week"
            subtitle="Hard sets against recoverable volume landmarks"
            icon={<Dumbbell size={15} />}
          />
          <CardBody>
            <MuscleBalanceChart sets={view.weekSets} height={300} limit={12} />
          </CardBody>
        </Card>
      </div>

      {/* -------------------------------------------------- measurements */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Measurements"
            subtitle="Tape doesn't lie. Measure every two weeks, same time, same conditions."
            icon={<Ruler size={15} />}
            action={
              <div className="flex gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setImportOpen(true)} icon={<Upload size={13} />}>
                  Import
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setMetricOpen(true)} icon={<Plus size={13} />}>
                  Add
                </Button>
              </div>
            }
          />
          <CardBody>
            {data.metrics.length === 0 ? (
              <EmptyState
                icon={<Ruler size={26} />}
                title="No measurements yet"
                description="Weight, waist and arms are enough to see everything you need to see."
              />
            ) : (
              <div className="scroll-thin -mx-1 overflow-x-auto">
                <table className="w-full min-w-130 text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-[10px] uppercase tracking-wider text-faint">
                      <th className="py-2 pl-1 font-semibold">Date</th>
                      <th className="py-2 font-semibold">Weight</th>
                      <th className="py-2 font-semibold">Waist</th>
                      <th className="py-2 font-semibold">Chest</th>
                      <th className="py-2 font-semibold">Arm</th>
                      <th className="py-2 font-semibold">Thigh</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.metrics.slice(0, 12).map((m) => (
                      <tr key={m.id} className="border-b border-line last:border-0">
                        <td className="py-2 pl-1 text-muted">{relativeDay(m.date)}</td>
                        <td className="py-2 text-ink tnum">
                          {m.weightKg ? displayWeight(m.weightKg, units, 1) : "—"}
                        </td>
                        <td className="py-2 text-muted tnum">{m.waist ?? "—"}</td>
                        <td className="py-2 text-muted tnum">{m.chest ?? "—"}</td>
                        <td className="py-2 text-muted tnum">{m.rightArm ?? "—"}</td>
                        <td className="py-2 text-muted tnum">{m.rightThigh ?? "—"}</td>
                        <td className="py-2 text-right">
                          <button
                            type="button"
                            onClick={() => deleteMetric(m.id)}
                            className="text-faint transition hover:text-danger"
                            aria-label="Delete measurement"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Progress photos"
            subtitle="Same light, same pose, same time of day. The mirror lies; photos don't."
            icon={<Camera size={15} />}
            action={
              <Button size="sm" variant="secondary" onClick={() => setPhotoOpen(true)} icon={<ImagePlus size={13} />}>
                Add
              </Button>
            }
          />
          <CardBody>
            {data.photos.length === 0 ? (
              <EmptyState
                icon={<Camera size={26} />}
                title="No photos yet"
                description="Front, side and back every four weeks. Stored in your browser only."
              />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {data.photos.slice(0, 9).map((p) => (
                  <figure key={p.id} className="group relative overflow-hidden rounded-lg border border-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.url} alt={`${p.pose} pose, ${p.date}`} className="aspect-3/4 w-full object-cover" />
                    <figcaption className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1 text-[10px] text-white">
                      {p.pose} · {relativeDay(p.date)}
                    </figcaption>
                    <button
                      type="button"
                      onClick={() => void deletePhoto(p.id)}
                      className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                      aria-label="Delete photo"
                    >
                      <Trash2 size={11} />
                    </button>
                  </figure>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* ------------------------------------------------------ PR + log */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Personal record log" icon={<Trophy size={15} />} />
          <CardBody>
            {view.prs.length === 0 ? (
              <EmptyState
                icon={<Trophy size={26} />}
                title="No records yet"
                description="Your first logged set on any exercise sets the baseline."
              />
            ) : (
              <ul className="divide-y divide-line">
                {view.prs.slice(0, 12).map((pr, i) => (
                  <li key={`${pr.exerciseId}-${pr.date}-${i}`} className="flex items-center gap-3 py-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ember/15 text-ember">
                      <Trophy size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/exercises/${pr.exerciseId}`}
                        className="truncate text-sm text-ink hover:text-volt"
                      >
                        {exerciseName(pr.exerciseId)}
                      </Link>
                      <p className="text-[11px] text-faint">
                        {pr.type === "e1rm"
                          ? "Estimated 1RM"
                          : pr.type === "volume"
                            ? "Session volume"
                            : "Heaviest set"}{" "}
                        · {relativeDay(pr.date)}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-semibold text-ink tnum">
                        {pr.type === "volume"
                          ? `${compact(pr.value)} kg`
                          : displayWeight(pr.value, units, 1)}
                      </p>
                      {pr.previous ? (
                        <p className="text-[10px] text-ok tnum">
                          +{round(pr.value - pr.previous, 1)}
                        </p>
                      ) : (
                        <p className="text-[10px] text-faint">first</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Session history" subtitle={`${view.done.length} completed`} />
          <CardBody>
            {view.done.length === 0 ? (
              <EmptyState title="Nothing logged yet" />
            ) : (
              <ul className="divide-y divide-line">
                {view.done.slice(0, 12).map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{s.title}</p>
                      <p className="text-[11px] text-faint">
                        {relativeDay(s.date)} · {formatDuration(s.durationSeconds)} · {s.totalSets}{" "}
                        sets · {s.totalReps} reps
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-ink tnum">
                      {compact(s.totalVolumeKg)} kg
                    </span>
                    <ChevronRight size={14} className="text-faint" />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <MetricModal
        open={metricOpen}
        onClose={() => setMetricOpen(false)}
        units={units}
        onSave={(m) => {
          addMetric(m);
          setMetricOpen(false);
        }}
      />
      <PhotoModal
        open={photoOpen}
        onClose={() => setPhotoOpen(false)}
        onSave={async (p) => {
          await addPhoto(p);
          setPhotoOpen(false);
          toast.success("Progress photo saved");
        }}
      />
      <ImportMetricsDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

/* ---------------------------------------------------------- metric modal */

function MetricModal({
  open,
  onClose,
  units,
  onSave,
}: {
  open: boolean;
  onClose(): void;
  units: "metric" | "imperial";
  onSave(m: {
    date: string;
    weightKg?: number;
    waist?: number;
    chest?: number;
    hips?: number;
    neck?: number;
    leftArm?: number;
    rightArm?: number;
    leftThigh?: number;
    rightThigh?: number;
    calf?: number;
    shoulders?: number;
    note?: string;
  }): void;
}) {
  const [date, setDate] = useState(toISODate());
  const [weight, setWeight] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");

  const set = (k: string, v: string) => setFields((f) => ({ ...f, [k]: v }));
  const num = (k: string) => (fields[k] ? Number(fields[k]) : undefined);

  const save = () => {
    const raw = weight ? Number(weight) : undefined;
    onSave({
      date,
      weightKg: raw ? (units === "imperial" ? lbToKg(raw) : raw) : undefined,
      waist: num("waist"),
      chest: num("chest"),
      hips: num("hips"),
      neck: num("neck"),
      leftArm: num("leftArm"),
      rightArm: num("rightArm"),
      leftThigh: num("leftThigh"),
      rightThigh: num("rightThigh"),
      calf: num("calf"),
      shoulders: num("shoulders"),
      note: note.trim() || undefined,
    });
    setWeight("");
    setFields({});
    setNote("");
  };

  const measures = [
    ["chest", "Chest"],
    ["waist", "Waist"],
    ["hips", "Hips"],
    ["neck", "Neck"],
    ["shoulders", "Shoulders"],
    ["leftArm", "Left arm"],
    ["rightArm", "Right arm"],
    ["leftThigh", "Left thigh"],
    ["rightThigh", "Right thigh"],
    ["calf", "Calf"],
  ] as const;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log a measurement"
      description="Weight is the only required field. Circumferences are in centimetres."
      footer={
        <div className="flex gap-2">
          <Button variant="primary" onClick={save}>
            Save entry
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={`Bodyweight (${units === "metric" ? "kg" : "lb"})`}>
            <Input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="0.0"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {measures.map(([key, label]) => (
            <Field key={key} label={`${label} (cm)`}>
              <Input
                type="number"
                step="0.1"
                value={fields[key] ?? ""}
                onChange={(e) => set(key, e.target.value)}
                placeholder="—"
              />
            </Field>
          ))}
        </div>

        <Field label="Note">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Slept badly, felt flat all week…"
            className="min-h-16"
          />
        </Field>
      </div>
    </Modal>
  );
}

/* ----------------------------------------------------------- photo modal */

function PhotoModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose(): void;
  onSave(p: { date: string; pose: "front" | "side" | "back"; file: Blob }): Promise<void>;
}) {
  const { storage } = useData();
  const [pose, setPose] = useState<"front" | "side" | "back">("front");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [date, setDate] = useState(toISODate());
  const [busy, setBusy] = useState(false);

  const choose = (next: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : "");
  };

  const close = () => {
    choose(null);
    onClose();
  };

  const save = async () => {
    if (!file) return;
    setBusy(true);
    try {
      await onSave({ date, pose, file });
      choose(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save that photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a progress photo"
      description={
        storage === "firebase"
          ? "Compressed to around 300 KB, then stored privately in your Firebase Storage."
          : "Compressed to around 300 KB, then stored in this browser only."
      }
      size="sm"
      footer={
        <Button variant="primary" disabled={!file} loading={busy} onClick={save}>
          Save photo
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label="Pose">
          <Segmented
            value={pose}
            onChange={setPose}
            options={[
              { value: "front", label: "Front" },
              { value: "side", label: "Side" },
              { value: "back", label: "Back" },
            ]}
          />
        </Field>
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Photo">
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => choose(e.target.files?.[0] ?? null)}
            className="h-auto py-2"
          />
        </Field>
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Preview" className="max-h-64 w-full rounded-lg object-contain" />
        )}
      </div>
    </Modal>
  );
}
