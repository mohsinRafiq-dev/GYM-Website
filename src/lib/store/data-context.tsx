"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type {
  AppData,
  AttendanceRecord,
  AttendanceStatus,
  BodyMetric,
  CoachMessage,
  DayKey,
  FormCheck,
  NutritionLog,
  ProgressPhoto,
  Program,
  Team,
  TeamChallenge,
  TeamMember,
  TeamPost,
  TeamRole,
  UserProfile,
  UserSettings,
  WorkoutSession,
} from "@/lib/types";
import { computeStreak, levelFromXP, totalVolume } from "@/lib/fitness";
import { evaluateBadges, getBadge } from "@/lib/data/badges";
import {
  DEFAULT_PROGRAM_ID,
  getProgram,
  isCustomProgram,
  normaliseProgram,
  registerCustomPrograms,
} from "@/lib/data/programs";
import { summariseSession } from "@/lib/session-utils";
import { blobToDataURL, compressImage } from "@/lib/image";
import { deleteUserFile, uploadUserFile } from "@/lib/firebase/storage";
import { readPushToken } from "@/lib/push";
import { getRepo } from "./repo";
import { emptyAppData, defaultProfile, hydrate } from "./defaults";
import { buildDemoData } from "./seed";
import { useAuth } from "./auth-context";
import { DAY_KEYS } from "@/lib/types";
import { dayKeyOf, joinCode, toISODate, uid as makeId, weekRange } from "@/lib/utils";

interface DataContextValue {
  data: AppData | null;
  team: Team | null;
  loading: boolean;
  storage: "local" | "firebase";
  /** True when the signed-in user is the team owner or a coach. */
  canCoach: boolean;

  update(patch: Partial<AppData>): void;
  updateProfile(patch: Partial<UserProfile>): void;
  updateSettings(patch: Partial<UserSettings>): void;

  saveSession(session: WorkoutSession): WorkoutSession;
  deleteSession(id: string): void;

  checkIn(status: AttendanceStatus, opts?: Partial<AttendanceRecord>): void;
  undoCheckIn(date: string): void;

  addMetric(metric: Omit<BodyMetric, "id">): void;
  deleteMetric(id: string): void;
  /** Merge imported measurements by date. Returns how many dates changed. */
  importMetrics(rows: Omit<BodyMetric, "id">[]): number;

  addPhoto(input: {
    date: string;
    pose: ProgressPhoto["pose"];
    file: Blob;
    note?: string;
  }): Promise<void>;
  deletePhoto(id: string): Promise<void>;

  logNutrition(date: string, patch: Partial<NutritionLog>): void;

  toggleFavorite(exerciseId: string): void;
  setExerciseVideo(exerciseId: string, url: string): void;

  appendCoach(messages: CoachMessage[]): void;
  clearCoach(): void;

  saveFormCheck(check: Omit<FormCheck, "id" | "createdAt">): FormCheck;
  updateFormCheck(id: string, patch: Partial<FormCheck>): void;
  deleteFormCheck(id: string): void;

  createTeam(input: {
    name: string;
    motto: string;
    rules: string[];
    terms: string;
    weeklyTarget: number;
    maxMembers: number;
    privacy: "invite-only" | "open";
  }): Promise<Team>;
  joinTeam(code: string): Promise<Team>;
  leaveTeam(): Promise<void>;
  acceptTeamTerms(): Promise<void>;
  postToTeam(body: string, kind?: TeamPost["kind"]): Promise<void>;
  setTeamChallenge(challenge: Omit<TeamChallenge, "id" | "createdBy">): Promise<void>;
  updateMemberRole(memberUid: string, role: TeamRole): Promise<void>;
  removeMember(memberUid: string): Promise<void>;

  saveCustomProgram(program: Program): Promise<Program>;
  deleteCustomProgram(programId: string): Promise<void>;
  assignProgram(memberUid: string, programId: string | null, note?: string): Promise<void>;
  /** Switch to the programme a coach assigned to me. */
  acceptAssignment(): void;

  exportData(): string;
  /** Replace this account's data with a previously exported backup. */
  restoreBackup(json: string): { sessions: number; metrics: number };
  resetData(): void;
}

const DataContext = createContext<DataContextValue | null>(null);

const byDateDesc = (a: { date: string }, b: { date: string }) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : 0;

/**
 * Everything computed from the raw logs — streak, badges, XP and level — as a
 * pure function. React may call state updaters twice, so nothing here reads
 * refs or causes side effects.
 */
