"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, HeartPulse, Info, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented } from "@/components/ui/form";
import { Progress } from "@/components/ui/feedback";
import { Modal } from "@/components/ui/modal";
import { useData } from "@/lib/store/data-context";
import {
  parseAppleHealthExport,
  parseMetricsCSV,
  type ImportResult,
} from "@/lib/importers";
import { displayWeight, relativeDay } from "@/lib/utils";

type Source = "csv" | "apple";

const SOURCE_HELP: Record<Source, string> = {
  csv: "Google Fit (Takeout → Fit → Daily activity metrics), Samsung Health, a spreadsheet — any CSV with a date column and a weight or measurement column. Pounds and inches are converted automatically.",
  apple:
    "On your iPhone: Health → your profile picture → Export All Health Data. Unzip the export and choose export.xml. Body weight, body fat and waist records are imported; nothing else is read.",
};

export function ImportMetricsDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const { data, importMetrics } = useData();
  const [source, setSource] = useState<Source>("csv");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [fileName, setFileName] = useState("");

  const reset = () => {
    setResult(null);
    setError(null);
    setProgress(null);
    setFileName("");
  };

  const close = () => {
    reset();
    onClose();
  };

  const onFile = async (file: File) => {
    reset();
    setFileName(file.name);
    try {
      if (source === "apple") {
        setProgress(0);
        setResult(await parseAppleHealthExport(file, setProgress));
      } else {
        setResult(parseMetricsCSV(await file.text()));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read that file.");
    } finally {
      setProgress(null);
    }
  };

  const confirm = () => {
    if (!result) return;
    const changed = importMetrics(result.rows);
    toast.success(`Imported ${changed} day${changed === 1 ? "" : "s"} of measurements`);
    close();
  };

  const units = data?.settings.units ?? "metric";
  const preview = result?.rows.slice(-6).reverse() ?? [];

  return (
    <Modal
      open={open}
      onClose={close}
      title="Import measurements"
      description="Bring in bodyweight history from another app. Existing entries on the same dates are updated, not duplicated."
      size="lg"
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={confirm} disabled={!result} icon={<Upload size={15} />}>
            {result ? `Import ${result.rows.length} days` : "Import"}
          </Button>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Segmented
          value={source}
          onChange={(v) => {
            setSource(v);
            reset();
          }}
          options={[
            {
              value: "csv",
              label: (
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet size={12} /> CSV / Google Fit
                </span>
              ),
            },
            {
              value: "apple",
              label: (
                <span className="flex items-center gap-1.5">
                  <HeartPulse size={12} /> Apple Health
                </span>
              ),
            },
          ]}
        />

        <p className="flex gap-2 rounded-lg border border-line bg-panel2 p-3 text-xs leading-relaxed text-muted">
          <Info size={14} className="mt-0.5 shrink-0 text-ice" />
          {SOURCE_HELP[source]}
        </p>

        <Field
          label={source === "apple" ? "export.xml" : "CSV file"}
          hint="The file is read in your browser and never uploaded."
        >
          <Input
            key={source}
            type="file"
            accept={source === "apple" ? ".xml,text/xml,application/xml" : ".csv,.txt,text/csv"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFile(file);
            }}
            className="h-auto py-2"
          />
        </Field>

        {progress !== null && (
          <div>
            <p className="mb-1.5 text-xs text-muted">
              Scanning {fileName}… {Math.round(progress * 100)}%
            </p>
            <Progress value={progress * 100} tone="ice" />
          </div>
        )}

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
            {error}
          </p>
        )}

        {result && (
          <div className="space-y-3">
            <div className="rounded-lg border border-ok/30 bg-ok/8 p-3 text-xs text-muted">
              <p className="font-medium text-ink">
                Found {result.rows.length} days
                {result.rows.length > 0 &&
                  ` · ${result.rows[0].date} to ${result.rows[result.rows.length - 1].date}`}
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {result.detected.map((d) => (
                  <li key={d}>• {d}</li>
                ))}
              </ul>
              {result.skipped > 0 && (
                <p className="mt-1.5 text-faint">
                  {result.skipped} row{result.skipped === 1 ? "" : "s"} skipped (no usable date or value).
                </p>
              )}
            </div>

            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-110 text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase tracking-wider text-faint">
                    <th className="py-2 font-semibold">Date</th>
                    <th className="py-2 font-semibold">Weight</th>
                    <th className="py-2 font-semibold">Body fat</th>
                    <th className="py-2 font-semibold">Waist</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row.date} className="border-b border-line last:border-0">
                      <td className="py-2 text-muted">{relativeDay(row.date)}</td>
                      <td className="py-2 text-ink tnum">
                        {row.weightKg ? displayWeight(row.weightKg, units, 1) : "—"}
                      </td>
                      <td className="py-2 text-muted tnum">
                        {row.bodyFatPct ? `${row.bodyFatPct}%` : "—"}
                      </td>
                      <td className="py-2 text-muted tnum">{row.waist ? `${row.waist} cm` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1.5 text-[10px] text-faint">Most recent six days shown.</p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
