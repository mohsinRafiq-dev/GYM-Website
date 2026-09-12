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
  NutritionLog,
  ProgressPhoto,
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
import { summariseSession } from "@/lib/session-utils";
import { getRepo } from "./repo";
import { emptyAppData, defaultProfile } from "./defaults";
import { buildDemoData } from "./seed";
import { useAuth } from "./auth-context";
import { dayKeyOf, joinCode, toISODate, uid as makeId, weekRange } from "@/lib/utils";

interface DataContextValue {
  data: AppData | null;
  team: Team | null;
  loading: boolean;
  storage: "local" | "firebase";

  update(patch: Partial<AppData>): void;
  updateProfile(patch: Partial<UserProfile>): void;
  updateSettings(patch: Partial<UserSettings>): void;

  saveSession(session: WorkoutSession): WorkoutSession;
  deleteSession(id: string): void;

  checkIn(status: AttendanceStatus, opts?: Partial<AttendanceRecord>): void;
  undoCheckIn(date: string): void;

  addMetric(metric: Omit<BodyMetric, "id">): void;
  deleteMetric(id: string): void;

  addPhoto(photo: Omit<ProgressPhoto, "id">): void;
  deletePhoto(id: string): void;

  logNutrition(date: string, patch: Partial<NutritionLog>): void;

  toggleFavorite(exerciseId: string): void;
  setExerciseVideo(exerciseId: string, url: string): void;

  appendCoach(messages: CoachMessage[]): void;
  clearCoach(): void;

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

  exportData(): string;
  resetData(): void;
}

const DataContext = createContext<DataContextValue | null>(null);

/**
 * Everything computed from the raw logs — streak, badges, XP and level — as a
 * pure function. React may call state updaters twice, so nothing here reads
 * refs or causes side effects.
 */
const byDateDesc = (a: { date: string }, b: { date: string }) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : 0;

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

