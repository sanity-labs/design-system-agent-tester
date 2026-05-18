import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import dsConfig from "../config/load.js";

/**
 * Generate a report from all test results.
 *
 * @param {Record<string, Array<object>>} allResults - Keyed by prompt name, array of iteration results
 * @param {string} outputDir - Base output directory
 */
export async function generateReport(allResults, outputDir, promptText = null) {
  const report = {
    generatedAt: new Date().toISOString(),
    promptText: promptText ?? null,
    prompts: {},
  };

  for (const [promptKey, iterations] of Object.entries(allResults)) {
    const validIterations = iterations.filter((r) => !r.error);
    const failedCount = iterations.length - validIterations.length;

    // Extract model name from the first valid iteration (all iterations use the same model)
    const model = validIterations.find((r) => r.model)?.model || null;

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

    // 5. Screenshot paths
    const screenshots = validIterations
      .map((r) => r.screenshotPath)
      .filter(Boolean);

    // Token usage
    const inputTokens = validIterations
      .map((r) => r.inputTokens)
      .filter(Boolean);
    const outputTokens = validIterations
      .map((r) => r.outputTokens)
      .filter(Boolean);

    // 6. Fix attempts
    const fixCounts = validIterations.map((r) => r.fixAttempts ?? 0);

    // 7. Feedback analysis
    const feedbackAnalysis = analyzeFeedback(validIterations);

    // 8. Accessibility analysis
    const a11yAnalysis = analyzeAccessibility(validIterations);

    // 9. Visual diff (attached by index.js as _visualDiff on iterations)
    const visualDiff =
      iterations.find((r) => r._visualDiff)?._visualDiff || null;

    // 10. Performance analysis
    const perfAnalysis = analyzePerformance(validIterations);

    // 11. Inline style analysis
    const inlineStyleAnalysis = analyzeInlineStyles(validIterations);

    // 12. Component usage count analysis
    const componentUsageAnalysis = analyzeComponentUsage(validIterations);

    // 15. Semantic HTML analysis
    const semanticHtmlAnalysis = analyzeSemanticHtml(validIterations);

    // 14. DOM element counts
    const domCounts = validIterations
      .filter((r) => r.domElementCount != null)
      .map((r) => ({ iteration: r.iteration, count: r.domElementCount }));
    const domElementAnalysis = {
      iterationsWithData: domCounts.length,
      totalIterations: validIterations.length,
      average: domCounts.length ? round(mean(domCounts.map((d) => d.count))) : null,
      min: domCounts.length ? Math.min(...domCounts.map((d) => d.count)) : null,
      max: domCounts.length ? Math.max(...domCounts.map((d) => d.count)) : null,
      stdDev: domCounts.length ? round(stdDev(domCounts.map((d) => d.count))) : null,
      perIteration: domCounts,
    };

    const avgFixes = mean(fixCounts);
    const stdDevFixes = stdDev(fixCounts);
    const iterationsNeedingFixes = fixCounts.filter((n) => n > 0).length;

    report.prompts[promptKey] = {
      model,
      totalIterations: iterations.length,
      successfulIterations: validIterations.length,
      failedIterations: failedCount,
      timing: {
        averageSeconds: round(avgTime),
        stdDevSeconds: round(stdDevTime),
        minSeconds: round(Math.min(...times)),
        maxSeconds: round(Math.max(...times)),
        allTimesSeconds: times.map((t) => round(t)),
      },
      linesOfCode: {
        average: round(avgLOC),
        stdDev: round(stdDevLOC),
        min: Math.min(...locs),
        max: Math.max(...locs),
        all: locs,
      },
      codeVariance: varianceAnalysis,
      designSystemComponents: componentAnalysis,
      screenshots,
      fixAttempts: {
        average: round(avgFixes),
        stdDev: round(stdDevFixes),
        min: Math.min(...fixCounts),
        max: Math.max(...fixCounts),
        total: sum(fixCounts),
        iterationsNeedingFixes,
        iterationsCleanOnFirstTry:
          validIterations.length - iterationsNeedingFixes,
        all: fixCounts,
        perIteration: validIterations.map((r) => ({
          iteration: r.iteration,
          fixAttempts: r.fixAttempts ?? 0,
          errors: (r.fixLog || []).map((entry) => ({
            attempt: entry.attempt,
            fatalError: entry.fatalError,
          })),
        })),
      },
      feedback: feedbackAnalysis,
      accessibility: a11yAnalysis,
      visualDiff: visualDiff || {
        pairwiseDiffs: [],
        averageDiffPercent: null,
        minDiffPercent: null,
        maxDiffPercent: null,
        iterationsCompared: 0,
        description: "No visual diff data available",
      },
      performance: perfAnalysis,
      inlineStyles: inlineStyleAnalysis,
      componentUsageCounts: componentUsageAnalysis,

      domElements: domElementAnalysis,
      semanticHtml: semanticHtmlAnalysis,
      tokenUsage: {
        avgInputTokens: inputTokens.length ? round(mean(inputTokens)) : null,
        avgOutputTokens: outputTokens.length ? round(mean(outputTokens)) : null,
        totalInputTokens: sum(inputTokens),
        totalOutputTokens: sum(outputTokens),
      },
    };
  }

  // Write JSON report
  const jsonPath = resolve(outputDir, "report.json");
  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`JSON report written to: ${jsonPath}`);

  // Write human-readable markdown report
  const mdPath = resolve(outputDir, "report.md");
  const markdown = renderMarkdown(report);
  await writeFile(mdPath, markdown, "utf-8");
  console.log(`Markdown report written to: ${mdPath}`);

  return report;
}

