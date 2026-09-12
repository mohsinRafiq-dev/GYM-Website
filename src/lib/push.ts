/* ============================================================================
 * Push reminders via Firebase Cloud Messaging.
 *
 * The browser registers a dedicated service worker and receives an FCM token.
 * The data provider stores that token with the user's reminder schedule, and
 * the scheduled Cloud Function in /functions sends the notification — which is
 * what makes reminders arrive when IronPulse isn't open.
 * ========================================================================= */

import { firebaseEnabled, getFirebaseApp } from "@/lib/firebase/config";

const TOKEN_KEY = "ironpulse:push-token";
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

/** Firebase plus a VAPID key are both needed for web push. */
export const pushConfigured = firebaseEnabled && Boolean(VAPID_KEY);

export function readPushToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

async function messagingRegistration(): Promise<ServiceWorkerRegistration> {
  // A separate scope keeps FCM's worker from competing with the offline
  // worker registered at "/".
  return navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/firebase-cloud-messaging-push-scope",
  });
}

/** Ask for permission, register the worker and return this browser's FCM token. */
export async function enablePush(): Promise<string> {
  if (!pushConfigured) {
    throw new Error(
      "Push reminders need Firebase plus NEXT_PUBLIC_FIREBASE_VAPID_KEY in .env.local. See the README.",
    );
  }
  if (!("serviceWorker" in navigator) || typeof Notification === "undefined") {
    throw new Error("This browser doesn't support push notifications.");
  }
  const { isSupported, getMessaging, getToken } = await import("firebase/messaging");
  if (!(await isSupported())) {
    throw new Error("This browser doesn't support push notifications.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Notification permission was denied. Allow it in your browser settings.");
  }

  const app = getFirebaseApp();
  if (!app) throw new Error("Firebase is not configured.");

  const token = await getToken(getMessaging(app), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: await messagingRegistration(),
  });
  if (!token) throw new Error("Could not get a push token from Firebase.");

  window.localStorage.setItem(TOKEN_KEY, token);
  return token;
}

/** Stop push for this browser. Returns the token that was removed, if any. */
export async function disablePush(): Promise<string | null> {
  const token = readPushToken();
  window.localStorage.removeItem(TOKEN_KEY);
  if (!pushConfigured || !token) return token;
  try {
    const { getMessaging, deleteToken } = await import("firebase/messaging");
    const app = getFirebaseApp();
    if (app) await deleteToken(getMessaging(app));
  } catch (err) {
    console.warn("IronPulse: could not delete push token", err);
  }
  return token;
}
