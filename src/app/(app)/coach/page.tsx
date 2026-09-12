"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  Bot,
  Brain,
  Dumbbell,
  Eraser,
  Salad,
  Send,
  Sparkles,
  TrendingUp,
  WifiOff,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Avatar, Pill } from "@/components/ui/feedback";
import { useData } from "@/lib/store/data-context";
import { buildCoachContext, generateInsights, offlineCoachReply } from "@/lib/coach";
import { getProgram } from "@/lib/data/programs";
import { cn, uid as makeId } from "@/lib/utils";
import type { CoachMessage } from "@/lib/types";

const QUICK_PROMPTS = [
  { icon: <Dumbbell size={13} />, label: "What should I train today?", text: "What should I train today, and what loads should I aim for?" },
  { icon: <TrendingUp size={13} />, label: "Am I progressing?", text: "Look at my last few weeks. Am I actually progressing, or spinning my wheels?" },
  { icon: <Brain size={13} />, label: "Break my plateau", text: "My main lifts feel stuck. What specifically should I change?" },
  { icon: <Activity size={13} />, label: "Check my volume", text: "Is my weekly volume per muscle in the right range? What's under- or over-done?" },
  { icon: <Salad size={13} />, label: "Fix my nutrition", text: "Based on my goal and bodyweight trend, what should I change about my eating?" },
  { icon: <Sparkles size={13} />, label: "Review my week", text: "Give me an honest review of this week's training and one thing to fix next week." },
];

