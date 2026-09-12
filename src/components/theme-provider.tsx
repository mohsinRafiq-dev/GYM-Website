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

type Theme = "dark" | "light" | "system";

const KEY = "ironpulse:theme";

const ThemeContext = createContext<{
  theme: Theme;
  resolved: "dark" | "light";
  setTheme(t: Theme): void;
} | null>(null);

function apply(theme: Theme): "dark" | "light" {
  const prefersLight =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: light)").matches;
  const resolved: "dark" | "light" =
    theme === "system" ? (prefersLight ? "light" : "dark") : theme;
  document.documentElement.setAttribute("data-theme", resolved);
  return resolved;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolved, setResolved] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // localStorage and the OS colour-scheme are external stores; reading them
    // on mount is the intended use of an effect.
    const stored = (window.localStorage.getItem(KEY) as Theme | null) ?? "dark";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(stored);
    setResolved(apply(stored));

    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => {
      if ((window.localStorage.getItem(KEY) as Theme | null) === "system") {
        setResolved(apply("system"));
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    window.localStorage.setItem(KEY, t);
    setThemeState(t);
    setResolved(apply(t));
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

/** Runs before paint so a light-theme user never sees a dark flash. */
export const themeScript = `(function(){try{var t=localStorage.getItem('${KEY}')||'dark';var r=t==='system'?(window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'):t;document.documentElement.setAttribute('data-theme',r);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;
