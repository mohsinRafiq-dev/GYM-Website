"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  Award,
  Bot,
  CalendarClock,
  ChevronRight,
  Dumbbell,
  Flame,
  LineChart,
  Salad,
  Shield,
  Timer,
  Users,
} from "lucide-react";
import { ExerciseAnimation } from "@/components/workout/ExerciseAnimation";
import { MuscleMap } from "@/components/workout/MuscleMap";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pill } from "@/components/ui/feedback";
import { getProgram } from "@/lib/data/programs";
import { EXERCISES } from "@/lib/data/exercises";
import { BADGES } from "@/lib/data/badges";
import { useAuth } from "@/lib/store/auth-context";
import { DAY_KEYS, DAY_SHORT, type MovementPattern } from "@/lib/types";
import { useRouter } from "next/navigation";

const DEMO_PATTERNS: { pattern: MovementPattern; name: string; tempo: string }[] = [
  { pattern: "squat", name: "Barbell Back Squat", tempo: "3-1-1-0" },
  { pattern: "bench-press", name: "Barbell Bench Press", tempo: "2-1-1-0" },
  { pattern: "pullup", name: "Pull-Up", tempo: "3-0-1-1" },
  { pattern: "hinge", name: "Romanian Deadlift", tempo: "4-1-1-0" },
  { pattern: "lateral-raise", name: "Lateral Raise", tempo: "2-1-2-0" },
  { pattern: "curl", name: "EZ-Bar Curl", tempo: "3-1-1-1" },
];

const FEATURES = [
  {
    icon: <CalendarClock size={18} />,
    title: "A real weekly programme",
    body: "Five complete mesocycles — a 6-day aesthetic split, PPL, upper/lower, beginner full body and a home plan. Every day comes with a brief, a warm-up, ordered work with sets, reps, RPE, rest and tempo, a finisher and a cool-down.",
  },
  {
    icon: <Activity size={18} />,
    title: "Animated demonstrations",
    body: `Every one of the ${EXERCISES.length} exercises has a tempo-accurate animated demonstration you can scrub through, plus setup steps, coaching cues, the mistakes to avoid and a live muscle map.`,
  },
  {
    icon: <Timer size={18} />,
    title: "A workout player, not a spreadsheet",
    body: "Log set by set with a rest timer, plate calculator, last-session comparison, RPE tracking, superset flow and automatic personal-record detection.",
  },
  {
    icon: <Flame size={18} />,
    title: "Attendance and streaks",
    body: "Check in every session. Streaks survive planned rest days, freeze tokens cover emergencies, and a year heatmap shows exactly how consistent you've actually been.",
  },
  {
    icon: <Users size={18} />,
    title: "Teams with real accountability",
    body: "Create a crew, share a join code, agree the rules, and watch the leaderboard. Roles, member caps, weekly targets, challenges and a team feed — all behind login.",
  },
  {
    icon: <Bot size={18} />,
    title: "An AI coach that reads your data",
    body: "It sees your programme, your last fortnight of sessions, your weekly volume per muscle, your PRs and your bodyweight trend — then answers like a coach who knows you.",
  },
  {
    icon: <LineChart size={18} />,
    title: "Progress you can actually see",
    body: "Estimated 1RM per lift, volume by muscle against evidence-based landmarks, bodyweight trend, measurements, progress photos and a full PR log.",
  },
  {
    icon: <Salad size={18} />,
    title: "Nutrition that matches the training",
    body: "TDEE and macros from your real stats, scalable meal plans for veg and non-veg, hydration targets and an honest verdict on every popular supplement.",
  },
  {
    icon: <Award size={18} />,
    title: "XP, levels and 34 badges",
    body: "Every session earns XP. Levels, titles and badges from First Rep to Millionaire keep the boring weeks interesting.",
  },
];

