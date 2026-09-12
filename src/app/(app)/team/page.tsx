"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Award,
  Check,
  Copy,
  Crown,
  Flame,
  Gavel,
  LogOut,
  Megaphone,
  Plus,
  Send,
  Shield,
  Target,
  Trash2,
  TrendingUp,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Segmented, Textarea } from "@/components/ui/form";
import { Avatar, EmptyState, Pill, Progress, Stat } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { useData } from "@/lib/store/data-context";
import { levelTitle } from "@/lib/fitness";
import { cn, compact, relativeDay, toISODate } from "@/lib/utils";
import type { TeamRole } from "@/lib/types";

const DEFAULT_RULES = [
  "Show up on your scheduled days. Tell the group before you miss one, not after.",
  "Log every session. Untracked training is a guess.",
  "Warm up properly. Nobody has time to carry an injured training partner.",
  "Re-rack your weights and wipe the bench. Every time.",
  "Form before load. Nobody is impressed by a bad rep.",
  "No shaming anyone's starting point. Everyone was new once.",
];

const DEFAULT_TERMS = `By joining this team you agree to:

1. Train honestly — log what you actually lifted, not what you wish you had.
2. Respect the weekly session target the team has set. Missing it happens; hiding it doesn't.
3. Keep team data inside the team. Nobody's weight, photos or numbers leave the group.
4. Take responsibility for your own health. Train within your limits and see a professional for injuries.
5. Support the group. Encouragement in the feed, honesty in the leaderboard.

Breaking these repeatedly means the owner can remove you from the team.`;

type SortKey = "streak" | "sessions" | "volume" | "xp";

