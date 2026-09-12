import Anthropic from "@anthropic-ai/sdk";
import type { NextRequest } from "next/server";
import type { CoachContext } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = "claude-opus-5";

interface Body {
  messages: { role: "user" | "assistant"; content: string }[];
  context: CoachContext;
}

function systemPrompt(ctx: CoachContext): string {
  const p = ctx.profile;
  return [
    "You are the strength coach inside IronPulse, a training app. You are an experienced, no-nonsense coach: specific, direct, warm, and allergic to filler.",
    "",
    "How to answer:",
    "- Ground every claim in the athlete's actual data below. Quote their real numbers — weights, sets, streak, adherence — rather than speaking in generalities.",
    "- Lead with the answer. Then the reasoning, briefly. Never open with a preamble about what you're about to do.",
    "- Be concrete: name the exercise, the load, the rep target, the day. 'Add 2.5 kg to your bench on Monday' beats 'try progressive overload'.",
    "- Keep it tight. A few short paragraphs or a compact list. Use markdown headings only when the answer genuinely has sections.",
    "- If the data doesn't support an answer, say so and name what they'd need to log.",
    "- Respect their stated limitations absolutely. Never program around an injury as though it isn't there.",
    "- You are not a doctor. For pain that is sharp, persistent, or radiating, tell them plainly to see a physio or doctor, and offer a way to keep training around it.",
    "- Never invent data the athlete hasn't logged.",
    "",
    "=== ATHLETE PROFILE ===",
    `Name: ${p.name}`,
    `Goals: ${p.goals.join(", ")}`,
    `Experience: ${p.experience}`,
    `Programme: ${p.programName}`,
    `Training days: ${p.trainingDays.join(", ")}`,
    p.age ? `Age: ${p.age}` : "",
    p.sex ? `Sex: ${p.sex}` : "",
    p.heightCm ? `Height: ${p.heightCm} cm` : "",
    p.weightKg ? `Bodyweight: ${p.weightKg} kg` : "",
    p.limitations ? `LIMITATIONS (must respect): ${p.limitations}` : "No stated limitations.",
    "",
    "=== TODAY ===",
    ctx.today
      ? `${ctx.today.title} (${ctx.today.focus})\n${ctx.today.exercises.join("\n")}`
      : "Rest day — nothing programmed.",
    "",
    "=== CONSISTENCY ===",
    `Current streak: ${ctx.streak.current} · Longest: ${ctx.streak.longest}`,
    `Adherence over 4 weeks: ${ctx.adherence.last4Weeks}% of ${ctx.adherence.targetPerWeek} planned sessions per week`,
    "",
    "=== LAST 14 DAYS OF TRAINING ===",
    ctx.last14Days.length
      ? ctx.last14Days
          .map(
            (s) =>
              `${s.date} — ${s.title}: ${s.sets} sets, ${s.volumeKg} kg, ${s.durationMin} min`,
          )
          .join("\n")
      : "Nothing logged in the last fortnight.",
    "",
    "=== THIS WEEK'S HARD SETS PER MUSCLE ===",
    Object.entries(ctx.weeklySetsByMuscle).length
      ? Object.entries(ctx.weeklySetsByMuscle)
          .map(([m, n]) => `${m}: ${n}`)
          .join(", ")
      : "No working sets logged this week.",
    "(Fractional sets: primary movers count 1, secondary 0.5. Roughly 10-22 per muscle per week is productive for hypertrophy; under ~8 is maintenance.)",
    "",
    "=== RECENT PERSONAL RECORDS ===",
    ctx.recentPRs.length
      ? ctx.recentPRs.map((r) => `${r.exercise} — ${r.type} ${r.value} (${r.date})`).join("\n")
      : "None recorded.",
    "",
    "=== BODYWEIGHT TREND ===",
    ctx.bodyweightTrend.length
      ? ctx.bodyweightTrend.map((b) => `${b.date}: ${b.kg} kg`).join(", ")
      : "No weigh-ins logged.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Lets the client learn whether the live coach is configured without making
 * a request that is guaranteed to fail (and log an error) when it isn't.
 */
export async function GET() {
  return Response.json({ available: Boolean(process.env.ANTHROPIC_API_KEY) });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error: "no_api_key",
        message:
          "No ANTHROPIC_API_KEY configured. The app is using its built-in offline analyst instead.",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      try {
        const run = client.beta.messages.stream({
          model: MODEL,
          max_tokens: 4000,
          // Server-side fallback keeps a policy decline from dead-ending the chat.
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          system: [
            {
              type: "text",
              text: systemPrompt(body.context),
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: body.messages.slice(-16).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        run.on("text", (text) => send({ type: "text", text }));

        const final = await run.finalMessage();

        if (final.stop_reason === "refusal") {
          send({
            type: "text",
            text: "\n\n_I can't help with that one. Ask me something about your training and I'll dig into your numbers._",
          });
        }

        send({ type: "done" });
        controller.close();
      } catch (err) {
        const message =
          err instanceof Anthropic.AuthenticationError
            ? "That API key was rejected. Check ANTHROPIC_API_KEY in .env.local."
            : err instanceof Anthropic.RateLimitError
              ? "Rate limited by the API. Give it a moment and try again."
              : err instanceof Anthropic.APIError
                ? `The coaching API returned an error (${err.status}).`
                : "Could not reach the coaching API.";
        send({ type: "error", message });
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
