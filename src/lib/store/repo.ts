/* ============================================================================
 * Persistence layer.
 *
 * One interface, two adapters:
 *   • LocalRepo    — localStorage. Zero setup, works offline, per-browser.
 *   • FirebaseRepo — Firestore. Shared across devices and with your team.
 *
 * The rest of the app never knows which one is in play.
 * ========================================================================= */

import type { AppData, Team } from "@/lib/types";
import { firebaseEnabled, getDb } from "@/lib/firebase/config";
import { emptyAppData, hydrate } from "./defaults";

export interface Repo {
  readonly kind: "local" | "firebase";
  load(uid: string, fallback: AppData): Promise<AppData>;
  /** Persist the whole payload. Adapters decide how to shard it. */
  save(uid: string, data: AppData): Promise<void>;

  loadTeam(teamId: string): Promise<Team | null>;
  saveTeam(team: Team): Promise<void>;
  findTeamByCode(code: string): Promise<Team | null>;
  listTeamsForUser(uid: string): Promise<Team[]>;
}

/* --------------------------------------------------------------- local -- */

const KEY = (uid: string) => `ironpulse:data:${uid}`;
const TEAMS_KEY = "ironpulse:teams";

function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    // Quota exceeded is realistic once progress photos pile up.
    console.warn("IronPulse: could not persist to localStorage", err);
  }
}

class LocalRepo implements Repo {
  readonly kind = "local" as const;

  async load(uid: string, fallback: AppData): Promise<AppData> {
    return hydrate(readJSON<Partial<AppData>>(KEY(uid)), fallback);
  }

  async save(uid: string, data: AppData): Promise<void> {
    writeJSON(KEY(uid), data);
  }

  private teams(): Record<string, Team> {
    return readJSON<Record<string, Team>>(TEAMS_KEY) ?? {};
  }

  async loadTeam(teamId: string): Promise<Team | null> {
    return this.teams()[teamId] ?? null;
  }

  async saveTeam(team: Team): Promise<void> {
    const all = this.teams();
    all[team.id] = team;
    writeJSON(TEAMS_KEY, all);
  }

  async findTeamByCode(code: string): Promise<Team | null> {
    const wanted = code.trim().toUpperCase();
    return (
      Object.values(this.teams()).find((t) => t.code.toUpperCase() === wanted) ?? null
    );
  }

  async listTeamsForUser(uid: string): Promise<Team[]> {
    return Object.values(this.teams()).filter((t) =>
      t.members.some((m) => m.uid === uid),
    );
  }
}

/* ------------------------------------------------------------ firebase -- */

class FirebaseRepo implements Repo {
  readonly kind = "firebase" as const;

  async load(uid: string, fallback: AppData): Promise<AppData> {
    const db = getDb();
    if (!db) return fallback;
    const { doc, getDoc, collection, getDocs } = await import("firebase/firestore");

    const rootSnap = await getDoc(doc(db, "users", uid));
    const root = rootSnap.exists() ? (rootSnap.data() as Partial<AppData>) : null;

    const sub = async <T,>(name: string): Promise<T[]> => {
      const snap = await getDocs(collection(db, "users", uid, name));
      return snap.docs.map((d) => d.data() as T);
    };

    const [sessions, attendance, metrics, photos, nutrition, coachThread] =
      await Promise.all([
        sub<AppData["sessions"][number]>("sessions"),
        sub<AppData["attendance"][number]>("attendance"),
        sub<AppData["metrics"][number]>("metrics"),
        sub<AppData["photos"][number]>("photos"),
        sub<AppData["nutrition"][number]>("nutrition"),
        sub<AppData["coachThread"][number]>("coach"),
      ]);

    return hydrate(
      {
        ...root,
        sessions: sessions.sort((a, b) => (a.date < b.date ? 1 : -1)),
        attendance,
        metrics: metrics.sort((a, b) => (a.date < b.date ? 1 : -1)),
        photos,
        nutrition,
        coachThread: coachThread.sort((a, b) => a.createdAt - b.createdAt),
      },
      fallback,
    );
  }

  async save(uid: string, data: AppData): Promise<void> {
    const db = getDb();
    if (!db) return;
    const { doc, setDoc, writeBatch } = await import("firebase/firestore");

    // Root document holds the small, always-loaded state.
    await setDoc(
      doc(db, "users", uid),
      {
        profile: data.profile,
        settings: data.settings,
        gamification: data.gamification,
        streak: data.streak,
        favorites: data.favorites,
        exerciseVideos: data.exerciseVideos,
        teamId: data.teamId ?? null,
        updatedAt: Date.now(),
      },
      { merge: true },
    );

    // Collections are written in batches of 400 (Firestore caps at 500 ops).
    const batchWrite = async (
      name: string,
      rows: { id?: string; date?: string }[],
    ) => {
      for (let i = 0; i < rows.length; i += 400) {
        const batch = writeBatch(db);
        for (const row of rows.slice(i, i + 400)) {
          const id = row.id ?? row.date;
          if (!id) continue;
          batch.set(doc(db, "users", uid, name, id), row, { merge: true });
        }
        await batch.commit();
      }
    };

    await Promise.all([
      batchWrite("sessions", data.sessions),
      batchWrite("attendance", data.attendance),
      batchWrite("metrics", data.metrics),
      batchWrite("photos", data.photos),
      batchWrite("nutrition", data.nutrition),
      batchWrite("coach", data.coachThread.slice(-100)),
    ]);
  }

  async loadTeam(teamId: string): Promise<Team | null> {
    const db = getDb();
    if (!db) return null;
    const { doc, getDoc } = await import("firebase/firestore");
    const snap = await getDoc(doc(db, "teams", teamId));
    return snap.exists() ? (snap.data() as Team) : null;
  }

  async saveTeam(team: Team): Promise<void> {
    const db = getDb();
    if (!db) return;
    const { doc, setDoc } = await import("firebase/firestore");
    // `memberUids` is a denormalised index so a member can query their teams.
    await setDoc(
      doc(db, "teams", team.id),
      { ...team, memberUids: team.members.map((m) => m.uid) },
      { merge: true },
    );
  }

  async findTeamByCode(code: string): Promise<Team | null> {
    const db = getDb();
    if (!db) return null;
    const { collection, getDocs, limit, query, where } = await import("firebase/firestore");
    const q = query(
      collection(db, "teams"),
      where("code", "==", code.trim().toUpperCase()),
      limit(1),
    );
    const snap = await getDocs(q);
    return snap.empty ? null : (snap.docs[0].data() as Team);
  }

  async listTeamsForUser(uid: string): Promise<Team[]> {
    const db = getDb();
    if (!db) return [];
    const { collection, getDocs, query, where } = await import("firebase/firestore");
    const q = query(collection(db, "teams"), where("memberUids", "array-contains", uid));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Team);
  }
}

/* --------------------------------------------------------------- pick --- */

let cached: Repo | null = null;

export function getRepo(): Repo {
  if (cached) return cached;
  cached = firebaseEnabled ? new FirebaseRepo() : new LocalRepo();
  return cached;
}

export { emptyAppData };
