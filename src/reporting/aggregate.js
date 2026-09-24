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

import { delta, fmt, fmtInt, formatBytes, mdTable } from "./format.js";
import { maxVal, mean, minVal, stdDev, sum } from "./stats.js";

export { delta, fmt, fmtInt, formatBytes, mdTable } from "./format.js";
// Re-export the shared stats/format helpers so existing importers of
// `aggregate.js` keep working unchanged.
export { maxVal, mean, minVal, stdDev } from "./stats.js";

// ─── Metric extraction ──────────────────────────────────────────────

/**
 * Pull the headline scalar metrics out of one test's data block in a
 * report (`report.prompts[label]`). Returns flat keys so we can average
 * them across runs.
 */
export function extractMetrics(data) {
  return {
    totalIterations: data.totalIterations ?? null,
    // Builds that ultimately rendered a working app (after the fix loop),
    // out of every iteration attempted. `builtIterations` is null on reports
    // predating the built/un-built split — renders as "—".
    buildsSucceeded: data.builtIterations ?? null,
    loc: data.linesOfCode?.average ?? null,
    fixesAvg: data.fixAttempts?.average ?? null,
    fixesTotal: data.fixAttempts?.total ?? null,
    cleanOnFirstTry: data.fixAttempts?.iterationsCleanOnFirstTry ?? null,
    // Per-stage fix counts (null on reports predating the byStage split).
    // Build fixes = the app didn't compile/render; a11y fixes = it rendered
    // but axe flagged violations. Kept separate so the Build table never
    // counts accessibility repairs and vice versa.
    buildFixesTotal: data.fixAttempts?.byStage?.build?.total ?? null,
    buildFixesAvg: data.fixAttempts?.byStage?.build?.average ?? null,
    buildCleanOnFirstTry: data.fixAttempts?.iterationsBuildCleanOnFirstTry ?? null,
    a11yFixesTotal: data.fixAttempts?.byStage?.accessibility?.total ?? null,
    a11yFixesAvg: data.fixAttempts?.byStage?.accessibility?.average ?? null,
    lintFixesTotal: data.fixAttempts?.byStage?.lint?.total ?? null,
    npmInstallFailuresTotal: data.npmInstall?.total ?? null,
    npmInstallFailuresAffected: data.npmInstall?.affectedIterations ?? null,
    tscFlakesTotal: data.tscFlakes?.total ?? null,
    tsconfigErrorsTotal: data.tsconfigErrors?.total ?? null,
    tsconfigErrorsAffected: data.tsconfigErrors?.affectedIterations ?? null,
    inlineTotal: data.inlineStyles?.totalAcrossIterations ?? null,
    inlineAvg: data.inlineStyles?.averagePerIteration ?? null,
    boxInline: data.inlineStyles?.byComponent?.Box ?? 0,
    // Failure taxonomy (§3) — why builds failed and what recovery cost.
    // Null on reports predating the metric, which renders as "—".
    turnsToGreenMedian: data.failures?.turnsToGreen?.median ?? null,
    turnsToGreenP90: data.failures?.turnsToGreen?.p90 ?? null,
    unrecoverableRate: data.failures?.unrecoverableRate ?? null,
    topFailureCategory: data.failures?.byCategory?.[0]?.label ?? null,
    topFailureCount: data.failures?.byCategory?.[0]?.count ?? null,
    // Tiered coverage (§5) — composite vs primitive is the rebuild signal.
    compositeShare: data.tieredCoverage?.shares?.composite ?? null,
    primitiveShare: data.tieredCoverage?.shares?.primitive ?? null,
    rawShare: data.tieredCoverage?.shares?.raw ?? null,
    coverageElements: data.tieredCoverage?.averageElements ?? null,
    // Props per JSX tag (§5b) — the intensity behind the coverage shares. A
    // rising composite figure with a flat composite share means the same
    // components are being pushed harder, which is the escape-hatch signal.
    // Null on reports predating the metric, which renders as "—".
    propsPerTag: data.jsxPropDensity?.average ?? null,
    propsPerTagComposite: data.jsxPropDensity?.byTier?.composite?.average ?? null,
    propsPerTagPrimitive: data.jsxPropDensity?.byTier?.primitive?.average ?? null,
    propsPerTagRaw: data.jsxPropDensity?.byTier?.raw?.average ?? null,
    // Structural variance (repaired Jaccard). Element/composition compare
    // parsed component trees; contentSimilarity is the older text measure.
    componentChoiceSimilarity: data.codeVariance?.averageComponentChoiceSimilarity ?? null,
    elementSimilarity: data.codeVariance?.averageElementSimilarity ?? null,
    compositionSimilarity: data.codeVariance?.averageCompositionSimilarity ?? null,
    contentSimilarity: data.codeVariance?.averageContentSimilarity ?? null,
    // Built-only versions (null on reports predating them → "—").
    componentChoiceSimilarityBuilt:
      data.codeVarianceBuiltOnly?.averageComponentChoiceSimilarity ?? null,
    compositionSimilarityBuilt: data.codeVarianceBuiltOnly?.averageCompositionSimilarity ?? null,
    elementSimilarityBuilt: data.codeVarianceBuiltOnly?.averageElementSimilarity ?? null,
    axeTotal: data.accessibility?.totalViolations ?? null,
    axeAvg: data.accessibility?.averageViolations ?? null,
    // Median-based (robust to outliers in lighthouse runs)
    fcpMs: data.lighthouse?.medianFcpMs ?? data.lighthouse?.avgFcpMs ?? null,
    tbtMs: data.lighthouse?.medianTbtMs ?? data.lighthouse?.avgTbtMs ?? null,
    ttiMs: data.lighthouse?.medianTtiMs ?? data.lighthouse?.avgTtiMs ?? null,
    performanceScore:
      data.lighthouse?.medianPerformanceScore ?? data.lighthouse?.avgPerformanceScore ?? null,
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
    uncachedInputTokensAvg: data.tokenUsage?.avgUncachedInputTokens ?? null,
    cacheReadInputTokensAvg: data.tokenUsage?.avgCacheReadInputTokens ?? null,
    cacheCreationInputTokensAvg: data.tokenUsage?.avgCacheCreationInputTokens ?? null,
    effectiveInputTokensAvg: data.tokenUsage?.avgEffectiveInputTokens ?? null,
    outputTokensAvg: data.tokenUsage?.avgOutputTokens ?? null,
    inputTokensTotal: data.tokenUsage?.totalInputTokens ?? null,
    effectiveInputTokensTotal: data.tokenUsage?.totalEffectiveInputTokens ?? null,
    outputTokensTotal: data.tokenUsage?.totalOutputTokens ?? null,
    cacheHitRate: data.tokenUsage?.cacheHitRate ?? null,
  };
}