/**
 * Compute pairwise code variance between iterations.
 * Uses Jaccard similarity on line-level n-grams for each source file.
 */
export function computeCodeVariance(iterations) {
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
  const iterContents = iterations.map((iter) => {
    if (!iter.files || iter.files.length === 0) return "";
    return iter.files.map((f) => f.content).join("\n");
  });

  // Compute pairwise similarities
  const pairs = [];
  for (let i = 0; i < iterContents.length; i++) {
    for (let j = i + 1; j < iterContents.length; j++) {
      const sim = jaccardSimilarity(
        ngramSet(iterContents[i], 3),
        ngramSet(iterContents[j], 3),
      );
      pairs.push({
        iterA: iterations[i].iteration,
        iterB: iterations[j].iteration,
        similarity: round(sim),
      });
    }
  }

  const avgSim = mean(pairs.map((p) => p.similarity));

  // Also compute structural similarity (same files present)
  const fileSets = iterations.map(
    (iter) => new Set((iter.files || []).map((f) => f.path)),
  );
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

  return {
    pairwiseContentSimilarity: pairs,
    averageContentSimilarity: round(avgSim),
    pairwiseStructuralSimilarity: structuralPairs,
    averageStructuralSimilarity: round(avgStructural),
    description: `Content similarity based on 3-gram Jaccard index (0 = completely different, 1 = identical). Structural similarity based on file paths.`,
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
    allUniqueItems: uniqueItems,
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
    const comps = iter.designSystemComponents || [];
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
      (iter.designSystemComponents || []).includes(comp),
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
    averageComponentsPerIteration: round(
      mean(perIteration.map((p) => p.count)),
    ),
  };
}

/**
 * Analyze accessibility results across iterations.
 */
