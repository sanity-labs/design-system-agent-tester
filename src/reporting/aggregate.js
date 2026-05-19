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
 * Render a Δ column comparing the second label to the first. Returns ''
 * if either value is missing, or if the first value is 0 (no baseline).
 *
 * `lowerIsBetter` controls the ✅/❌ direction.
 */
export function delta(baseline, candidate, lowerIsBetter = true) {
  if (baseline === null || candidate === null || baseline === 0) return "";
  const pct = ((candidate - baseline) / Math.abs(baseline)) * 100;
  const improved = lowerIsBetter ? pct < 0 : pct > 0;
  const sign = pct >= 0 ? "+" : "";
  return `${improved ? "✅" : "❌"} ${sign}${pct.toFixed(0)}%`;
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
 * The delta column is only included when exactly two labels are passed
 * (treating the first as baseline and the second as candidate). With one
 * label the table is just that test's values; with 3+ labels the table
 * shows every test's values with no delta column.
 *
 * @param {string[]} labels — test labels, in display order
 * @param {Record<string, object>} aggregatesByLabel — `extractMetrics()` or
 *   `aggregateMetrics()` result keyed by label
 * @returns {string} — markdown
 */
export function renderMetricsTable(labels, aggregatesByLabel) {
  const showDelta = labels.length === 2;
  const [baselineLabel, candidateLabel] = labels;

  const deltaHeader = showDelta
    ? [`**Δ (${candidateLabel} vs ${baselineLabel})**`]
    : [];
  const headers = ["Metric", ...labels.map((l) => `**${l}**`), ...deltaHeader];

  const rows = METRIC_ROWS.map(([label, key, lowerBetter, decimals]) => {
    const vals = labels.map((l) => {
      const v = aggregatesByLabel[l]?.[key];
      return decimals === 0 ? fmtInt(v) : fmt(v, decimals);
    });
    const d = showDelta
      ? [
          delta(
            aggregatesByLabel[baselineLabel]?.[key],
            aggregatesByLabel[candidateLabel]?.[key],
            lowerBetter,
          ),
        ]
      : [];
    return [label, ...vals, ...d];
  });

  // Clean-on-first-try gets its own format (X / N (P%))
  const iters = aggregatesByLabel[labels[0]]?.totalIterations ?? null;
  if (iters) {
    const cleanRow = (() => {
      const vals = labels.map((l) => {
        const a = aggregatesByLabel[l];
        if (!a || a.cleanOnFirstTry === null) return "—";
        const pct = ((a.cleanOnFirstTry / iters) * 100).toFixed(0);
        return `${fmt(a.cleanOnFirstTry, 1)} / ${iters} (${pct}%)`;
      });
      const d = showDelta
        ? [
            delta(
              aggregatesByLabel[baselineLabel]?.cleanOnFirstTry,
              aggregatesByLabel[candidateLabel]?.cleanOnFirstTry,
              false, // higher clean rate is better
            ),
          ]
        : [];
      return ["Clean on 1st try (avg)", ...vals, ...d];
    })();
    rows.splice(2, 0, cleanRow); // insert after "total fixes"
  }

  return mdTable(headers, rows);
}
