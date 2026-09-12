"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Film,
  History,
  Pause,
  Play,
  Save,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  WifiOff,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Segmented, Select, Textarea } from "@/components/ui/form";
import { EmptyState, Pill, Progress } from "@/components/ui/feedback";
import { Markdown } from "@/components/ui/markdown";
import { ExerciseAnimation } from "@/components/workout/ExerciseAnimation";
import { useData } from "@/lib/store/data-context";
import { EXERCISES, exerciseName, getExercise } from "@/lib/data/exercises";
import { captureVideoFrame, downscaleDataURL, seekVideo } from "@/lib/image";
import { MUSCLE_LABELS } from "@/lib/types";
import { clock, cn, relativeDay, toISODate } from "@/lib/utils";

const MAX_FRAMES = 6;

export default function FormCheckPage() {
  return (
    <Suspense fallback={null}>
      <FormCheck />
    </Suspense>
  );
}

function FormCheck() {
  const params = useSearchParams();
  const { data, saveFormCheck, deleteFormCheck } = useData();

  const initial = params.get("exercise");
  const [exerciseId, setExerciseId] = useState(
    initial && getExercise(initial) ? initial : "back-squat",
  );
  const exercise = getExercise(exerciseId) ?? EXERCISES[0];

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState("0.5");
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [frames, setFrames] = useState<string[]>([]);
  const [sampling, setSampling] = useState(false);

  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [notes, setNotes] = useState("");
  const [review, setReview] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [apiAvailable, setApiAvailable] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/form-check")
      .then((r) => r.json() as Promise<{ available?: boolean }>)
      .then((j) => alive && setApiAvailable(Boolean(j.available)))
      .catch(() => alive && setApiAvailable(false));
    return () => {
      alive = false;
    };
  }, []);

  // The object URL belongs to this page; release it when replaced or on leave.
  useEffect(() => () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
  }, [videoUrl]);

  const items = useMemo(
    () => [
      ...exercise.cues.map((c) => ({ key: `Cue: ${c}`, label: c, kind: "cue" as const })),
      ...exercise.mistakes.map((m) => ({ key: `Avoided: ${m}`, label: m, kind: "mistake" as const })),
    ],
    [exercise],
  );
  const ticked = items.filter((i) => checklist[i.key]).length;

  if (!data) return null;

  const pickExercise = (id: string) => {
    setExerciseId(id);
    setChecklist({});
    setReview("");
  };

  const loadVideo = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      toast.error("That isn't a video file.");
      return;
    }
    setVideoUrl(URL.createObjectURL(file));
    setFrames([]);
    setReview("");
    setPlaying(false);
    setCurrent(0);
  };

  const video = () => videoRef.current;

  const togglePlay = () => {
    const v = video();
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  };

  const step = (seconds: number) => {
    const v = video();
    if (!v) return;
    v.pause();
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + seconds));
  };

  const capture = () => {
    const v = video();
    if (!v) return;
    if (frames.length >= MAX_FRAMES) {
      toast(`Up to ${MAX_FRAMES} frames — remove one first.`);
      return;
    }
    try {
      setFrames((f) => [...f, captureVideoFrame(v)]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not capture that frame.");
    }
  };

  /** Evenly spaced frames across the clip — the quick way to cover a whole rep. */
  const autoSample = async () => {
    const v = video();
    if (!v || !v.duration) return;
    setSampling(true);
    v.pause();
    try {
      const captured: string[] = [];
      for (let i = 0; i < MAX_FRAMES; i++) {
        await seekVideo(v, (v.duration * (i + 0.5)) / MAX_FRAMES);
        captured.push(captureVideoFrame(v));
      }
      setFrames(captured);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sample frames.");
    } finally {
      setSampling(false);
    }
  };

  const requestReview = async () => {
    if (!frames.length || reviewing) return;
    setReviewing(true);
    setReview("");
    try {
      const res = await fetch("/api/form-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exerciseId,
          frames: frames.map((f) => f.slice(f.indexOf(",") + 1)),
          notes,
          checklist,
        }),
      });
      if (!res.ok || !res.body) {
        setApiAvailable(res.status === 503 ? false : apiAvailable);
        throw new Error(res.status === 503 ? "AI review isn't configured." : "The review request failed.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";
        for (const part of parts) {
          if (!part.startsWith("data:")) continue;
          const payload = JSON.parse(part.slice(5).trim()) as { type: string; text?: string; message?: string };
          if (payload.type === "text" && payload.text) text += payload.text;
          if (payload.type === "error") text += `\n\n_${payload.message}_`;
          setReview(text);
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Review failed.");
    } finally {
      setReviewing(false);
    }
  };

  const selfSummary = () =>
    [
      `**Self-review: ${ticked} of ${items.length} checks passed.**`,
      "",
      ...items.map((i) => `- ${checklist[i.key] ? "✓" : "✗"} ${i.kind === "mistake" ? "Avoided: " : ""}${i.label}`),
    ].join("\n");

  const save = async () => {
    const thumbnail = frames[0] ? await downscaleDataURL(frames[0], 240, 0.7) : undefined;
    saveFormCheck({
      date: toISODate(),
      exerciseId,
      thumbnail,
      frameCount: frames.length,
      checklist,
      notes: notes.trim() || undefined,
      review: review || selfSummary(),
      reviewSource: review ? "ai" : "self",
    });
    toast.success("Form check saved to your history");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Form check"
        subtitle="Film a set, scrub through it frame by frame next to the demonstration, tick the cues you hit — and get an AI coach's review of the key frames."
      />

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Exercise" className="min-w-64 flex-1">
          <Select value={exerciseId} onChange={(e) => pickExercise(e.target.value)}>
            {[...EXERCISES]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} — {MUSCLE_LABELS[ex.primary[0]]}
                </option>
              ))}
          </Select>
        </Field>
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-volt px-4 text-sm font-semibold text-volt-ink transition hover:brightness-110">
          <Upload size={16} />
          {videoUrl ? "Choose another video" : "Upload or record a video"}
          <input
            type="file"
            accept="video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              loadVideo(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-faint">
        <ShieldCheck size={13} className="mt-0.5 shrink-0 text-ok" />
        Your video never leaves this device. Only the frames you capture are sent — and only when
        you ask for an AI review.
      </p>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {/* ------------------------------------------------------ video */}
          <Card>
            <CardHeader
              title="Your set"
              subtitle="Film side-on at hip height, whole body in frame"
              icon={<Film size={15} />}
            />
            <CardBody>
              {videoUrl ? (
                <>
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    playsInline
                    muted
                    className="max-h-[60vh] w-full rounded-lg bg-black"
                    onLoadedMetadata={(e) => {
                      setDuration(e.currentTarget.duration);
                      e.currentTarget.playbackRate = Number(rate);
                    }}
                    onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    onEnded={() => setPlaying(false)}
                  />
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.01}
                    value={current}
                    onChange={(e) => {
                      const v = video();
                      if (v) v.currentTime = Number(e.target.value);
                    }}
                    className="mt-3 h-1 w-full cursor-pointer appearance-none rounded-full bg-panel3"
                    aria-label="Scrub through the video"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="icon" variant="secondary" onClick={() => step(-1 / 30)} aria-label="Back one frame">
                      <ChevronLeft size={15} />
                    </Button>
                    <Button size="icon" variant="secondary" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
                      {playing ? <Pause size={15} /> : <Play size={15} />}
                    </Button>
                    <Button size="icon" variant="secondary" onClick={() => step(1 / 30)} aria-label="Forward one frame">
                      <ChevronRight size={15} />
                    </Button>
                    <span className="text-xs text-faint tnum">
                      {clock(current)} / {clock(duration)}
                    </span>
                    <Segmented
                      value={rate}
                      onChange={(v) => {
                        setRate(v);
                        const el = video();
                        if (el) el.playbackRate = Number(v);
                      }}
                      size="sm"
                      options={[
                        { value: "0.25", label: "¼×" },
                        { value: "0.5", label: "½×" },
                        { value: "1", label: "1×" },
                      ]}
                    />
                    <div className="ml-auto flex gap-2">
                      <Button size="sm" variant="secondary" onClick={capture} icon={<Camera size={13} />}>
                        Capture frame
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void autoSample()}
                        loading={sampling}
                        icon={<ScanLine size={13} />}
                      >
                        Auto-pick {MAX_FRAMES}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={<Film size={28} />}
                  title="No video yet"
                  description="Upload a clip from your camera roll, or record one straight from your phone."
                />
              )}
            </CardBody>
          </Card>

          {/* ----------------------------------------------------- frames */}
          {frames.length > 0 && (
            <Card>
              <CardHeader
                title={`Key frames (${frames.length}/${MAX_FRAMES})`}
                subtitle="Cover the whole rep: start, bottom, sticking point, lockout"
                icon={<Camera size={15} />}
                action={
                  <Button size="sm" variant="ghost" onClick={() => setFrames([])}>
                    Clear
                  </Button>
                }
              />
              <CardBody>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {frames.map((f, i) => (
                    <figure key={i} className="group relative overflow-hidden rounded-lg border border-line">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f} alt={`Captured frame ${i + 1}`} className="aspect-3/4 w-full object-cover" />
                      <figcaption className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white tnum">
                        {i + 1}
                      </figcaption>
                      <button
                        type="button"
                        onClick={() => setFrames((all) => all.filter((_, idx) => idx !== i))}
                        className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                        aria-label={`Remove frame ${i + 1}`}
                      >
                        <X size={11} />
                      </button>
                    </figure>
                  ))}
                </div>

                <Field label="Anything to mention?" className="mt-3">
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Last set of 5 at 100 kg, lower back felt tight at the bottom…"
                    className="min-h-16"
                  />
                </Field>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    onClick={() => void requestReview()}
                    loading={reviewing}
                    disabled={apiAvailable === false}
                    icon={<Sparkles size={15} />}
                  >
                    Get AI form review
                  </Button>
                  <Button variant="secondary" onClick={() => void save()} icon={<Save size={15} />}>
                    Save to history
                  </Button>
                </div>
                {apiAvailable === false && (
                  <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-faint">
                    <WifiOff size={12} className="mt-0.5 shrink-0" />
                    AI review needs an ANTHROPIC_API_KEY in .env.local. Your self-review checklist
                    still works and saves with the frames.
                  </p>
                )}
              </CardBody>
            </Card>
          )}

          {(review || reviewing) && (
            <Card className="border-volt/30">
              <CardHeader title="AI coach review" icon={<Sparkles size={15} />} />
              <CardBody className="text-sm leading-relaxed text-muted">
                {review ? <Markdown text={review} /> : <p className="text-xs text-faint">Looking at your frames…</p>}
                <p className="mt-3 text-[11px] text-faint">
                  Based on still frames only — not a substitute for an in-person coach, and not
                  medical advice.
                </p>
              </CardBody>
            </Card>
          )}
        </div>

        {/* ------------------------------------------------------ sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Reference" subtitle={exercise.name} />
            <CardBody>
              <ExerciseAnimation pattern={exercise.pattern} tempo={exercise.tempo} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Self-review"
              subtitle="Watch it slowed down and tick what you actually did"
              icon={<CheckCircle2 size={15} />}
            />
            <CardBody className="space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted">Checks passed</span>
                  <span className="text-ink tnum">
                    {ticked}/{items.length}
                  </span>
                </div>
                <Progress value={ticked} max={items.length || 1} tone="ok" />
              </div>
              <ul className="space-y-1.5">
                {items.map((item) => (
                  <li key={item.key}>
                    <label className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 text-xs leading-relaxed text-muted transition hover:bg-panel2">
                      <input
                        type="checkbox"
                        checked={Boolean(checklist[item.key])}
                        onChange={(e) => setChecklist((c) => ({ ...c, [item.key]: e.target.checked }))}
                        className="mt-0.5 accent-(--c-volt)"
                      />
                      <span>
                        {item.kind === "mistake" && <span className="font-medium text-ink">Avoided: </span>}
                        {item.label}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="History"
              subtitle={`${data.formChecks.length} saved`}
              icon={<History size={15} />}
            />
            <CardBody>
              {data.formChecks.length === 0 ? (
                <p className="text-xs text-muted">Saved checks appear here so you can compare over time.</p>
              ) : (
                <ul className="space-y-2">
                  {data.formChecks.map((check) => {
                    const total = Object.keys(check.checklist).length;
                    const passed = Object.values(check.checklist).filter(Boolean).length;
                    const open = expanded === check.id;
                    return (
                      <li key={check.id} className="rounded-lg border border-line bg-panel2 p-2">
                        <div className="flex items-center gap-2">
                          {check.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={check.thumbnail} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />
                          ) : (
                            <span className="flex h-12 w-9 shrink-0 items-center justify-center rounded bg-panel3 text-faint">
                              <Film size={13} />
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpanded(open ? null : check.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="truncate text-xs font-medium text-ink">{exerciseName(check.exerciseId)}</p>
                            <p className="text-[10px] text-faint">
                              {relativeDay(check.date)} · {check.frameCount} frames
                              {total > 0 && ` · ${passed}/${total} checks`}
                            </p>
                          </button>
                          <Pill tone={check.reviewSource === "ai" ? "volt" : "neutral"}>
                            {check.reviewSource === "ai" ? "AI" : "self"}
                          </Pill>
                          <button
                            type="button"
                            onClick={() => deleteFormCheck(check.id)}
                            className="rounded p-1 text-faint transition hover:text-danger"
                            aria-label="Delete form check"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        {open && check.review && (
                          <div className={cn("mt-2 border-t border-line pt-2 text-xs leading-relaxed text-muted")}>
                            <Markdown text={check.review} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
