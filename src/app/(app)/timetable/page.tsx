"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlarmClock,
  Bell,
  BellOff,
  BellRing,
  CalendarArrowDown,
  Clock,
  Download,
  Info,
  Moon,
  Volume2,
} from "lucide-react";
import { PageHeader } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Segmented, Toggle } from "@/components/ui/form";
import { Pill, Stat } from "@/components/ui/feedback";
import { useData } from "@/lib/store/data-context";
import { getProgram } from "@/lib/data/programs";
import { sound } from "@/lib/sound";
import { disablePush, enablePush, pushConfigured, readPushToken } from "@/lib/push";
import { getRepo } from "@/lib/store/repo";
import { DAY_KEYS, DAY_LABELS, type DayKey } from "@/lib/types";
import { cn, dayKeyOf, formatTime12, minutesFromTime } from "@/lib/utils";

export default function TimetablePage() {
  const { data, updateSettings } = useData();
  const [bulkTime, setBulkTime] = useState("18:30");

  const program = getProgram(data?.profile.programId);

  if (!data) return null;

  const next = nextReminder(data.settings.reminders, (key) => program.days[key].title);

  const setDayTime = (day: DayKey, time: string | null) =>
    updateSettings({ reminders: { ...data.settings.reminders, [day]: time } });

  const applyToTrainingDays = () => {
    const reminders = { ...data.settings.reminders };
    for (const d of DAY_KEYS) {
      reminders[d] = data.profile.trainingDays.includes(d) ? bulkTime : null;
    }
    updateSettings({ reminders });
    toast.success(`All training days set to ${formatTime12(bulkTime)}`);
  };

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") {
      toast.error("This browser doesn't support notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      updateSettings({ notificationsEnabled: true });
      new Notification("IronPulse reminders are on", {
        body: "You'll get a nudge before each scheduled session while the app is open.",
        icon: "/icon.svg",
      });
      toast.success("Notifications enabled");
    } else {
      updateSettings({ notificationsEnabled: false });
      toast.error("Notification permission was denied.");
    }
  };

  /** Recurring weekly calendar events — these survive the browser being closed. */
  const downloadICS = () => {
    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//IronPulse//Training Schedule//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "X-WR-CALNAME:IronPulse Training",
    ];

    const dayCodes: Record<DayKey, string> = {
      monday: "MO",
      tuesday: "TU",
      wednesday: "WE",
      thursday: "TH",
      friday: "FR",
      saturday: "SA",
      sunday: "SU",
    };

    const today = new Date();
    for (const day of DAY_KEYS) {
      const time = data.settings.reminders[day];
      if (!time) continue;
      const plan = program.days[day];
      const [h, m] = time.split(":").map(Number);

      // First occurrence on or after today.
      const start = new Date(today);
      const currentIdx = (today.getDay() + 6) % 7;
      const targetIdx = DAY_KEYS.indexOf(day);
      const delta = (targetIdx - currentIdx + 7) % 7;
      start.setDate(today.getDate() + delta);
      start.setHours(h, m, 0, 0);
      const end = new Date(start.getTime() + plan.estimatedMinutes * 60_000);

      const fmt = (d: Date) =>
        `${d.getFullYear()}${`${d.getMonth() + 1}`.padStart(2, "0")}${`${d.getDate()}`.padStart(2, "0")}T${`${d.getHours()}`.padStart(2, "0")}${`${d.getMinutes()}`.padStart(2, "0")}00`;

      lines.push(
        "BEGIN:VEVENT",
        `UID:ironpulse-${day}-${Date.now()}@ironpulse`,
        `DTSTAMP:${fmt(new Date())}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `RRULE:FREQ=WEEKLY;BYDAY=${dayCodes[day]}`,
        `SUMMARY:${plan.title} — IronPulse`,
        `DESCRIPTION:${plan.focus}. ${plan.exercises.length} exercises, about ${plan.estimatedMinutes} minutes.`,
        "BEGIN:VALARM",
        `TRIGGER:-PT${data.settings.reminderLeadMinutes}M`,
        "ACTION:DISPLAY",
        `DESCRIPTION:${plan.title} starts soon`,
        "END:VALARM",
        "END:VEVENT",
      );
    }
    lines.push("END:VCALENDAR");

    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ironpulse-schedule.ics";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Calendar file downloaded");
  };

  const activeCount = DAY_KEYS.filter((d) => data.settings.reminders[d]).length;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Timetable & alarms"
        subtitle="Set a time for each training day. The app nudges you while it's open, and the calendar export gives you real phone alarms that work when it isn't."
        badge={`${activeCount} active`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Next session"
          value={next ? formatTime12(next.time) : "—"}
          sub={
            next
              ? next.inDays === 0
                ? `Today · ${next.title}`
                : `${DAY_LABELS[next.dayKey]} · ${next.title}`
              : "No reminders set"
          }
          icon={<AlarmClock size={15} />}
        />
        <Stat
          label="Reminders"
          value={`${activeCount}/7`}
          sub="days scheduled"
          icon={<Bell size={15} />}
          tone="ice"
        />
        <Stat
          label="Lead time"
          value={`${data.settings.reminderLeadMinutes}m`}
          sub="before the session"
          icon={<Clock size={15} />}
          tone="ember"
        />
        <Stat
          label="Notifications"
          value={data.settings.notificationsEnabled ? "On" : "Off"}
          sub={
            typeof Notification !== "undefined"
              ? `browser permission: ${Notification.permission}`
              : "unsupported"
          }
          icon={data.settings.notificationsEnabled ? <Bell size={15} /> : <BellOff size={15} />}
          tone="violet"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        {/* ---------------------------------------------------- schedule */}
        <Card>
          <CardHeader
            title="Weekly timetable"
            subtitle="Turn a day off by clearing its time."
            icon={<Clock size={15} />}
          />
          <CardBody className="space-y-2">
            {DAY_KEYS.map((day) => {
              const plan = program.days[day];
              const time = data.settings.reminders[day];
              const isTraining = data.profile.trainingDays.includes(day);
              const rest = plan.type === "rest";
              return (
                <div
                  key={day}
                  className={cn(
                    "flex flex-wrap items-center gap-3 rounded-lg border p-3",
                    time ? "border-volt/30 bg-volt/5" : "border-line bg-panel2",
                  )}
                >
                  <div className="min-w-32 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                      {rest && <Moon size={12} className="text-faint" />}
                      {DAY_LABELS[day]}
                    </p>
                    <p className="truncate text-[11px] text-faint">
                      {plan.title}
                      {isTraining && !rest ? " · scheduled" : ""}
                    </p>
                  </div>

                  <Input
                    type="time"
                    value={time ?? ""}
                    onChange={(e) => setDayTime(day, e.target.value || null)}
                    className="h-9 w-32"
                  />

                  <Button
                    size="sm"
                    variant={time ? "ghost" : "secondary"}
                    onClick={() => setDayTime(day, time ? null : "18:30")}
                  >
                    {time ? "Clear" : "Set"}
                  </Button>
                </div>
              );
            })}

            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-line p-3">
              <Field label="Apply one time to every training day" className="flex-1">
                <Input
                  type="time"
                  value={bulkTime}
                  onChange={(e) => setBulkTime(e.target.value)}
                  className="max-w-36"
                />
              </Field>
              <Button variant="primary" onClick={applyToTrainingDays}>
                Apply to {data.profile.trainingDays.length} days
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* ----------------------------------------------------- options */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="How you get reminded" icon={<Bell size={15} />} />
            <CardBody className="space-y-2.5">
              <Toggle
                checked={data.settings.notificationsEnabled}
                onChange={(v) => (v ? requestNotifications() : updateSettings({ notificationsEnabled: false }))}
                label="Browser notifications"
                description="A system notification while IronPulse is open in a tab."
              />
              <Toggle
                checked={data.settings.soundEnabled}
                onChange={(v) => updateSettings({ soundEnabled: v })}
                label="Alarm sound"
                description="An audible alarm for reminders and rest timers."
              />
              <Toggle
                checked={data.settings.vibrationEnabled}
                onChange={(v) => updateSettings({ vibrationEnabled: v })}
                label="Vibration"
                description="Buzzes on supported phones."
              />

              <Field label="Remind me this long before">
                <Segmented
                  value={String(data.settings.reminderLeadMinutes)}
                  onChange={(v) => updateSettings({ reminderLeadMinutes: Number(v) })}
                  options={[
                    { value: "0", label: "On time" },
                    { value: "15", label: "15m" },
                    { value: "30", label: "30m" },
                    { value: "60", label: "1h" },
                  ]}
                />
              </Field>

              <Field label="Snooze for" hint="The reminder has a Snooze button; this is how long it waits.">
                <Segmented
                  value={String(data.settings.snoozeMinutes)}
                  onChange={(v) => updateSettings({ snoozeMinutes: Number(v) })}
                  options={[
                    { value: "5", label: "5m" },
                    { value: "10", label: "10m" },
                    { value: "15", label: "15m" },
                    { value: "30", label: "30m" },
                  ]}
                />
              </Field>

              <Button variant="secondary" onClick={() => sound.alarm()} icon={<Volume2 size={14} />}>
                Test the alarm
              </Button>
            </CardBody>
          </Card>

          <PushRemindersCard />

          <Card className="border-ice/30">
            <CardHeader
              title="Real phone alarms"
              subtitle="Export your timetable to your calendar app"
              icon={<CalendarArrowDown size={15} />}
            />
            <CardBody>
              <p className="text-xs leading-relaxed text-muted">
                A website can&apos;t wake your phone once the tab is closed. This downloads a
                standard <code className="font-mono text-[10px] text-ink">.ics</code> file with a
                repeating weekly event and an alarm for every training day — import it into Google
                Calendar, Apple Calendar or Outlook and your phone handles the rest.
              </p>
              <Button
                variant="primary"
                className="mt-3 w-full"
                onClick={downloadICS}
                icon={<Download size={15} />}
                disabled={activeCount === 0}
              >
                Download calendar file
              </Button>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="This week at a glance" icon={<Info size={15} />} />
            <CardBody>
              <ul className="space-y-1.5">
                {DAY_KEYS.map((day) => {
                  const time = data.settings.reminders[day];
                  const plan = program.days[day];
                  return (
                    <li
                      key={day}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className={time ? "text-ink" : "text-faint"}>
                        {DAY_LABELS[day].slice(0, 3)} · {plan.title}
                      </span>
                      {time ? (
                        <Pill tone="volt">{formatTime12(time)}</Pill>
                      ) : (
                        <span className="text-[10px] text-faint">off</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** The next reminder still ahead of us, searching up to a week out. */
function nextReminder(
  reminders: Partial<Record<DayKey, string | null>>,
  titleFor: (key: DayKey) => string,
): { dayKey: DayKey; time: string; inDays: number; title: string } | null {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (let offset = 0; offset < 8; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const key = dayKeyOf(d);
    const time = reminders[key];
    if (!time) continue;
    if (offset === 0 && minutesFromTime(time) <= nowMinutes) continue;
    return { dayKey: key, time, inDays: offset, title: titleFor(key) };
  }
  return null;
}

/* ------------------------------------------------------ push reminders -- */

function PushRemindersCard() {
  const { data, storage, updateSettings } = useData();
  const [busy, setBusy] = useState(false);
  if (!data) return null;

  const available = storage === "firebase" && pushConfigured;
  const on = data.settings.pushEnabled && Boolean(readPushToken());

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      if (next) {
        await enablePush();
        updateSettings({ pushEnabled: true, notificationsEnabled: true });
        toast.success("Push reminders are on for this device");
      } else {
        const token = await disablePush();
        if (token) await getRepo().removeDevice(data.profile.uid, token);
        updateSettings({ pushEnabled: false });
        toast("Push reminders are off for this device");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not change push reminders.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Reminders when the app is closed"
        subtitle="Push notifications through Firebase Cloud Messaging"
        icon={<BellRing size={15} />}
      />
      <CardBody>
        {available ? (
          <Toggle
            checked={on}
            disabled={busy}
            onChange={(v) => void toggle(v)}
            label="Push reminders on this device"
            description="Arrive even with IronPulse closed. Turn it on separately on each phone or computer."
          />
        ) : (
          <p className="text-xs leading-relaxed text-muted">
            Needs Firebase, a web push key (
            <code className="font-mono text-[10px] text-ink">NEXT_PUBLIC_FIREBASE_VAPID_KEY</code>)
            and the reminder Cloud Function deployed — the README walks through it. Until then, the
            in-app alarm and the calendar export below have you covered.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
