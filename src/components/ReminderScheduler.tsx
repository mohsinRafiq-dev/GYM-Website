"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useData } from "@/lib/store/data-context";
import { getProgram } from "@/lib/data/programs";
import { sound, vibrate } from "@/lib/sound";
import type { DayKey } from "@/lib/types";
import { dayKeyOf, minutesFromTime, toISODate } from "@/lib/utils";

const SNOOZE_KEY = "ironpulse:snoozes";

/** stamp → epoch ms when the snoozed reminder should fire again. */
type Snoozes = Record<string, number>;

function readSnoozes(): Snoozes {
  try {
    return JSON.parse(window.localStorage.getItem(SNOOZE_KEY) ?? "{}") as Snoozes;
  } catch {
    return {};
  }
}

function writeSnoozes(value: Snoozes) {
  try {
    window.localStorage.setItem(SNOOZE_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable — snooze still works for this page load */
  }
}

/**
 * Fires workout reminders while the app is open, with Start and Snooze.
 *
 * A page can't wake itself once the tab is closed; push reminders (Firebase
 * Cloud Messaging) or the calendar export on the timetable page cover that.
 * Snoozes are persisted, so a reload doesn't lose them.
 */
export function ReminderScheduler() {
  const { data } = useData();
  const router = useRouter();
  const firedRef = useRef<Set<string>>(new Set());
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const snooze = useCallback((stamp: string) => {
    const minutes = dataRef.current?.settings.snoozeMinutes ?? 10;
    const snoozes = readSnoozes();
    snoozes[stamp] = Date.now() + minutes * 60_000;
    writeSnoozes(snoozes);
    toast(`Snoozed for ${minutes} minutes`);
  }, []);

  const announce = useCallback(
    (dayKey: DayKey, stamp: string, snoozed: boolean) => {
      const current = dataRef.current;
      if (!current) return;
      const day = getProgram(current.profile.programId).days[dayKey];
      const lead = current.settings.reminderLeadMinutes ?? 0;

      const title = snoozed
        ? `Snoozed reminder — ${day.title}`
        : lead > 0
          ? `${day.title} in ${lead} minutes`
          : `Time to train — ${day.title}`;
      const body = `${day.focus} · ${day.exercises.length} exercises · ~${day.estimatedMinutes} min`;

      if (current.settings.soundEnabled) sound.alarm();
      if (current.settings.vibrationEnabled) vibrate([200, 100, 200]);

      toast(title, {
        id: stamp,
        description: body,
        duration: 60_000,
        action: { label: "Start workout", onClick: () => router.push("/train") },
        cancel: {
          label: `Snooze ${current.settings.snoozeMinutes ?? 10}m`,
          onClick: () => snooze(stamp),
        },
      });

      if (
        current.settings.notificationsEnabled &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        try {
          const n = new Notification(title, { body, icon: "/icon.svg", tag: stamp });
          n.onclick = () => {
            window.focus();
            router.push("/train");
            n.close();
          };
        } catch {
          /* some browsers only allow notifications from a service worker */
        }
      }
    },
    [router, snooze],
  );

  useEffect(() => {
    if (!data) return;

    const check = () => {
      const current = dataRef.current;
      if (!current) return;
      const now = new Date();
      const todayISO = toISODate(now);
      const todayKey = dayKeyOf(now);
      const program = getProgram(current.profile.programId);
      const trainedToday = current.attendance.some(
        (a) => a.date === todayISO && a.status === "trained",
      );

      // 1. Snoozed reminders that are now due.
      const snoozes = readSnoozes();
      let changed = false;
      for (const [stamp, dueAt] of Object.entries(snoozes)) {
        if (dueAt > Date.now()) continue;
        delete snoozes[stamp];
        changed = true;
        const [date] = stamp.split("@");
        // Drop stale snoozes from previous days, or once the session is done.
        if (date === todayISO && !trainedToday) announce(todayKey, stamp, true);
      }
      if (changed) writeSnoozes(snoozes);

      // 2. Today's scheduled reminder.
      const time = current.settings.reminders[todayKey];
      if (!time || trainedToday || program.days[todayKey].type === "rest") return;

      const target = minutesFromTime(time) - (current.settings.reminderLeadMinutes ?? 0);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const stamp = `${todayISO}@${time}`;

      if (
        nowMinutes >= target &&
        nowMinutes < target + 2 &&
        !firedRef.current.has(stamp) &&
        !(stamp in snoozes)
      ) {
        firedRef.current.add(stamp);
        announce(todayKey, stamp, false);
      }
    };

    check();
    const id = setInterval(check, 15_000);
    return () => clearInterval(id);
  }, [data, announce]);

  return null;
}
