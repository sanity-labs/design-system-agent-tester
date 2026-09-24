/**
 * Cross-iteration metric aggregators for the report.
 *
 * Each function takes the array of iteration results for one test and
 * reduces it to a summary block (averages, std devs, counts, top-N lists).
 * Pure data → data; no markdown rendering and no file I/O. Rendering lives
 * in render-markdown.js; the stats primitives live in stats.js.
 */
import { normalizeIteration } from "../evaluation/normalize-structure.js";
import { jaccardSimilarity, mean, ngramSet, round, roundedMean } from "./stats.js";

/** Add the counts in `source` into `target` (mutates target). */
function mergeCounts(target, source) {
  for (const [key, count] of Object.entries(source || {})) {
    target[key] = (target[key] || 0) + count;
  }
}

/**
 * Did this iteration actually produce a working build?
 *
 * Only `clean` and `accessibility` exit stages mean the app rendered:
 *  - `clean` — built and passed every gate.
 *  - `accessibility` — built, but ran out of fix budget on axe violations.
 *    Lighthouse/DOM/a11y data is still real here.
 *
 * `build` and `lint` exits never produced a usable render — even though
 * the runner's fallback measurement path can stamp `domElementCount` and
 * an axe result against a broken server. Including those polluted values
 * in averages is what this filter prevents.
 *
 * Older runs predating `exitStage` are accepted as-is so historical
 * reports keep their numbers — the predicate only excludes iterations
 * that explicitly tagged themselves as a build/lint failure.
 */
export function iterationBuilt(r) {
  if (r?.exitStage == null) return true;
  return r.exitStage === "clean" || r.exitStage === "accessibility";
}

/**
 * Compute pairwise code variance between iterations.
 *
 * Uses Jaccard similarity over character 3-grams of each source file. This
 * is a coarse signal: common tokens (`import`, `<div`, whitespace) inflate
 * similarity, so read it as "roughly how alike" rather than a precise
 * structural diff. 0 = no shared 3-grams, 1 = identical.
 */
