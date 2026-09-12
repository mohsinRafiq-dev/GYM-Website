/* ============================================================================
 * Persistence layer.
 *
 * One interface, two adapters:
 *   • LocalRepo    — localStorage. Zero setup, works offline, per-browser.
 *   • FirebaseRepo — Firestore. Shared across devices and with your team.
 *
 * The rest of the app never knows which one is in play.
 * ========================================================================= */

import type { AppData, DayKey, Team } from "@/lib/types";
import { firebaseEnabled, getDb } from "@/lib/firebase/config";
import { emptyAppData, hydrate } from "./defaults";

/** A browser registered for push reminders. */
export interface PushDevice {
  token: string;
  platform: string;
  timezone: string;
  reminders: Partial<Record<DayKey, string | null>>;
  leadMinutes: number;
  /** Session title per day, so the server can write a useful notification. */
  sessionTitles: Record<DayKey, string | null>;
  updatedAt: number;
}

export interface Repo {
  readonly kind: "local" | "firebase";
  load(uid: string, fallback: AppData): Promise<AppData>;
  /** Persist the whole payload. Adapters decide how to shard it. */
  save(uid: string, data: AppData): Promise<void>;

  loadTeam(teamId: string): Promise<Team | null>;
  /** Create or overwrite a team. Use only for brand-new teams. */
  saveTeam(team: Team): Promise<void>;
  /**
   * Read-modify-write a team atomically, so two members acting at the same
   * moment can't overwrite each other. Return `null` from `mutate` to abort.
   */
  updateTeam(teamId: string, mutate: (team: Team) => Team | null): Promise<Team | null>;
  deleteTeam(teamId: string): Promise<void>;
  /** Live updates for one team. Returns an unsubscribe function. */
  subscribeTeam(teamId: string, onChange: (team: Team | null) => void): () => void;
  findTeamByCode(code: string): Promise<Team | null>;

  saveDevice(uid: string, device: PushDevice): Promise<void>;
  removeDevice(uid: string, token: string): Promise<void>;
}

/* --------------------------------------------------------------- local -- */

const KEY = (uid: string) => `ironpulse:data:${uid}`;
const TEAMS_KEY = "ironpulse:teams";
const TEAMS_EVENT = "ironpulse:teams-changed";

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
    throw new Error("Browser storage is full. Delete some progress photos or configure Firebase.");
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

  private writeTeams(all: Record<string, Team>) {
    writeJSON(TEAMS_KEY, all);
    // `storage` events only reach *other* tabs; tell this tab too.
    window.dispatchEvent(new Event(TEAMS_EVENT));
  }

  async loadTeam(teamId: string): Promise<Team | null> {
    return this.teams()[teamId] ?? null;
  }

  async saveTeam(team: Team): Promise<void> {
    const all = this.teams();
    all[team.id] = team;
    this.writeTeams(all);
  }

  async updateTeam(teamId: string, mutate: (team: Team) => Team | null): Promise<Team | null> {
    // localStorage is synchronous, so read-modify-write here is already atomic
    // within a tab. Across tabs the last writer wins, which is acceptable for
    // a mode that exists for trying the app out.
    const all = this.teams();
    const current = all[teamId];
    if (!current) return null;
    const next = mutate(current);
    if (!next) return current;
    all[teamId] = next;
    this.writeTeams(all);
    return next;
  }

  async deleteTeam(teamId: string): Promise<void> {
    const all = this.teams();
    delete all[teamId];
    this.writeTeams(all);
  }

  subscribeTeam(teamId: string, onChange: (team: Team | null) => void): () => void {
    const emit = () => onChange(this.teams()[teamId] ?? null);
    const onStorage = (e: StorageEvent) => {
      if (e.key === TEAMS_KEY) emit();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(TEAMS_EVENT, emit);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(TEAMS_EVENT, emit);
    };
  }

  async findTeamByCode(code: string): Promise<Team | null> {
    const wanted = code.trim().toUpperCase();
    return (
      Object.values(this.teams()).find((t) => t.code.toUpperCase() === wanted) ?? null
    );
  }

  // Push delivery needs Firebase; local mode has no server to send from.
  async saveDevice(): Promise<void> {}
  async removeDevice(): Promise<void> {}
}

/* ------------------------------------------------------------ firebase -- */

/** Sub-collections under users/{uid}, with the AppData field each maps to. */
const COLLECTIONS = [
  ["sessions", "sessions"],
  ["attendance", "attendance"],
  ["metrics", "metrics"],
  ["photos", "photos"],
  ["nutrition", "nutrition"],
  ["coach", "coachThread"],
  ["formChecks", "formChecks"],
] as const;

type Row = { id?: string; date?: string };
const rowId = (row: Row) => row.id ?? row.date;

class FirebaseRepo implements Repo {
  readonly kind = "firebase" as const;

  /**
   * What was last read from or written to Firestore, per user: document key →
   * serialised content. Saves write only rows that changed and delete rows
   * that disappeared, instead of rewriting the whole history every time.
   */
  private written = new Map<string, Map<string, string>>();

