import type { ReactNode } from "react";

/**
 * Deliberately tiny markdown renderer — headings, bold, italics, bullets,
 * numbered lists and inline code. Enough for coaching answers without
 * pulling in a parser (and without ever injecting HTML).
 */
export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={i} className="h-1" />;

        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={i} className="font-display text-sm font-semibold text-ink">
              {inline(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith("## ") || trimmed.startsWith("# ")) {
          return (
            <h3 key={i} className="font-display text-base font-semibold text-ink">
              {inline(trimmed.replace(/^#+\s/, ""))}
            </h3>
          );
        }
        if (/^[-•*]\s/.test(trimmed)) {
          return (
            <p key={i} className="flex gap-2 pl-1">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-volt" />
              <span>{inline(trimmed.replace(/^[-•*]\s/, ""))}</span>
            </p>
          );
        }
        if (/^\d+[.)]\s/.test(trimmed)) {
          const [, num, rest] = trimmed.match(/^(\d+)[.)]\s(.*)$/) ?? [];
          return (
            <p key={i} className="flex gap-2 pl-1">
              <span className="font-semibold text-volt tnum">{num}.</span>
              <span>{inline(rest ?? "")}</span>
            </p>
          );
        }
        return <p key={i}>{inline(trimmed)}</p>;
      })}
    </div>
  );
}

function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("_") && part.endsWith("_") && part.length > 2) {
      return (
        <em key={i} className="text-faint">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded bg-panel3 px-1 py-0.5 font-mono text-[11px] text-ink">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