export function computeCodeVariance(iterations) {
  // Iterations with no files would compare as identical — the Jaccard
  // index of two empty n-gram sets is 1 — inflating average similarity.
  // Only compare iterations that produced content.
  iterations = iterations.filter((iter) => iter.files?.length > 0);

  if (iterations.length < 2) {
    return {
      pairwiseContentSimilarity: [],
      averageContentSimilarity: null,
      pairwiseStructuralSimilarity: [],
      averageStructuralSimilarity: null,
      description: "Need at least 2 successful iterations to compute variance",
    };
  }

  // Flatten all source content from each iteration into a single string
  const iterContents = iterations.map((iter) => iter.files.map((f) => f.content).join("\n"));

  // Compute pairwise similarities
  const pairs = [];
  for (let i = 0; i < iterContents.length; i++) {
    for (let j = i + 1; j < iterContents.length; j++) {
      const sim = jaccardSimilarity(ngramSet(iterContents[i], 3), ngramSet(iterContents[j], 3));
      pairs.push({
        iterA: iterations[i].iteration,
        iterB: iterations[j].iteration,
        similarity: round(sim),
      });
    }
  }

  const avgSim = mean(pairs.map((p) => p.similarity));

  // Also compute structural similarity (same files present)
  const fileSets = iterations.map((iter) => new Set((iter.files || []).map((f) => f.path)));
  const structuralPairs = [];
  for (let i = 0; i < fileSets.length; i++) {
    for (let j = i + 1; j < fileSets.length; j++) {
      structuralPairs.push({
        iterA: iterations[i].iteration,
        iterB: iterations[j].iteration,
        similarity: round(jaccardSimilarity(fileSets[i], fileSets[j])),
      });
    }
  }
  const avgStructural = mean(structuralPairs.map((p) => p.similarity));

  // Normalized comparison: parse each iteration down to its component tree
  // and compare that instead of the source text. Renaming a variable,
  // reordering attributes, reflowing a line or adding a comment all leave
  // these numbers unchanged, which the text-based number above cannot claim.
  const normalized = iterations.map((iter) =>
    normalizeIteration(iter.files, { dsComponents: iter.componentImports ?? [] }),
  );
  const canNormalize = normalized.every((n) => n !== null);

  const namePairs = [];
  const elementPairs = [];
  const compositionPairs = [];
  if (canNormalize) {
    for (let i = 0; i < normalized.length; i++) {
      for (let j = i + 1; j < normalized.length; j++) {
        const ids = { iterA: iterations[i].iteration, iterB: iterations[j].iteration };
        const sim = (key) => round(jaccardSimilarity(normalized[i][key], normalized[j][key]));
        namePairs.push({ ...ids, similarity: sim("names") });
        compositionPairs.push({ ...ids, similarity: sim("composition") });
        elementPairs.push({ ...ids, similarity: sim("elements") });
      }
    }
  }
  const avgOf = (list) => (canNormalize ? round(mean(list.map((p) => p.similarity))) : null);

  return {
    pairwiseContentSimilarity: pairs,
    averageContentSimilarity: round(avgSim),
    pairwiseStructuralSimilarity: structuralPairs,
    averageStructuralSimilarity: round(avgStructural),
    // The repaired metric, at three granularities. Null when TypeScript is
    // unavailable, so the report shows "—" rather than quietly falling back
    // to the text number.
    pairwiseComponentChoiceSimilarity: namePairs,
    averageComponentChoiceSimilarity: avgOf(namePairs),
    pairwiseCompositionSimilarity: compositionPairs,
    averageCompositionSimilarity: avgOf(compositionPairs),
    pairwiseElementSimilarity: elementPairs,
    averageElementSimilarity: avgOf(elementPairs),
    normalizationAvailable: canNormalize,
    description: canNormalize
      ? "Component choice, composition and element detail all compare parsed component trees, so formatting, naming and how the app is split into local components do not affect them. Element detail is the most sensitive — every distinct combination of layout props is its own token — so read it as a drill-down. Content similarity is the older 3-gram text measure, kept for trend continuity; it moves with formatting. File similarity compares file paths."
      : "Normalized comparison unavailable (TypeScript could not be loaded). Content similarity is a 3-gram text measure and moves with formatting and naming.",
  };
}

/**
 * Analyze feedback across iterations.
 */
export function analyzeFeedback(iterations) {
  const allItems = [];
  const perIteration = [];
  const byCategoryMap = {};

  for (const iter of iterations) {
    const items = iter.feedback || [];
    perIteration.push({
      iteration: iter.iteration,
      count: items.length,
      items,
    });
    for (const item of items) {
      allItems.push({ ...item, iteration: iter.iteration });
      if (!byCategoryMap[item.category]) {
        byCategoryMap[item.category] = [];
      }
      byCategoryMap[item.category].push({
        text: item.text,
        iteration: iter.iteration,
      });
    }
  }

  // Deduplicate similar feedback items (simple exact-text dedup)
  const uniqueTexts = new Set();
  const uniqueItems = [];
  for (const item of allItems) {
    const normalized = item.text.toLowerCase().trim();
    if (!uniqueTexts.has(normalized)) {
      uniqueTexts.add(normalized);
      uniqueItems.push(item);
    }
  }

  // Build category summary
  const byCategory = {};
  for (const [cat, items] of Object.entries(byCategoryMap)) {
    byCategory[cat] = {
      count: items.length,
      items,
    };
  }

  // Sort categories by frequency
  const categoriesSorted = Object.entries(byCategory)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([cat, data]) => ({ category: cat, ...data }));

  return {
    totalItems: allItems.length,
    uniqueItems: uniqueItems.length,
    averagePerIteration: round(mean(perIteration.map((p) => p.count))),
    iterationsWithFeedback: perIteration.filter((p) => p.count > 0).length,
    byCategory,
    categoriesSorted,
    allItems,
    perIteration,
  };
}

/**
 * Analyze design system component usage across iterations.
 */