  async load(uid: string, fallback: AppData): Promise<AppData> {
    const db = getDb();
    if (!db) return fallback;
    const { doc, getDoc, collection, getDocs } = await import("firebase/firestore");

    const rootSnap = await getDoc(doc(db, "users", uid));
    const root = rootSnap.exists() ? (rootSnap.data() as Partial<AppData>) : null;

    const seen = new Map<string, string>();
    const sub = async <T extends Row>(name: string): Promise<T[]> => {
      const snap = await getDocs(collection(db, "users", uid, name));
      return snap.docs.map((d) => {
        const row = d.data() as T;
        seen.set(`${name}/${d.id}`, JSON.stringify(row));
        return row;
      });
    };

    const [sessions, attendance, metrics, photos, nutrition, coachThread, formChecks] =
      await Promise.all(COLLECTIONS.map(([name]) => sub(name)));

    if (root) seen.set("__root", JSON.stringify(rootFields(root as AppData)));
    this.written.set(uid, seen);

    return hydrate(
      {
        ...root,
        sessions: sessions as AppData["sessions"],
        attendance: attendance as AppData["attendance"],
        metrics: metrics as AppData["metrics"],
        photos: photos as AppData["photos"],
        nutrition: nutrition as AppData["nutrition"],
        coachThread: (coachThread as AppData["coachThread"]).sort(
          (a, b) => a.createdAt - b.createdAt,
        ),
        formChecks: formChecks as AppData["formChecks"],
      },
      fallback,
    );
  }

  async save(uid: string, data: AppData): Promise<void> {
    const db = getDb();
    if (!db) return;
    const { doc, writeBatch } = await import("firebase/firestore");

    const previous = this.written.get(uid) ?? new Map<string, string>();
    const next = new Map<string, string>();
    const ops: ({ kind: "set"; path: string[]; value: unknown } | { kind: "delete"; path: string[] })[] = [];

    const root = rootFields(data);
    const rootJson = JSON.stringify(root);
    next.set("__root", rootJson);
    if (previous.get("__root") !== rootJson) {
      ops.push({ kind: "set", path: ["users", uid], value: { ...root, updatedAt: Date.now() } });
    }

    for (const [name, field] of COLLECTIONS) {
      const rows = (field === "coachThread" ? data.coachThread.slice(-100) : data[field]) as Row[];
      for (const row of rows) {
        const id = rowId(row);
        if (!id) continue;
        const key = `${name}/${id}`;
        const json = JSON.stringify(row);
        next.set(key, json);
        if (previous.get(key) !== json) {
          ops.push({ kind: "set", path: ["users", uid, name, id], value: row });
        }
      }
    }

    for (const key of previous.keys()) {
      if (key === "__root" || next.has(key)) continue;
      const [name, id] = key.split("/");
      ops.push({ kind: "delete", path: ["users", uid, name, id] });
    }

    // Firestore caps a batch at 500 operations.
    for (let i = 0; i < ops.length; i += 450) {
      const batch = writeBatch(db);
      for (const op of ops.slice(i, i + 450)) {
        const [first, ...rest] = op.path;
        const ref = doc(db, first, ...rest);
        if (op.kind === "set") batch.set(ref, op.value as object);
        else batch.delete(ref);
      }
      await batch.commit();
    }

    this.written.set(uid, next);
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
    await setDoc(doc(db, "teams", team.id), withIndex(team));
  }

  async updateTeam(teamId: string, mutate: (team: Team) => Team | null): Promise<Team | null> {
    const db = getDb();
    if (!db) return null;
    const { doc, runTransaction } = await import("firebase/firestore");
    const ref = doc(db, "teams", teamId);
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return null;
      const current = snap.data() as Team;
      const next = mutate(current);
      if (!next) return current;
      tx.set(ref, withIndex(next));
      return next;
    });
  }

  async deleteTeam(teamId: string): Promise<void> {
    const db = getDb();
    if (!db) return;
    const { doc, deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "teams", teamId));
  }

  subscribeTeam(teamId: string, onChange: (team: Team | null) => void): () => void {
    const db = getDb();
    if (!db) return () => undefined;
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    void import("firebase/firestore").then(({ doc, onSnapshot }) => {
      if (cancelled) return;
      unsubscribe = onSnapshot(
        doc(db, "teams", teamId),
        (snap) => onChange(snap.exists() ? (snap.data() as Team) : null),
        (err) => console.warn("IronPulse: team subscription failed", err),
      );
    });
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
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

  async saveDevice(uid: string, device: PushDevice): Promise<void> {
    const db = getDb();
    if (!db) return;
    const { doc, setDoc } = await import("firebase/firestore");
    await setDoc(doc(db, "users", uid, "devices", device.token), { ...device, uid });
  }

  async removeDevice(uid: string, token: string): Promise<void> {
    const db = getDb();
    if (!db) return;
    const { doc, deleteDoc } = await import("firebase/firestore");
    await deleteDoc(doc(db, "users", uid, "devices", token));
  }
}

/** The small, always-loaded state stored on the users/{uid} document. */
function rootFields(data: AppData) {
  return {
    profile: data.profile,
    settings: data.settings,
    gamification: data.gamification,
    streak: data.streak,
    favorites: data.favorites,
    exerciseVideos: data.exerciseVideos,
    teamId: data.teamId ?? null,
  };
}

/** `memberUids` is a denormalised index so rules can check membership cheaply. */
function withIndex(team: Team) {
  return { ...team, memberUids: team.members.map((m) => m.uid) };
}

/* --------------------------------------------------------------- pick --- */

let cached: Repo | null = null;

export function getRepo(): Repo {
  if (cached) return cached;
  cached = firebaseEnabled ? new FirebaseRepo() : new LocalRepo();
  return cached;
}

export { emptyAppData };
