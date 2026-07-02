/**
 * Markdown rendering for the report. Consumes the aggregated `report`
 * object built by report.js and emits the human-readable report.md. No
 * aggregation logic here — that lives in aggregators.js.
 */
import { relative } from "node:path";
import dsConfig from "../config/load.js";
import { extractMetrics, formatBytes, renderMetricsTables } from "./aggregate.js";
import { round } from "./stats.js";

// Render a possibly-null metric cell: null/undefined (e.g. every iteration
// failed, so there's nothing to aggregate) and NaN both show as a dash —
// never the literal "NaN".
function cell(value, suffix = "") {
  if (value == null || (typeof value === "number" && Number.isNaN(value))) {
    return "—";
  }
  return `${value}${suffix}`;
}

/**
 * Make an absolute artifact path relative to the run directory, so links in
 * report.md (which lives in `runDir`) resolve regardless of where the output
 * directory sits or what it's named. Falls back to the absolute path if no
 * run dir is known.
 */
function linkPath(absPath, runDir) {
  if (!absPath) return absPath;
  return runDir ? relative(runDir, absPath) : absPath;
}

/**
 * A two-column `| Metric | Value |` table. `rows` is an array of
 * `[label, value]` pairs; falsy entries are skipped so callers can inline
 * conditional rows as `cond && [label, value]`. Returns the table plus a
 * trailing blank line.
 */
function metricTable(rows) {
  let out = `| Metric | Value |\n|--------|-------|\n`;
  for (const r of rows) {
    if (r) out += `| ${r[0]} | ${r[1]} |\n`;
  }
  return out + `\n`;
}