export function analyzeComponents(iterations) {
  const allComponents = new Set();
  const perIteration = [];

  for (const iter of iterations) {
    const comps = iter.componentImports || [];
    perIteration.push({
      iteration: iter.iteration,
      count: comps.length,
      components: comps,
    });
    for (const c of comps) {
      allComponents.add(c);
    }
  }

  // Count frequency of each component across iterations
  const frequency = {};
  for (const comp of allComponents) {
    frequency[comp] = iterations.filter((iter) =>
      (iter.componentImports || []).includes(comp),
    ).length;
  }

  // Separate UI components from icons
  const uiComponents = [...allComponents].filter((c) => !c.startsWith("icon:"));
  const icons = [...allComponents]
    .filter((c) => c.startsWith("icon:"))
    .map((c) => c.replace("icon:", ""));

  return {
    uniqueUIComponents: uiComponents.length,
    uniqueIcons: icons.length,
    totalUniqueElements: allComponents.size,
    uiComponentsList: uiComponents.sort(),
    iconsList: icons.sort(),
    frequency,
    perIteration,
    averageComponentsPerIteration: round(mean(perIteration.map((p) => p.count))),
  };
}

/**
 * Analyze the validate–repair loop across iterations: where each iteration
 * exited (clean / lint / build / accessibility) and how many violations
 * remained, plus first-try vs post-repair lint and axe counts.
 */
export function analyzeRepairLoop(iterations) {
  const withStage = iterations.filter((r) => r.exitStage != null);
  const stageCounts = { clean: 0, lint: 0, build: 0, accessibility: 0, jev: 0 };
  for (const r of withStage) {
    if (stageCounts[r.exitStage] != null) stageCounts[r.exitStage] += 1;
  }
  const num = (key) => iterations.map((r) => r[key]).filter((v) => v != null);
  const firstTryLint = num("firstTryLint");
  const residualLint = num("residualLint");
  const firstTryAxe = num("firstTryAxe");
  const residualAxe = num("residualAxe");
  const cleanFirstTry = (ft) => iterations.filter((r) => r[ft] === 0).length;
  // Count lint errors by rule, so the report shows which rules agents trip
  // first time and which ones survive the fix loop. Rules tripped often are
  // worth preventing up front; rules that survive are worth fixing.
  const sumRules = (key) => {
    const totals = {};
    for (const r of iterations) {
      const rules = r[key];
      if (!rules || typeof rules !== "object") continue;
      for (const [rule, n] of Object.entries(rules)) totals[rule] = (totals[rule] ?? 0) + n;
    }
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .map(([rule, count]) => ({ rule, count }));
  };
  const topFirstTryRules = sumRules("firstTryLintRules");
  const topResidualRules = sumRules("residualLintRules");
  // Jev is `null` on every iteration unless the gate ran — it calls a paid
  // API and is off by default. `measured` therefore doubles as "did this run
  // pay for judgments at all", which is why it is reported rather than
  // inferred from a zero count.
  const firstTryJev = num("firstTryJev");
  const residualJev = num("residualJev");
  const jevJudged = num("jevJudged");
  const lintAutofixed = num("lintAutofixed");
  const selfLintCalls = num("selfLintCalls");
  const lintGateNotRun = iterations.filter((r) => r.lintGateStatus === "error" || r.lintGateStatus === "unavailable").length;
  const jevUnjudged = num("jevUnjudged");
  const jevInputTokens = num("jevInputTokens");
  return {
    measured: withStage.length,
    totalIterations: iterations.length,
    stageCounts,
    perIteration: withStage.map((r) => ({
      iteration: r.iteration,
      exitStage: r.exitStage,
      fixAttempts: r.fixAttempts ?? 0,
      firstTryLint: r.firstTryLint ?? null,
      residualLint: r.residualLint ?? null,
      firstTryAxe: r.firstTryAxe ?? null,
      residualAxe: r.residualAxe ?? null,
      firstTryJev: r.firstTryJev ?? null,
      residualJev: r.residualJev ?? null,
    })),
    lint: {
      firstTryAvg: roundedMean(firstTryLint),
      residualAvg: roundedMean(residualLint),
      iterationsCleanFirstTry: firstTryLint.length ? cleanFirstTry("firstTryLint") : null,
      iterationsWithResidual: residualLint.filter((n) => n > 0).length,
      topFirstTryRules,
      topResidualRules,
      // What the first-try count is made of, and what happened to it.
      autofixedAvg: roundedMean(lintAutofixed),
      fixedByAgentAvg:
        firstTryLint.length && residualLint.length
          ? roundedMean(iterations.filter((r) => r.firstTryLint != null && r.residualLint != null).map((r) => r.firstTryLint - r.residualLint))
          : null,
      iterationsSelfLinted: selfLintCalls.filter((n) => n > 0).length,
      selfLintCallsAvg: roundedMean(selfLintCalls),
      iterationsGateNotRun: lintGateNotRun,
    },
    axe: {
      firstTryAvg: roundedMean(firstTryAxe),
      residualAvg: roundedMean(residualAxe),
      iterationsCleanFirstTry: firstTryAxe.length ? cleanFirstTry("firstTryAxe") : null,
      iterationsWithResidual: residualAxe.filter((n) => n > 0).length,
    },
    jev: {
      measured: firstTryJev.length,
      firstTryAvg: roundedMean(firstTryJev),
      residualAvg: roundedMean(residualJev),
      iterationsCleanFirstTry: firstTryJev.length ? cleanFirstTry("firstTryJev") : null,
      iterationsWithResidual: residualJev.filter((n) => n > 0).length,
      filesJudged: jevJudged.reduce((a, b) => a + b, 0),
      filesUnjudged: jevUnjudged.reduce((a, b) => a + b, 0),
      inputTokens: jevInputTokens.reduce((a, b) => a + b, 0),
    },
  };
}