const AGGREGATABLE_KEYS = [
  "buildsSucceeded",
  "loc",
  "fixesAvg",
  "fixesTotal",
  "cleanOnFirstTry",
  // Per-stage fix metrics — a key extracted in extractMetrics() only
  // reaches the summary tables if it is ALSO listed here; the aggregator
  // averages this whitelist and drops everything else (an omitted key
  // renders as "—" even when the report has the data).
  "buildFixesAvg",
  "buildFixesTotal",
  "buildCleanOnFirstTry",
  "a11yFixesAvg",
  "a11yFixesTotal",
  "lintFixesTotal",
  "npmInstallFailuresTotal",
  "npmInstallFailuresAffected",
  "tscFlakesTotal",
  "tsconfigErrorsTotal",
  "tsconfigErrorsAffected",
  "inlineTotal",
  "inlineAvg",
  "boxInline",
  "axeTotal",
  "axeAvg",
  // Failure taxonomy and tiered coverage. `topFailureCategory` is a string
  // and cannot be averaged, so it is carried separately in aggregateMetrics.
  "turnsToGreenMedian",
  "turnsToGreenP90",
  "unrecoverableRate",
  "compositeShare",
  "primitiveShare",
  "rawShare",
  "propsPerTag",
  "propsPerTagComposite",
  "propsPerTagPrimitive",
  "propsPerTagRaw",
  "componentChoiceSimilarity",
  "elementSimilarity",
  "compositionSimilarity",
  "contentSimilarity",
  "componentChoiceSimilarityBuilt",
  "compositionSimilarityBuilt",
  "elementSimilarityBuilt",
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
  "uncachedInputTokensAvg",
  "cacheReadInputTokensAvg",
  "cacheCreationInputTokensAvg",
  "effectiveInputTokensAvg",
  "outputTokensAvg",
  "inputTokensTotal",
  "effectiveInputTokensTotal",
  "outputTokensTotal",
  "cacheHitRate",
];

// ─── Aggregation ────────────────────────────────────────────────────

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
  // The most common top-failure category across runs. A mean is meaningless
  // for a label, and taking the first run's would hide a consistent pattern
  // in all the others.
  result.topFailureCategory = modeOf(metricSets.map((m) => m?.topFailureCategory));
  result.topFailureCount = sum(
    metricSets
      .filter((m) => m?.topFailureCategory === result.topFailureCategory)
      .map((m) => m?.topFailureCount ?? 0),
  );
  return result;
}