/** Entries of a `{ key: count }` map, sorted by count descending. */
function sortedCounts(obj) {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

/** `` `Comp` (12) `` for the highest-count entry of a byComponent map, or "—". */
function topComponentCell(byComponent) {
  const top = sortedCounts(byComponent)[0];
  return top ? `\`${top[0]}\` (${top[1]})` : "—";
}

export function renderMarkdown(report, runDir = null) {
  let md = `# Agent Test Report\n\n`;
  md += `**Generated:** ${report.generatedAt}\n\n`;

  if (report.promptText) {
    md += `## Interface Brief\n\n`;
    md += `> ${report.promptText.split("\n").join("\n> ")}\n\n`;
  }

  // ─── TL;DR: headline metrics across all tests ──────────────────
  const labels = Object.keys(report.prompts);
  if (labels.length > 0) {
    const aggregatesByLabel = Object.fromEntries(
      labels.map((label) => [label, extractMetrics(report.prompts[label])]),
    );
    md += `## Summary\n\n`;
    md += renderMetricsTables(labels, aggregatesByLabel);
    md += `\n`;
  }

  for (const [promptKey, data] of Object.entries(report.prompts)) {
    md += `---\n\n`;
    md += `## Prompt: \`${promptKey}\`\n\n`;
    md += metricTable([
      data.model && ["Model", `\`${data.model}\``],
      // Non-default request settings the runner applied for this model —
      // results in this section were produced under these overrides, not
      // provider defaults.
      data.modelTuning && ["Model tuning", `\`${JSON.stringify(data.modelTuning)}\``],
      ["Total iterations", data.totalIterations],
      ["Successful", data.successfulIterations],
      ["Failed", data.failedIterations],
      // Show the built/un-built split so it's obvious when runtime
      // metrics below were computed on a subset.
      data.builtIterations != null && ["Built (render-OK)", data.builtIterations],
      data.unbuiltIterations ? ["Build failed", data.unbuiltIterations] : null,
    ]);

    // Timing
    md += `### Timing\n\n`;
    md += metricTable([
      ["Average", cell(data.timing.averageSeconds, "s")],
      ["Std Dev", cell(data.timing.stdDevSeconds, "s")],
      ["Min", cell(data.timing.minSeconds, "s")],
      ["Max", cell(data.timing.maxSeconds, "s")],
      ["All", data.timing.allTimesSeconds.map((t) => `${t}s`).join(", ")],
    ]);

    // LOC
    md += `### Lines of Code\n\n`;
    md += metricTable([
      ["Average", cell(data.linesOfCode.average)],
      ["Std Dev", cell(data.linesOfCode.stdDev)],
      ["Min", cell(data.linesOfCode.min)],
      ["Max", cell(data.linesOfCode.max)],
      ["All", data.linesOfCode.all.join(", ")],
    ]);

    // Variance
    md += `### Code Variance\n\n`;
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
    md += `### Fix Attempts\n\n`;
    const f = data.fixAttempts;
    md += metricTable([
      ["Average fixes per iteration", cell(f.average)],
      ["Std Dev", cell(f.stdDev)],
      ["Min", cell(f.min)],
      ["Max", cell(f.max)],
      ["Total fixes across all iterations", f.total],
      [
        "Iterations clean on first try",
        `${f.iterationsCleanOnFirstTry}/${data.successfulIterations}`,
      ],
      ["Iterations needing fixes", `${f.iterationsNeedingFixes}/${data.successfulIterations}`],
      ["All", f.all.join(", ")],
    ]);

    if (f.perIteration.some((p) => p.fixAttempts > 0)) {
      md += `**Fix details:**\n\n`;
      for (const p of f.perIteration) {
        if (p.fixAttempts === 0) {
          md += `- **Iteration ${p.iteration}:** Clean on first try\n`;
        } else {
          md += `- **Iteration ${p.iteration}:** ${p.fixAttempts} fix(es) needed\n`;
          for (const err of p.errors) {
            const shortErr = (err.fatalError || "unknown").split("\n")[0].slice(0, 120);
            md += `  - Fix #${err.attempt}: \`${shortErr}\`\n`;
          }
        }
      }
      md += `\n`;
    }

    // npm install failures — counts retries the agent burned on
    // dependency-resolution problems instead of real code errors.
    const npm = data.npmInstall;
    if (npm) {
      md += `### npm install failures\n\n`;
      md += metricTable([
        ["Total failures", npm.total],
        [
          "Iterations with at least one failure",
          `${npm.affectedIterations}/${npm.totalIterations}`,
        ],
      ]);
      const offenders = npm.perIteration.filter((p) => p.failures > 0);
      if (offenders.length > 0) {
        md += `**Per-iteration breakdown:**\n\n`;
        for (const p of offenders) {
          md += `- **Iteration ${p.iteration}:** ${p.failures} failure(s)\n`;
        }
        md += `\n`;
      }
    }

    // Repair Loop — where iterations exited and residual lint/axe state.
    const rl = data.repairLoop;
    if (rl && rl.measured > 0) {
      md += `### Repair Loop\n\n`;
      md += `Where each iteration exited the ordered lint → build → accessibility loop, and how many violations remained.\n\n`;
      md += `| Exit stage | Iterations |\n|------------|------------|\n`;
      md += `| ✓ clean (all gates passed) | ${rl.stageCounts.clean} |\n`;
      md += `| ✗ lint (budget exhausted) | ${rl.stageCounts.lint} |\n`;
      md += `| ✗ build (never rendered) | ${rl.stageCounts.build} |\n`;
      md += `| ✗ accessibility (violations remain) | ${rl.stageCounts.accessibility} |\n\n`;

      md += `| Gate | First-try avg | Residual avg | Clean first try | Still failing |\n`;
      md += `|------|---------------|--------------|-----------------|---------------|\n`;
      md += `| Lint | ${cell(rl.lint.firstTryAvg)} | ${cell(rl.lint.residualAvg)} | ${cell(rl.lint.iterationsCleanFirstTry)}/${rl.measured} | ${rl.lint.iterationsWithResidual} |\n`;
      md += `| Accessibility (axe) | ${cell(rl.axe.firstTryAvg)} | ${cell(rl.axe.residualAvg)} | ${cell(rl.axe.iterationsCleanFirstTry)}/${rl.measured} | ${rl.axe.iterationsWithResidual} |\n\n`;

      md += `**Per iteration:**\n\n`;
      for (const p of rl.perIteration) {
        const lintStr =
          p.firstTryLint != null ? `lint ${p.firstTryLint}→${p.residualLint ?? "?"}` : "lint n/a";
        const axeStr =
          p.firstTryAxe != null ? `axe ${p.firstTryAxe}→${p.residualAxe ?? "?"}` : "axe n/a";
        md += `- **Iteration ${p.iteration}:** exit \`${p.exitStage}\`, ${p.fixAttempts} fix(es) — ${lintStr}, ${axeStr}\n`;
      }
      md += `\n`;
    }

    // Components
    md += `### ${dsConfig.name} Components\n\n`;
    const c = data.componentImports;
    md += metricTable([
      ["Unique UI components", c.uniqueUIComponents],
      ["Unique icons", c.uniqueIcons],
      ["Avg components/iteration", c.averageComponentsPerIteration],
    ]);

    if (c.uiComponentsList.length > 0) {
      md += `**UI Components:** ${c.uiComponentsList.map((x) => `\`${x}\``).join(", ")}\n\n`;
    }
    if (c.iconsList.length > 0) {
      md += `**Icons:** ${c.iconsList.map((x) => `\`${x}\``).join(", ")}\n\n`;
    }

    if (Object.keys(c.frequency).length > 0) {
      md += `**Component frequency** (across iterations):\n\n`;
      md += `| Component | Iterations Used |\n|-----------|-----------------|\n`;
      for (const [comp, freq] of sortedCounts(c.frequency)) {
        const label = comp.startsWith("icon:") ? `icon: ${comp.replace("icon:", "")}` : comp;
        md += `| ${label} | ${freq}/${data.successfulIterations} |\n`;
      }
      md += `\n`;
    }

    // Feedback
    md += `### ${dsConfig.name} Feedback\n\n`;
    const fb = data.feedback;
    if (fb.totalItems > 0) {
      md += metricTable([
        ["Total feedback items", fb.totalItems],
        ["Unique feedback items", fb.uniqueItems],
        ["Avg per iteration", fb.averagePerIteration],
        ["Iterations with feedback", `${fb.iterationsWithFeedback}/${data.successfulIterations}`],
      ]);

      // Category breakdown
      if (fb.categoriesSorted.length > 0) {
        md += `**By category:**\n\n`;
        md += `| Category | Count |\n|----------|-------|\n`;
        for (const cat of fb.categoriesSorted) {
          md += `| ${cat.category} | ${cat.count} |\n`;
        }
        md += `\n`;
      }

      // Full line-item list per iteration
      md += `**Full feedback by iteration:**\n\n`;
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
    } else {
      md += `No feedback was provided by the agent across any iteration.\n\n`;
    }

    // Accessibility
    md += `### Accessibility\n\n`;
    const a11y = data.accessibility;
    if (a11y && a11y.iterationsWithResults > 0) {
      md += metricTable([
        ["Iterations tested", `${a11y.iterationsWithResults}/${a11y.totalIterations}`],
        ["Total violations", a11y.totalViolations],
        ["Avg violations/iteration", a11y.averageViolations],
        ["Pass rate", a11y.passRate !== null ? round(a11y.passRate * 100, 1) + "%" : "—"],
      ]);

      // Top violations
      if (a11y.topViolations.length > 0) {
        md += `**Most common violations (axe-core):**\n\n`;
        md += `| Rule | Impact | Modes | Occurrences | Description |\n|------|--------|-------|-------------|-------------|\n`;
        for (const v of a11y.topViolations.slice(0, 15)) {
          const modes = (v.modes || []).join(", ") || "—";
          md += `| \`${v.id}\` | ${v.impact || "—"} | ${modes} | ${v.count}/${a11y.iterationsWithResults} | ${(v.description || "").slice(0, 80)} |\n`;
        }
        md += `\n`;
      }

      // Per-iteration summary
      md += `**Per iteration:**\n\n`;
      md += `| Iteration | Violations | Light | Dark-only | Status |\n|-----------|-----------|-------|-----------|--------|\n`;
      for (const p of a11y.perIteration) {
        const status = p.passed ? "pass" : "fail";
        md += `| ${p.iteration} | ${p.violations} | ${p.lightViolations} | ${p.darkOnlyViolations} | ${status} |\n`;
      }
      md += `\n`;
    } else {
      md += `No accessibility results collected for this prompt.\n\n`;
    }

    // Lighthouse
    md += `### Lighthouse\n\n`;
    const lh = data.lighthouse;
    if (lh && lh.iterationsWithResults > 0) {
      md += `| Metric | Median | Mean |\n|--------|--------|------|\n`;
      const row = (label, med, mn, unit = "") => {
        const m = med != null ? `${med}${unit}` : "—";
        const a = mn != null ? `${mn}${unit}` : "—";
        return `| ${label} | ${m} | ${a} |\n`;
      };
      md += row("FCP", lh.medianFcpMs, lh.meanFcpMs, "ms");
      md += row("LCP", lh.medianLcpMs, lh.meanLcpMs, "ms");
      md += row("TBT (Total Blocking Time)", lh.medianTbtMs, lh.meanTbtMs, "ms");
      md += row("TTI (Time to Interactive)", lh.medianTtiMs, lh.meanTtiMs, "ms");
      md += row("Speed Index", lh.medianSpeedIndex, lh.meanSpeedIndex, "ms");
      md += row("Lighthouse score", lh.medianPerformanceScore, lh.meanPerformanceScore);
      md += `\n`;
      md += `_Median and mean both aggregate across ${lh.iterationsWithResults} iteration(s). Each iteration's number is itself the median (Median column) or mean (Mean column) of ${lh.runsPerIteration} intra-iteration Lighthouse runs. Large median↔mean gaps indicate a slow outlier in the lighthouse runs — usually CPU contention or a cold dev-server start._\n\n`;

      if (lh.perIteration.length > 0) {
        md += `**Per iteration** (median values):\n\n`;
        md += `| Iteration | FCP (ms) | LCP (ms) | TBT (ms) | TTI (ms) | Score |\n`;
        md += `|-----------|----------|----------|----------|----------|-------|\n`;
        for (const p of lh.perIteration) {
          const fcp = p.fcpMs ?? "N/A";
          const lcp = p.lcpMs ?? "N/A";
          const tbt = p.tbtMs ?? "N/A";
          const tti = p.ttiMs ?? "N/A";
          const score = p.performanceScore ?? "N/A";
          md += `| ${p.iteration} | ${fcp} | ${lcp} | ${tbt} | ${tti} | ${score} |\n`;
        }
        md += `\n`;
      }
    } else {
      md += `No Lighthouse data collected for this prompt.\n\n`;
    }

    // React Profiler
    md += `### React Profiler\n\n`;
    const rp = data.reactProfile;
    if (rp && rp.iterationsWithResults > 0) {
      md += metricTable([
        ["Iterations measured", `${rp.iterationsWithResults}/${data.successfulIterations}`],
        rp.avgMountMs !== null && ["Avg initial mount", `${rp.avgMountMs}ms`],
        rp.avgCommitCount !== null && ["Avg commit count", rp.avgCommitCount],
        rp.avgUpdateMs !== null && ["Avg update commit", `${rp.avgUpdateMs}ms`],
        rp.avgMaxUpdateMs !== null && ["Avg slowest update", `${rp.avgMaxUpdateMs}ms`],
      ]);

      if (rp.perIteration.length > 0) {
        md += `| Iteration | Mount (ms) | Commits | Avg update (ms) | Max update (ms) |\n`;
        md += `|-----------|-----------|---------|-----------------|-----------------|\n`;
        for (const p of rp.perIteration) {
          md += `| ${p.iteration} | ${p.mountMs ?? "N/A"} | ${p.commitCount ?? "N/A"} | ${p.avgUpdateMs ?? "N/A"} | ${p.maxUpdateMs ?? "N/A"} |\n`;
        }
        md += `\n`;
      }
    } else {
      md += `No React Profiler data collected for this prompt.\n\n`;
    }

    // Component Usage Counts
    md += `### Component Usage Counts\n\n`;
    const cu = data.componentUsageCounts;
    if (cu && cu.totalAcrossIterations > 0) {
      md += metricTable([
        ["Total component instances", cu.totalAcrossIterations],
        ["Unique component types", Object.keys(cu.byComponent).length],
        ["Average per iteration", cu.averagePerIteration],
        ["Iterations measured", `${cu.iterationsWithData}/${data.successfulIterations}`],
      ]);

      if (Object.keys(cu.byComponent).length > 0) {
        md += `**By component (total instances across all iterations):**\n\n`;
        md += `| Component | Total Uses |\n|-----------|------------|\n`;
        for (const [comp, count] of sortedCounts(cu.byComponent)) {
          md += `| \`${comp}\` | ${count} |\n`;
        }
        md += `\n`;
      }

      if (cu.perIteration.length > 0) {
        md += `**Per iteration:**\n\n`;
        md += `| Iteration | Total | Top component |\n|-----------|-------|---------------|\n`;
        for (const p of cu.perIteration) {
          md += `| ${p.iteration} | ${p.total} | ${topComponentCell(p.byComponent)} |\n`;
        }
        md += `\n`;
      }
    } else {
      md += `No component usage data available.\n\n`;
    }

    // Inline Styles
    md += `### Inline Styles\n\n`;
    const is = data.inlineStyles;
    if (is && is.totalAcrossIterations > 0) {
      md += metricTable([
        ["Total inline `style={{}}` usages", is.totalAcrossIterations],
        ["Average per iteration", is.averagePerIteration],
        ["Iterations measured", `${is.iterationsWithData}/${data.successfulIterations}`],
      ]);

      if (Object.keys(is.byComponent).length > 0) {
        md += `**By component (across all iterations):**\n\n`;
        md += `| Component | Inline Style Count | % of Instances |\n|-----------|--------------------|-----------------|\n`;
        const totalUsage = data.componentUsageCounts?.byComponent || {};
        for (const [comp, count] of sortedCounts(is.byComponent)) {
          const totalInstances = totalUsage[comp] || 0;
          const pct = totalInstances > 0 ? `${Math.round((count / totalInstances) * 100)}%` : "—";
          md += `| \`${comp}\` | ${count} | ${pct} |\n`;
        }
        md += `\n`;
      }

      if (is.topProperties && is.topProperties.length > 0) {
        md += `**Most common inline CSS properties:**\n\n`;
        md += `| Property | Occurrences | % of Total |\n|----------|-------------|------------|\n`;
        for (const { property, count } of is.topProperties.slice(0, 15)) {
          const pct =
            is.totalAcrossIterations > 0 ? round((count / is.totalAcrossIterations) * 100, 1) : 0;
          md += `| \`${property}\` | ${count} | ${pct}% |\n`;
        }
        md += `\n`;
      }

      if (is.perIteration.length > 0) {
        md += `**Per iteration:**\n\n`;
        md += `| Iteration | Total | Top component |\n|-----------|-------|---------------|\n`;
        for (const p of is.perIteration) {
          md += `| ${p.iteration} | ${p.total} | ${topComponentCell(p.byComponent)} |\n`;
        }
        md += `\n`;
      }
    } else {
      md += `No inline style data available.\n\n`;
    }

    // DOM Elements
    const dom = data.domElements;
    if (dom && dom.iterationsWithData > 0) {
      md += `### DOM Elements\n\n`;
      const domHasBytes = dom.htmlBytesAverage != null;
      md += metricTable([
        ["Average elements", dom.average],
        ["Std Dev (elements)", dom.stdDev],
        ["Min elements", dom.min],
        ["Max elements", dom.max],
        domHasBytes && ["Avg HTML size", formatBytes(dom.htmlBytesAverage)],
        domHasBytes && ["Std Dev (HTML size)", formatBytes(dom.htmlBytesStdDev)],
        domHasBytes && ["Min HTML size", formatBytes(dom.htmlBytesMin)],
        domHasBytes && ["Max HTML size", formatBytes(dom.htmlBytesMax)],
        ["Iterations measured", `${dom.iterationsWithData}/${dom.totalIterations}`],
      ]);

      if (dom.perIteration.length > 0) {
        md += `**Per iteration:**\n\n`;
        const hasBytes = dom.perIteration.some((d) => d.htmlBytes != null);
        if (hasBytes) {
          md += `| Iteration | DOM Elements | HTML size |\n|-----------|--------------|----------|\n`;
          for (const d of dom.perIteration) {
            const size = d.htmlBytes != null ? formatBytes(d.htmlBytes) : "—";
            md += `| ${d.iteration} | ${d.count.toLocaleString()} | ${size} |\n`;
          }
        } else {
          md += `| Iteration | DOM Elements |\n|-----------|-------------|\n`;
          for (const d of dom.perIteration) {
            md += `| ${d.iteration} | ${d.count.toLocaleString()} |\n`;
          }
        }
        md += `\n`;
      }
    }

    // Semantic HTML
    const sem = data.semanticHtml;
    if (sem && sem.iterationsWithData > 0) {
      md += `### Semantic HTML\n\n`;
      md += metricTable([
        ["Avg semantic elements", sem.avgSemanticCount],
        ["Avg generic elements (div/span)", sem.avgGenericCount],
        ["Avg `role` attributes", sem.avgRoleCount],
        ["Semantic ratio", `${sem.avgSemanticRatio}%`],
        ["Iterations measured", `${sem.iterationsWithData}/${sem.totalIterations}`],
      ]);

      // Semantic tags breakdown
      const semTags = sortedCounts(sem.globalSemanticByTag);
      if (semTags.length > 0) {
        md += `**Semantic tags used:**\n\n`;
        md += `| Tag | Count |\n|-----|-------|\n`;
        for (const [tag, count] of semTags) {
          md += `| \`<${tag}>\` | ${count} |\n`;
        }
        md += `\n`;
      }

      // Generic tags
      const genTags = sortedCounts(sem.globalGenericByTag);
      if (genTags.length > 0) {
        md += `**Generic tags:**\n\n`;
        md += `| Tag | Count |\n|-----|-------|\n`;
        for (const [tag, count] of genTags) {
          md += `| \`<${tag}>\` | ${count} |\n`;
        }
        md += `\n`;
      }

      // Roles
      const roles = sortedCounts(sem.globalRolesByValue);
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

    // Visual Diff
    md += `### Visual Diff\n\n`;
    const vd = data.visualDiff;
    if (vd && vd.averageDiffPercent !== null) {
      md += metricTable([
        ["Average difference", `${vd.averageDiffPercent}%`],
        ["Min difference", `${vd.minDiffPercent}%`],
        ["Max difference", `${vd.maxDiffPercent}%`],
        ["Iterations compared", vd.iterationsCompared],
      ]);

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
            const relPath = linkPath(d.diffImagePath, runDir);
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
      md += `### Screenshots\n\n`;
      for (const ss of data.screenshots) {
        const relPath = linkPath(ss, runDir);
        md += `![${relPath}](${relPath})\n\n`;
      }
    }

    // Token usage
    if (data.tokenUsage.avgInputTokens !== null) {
      const tu = data.tokenUsage;
      md += `### Token Usage\n\n`;
      md += `Input breakdown (per iteration averages):\n\n`;
      md += `| Bucket | Avg / iter | Total | Billing weight |\n|---|---|---|---|\n`;
      md += `| Uncached input | ${tu.avgUncachedInputTokens ?? 0} | ${tu.totalUncachedInputTokens ?? 0} | 1.0× |\n`;
      md += `| Cache reads | ${tu.avgCacheReadInputTokens ?? 0} | ${tu.totalCacheReadInputTokens ?? 0} | 0.1× |\n`;
      md += `| Cache creations | ${tu.avgCacheCreationInputTokens ?? 0} | ${tu.totalCacheCreationInputTokens ?? 0} | 1.25× |\n`;
      md += `| **Effective input** (weighted) | **${tu.avgEffectiveInputTokens ?? 0}** | **${tu.totalEffectiveInputTokens ?? 0}** | — |\n`;
      md += `| Raw sum (all three input buckets) | ${tu.avgInputTokens} | ${tu.totalInputTokens} | — |\n`;
      md += `\n`;
      md += `Output:\n\n`;
      md += `| Metric | Avg / iter | Total |\n|---|---|---|\n`;
      md += `| Output tokens | ${tu.avgOutputTokens} | ${tu.totalOutputTokens} |\n\n`;
      if (tu.cacheHitRate != null) {
        const pct = round(tu.cacheHitRate * 100, 1);
        md += `_Cache hit rate: ${pct}% of input tokens served from cache (billed at ~10% of full input rate)._\n\n`;
      }
    }
  }

  return md;
}