/**
 * Analyze accessibility results across iterations.
 */
export function analyzeAccessibility(iterations) {
  // Skipped scans (axe failed to load/inject — summary.skipped) carry
  // axeViolationCount: 0 but measured nothing. Counting them as tested
  // iterations would deflate averageViolations and corrupt passRate.
  const withA11y = iterations.filter(
    (r) => r.a11yResults != null && !r.a11yResults.summary?.skipped,
  );
  const skippedCount = iterations.filter((r) => r.a11yResults?.summary?.skipped).length;

  if (withA11y.length === 0) {
    return {
      iterationsWithResults: 0,
      skippedIterations: skippedCount,
      totalIterations: iterations.length,
      description:
        skippedCount > 0
          ? `No accessibility results collected (${skippedCount} scan(s) skipped)`
          : "No accessibility results collected",
    };
  }

  let totalViolations = 0;
  const allViolationIds = {};
  const perIteration = [];

  for (const iter of withA11y) {
    const a11y = iter.a11yResults;
    const count = a11y.axeViolationCount || 0;
    const summary = a11y.summary || {};

    perIteration.push({
      iteration: iter.iteration,
      violations: count,
      lightViolations: summary.lightViolations || 0,
      darkOnlyViolations: summary.darkOnlyViolations || 0,
      passed: summary.passed || false,
    });

    totalViolations += count;

    // Collect unique violation IDs across iterations
    for (const v of a11y.axeViolations || []) {
      const id = v.id || "unknown";
      if (!allViolationIds[id]) {
        allViolationIds[id] = {
          id,
          impact: v.impact,
          description: v.description || v.help,
          helpUrl: v.helpUrl,
          modes: new Set(),
          count: 0,
        };
      }
      allViolationIds[id].count++;
      for (const mode of v.modes || []) {
        allViolationIds[id].modes.add(mode);
      }
    }
  }

  // Convert Sets to arrays for serialization
  const topViolations = Object.values(allViolationIds)
    .map((v) => ({ ...v, modes: [...v.modes] }))
    .sort((a, b) => b.count - a.count);

  return {
    iterationsWithResults: withA11y.length,
    skippedIterations: skippedCount,
    totalIterations: iterations.length,
    totalViolations,
    averageViolations: round(totalViolations / withA11y.length),
    passRate: round(perIteration.filter((p) => p.passed).length / withA11y.length),
    topViolations: topViolations.slice(0, 20),
    perIteration,
  };
}

