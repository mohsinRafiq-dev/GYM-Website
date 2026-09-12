import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Firebase is optional. With no env vars the app runs entirely on the local
 * adapter, which means it works the moment you clone it — you add Firebase
 * when you want the crew to share data across devices.
 */
export const firebaseEnabled = Boolean(
  config.apiKey && config.projectId && config.appId,
);

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;

function ensureApp(): FirebaseApp | undefined {
  if (!firebaseEnabled) return undefined;
  if (!app) {
    app = getApps().length
      ? getApps()[0]
      : initializeApp(config as Required<typeof config>);
  }
  return app;
}

export function getFirebaseAuth(): Auth | undefined {
  const a = ensureApp();
  if (!a) return undefined;
  authInstance ??= getAuth(a);
  return authInstance;
}

export function getDb(): Firestore | undefined {
  const a = ensureApp();
  if (!a) return undefined;
  dbInstance ??= getFirestore(a);
  return dbInstance;
}

export function getBucket(): FirebaseStorage | undefined {
  const a = ensureApp();
  if (!a) return undefined;
  storageInstance ??= getStorage(a);
  return storageInstance;
}
