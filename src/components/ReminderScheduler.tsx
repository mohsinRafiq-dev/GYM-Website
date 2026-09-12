"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useData } from "@/lib/store/data-context";
import { getProgram } from "@/lib/data/programs";
import { sound, vibrate } from "@/lib/sound";
import { dayKeyOf, minutesFromTime, toISODate } from "@/lib/utils";

/**
 * Fires workout reminders while the app is open.
 *
 * A web page can't wake itself once the tab is closed, so this covers the
 * "I'm on my phone at 6pm" case, and the timetable page offers a calendar
 * export for reminders that must survive the browser being shut.
 */
export function ReminderScheduler() {
  const { data } = useData();
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!data) return;
    const program = getProgram(data.profile.programId);

    const check = () => {
      const now = new Date();
      const todayKey = dayKeyOf(now);
      const time = data.settings.reminders[todayKey];
      if (!time) return;

      const lead = data.settings.reminderLeadMinutes ?? 0;
      const target = minutesFromTime(time) - lead;
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const stamp = `${toISODate(now)}:${time}`;

      // Fire once, within a two-minute window of the target.
      if (nowMinutes >= target && nowMinutes < target + 2 && !firedRef.current.has(stamp)) {
        firedRef.current.add(stamp);

        const day = program.days[todayKey];
        const alreadyTrained = data.attendance.some(
          (a) => a.date === toISODate(now) && a.status === "trained",
        );
        if (alreadyTrained || day.type === "rest") return;

        const title = lead > 0 ? `${day.title} in ${lead} minutes` : `Time to train — ${day.title}`;
        const body = `${day.focus} · ${day.exercises.length} exercises · ~${day.estimatedMinutes} min`;

        if (data.settings.soundEnabled) sound.alarm();
        if (data.settings.vibrationEnabled) vibrate([200, 100, 200]);

        toast(title, { description: body, duration: 15000 });

        if (
          data.settings.notificationsEnabled &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification(title, { body, icon: "/icon.svg", tag: stamp });
          } catch {
            /* some browsers require a service worker registration */
          }
        }
      }
    };

    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, [data]);

  return null;
}
