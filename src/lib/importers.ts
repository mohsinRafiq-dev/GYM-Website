/* ============================================================================
 * File importers for body measurements.
 *
 * There's no web API for Apple Health or Google Fit, so import works from the
 * export files those apps produce:
 *   • Apple Health  — Health app → profile → Export All Health Data → export.xml
 *   • Google Fit    — Google Takeout → Fit → "Daily activity metrics" CSV
 *   • Anything else — any CSV with a date column and a weight column
 * ========================================================================= */

import type { BodyMetric } from "./types";
import { inToCm, lbToKg, round, toISODate } from "./utils";

export type ImportedMetric = Omit<BodyMetric, "id">;

export interface ImportResult {
  rows: ImportedMetric[];
  /** Human-readable description of what was recognised. */
  detected: string[];
  skipped: number;
}

/* ---------------------------------------------------------------- CSV ---- */

function splitCSVLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      out.push(field);
      field = "";
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out.map((f) => f.trim());
}

/** Parse the common date formats: ISO, year-first with slashes, day/month/year. */
export function parseDate(value: string, dayFirst = true): string | null {
  const v = value.trim().replace(/T.*$/, "").replace(/\s.*$/, "");
  let m = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return toISODate(new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  m = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const year = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3]);
    // An unambiguous value decides the order; otherwise use the file's convention.
    const day = a > 12 ? a : b > 12 ? b : dayFirst ? a : b;
    const month = a > 12 ? b : b > 12 ? a : dayFirst ? b : a;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return toISODate(new Date(year, month - 1, day));
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : toISODate(new Date(parsed));
}

const num = (v: string | undefined) => {
  if (v === undefined) return undefined;
  const n = Number(v.replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

type Column = { index: number; unit: "kg" | "lb" | "cm" | "in" | "pct" | "fraction" };

export function parseMetricsCSV(text: string): ImportResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error("The file has no data rows.");

  const first = lines[0];
  const delimiter = [",", ";", "\t"].sort(
    (a, b) => first.split(b).length - first.split(a).length,
  )[0];
  const header = splitCSVLine(first, delimiter).map((h) => h.toLowerCase());

  const find = (pattern: RegExp, exclude?: RegExp) =>
    header.findIndex((h) => pattern.test(h) && !(exclude && exclude.test(h)));

  const dateIdx = find(/\b(date|day|time|timestamp)\b/);
  if (dateIdx < 0) throw new Error("Couldn't find a date column.");

  const lengthUnit = (h: string): "cm" | "in" => (/\b(in|inch|inches)\b|\(in\)/.test(h) ? "in" : "cm");
  const columns: Partial<Record<keyof ImportedMetric, Column>> = {};
  const detected: string[] = [];

  const weightIdx = find(/weight|body ?mass/, /(min|max)imum|goal|target/);
  if (weightIdx >= 0) {
    const h = header[weightIdx];
    columns.weightKg = { index: weightIdx, unit: /\b(lb|lbs|pound)/.test(h) ? "lb" : "kg" };
    detected.push(`Weight (${columns.weightKg.unit}) from "${h}"`);
  }
  const fatIdx = find(/body ?fat|fat ?%|fat percentage/);
  if (fatIdx >= 0) {
    columns.bodyFatPct = { index: fatIdx, unit: "pct" };
    detected.push(`Body fat from "${header[fatIdx]}"`);
  }
  const lengths: [keyof ImportedMetric, RegExp][] = [
    ["waist", /waist/],
    ["chest", /chest/],
    ["hips", /hip/],
    ["neck", /neck/],
    ["rightArm", /arm|bicep/],
    ["rightThigh", /thigh/],
    ["calf", /calf/],
  ];
  for (const [key, pattern] of lengths) {
    const idx = find(pattern);
    if (idx >= 0) {
      columns[key] = { index: idx, unit: lengthUnit(header[idx]) };
      detected.push(`${key[0].toUpperCase()}${key.slice(1)} (${columns[key]!.unit}) from "${header[idx]}"`);
    }
  }
  if (Object.keys(columns).length === 0) {
    throw new Error("Couldn't find a weight or measurement column.");
  }

  // Decide day/month order from the data itself if any row is unambiguous.
  const samples = lines.slice(1, 60).map((l) => splitCSVLine(l, delimiter)[dateIdx] ?? "");
  const dayFirst = !samples.some((s) => {
    const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.]/);
    return m ? Number(m[2]) > 12 : false;
  });

  const rows: ImportedMetric[] = [];
  let skipped = 0;
  for (const line of lines.slice(1)) {
    const cells = splitCSVLine(line, delimiter);
    const date = parseDate(cells[dateIdx] ?? "", dayFirst);
    if (!date) {
      skipped++;
      continue;
    }
    const row: ImportedMetric = { date };
    for (const [key, col] of Object.entries(columns) as [keyof ImportedMetric, Column][]) {
      const value = num(cells[col.index]);
      if (value === undefined) continue;
      const converted =
        col.unit === "lb" ? lbToKg(value) : col.unit === "in" ? inToCm(value) : value;
      (row as unknown as Record<string, number>)[key] = round(converted, 1);
    }
    if (Object.keys(row).length > 1) rows.push(row);
    else skipped++;
  }

  return { rows: collapseByDate(rows), detected, skipped };
}