export default function CoachPage() {
  const { data, appendCoach, clearCoach } = useData();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [offline, setOffline] = useState<boolean | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = useMemo(() => data?.coachThread ?? [], [data?.coachThread]);
  const insights = useMemo(() => (data ? generateInsights(data).slice(0, 3) : []), [data]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, draft]);

  const ask = useCallback(
    async (question: string) => {
      if (!data || !question.trim() || streaming) return;

      const userMessage: CoachMessage = {
        id: makeId("m"),
        role: "user",
        content: question.trim(),
        createdAt: Date.now(),
      };
      appendCoach([userMessage]);
      setInput("");
      setStreaming(true);
      setDraft("");

      const history = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      try {
        const res = await fetch("/api/coach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history, context: buildCoachContext(data) }),
        });

        if (!res.ok || !res.body) {
          // Offline analyst — still grounded in the user's real numbers.
          setOffline(true);
          const reply = offlineCoachReply(question, data);
          appendCoach([
            {
              id: makeId("m"),
              role: "assistant",
              content: reply,
              createdAt: Date.now(),
              offline: true,
            },
          ]);
          setStreaming(false);
          return;
        }

        setOffline(false);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";
          for (const part of parts) {
            const line = part.trim();
            if (!line.startsWith("data:")) continue;
            try {
              const payload = JSON.parse(line.slice(5).trim()) as {
                type: string;
                text?: string;
                message?: string;
              };
              if (payload.type === "text" && payload.text) {
                acc += payload.text;
                setDraft(acc);
              } else if (payload.type === "error") {
                acc += `\n\n_${payload.message}_`;
                setDraft(acc);
              }
            } catch {
              /* ignore malformed frame */
            }
          }
        }

        appendCoach([
          { id: makeId("m"), role: "assistant", content: acc, createdAt: Date.now() },
        ]);
      } catch {
        setOffline(true);
        appendCoach([
          {
            id: makeId("m"),
            role: "assistant",
            content: offlineCoachReply(question, data),
            createdAt: Date.now(),
            offline: true,
          },
        ]);
      } finally {
        setDraft("");
        setStreaming(false);
      }
    },
    [data, messages, appendCoach, streaming],
  );

  if (!data) return null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="AI coach"
        subtitle="It reads your programme, your last fortnight of sessions, your weekly volume per muscle, your PRs and your bodyweight trend before it answers."
        action={
          messages.length > 0 && (
            <Button variant="ghost" onClick={clearCoach} icon={<Eraser size={14} />}>
              Clear thread
            </Button>
          )
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Card className="flex h-[70vh] min-h-125 flex-col">
          <div ref={scrollRef} className="scroll-thin flex-1 space-y-4 overflow-y-auto p-4">
            {messages.length === 0 && !draft && (
              <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-volt/15 text-volt">
                  <Bot size={26} />
                </span>
                <div>
                  <p className="font-display text-base font-semibold">
                    Ask anything about your training
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted">
                    Form checks, plateaus, programme tweaks, nutrition, recovery. It answers using
                    your actual logged numbers, not generic advice.
                  </p>
                </div>
              </div>
            )}

            {messages.map((m) => (
              <Message key={m.id} message={m} userName={data.profile.displayName} />
            ))}

            {draft && (
              <Message
                message={{
                  id: "draft",
                  role: "assistant",
                  content: draft,
                  createdAt: Date.now(),
                }}
                userName={data.profile.displayName}
              />
            )}

            {streaming && !draft && (
              <div className="flex items-center gap-2 text-xs text-faint">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-volt/15 text-volt">
                  <Bot size={14} />
                </span>
                <span className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-volt"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                  ))}
                </span>
                Reading your training data…
              </div>
            )}
          </div>

          <div className="border-t border-line p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                ask(input);
              }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g. my bench has stalled at 80 kg — what now?"
                disabled={streaming}
              />
              <Button type="submit" variant="primary" loading={streaming} icon={<Send size={15} />}>
                Ask
              </Button>
            </form>
            {offline && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-faint">
                <WifiOff size={11} />
                Offline analyst — still using your real data. Add an{" "}
                <code className="font-mono text-[10px] text-ink">ANTHROPIC_API_KEY</code> to
                .env.local for full conversational coaching.
              </p>
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Quick questions" icon={<Sparkles size={15} />} />
            <CardBody className="space-y-1.5">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  disabled={streaming}
                  onClick={() => ask(p.text)}
                  className="flex w-full items-center gap-2 rounded-lg border border-line bg-panel2 px-3 py-2 text-left text-xs text-muted transition hover:border-volt hover:text-ink disabled:opacity-50"
                >
                  <span className="text-volt">{p.icon}</span>
                  {p.label}
                </button>
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="What it can see"
              subtitle="Only your own data, never anyone else's"
            />
            <CardBody>
              <ul className="space-y-1.5 text-xs text-muted">
                {[
                  `Programme: ${getProgram(data.profile.programId).name}`,
                  `${data.sessions.filter((s) => s.completed).length} logged sessions`,
                  `Streak ${data.streak.current}, best ${data.streak.longest}`,
                  `${data.metrics.length} body measurements`,
                  data.profile.limitations
                    ? `Limitations: ${data.profile.limitations}`
                    : "No stated limitations",
                ].map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-volt" />
                    {t}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          {insights.length > 0 && (
            <Card>
              <CardHeader title="Standing observations" />
              <CardBody className="space-y-2.5">
                {insights.map((i) => (
                  <div key={i.id} className="rounded-lg border border-line bg-panel2 p-2.5">
                    <p className="text-xs font-medium text-ink">{i.title}</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-muted">{i.body}</p>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          <p className="px-1 text-[11px] leading-relaxed text-faint">
            This is training guidance, not medical advice. Sharp, persistent or radiating pain
            means stop and see a physiotherapist or doctor.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- message -- */

function Message({ message, userName }: { message: CoachMessage; userName: string }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      {isUser ? (
        <Avatar name={userName} size={28} />
      ) : (
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-volt/15 text-volt">
          <Bot size={14} />
        </span>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser ? "bg-volt text-volt-ink" : "border border-line bg-panel2 text-muted",
        )}
      >
        {isUser ? (
          message.content
        ) : (
          <>
            <Markdown text={message.content} />
            {message.offline && (
              <Pill className="mt-2" tone="ice">
                offline analyst
              </Pill>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Deliberately tiny markdown renderer — headings, bold, bullets and code.
 * Enough for coaching answers without pulling in a parser.
 */
function Markdown({ text }: { text: string }) {
  const blocks = text.split("\n");
  return (
    <div className="space-y-1.5">
      {blocks.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;

        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={i} className="font-display text-sm font-semibold text-ink">
              {inline(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={i} className="font-display text-base font-semibold text-ink">
              {inline(trimmed.slice(3))}
            </h3>
          );
        }
        if (/^[-•*]\s/.test(trimmed)) {
          return (
            <p key={i} className="flex gap-2 pl-1">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-volt" />
              <span>{inline(trimmed.replace(/^[-•*]\s/, ""))}</span>
            </p>
          );
        }
        if (/^\d+[.)]\s/.test(trimmed)) {
          const [, num, rest] = trimmed.match(/^(\d+)[.)]\s(.*)$/) ?? [];
          return (
            <p key={i} className="flex gap-2 pl-1">
              <span className="font-semibold text-volt tnum">{num}.</span>
              <span>{inline(rest ?? "")}</span>
            </p>
          );
        }
        return <p key={i}>{inline(trimmed)}</p>;
      })}
    </div>
  );
}

function inline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      return (
        <em key={i} className="text-faint">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-panel3 px-1 py-0.5 font-mono text-[11px] text-ink">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
