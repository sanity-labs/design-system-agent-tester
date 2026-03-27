import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Generate a report from all test results.
 *
 * @param {Record<string, Array<object>>} allResults - Keyed by prompt name, array of iteration results
 * @param {string} outputDir - Base output directory
 */
export async function generateReport(allResults, outputDir) {
  const report = {
    generatedAt: new Date().toISOString(),
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

    // 4. Unique Sanity UI components
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
      sanityUIComponents: componentAnalysis,
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
function computeCodeVariance(iterations) {
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
function analyzeFeedback(iterations) {
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
 * Analyze Sanity UI component usage across iterations.
 */
function analyzeComponents(iterations) {
  const allComponents = new Set();
  const perIteration = [];

  for (const iter of iterations) {
    const comps = iter.sanityUIComponents || [];
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
      (iter.sanityUIComponents || []).includes(comp),
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
function analyzeAccessibility(iterations) {
  const withA11y = iterations.filter((r) => r.a11yResults != null);

  if (withA11y.length === 0) {
    return {
      iterationsWithResults: 0,
      totalIterations: iterations.length,
      description: "No accessibility results collected",
    };
  }

  // Aggregate per-test pass/fail/skip counts — keyed to the accessibility
  // checklist categories from accessibility-standards.md
  const testNames = [
    "semantic-structure",
    "keyboard-interaction",
    "focus-management",
    "aria-conventions",
    "screen-reader",
    "contrast-and-color",
    "motion",
    "touch-targets",
    "heading-hierarchy",
    "spacing-and-reflow",
    "axe-core-full",
  ];

  const perTest = {};
  for (const name of testNames) {
    perTest[name] = { passed: 0, failed: 0, skipped: 0 };
  }

  let totalAxeViolations = 0;
  const allAxeViolationIds = {};
  const perIteration = [];

  for (const iter of withA11y) {
    const a11y = iter.a11yResults;
    const summary = a11y.summary || { passed: 0, failed: 0, skipped: 0 };

    perIteration.push({
      iteration: iter.iteration,
      passed: summary.passed,
      failed: summary.failed,
      skipped: summary.skipped,
      axeViolationCount: a11y.axeViolationCount || 0,
    });

    totalAxeViolations += a11y.axeViolationCount || 0;

    // Count per-test status
    for (const name of testNames) {
      const test = a11y.tests?.[name];
      if (!test) {
        perTest[name].skipped++;
      } else if (test.status === "passed") {
        perTest[name].passed++;
      } else if (test.status === "failed") {
        perTest[name].failed++;
      } else {
        perTest[name].skipped++;
      }
    }

    // Collect unique axe violation IDs across iterations
    for (const v of a11y.axeViolations || []) {
      const id = v.id || "unknown";
      if (!allAxeViolationIds[id]) {
        allAxeViolationIds[id] = {
          id,
          impact: v.impact,
          description: v.description,
          helpUrl: v.helpUrl,
          count: 0,
        };
      }
      allAxeViolationIds[id].count++;
    }
  }

  // Compute pass rate per test
  const testPassRates = {};
  for (const name of testNames) {
    const t = perTest[name];
    const tested = t.passed + t.failed;
    testPassRates[name] = {
      ...t,
      passRate: tested > 0 ? round(t.passed / tested) : null,
    };
  }

  // Sort violations by frequency
  const topViolations = Object.values(allAxeViolationIds).sort(
    (a, b) => b.count - a.count,
  );

  return {
    iterationsWithResults: withA11y.length,
    totalIterations: iterations.length,
    totalAxeViolations,
    averageAxeViolations: round(totalAxeViolations / withA11y.length),
    testPassRates,
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
    md += `### 🧩 Sanity UI Components\n\n`;
    const c = data.sanityUIComponents;
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
    md += `### 💬 Sanity UI Feedback\n\n`;
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
      md += `| Total axe violations | ${a11y.totalAxeViolations} |\n`;
      md += `| Avg axe violations/iteration | ${a11y.averageAxeViolations} |\n\n`;

      // Per-test pass rates
      md += `**Test pass rates:**\n\n`;
      md += `| Test | Passed | Failed | Skipped | Pass Rate |\n|------|--------|--------|---------|----------|\n`;
      for (const [name, t] of Object.entries(a11y.testPassRates)) {
        const rate =
          t.passRate !== null ? `${round(t.passRate * 100, 1)}%` : "—";
        md += `| ${name} | ${t.passed} | ${t.failed} | ${t.skipped} | ${rate} |\n`;
      }
      md += `\n`;

      // Top violations
      if (a11y.topViolations.length > 0) {
        md += `**Most common axe violations:**\n\n`;
        md += `| Violation | Impact | Occurrences | Description |\n|-----------|--------|-------------|-------------|\n`;
        for (const v of a11y.topViolations.slice(0, 10)) {
          md += `| \`${v.id}\` | ${v.impact || "—"} | ${v.count}/${a11y.iterationsWithResults} | ${(v.description || "").slice(0, 80)} |\n`;
        }
        md += `\n`;
      }

      // Per-iteration summary
      md += `**Per iteration:**\n\n`;
      for (const p of a11y.perIteration) {
        const icon = p.failed === 0 ? "✓" : "✗";
        md += `- **Iteration ${p.iteration}:** ${icon} ${p.passed} passed, ${p.failed} failed, ${p.skipped} skipped (${p.axeViolationCount} axe violations)\n`;
      }
      md += `\n`;
    } else {
      md += `No accessibility results collected for this prompt.\n\n`;
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

function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function sum(arr) {
  return arr.reduce((a, b) => a + b, 0);
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const squareDiffs = arr.map((v) => (v - avg) ** 2);
  return Math.sqrt(mean(squareDiffs));
}

function round(n, decimals = 3) {
  if (n === null || n === undefined || isNaN(n)) return n;
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

/**
 * Create a set of character n-grams from a string.
 */
function ngramSet(text, n) {
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
function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}