/**
 * Aggregate Lighthouse results across iterations.
 *
 * Each iteration's Lighthouse run produces a median + mean per metric
 * (computed across N intra-iteration lighthouse runs — typically 3).
 * This function rolls both upwards to a single number per metric:
 *
 *   - `medianFcpMs` — mean of per-iteration **medians** (robust)
 *   - `meanFcpMs`   — mean of per-iteration **means**   (sensitive to outliers)
 *
 * Backward-compat: `avgFcpMs` is kept as an alias for `medianFcpMs`
 * since the historic top-level `lighthouseResults.fcpMs` was a mean,
 * and old reports' "Avg FCP" cell maps onto today's median.
 */
export function analyzeLighthouse(iterations) {
  const withResults = iterations.filter((r) => r.lighthouseResults && !r.lighthouseResults.error);

  const empty = {
    iterationsWithResults: 0,
    totalIterations: iterations.length,
    medianFcpMs: null,
    meanFcpMs: null,
    medianLcpMs: null,
    meanLcpMs: null,
    medianTbtMs: null,
    meanTbtMs: null,
    medianTtiMs: null,
    meanTtiMs: null,
    medianSpeedIndex: null,
    meanSpeedIndex: null,
    medianPerformanceScore: null,
    meanPerformanceScore: null,
    avgFcpMs: null,
    avgLcpMs: null,
    avgTbtMs: null,
    avgTtiMs: null,
    avgSpeedIndex: null,
    avgPerformanceScore: null,
    runsPerIteration: 0,
    perIteration: [],
  };

  if (withResults.length === 0) return empty;

  // Per-metric: pull the median (top-level field, kept for backward
  // compat) and the mean (under `metrics.<name>.mean` when emitted by
  // newer lighthouse.js; falls back to the top-level for old runs).
  const pickMedian = (r, key) => r.lighthouseResults[key] ?? null;
  const pickMean = (r, metricName) =>
    r.lighthouseResults.metrics?.[metricName]?.mean ??
    r.lighthouseResults[`${metricName}Ms`] ??
    null;

  const fcpMedians = withResults.map((r) => pickMedian(r, "fcpMs")).filter((v) => v !== null);
  const fcpMeans = withResults.map((r) => pickMean(r, "fcp")).filter((v) => v !== null);
  const lcpMedians = withResults.map((r) => pickMedian(r, "lcpMs")).filter((v) => v !== null);
  const lcpMeans = withResults.map((r) => pickMean(r, "lcp")).filter((v) => v !== null);
  const tbtMedians = withResults.map((r) => pickMedian(r, "tbtMs")).filter((v) => v !== null);
  const tbtMeans = withResults.map((r) => pickMean(r, "tbt")).filter((v) => v !== null);
  const ttiMedians = withResults.map((r) => pickMedian(r, "ttiMs")).filter((v) => v !== null);
  const ttiMeans = withResults.map((r) => pickMean(r, "tti")).filter((v) => v !== null);
  const siMedians = withResults.map((r) => pickMedian(r, "speedIndex")).filter((v) => v !== null);
  const siMeans = withResults
    .map(
      (r) =>
        r.lighthouseResults.metrics?.speedIndex?.mean ?? r.lighthouseResults.speedIndex ?? null,
    )
    .filter((v) => v !== null);
  const scoreMedians = withResults
    .map((r) => pickMedian(r, "performanceScore"))
    .filter((v) => v !== null);
  const scoreMeans = withResults
    .map(
      (r) =>
        r.lighthouseResults.metrics?.performanceScore?.mean ??
        r.lighthouseResults.performanceScore ??
        null,
    )
    .filter((v) => v !== null);

  const perIteration = withResults.map((r) => ({
    iteration: r.iteration,
    // Median values per metric (top-level fields are medians in v2 runs)
    fcpMs: r.lighthouseResults.fcpMs,
    lcpMs: r.lighthouseResults.lcpMs,
    tbtMs: r.lighthouseResults.tbtMs ?? null,
    ttiMs: r.lighthouseResults.ttiMs ?? null,
    speedIndex: r.lighthouseResults.speedIndex ?? null,
    performanceScore: r.lighthouseResults.performanceScore ?? null,
    // Means from the nested `metrics` block (newer runs only)
    fcpMean: r.lighthouseResults.metrics?.fcp?.mean ?? null,
    lcpMean: r.lighthouseResults.metrics?.lcp?.mean ?? null,
    tbtMean: r.lighthouseResults.metrics?.tbt?.mean ?? null,
    ttiMean: r.lighthouseResults.metrics?.tti?.mean ?? null,
    speedIndexMean: r.lighthouseResults.metrics?.speedIndex?.mean ?? null,
    performanceScoreMean: r.lighthouseResults.metrics?.performanceScore?.mean ?? null,
    runCount: r.lighthouseResults.runs ?? 0,
  }));

  const ofMean = (vals) => (vals.length > 0 ? round(mean(vals)) : null);

  const medianFcpMs = ofMean(fcpMedians);
  const meanFcpMs = ofMean(fcpMeans);
  const medianLcpMs = ofMean(lcpMedians);
  const meanLcpMs = ofMean(lcpMeans);
  const medianTbtMs = ofMean(tbtMedians);
  const meanTbtMs = ofMean(tbtMeans);
  const medianTtiMs = ofMean(ttiMedians);
  const meanTtiMs = ofMean(ttiMeans);
  const medianSpeedIndex = ofMean(siMedians);
  const meanSpeedIndex = ofMean(siMeans);
  const medianPerformanceScore = ofMean(scoreMedians);
  const meanPerformanceScore = ofMean(scoreMeans);

  return {
    iterationsWithResults: withResults.length,
    totalIterations: iterations.length,
    medianFcpMs,
    meanFcpMs,
    medianLcpMs,
    meanLcpMs,
    medianTbtMs,
    meanTbtMs,
    medianTtiMs,
    meanTtiMs,
    medianSpeedIndex,
    meanSpeedIndex,
    medianPerformanceScore,
    meanPerformanceScore,
    // Backward-compat aliases (downstream report rendering + aggregate.js
    // historically read `avg*` fields). Treat them as the median-of-medians.
    avgFcpMs: medianFcpMs,
    avgLcpMs: medianLcpMs,
    avgTbtMs: medianTbtMs,
    avgTtiMs: medianTtiMs,
    avgSpeedIndex: medianSpeedIndex,
    avgPerformanceScore: medianPerformanceScore,
    runsPerIteration: withResults[0]?.lighthouseResults?.runs ?? 0,
    perIteration,
  };
}