/** The most frequent non-null value, or null when there are none. */
function modeOf(values) {
  const counts = new Map();
  for (const v of values) {
    if (v == null) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best = null;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      best = v;
      bestN = n;
    }
  }
  return best;
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
      // Build-stage fixes only — accessibility and lint repairs are
      // reported in their own groups so a rendering app that needed a11y
      // polish is never counted as a build problem.
      ["Build fixes / iter", "buildFixesAvg", true, 2],
      ["Build fixes (avg per run)", "buildFixesTotal", true, 1],
      ["tsc flakes healed (total)", "tscFlakesTotal", true, 1],
      // "Builds succeeded" / "Build-clean on 1st try" are computed below
      // from buildsSucceeded / buildCleanOnFirstTry + totalIterations;
      // they have bespoke formatting and are appended automatically into
      // this group when iteration count is known.
    ],
  },
  {
    // Why builds failed, and what recovery cost. The category column names
    // the single most common failure so the table points at a fix rather
    // than only reporting a rate.
    heading: "Failure taxonomy",
    rows: [
      [
        "Never built",
        "unrecoverableRate",
        true,
        null,
        (agg) =>
          agg?.unrecoverableRate == null ? "—" : `${(agg.unrecoverableRate * 100).toFixed(1)}%`,
      ],
      ["Repair rounds (median)", "turnsToGreenMedian", true, 1],
      ["Repair rounds (p90)", "turnsToGreenP90", true, 1],
      [
        "Top failure",
        "topFailureCategory",
        undefined,
        null,
        (agg) =>
          agg?.topFailureCategory ? `${agg.topFailureCategory} (${agg.topFailureCount})` : "—",
      ],
    ],
  },
  {
    // Composite vs primitive is the point of this table. A high primitive
    // share with a low composite share means agents are rebuilding
    // components out of layout parts instead of using the real ones.
    heading: "Design system coverage",
    rows: [
      [
        "Composite",
        "compositeShare",
        false,
        null,
        (agg) => (agg?.compositeShare == null ? "—" : `${(agg.compositeShare * 100).toFixed(1)}%`),
      ],
      [
        "Primitive",
        "primitiveShare",
        true,
        null,
        (agg) => (agg?.primitiveShare == null ? "—" : `${(agg.primitiveShare * 100).toFixed(1)}%`),
      ],
      [
        "Raw HTML / local",
        "rawShare",
        true,
        null,
        (agg) => (agg?.rawShare == null ? "—" : `${(agg.rawShare * 100).toFixed(1)}%`),
      ],
      // The shares are proportions, so they say nothing about how much was
      // built. This is the denominator behind them.
      ["Elements / iter", "coverageElements", false, 0],
    ],
  },
  {
    // The shares above say which components were used. These say how hard
    // each was leaned on. `lowerIsBetter` on all of them: in a token-driven
    // system, needing fewer props to get the intended result means the
    // defaults fit the job. It is a weak signal on its own — a richer app
    // legitimately passes more props — so read it against the coverage
    // shares and the element count, not alone.
    heading: "Props per JSX tag",
    rows: [
      ["Overall", "propsPerTag", true, 2],
      ["Composite", "propsPerTagComposite", true, 2],
      ["Primitive", "propsPerTagPrimitive", true, 2],
      ["Raw HTML / local", "propsPerTagRaw", true, 2],
    ],
  },
  {
    // How much the same prompt varies run to run. Element and composition
    // compare parsed component trees, so they measure real differences in
    // what was built. Content is the older text measure and is kept only so
    // the trend against past runs stays readable.
    heading: "Structural variance",
    rows: [
      ["Component choice", "componentChoiceSimilarity", false, 3],
      ["Composition", "compositionSimilarity", false, 3],
      ["Element detail", "elementSimilarity", false, 3],
      ["Content (legacy text)", "contentSimilarity", false, 3],
      // Same measures with failed iterations left out — a failure that ended
      // as a stub otherwise reads as inconsistency.
      ["Component choice (built only)", "componentChoiceSimilarityBuilt", false, 3],
      ["Composition (built only)", "compositionSimilarityBuilt", false, 3],
      ["Element detail (built only)", "elementSimilarityBuilt", false, 3],
    ],
  },
  {
    // Toolchain-level retries, not a code or design-system problem — kept
    // separate from Build so a flaky `npm install` never reads as the
    // agent's own build quality. Mirrors the per-prompt report's own
    // "npm install failures" section.
    heading: "npm install failures",
    rows: [
      ["Total failures", "npmInstallFailuresTotal", true, 1],
      ["Iterations affected", "npmInstallFailuresAffected", true, 1],
    ],
  },
  {
    // A broken tsconfig.json/tsconfig.app.json the agent wrote (unknown
    // compiler option, misconfigured project reference) — not a toolchain
    // flake (retrying tsc changes nothing) and not an ordinary app-code
    // bug. Kept separate so it doesn't inflate the generic Build fix count.
    heading: "tsconfig / project-reference errors",
    rows: [
      ["Total errors", "tsconfigErrorsTotal", true, 1],
      ["Iterations affected", "tsconfigErrorsAffected", true, 1],
    ],
  },
  {
    heading: "Accessibility",
    rows: [
      ["Axe violations total", "axeTotal", true, 1],
      ["Axe violations / iter", "axeAvg", true, 2],
      ["A11y fixes / iter", "a11yFixesAvg", true, 2],
      ["A11y fixes (avg per run)", "a11yFixesTotal", true, 1],
    ],
  },
  {
    // Combined across every repair gate (build + accessibility + lint) —
    // kept out of the "Build" heading so it never reads as a build-only
    // number. See the per-prompt "Fix Attempts" section for the same
    // build/accessibility/lint split these summarize across.
    heading: "Fix attempts (all gates combined)",
    rows: [
      ["Lint fixes (total)", "lintFixesTotal", true, 1],
      ["Fix attempts / iter (all gates)", "fixesAvg", true, 2],
      ["Total fixes (all gates, avg per run)", "fixesTotal", true, 1],
      // "Clean on 1st try (all gates, avg)" is computed below from
      // cleanOnFirstTry + totalIterations; bespoke formatting, appended
      // automatically into this group when iteration count is known.
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
      ["HTML size (avg)", "domHtmlBytesAvg", true, 0, (agg) => formatBytes(agg?.domHtmlBytesAvg)],
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
      // Effective input is the headline number — weights uncached at
      // 1.0×, cache_read at 0.1×, cache_create at 1.25× so the
      // comparison reflects actual billed cost.
      ["Effective input / iter", "effectiveInputTokensAvg", true, 0],
      ["Output / iter", "outputTokensAvg", true, 0],
      // Breakdown of how the input was sourced, for visibility into
      // whether prompt caching is doing its job.
      ["Uncached input / iter", "uncachedInputTokensAvg", true, 0],
      ["Cache reads / iter", "cacheReadInputTokensAvg", false, 0],
      ["Cache creations / iter", "cacheCreationInputTokensAvg", true, 0],
      [
        "Cache hit rate",
        "cacheHitRate",
        false,
        2,
        (agg) => (agg?.cacheHitRate == null ? "—" : `${(agg.cacheHitRate * 100).toFixed(1)}%`),
      ],
      ["Effective input total", "effectiveInputTokensTotal", true, 0],
      ["Output total", "outputTokensTotal", true, 0],
    ],
  },
];

