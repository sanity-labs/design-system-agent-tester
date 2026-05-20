/**
 * Aggregate metrics renderer.
 *
 * Builds a single markdown table that summarises the headline scalar
 * metrics for a run. Used by:
 *
 *   - `report.js` to prepend a TL;DR table at the top of each run's report
 *   - `summarize.js` to compare those same metrics across many runs
 *
 * The same rendering logic works for both because the input shape is the
 * same: per-test aggregated metrics keyed by label.
 */

// ─── Metric extraction ──────────────────────────────────────────────

/**
 * Pull the headline scalar metrics out of one test's data block in a
 * report (`report.prompts[label]`). Returns flat keys so we can average
 * them across runs.
 */
export function extractMetrics(data) {
  return {
    totalIterations: data.totalIterations ?? null,
    loc: data.linesOfCode?.average ?? null,
    fixesAvg: data.fixAttempts?.average ?? null,
    fixesTotal: data.fixAttempts?.total ?? null,
    cleanOnFirstTry: data.fixAttempts?.iterationsCleanOnFirstTry ?? null,
    inlineTotal: data.inlineStyles?.totalAcrossIterations ?? null,
    inlineAvg: data.inlineStyles?.averagePerIteration ?? null,
    boxInline: data.inlineStyles?.byComponent?.Box ?? 0,
    axeTotal: data.accessibility?.totalViolations ?? null,
    axeAvg: data.accessibility?.averageViolations ?? null,
    fcpMs: data.lighthouse?.avgFcpMs ?? null,
    tbtMs: data.lighthouse?.avgTbtMs ?? null,
    ttiMs: data.lighthouse?.avgTtiMs ?? null,
    performanceScore: data.lighthouse?.avgPerformanceScore ?? null,
    reactMountMs: data.reactProfile?.avgMountMs ?? null,
    domAvg: data.domElements?.average ?? null,
    semanticRatio: data.semanticHtml?.avgSemanticRatio ?? null,
    semanticCount: data.semanticHtml?.avgSemanticCount ?? null,
    genericCount: data.semanticHtml?.avgGenericCount ?? null,
    roleCount: data.semanticHtml?.avgRoleCount ?? null,
    lintErrors: data.lint?.totalErrors ?? null,
    lintWarnings: data.lint?.totalWarnings ?? null,
    componentTotal: data.componentUsageCounts?.totalAcrossIterations ?? null,
    componentAvg: data.componentUsageCounts?.averagePerIteration ?? null,
    visualDiffAvg: data.visualDiff?.averageDiffPercent ?? null,
    inputTokensAvg: data.tokenUsage?.avgInputTokens ?? null,
    outputTokensAvg: data.tokenUsage?.avgOutputTokens ?? null,
    inputTokensTotal: data.tokenUsage?.totalInputTokens ?? null,
    outputTokensTotal: data.tokenUsage?.totalOutputTokens ?? null,
  };
}

const AGGREGATABLE_KEYS = [
  "loc",
  "fixesAvg",
  "fixesTotal",
  "cleanOnFirstTry",
  "inlineTotal",
  "inlineAvg",
  "boxInline",
  "axeTotal",
  "axeAvg",
  "fcpMs",
  "tbtMs",
  "ttiMs",
  "performanceScore",
  "reactMountMs",
  "domAvg",
  "semanticRatio",
  "semanticCount",
  "genericCount",
  "roleCount",
  "lintErrors",
  "lintWarnings",
  "componentTotal",
  "componentAvg",
  "visualDiffAvg",
  "inputTokensAvg",
  "outputTokensAvg",
  "inputTokensTotal",
  "outputTokensTotal",
];

// ─── Stats helpers ──────────────────────────────────────────────────

export function mean(arr) {
  const valid = arr.filter((x) => x !== null && x !== undefined && !isNaN(x));
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function stdDev(arr) {
  const valid = arr.filter((x) => x !== null && x !== undefined && !isNaN(x));
  if (valid.length < 2) return null;
  const m = mean(valid);
  const variance =
    valid.reduce((sum, x) => sum + (x - m) ** 2, 0) / valid.length;
  return Math.sqrt(variance);
}

export function minVal(arr) {
  const valid = arr.filter((x) => x !== null && x !== undefined && !isNaN(x));
  return valid.length ? Math.min(...valid) : null;
}

export function maxVal(arr) {
  const valid = arr.filter((x) => x !== null && x !== undefined && !isNaN(x));
  return valid.length ? Math.max(...valid) : null;
}

/**
 * Aggregate a list of metric sets (one per run) into a single mean / sd /
 * min / max bundle.
 */
export function aggregateMetrics(metricSets) {
  const result = { count: metricSets.length };
  for (const k of AGGREGATABLE_KEYS) {
    const vals = metricSets.map((m) => m[k]);
    result[k] = mean(vals);
    result[`${k}_sd`] = stdDev(vals);
    result[`${k}_min`] = minVal(vals);
    result[`${k}_max`] = maxVal(vals);
  }
  result.totalIterations = metricSets[0]?.totalIterations ?? null;
  return result;
}

// ─── Formatting helpers ─────────────────────────────────────────────

export function fmt(n, decimals = 1) {
  if (n === null || n === undefined) return "—";
  return Number(n).toFixed(decimals);
}

export function fmtInt(n) {
  if (n === null || n === undefined) return "—";
  return String(Math.round(n));
}

/**
 * Format a delta between two values as `+15% worse` / `-30% better`.
 * Returns '' if either value is missing, or if the baseline is 0
 * (no meaningful percentage).
 *
 * `lowerIsBetter` controls the better/worse direction.
 */
export function delta(baseline, candidate, lowerIsBetter = true) {
  if (baseline === null || candidate === null || baseline === 0) return "";
  const pct = ((candidate - baseline) / Math.abs(baseline)) * 100;
  if (pct === 0) return "0%";
  const improved = lowerIsBetter ? pct < 0 : pct > 0;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(0)}% ${improved ? "better" : "worse"}`;
}

// ─── Markdown table renderer ────────────────────────────────────────

export function mdTable(headers, rows) {
  const sep = headers.map(() => "---");
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${sep.join(" | ")} |`,
    ...rows.map((r) => `| ${r.join(" | ")} |`),
  ];
  return lines.join("\n") + "\n";
}

