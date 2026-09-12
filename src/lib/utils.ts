import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { DayKey } from "./types";
import { DAY_KEYS } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/* ------------------------------------------------------------- dates ---- */

/** Local-time ISO date (YYYY-MM-DD). Never use toISOString() — it shifts to UTC. */
export function toISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

export function dayKeyOf(d: Date | string = new Date()): DayKey {
  const date = typeof d === "string" ? fromISODate(d) : d;
  // JS: 0 = Sunday. DAY_KEYS starts Monday.
  return DAY_KEYS[(date.getDay() + 6) % 7];
}

/** Monday-start week boundaries for the date given. */
export function weekRange(d: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const end = addDays(start, 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function daysBetween(a: string, b: string): number {
  const ms = fromISODate(b).getTime() - fromISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function isSameISOWeek(a: string, b: string): boolean {
  const wa = weekRange(fromISODate(a)).start;
  const wb = weekRange(fromISODate(b)).start;
  return toISODate(wa) === toISODate(wb);
}

export function relativeDay(iso: string): string {
  const diff = daysBetween(iso, toISODate());
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff === -1) return "Tomorrow";
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return fromISODate(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatDateLong(iso: string): string {
  return fromISODate(iso).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** "1h 12m" / "48m" / "35s" */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "0m";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

/** mm:ss for timers. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${`${s % 60}`.padStart(2, "0")}`;
}

/** "HH:mm" → minutes since midnight. */
export function minutesFromTime(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${`${m}`.padStart(2, "0")} ${suffix}`;
}

/* ------------------------------------------------------------ numbers --- */

export function round(n: number, dp = 1): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Compact volume: 12,450 kg → "12.5k" */
export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${round(n / 1_000_000, 1)}M`;
  if (Math.abs(n) >= 1_000) return `${round(n / 1_000, 1)}k`;
  return `${round(n, 0)}`;
}

export function pct(part: number, total: number): number {
  if (!total) return 0;
  return clamp(Math.round((part / total) * 100), 0, 100);
}

export const KG_PER_LB = 0.45359237;
export const kgToLb = (kg: number) => kg / KG_PER_LB;
export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const cmToIn = (cm: number) => cm / 2.54;
export const inToCm = (i: number) => i * 2.54;

export function displayWeight(kg: number, units: "metric" | "imperial", dp = 1): string {
  return units === "imperial"
    ? `${round(kgToLb(kg), dp)} lb`
    : `${round(kg, dp)} kg`;
}

export function displayLength(cm: number, units: "metric" | "imperial", dp = 1): string {
  return units === "imperial"
    ? `${round(cmToIn(cm), dp)} in`
    : `${round(cm, dp)} cm`;
}

/* -------------------------------------------------------------- misc ---- */

export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/** Six-character, unambiguous join code (no O/0/I/1). */
export function joinCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function sum(ns: number[]): number {
  return ns.reduce((a, b) => a + b, 0);
}

export function groupBy<T, K extends string>(
  items: T[],
  key: (item: T) => K,
): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const k = key(item);
      (acc[k] ||= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}

/** Deterministic hue from a string — used for avatars and team colours. */
export function hueFromString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}
