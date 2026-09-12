/* ============================================================================
 * IronPulse push reminders.
 *
 * Every five minutes: for each registered browser, work out the local time in
 * that device's timezone, and if a reminder is due (and today's session isn't
 * already logged) send a push notification through FCM.
 *
 * Requires the Firebase Blaze plan (scheduled functions). Deploy with:
 *   cd functions && npm install && npm run deploy
 * ========================================================================= */

import { initializeApp } from "firebase-admin/app";
import { getFirestore, type DocumentReference } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";

initializeApp();

const DAY_KEYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
type DayKey = (typeof DAY_KEYS)[number];

interface Device {
  uid: string;
  token: string;
  timezone: string;
  reminders: Partial<Record<DayKey, string | null>>;
  leadMinutes: number;
  sessionTitles?: Partial<Record<DayKey, string | null>>;
  lastSentStamp?: string;
}

/** How often the schedule runs; a reminder fires in the window it falls into. */
const WINDOW_MINUTES = 5;

/** Local calendar date, weekday and minute-of-day for an instant in a timezone. */
function localClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    dayKey: get("weekday").toLowerCase() as DayKey,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

export const sendWorkoutReminders = onSchedule(
  { schedule: `every ${WINDOW_MINUTES} minutes`, timeZone: "UTC", retryCount: 0 },
  async () => {
    const db = getFirestore();
    const messaging = getMessaging();
    const now = new Date();

    const devices = await db.collectionGroup("devices").get();
    let sent = 0;

    for (const snap of devices.docs) {
      const device = snap.data() as Device;
      let clock: ReturnType<typeof localClock>;
      try {
        clock = localClock(now, device.timezone || "UTC");
      } catch {
        clock = localClock(now, "UTC");
      }

      const time = device.reminders?.[clock.dayKey];
      if (!time) continue;
      const [h, m] = time.split(":").map(Number);
      const target = h * 60 + m - (device.leadMinutes ?? 0);
      if (clock.minutes < target || clock.minutes >= target + WINDOW_MINUTES) continue;

      // Same stamp format as the in-app scheduler, so notifications de-duplicate.
      const stamp = `${clock.date}@${time}`;
      if (device.lastSentStamp === stamp) continue;

      const attendance = await db
        .doc(`users/${device.uid}/attendance/${clock.date}`)
        .get();
      if (attendance.exists && attendance.get("status") === "trained") continue;

      const title = device.sessionTitles?.[clock.dayKey];
      const lead = device.leadMinutes ?? 0;
      try {
        await messaging.send({
          token: device.token,
          data: {
            title: title
              ? lead > 0
                ? `${title} in ${lead} minutes`
                : `Time to train — ${title}`
              : "Time to train",
            body: "Your session is scheduled. Tap to start.",
            tag: stamp,
            url: "/train",
          },
          webpush: { headers: { Urgency: "high", TTL: String(60 * 60) } },
        });
        await (snap.ref as DocumentReference).update({ lastSentStamp: stamp });
        sent++;
      } catch (err) {
        const code = (err as { code?: string }).code ?? "";
        // The browser unsubscribed or the token expired — stop trying it.
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          await snap.ref.delete();
        } else {
          logger.warn("Reminder send failed", { uid: device.uid, code });
        }
      }
    }

    logger.info(`Reminder run complete: ${sent} sent of ${devices.size} devices checked`);
  },
);
