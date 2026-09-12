import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";
import { getExercise } from "@/lib/data/exercises";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-opus-5";
const MAX_FRAMES = 6;
/** Base64 characters per frame (~1.1 MB of JPEG) — frames are sent at 768px. */
const MAX_FRAME_CHARS = 1_500_000;

interface Body {
  exerciseId: string;
  frames: string[];
  notes?: string;
  checklist?: Record<string, boolean>;
}

/** Whether AI review is configured — lets the page skip a doomed request. */
export async function GET() {
  return Response.json({ available: Boolean(process.env.ANTHROPIC_API_KEY) });
}

const SYSTEM = [
  "You are an experienced strength coach reviewing a lifter's technique from still frames of their own video.",
  "",
  "How to review:",
  "- Judge only what the frames actually show. Say plainly when an angle, the lighting or the crop makes something impossible to assess, and suggest how to film it better (side-on at hip height is best for most lifts).",
  "- Compare against the exercise's coaching cues and common mistakes provided. Be specific about which frame you mean.",
  "- Prioritise ruthlessly: the one or two fixes that matter most, each with a single cue the lifter can use on the next set.",
  "- Be encouraging but honest. Don't invent problems to have something to say.",
  "- You are not a doctor and can't diagnose pain or injury. If something looks like it could hurt them (a rounded lower back under heavy load, knees collapsing badly), flag it clearly and suggest reducing the load and getting an in-person coach or physio to look.",
  "",
  "Format your answer in markdown with these sections:",
  "## Overall",
  "## What looks good",
  "## Fix first",
  "## Safety",
  "## How confident I am",
].join("\n");

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "no_api_key" }, { status: 503 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  // Never trust exercise details from the client — look them up here.
  const exercise = getExercise(body.exerciseId);
  if (!exercise) return Response.json({ error: "unknown_exercise" }, { status: 400 });

  const frames = Array.isArray(body.frames) ? body.frames : [];
  if (
    frames.length === 0 ||
    frames.length > MAX_FRAMES ||
    frames.some((f) => typeof f !== "string" || f.length > MAX_FRAME_CHARS || !/^[A-Za-z0-9+/=]+$/.test(f))
  ) {
    return Response.json({ error: "invalid_frames" }, { status: 400 });
  }

  const selfAssessment = Object.entries(body.checklist ?? {})
    .slice(0, 20)
    .map(([item, ok]) => `- ${ok ? "✓" : "✗"} ${String(item).slice(0, 200)}`)
    .join("\n");

  const intro = [
    `Exercise: ${exercise.name}`,
    `Primary muscles: ${exercise.primary.join(", ")}`,
    "",
    "Coaching cues:",
    ...exercise.cues.map((c) => `- ${c}`),
    "",
    "Common mistakes:",
    ...exercise.mistakes.map((m) => `- ${m}`),
    ...(exercise.safety?.length ? ["", "Safety notes:", ...exercise.safety.map((s) => `- ${s}`)] : []),
    "",
    body.notes?.trim() ? `Lifter's note: ${body.notes.trim().slice(0, 600)}` : "No note from the lifter.",
    selfAssessment ? `\nLifter's own checklist:\n${selfAssessment}` : "",
    "",
    `Below are ${frames.length} frames in chronological order from one set.`,
  ].join("\n");

  const content: Anthropic.Beta.BetaContentBlockParam[] = [{ type: "text", text: intro }];
  frames.forEach((data, i) => {
    content.push({ type: "text", text: `Frame ${i + 1} of ${frames.length}` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } });
  });
  content.push({ type: "text", text: "Review this lifter's technique." });

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      try {
        const run = client.beta.messages.stream({
          model: MODEL,
          max_tokens: 3000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          system: SYSTEM,
          messages: [{ role: "user", content }],
        });
        run.on("text", (text) => send({ type: "text", text }));
        const final = await run.finalMessage();
        if (final.stop_reason === "refusal") {
          send({ type: "text", text: "\n\n_I can't review these frames. Try a clearer clip of the lift itself._" });
        }
        send({ type: "done" });
      } catch (err) {
        const message =
          err instanceof Anthropic.AuthenticationError
            ? "That API key was rejected. Check ANTHROPIC_API_KEY in .env.local."
            : err instanceof Anthropic.RateLimitError
              ? "Rate limited by the API. Give it a moment and try again."
              : err instanceof Anthropic.APIError
                ? `The review API returned an error (${err.status}).`
                : "Could not reach the review API.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
