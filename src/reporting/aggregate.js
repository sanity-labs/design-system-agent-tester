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
    // Median-based (robust to outliers in lighthouse runs)
    fcpMs: data.lighthouse?.medianFcpMs ?? data.lighthouse?.avgFcpMs ?? null,
    tbtMs: data.lighthouse?.medianTbtMs ?? data.lighthouse?.avgTbtMs ?? null,
    ttiMs: data.lighthouse?.medianTtiMs ?? data.lighthouse?.avgTtiMs ?? null,
    performanceScore:
      data.lighthouse?.medianPerformanceScore ??
      data.lighthouse?.avgPerformanceScore ??
      null,
    // Mean-based (for comparison with median in the summary tables)
    fcpMsMean: data.lighthouse?.meanFcpMs ?? null,
    tbtMsMean: data.lighthouse?.meanTbtMs ?? null,
    ttiMsMean: data.lighthouse?.meanTtiMs ?? null,
    performanceScoreMean: data.lighthouse?.meanPerformanceScore ?? null,
    reactMountMs: data.reactProfile?.avgMountMs ?? null,
    domAvg: data.domElements?.average ?? null,
    domHtmlBytesAvg: data.domElements?.htmlBytesAverage ?? null,
    semanticRatio: data.semanticHtml?.avgSemanticRatio ?? null,
    semanticCount: data.semanticHtml?.avgSemanticCount ?? null,
    genericCount: data.semanticHtml?.avgGenericCount ?? null,
    roleCount: data.semanticHtml?.avgRoleCount ?? null,
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
  "fcpMsMean",
  "tbtMs",
  "tbtMsMean",
  "ttiMs",
  "ttiMsMean",
  "performanceScore",
  "performanceScoreMean",
  "reactMountMs",
  "domAvg",
  "domHtmlBytesAvg",
  "semanticRatio",
  "semanticCount",
  "genericCount",
  "roleCount",
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
 * Format a byte count as a short human-readable string (`12 KB`,
 * `1.4 MB`). Used for HTML-tree size, which spans roughly 5 KB to
 * a few hundred KB across the runs we've seen.
 */