function derive(next: AppData): AppData {
  const streak = computeStreak(next.attendance, {
    restAllowance: next.settings.streakRestAllowance,
    freezesAvailable: next.streak.freezesAvailable,
  });
  const withStreak: AppData = { ...next, streak };

  const owned = new Set(next.gamification.badges.map((b) => b.badgeId));
  const fresh = evaluateBadges(withStreak).filter((id) => !owned.has(id));
  const now = Date.now();
  const badges = fresh.length
    ? [...next.gamification.badges, ...fresh.map((badgeId) => ({ badgeId, earnedAt: now }))]
    : next.gamification.badges;

  // XP is every session's reward plus the one-off reward of each badge.
  const xp =
    next.sessions.reduce((n, s) => n + (s.xpEarned ?? 0), 0) +
    badges.reduce((n, b) => n + (getBadge(b.badgeId)?.xp ?? 0), 0);

  return {
    ...withStreak,
    // Screens read "most recent first" straight off these lists, so the store
    // guarantees the order no matter how the data was written or loaded.
    sessions: [...next.sessions].sort(byDateDesc),
    metrics: [...next.metrics].sort(byDateDesc),
    gamification: { ...next.gamification, badges, xp, level: levelFromXP(xp).level },
  };
}

/** What a member shares on the leaderboard — nothing if they opted out. */
function memberStats(d: AppData): TeamMember["stats"] {
  if (!d.settings.shareStatsWithTeam) {
    return {
      currentStreak: 0,
      sessionsThisWeek: 0,
      sessionsTotal: 0,
      volumeThisWeekKg: 0,
      xp: 0,
      level: d.gamification.level,
      lastActive: Date.now(),
    };
  }
  const { start } = weekRange();
  const weekSessions = d.sessions.filter((s) => s.completed && s.date >= toISODate(start));
  return {
    currentStreak: d.streak.current,
    sessionsThisWeek: weekSessions.length,
    sessionsTotal: d.sessions.filter((s) => s.completed).length,
    volumeThisWeekKg: Math.round(totalVolume(weekSessions)),
    xp: d.gamification.xp,
    level: d.gamification.level,
    lastActive: Date.now(),
  };
}

function memberRecord(d: AppData, role: TeamRole): TeamMember {
  return {
    uid: d.profile.uid,
    displayName: d.profile.displayName,
    photoURL: d.profile.photoURL,
    handle: d.profile.handle,
    role,
    joinedAt: Date.now(),
    private: !d.settings.shareStatsWithTeam,
    stats: memberStats(d),
  };
}