/**
 * Aggregate React Profiler results across iterations.
 */
export function analyzeReactProfile(iterations) {
  const withResults = iterations.filter((r) => r.reactProfile);

  if (withResults.length === 0) {
    return {
      iterationsWithResults: 0,
      totalIterations: iterations.length,
      avgMountMs: null,
      avgCommitCount: null,
      avgUpdateMs: null,
      avgMaxUpdateMs: null,
      perIteration: [],
    };
  }

  const mountValues = withResults.map((r) => r.reactProfile.mountMs).filter((v) => v != null);
  const commitCounts = withResults.map((r) => r.reactProfile.commitCount).filter((v) => v != null);
  const avgUpdateValues = withResults
    .map((r) => r.reactProfile.avgUpdateMs)
    .filter((v) => v != null);
  const maxUpdateValues = withResults
    .map((r) => r.reactProfile.maxUpdateMs)
    .filter((v) => v != null);

  const perIteration = withResults.map((r) => ({
    iteration: r.iteration,
    mountMs: r.reactProfile.mountMs ?? null,
    commitCount: r.reactProfile.commitCount ?? null,
    avgUpdateMs: r.reactProfile.avgUpdateMs ?? null,
    maxUpdateMs: r.reactProfile.maxUpdateMs ?? null,
  }));

  return {
    iterationsWithResults: withResults.length,
    totalIterations: iterations.length,
    avgMountMs: roundedMean(mountValues),
    avgCommitCount: roundedMean(commitCounts),
    avgUpdateMs: roundedMean(avgUpdateValues),
    avgMaxUpdateMs: roundedMean(maxUpdateValues),
    perIteration,
  };
}

/**
 * Aggregate component JSX usage counts across iterations.
 */