export function formatBytes(n) {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
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

// ─── Headline metrics tables ────────────────────────────────────────

/**
 * Metric groups in display order. Each group becomes one transposed
 * table: rows are tests, columns are the group's metrics.
 *
 * Each row tuple is `[displayLabel, metricKey, lowerIsBetter, decimals, format?]`.
 * `lowerIsBetter` controls the better/worse direction in the two-test
 * Δ row; `decimals` of 0 means render as integer. `format`, when
 * provided, is `(agg) => string` and overrides the default cell
 * rendering — useful for non-numeric units like byte sizes.
 *
 * Adding a new metric: pick the right group (or add a new one) and
 * append the tuple. To regroup metrics, just move tuples between
 * groups — no other code needs to change.
 */
const METRIC_GROUPS = [
  {
    heading: "Build",
    rows: [
      ["Lines of code (avg)", "loc", false, 0],
      ["Fix attempts / iter", "fixesAvg", true, 2],
      ["Total fixes (avg per run)", "fixesTotal", true, 1],
      // "Clean on 1st try" is computed below from cleanOnFirstTry +
      // totalIterations; it has bespoke formatting and is appended
      // automatically into this group when iteration count is known.
    ],
  },
  {
    heading: "Accessibility",
    rows: [
      ["Axe violations total", "axeTotal", true, 1],
      ["Axe violations / iter", "axeAvg", true, 2],
    ],
  },
  {
    heading: "Performance",
    rows: [
      ["FCP median (ms)", "fcpMs", true, 0],
      ["FCP mean (ms)", "fcpMsMean", true, 0],
      ["TBT median (ms)", "tbtMs", true, 1],
      ["TBT mean (ms)", "tbtMsMean", true, 1],
      ["TTI median (ms)", "ttiMs", true, 0],
      ["TTI mean (ms)", "ttiMsMean", true, 0],
      ["Lighthouse score (median)", "performanceScore", false, 0],
      ["Lighthouse score (mean)", "performanceScoreMean", false, 0],
      ["React mount (ms)", "reactMountMs", true, 1],
    ],
  },
  {
    heading: "DOM & semantic HTML",
    rows: [
      ["DOM elements (avg)", "domAvg", false, 0],
      [
        "HTML size (avg)",
        "domHtmlBytesAvg",
        true,
        0,
        (agg) => formatBytes(agg?.domHtmlBytesAvg),
      ],
      ["Semantic ratio", "semanticRatio", false, 1],
      ["Semantic elements (avg)", "semanticCount", false, 0],
      ["Generic elements (avg)", "genericCount", true, 0],
      ["ARIA roles (avg)", "roleCount", false, 0],
    ],
  },
  {
    heading: "Components",
    rows: [
      ["Component instances total", "componentTotal", false, 0],
      ["Components / iter", "componentAvg", false, 0],
    ],
  },
  {
    heading: "Inline styles",
    rows: [
      ["Inline styles total", "inlineTotal", true, 1],
      ["Inline styles / iter", "inlineAvg", true, 1],
      ["Box inline styles", "boxInline", true, 1],
    ],
  },
  {
    heading: "Visual consistency",
    rows: [["Visual diff (avg %)", "visualDiffAvg", true, 2]],
  },
  {
    heading: "Token usage",
    rows: [
      ["Input tokens / iter", "inputTokensAvg", true, 0],
      ["Output tokens / iter", "outputTokensAvg", true, 0],
      ["Input tokens total", "inputTokensTotal", true, 0],
      ["Output tokens total", "outputTokensTotal", true, 0],
    ],
  },
];

/**
 * Build the column definitions for one metric group. Each column is
 * `{ label, key, lowerBetter, format? }`. `format(agg)` overrides
 * default cell rendering when present — used for "Clean on 1st try"
 * which needs `X / N (P%)` formatting instead of plain numeric.
 */
function buildGroupColumns(group, iters) {
  const cols = group.rows.map(([label, key, lowerBetter, decimals, format]) => ({
    label,
    key,
    lowerBetter,
    decimals,
    ...(format ? { format } : {}),
  }));

  // Inject the special-formatted "Clean on 1st try" column right after
  // "Total fixes" when we're rendering the Build group and we know the
  // iteration count.
  if (group.heading === "Build" && iters) {
    const insertAt = cols.findIndex((c) => c.key === "fixesTotal") + 1;
    cols.splice(insertAt, 0, {
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

  return cols;
}

/**
 * For one metric column, find which label(s) hold the best value.
 * Returns a Set of label names; multiple labels appear on ties. Empty
 * when no label has data for this metric, or when there's only one
 * label to compare (a single-row winner is meaningless).
 */
function findWinners(labels, aggregatesByLabel, key, lowerBetter) {
  if (labels.length < 2) return new Set();
  const samples = labels
    .map((l) => ({ label: l, value: aggregatesByLabel[l]?.[key] }))
    .filter(
      ({ value }) =>
        value !== null && value !== undefined && !Number.isNaN(value),
    );
  if (samples.length === 0) return new Set();
  const best = lowerBetter
    ? Math.min(...samples.map((s) => s.value))
    : Math.max(...samples.map((s) => s.value));
  return new Set(
    samples.filter((s) => s.value === best).map((s) => s.label),
  );
}

const WINNER_MARK = " ✓";

/**
 * Render one themed table: rows are tests, columns are the group's
 * metrics. When exactly two labels are passed, a Δ row is appended.
 * Each cell holding the best value for its column is suffixed with
 * `✓` so the winner per metric is visible at a glance.
 */
function renderOneGroup(group, labels, aggregatesByLabel, iters) {
  const columns = buildGroupColumns(group, iters);
  const headers = ["Test", ...columns.map((c) => c.label)];

  const winnersByColumn = columns.map((c) =>
    findWinners(labels, aggregatesByLabel, c.key, c.lowerBetter),
  );

  const rows = labels.map((l) => {
    const agg = aggregatesByLabel[l];
    const cells = [`**${l}**`];
    for (let i = 0; i < columns.length; i++) {
      const c = columns[i];
      const cell = c.format
        ? c.format(agg)
        : c.decimals === 0
          ? fmtInt(agg?.[c.key])
          : fmt(agg?.[c.key], c.decimals);
      cells.push(winnersByColumn[i].has(l) ? cell + WINNER_MARK : cell);
    }
    return cells;
  });

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

  return `### ${group.heading}\n\n` + mdTable(headers, rows) + "\n";
}

/**
 * Render the headline metrics as a series of small, themed tables —
 * one per topic (Build / Accessibility / Performance / DOM / …). Each
 * table is `rows = tests, cols = metrics`. This keeps every individual
 * table narrow enough to read at a glance, regardless of how many
 * tests or metrics exist.
 *
 * When exactly two labels are passed, each table gets a Δ row at the
 * bottom showing the candidate-vs-baseline percentage per metric.
 *
 * @param {string[]} labels — test labels, in display order
 * @param {Record<string, object>} aggregatesByLabel — `extractMetrics()`
 *   or `aggregateMetrics()` result keyed by label
 * @returns {string} — markdown
 */
export function renderMetricsTables(labels, aggregatesByLabel) {
  const iters = aggregatesByLabel[labels[0]]?.totalIterations ?? null;
  return METRIC_GROUPS.map((g) =>
    renderOneGroup(g, labels, aggregatesByLabel, iters),
  ).join("");
}