// ─── Headline metrics table ─────────────────────────────────────────

/**
 * Rows in the headline metrics table, in display order. Each tuple is
 * `[label, metricKey, lowerIsBetter, decimals]`.
 */
const METRIC_ROWS = [
  ["Lines of code (avg)", "loc", false, 0],
  ["Fix attempts / iter", "fixesAvg", true, 2],
  ["Total fixes (avg per run)", "fixesTotal", true, 1],
  ["Inline styles total", "inlineTotal", true, 1],
  ["Inline styles / iter", "inlineAvg", true, 1],
  ["Box inline styles", "boxInline", true, 1],
  ["Axe violations total", "axeTotal", true, 1],
  ["Axe violations / iter", "axeAvg", true, 2],
  ["FCP (ms)", "fcpMs", true, 0],
  ["TBT (ms)", "tbtMs", true, 1],
  ["TTI (ms)", "ttiMs", true, 0],
  ["Lighthouse score", "performanceScore", false, 0],
  ["React mount (ms)", "reactMountMs", true, 1],
  ["DOM elements (avg)", "domAvg", false, 0],
  ["Semantic ratio", "semanticRatio", false, 1],
  ["Semantic elements (avg)", "semanticCount", false, 0],
  ["Generic elements (avg)", "genericCount", true, 0],
  ["ARIA roles (avg)", "roleCount", false, 0],
  ["Lint errors total", "lintErrors", true, 0],
  ["Lint warnings total", "lintWarnings", true, 0],
  ["Component instances total", "componentTotal", false, 0],
  ["Components / iter", "componentAvg", false, 0],
  ["Visual diff (avg %)", "visualDiffAvg", true, 2],
  ["Input tokens / iter", "inputTokensAvg", true, 0],
  ["Output tokens / iter", "outputTokensAvg", true, 0],
  ["Input tokens total", "inputTokensTotal", true, 0],
  ["Output tokens total", "outputTokensTotal", true, 0],
];

/**
 * Render the headline metrics table comparing one or more tests.
 *
 * Layout: rows are tests, columns are metrics. This keeps the table
 * scaling linearly with the number of metrics (constant) rather than
 * with the number of tests (grows as you add design systems).
 *
 * When exactly two labels are passed, an extra row at the bottom shows
 * the percentage delta (candidate vs baseline) for each metric.
 *
 * @param {string[]} labels — test labels, in display order
 * @param {Record<string, object>} aggregatesByLabel — `extractMetrics()` or
 *   `aggregateMetrics()` result keyed by label
 * @returns {string} — markdown
 */
export function renderMetricsTable(labels, aggregatesByLabel) {
  const iters = aggregatesByLabel[labels[0]]?.totalIterations ?? null;

  // Column definitions. METRIC_ROWS gives the standard set; we splice
  // in a special-formatted "Clean on 1st try" column right after "Total
  // fixes" if the iteration count is known.
  const columns = [];
  for (const [label, key, lowerBetter, decimals] of METRIC_ROWS) {
    columns.push({ label, key, lowerBetter, decimals });
    if (key === "fixesTotal" && iters) {
      columns.push({
        label: "Clean on 1st try (avg)",
        key: "cleanOnFirstTry",
        lowerBetter: false,
        format: (agg) => {
          if (!agg || agg.cleanOnFirstTry === null) return "—";
          const pct = ((agg.cleanOnFirstTry / iters) * 100).toFixed(0);
          return `${fmt(agg.cleanOnFirstTry, 1)} / ${iters} (${pct}%)`;
        },
      });
    }
  }

  const headers = ["Test", ...columns.map((c) => c.label)];

  const rows = labels.map((l) => {
    const agg = aggregatesByLabel[l];
    const cells = [`**${l}**`];
    for (const c of columns) {
      if (c.format) {
        cells.push(c.format(agg));
      } else {
        const v = agg?.[c.key];
        cells.push(c.decimals === 0 ? fmtInt(v) : fmt(v, c.decimals));
      }
    }
    return cells;
  });

  // Δ row when comparing exactly two tests.
  if (labels.length === 2) {
    const [baselineLabel, candidateLabel] = labels;
    const baseAgg = aggregatesByLabel[baselineLabel];
    const candAgg = aggregatesByLabel[candidateLabel];
    const cells = [`**Δ (${candidateLabel} vs ${baselineLabel})**`];
    for (const c of columns) {
      cells.push(delta(baseAgg?.[c.key], candAgg?.[c.key], c.lowerBetter));
    }
    rows.push(cells);
  }

  return mdTable(headers, rows);
}
