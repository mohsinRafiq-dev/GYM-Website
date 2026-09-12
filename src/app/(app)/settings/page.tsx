"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Database,
  Download,
  LogOut,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Shield,
  Sun,
  Timer,
  User,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Chip, Field, Input, Segmented, Select, Textarea, Toggle } from "@/components/ui/form";
import { Avatar, Pill } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { useAuth } from "@/lib/store/auth-context";
import { useData } from "@/lib/store/data-context";
import { useTheme } from "@/components/theme-provider";
import { PROGRAMS } from "@/lib/data/programs";
import { ACTIVITY_LABELS } from "@/lib/fitness";
import {
  DAY_KEYS,
  DAY_LABELS,
  GOAL_LABELS,
  type ActivityLevel,
  type DayKey,
  type Difficulty,
  type Goal,
  type Sex,
  type Units,
} from "@/lib/types";
import { cmToIn, inToCm, kgToLb, lbToKg, round } from "@/lib/utils";

export default function SettingsPage() {
  const { user, signOut, mode } = useAuth();
  const { data, updateProfile, updateSettings, storage, exportData, resetData } = useData();
  const { theme, setTheme } = useTheme();
  const [resetOpen, setResetOpen] = useState(false);

  const [name, setName] = useState(data?.profile.displayName ?? "");
  const [bio, setBio] = useState(data?.profile.bio ?? "");
  const [limitations, setLimitations] = useState(data?.profile.limitations ?? "");

  if (!data) return null;
  const units = data.settings.units;

  const saveProfile = () => {
    updateProfile({
      displayName: name.trim() || data.profile.displayName,
      bio: bio.trim() || undefined,
      limitations: limitations.trim() || undefined,
    });
    toast.success("Profile saved");
  };

  const download = () => {
    const blob = new Blob([exportData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ironpulse-${data.profile.handle}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Data exported");
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle="Your profile, your programme defaults and your data." />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ------------------------------------------------------ profile */}
        <Card>
          <CardHeader title="Profile" icon={<User size={15} />} />
          <CardBody className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar name={data.profile.displayName} src={data.profile.photoURL} size={52} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{data.profile.displayName}</p>
                <p className="truncate text-xs text-faint">{data.profile.email}</p>
                <p className="text-[11px] text-faint">@{data.profile.handle}</p>
              </div>
            </div>

            <Field label="Display name">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Bio" hint="Shown to your team.">
              <Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="min-h-16" />
            </Field>
            <Field
              label="Injuries or limitations"
              hint="The coach respects these when suggesting exercises."
            >
              <Input value={limitations} onChange={(e) => setLimitations(e.target.value)} />
            </Field>

            <div className="grid grid-cols-3 gap-2">
              <Field label="Year of birth">
                <Input
                  type="number"
                  value={data.profile.birthYear ?? ""}
                  onChange={(e) => updateProfile({ birthYear: Number(e.target.value) })}
                />
              </Field>
              <Field label={units === "metric" ? "Height (cm)" : "Height (in)"}>
                <Input
                  type="number"
                  value={
                    data.profile.heightCm
                      ? units === "metric"
                        ? round(data.profile.heightCm, 0)
                        : round(cmToIn(data.profile.heightCm), 1)
                      : ""
                  }
                  onChange={(e) =>
                    updateProfile({
                      heightCm:
                        units === "metric" ? Number(e.target.value) : inToCm(Number(e.target.value)),
                    })
                  }
                />
              </Field>
              <Field label={`Target (${units === "metric" ? "kg" : "lb"})`}>
                <Input
                  type="number"
                  value={
                    data.profile.targetWeightKg
                      ? units === "metric"
                        ? round(data.profile.targetWeightKg, 1)
                        : round(kgToLb(data.profile.targetWeightKg), 1)
                      : ""
                  }
                  onChange={(e) =>
                    updateProfile({
                      targetWeightKg:
                        units === "metric" ? Number(e.target.value) : lbToKg(Number(e.target.value)),
                    })
                  }
                />
              </Field>
            </div>

            <Field label="Sex">
              <Segmented
                value={data.profile.sex}
                onChange={(v) => updateProfile({ sex: v as Sex })}
                options={[
                  { value: "male", label: "Male" },
                  { value: "female", label: "Female" },
                  { value: "other", label: "Other" },
                ]}
              />
            </Field>

            <Button variant="primary" onClick={saveProfile} icon={<Save size={15} />}>
              Save profile
            </Button>
          </CardBody>
        </Card>

        {/* ---------------------------------------------------- training */}
        <Card>
          <CardHeader title="Training" icon={<Timer size={15} />} />
          <CardBody className="space-y-3">
            <Field label="Programme">
              <Select
                value={data.profile.programId}
                onChange={(e) => {
                  const next = PROGRAMS.find((p) => p.id === e.target.value);
                  if (!next) return;
                  updateProfile({
                    programId: next.id,
                    trainingDays: Object.values(next.days)
                      .filter((d) => d.type !== "rest")
                      .map((d) => d.key),
                  });
                  toast.success(`Switched to ${next.name}`);
                }}
              >
                {PROGRAMS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.tagline}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Training days">
              <div className="flex flex-wrap gap-1.5">
                {DAY_KEYS.map((d) => (
                  <Chip
                    key={d}
                    active={data.profile.trainingDays.includes(d)}
                    onClick={() =>
                      updateProfile({
                        trainingDays: data.profile.trainingDays.includes(d)
                          ? data.profile.trainingDays.filter((x) => x !== d)
                          : ([...data.profile.trainingDays, d] as DayKey[]),
                      })
                    }
                  >
                    {DAY_LABELS[d].slice(0, 3)}
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Goals">
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                  <Chip
                    key={g}
                    active={data.profile.goals.includes(g)}
                    onClick={() =>
                      updateProfile({
                        goals: data.profile.goals.includes(g)
                          ? data.profile.goals.filter((x) => x !== g)
                          : ([...data.profile.goals, g].slice(-2) as Goal[]),
                      })
                    }
                  >
                    {GOAL_LABELS[g]}
                  </Chip>
                ))}
              </div>
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Experience">
                <Segmented
                  value={data.profile.experience}
                  onChange={(v) => updateProfile({ experience: v as Difficulty })}
                  size="sm"
                  options={[
                    { value: "beginner", label: "New" },
                    { value: "intermediate", label: "1-3y" },
                    { value: "advanced", label: "3y+" },
                  ]}
                />
              </Field>
              <Field label="Daily activity">
                <Select
                  value={data.profile.activity}
                  onChange={(e) => updateProfile({ activity: e.target.value as ActivityLevel })}
                  className="text-xs"
                >
                  {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
                    <option key={a} value={a}>
                      {ACTIVITY_LABELS[a]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field label="Default rest between sets">
              <Segmented
                value={String(data.settings.defaultRestSeconds)}
                onChange={(v) => updateSettings({ defaultRestSeconds: Number(v) })}
                options={[
                  { value: "60", label: "60s" },
                  { value: "90", label: "90s" },
                  { value: "120", label: "2m" },
                  { value: "180", label: "3m" },
                ]}
              />
            </Field>

            <Field label="Streak rest allowance" hint="Consecutive non-training days that won't break a streak.">
              <Segmented
                value={String(data.settings.streakRestAllowance)}
                onChange={(v) => updateSettings({ streakRestAllowance: Number(v) })}
                options={[
                  { value: "1", label: "1 day" },
                  { value: "2", label: "2 days" },
                  { value: "3", label: "3 days" },
                ]}
              />
            </Field>

            <Toggle
              checked={data.settings.restAutoStart}
              onChange={(v) => updateSettings({ restAutoStart: v })}
              label="Auto-start rest timer"
              description="Starts counting the moment you tick a working set."
            />
          </CardBody>
        </Card>

        {/* ---------------------------------------------------- appearance */}
        <Card>
          <CardHeader title="Appearance & units" icon={<Palette size={15} />} />
          <CardBody className="space-y-3">
            <Field label="Theme">
              <Segmented
                value={theme}
                onChange={(t) => {
                  setTheme(t);
                  updateSettings({ theme: t as "dark" | "light" | "system" });
                }}
                options={[
                  { value: "dark", label: <span className="flex items-center gap-1"><Moon size={11} /> Dark</span> },
                  { value: "light", label: <span className="flex items-center gap-1"><Sun size={11} /> Light</span> },
                  { value: "system", label: "System" },
                ]}
              />
            </Field>

            <Field label="Units">
              <Segmented
                value={units}
                onChange={(u) => {
                  updateSettings({ units: u as Units });
                  updateProfile({ units: u as Units });
                }}
                options={[
                  { value: "metric", label: "Metric (kg / cm)" },
                  { value: "imperial", label: "Imperial (lb / in)" },
                ]}
              />
            </Field>

            <Toggle
              checked={data.settings.soundEnabled}
              onChange={(v) => updateSettings({ soundEnabled: v })}
              label="Sounds"
              description="Rest timer alerts, set confirmations and PR fanfare."
            />
            <Toggle
              checked={data.settings.vibrationEnabled}
              onChange={(v) => updateSettings({ vibrationEnabled: v })}
              label="Vibration"
              description="Haptic feedback on supported devices."
            />
          </CardBody>
        </Card>

        {/* -------------------------------------------------------- data */}
        <Card>
          <CardHeader title="Privacy & data" icon={<Shield size={15} />} />
          <CardBody className="space-y-3">
            <div className="rounded-lg border border-line bg-panel2 p-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-ink">
                <Database size={13} className="text-volt" />
                Storage: {storage === "firebase" ? "Firebase (synced)" : "This browser only"}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">
                {storage === "firebase"
                  ? "Your data syncs across devices and your team can see the stats you choose to share."
                  : "Everything lives in this browser's local storage. Add Firebase config to .env.local to sync across devices and share a team with your friends."}
              </p>
              <p className="mt-1.5 text-[11px] text-faint">
                Auth mode: {mode} · signed in as {user?.email}
              </p>
            </div>

            <Toggle
              checked={data.settings.shareStatsWithTeam}
              onChange={(v) => updateSettings({ shareStatsWithTeam: v })}
              label="Share stats with my team"
              description="Streak, session count and weekly volume appear on the leaderboard."
            />
            <Toggle
              checked={data.settings.publicProfile}
              onChange={(v) => updateSettings({ publicProfile: v })}
              label="Public profile"
              description="Your name and bio are visible to team members."
            />

            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="secondary" onClick={download} icon={<Download size={15} />}>
                Export my data
              </Button>
              <Button variant="danger" onClick={() => setResetOpen(true)} icon={<RotateCcw size={15} />}>
                Reset everything
              </Button>
              <Button variant="ghost" onClick={() => signOut()} icon={<LogOut size={15} />}>
                Sign out
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              <Pill>{data.sessions.length} sessions</Pill>
              <Pill>{data.attendance.length} check-ins</Pill>
              <Pill>{data.metrics.length} measurements</Pill>
              <Pill>{data.photos.length} photos</Pill>
              <Pill>{data.gamification.badges.length} badges</Pill>
            </div>
          </CardBody>
        </Card>
      </div>

      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="Reset everything?"
        description="This permanently deletes every session, check-in, measurement, photo and badge for this account."
        size="sm"
        footer={
          <div className="flex gap-2">
            <Button
              variant="danger"
              onClick={() => {
                resetData();
                setResetOpen(false);
                toast.success("All data cleared");
              }}
            >
              Yes, delete it all
            </Button>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          Export your data first if there&apos;s any chance you&apos;ll want it back — there is no
          undo.
        </p>
      </Modal>
    </div>
  );
}
