"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { firebaseEnabled, getFirebaseAuth } from "@/lib/firebase/config";
import { uid as makeId } from "@/lib/utils";

export interface SessionUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  /** True when signed in through the local demo adapter. */
  local: boolean;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  mode: "firebase" | "local";
  signIn(email: string, password: string): Promise<void>;
  signUp(name: string, email: string, password: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signInAsDemo(): Promise<void>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ------------------------------------------------------- local accounts -- */

interface LocalAccount {
  uid: string;
  email: string;
  displayName: string;
  secret: string;
}

const ACCOUNTS_KEY = "ironpulse:accounts";
const SESSION_KEY = "ironpulse:session";

/**
 * Deliberately simple. Local mode exists so the app is usable the second you
 * clone it — it is NOT a security boundary. Configure Firebase for real auth.
 */
function scramble(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = (h * 33) ^ input.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function readAccounts(): Record<string, LocalAccount> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(ACCOUNTS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeAccounts(accounts: Record<string, LocalAccount>) {
  window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const mode: "firebase" | "local" = firebaseEnabled ? "firebase" : "local";

  useEffect(() => {
    let unsub: (() => void) | undefined;

    if (firebaseEnabled) {
      (async () => {
        const auth = getFirebaseAuth();
        if (!auth) {
          setLoading(false);
          return;
        }
        const { onAuthStateChanged } = await import("firebase/auth");
        unsub = onAuthStateChanged(auth, (fbUser) => {
          setUser(
            fbUser
              ? {
                  uid: fbUser.uid,
                  email: fbUser.email ?? "",
                  displayName: fbUser.displayName ?? fbUser.email?.split("@")[0] ?? "Lifter",
                  photoURL: fbUser.photoURL ?? undefined,
                  local: false,
                }
              : null,
          );
          setLoading(false);
        });
      })();
    } else {
      try {
        // Restoring a session from localStorage — an external store read.
        const raw = window.localStorage.getItem(SESSION_KEY);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (raw) setUser(JSON.parse(raw) as SessionUser);
      } catch {
        /* ignore malformed session */
      }
      setLoading(false);
    }

    return () => unsub?.();
  }, []);

  const persistLocal = useCallback((u: SessionUser | null) => {
    if (typeof window === "undefined") return;
    if (u) window.localStorage.setItem(SESSION_KEY, JSON.stringify(u));
    else window.localStorage.removeItem(SESSION_KEY);
    setUser(u);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (firebaseEnabled) {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Auth unavailable");
        const { signInWithEmailAndPassword } = await import("firebase/auth");
        await signInWithEmailAndPassword(auth, email, password);
        return;
      }
      const accounts = readAccounts();
      const account = accounts[email.toLowerCase()];
      if (!account) throw new Error("No account found for that email.");
      if (account.secret !== scramble(password)) throw new Error("Incorrect password.");
      persistLocal({
        uid: account.uid,
        email: account.email,
        displayName: account.displayName,
        local: true,
      });
    },
    [persistLocal],
  );

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      if (firebaseEnabled) {
        const auth = getFirebaseAuth();
        if (!auth) throw new Error("Auth unavailable");
        const { createUserWithEmailAndPassword, updateProfile } = await import(
          "firebase/auth"
        );
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        setUser({
          uid: cred.user.uid,
          email: cred.user.email ?? email,
          displayName: name,
          local: false,
        });
        return;
      }
      const accounts = readAccounts();
      const key = email.toLowerCase();
      if (accounts[key]) throw new Error("An account with that email already exists.");
      const account: LocalAccount = {
        uid: makeId("user"),
        email,
        displayName: name,
        secret: scramble(password),
      };
      accounts[key] = account;
      writeAccounts(accounts);
      persistLocal({
        uid: account.uid,
        email: account.email,
        displayName: account.displayName,
        local: true,
      });
    },
    [persistLocal],
  );

  const signInWithGoogle = useCallback(async () => {
    if (!firebaseEnabled) {
      throw new Error(
        "Google sign-in needs Firebase. Add your config to .env.local, or use email sign-up in local mode.",
      );
    }
    const auth = getFirebaseAuth();
    if (!auth) throw new Error("Auth unavailable");
    const { GoogleAuthProvider, signInWithPopup } = await import("firebase/auth");
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, []);

  const signInAsDemo = useCallback(async () => {
    const demo: SessionUser = {
      uid: "demo-user",
      email: "demo@ironpulse.app",
      displayName: "Demo Lifter",
      local: true,
    };
    persistLocal(demo);
  }, [persistLocal]);

  const signOutFn = useCallback(async () => {
    if (firebaseEnabled) {
      const auth = getFirebaseAuth();
      if (auth) {
        const { signOut } = await import("firebase/auth");
        await signOut(auth);
      }
      setUser(null);
      return;
    }
    persistLocal(null);
  }, [persistLocal]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      mode,
      signIn,
      signUp,
      signInWithGoogle,
      signInAsDemo,
      signOut: signOutFn,
    }),
    [user, loading, mode, signIn, signUp, signInWithGoogle, signInAsDemo, signOutFn],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