export default function TeamPage() {
  const {
    data,
    team,
    createTeam,
    joinTeam,
    leaveTeam,
    acceptTeamTerms,
    postToTeam,
    setTeamChallenge,
    updateMemberRole,
    removeMember,
  } = useData();

  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [motto, setMotto] = useState("");
  const [rules, setRules] = useState(DEFAULT_RULES.join("\n"));
  const [terms, setTerms] = useState(DEFAULT_TERMS);
  const [weeklyTarget, setWeeklyTarget] = useState(5);
  const [maxMembers, setMaxMembers] = useState(8);
  const [privacy, setPrivacy] = useState<"invite-only" | "open">("invite-only");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [post, setPost] = useState("");
  const [sort, setSort] = useState<SortKey>("streak");
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const me = team?.members.find((m) => m.uid === data?.profile.uid);
  const isOwner = team?.ownerUid === data?.profile.uid;
  const isCoach = me?.role === "coach" || isOwner;

  const ranked = useMemo(() => {
    if (!team) return [];
    const members = team.members;
    const key: Record<SortKey, (m: (typeof members)[number]) => number> = {
      streak: (m) => m.stats.currentStreak,
      sessions: (m) => m.stats.sessionsThisWeek,
      volume: (m) => m.stats.volumeThisWeekKg,
      xp: (m) => m.stats.xp,
    };
    return [...members].sort((a, b) => key[sort](b) - key[sort](a));
  }, [team, sort]);

  if (!data) return null;

  /* ============================================================ no team */
  if (!team) {
    const submitCreate = async () => {
      if (name.trim().length < 2) {
        toast.error("Give the team a name.");
        return;
      }
      setBusy(true);
      try {
        const t = await createTeam({
          name: name.trim(),
          motto: motto.trim() || "Show up. Log it. Repeat.",
          rules: rules.split("\n").map((r) => r.trim()).filter(Boolean),
          terms,
          weeklyTarget,
          maxMembers,
          privacy,
        });
        toast.success(`${t.name} created — share code ${t.code}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not create the team.");
      } finally {
        setBusy(false);
      }
    };

    const submitJoin = async () => {
      setBusy(true);
      try {
        const t = await joinTeam(code);
        toast.success(`Welcome to ${t.name}`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not join that team.");
      } finally {
        setBusy(false);
      }
    };

    return (
      <div className="space-y-5">
        <PageHeader
          title="Your crew"
          subtitle="Training with other people is the single most reliable adherence tool there is. Create a team or join one with a six-character code."
        />

        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "create", label: "Create a team" },
            { value: "join", label: "Join with a code" },
          ]}
        />

        {mode === "join" ? (
          <Card className="max-w-md">
            <CardHeader
              title="Join a team"
              subtitle="Ask whoever created it for the code."
              icon={<UserPlus size={15} />}
            />
            <CardBody className="space-y-3">
              <Field label="Join code">
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="text-center font-mono text-lg tracking-[0.3em]"
                />
              </Field>
              <Button variant="primary" className="w-full" onClick={submitJoin} loading={busy}>
                Join team
              </Button>
              {data.settings && (
                <p className="text-[11px] leading-relaxed text-faint">
                  In local mode, teams live in this browser — great for testing, but your friends
                  need the Firebase setup to actually share one. See the README.
                </p>
              )}
            </CardBody>
          </Card>
        ) : (
          <Card className="max-w-2xl">
            <CardHeader
              title="Create a team"
              subtitle="Set the rules once and everyone signs up to them on the way in."
              icon={<Users size={15} />}
            />
            <CardBody className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Team name">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Iron Brothers" />
                </Field>
                <Field label="Motto">
                  <Input
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    placeholder="No excuses, only reps"
                  />
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Weekly session target" hint="Per member">
                  <Input
                    type="number"
                    min={1}
                    max={7}
                    value={weeklyTarget}
                    onChange={(e) => setWeeklyTarget(Number(e.target.value))}
                  />
                </Field>
                <Field label="Maximum members">
                  <Input
                    type="number"
                    min={2}
                    max={50}
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(Number(e.target.value))}
                  />
                </Field>
                <Field label="Privacy">
                  <Segmented
                    value={privacy}
                    onChange={setPrivacy}
                    size="sm"
                    options={[
                      { value: "invite-only", label: "Code only" },
                      { value: "open", label: "Open" },
                    ]}
                  />
                </Field>
              </div>

              <Field label="Team rules" hint="One per line. Members see these before they join.">
                <Textarea value={rules} onChange={(e) => setRules(e.target.value)} className="min-h-36" />
              </Field>

              <Field label="Terms every member accepts">
                <Textarea value={terms} onChange={(e) => setTerms(e.target.value)} className="min-h-40" />
              </Field>

              <Button variant="primary" size="lg" onClick={submitCreate} loading={busy}>
                Create team
              </Button>
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  /* =========================================================== in team */
  const needsTerms = me && !me.acceptedTermsAt;
  const totalWeek = team.members.reduce((n, m) => n + m.stats.sessionsThisWeek, 0);
  const teamTarget = team.weeklyTarget * team.members.length;

  const challengeProgress = (() => {
    if (!team.challenge) return 0;
    const metric = team.challenge.metric;
    const total = team.members.reduce((n, m) => {
      if (metric === "sessions") return n + m.stats.sessionsThisWeek;
      if (metric === "volume") return n + m.stats.volumeThisWeekKg;
      if (metric === "streak") return n + m.stats.currentStreak;
      return n + m.stats.sessionsTotal;
    }, 0);
    return total;
  })();

  return (
    <div className="space-y-5">
      <PageHeader
        title={team.name}
        subtitle={team.motto}
        badge={`${team.members.length}/${team.maxMembers} members`}
        action={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard?.writeText(team.code);
                toast.success(`Code ${team.code} copied`);
              }}
              icon={<Copy size={14} />}
            >
              {team.code}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm(`Leave ${team.name}?`)) leaveTeam();
              }}
              icon={<LogOut size={14} />}
            >
              Leave
            </Button>
          </div>
        }
      />

      {needsTerms && (
        <Card className="border-warn/40">
          <CardBody className="pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-warn/15 text-warn">
                <Gavel size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-semibold">Accept the team terms</p>
                <p className="text-xs text-muted">
                  Everyone signs up to the same agreement. Read it, then accept.
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowTerms(true)}>
                Read terms
              </Button>
              <Button variant="primary" size="sm" onClick={() => acceptTeamTerms()} icon={<Check size={14} />}>
                Accept
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* --------------------------------------------------------- stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Members" value={`${team.members.length}/${team.maxMembers}`} icon={<Users size={15} />} />
        <Stat
          label="Sessions this week"
          value={`${totalWeek}/${teamTarget}`}
          sub={`${team.weeklyTarget} per member`}
          icon={<Target size={15} />}
          tone="ice"
        />
        <Stat
          label="Team volume"
          value={`${compact(team.members.reduce((n, m) => n + m.stats.volumeThisWeekKg, 0))} kg`}
          sub="this week"
          icon={<TrendingUp size={15} />}
          tone="ember"
        />
        <Stat
          label="Best streak"
          value={Math.max(0, ...team.members.map((m) => m.stats.currentStreak))}
          sub={
            ranked[0]?.displayName
              ? `held by ${[...team.members].sort((a, b) => b.stats.currentStreak - a.stats.currentStreak)[0]?.displayName}`
              : ""
          }
          icon={<Flame size={15} />}
          tone="violet"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          {/* ------------------------------------------------ leaderboard */}
          <Card>
            <CardHeader
              title="Leaderboard"
              subtitle="Updated whenever anyone logs a session"
              icon={<Trophy size={15} />}
              action={
                <Segmented
                  value={sort}
                  onChange={setSort}
                  size="sm"
                  options={[
                    { value: "streak", label: "Streak" },
                    { value: "sessions", label: "Week" },
                    { value: "volume", label: "Volume" },
                    { value: "xp", label: "XP" },
                  ]}
                />
              }
            />
            <CardBody>
              <ul className="space-y-1.5">
                {ranked.map((m, i) => {
                  const isMe = m.uid === data.profile.uid;
                  return (
                    <li
                      key={m.uid}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border p-2.5",
                        isMe ? "border-volt/40 bg-volt/6" : "border-line bg-panel2",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[11px] font-bold tnum",
                          i === 0
                            ? "bg-ember text-white"
                            : i === 1
                              ? "bg-panel3 text-ink"
                              : "bg-panel3 text-faint",
                        )}
                      >
                        {i + 1}
                      </span>
                      <Avatar name={m.displayName} src={m.photoURL} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm text-ink">
                          {m.displayName}
                          {isMe && <span className="text-[10px] text-volt">you</span>}
                          {m.role === "owner" && <Crown size={11} className="text-ember" />}
                          {m.role === "coach" && <Shield size={11} className="text-ice" />}
                        </p>
                        <p className="text-[11px] text-faint">
                          Lv {m.stats.level} {levelTitle(m.stats.level)} ·{" "}
                          {m.stats.sessionsTotal} sessions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-ink tnum">
                          {sort === "streak"
                            ? m.stats.currentStreak
                            : sort === "sessions"
                              ? `${m.stats.sessionsThisWeek}/${team.weeklyTarget}`
                              : sort === "volume"
                                ? `${compact(m.stats.volumeThisWeekKg)} kg`
                                : m.stats.xp.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-faint">
                          {sort === "streak"
                            ? "day streak"
                            : sort === "sessions"
                              ? "this week"
                              : sort === "volume"
                                ? "this week"
                                : "XP"}
                        </p>
                      </div>

                      {isOwner && !isMe && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateMemberRole(m.uid, m.role === "coach" ? "member" : ("coach" as TeamRole))
                            }
                            className="rounded p-1 text-faint transition hover:text-ice"
                            title={m.role === "coach" ? "Demote to member" : "Promote to coach"}
                          >
                            <Shield size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Remove ${m.displayName} from the team?`))
                                removeMember(m.uid);
                            }}
                            className="rounded p-1 text-faint transition hover:text-danger"
                            title="Remove member"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>

          {/* ------------------------------------------------------ feed */}
          <Card>
            <CardHeader title="Team feed" icon={<Megaphone size={15} />} />
            <CardBody>
              <div className="flex gap-2">
                <Input
                  value={post}
                  onChange={(e) => setPost(e.target.value)}
                  placeholder="Hit a PR? Skipping tomorrow? Say something."
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && post.trim()) {
                      postToTeam(post.trim(), isCoach ? "announcement" : "cheer");
                      setPost("");
                    }
                  }}
                />
                <Button
                  variant="primary"
                  onClick={() => {
                    if (!post.trim()) return;
                    postToTeam(post.trim(), isCoach ? "announcement" : "cheer");
                    setPost("");
                  }}
                  icon={<Send size={14} />}
                >
                  Post
                </Button>
              </div>

              {team.posts.length === 0 ? (
                <p className="mt-4 text-center text-xs text-faint">Nothing posted yet.</p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {team.posts.map((p) => (
                    <li
                      key={p.id}
                      className={cn(
                        "rounded-lg border p-3",
                        p.pinned ? "border-volt/40 bg-volt/6" : "border-line bg-panel2",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={p.authorName} src={p.authorPhoto} size={24} />
                        <span className="text-xs font-medium text-ink">{p.authorName}</span>
                        <Pill
                          tone={
                            p.kind === "announcement" ? "ember" : p.kind === "pr" ? "violet" : "neutral"
                          }
                        >
                          {p.kind}
                        </Pill>
                        <span className="ml-auto text-[10px] text-faint">
                          {relativeDay(toISODate(new Date(p.createdAt)))}
                        </span>
                      </div>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-4">
          {/* ------------------------------------------------- challenge */}
          <Card className={team.challenge ? "border-ember/30" : undefined}>
            <CardHeader
              title="Weekly challenge"
              icon={<Award size={15} />}
              action={
                isCoach && (
                  <Button size="sm" variant="ghost" onClick={() => setChallengeOpen(true)} icon={<Plus size={13} />}>
                    {team.challenge ? "Change" : "Set"}
                  </Button>
                )
              }
            />
            <CardBody>
              {team.challenge ? (
                <>
                  <p className="font-display text-sm font-semibold">{team.challenge.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {team.challenge.description}
                  </p>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-muted">Team progress</span>
                      <span className="text-ink tnum">
                        {Math.round(challengeProgress)} / {team.challenge.target}
                      </span>
                    </div>
                    <Progress
                      value={challengeProgress}
                      max={team.challenge.target}
                      tone="ember"
                    />
                  </div>
                  <p className="mt-2 text-[10px] text-faint">
                    Ends {team.challenge.endDate}
                  </p>
                </>
              ) : (
                <EmptyState
                  title="No challenge running"
                  description={
                    isCoach
                      ? "Set one — a shared target does more for adherence than any app feature."
                      : "The owner or a coach can set one."
                  }
                />
              )}
            </CardBody>
          </Card>

          {/* ----------------------------------------------------- rules */}
          <Card>
            <CardHeader title="Team rules" icon={<Gavel size={15} />} />
            <CardBody>
              <ol className="space-y-2">
                {team.rules.map((r, i) => (
                  <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-muted">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-panel3 text-[10px] font-bold text-volt">
                      {i + 1}
                    </span>
                    {r}
                  </li>
                ))}
              </ol>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setShowTerms(true)}
              >
                Read the full terms
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Invite the crew" icon={<UserPlus size={15} />} />
            <CardBody>
              <p className="text-xs text-muted">Share this code:</p>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(team.code);
                  toast.success("Copied");
                }}
                className="mt-2 w-full rounded-lg border border-dashed border-volt/50 bg-volt/8 py-3 text-center font-mono text-2xl font-bold tracking-[0.4em] text-volt"
              >
                {team.code}
              </button>
              <p className="mt-2 text-[11px] text-faint">
                {team.maxMembers - team.members.length} space
                {team.maxMembers - team.members.length === 1 ? "" : "s"} left ·{" "}
                {team.privacy === "invite-only" ? "Code required" : "Open to anyone"}
              </p>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* -------------------------------------------------------- modals */}
      <Modal open={showTerms} onClose={() => setShowTerms(false)} title={`${team.name} — terms`} size="lg">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted">
          {team.terms}
        </pre>
        {needsTerms && (
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => {
              acceptTeamTerms();
              setShowTerms(false);
            }}
          >
            I accept
          </Button>
        )}
      </Modal>

      <ChallengeModal
        open={challengeOpen}
        onClose={() => setChallengeOpen(false)}
        memberCount={team.members.length}
        onSave={(c) => {
          setTeamChallenge(c);
          setChallengeOpen(false);
          toast.success("Challenge set");
        }}
      />
    </div>
  );
}

function ChallengeModal({
  open,
  onClose,
  memberCount,
  onSave,
}: {
  open: boolean;
  onClose(): void;
  memberCount: number;
  onSave(c: {
    title: string;
    description: string;
    metric: "sessions" | "volume" | "streak" | "attendance";
    target: number;
    startDate: string;
    endDate: string;
  }): void;
}) {
  const [title, setTitle] = useState("No Zeroes Week");
  const [description, setDescription] = useState(
    "Every member logs at least four sessions. One person short and the whole team fails it.",
  );
  const [metric, setMetric] = useState<"sessions" | "volume" | "streak" | "attendance">("sessions");
  const [target, setTarget] = useState(memberCount * 4);
  const end = new Date();
  end.setDate(end.getDate() + 7);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Set a weekly challenge"
      footer={
        <Button
          variant="primary"
          onClick={() =>
            onSave({
              title,
              description,
              metric,
              target,
              startDate: toISODate(),
              endDate: toISODate(end),
            })
          }
        >
          Start challenge
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Measured by">
            <Segmented
              value={metric}
              onChange={setMetric}
              size="sm"
              options={[
                { value: "sessions", label: "Sessions" },
                { value: "volume", label: "Volume" },
                { value: "streak", label: "Streak" },
              ]}
            />
          </Field>
          <Field label="Team target">
            <Input type="number" value={target} onChange={(e) => setTarget(Number(e.target.value))} />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