export function analyzeAccessibility(iterations) {
  const withA11y = iterations.filter((r) => r.a11yResults != null);

  if (withA11y.length === 0) {
    return {
      iterationsWithResults: 0,
      totalIterations: iterations.length,
      description: "No accessibility results collected",
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
    totalIterations: iterations.length,
    totalViolations,
    averageViolations: round(totalViolations / withA11y.length),
    passRate: round(perIteration.filter((p) => p.passed).length / withA11y.length),
    topViolations: topViolations.slice(0, 20),
    perIteration,
  };
}

/**
 * Render report as Markdown.
 */
function renderMarkdown(report) {
  let md = `# Agent Test Report\n\n`;
  md += `**Generated:** ${report.generatedAt}\n\n`;

  if (report.promptText) {
    md += `## 📋 Interface Brief\n\n`;
    md += `> ${report.promptText.split("\n").join("\n> ")}\n\n`;
  }

  for (const [promptKey, data] of Object.entries(report.prompts)) {
    md += `---\n\n`;
    md += `## Prompt: \`${promptKey}\`\n\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    if (data.model) {
      md += `| Model | \`${data.model}\` |\n`;
    }
    md += `| Total iterations | ${data.totalIterations} |\n`;
    md += `| Successful | ${data.successfulIterations} |\n`;
    md += `| Failed | ${data.failedIterations} |\n\n`;

    // Timing
    md += `### ⏱ Timing\n\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Average | ${data.timing.averageSeconds}s |\n`;
    md += `| Std Dev | ${data.timing.stdDevSeconds}s |\n`;
    md += `| Min | ${data.timing.minSeconds}s |\n`;
    md += `| Max | ${data.timing.maxSeconds}s |\n`;
    md += `| All | ${data.timing.allTimesSeconds.map((t) => `${t}s`).join(", ")} |\n\n`;

    // LOC
    md += `### 📝 Lines of Code\n\n`;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Average | ${data.linesOfCode.average} |\n`;
    md += `| Std Dev | ${data.linesOfCode.stdDev} |\n`;
    md += `| Min | ${data.linesOfCode.min} |\n`;
    md += `| Max | ${data.linesOfCode.max} |\n`;
    md += `| All | ${data.linesOfCode.all.join(", ")} |\n\n`;

    // Variance
    md += `### 🔀 Code Variance\n\n`;
    const v = data.codeVariance;
    if (v.averageContentSimilarity !== null) {
      md += `**Average content similarity:** ${v.averageContentSimilarity} (0 = completely different, 1 = identical)\n\n`;
      md += `**Average structural similarity:** ${v.averageStructuralSimilarity}\n\n`;

      if (v.pairwiseContentSimilarity.length > 0) {
        md += `| Pair | Content Similarity | Structural Similarity |\n|------|-------------------|----------------------|\n`;
        for (let i = 0; i < v.pairwiseContentSimilarity.length; i++) {
          const cp = v.pairwiseContentSimilarity[i];
          const sp = v.pairwiseStructuralSimilarity[i];
          md += `| Iter ${cp.iterA} vs ${cp.iterB} | ${cp.similarity} | ${sp.similarity} |\n`;
        }
        md += `\n`;
      }
    } else {
      md += `${v.description}\n\n`;
    }

    // Fix Attempts
    md += `### 🔧 Fix Attempts\n\n`;
    const f = data.fixAttempts;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Average fixes per iteration | ${f.average} |\n`;
    md += `| Std Dev | ${f.stdDev} |\n`;
    md += `| Min | ${f.min} |\n`;
    md += `| Max | ${f.max} |\n`;
    md += `| Total fixes across all iterations | ${f.total} |\n`;
    md += `| Iterations clean on first try | ${f.iterationsCleanOnFirstTry}/${data.successfulIterations} |\n`;
    md += `| Iterations needing fixes | ${f.iterationsNeedingFixes}/${data.successfulIterations} |\n`;
    md += `| All | ${f.all.join(", ")} |\n\n`;

    if (f.perIteration.some((p) => p.fixAttempts > 0)) {
      md += `**Fix details:**\n\n`;
      for (const p of f.perIteration) {
        if (p.fixAttempts === 0) {
          md += `- **Iteration ${p.iteration}:** Clean on first try ✓\n`;
        } else {
          md += `- **Iteration ${p.iteration}:** ${p.fixAttempts} fix(es) needed\n`;
          for (const err of p.errors) {
            const shortErr = (err.fatalError || "unknown")
              .split("\n")[0]
              .slice(0, 120);
            md += `  - Fix #${err.attempt}: \`${shortErr}\`\n`;
          }
        }
      }
      md += `\n`;
    }

    // Components
    md += `### 🧩 ${dsConfig.name} Components\n\n`;
    const c = data.designSystemComponents;
    md += `| Metric | Value |\n|--------|-------|\n`;
    md += `| Unique UI components | ${c.uniqueUIComponents} |\n`;
    md += `| Unique icons | ${c.uniqueIcons} |\n`;
    md += `| Avg components/iteration | ${c.averageComponentsPerIteration} |\n\n`;

    if (c.uiComponentsList.length > 0) {
      md += `**UI Components:** ${c.uiComponentsList.map((x) => `\`${x}\``).join(", ")}\n\n`;
    }
    if (c.iconsList.length > 0) {
      md += `**Icons:** ${c.iconsList.map((x) => `\`${x}\``).join(", ")}\n\n`;
    }

    if (Object.keys(c.frequency).length > 0) {
      md += `**Component frequency** (across iterations):\n\n`;
      md += `| Component | Iterations Used |\n|-----------|-----------------|\n`;
      const sorted = Object.entries(c.frequency).sort((a, b) => b[1] - a[1]);
      for (const [comp, freq] of sorted) {
        const label = comp.startsWith("icon:")
          ? `🎨 ${comp.replace("icon:", "")}`
          : comp;
        md += `| ${label} | ${freq}/${data.successfulIterations} |\n`;
      }
      md += `\n`;
    }

    // Feedback
    md += `### 💬 ${dsConfig.name} Feedback\n\n`;
    const fb = data.feedback;
    if (fb.totalItems > 0) {
      md += `| Metric | Value |\n|--------|-------|\n`;
      md += `| Total feedback items | ${fb.totalItems} |\n`;
      md += `| Unique feedback items | ${fb.uniqueItems} |\n`;
      md += `| Avg per iteration | ${fb.averagePerIteration} |\n`;
      md += `| Iterations with feedback | ${fb.iterationsWithFeedback}/${data.successfulIterations} |\n\n`;

      // Category breakdown
      if (fb.categoriesSorted.length > 0) {
        md += `**By category:**\n\n`;
        md += `| Category | Count |\n|----------|-------|\n`;
        for (const cat of fb.categoriesSorted) {
          const emoji =
            {
              documentation: "📖",
              api: "⚙️",
              components: "🧩",
              theming: "🎨",
              icons: "🎯",
              dx: "🛠️",
              other: "📌",
            }[cat.category] || "📌";
          md += `| ${emoji} ${cat.category} | ${cat.count} |\n`;
        }
        md += `\n`;
      }

      // Summary: deduplicated list of all feedback
      md += `**All unique feedback:**\n\n`;
      for (const item of fb.allUniqueItems) {
        const catTag = `\`${item.category}\``;
        md += `- ${catTag} ${item.text} _(iteration ${item.iteration})_\n`;
      }
      md += `\n`;

      // Full line-item list per iteration
      md += `<details>\n<summary>Full feedback by iteration</summary>\n\n`;
      for (const p of fb.perIteration) {
        if (p.items.length === 0) {
          md += `**Iteration ${p.iteration}:** No feedback provided\n\n`;
        } else {
          md += `**Iteration ${p.iteration}** (${p.items.length} items):\n\n`;
          for (const item of p.items) {
            md += `- \`${item.category}\` ${item.text}\n`;
          }
          md += `\n`;
        }
      }
      md += `</details>\n\n`;
    } else {
      md += `No feedback was provided by the agent across any iteration.\n\n`;
    }

    // Accessibility
    md += `### ♿ Accessibility\n\n`;
    const a11y = data.accessibility;
    if (a11y && a11y.iterationsWithResults > 0) {
      md += `| Metric | Value |\n|--------|-------|\n`;
      md += `| Iterations tested | ${a11y.iterationsWithResults}/${a11y.totalIterations} |\n`;
      md += `| Total violations | ${a11y.totalViolations} |\n`;
      md += `| Avg violations/iteration | ${a11y.averageViolations} |\n`;
      md += `| Pass rate | ${a11y.passRate !== null ? round(a11y.passRate * 100, 1) + '%' : '—'} |\n\n`;

      // Top violations
      if (a11y.topViolations.length > 0) {
        md += `**Most common violations (axe-core):**\n\n`;
        md += `| Rule | Impact | Modes | Occurrences | Description |\n|------|--------|-------|-------------|-------------|\n`;
        for (const v of a11y.topViolations.slice(0, 15)) {
          const modes = (v.modes || []).join(', ') || '—';
          md += `| \`${v.id}\` | ${v.impact || '—'} | ${modes} | ${v.count}/${a11y.iterationsWithResults} | ${(v.description || '').slice(0, 80)} |\n`;
        }
        md += `\n`;
      }

      // Per-iteration summary
      md += `**Per iteration:**\n\n`;
      md += `| Iteration | Violations | Light | Dark-only | Status |\n|-----------|-----------|-------|-----------|--------|\n`;
      for (const p of a11y.perIteration) {
        const icon = p.passed ? '✓' : '✗';
        md += `| ${p.iteration} | ${p.violations} | ${p.lightViolations} | ${p.darkOnlyViolations} | ${icon} |\n`;
      }
      md += `\n`;
    } else {
      md += `No accessibility results collected for this prompt.\n\n`;
    }

    // Performance
    md += `### ⚡ Performance\n\n`;
    const perf = data.performance;
    if (perf && perf.iterationsWithResults > 0) {
      md += `| Metric | Value |\n|--------|-------|\n`;
      md += `| Iterations measured | ${perf.iterationsWithResults}/${data.successfulIterations} |\n`;
      md += `| Lighthouse runs / iteration | ${perf.runsPerIteration} |\n`;
      if (perf.avgFcpMs !== null) {
        md += `| Avg FCP | ${perf.avgFcpMs}ms |\n`;
      }
      if (perf.avgLcpMs !== null) {
        md += `| Avg LCP | ${perf.avgLcpMs}ms |\n`;
      }
      if (perf.avgTbtMs !== null) {
        md += `| Avg TBT (Total Blocking Time) | ${perf.avgTbtMs}ms |\n`;
      }
      if (perf.avgTtiMs !== null) {
        md += `| Avg TTI (Time to Interactive) | ${perf.avgTtiMs}ms |\n`;
      }
      if (perf.avgSpeedIndex !== null) {
        md += `| Avg Speed Index | ${perf.avgSpeedIndex}ms |\n`;
      }
      if (perf.avgPerformanceScore !== null) {
        md += `| Avg Lighthouse score | ${perf.avgPerformanceScore} |\n`;
      }
      if (perf.reactMountMs !== null) {
        md += `| Avg React initial mount | ${perf.reactMountMs}ms |\n`;
      }
      if (perf.avgReactCommitCount !== null) {
        md += `| Avg React commit count | ${perf.avgReactCommitCount} |\n`;
      }
      if (perf.avgReactUpdateMs !== null) {
        md += `| Avg React update time | ${perf.avgReactUpdateMs}ms |\n`;
      }
      md += `\n`;

      if (perf.perIteration.length > 0) {
        const hasReact = perf.perIteration.some((p) => p.reactMountMs !== null);
        if (hasReact) {
          md += `| Iteration | FCP (ms) | TBT (ms) | Score | React mount (ms) | React commits | React avg update (ms) |\n`;
          md += `|-----------|----------|----------|-------|------------------|---------------|----------------------|\n`;
          for (const p of perf.perIteration) {
            const fcp    = p.fcpMs            ?? "N/A";
            const tbt    = p.tbtMs            ?? "N/A";
            const score  = p.performanceScore ?? "N/A";
            const mount  = p.reactMountMs     ?? "N/A";
            const count  = p.reactCommitCount ?? "N/A";
            const update = p.reactAvgUpdateMs ?? "N/A";
            md += `| ${p.iteration} | ${fcp} | ${tbt} | ${score} | ${mount} | ${count} | ${update} |\n`;
          }
        } else {
          md += `| Iteration | FCP (ms) | LCP (ms) | TBT (ms) | TTI (ms) | Score |\n`;
          md += `|-----------|----------|----------|----------|----------|-------|\n`;
          for (const p of perf.perIteration) {
            const fcp   = p.fcpMs            ?? "N/A";
            const lcp   = p.lcpMs            ?? "N/A";
            const tbt   = p.tbtMs            ?? "N/A";
            const tti   = p.ttiMs            ?? "N/A";
            const score = p.performanceScore ?? "N/A";
            md += `| ${p.iteration} | ${fcp} | ${lcp} | ${tbt} | ${tti} | ${score} |\n`;
          }
        }
        md += `\n`;
      }
    } else {
      md += `No performance data collected for this prompt.\n\n`;
    }

    // Component Usage Counts
    md += `### 🧩 Component Usage Counts\n\n`;
    const cu = data.componentUsageCounts;
    if (cu && cu.totalAcrossIterations > 0) {
      md += `| Metric | Value |\n|--------|-------|\n`;
      md += `| Total component instances | ${cu.totalAcrossIterations} |\n`;
      md += `| Unique component types | ${Object.keys(cu.byComponent).length} |\n`;
      md += `| Average per iteration | ${cu.averagePerIteration} |\n`;
      md += `| Iterations measured | ${cu.iterationsWithData}/${data.successfulIterations} |\n\n`;

      if (Object.keys(cu.byComponent).length > 0) {
        md += `**By component (total instances across all iterations):**\n\n`;
        md += `| Component | Total Uses |\n|-----------|------------|\n`;
        const sorted = Object.entries(cu.byComponent).sort((a, b) => b[1] - a[1]);
        for (const [comp, count] of sorted) {
          md += `| \`${comp}\` | ${count} |\n`;
        }
        md += `\n`;
      }

      if (cu.perIteration.length > 0) {
        md += `**Per iteration:**\n\n`;
        md += `| Iteration | Total | Top component |\n|-----------|-------|---------------|\n`;
        for (const p of cu.perIteration) {
          const top = Object.entries(p.byComponent).sort((a, b) => b[1] - a[1])[0];
          const topStr = top ? `\`${top[0]}\` (${top[1]})` : "—";
          md += `| ${p.iteration} | ${p.total} | ${topStr} |\n`;
        }
        md += `\n`;
      }
    } else {
      md += `No component usage data available.\n\n`;
    }

    // Inline Styles
    md += `### 🎨 Inline Styles\n\n`;
    const is = data.inlineStyles;
    if (is && is.totalAcrossIterations > 0) {
      md += `| Metric | Value |\n|--------|-------|\n`;
      md += `| Total inline \`style={{}}\` usages | ${is.totalAcrossIterations} |\n`;
      md += `| Average per iteration | ${is.averagePerIteration} |\n`;
      md += `| Iterations measured | ${is.iterationsWithData}/${data.successfulIterations} |\n\n`;

      if (Object.keys(is.byComponent).length > 0) {
        md += `**By component (across all iterations):**\n\n`;
        md += `| Component | Inline Style Count | % of Instances |\n|-----------|--------------------|-----------------|\n`;
        const sorted = Object.entries(is.byComponent).sort((a, b) => b[1] - a[1]);
        const totalUsage = data.componentUsageCounts?.byComponent || {};
        for (const [comp, count] of sorted) {
          const totalInstances = totalUsage[comp] || 0;
          const pct = totalInstances > 0
            ? `${Math.round((count / totalInstances) * 100)}%`
            : "—";
          md += `| \`${comp}\` | ${count} | ${pct} |\n`;
        }
        md += `\n`;
      }

    // DOM Elements
    const dom = data.domElements;
    if (dom && dom.iterationsWithData > 0) {
      md += `### 🏗️ DOM Elements\n\n`;
      md += `| Metric | Value |\n|--------|-------|\n`;
      md += `| Average | ${dom.average} |\n`;
      md += `| Std Dev | ${dom.stdDev} |\n`;
      md += `| Min | ${dom.min} |\n`;
      md += `| Max | ${dom.max} |\n`;
      md += `| Iterations measured | ${dom.iterationsWithData}/${dom.totalIterations} |\n\n`;

      if (dom.perIteration.length > 0) {
        md += `**Per iteration:**\n\n`;
        md += `| Iteration | DOM Elements |\n|-----------|-------------|\n`;
        for (const d of dom.perIteration) {
          md += `| ${d.iteration} | ${d.count.toLocaleString()} |\n`;
        }
        md += `\n`;
      }
    }

    // Semantic HTML
    const sem = data.semanticHtml;
    if (sem && sem.iterationsWithData > 0) {
      md += `### 🏷️ Semantic HTML\n\n`;
      md += `| Metric | Value |\n|--------|-------|\n`;
      md += `| Avg semantic elements | ${sem.avgSemanticCount} |\n`;
      md += `| Avg generic elements (div/span) | ${sem.avgGenericCount} |\n`;
      md += `| Avg \`role\` attributes | ${sem.avgRoleCount} |\n`;
      md += `| Semantic ratio | ${sem.avgSemanticRatio}% |\n`;
      md += `| Iterations measured | ${sem.iterationsWithData}/${sem.totalIterations} |\n\n`;

      // Semantic tags breakdown
      const semTags = Object.entries(sem.globalSemanticByTag).sort((a, b) => b[1] - a[1]);
      if (semTags.length > 0) {
        md += `**Semantic tags used:**\n\n`;
        md += `| Tag | Count |\n|-----|-------|\n`;
        for (const [tag, count] of semTags) {
          md += `| \`<${tag}>\` | ${count} |\n`;
        }
        md += `\n`;
      }

      // Generic tags
      const genTags = Object.entries(sem.globalGenericByTag).sort((a, b) => b[1] - a[1]);
      if (genTags.length > 0) {
        md += `**Generic tags:**\n\n`;
        md += `| Tag | Count |\n|-----|-------|\n`;
        for (const [tag, count] of genTags) {
          md += `| \`<${tag}>\` | ${count} |\n`;
        }
        md += `\n`;
      }

      // Roles
      const roles = Object.entries(sem.globalRolesByValue).sort((a, b) => b[1] - a[1]);
      if (roles.length > 0) {
        md += `**ARIA roles:**\n\n`;
        md += `| Role | Count |\n|------|-------|\n`;
        for (const [role, count] of roles) {
          md += `| \`${role}\` | ${count} |\n`;
        }
        md += `\n`;
      }

      // Per iteration
      if (sem.perIteration.length > 0) {
        md += `**Per iteration:**\n\n`;
        md += `| Iteration | Semantic | Generic | Roles | Ratio |\n|-----------|----------|---------|-------|-------|\n`;
        for (const p of sem.perIteration) {
          md += `| ${p.iteration} | ${p.semanticCount} | ${p.genericCount} | ${p.roleCount} | ${p.semanticRatio}% |\n`;
        }
        md += `\n`;
      }
    }

      if (is.topProperties && is.topProperties.length > 0) {
        md += `**Most common inline CSS properties:**\n\n`;
        md += `| Property | Occurrences | % of Total |\n|----------|-------------|------------|\n`;
        for (const { property, count } of is.topProperties.slice(0, 15)) {
          const pct = is.totalAcrossIterations > 0
            ? round((count / is.totalAcrossIterations) * 100, 1)
            : 0;
          md += `| \`${property}\` | ${count} | ${pct}% |\n`;
        }
        md += `\n`;
      }

      if (is.perIteration.length > 0) {
        md += `**Per iteration:**\n\n`;
        md += `| Iteration | Total | Top component |\n|-----------|-------|---------------|\n`;
        for (const p of is.perIteration) {
          const top = Object.entries(p.byComponent).sort((a, b) => b[1] - a[1])[0];
          const topStr = top ? `\`${top[0]}\` (${top[1]})` : "—";
          md += `| ${p.iteration} | ${p.total} | ${topStr} |\n`;
        }
        md += `\n`;
      }
    } else {
      md += `No inline style data available.\n\n`;
    }

    // Visual Diff
    md += `### 🖼️ Visual Diff\n\n`;
    const vd = data.visualDiff;
    if (vd && vd.averageDiffPercent !== null) {
      md += `| Metric | Value |\n|--------|-------|\n`;
      md += `| Average difference | ${vd.averageDiffPercent}% |\n`;
      md += `| Min difference | ${vd.minDiffPercent}% |\n`;
      md += `| Max difference | ${vd.maxDiffPercent}% |\n`;
      md += `| Iterations compared | ${vd.iterationsCompared} |\n\n`;

      md += `_${vd.description}_\n\n`;

      if (vd.pairwiseDiffs.length > 0) {
        md += `| Pair | Diff % | Changed Pixels | Total Pixels |\n|------|--------|----------------|---------------|\n`;
        for (const d of vd.pairwiseDiffs) {
          md += `| Iter ${d.iterA} vs ${d.iterB} | ${d.diffPercent}% | ${d.diffPixels.toLocaleString()} | ${d.totalPixels.toLocaleString()} |\n`;
        }
        md += `\n`;

        // Link diff images if they exist
        const withImages = vd.pairwiseDiffs.filter((d) => d.diffImagePath);
        if (withImages.length > 0) {
          md += `**Diff images:**\n\n`;
          for (const d of withImages) {
            const relPath = d.diffImagePath.split("/output/").pop();
            md += `- Iter ${d.iterA} vs ${d.iterB}: ![diff](${relPath})\n`;
          }
          md += `\n`;
        }
      }
    } else {
      md += `${vd?.description || "No visual diff data available."}\n\n`;
    }

    // Screenshots
    if (data.screenshots.length > 0) {
      md += `### 📸 Screenshots\n\n`;
      for (const ss of data.screenshots) {
        const relPath = ss.split("/output/").pop();
        md += `![${relPath}](${relPath})\n\n`;
      }
    }

    // Token usage
    if (data.tokenUsage.avgInputTokens !== null) {
      md += `### 🔤 Token Usage\n\n`;
      md += `| Metric | Value |\n|--------|-------|\n`;
      md += `| Avg input tokens | ${data.tokenUsage.avgInputTokens} |\n`;
      md += `| Avg output tokens | ${data.tokenUsage.avgOutputTokens} |\n`;
      md += `| Total input tokens | ${data.tokenUsage.totalInputTokens} |\n`;
      md += `| Total output tokens | ${data.tokenUsage.totalOutputTokens} |\n\n`;
    }
  }

  return md;
}