const roleOf = (team: Team, uid: string) => team.members.find((m) => m.uid === uid)?.role;
const isCoachRole = (role: TeamRole | undefined) => role === "owner" || role === "coach";

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<AppData | null>(null);
  const [team, setTeamState] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const repo = useMemo(() => getRepo(), []);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const knownBadges = useRef<Set<string>>(new Set());
  /** The last payload known to match storage — saving it again is a no-op. */
  const lastSynced = useRef<AppData | null>(null);

  /**
   * Custom programmes must be registered before anything renders with the
   * team, so every getProgram() call during that render resolves them.
   */
  const applyTeam = useCallback((next: Team | null) => {
    registerCustomPrograms(next?.customPrograms);
    setTeamState(next);
  }, []);

  /* ------------------------------------------------------------- load --- */

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      // Signing out clears the cache — this effect *is* the sync boundary
      // between the auth provider and the persisted store.
      /* eslint-disable react-hooks/set-state-in-effect */
      setData(null);
      applyTeam(null);
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    setLoading(true);
    (async () => {
      const fallback = emptyAppData(defaultProfile(user.uid, user.email, user.displayName));
      let loaded = await repo.load(user.uid, fallback);

      // First visit on the demo account gets eight weeks of history.
      if (user.uid === "demo-user" && loaded.sessions.length === 0) {
        loaded = buildDemoData(loaded);
        await repo.save(user.uid, loaded);
      }

      // Keep identity in sync with the auth provider.
      loaded.profile = {
        ...loaded.profile,
        uid: user.uid,
        email: user.email || loaded.profile.email,
        displayName: loaded.profile.displayName || user.displayName,
        photoURL: user.photoURL ?? loaded.profile.photoURL,
      };

      // Load the team first: a coach-assigned programme id only resolves once
      // the team's programmes are registered.
      const loadedTeam = loaded.teamId ? await repo.loadTeam(loaded.teamId) : null;

      // Re-derive on load so stored data always reflects the current rules.
      // Seeding knownBadges afterwards keeps anything newly qualified silent.
      loaded = derive(loaded);
      knownBadges.current = new Set(loaded.gamification.badges.map((b) => b.badgeId));

      if (cancelled) return;
      applyTeam(loadedTeam);
      lastSynced.current = loaded;
      setData(loaded);
      setLoading(false);
    })().catch((err) => {
      console.error("IronPulse: load failed", err);
      if (!cancelled) {
        toast.error("Could not load your data. Check your connection and refresh.");
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user, repo, applyTeam]);

  /* ------------------------------------------------------------- save --- */

  /**
   * Every mutation runs through here. The updater is a pure function of the
   * previous state — React may call it twice in Strict Mode — so it only
   * derives streak, XP, level and badges. Saving and announcing happen in the
   * effects below, once per committed state.
   */
  const commit = useCallback((mutate: (current: AppData) => AppData) => {
    setData((current) => (current ? derive(mutate(current)) : current));
  }, []);

  /** Debounced write whenever committed data changes (but not on first load). */
  useEffect(() => {
    if (!user || !data || data === lastSynced.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const snapshot = data;
    saveTimer.current = setTimeout(() => {
      lastSynced.current = snapshot;
      repo.save(user.uid, snapshot).catch((err: unknown) => {
        console.error("IronPulse: save failed", err);
        toast.error(err instanceof Error ? err.message : "Could not save your latest changes.");
      });
    }, 400);
  }, [data, user, repo]);

  /** Flush a pending write if the tab closes mid-debounce. */
  useEffect(() => {
    const flush = () => {
      if (saveTimer.current && user && data && data !== lastSynced.current) {
        clearTimeout(saveTimer.current);
        lastSynced.current = data;
        void repo.save(user.uid, data);
      }
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [data, user, repo]);

  /** Announce badges that appeared since the last committed state. */
  useEffect(() => {
    if (!data) return;
    for (const { badgeId } of data.gamification.badges) {
      if (knownBadges.current.has(badgeId)) continue;
      knownBadges.current.add(badgeId);
      const badge = getBadge(badgeId);
      if (badge) {
        toast.success(`Badge unlocked — ${badge.name}`, { description: badge.description });
      }
    }
  }, [data]);

  /* --------------------------------------------------------- mutators --- */

  const update = useCallback(
    (patch: Partial<AppData>) => commit((d) => ({ ...d, ...patch })),
    [commit],
  );

  const updateProfile = useCallback(
    (patch: Partial<UserProfile>) =>
      commit((d) => ({ ...d, profile: { ...d.profile, ...patch } })),
    [commit],
  );

  const updateSettings = useCallback(
    (patch: Partial<UserSettings>) =>
      commit((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
    [commit],
  );

  const saveSession = useCallback(
    (session: WorkoutSession) => {
      // Summarise once, outside the updater: React may defer or repeat the
      // updater, so a value assigned inside it can't be returned reliably.
      const summarised = data
        ? summariseSession(session, data.sessions, data.streak.current)
        : session;
      commit((d) => {
        const sessions = [summarised, ...d.sessions.filter((s) => s.id !== summarised.id)];

        // Completing a session automatically marks attendance.
        const attendance = summarised.completed
          ? [
              {
                date: summarised.date,
                uid: d.profile.uid,
                status: "trained" as AttendanceStatus,
                dayKey: summarised.dayKey,
                sessionId: summarised.id,
                checkInAt: summarised.startedAt,
                location: "gym" as const,
              },
              ...d.attendance.filter((a) => a.date !== summarised.date),
            ]
          : d.attendance;

        return { ...d, sessions, attendance };
      });
      return summarised;
    },
    [commit, data],
  );

  const deleteSession = useCallback(
    (id: string) =>
      commit((d) => ({
        ...d,
        sessions: d.sessions.filter((s) => s.id !== id),
        attendance: d.attendance.filter((a) => a.sessionId !== id),
      })),
    [commit],
  );

  const checkIn = useCallback(
    (status: AttendanceStatus, opts: Partial<AttendanceRecord> = {}) =>
      commit((d) => {
        const date = opts.date ?? toISODate();
        const record: AttendanceRecord = {
          date,
          uid: d.profile.uid,
          status,
          dayKey: opts.dayKey ?? dayKeyOf(date),
          checkInAt: Date.now(),
          ...opts,
        };
        return {
          ...d,
          attendance: [record, ...d.attendance.filter((a) => a.date !== date)],
        };
      }),
    [commit],
  );

  const undoCheckIn = useCallback(
    (date: string) =>
      commit((d) => ({ ...d, attendance: d.attendance.filter((a) => a.date !== date) })),
    [commit],
  );

  const addMetric = useCallback(
    (metric: Omit<BodyMetric, "id">) =>
      commit((d) => ({
        ...d,
        metrics: [
          { ...metric, id: makeId("m") },
          ...d.metrics.filter((m) => m.date !== metric.date),
        ],
      })),
    [commit],
  );

  const deleteMetric = useCallback(
    (id: string) => commit((d) => ({ ...d, metrics: d.metrics.filter((m) => m.id !== id) })),
    [commit],
  );

  const importMetrics = useCallback(
    (rows: Omit<BodyMetric, "id">[]) => {
      const byDate = new Map<string, Omit<BodyMetric, "id">>();
      for (const row of rows) byDate.set(row.date, { ...byDate.get(row.date), ...row });
      commit((d) => {
        const existing = new Map(d.metrics.map((m) => [m.date, m]));
        for (const [date, row] of byDate) {
          const current = existing.get(date);
          // Imported fields fill in or overwrite; fields the file lacks are kept.
          const merged: BodyMetric = { ...current, ...row, id: current?.id ?? makeId("m") };
          for (const key of Object.keys(merged) as (keyof BodyMetric)[]) {
            if (merged[key] === undefined) delete merged[key];
          }
          existing.set(date, merged);
        }
        return { ...d, metrics: [...existing.values()] };
      });
      return byDate.size;
    },
    [commit],
  );

  const addPhoto = useCallback<DataContextValue["addPhoto"]>(
    async ({ date, pose, file, note }) => {
      if (!user) throw new Error("Not signed in");
      const id = makeId("ph");
      const compressed = await compressImage(file);
      let url: string;
      let storagePath: string | undefined;
      if (repo.kind === "firebase") {
        ({ url, storagePath } = await uploadUserFile(user.uid, `photos/${id}.jpg`, compressed));
      } else {
        url = await blobToDataURL(compressed);
      }
      commit((d) => ({
        ...d,
        photos: [{ id, date, pose, url, storagePath, note }, ...d.photos],
      }));
    },
    [user, repo.kind, commit],
  );

  const deletePhoto = useCallback<DataContextValue["deletePhoto"]>(
    async (id) => {
      const photo = data?.photos.find((p) => p.id === id);
      commit((d) => ({ ...d, photos: d.photos.filter((p) => p.id !== id) }));
      if (photo?.storagePath) {
        await deleteUserFile(photo.storagePath).catch((err) =>
          console.warn("IronPulse: could not delete photo file", err),
        );
      }
    },
    [data, commit],
  );

  const logNutrition = useCallback(
    (date: string, patch: Partial<NutritionLog>) =>
      commit((d) => {
        const existing = d.nutrition.find((n) => n.date === date);
        const merged: NutritionLog = {
          date,
          calories: 0,
          proteinG: 0,
          carbsG: 0,
          fatG: 0,
          waterMl: 0,
          entries: [],
          ...existing,
          ...patch,
        };
        return { ...d, nutrition: [merged, ...d.nutrition.filter((n) => n.date !== date)] };
      }),
    [commit],
  );

  const toggleFavorite = useCallback(
    (exerciseId: string) =>
      commit((d) => ({
        ...d,
        favorites: d.favorites.includes(exerciseId)
          ? d.favorites.filter((f) => f !== exerciseId)
          : [...d.favorites, exerciseId],
      })),
    [commit],
  );

  const setExerciseVideo = useCallback(
    (exerciseId: string, url: string) =>
      commit((d) => ({ ...d, exerciseVideos: { ...d.exerciseVideos, [exerciseId]: url } })),
    [commit],
  );

  const appendCoach = useCallback(
    (messages: CoachMessage[]) =>
      commit((d) => ({ ...d, coachThread: [...d.coachThread, ...messages].slice(-200) })),
    [commit],
  );

  const clearCoach = useCallback(() => commit((d) => ({ ...d, coachThread: [] })), [commit]);

  /* ------------------------------------------------------ form checks --- */

  const saveFormCheck = useCallback<DataContextValue["saveFormCheck"]>(
    (check) => {
      const saved: FormCheck = { ...check, id: makeId("fc"), createdAt: Date.now() };
      commit((d) => ({ ...d, formChecks: [saved, ...d.formChecks].slice(0, 60) }));
      return saved;
    },
    [commit],
  );

  const updateFormCheck = useCallback(
    (id: string, patch: Partial<FormCheck>) =>
      commit((d) => ({
        ...d,
        formChecks: d.formChecks.map((f) => (f.id === id ? { ...f, ...patch, id } : f)),
      })),
    [commit],
  );

  const deleteFormCheck = useCallback(
    (id: string) =>
      commit((d) => ({ ...d, formChecks: d.formChecks.filter((f) => f.id !== id) })),
    [commit],
  );

  /* ------------------------------------------------------------ teams --- */

  /** Live team updates — posts, roster changes and programmes from other members. */
  const teamId = data?.teamId;
  const myUid = data?.profile.uid;
  useEffect(() => {
    if (!teamId || !myUid) return;
    return repo.subscribeTeam(teamId, (next) => {
      if (next && next.members.some((m) => m.uid === myUid)) {
        applyTeam(next);
        return;
      }
      // Deleted, or the owner removed me.
      applyTeam(null);
      commit((d) => (d.teamId === teamId ? { ...d, teamId: undefined } : d));
      toast("You're no longer a member of that team.");
    });
  }, [repo, teamId, myUid, applyTeam, commit]);

  /**
   * Run a team mutation atomically against the latest stored version, then
   * show the result immediately (the subscription confirms it moments later).
   */
  const mutateTeam = useCallback(
    async (mutate: (current: Team) => Team | null) => {
      if (!team) throw new Error("You're not in a team.");
      const next = await repo.updateTeam(team.id, mutate);
      if (next) applyTeam(next);
      return next;
    },
    [team, repo, applyTeam],
  );

  const createTeam = useCallback<DataContextValue["createTeam"]>(
    async (input) => {
      if (!data) throw new Error("Not ready");
      const now = Date.now();
      const newTeam: Team = {
        id: makeId("team"),
        name: input.name,
        motto: input.motto,
        code: joinCode(),
        ownerUid: data.profile.uid,
        createdAt: now,
        maxMembers: input.maxMembers,
        rules: input.rules,
        terms: input.terms,
        programId: data.profile.programId,
        weeklyTarget: input.weeklyTarget,
        privacy: input.privacy,
        members: [{ ...memberRecord(data, "owner"), acceptedTermsAt: now }],
        posts: [
          {
            id: makeId("post"),
            uid: data.profile.uid,
            authorName: data.profile.displayName,
            body: `${input.name} is live. Rules are posted — read them, accept them, and let's get to work.`,
            kind: "announcement",
            createdAt: now,
            pinned: true,
          },
        ],
        customPrograms: [],
        assignments: {},
      };
      await repo.saveTeam(newTeam);
      applyTeam(newTeam);
      commit((d) => ({ ...d, teamId: newTeam.id }));
      return newTeam;
    },
    [data, repo, commit, applyTeam],
  );

  const joinTeam = useCallback<DataContextValue["joinTeam"]>(
    async (code) => {
      if (!data) throw new Error("Not ready");
      const found = await repo.findTeamByCode(code);
      if (!found) throw new Error("No team found with that code.");

      let full = false;
      const joined = await repo.updateTeam(found.id, (current) => {
        if (current.members.some((m) => m.uid === data.profile.uid)) return current;
        if (current.members.length >= current.maxMembers) {
          full = true;
          return null;
        }
        return {
          ...current,
          members: [...current.members, memberRecord(data, "member")],
          posts: [
            {
              id: makeId("post"),
              uid: data.profile.uid,
              authorName: data.profile.displayName,
              body: `${data.profile.displayName} joined the crew.`,
              kind: "checkin" as const,
              createdAt: Date.now(),
            },
            ...current.posts,
          ].slice(0, 200),
        };
      });
      if (full || !joined) throw new Error(`${found.name} is full (${found.maxMembers} members).`);
      applyTeam(joined);
      commit((d) => ({ ...d, teamId: joined.id }));
      return joined;
    },
    [data, repo, commit, applyTeam],
  );

  const leaveTeam = useCallback(async () => {
    if (!data || !team) return;
    const me = data.profile.uid;
    const next = await repo.updateTeam(team.id, (current) => {
      const remaining = current.members.filter((m) => m.uid !== me);
      if (remaining.length === 0) return null;
      // Hand ownership to a coach if there is one, otherwise the longest-standing member.
      const heir =
        remaining.find((m) => m.role === "coach") ??
        [...remaining].sort((a, b) => a.joinedAt - b.joinedAt)[0];
      const assignments = { ...current.assignments };
      delete assignments[me];
      return {
        ...current,
        members:
          current.ownerUid === me
            ? remaining.map((m) => (m.uid === heir.uid ? { ...m, role: "owner" as const } : m))
            : remaining,
        ownerUid: current.ownerUid === me ? heir.uid : current.ownerUid,
        assignments,
      };
    });
    // Nobody left: the team goes with its last member.
    if (next && !next.members.some((m) => m.uid !== me)) await repo.deleteTeam(team.id);
    else if (!next) await repo.deleteTeam(team.id);

    const wasOnTeamProgram = isCustomProgram(data.profile.programId);
    applyTeam(null);
    commit((d) => {
      if (!wasOnTeamProgram) return { ...d, teamId: undefined };
      // A team programme stops resolving once you leave, so fall back cleanly.
      const fallback = getProgram(DEFAULT_PROGRAM_ID);
      return {
        ...d,
        teamId: undefined,
        profile: {
          ...d.profile,
          programId: fallback.id,
          trainingDays: DAY_KEYS.filter((k) => fallback.days[k].type !== "rest"),
        },
      };
    });
  }, [data, team, repo, commit, applyTeam]);

  const acceptTeamTerms = useCallback(async () => {
    if (!data) return;
    await mutateTeam((current) => ({
      ...current,
      members: current.members.map((m) =>
        m.uid === data.profile.uid ? { ...m, acceptedTermsAt: Date.now() } : m,
      ),
    }));
  }, [data, mutateTeam]);

  const postToTeam = useCallback<DataContextValue["postToTeam"]>(
    async (body, kind = "cheer") => {
      if (!data) return;
      const post: TeamPost = {
        id: makeId("post"),
        uid: data.profile.uid,
        authorName: data.profile.displayName,
        authorPhoto: data.profile.photoURL,
        body,
        kind,
        createdAt: Date.now(),
      };
      await mutateTeam((current) => ({ ...current, posts: [post, ...current.posts].slice(0, 200) }));
    },
    [data, mutateTeam],
  );

  const setTeamChallenge = useCallback<DataContextValue["setTeamChallenge"]>(
    async (challenge) => {
      if (!data) return;
      await mutateTeam((current) =>
        isCoachRole(roleOf(current, data.profile.uid))
          ? { ...current, challenge: { ...challenge, id: makeId("ch"), createdBy: data.profile.uid } }
          : null,
      );
    },
    [data, mutateTeam],
  );

  const updateMemberRole = useCallback<DataContextValue["updateMemberRole"]>(
    async (memberUid, role) => {
      if (!data) return;
      await mutateTeam((current) =>
        current.ownerUid === data.profile.uid
          ? {
              ...current,
              members: current.members.map((m) => (m.uid === memberUid ? { ...m, role } : m)),
            }
          : null,
      );
    },
    [data, mutateTeam],
  );

  const removeMember = useCallback<DataContextValue["removeMember"]>(
    async (memberUid) => {
      if (!data) return;
      await mutateTeam((current) => {
        if (current.ownerUid !== data.profile.uid || memberUid === current.ownerUid) return null;
        const assignments = { ...current.assignments };
        delete assignments[memberUid];
        return {
          ...current,
          members: current.members.filter((m) => m.uid !== memberUid),
          assignments,
        };
      });
    },
    [data, mutateTeam],
  );

  const saveCustomProgram = useCallback<DataContextValue["saveCustomProgram"]>(
    async (program) => {
      if (!data || !team) throw new Error("You're not in a team.");
      const now = Date.now();
      const normalised = normaliseProgram({
        ...program,
        custom: {
          teamId: team.id,
          createdBy: program.custom?.createdBy ?? data.profile.uid,
          createdByName: program.custom?.createdByName ?? data.profile.displayName,
          createdAt: program.custom?.createdAt ?? now,
          updatedAt: now,
        },
      });
      if (normalised.daysPerWeek === 0) throw new Error("Add at least one training day.");
      const result = await mutateTeam((current) => {
        if (!isCoachRole(roleOf(current, data.profile.uid))) return null;
        const others = (current.customPrograms ?? []).filter((p) => p.id !== normalised.id);
        if (others.length >= 20) throw new Error("A team can keep up to 20 custom programmes.");
        return { ...current, customPrograms: [...others, normalised] };
      });
      if (!result?.customPrograms?.some((p) => p.id === normalised.id)) {
        throw new Error("Only the team owner or a coach can edit programmes.");
      }
      return normalised;
    },
    [data, team, mutateTeam],
  );

  const deleteCustomProgram = useCallback<DataContextValue["deleteCustomProgram"]>(
    async (programId) => {
      if (!data) return;
      await mutateTeam((current) => {
        if (!isCoachRole(roleOf(current, data.profile.uid))) return null;
        const assignments = Object.fromEntries(
          Object.entries(current.assignments ?? {}).filter(([, a]) => a.programId !== programId),
        );
        return {
          ...current,
          customPrograms: (current.customPrograms ?? []).filter((p) => p.id !== programId),
          assignments,
        };
      });
    },
    [data, mutateTeam],
  );

  const assignProgram = useCallback<DataContextValue["assignProgram"]>(
    async (memberUid, programId, note) => {
      if (!data) return;
      await mutateTeam((current) => {
        if (!isCoachRole(roleOf(current, data.profile.uid))) return null;
        const member = current.members.find((m) => m.uid === memberUid);
        if (!member) return null;
        const assignments = { ...current.assignments };
        if (!programId) {
          delete assignments[memberUid];
          return { ...current, assignments };
        }
        assignments[memberUid] = {
          programId,
          assignedBy: data.profile.uid,
          assignedByName: data.profile.displayName,
          assignedAt: Date.now(),
          note: note?.trim() || undefined,
        };
        const program =
          (current.customPrograms ?? []).find((p) => p.id === programId) ?? getProgram(programId);
        const post: TeamPost = {
          id: makeId("post"),
          uid: data.profile.uid,
          authorName: data.profile.displayName,
          body: `${data.profile.displayName} assigned ${program.name} to ${member.displayName}.`,
          kind: "announcement",
          createdAt: Date.now(),
        };
        return { ...current, assignments, posts: [post, ...current.posts].slice(0, 200) };
      });
    },
    [data, mutateTeam],
  );

  const acceptAssignment = useCallback(() => {
    if (!data || !team) return;
    const assignment = team.assignments?.[data.profile.uid];
    if (!assignment) return;
    const program = getProgram(assignment.programId);
    updateProfile({
      programId: program.id,
      trainingDays: DAY_KEYS.filter((k) => program.days[k].type !== "rest"),
    });
    toast.success(`Switched to ${program.name}`);
  }, [data, team, updateProfile]);

  /** Keep my roster entry current so the leaderboard isn't stale. */
  useEffect(() => {
    if (!data || !team) return;
    const mine = team.members.find((m) => m.uid === data.profile.uid);
    if (!mine) return;
    const fresh = memberStats(data);
    const hidden = !data.settings.shareStatsWithTeam;
    const unchanged =
      mine.displayName === data.profile.displayName &&
      Boolean(mine.private) === hidden &&
      mine.stats.sessionsTotal === fresh.sessionsTotal &&
      mine.stats.currentStreak === fresh.currentStreak &&
      mine.stats.sessionsThisWeek === fresh.sessionsThisWeek &&
      mine.stats.xp === fresh.xp;
    if (unchanged) return;
    // Write through a transaction; the subscription delivers the result.
    void repo
      .updateTeam(team.id, (current) => ({
        ...current,
        members: current.members.map((m) =>
          m.uid === data.profile.uid
            ? {
                ...m,
                displayName: data.profile.displayName,
                photoURL: data.profile.photoURL,
                handle: data.profile.handle,
                private: hidden,
                stats: fresh,
              }
            : m,
        ),
      }))
      .catch((err) => console.warn("IronPulse: roster sync failed", err));
  }, [data, team, repo]);

  /* ---------------------------------------------------- push reminders --- */

  const pushEnabled = data?.settings.pushEnabled;
  const reminders = data?.settings.reminders;
  const leadMinutes = data?.settings.reminderLeadMinutes;
  const programId = data?.profile.programId;
  useEffect(() => {
    if (repo.kind !== "firebase" || !user || !pushEnabled || !reminders) return;
    const token = readPushToken();
    if (!token) return;
    const program = getProgram(programId);
    const timer = setTimeout(() => {
      void repo
        .saveDevice(user.uid, {
          token,
          platform: navigator.userAgent.slice(0, 160),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          reminders,
          leadMinutes: leadMinutes ?? 0,
          sessionTitles: Object.fromEntries(
            DAY_KEYS.map((k) => [k, program.days[k].type === "rest" ? null : program.days[k].title]),
          ) as Record<DayKey, string | null>,
          updatedAt: Date.now(),
        })
        .catch((err) => console.warn("IronPulse: could not register push device", err));
    }, 800);
    return () => clearTimeout(timer);
  }, [repo, user, pushEnabled, reminders, leadMinutes, programId]);

  /* ------------------------------------------------------- data tools --- */

  const exportData = useCallback(() => JSON.stringify(data, null, 2), [data]);

  const restoreBackup = useCallback<DataContextValue["restoreBackup"]>(
    (json) => {
      if (!user || !data) throw new Error("Not ready");
      let raw: Partial<AppData>;
      try {
        raw = JSON.parse(json) as Partial<AppData>;
      } catch {
        throw new Error("That file isn't valid JSON.");
      }
      if (!raw || typeof raw !== "object" || !raw.profile || !Array.isArray(raw.sessions)) {
        throw new Error("That doesn't look like an IronPulse backup.");
      }
      const restored = hydrate(raw, data);
      // The backup's contents, but this account's identity and team.
      restored.profile = { ...restored.profile, uid: user.uid, email: data.profile.email };
      restored.teamId = data.teamId;
      restored.photos = restored.photos.filter((p) => p.url.startsWith("data:") || repo.kind === "firebase");
      const derived = derive(restored);
      knownBadges.current = new Set(derived.gamification.badges.map((b) => b.badgeId));
      setData(derived); // not lastSynced — the effect saves it
      return { sessions: derived.sessions.length, metrics: derived.metrics.length };
    },
    [user, data, repo.kind],
  );

  const resetData = useCallback(() => {
    if (!user) return;
    const fresh = emptyAppData(defaultProfile(user.uid, user.email, user.displayName));
    knownBadges.current = new Set();
    lastSynced.current = fresh;
    setData(fresh);
    applyTeam(null);
    repo.save(user.uid, fresh);
  }, [user, repo, applyTeam]);

  const canCoach = Boolean(
    team && data && isCoachRole(roleOf(team, data.profile.uid)),
  );

  const value = useMemo<DataContextValue>(
    () => ({
      data,
      team,
      loading,
      storage: repo.kind,
      canCoach,
      update,
      updateProfile,
      updateSettings,
      saveSession,
      deleteSession,
      checkIn,
      undoCheckIn,
      addMetric,
      deleteMetric,
      importMetrics,
      addPhoto,
      deletePhoto,
      logNutrition,
      toggleFavorite,
      setExerciseVideo,
      appendCoach,
      clearCoach,
      saveFormCheck,
      updateFormCheck,
      deleteFormCheck,
      createTeam,
      joinTeam,
      leaveTeam,
      acceptTeamTerms,
      postToTeam,
      setTeamChallenge,
      updateMemberRole,
      removeMember,
      saveCustomProgram,
      deleteCustomProgram,
      assignProgram,
      acceptAssignment,
      exportData,
      restoreBackup,
      resetData,
    }),
    [
      data,
      team,
      loading,
      repo.kind,
      canCoach,
      update,
      updateProfile,
      updateSettings,
      saveSession,
      deleteSession,
      checkIn,
      undoCheckIn,
      addMetric,
      deleteMetric,
      importMetrics,
      addPhoto,
      deletePhoto,
      logNutrition,
      toggleFavorite,
      setExerciseVideo,
      appendCoach,
      clearCoach,
      saveFormCheck,
      updateFormCheck,
      deleteFormCheck,
      createTeam,
      joinTeam,
      leaveTeam,
      acceptTeamTerms,
      postToTeam,
      setTeamChallenge,
      updateMemberRole,
      removeMember,
      saveCustomProgram,
      deleteCustomProgram,
      assignProgram,
      acceptAssignment,
      exportData,
      restoreBackup,
      resetData,
    ],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}

/** Convenience hook for the common case where the data is guaranteed loaded. */
export function useAppData(): AppData {
  const { data } = useData();
  if (!data) throw new Error("App data not loaded yet");
  return data;
}

export type { DayKey };