export function analyzeComponentUsage(iterations) {
  const withData = iterations.filter(
    (r) => r.componentUsage && r.componentUsage.total !== undefined,
  );

  if (withData.length === 0) {
    return {
      iterationsWithData: 0,
      totalAcrossIterations: 0,
      averagePerIteration: 0,
      byComponent: {},
      perIteration: [],
    };
  }

  const globalByComponent = {};
  let totalAcrossIterations = 0;

  const perIteration = withData.map((r) => {
    const { total, byComponent } = r.componentUsage;
    totalAcrossIterations += total;
    mergeCounts(globalByComponent, byComponent);
    return {
      iteration: r.iteration,
      total,
      byComponent: byComponent || {},
    };
  });

  return {
    iterationsWithData: withData.length,
    totalAcrossIterations,
    averagePerIteration: round(totalAcrossIterations / withData.length),
    byComponent: globalByComponent,
    perIteration,
  };
}

export function analyzeInlineStyles(iterations) {
  const withData = iterations.filter((r) => r.inlineStyles && r.inlineStyles.total !== undefined);

  if (withData.length === 0) {
    return {
      iterationsWithData: 0,
      totalAcrossIterations: 0,
      averagePerIteration: 0,
      byComponent: {},
      byProperty: {},
      topProperties: [],
      perIteration: [],
    };
  }

  const globalByComponent = {};
  const globalByProperty = {};
  let totalAcrossIterations = 0;

  const perIteration = withData.map((r) => {
    const { total, byComponent, byProperty } = r.inlineStyles;
    totalAcrossIterations += total;
    mergeCounts(globalByComponent, byComponent);
    mergeCounts(globalByProperty, byProperty);
    return {
      iteration: r.iteration,
      total,
      byComponent: byComponent || {},
    };
  });

  // Sort properties by frequency, descending
  const topProperties = Object.entries(globalByProperty)
    .map(([property, count]) => ({ property, count }))
    .sort((a, b) => b.count - a.count);

  return {
    iterationsWithData: withData.length,
    totalAcrossIterations,
    averagePerIteration: round(totalAcrossIterations / withData.length),
    byComponent: globalByComponent,
    byProperty: globalByProperty,
    topProperties,
    perIteration,
  };
}

/**
 * Aggregate semantic HTML usage across iterations.
 */
export function analyzeSemanticHtml(iterations) {
  const withData = iterations.filter((r) => r.semanticHtml && r.semanticHtml.total !== undefined);

  if (withData.length === 0) {
    return {
      iterationsWithData: 0,
      totalIterations: iterations.length,
      avgSemanticCount: null,
      avgGenericCount: null,
      avgRoleCount: null,
      avgSemanticRatio: null,
      globalSemanticByTag: {},
      globalGenericByTag: {},
      globalRolesByValue: {},
      perIteration: [],
    };
  }

  const globalSemanticByTag = {};
  const globalGenericByTag = {};
  const globalRolesByValue = {};

  const perIteration = withData.map((r) => {
    const s = r.semanticHtml;
    mergeCounts(globalSemanticByTag, s.semanticByTag);
    mergeCounts(globalGenericByTag, s.genericByTag);
    mergeCounts(globalRolesByValue, s.rolesByValue);
    return {
      iteration: r.iteration,
      semanticCount: s.semanticCount,
      genericCount: s.genericCount,
      roleCount: s.roleCount,
      semanticRatio: s.semanticRatio,
    };
  });

  const semanticCounts = withData.map((r) => r.semanticHtml.semanticCount);
  const genericCounts = withData.map((r) => r.semanticHtml.genericCount);
  const roleCounts = withData.map((r) => r.semanticHtml.roleCount);
  const ratios = withData.map((r) => r.semanticHtml.semanticRatio);

  return {
    iterationsWithData: withData.length,
    totalIterations: iterations.length,
    avgSemanticCount: roundedMean(semanticCounts),
    avgGenericCount: roundedMean(genericCounts),
    avgRoleCount: roundedMean(roleCounts),
    avgSemanticRatio: roundedMean(ratios, 1),
    globalSemanticByTag,
    globalGenericByTag,
    globalRolesByValue,
    perIteration,
  };
}