export function DataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<AppData | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const repo = useMemo(() => getRepo(), []);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const knownBadges = useRef<Set<string>>(new Set());
  /** The last payload known to match storage — saving it again is a no-op. */
  const lastSynced = useRef<AppData | null>(null);

  /* ------------------------------------------------------------- load --- */

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      // Signing out clears the cache — this effect *is* the sync boundary
      // between the auth provider and the persisted store.
      /* eslint-disable react-hooks/set-state-in-effect */
      setData(null);
      setTeam(null);
      setLoading(false);
      /* eslint-enable react-hooks/set-state-in-effect */
      return;
    }
    setLoading(true);
    (async () => {
      const fallback = emptyAppData(
        defaultProfile(user.uid, user.email, user.displayName),
      );
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

      // Re-derive on load so stored data always reflects the current rules.
      // Seeding knownBadges afterwards keeps anything newly qualified silent.
      loaded = derive(loaded);
      knownBadges.current = new Set(loaded.gamification.badges.map((b) => b.badgeId));

      if (cancelled) return;
      lastSynced.current = loaded;
      setData(loaded);
      setLoading(false);

      if (loaded.teamId) {
        const t = await repo.loadTeam(loaded.teamId);
        if (!cancelled) setTeam(t);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, repo]);

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
      repo.save(user.uid, snapshot).catch((err) => {
        console.error("IronPulse: save failed", err);
        toast.error("Could not save your latest changes.");
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
        const sessions = [
          summarised,
          ...d.sessions.filter((s) => s.id !== summarised.id),
        ].sort((a, b) => (a.date < b.date ? 1 : -1));

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
      commit((d) => ({
        ...d,
        attendance: d.attendance.filter((a) => a.date !== date),
      })),
    [commit],
  );

  const addMetric = useCallback(
    (metric: Omit<BodyMetric, "id">) =>
      commit((d) => ({
        ...d,
        metrics: [
          { ...metric, id: makeId("m") },
          ...d.metrics.filter((m) => m.date !== metric.date),
        ].sort((a, b) => (a.date < b.date ? 1 : -1)),
      })),
    [commit],
  );

  const deleteMetric = useCallback(
    (id: string) => commit((d) => ({ ...d, metrics: d.metrics.filter((m) => m.id !== id) })),
    [commit],
  );

  const addPhoto = useCallback(
    (photo: Omit<ProgressPhoto, "id">) =>
      commit((d) => ({ ...d, photos: [{ ...photo, id: makeId("ph") }, ...d.photos] })),
    [commit],
  );

  const deletePhoto = useCallback(
    (id: string) => commit((d) => ({ ...d, photos: d.photos.filter((p) => p.id !== id) })),
    [commit],
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
        return {
          ...d,
          nutrition: [merged, ...d.nutrition.filter((n) => n.date !== date)],
        };
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
      commit((d) => ({
        ...d,
        exerciseVideos: { ...d.exerciseVideos, [exerciseId]: url },
      })),
    [commit],
  );

  const appendCoach = useCallback(
    (messages: CoachMessage[]) =>
      commit((d) => ({ ...d, coachThread: [...d.coachThread, ...messages].slice(-200) })),
    [commit],
  );

  const clearCoach = useCallback(() => commit((d) => ({ ...d, coachThread: [] })), [commit]);

  /* ------------------------------------------------------------ teams --- */

  const myMemberRecord = useCallback(
    (d: AppData, role: TeamRole): TeamMember => {
      const { start } = weekRange();
      const weekSessions = d.sessions.filter(
        (s) => s.completed && s.date >= toISODate(start),
      );
      return {
        uid: d.profile.uid,
        displayName: d.profile.displayName,
        photoURL: d.profile.photoURL,
        handle: d.profile.handle,
        role,
        joinedAt: Date.now(),
        stats: {
          currentStreak: d.streak.current,
          sessionsThisWeek: weekSessions.length,
          sessionsTotal: d.sessions.filter((s) => s.completed).length,
          volumeThisWeekKg: Math.round(totalVolume(weekSessions)),
          xp: d.gamification.xp,
          level: d.gamification.level,
          lastActive: Date.now(),
        },
      };
    },
    [],
  );

  const createTeam = useCallback<DataContextValue["createTeam"]>(
    async (input) => {
      if (!data) throw new Error("Not ready");
      const newTeam: Team = {
        id: makeId("team"),
        name: input.name,
        motto: input.motto,
        code: joinCode(),
        ownerUid: data.profile.uid,
        createdAt: Date.now(),
        maxMembers: input.maxMembers,
        rules: input.rules,
        terms: input.terms,
        programId: data.profile.programId,
        weeklyTarget: input.weeklyTarget,
        privacy: input.privacy,
        members: [{ ...myMemberRecord(data, "owner"), acceptedTermsAt: Date.now() }],
        posts: [
          {
            id: makeId("post"),
            uid: data.profile.uid,
            authorName: data.profile.displayName,
            body: `${input.name} is live. Rules are posted — read them, accept them, and let's get to work.`,
            kind: "announcement",
            createdAt: Date.now(),
            pinned: true,
          },
        ],
      };
      await repo.saveTeam(newTeam);
      setTeam(newTeam);
      commit((d) => ({ ...d, teamId: newTeam.id }));
      return newTeam;
    },
    [data, repo, commit, myMemberRecord],
  );

  const joinTeam = useCallback<DataContextValue["joinTeam"]>(
    async (code) => {
      if (!data) throw new Error("Not ready");
      const found = await repo.findTeamByCode(code);
      if (!found) throw new Error("No team found with that code.");
      if (found.members.some((m) => m.uid === data.profile.uid)) {
        setTeam(found);
        commit((d) => ({ ...d, teamId: found.id }));
        return found;
      }
      if (found.members.length >= found.maxMembers) {
        throw new Error(`${found.name} is full (${found.maxMembers} members).`);
      }
      const updated: Team = {
        ...found,
        members: [...found.members, myMemberRecord(data, "member")],
        posts: [
          {
            id: makeId("post"),
            uid: data.profile.uid,
            authorName: data.profile.displayName,
            body: `${data.profile.displayName} joined the crew.`,
            kind: "checkin",
            createdAt: Date.now(),
          },
          ...found.posts,
        ],
      };
      await repo.saveTeam(updated);
      setTeam(updated);
      commit((d) => ({ ...d, teamId: updated.id }));
      return updated;
    },
    [data, repo, commit, myMemberRecord],
  );

  const leaveTeam = useCallback(async () => {
    if (!data || !team) return;
    const remaining = team.members.filter((m) => m.uid !== data.profile.uid);
    const updated: Team = {
      ...team,
      members: remaining,
      // Hand ownership to the next member rather than orphaning the team.
      ownerUid:
        team.ownerUid === data.profile.uid && remaining.length
          ? remaining[0].uid
          : team.ownerUid,
    };
    if (remaining.length) await repo.saveTeam(updated);
    setTeam(null);
    commit((d) => ({ ...d, teamId: undefined }));
  }, [data, team, repo, commit]);

  const acceptTeamTerms = useCallback(async () => {
    if (!data || !team) return;
    const updated: Team = {
      ...team,
      members: team.members.map((m) =>
        m.uid === data.profile.uid ? { ...m, acceptedTermsAt: Date.now() } : m,
      ),
    };
    await repo.saveTeam(updated);
    setTeam(updated);
  }, [data, team, repo]);

  const postToTeam = useCallback<DataContextValue["postToTeam"]>(
    async (body, kind = "cheer") => {
      if (!data || !team) return;
      const post: TeamPost = {
        id: makeId("post"),
        uid: data.profile.uid,
        authorName: data.profile.displayName,
        authorPhoto: data.profile.photoURL,
        body,
        kind,
        createdAt: Date.now(),
      };
      const updated: Team = { ...team, posts: [post, ...team.posts].slice(0, 100) };
      await repo.saveTeam(updated);
      setTeam(updated);
    },
    [data, team, repo],
  );

  const setTeamChallenge = useCallback<DataContextValue["setTeamChallenge"]>(
    async (challenge) => {
      if (!data || !team) return;
      const updated: Team = {
        ...team,
        challenge: { ...challenge, id: makeId("ch"), createdBy: data.profile.uid },
      };
      await repo.saveTeam(updated);
      setTeam(updated);
    },
    [data, team, repo],
  );

  const updateMemberRole = useCallback<DataContextValue["updateMemberRole"]>(
    async (memberUid, role) => {
      if (!team) return;
      const updated: Team = {
        ...team,
        members: team.members.map((m) => (m.uid === memberUid ? { ...m, role } : m)),
      };
      await repo.saveTeam(updated);
      setTeam(updated);
    },
    [team, repo],
  );

  const removeMember = useCallback<DataContextValue["removeMember"]>(
    async (memberUid) => {
      if (!team) return;
      const updated: Team = {
        ...team,
        members: team.members.filter((m) => m.uid !== memberUid),
      };
      await repo.saveTeam(updated);
      setTeam(updated);
    },
    [team, repo],
  );

  /** Keep my roster stats current so the leaderboard isn't stale. */
  useEffect(() => {
    if (!data || !team) return;
    const mine = team.members.find((m) => m.uid === data.profile.uid);
    if (!mine) return;
    const fresh = myMemberRecord(data, mine.role);
    const changed =
      mine.stats.sessionsTotal !== fresh.stats.sessionsTotal ||
      mine.stats.currentStreak !== fresh.stats.currentStreak ||
      mine.stats.xp !== fresh.stats.xp;
    if (!changed) return;
    const updated: Team = {
      ...team,
      members: team.members.map((m) =>
        m.uid === data.profile.uid
          ? { ...m, stats: fresh.stats, joinedAt: m.joinedAt, acceptedTermsAt: m.acceptedTermsAt }
          : m,
      ),
    };
    // Pushing fresh stats into the shared team document — writing to an
    // external store and mirroring the result locally.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTeam(updated);
    repo.saveTeam(updated).catch(() => undefined);
  }, [data, team, repo, myMemberRecord]);

  /* ------------------------------------------------------- data tools --- */

  const exportData = useCallback(() => JSON.stringify(data, null, 2), [data]);

  const resetData = useCallback(() => {
    if (!user) return;
    const fresh = emptyAppData(defaultProfile(user.uid, user.email, user.displayName));
    knownBadges.current = new Set();
    lastSynced.current = fresh;
    setData(fresh);
    setTeam(null);
    repo.save(user.uid, fresh);
  }, [user, repo]);

  const value = useMemo<DataContextValue>(
    () => ({
      data,
      team,
      loading,
      storage: repo.kind,
      update,
      updateProfile,
      updateSettings,
      saveSession,
      deleteSession,
      checkIn,
      undoCheckIn,
      addMetric,
      deleteMetric,
      addPhoto,
      deletePhoto,
      logNutrition,
      toggleFavorite,
      setExerciseVideo,
      appendCoach,
      clearCoach,
      createTeam,
      joinTeam,
      leaveTeam,
      acceptTeamTerms,
      postToTeam,
      setTeamChallenge,
      updateMemberRole,
      removeMember,
      exportData,
      resetData,
    }),
    [
      data,
      team,
      loading,
      repo.kind,
      update,
      updateProfile,
      updateSettings,
      saveSession,
      deleteSession,
      checkIn,
      undoCheckIn,
      addMetric,
      deleteMetric,
      addPhoto,
      deletePhoto,
      logNutrition,
      toggleFavorite,
      setExerciseVideo,
      appendCoach,
      clearCoach,
      createTeam,
      joinTeam,
      leaveTeam,
      acceptTeamTerms,
      postToTeam,
      setTeamChallenge,
      updateMemberRole,
      removeMember,
      exportData,
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