// --- Utility functions ---

/**
 * Analyze performance results across iterations.
 */
export function analyzePerformance(iterations) {
  const withResults = iterations.filter(
    (r) => r.perfResults && !r.perfResults.error,
  );

  if (withResults.length === 0) {
    return {
      iterationsWithResults: 0,
      totalIterations: iterations.length,
      avgFcpMs: null,
      avgLcpMs: null,
      avgTbtMs: null,
      avgTtiMs: null,
      avgSpeedIndex: null,
      avgPerformanceScore: null,
      runsPerIteration: 0,
      reactMountMs: null,
      avgReactCommitCount: null,
      avgReactUpdateMs: null,
      perIteration: [],
    };
  }

  const fcpValues   = withResults.map((r) => r.perfResults.fcpMs).filter((v) => v !== null);
  const lcpValues   = withResults.map((r) => r.perfResults.lcpMs).filter((v) => v !== null);
  const tbtValues   = withResults.map((r) => r.perfResults.tbtMs).filter((v) => v !== null);
  const ttiValues   = withResults.map((r) => r.perfResults.ttiMs).filter((v) => v !== null);
  const siValues    = withResults.map((r) => r.perfResults.speedIndex).filter((v) => v !== null);
  const scoreValues = withResults.map((r) => r.perfResults.performanceScore).filter((v) => v !== null);

  // React Profiler — only present when the page used a dev-mode React build.
  const reactMountValues      = withResults.map((r) => r.perfResults.reactProfile?.mountMs).filter((v) => v != null);
  const reactCommitCounts     = withResults.map((r) => r.perfResults.reactProfile?.commitCount).filter((v) => v != null);
  const reactAvgUpdateValues  = withResults.map((r) => r.perfResults.reactProfile?.avgUpdateMs).filter((v) => v != null);

  const perIteration = withResults.map((r) => ({
    iteration:        r.iteration,
    fcpMs:            r.perfResults.fcpMs,
    lcpMs:            r.perfResults.lcpMs,
    tbtMs:            r.perfResults.tbtMs ?? null,
    ttiMs:            r.perfResults.ttiMs ?? null,
    speedIndex:       r.perfResults.speedIndex ?? null,
    performanceScore: r.perfResults.performanceScore ?? null,
    runCount:         r.perfResults.runs ?? 0,
    reactMountMs:     r.perfResults.reactProfile?.mountMs ?? null,
    reactCommitCount: r.perfResults.reactProfile?.commitCount ?? null,
    reactAvgUpdateMs: r.perfResults.reactProfile?.avgUpdateMs ?? null,
    reactMaxUpdateMs: r.perfResults.reactProfile?.maxUpdateMs ?? null,
  }));

  return {
    iterationsWithResults: withResults.length,
    totalIterations:       iterations.length,
    avgFcpMs:              fcpValues.length        > 0 ? round(mean(fcpValues))           : null,
    avgLcpMs:              lcpValues.length        > 0 ? round(mean(lcpValues))           : null,
    avgTbtMs:              tbtValues.length        > 0 ? round(mean(tbtValues))           : null,
    avgTtiMs:              ttiValues.length        > 0 ? round(mean(ttiValues))           : null,
    avgSpeedIndex:         siValues.length         > 0 ? round(mean(siValues))            : null,
    avgPerformanceScore:   scoreValues.length      > 0 ? round(mean(scoreValues))         : null,
    runsPerIteration:      withResults[0]?.perfResults?.runs ?? 0,
    reactMountMs:          reactMountValues.length > 0 ? round(mean(reactMountValues))    : null,
    avgReactCommitCount:   reactCommitCounts.length > 0 ? round(mean(reactCommitCounts))  : null,
    avgReactUpdateMs:      reactAvgUpdateValues.length > 0 ? round(mean(reactAvgUpdateValues)) : null,
    perIteration,
  };
}

