/**
 * Shared formatting helpers for the reporting layer — number/byte/percent
 * rendering, delta strings, and markdown tables. Single source of truth so
 * `report.js`, `aggregate.js`, and `summarize.js` render identically.
 */

/** Fixed-decimal number, or "—" for missing/non-finite. */
export function fmt(n, decimals = 1) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return n.toFixed(decimals);
}

/** Rounded integer, or "—" for missing/non-finite. */
export function fmtInt(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

/**
 * Human-readable byte count (`12 KB`, `1.4 MB`). "—" for missing/non-finite.
 */
export function formatBytes(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Format a delta between two values as `+15% worse` / `-30% better`.
 * Returns '' when either value is missing/non-finite, or when the baseline
 * is 0 (no meaningful percentage). `lowerIsBetter` sets the direction.
 */
export function delta(baseline, candidate, lowerIsBetter = true) {
  if (
    typeof baseline !== "number" ||
    typeof candidate !== "number" ||
    !Number.isFinite(baseline) ||
    !Number.isFinite(candidate) ||
    baseline === 0
  ) {
    return "";
  }
  const pct = ((candidate - baseline) / Math.abs(baseline)) * 100;
  if (pct === 0) return "0%";
  const improved = lowerIsBetter ? pct < 0 : pct > 0;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}% ${improved ? "better" : "worse"}`;
}

/** Render a GitHub-flavoured markdown table. */
export function mdTable(headers, rows) {
  const sep = headers.map(() => "---");
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${sep.join(" | ")} |`,
    ...rows.map((r) => `| ${r.join(" | ")} |`),
  ];
  return lines.join("\n") + "\n";
}
