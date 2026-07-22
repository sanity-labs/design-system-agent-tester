import { writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import {
  analyzeAccessibility,
  analyzeComponents,
  analyzeComponentUsage,
  analyzeFeedback,
  analyzeInlineStyles,
  analyzeLighthouse,
  analyzeReactProfile,
  analyzeRepairLoop,
  analyzeSemanticHtml,
  computeCodeVariance,
  iterationBuilt,
} from "./aggregators.js";
import { renderMarkdown } from "./render-markdown.js";
import { mean, round, stdDev, sum } from "./stats.js";
import { renderSummary } from "./summarize.js";

export {
  analyzeAccessibility,
  analyzeComponents,
  analyzeComponentUsage,
  analyzeFeedback,
  analyzeInlineStyles,
  analyzeLighthouse,
  analyzeReactProfile,
  analyzeRepairLoop,
  analyzeSemanticHtml,
  computeCodeVariance,
  iterationBuilt,
} from "./aggregators.js";
// Re-export the shared stats and the aggregators so existing importers of
// report.js (notably report.test.js) keep working against one surface.
export { jaccardSimilarity, mean, ngramSet, round, stdDev, sum } from "./stats.js";

export async function generateReport(allResults, outputDir, promptText = null) {
  const report = {
    generatedAt: new Date().toISOString(),
    promptText: promptText ?? null,
    prompts: {},
  };

  for (const [promptKey, iterations] of Object.entries(allResults)) {
    const validIterations = iterations.filter((r) => !r.error);
    const failedCount = iterations.length - validIterations.length;

    // `builtIterations` is the subset that actually produced a working
    // render. Use it for every metric that's measured *against the
    // running app* — Lighthouse, axe, DOM counts, semantic HTML, visual
    // diff. The wider `validIterations` is still right for things
    // derived from emitted source code (LOC, component imports, inline
    // styles, code variance, feedback) and for the repair-loop
    // diagnostic, which exists precisely to surface failed builds.
    const builtIterations = validIterations.filter(iterationBuilt);
    const buildFailedCount = validIterations.length - builtIterations.length;

    // Extract model name from the first valid iteration (all iterations use the same model)
    const model = validIterations.find((r) => r.model)?.model || null;
    // Non-default request settings the runner applied for this model (e.g.
    // Fable's effort cap) — surfaced so tuned results aren't compared
    // against other models' default-settings results without knowing it.
    const modelTuning = validIterations.find((r) => r.modelTuning)?.modelTuning || null;

    // 1. Average time to complete
    const times = validIterations.map((r) => r.elapsedSeconds);
    const avgTime = mean(times);
    const stdDevTime = stdDev(times);

    // 2. Average lines of code
    const locs = validIterations.map((r) => r.linesOfCode);
    const avgLOC = mean(locs);
    const stdDevLOC = stdDev(locs);

    // 3. Variance across implementations (pairwise similarity)
    const varianceAnalysis = computeCodeVariance(validIterations);

    // 4. Unique design system components
    const componentAnalysis = analyzeComponents(validIterations);

    // 5. Screenshot paths — only from iterations that actually built.
    // A broken render's puppeteer screenshot is still a file on disk
    // but it doesn't belong in the gallery.
    const screenshots = builtIterations.map((r) => r.screenshotPath).filter(Boolean);

    // Token usage. `!= null` rather than truthiness — a recorded 0 is a
    // legitimate value and should count toward the average. Four input
    // buckets are tracked separately so the report can show the
    // prompt-cache breakdown. `inputTokens` is the raw sum (back-compat);
    // `effectiveInputTokens` weights buckets by billing rate.
    const pick = (key) => validIterations.map((r) => r[key]).filter((v) => v != null);
    const inputTokens = pick("inputTokens");
    const uncachedInputTokens = pick("uncachedInputTokens");
    const cacheReadInputTokens = pick("cacheReadInputTokens");
    const cacheCreationInputTokens = pick("cacheCreationInputTokens");
    const effectiveInputTokens = pick("effectiveInputTokens");
    const outputTokens = pick("outputTokens");

    // 6. Fix attempts — tracked per repair stage. The loop shares one fix
    // budget, but the failure kinds are different signals: a "build" fix
    // means the app didn't compile/render, an "accessibility" fix means it
    // rendered and axe flagged violations, "lint" means style-rule errors.
    // A single combined count conflates broken apps with working apps that
    // needed polish, so each stage is measured separately (the combined
    // number is kept for back-compat with older reports).
    const stageFixes = (r, stage) => (r.fixLog || []).filter((e) => e.stage === stage).length;
    const fixCounts = validIterations.map((r) => r.fixAttempts ?? 0);
    const buildFixCounts = validIterations.map((r) => stageFixes(r, "build"));
    const a11yFixCounts = validIterations.map((r) => stageFixes(r, "accessibility"));
    const lintFixCounts = validIterations.map((r) => stageFixes(r, "lint"));
    const stageSummary = (counts) => ({
      total: sum(counts),
      average: counts.length ? round(mean(counts)) : null,
      iterationsAffected: counts.filter((n) => n > 0).length,
    });

    // 7. Feedback analysis
    const feedbackAnalysis = analyzeFeedback(validIterations);

    // 8. Accessibility analysis — runtime metric, built iterations only.
    const a11yAnalysis = analyzeAccessibility(builtIterations);

    // 9. Visual diff (attached by index.js as _visualDiff on iterations)
    const visualDiff = iterations.find((r) => r._visualDiff)?._visualDiff || null;

    // 10. Performance analysis — runtime metric, built iterations only.
    const lighthouseAnalysis = analyzeLighthouse(builtIterations);
    const reactProfileAnalysis = analyzeReactProfile(builtIterations);

    // 11. Inline style analysis
    const inlineStyleAnalysis = analyzeInlineStyles(validIterations);

    // 12. Component usage count analysis
    const componentUsageAnalysis = analyzeComponentUsage(validIterations);

    // 13. Semantic HTML analysis — extracted from the live DOM; built
    // iterations only.
    const semanticHtmlAnalysis = analyzeSemanticHtml(builtIterations);

    // 14. DOM element counts + serialized HTML size — runtime measurement.
    const domSamples = builtIterations
      .filter((r) => r.domElementCount != null)
      .map((r) => ({
        iteration: r.iteration,
        count: r.domElementCount,
        htmlBytes: r.domHtmlBytes ?? null,
      }));
    const counts = domSamples.map((d) => d.count);
    const byteSamples = domSamples.map((d) => d.htmlBytes).filter((b) => b != null);
    const domElementAnalysis = {
      iterationsWithData: domSamples.length,
      totalIterations: validIterations.length,
      average: counts.length ? round(mean(counts)) : null,
      min: counts.length ? Math.min(...counts) : null,
      max: counts.length ? Math.max(...counts) : null,
      stdDev: counts.length ? round(stdDev(counts)) : null,
      // Serialized HTML byte size — `document.documentElement.outerHTML`
      // measured as UTF-8. `null` when no iteration captured a value
      // (older runs predating this metric leave the field blank).
      htmlBytesAverage: byteSamples.length ? round(mean(byteSamples)) : null,
      htmlBytesMin: byteSamples.length ? Math.min(...byteSamples) : null,
      htmlBytesMax: byteSamples.length ? Math.max(...byteSamples) : null,
      htmlBytesStdDev: byteSamples.length ? round(stdDev(byteSamples)) : null,
      perIteration: domSamples,
    };

    const avgFixes = mean(fixCounts);
    const stdDevFixes = stdDev(fixCounts);
    const iterationsNeedingFixes = fixCounts.filter((n) => n > 0).length;

    // npm install failures — counted across every validation cycle in
    // every valid iteration. `total` is the gross count; `affected` is
    // how many iterations hit at least one. Older runs without the
    // field count as 0.
    const installFailureCounts = validIterations.map((r) => r.npmInstallFailures ?? 0);
    const npmInstallAnalysis = {
      total: sum(installFailureCounts),
      affectedIterations: installFailureCounts.filter((n) => n > 0).length,
      totalIterations: validIterations.length,
      perIteration: validIterations.map((r) => ({
        iteration: r.iteration,
        failures: r.npmInstallFailures ?? 0,
      })),
    };

    // Toolchain flakes — tsc failures that contradicted on-disk state and
    // passed on a single retry. Infra noise, not agent errors; surfaced so
    // analyses can subtract it. Older runs without the field count as 0.
    const tscFlakeCounts = validIterations.map((r) => r.tscFlakes ?? 0);
    const tscFlakeAnalysis = {
      total: sum(tscFlakeCounts),
      affectedIterations: tscFlakeCounts.filter((n) => n > 0).length,
      totalIterations: validIterations.length,
    };

    // tsconfig/project-reference scaffold errors — NOT a flake (retrying
    // tsc changes nothing) and not an ordinary app-code bug: the agent's
    // own tsconfig.json/tsconfig.app.json is invalid (see
    // `isTsconfigScaffoldError`). Tracked separately so a run dominated by
    // scaffold mistakes isn't indistinguishable from real code bugs.
    const tsconfigErrorCounts = validIterations.map((r) => r.tsconfigErrors ?? 0);
    const tsconfigErrorAnalysis = {
      total: sum(tsconfigErrorCounts),
      affectedIterations: tsconfigErrorCounts.filter((n) => n > 0).length,
      totalIterations: validIterations.length,
      perIteration: validIterations.map((r) => ({
        iteration: r.iteration,
        errors: r.tsconfigErrors ?? 0,
      })),
    };

    report.prompts[promptKey] = {
      model,
      modelTuning,
      totalIterations: iterations.length,
      successfulIterations: validIterations.length,
      failedIterations: failedCount,
      // Of the iterations the harness was able to record, how many
      // produced a working build. Runtime metrics (a11y, lighthouse,
      // DOM, semantic HTML, visual diff) are computed against this
      // subset only — broken builds are excluded.
      builtIterations: builtIterations.length,
      unbuiltIterations: buildFailedCount,
      timing: {
        // Guard the empty case (every iteration failed): Math.min() of
        // an empty spread is Infinity, which would render literally.
        averageSeconds: times.length ? round(avgTime) : null,
        stdDevSeconds: times.length ? round(stdDevTime) : null,
        minSeconds: times.length ? round(Math.min(...times)) : null,
        maxSeconds: times.length ? round(Math.max(...times)) : null,
        allTimesSeconds: times.map((t) => round(t)),
      },
      linesOfCode: {
        average: locs.length ? round(avgLOC) : null,
        stdDev: locs.length ? round(stdDevLOC) : null,
        min: locs.length ? Math.min(...locs) : null,
        max: locs.length ? Math.max(...locs) : null,
        all: locs,
      },
      codeVariance: varianceAnalysis,
      componentImports: componentAnalysis,
      screenshots,
      fixAttempts: {
        average: fixCounts.length ? round(avgFixes) : null,
        stdDev: fixCounts.length ? round(stdDevFixes) : null,
        min: fixCounts.length ? Math.min(...fixCounts) : null,
        max: fixCounts.length ? Math.max(...fixCounts) : null,
        total: sum(fixCounts),
        iterationsNeedingFixes,
        iterationsCleanOnFirstTry: validIterations.length - iterationsNeedingFixes,
        // Per-stage split of the combined numbers above.
        byStage: {
          build: stageSummary(buildFixCounts),
          accessibility: stageSummary(a11yFixCounts),
          lint: stageSummary(lintFixCounts),
        },
        // "Clean" restricted to the build gate: iterations that compiled and
        // rendered without a single build fix, regardless of a11y/lint polish.
        iterationsBuildCleanOnFirstTry: buildFixCounts.filter((n) => n === 0).length,
        all: fixCounts,
        perIteration: validIterations.map((r) => ({
          iteration: r.iteration,
          fixAttempts: r.fixAttempts ?? 0,
          buildFixes: stageFixes(r, "build"),
          accessibilityFixes: stageFixes(r, "accessibility"),
          lintFixes: stageFixes(r, "lint"),
          errors: (r.fixLog || []).map((entry) => ({
            attempt: entry.attempt,
            fatalError: entry.fatalError,
          })),
        })),
      },
      feedback: feedbackAnalysis,
      accessibility: a11yAnalysis,
      npmInstall: npmInstallAnalysis,
      tscFlakes: tscFlakeAnalysis,
      tsconfigErrors: tsconfigErrorAnalysis,
      repairLoop: analyzeRepairLoop(validIterations),
      visualDiff: visualDiff || {
        pairwiseDiffs: [],
        averageDiffPercent: null,
        minDiffPercent: null,
        maxDiffPercent: null,
        iterationsCompared: 0,
        description: "No visual diff data available",
      },
      lighthouse: lighthouseAnalysis,
      reactProfile: reactProfileAnalysis,
      inlineStyles: inlineStyleAnalysis,
      componentUsageCounts: componentUsageAnalysis,

      domElements: domElementAnalysis,
      semanticHtml: semanticHtmlAnalysis,
      tokenUsage: {
        // `avgInputTokens` is the raw sum (uncached + cache_read +
        // cache_creation). Useful for "how much did the model see"
        // but does NOT reflect billing — cache reads are ~10% the
        // cost of uncached input. Use `avgEffectiveInputTokens` for
        // billed-cost comparisons.
        avgInputTokens: inputTokens.length ? round(mean(inputTokens)) : null,
        avgUncachedInputTokens: uncachedInputTokens.length
          ? round(mean(uncachedInputTokens))
          : null,
        avgCacheReadInputTokens: cacheReadInputTokens.length
          ? round(mean(cacheReadInputTokens))
          : null,
        avgCacheCreationInputTokens: cacheCreationInputTokens.length
          ? round(mean(cacheCreationInputTokens))
          : null,
        avgEffectiveInputTokens: effectiveInputTokens.length
          ? round(mean(effectiveInputTokens))
          : null,
        avgOutputTokens: outputTokens.length ? round(mean(outputTokens)) : null,
        totalInputTokens: sum(inputTokens),
        totalUncachedInputTokens: sum(uncachedInputTokens),
        totalCacheReadInputTokens: sum(cacheReadInputTokens),
        totalCacheCreationInputTokens: sum(cacheCreationInputTokens),
        totalEffectiveInputTokens: sum(effectiveInputTokens),
        totalOutputTokens: sum(outputTokens),
        // Cache hit rate: fraction of total input tokens served from
        // cache_read. Computed directly from the three buckets so it
        // stays accurate even when older runs have only the raw
        // `inputTokens` field populated (which historically excluded
        // cache reads).
        cacheHitRate: (() => {
          const u = sum(uncachedInputTokens);
          const cr = sum(cacheReadInputTokens);
          const cc = sum(cacheCreationInputTokens);
          const denom = u + cr + cc;
          if (denom === 0) return null;
          return round(cr / denom);
        })(),
      },
    };
  }

  // Write JSON report
  const jsonPath = resolve(outputDir, "report.json");
  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`JSON report written to: ${jsonPath}`);

  // Render the summarize.js layout for THIS run only and prepend it to
  // the markdown report. Scoped to a single run so the tables can't pull
  // in labels (e.g. retired test names) from past runs sitting in
  // `output/`.
  const runName = `${basename(dirname(outputDir))}/${basename(outputDir)}`;
  const promptKeys = Object.keys(report.prompts);
  let summarySection = "";
  if (promptKeys.length > 0) {
    try {
      const summaryMd = renderSummary([{ name: runName, report }], promptKeys, outputDir);
      summarySection = summaryMd + "\n---\n\n";
    } catch (err) {
      console.warn(`Failed to render run summary: ${err.message}`);
    }
  }

  // Write human-readable markdown report
  const mdPath = resolve(outputDir, "report.md");
  const markdown = summarySection + renderMarkdown(report, outputDir);
  await writeFile(mdPath, markdown, "utf-8");
  console.log(`Markdown report written to: ${mdPath}`);

  return report;
}