export default function LandingPage() {
  const { user, signInAsDemo } = useAuth();
  const router = useRouter();
  const [demoIndex, setDemoIndex] = useState(0);
  const program = getProgram("aesthetic-6");

  useEffect(() => {
    const id = setInterval(() => setDemoIndex((i) => (i + 1) % DEMO_PATTERNS.length), 6500);
    return () => clearInterval(id);
  }, []);

  const demo = DEMO_PATTERNS[demoIndex];

  const startDemo = async () => {
    await signInAsDemo();
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-bg">
      {/* ------------------------------------------------------------ nav */}
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-volt text-volt-ink">
              <Dumbbell size={18} />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight">
              Iron<span className="text-volt">Pulse</span>
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <a href="#features" className="transition hover:text-ink">Features</a>
            <a href="#programme" className="transition hover:text-ink">Programme</a>
            <a href="#demo" className="transition hover:text-ink">Demonstrations</a>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <ButtonLink href="/dashboard" variant="primary" size="sm">
                Open app <ArrowRight size={14} />
              </ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost" size="sm">
                  Sign in
                </ButtonLink>
                <ButtonLink href="/login?mode=signup" variant="primary" size="sm">
                  Get started
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="grid-bg absolute inset-0 opacity-70" aria-hidden />
        <div
          className="absolute -top-40 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(201,255,77,0.16), transparent)" }}
          aria-hidden
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <Pill tone="volt" className="mb-4">
              <Shield size={11} /> Private · built for one crew
            </Pill>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Train like someone
              <br />
              <span className="text-gradient">wrote you a programme.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
              Because someone did. IronPulse is a complete training platform for you and your
              friends: a professionally periodised weekly split, {EXERCISES.length} exercises with
              animated demonstrations and coaching cues, set-by-set logging, attendance streaks,
              a team leaderboard, and an AI coach that answers using your real numbers.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button variant="primary" size="lg" onClick={startDemo} icon={<Flame size={17} />}>
                Explore the demo account
              </Button>
              <ButtonLink href="/login?mode=signup" variant="outline" size="lg">
                Create your account <ChevronRight size={16} />
              </ButtonLink>
            </div>

            <dl className="mt-9 grid max-w-md grid-cols-3 gap-4">
              {[
                { k: `${EXERCISES.length}`, v: "Exercises" },
                { k: "5", v: "Programmes" },
                { k: `${BADGES.length}`, v: "Badges" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-2xl font-bold text-volt tnum">{s.k}</dt>
                  <dd className="text-xs text-faint">{s.v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <Card className="p-4" glow>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-display text-sm font-semibold">{demo.name}</p>
                <p className="text-[11px] text-faint">Tempo {demo.tempo} · live rig, not a video</p>
              </div>
              <Pill tone="ice">Animated</Pill>
            </div>
            <ExerciseAnimation
              key={demo.pattern}
              pattern={demo.pattern}
              tempo={demo.tempo}
              size="lg"
            />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {DEMO_PATTERNS.map((d, i) => (
                <button
                  key={d.pattern}
                  type="button"
                  onClick={() => setDemoIndex(i)}
                  className={`rounded-full border px-2 py-0.5 text-[10px] transition ${
                    i === demoIndex
                      ? "border-volt bg-volt/15 text-volt"
                      : "border-line text-faint hover:text-ink"
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------------ programme */}
      <section id="programme" className="border-b border-line py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-8 max-w-2xl">
            <Pill tone="ember" className="mb-3">The default split</Pill>
            <h2 className="font-display text-3xl font-bold tracking-tight">{program.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{program.description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {DAY_KEYS.map((key) => {
              const d = program.days[key];
              const rest = d.type === "rest" || d.type === "mobility";
              return (
                <Card key={key} className={rest ? "opacity-80" : undefined}>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-faint">
                        {DAY_SHORT[key]}
                      </span>
                      {!rest && <Pill tone="volt">{d.exercises.length} moves</Pill>}
                    </div>
                    <h3 className="mt-2 font-display text-sm font-semibold">{d.title}</h3>
                    <p className="mt-1 text-[11px] text-faint">{d.focus}</p>
                    {!rest && (
                      <ul className="mt-3 space-y-1 text-[11px] text-muted">
                        {d.exercises.slice(0, 4).map((e) => (
                          <li key={e.exerciseId} className="flex items-center gap-1.5">
                            <span className="h-1 w-1 rounded-full bg-volt" />
                            {e.sets} × {e.reps}
                          </li>
                        ))}
                        {d.exercises.length > 4 && (
                          <li className="text-faint">+{d.exercises.length - 4} more</li>
                        )}
                      </ul>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- demo */}
      <section id="demo" className="border-b border-line py-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 lg:grid-cols-2">
          <div>
            <Pill tone="violet" className="mb-3">Know exactly what you&apos;re training</Pill>
            <h2 className="font-display text-3xl font-bold tracking-tight">
              Every exercise, mapped to the muscle
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Each movement carries an activation profile, so the app can show you what a session
              actually hits — and, across a week, whether you&apos;re inside the volume range where
              muscle is built or drifting past what you can recover from.
            </p>
            <ul className="mt-5 space-y-2.5 text-sm text-muted">
              {[
                "Weekly hard sets per muscle, checked against MEV / MAV / MRV landmarks",
                "Warnings when a muscle is under-trained or past your recoverable ceiling",
                "Substitutions ranked by the equipment you actually have",
              ].map((t) => (
                <li key={t} className="flex gap-2.5">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-volt" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-5">
            <MuscleMap
              data={{
                chest: 1,
                "front-delts": 0.55,
                triceps: 0.5,
                "side-delts": 0.3,
                abs: 0.2,
                lats: 0.1,
              }}
            />
            <p className="mt-2 text-center text-xs text-muted">
              Monday · Chest &amp; Triceps activation
            </p>
          </Card>
        </div>
      </section>

      {/* ----------------------------------------------------- features */}
      <section id="features" className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-8 max-w-2xl">
            <h2 className="font-display text-3xl font-bold tracking-tight">
              Everything the crew needs, in one place
            </h2>
            <p className="mt-2 text-sm text-muted">
              No spreadsheets, no five different apps, no arguments about who skipped leg day.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title} className="p-5 transition hover:border-volt/40">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-volt/12 text-volt">
                  {f.icon}
                </span>
                <h3 className="mt-3 font-display text-sm font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{f.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------- cta */}
      <section className="border-t border-line py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            The plan is written. The rest is showing up.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
            Create an account, invite your friends with a six-character code, and let the streak
            counter do the arguing for you.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/login?mode=signup" variant="primary" size="lg">
              Start training <ArrowRight size={16} />
            </ButtonLink>
            <Button variant="outline" size="lg" onClick={startDemo}>
              Look around first
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-faint sm:flex-row">
          <p>IronPulse — built for a crew that actually trains.</p>
          <p>
            Not medical advice. Train within your limits and see a professional for injuries.
          </p>
        </div>
      </footer>
    </div>
  );
}
