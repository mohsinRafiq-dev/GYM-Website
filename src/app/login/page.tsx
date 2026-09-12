"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, Dumbbell, Flame, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Pill } from "@/components/ui/feedback";
import { useAuth } from "@/lib/store/auth-context";

export default function LoginPage() {
  const { user, mode, signIn, signUp, signInWithGoogle, signInAsDemo } = useAuth();
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Read ?mode=signup after hydration; useSearchParams would force a
    // Suspense boundary around the whole page for one boolean.
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (params.get("mode") === "signup") setIsSignUp(true);
  }, []);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isSignUp) {
        if (name.trim().length < 2) throw new Error("Tell us your name.");
        if (password.length < 6) throw new Error("Use at least 6 characters for your password.");
        await signUp(name.trim(), email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    try {
      await signInWithGoogle();
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
    }
  };

  const demo = async () => {
    await signInAsDemo();
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen">
      {/* ------------------------------------------------------- visual */}
      <div className="relative hidden flex-1 border-r border-line bg-bg2 lg:block">
        <div className="grid-bg absolute inset-0 opacity-60" aria-hidden />
        <div
          className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "radial-gradient(closest-side, rgba(201,255,77,0.18), transparent)" }}
          aria-hidden
        />
        <div className="relative flex h-full flex-col justify-between p-10">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-volt text-volt-ink">
              <Dumbbell size={18} />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight">
              Iron<span className="text-volt">Pulse</span>
            </span>
          </Link>

          <div className="max-w-md">
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight">
              &ldquo;The programme only works if you&apos;re there.&rdquo;
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Streaks, attendance and a team leaderboard exist for exactly one reason: consistency
              beats intensity over any timeline longer than a fortnight.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Pill tone="volt">6-day split</Pill>
              <Pill tone="ember">Animated demos</Pill>
              <Pill tone="ice">AI coach</Pill>
              <Pill tone="violet">Team leaderboard</Pill>
            </div>
          </div>

          <p className="text-xs text-faint">
            Storage mode: {mode === "firebase" ? "Firebase (synced)" : "Local browser storage"}
          </p>
        </div>
      </div>

      {/* -------------------------------------------------------- form */}
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-xs text-faint transition hover:text-ink"
          >
            <ArrowLeft size={13} /> Back to home
          </Link>

          <h1 className="font-display text-2xl font-bold tracking-tight">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {isSignUp
              ? "Two minutes of setup, then the plan is yours."
              : "Sign in to pick up where you left off."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3.5">
            {isSignUp && (
              <Field label="Name" htmlFor="name">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex"
                  autoComplete="name"
                  required
                />
              </Field>
            )}
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </Field>
            <Field
              label="Password"
              htmlFor="password"
              hint={isSignUp ? "At least 6 characters." : undefined}
            >
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                required
              />
            </Field>

            {error && (
              <p className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-2.5 text-xs text-danger">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                {error}
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" className="w-full" loading={busy}>
              {isSignUp ? "Create account" : "Sign in"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-faint">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="space-y-2.5">
            {mode === "firebase" && (
              <Button variant="secondary" size="lg" className="w-full" onClick={google}>
                Continue with Google
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={demo}
              icon={<Flame size={16} />}
            >
              Explore the demo account
            </Button>
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            {isSignUp ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              className="font-medium text-volt hover:underline"
              onClick={() => {
                setIsSignUp((v) => !v);
                setError(null);
              }}
            >
              {isSignUp ? "Sign in" : "Create one"}
            </button>
          </p>

          {mode === "local" && (
            <p className="mt-6 flex items-start gap-2 rounded-lg border border-line bg-panel2 p-3 text-[11px] leading-relaxed text-muted">
              <Info size={13} className="mt-0.5 shrink-0 text-ice" />
              <span>
                Running in local mode — accounts and data live in this browser only, and the
                password check is not real security. Add your Firebase keys to{" "}
                <code className="font-mono text-[10px] text-ink">.env.local</code> to enable real
                authentication and sync across devices.
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