/** Builds a `{ label, key }` column with `X / N (P%)` cell formatting. */
function rateColumn(label, key, iters) {
  return {
    label,
    key,
    lowerBetter: false,
    format: (agg) => {
      // == null catches both null and undefined; NaN appears when the
      // aggregator averaged runs that all predate the metric.
      if (!agg || agg[key] == null || Number.isNaN(agg[key])) return "—";
      const pct = ((agg[key] / iters) * 100).toFixed(0);
      return `${fmt(agg[key], 1)} / ${iters} (${pct}%)`;
    },
  };
}

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

  if (!iters) return cols;

  // Inject the special-formatted "X / N (P%)" columns per group, keeping
  // build-only outcomes in "Build" and the combined-across-gates outcome
  // in "Fix attempts (all gates combined)" so accessibility/lint fixes
  // are never presented as part of the Build table.
  if (group.heading === "Build") {
    // Headline outcome: how many builds ultimately rendered, out of all
    // iterations attempted. Placed first so the success rate leads the table.
    cols.unshift(rateColumn("Builds succeeded (avg)", "buildsSucceeded", iters));
    const buildAt = cols.findIndex((c) => c.key === "buildFixesTotal") + 1;
    cols.splice(
      buildAt,
      0,
      rateColumn("Build-clean on 1st try (avg)", "buildCleanOnFirstTry", iters),
    );
  } else if (group.heading === "Fix attempts (all gates combined)") {
    const allAt = cols.findIndex((c) => c.key === "fixesTotal") + 1;
    cols.splice(
      allAt,
      0,
      rateColumn("Clean on 1st try (all gates, avg)", "cleanOnFirstTry", iters),
    );
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
    .filter(({ value }) => value !== null && value !== undefined && !Number.isNaN(value));
  if (samples.length === 0) return new Set();
  const best = lowerBetter
    ? Math.min(...samples.map((s) => s.value))
    : Math.max(...samples.map((s) => s.value));
  return new Set(samples.filter((s) => s.value === best).map((s) => s.label));
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
  return METRIC_GROUPS.map((g) => renderOneGroup(g, labels, aggregatesByLabel, iters)).join("");
}