/**
 * Aggregate inline style usage across iterations.
 */
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
    for (const [comp, count] of Object.entries(byComponent || {})) {
      globalByComponent[comp] = (globalByComponent[comp] || 0) + count;
    }
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
  const withData = iterations.filter(
    (r) => r.inlineStyles && r.inlineStyles.total !== undefined,
  );

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
    for (const [comp, count] of Object.entries(byComponent || {})) {
      globalByComponent[comp] = (globalByComponent[comp] || 0) + count;
    }
    for (const [prop, count] of Object.entries(byProperty || {})) {
      globalByProperty[prop] = (globalByProperty[prop] || 0) + count;
    }
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
  const withData = iterations.filter(
    (r) => r.semanticHtml && r.semanticHtml.total !== undefined,
  );

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
    for (const [tag, count] of Object.entries(s.semanticByTag || {})) {
      globalSemanticByTag[tag] = (globalSemanticByTag[tag] || 0) + count;
    }
    for (const [tag, count] of Object.entries(s.genericByTag || {})) {
      globalGenericByTag[tag] = (globalGenericByTag[tag] || 0) + count;
    }
    for (const [role, count] of Object.entries(s.rolesByValue || {})) {
      globalRolesByValue[role] = (globalRolesByValue[role] || 0) + count;
    }
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
    avgSemanticCount: round(mean(semanticCounts)),
    avgGenericCount: round(mean(genericCounts)),
    avgRoleCount: round(mean(roleCounts)),
    avgSemanticRatio: round(mean(ratios), 1),
    globalSemanticByTag,
    globalGenericByTag,
    globalRolesByValue,
    perIteration,
  };
}

export function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

export function stdDev(arr) {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const squareDiffs = arr.map((v) => (v - avg) ** 2);
  return Math.sqrt(mean(squareDiffs));
}

export function round(n, decimals = 3) {
  if (n === null || n === undefined || isNaN(n)) return n;
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

/**
 * Create a set of character n-grams from a string.
 */
export function ngramSet(text, n) {
  const set = new Set();
  const normalized = text.replace(/\s+/g, " ").trim();
  for (let i = 0; i <= normalized.length - n; i++) {
    set.add(normalized.substring(i, i + n));
  }
  return set;
}

/**
 * Compute Jaccard similarity between two sets.
 */
export function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}
