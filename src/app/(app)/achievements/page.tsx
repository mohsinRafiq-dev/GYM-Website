"use client";

import { useMemo } from "react";
import { Award, Flame, Lock, Sparkles, Trophy, Zap } from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Pill, Progress, Ring, Stat } from "@/components/ui/feedback";
import { BADGES } from "@/lib/data/badges";
import { useData } from "@/lib/store/data-context";
import { LEVEL_TITLES, levelFromXP, levelTitle, totalVolume, xpForLevel } from "@/lib/fitness";
import { cn, compact, relativeDay, toISODate } from "@/lib/utils";
import type { BadgeTier } from "@/lib/types";

const TIER_STYLE: Record<BadgeTier, { ring: string; text: string; label: string }> = {
  bronze: { ring: "border-ember/40", text: "text-ember", label: "Bronze" },
  silver: { ring: "border-line-strong", text: "text-ink", label: "Silver" },
  gold: { ring: "border-warn/50", text: "text-warn", label: "Gold" },
  platinum: { ring: "border-violet/50", text: "text-violet", label: "Platinum" },
};

export default function AchievementsPage() {
  const { data } = useData();

  const view = useMemo(() => {
    if (!data) return null;
    const earned = new Map(data.gamification.badges.map((b) => [b.badgeId, b.earnedAt]));
    const level = levelFromXP(data.gamification.xp);
    const byTier: Record<BadgeTier, typeof BADGES> = {
      bronze: [],
      silver: [],
      gold: [],
      platinum: [],
    };
    for (const b of BADGES) byTier[b.tier].push(b);
    return { earned, level, byTier };
  }, [data]);

  if (!data || !view) return null;

  const { earned, level, byTier } = view;
  const earnedCount = earned.size;
  const done = data.sessions.filter((s) => s.completed);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Achievements"
        subtitle="XP for every session, levels for the long game, and badges for the milestones worth remembering."
        badge={`${earnedCount}/${BADGES.length} unlocked`}
      />

      {/* --------------------------------------------------------- level */}
      <Card glow>
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
          <Ring
            value={level.pct}
            label={`${level.level}`}
            sub="level"
            size={110}
            stroke={9}
            tone="var(--c-violet)"
          />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-2xl font-bold">{levelTitle(level.level)}</h2>
            <p className="mt-1 text-sm text-muted">
              {data.gamification.xp.toLocaleString()} XP total ·{" "}
              {(level.need - level.into).toLocaleString()} to level {level.level + 1}
            </p>
            <Progress value={level.pct} className="mt-3" tone="volt" height={8} />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {LEVEL_TITLES.map((t) => (
                <Pill
                  key={t.title}
                  tone={level.level >= t.min ? "violet" : "neutral"}
                  className={level.level >= t.min ? undefined : "opacity-50"}
                >
                  Lv{t.min} {t.title}
                </Pill>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Badges" value={`${earnedCount}/${BADGES.length}`} icon={<Award size={15} />} />
        <Stat
          label="Total XP"
          value={data.gamification.xp.toLocaleString()}
          sub={`next level at ${xpForLevel(level.level + 1).toLocaleString()}`}
          icon={<Zap size={15} />}
          tone="violet"
        />
        <Stat
          label="Sessions"
          value={done.length}
          sub={`${compact(totalVolume(done))} kg lifted`}
          icon={<Trophy size={15} />}
          tone="ice"
        />
        <Stat
          label="Best streak"
          value={data.streak.longest}
          sub={`current ${data.streak.current}`}
          icon={<Flame size={15} />}
          tone="ember"
        />
      </div>

      {/* -------------------------------------------------------- badges */}
      {(Object.keys(byTier) as BadgeTier[]).map((tier) => (
        <Card key={tier}>
          <CardHeader
            title={`${TIER_STYLE[tier].label} badges`}
            subtitle={`${byTier[tier].filter((b) => earned.has(b.id)).length} of ${byTier[tier].length} unlocked`}
            icon={<Sparkles size={15} />}
          />
          <CardBody>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {byTier[tier].map((badge) => {
                const at = earned.get(badge.id);
                const unlocked = Boolean(at);
                return (
                  <div
                    key={badge.id}
                    className={cn(
                      "flex gap-3 rounded-lg border p-3 transition",
                      unlocked
                        ? `${TIER_STYLE[tier].ring} bg-panel2`
                        : "border-line bg-panel2/50 opacity-60",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl",
                        unlocked ? "bg-panel3" : "bg-panel3/50 grayscale",
                      )}
                    >
                      {unlocked ? badge.icon : <Lock size={16} className="text-faint" />}
                    </span>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                        {badge.name}
                        <span className={cn("text-[10px] font-medium", TIER_STYLE[tier].text)}>
                          +{badge.xp} XP
                        </span>
                      </p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                        {badge.description}
                      </p>
                      <p className="mt-1 text-[10px] text-faint">
                        {unlocked
                          ? `Unlocked ${relativeDay(toISODate(new Date(at as number)))}`
                          : badge.criteria}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      ))}

      <Card>
        <CardHeader title="How XP works" />
        <CardBody>
          <ul className="space-y-1.5 text-xs leading-relaxed text-muted">
            {[
              "80 XP base for finishing any session — showing up is most of it.",
              "Up to 120 XP scaled by the volume you moved, and 4 XP per working set.",
              "60 XP for every personal record you set.",
              "A streak bonus of 2 XP for every session in your current streak, capped at 50.",
              "Badges pay their XP once, when they unlock.",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-volt" />
                {t}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