/* ------------------------------------------------------ Apple Health ---- */

const APPLE_TYPES: Record<string, keyof ImportedMetric> = {
  HKQuantityTypeIdentifierBodyMass: "weightKg",
  HKQuantityTypeIdentifierBodyFatPercentage: "bodyFatPct",
  HKQuantityTypeIdentifierWaistCircumference: "waist",
};

/**
 * Stream an Apple Health export.xml. These files are often hundreds of
 * megabytes, so the file is read in chunks and scanned for <Record> tags
 * rather than parsed into a DOM.
 */
export async function parseAppleHealthExport(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<ImportResult> {
  const reader = file.stream().getReader();
  const decoder = new TextDecoder();
  const recordRe = /<Record\b[^>]*>/g;
  const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

  let carry = "";
  let bytes = 0;
  let skipped = 0;
  const found = new Set<string>();
  const rows: ImportedMetric[] = [];

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    carry += decoder.decode(value, { stream: true });

    // Keep any partial tag at the end of the chunk for the next pass.
    const lastOpen = carry.lastIndexOf("<");
    const lastClose = carry.lastIndexOf(">");
    const cut = lastOpen > lastClose ? lastOpen : carry.length;
    const chunk = carry.slice(0, cut);
    carry = carry.slice(cut);

    for (const match of chunk.matchAll(recordRe)) {
      const tag = match[0];
      const type = attr(tag, "type");
      const key = type ? APPLE_TYPES[type] : undefined;
      if (!key) continue;
      const raw = Number(attr(tag, "value"));
      const unit = attr(tag, "unit") ?? "";
      const date = parseDate(attr(tag, "startDate") ?? "");
      if (!date || !Number.isFinite(raw) || raw <= 0) {
        skipped++;
        continue;
      }
      let value: number = raw;
      if (key === "weightKg" && /lb/.test(unit)) value = lbToKg(raw);
      if (key === "bodyFatPct" && raw <= 1) value = raw * 100; // stored as a fraction
      if (key === "waist" && /in/.test(unit)) value = inToCm(raw);
      found.add(key);
      rows.push({ date, [key]: round(value, 1) } as ImportedMetric);
    }
    onProgress?.(Math.min(1, bytes / file.size));
  }

  if (rows.length === 0) {
    throw new Error("No body weight, body fat or waist records found in that export.");
  }
  const labels: Record<string, string> = {
    weightKg: "Body weight",
    bodyFatPct: "Body fat percentage",
    waist: "Waist circumference",
  };
  return {
    rows: collapseByDate(rows),
    detected: [...found].map((k) => `${labels[k]} records`),
    skipped,
  };
}

/** Several readings on one day become one entry holding the latest of each. */
function collapseByDate(rows: ImportedMetric[]): ImportedMetric[] {
  const byDate = new Map<string, ImportedMetric>();
  for (const row of rows) byDate.set(row.date, { ...byDate.get(row.date), ...row });
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}
