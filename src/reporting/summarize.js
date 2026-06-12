#!/usr/bin/env node
/**
 * summarize.js — Generate an aggregate summary report across multiple test runs.
 *
 * The summary's headline table uses the same renderer as the per-run
 * report (`reporting/aggregate.js`), so a run's report.md and the
 * cross-run summary always share the same metric layout.
 *
 * Usage:
 *   node src/reporting/summarize.js [options]
 *
 * Options:
 *   --output,  -o  Directory containing run folders to scan  (default: ./output)
 *   --count,   -n  Number of most-recent runs to include     (default: all)
 *   --from,    -f  Include runs at-or-after this folder name (e.g. 2026-04-14/13.00)
 *   --test,    -t  Test labels to include: a single label, a comma-separated list,
 *                  or `all` (default: all)
 *   --save,    -s  Write output to a file instead of stdout
 *   --help,    -h  Print this help message
 */

import { readdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  extractMetrics,
  aggregateMetrics,
  fmt,
  mdTable,
  renderMetricsTables,
} from "./aggregate.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  const { values } = parseArgs({
    options: {
      output: { type: "string", short: "o", default: resolve(ROOT, "output") },
      count: { type: "string", short: "n", default: "0" }, // 0 = all
      from: { type: "string", short: "f", default: "" },
      test: { type: "string", short: "t", default: "all" },
      // Deprecated alias for --test, kept for old scripts.
      prompt: { type: "string", short: "p" },
      save: { type: "boolean", short: "s", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
    allowPositionals: false,
  });

  // Resolve --test/--prompt with deprecation warning, same as index.js.
  if (values.test === "all" && values.prompt !== undefined) {
    console.error("Warning: --prompt is deprecated, use --test instead");
    values.test = values.prompt;
  }

  if (values.help) {
    console.log(`
summarize.js — Generate an aggregate summary report across multiple test runs.

Usage:
  node src/reporting/summarize.js [options]

Options:
  --output,  -o  Directory containing run folders to scan  (default: ./output)
  --count,   -n  Number of most-recent runs to include     (default: all)
  --from,    -f  Include runs at-or-after this folder name (e.g. 2026-04-14/13.00)
  --test,    -t  Test labels to include: a single label, a comma-separated list,
                 or \`all\` (default: all)
  --save,    -s  Write output to a file instead of stdout
  --help,    -h  Print this help message

Examples:
  node src/reporting/summarize.js --count 5
  node src/reporting/summarize.js --from 2026-04-14/14.20 --save
  node src/reporting/summarize.js --test shad-cn --count 8
`);
    process.exit(0);
  }

  const outputDir = resolve(values.output);
  const maxCount = parseInt(values.count, 10) || 0;
  const fromFilter = values.from.trim();
  const promptFilter = values.test.trim();
  const saveToFile = values.save;

  // 1. Enumerate timestamped run directories
  let entries;
  try {
    entries = await readdir(outputDir, { withFileTypes: true });
  } catch {
    console.error(`Cannot read output directory: ${outputDir}`);
    process.exit(1);
  }

  // Collect run directories from both new (YYYY-MM-DD/HH.MM) and legacy
  // (YYYY-MM-DD-HH.MM) formats.
  const LEGACY_RE = /^\d{4}-\d{2}-\d{2}-\d{2}\.\d{2}$/;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const TIME_RE = /^\d{2}\.\d{2}$/;

  let runDirNames = [];

  for (const e of entries) {
    if (!e.isDirectory()) continue;

    if (DATE_RE.test(e.name)) {
      const dateDir = resolve(outputDir, e.name);
      let subs;
      try {
        subs = await readdir(dateDir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const sub of subs) {
        if (sub.isDirectory() && TIME_RE.test(sub.name)) {
          runDirNames.push(`${e.name}/${sub.name}`);
        }
      }
    }

    if (LEGACY_RE.test(e.name)) {
      runDirNames.push(e.name);
    }
  }

  runDirNames.sort();

  if (runDirNames.length === 0) {
    console.error(`No test-run directories found in: ${outputDir}`);
    process.exit(1);
  }

  // 2. Apply --from filter
  if (fromFilter) {
    const idx = runDirNames.findIndex((d) => d >= fromFilter);
    if (idx === -1) {
      console.error(`No runs found at or after "${fromFilter}".`);
      console.error(`Available runs: ${runDirNames.join(", ")}`);
      process.exit(1);
    }
    runDirNames = runDirNames.slice(idx);
  }

  // 3. Apply --count (take the N most recent)
  if (maxCount > 0 && runDirNames.length > maxCount) {
    runDirNames = runDirNames.slice(-maxCount);
  }

  // 4. Load report.json for each selected directory
  const runs = [];
  for (const name of runDirNames) {
    const reportPath = join(outputDir, name, "report.json");
    if (!existsSync(reportPath)) {
      console.warn(`[skip] ${name}: no report.json`);
      continue;
    }
    try {
      const raw = await readFile(reportPath, "utf-8");
      const json = JSON.parse(raw);
      runs.push({ name, report: json });
    } catch (err) {
      console.warn(`[skip] ${name}: failed to parse report.json — ${err.message}`);
    }
  }

  if (runs.length === 0) {
    console.error("No valid runs to summarise.");
    process.exit(1);
  }

  // 5. Discover the set of test labels across all loaded runs.
  const allLabels = new Set();
  for (const r of runs) {
    for (const label of Object.keys(r.report.prompts || {})) {
      allLabels.add(label);
    }
  }
  const discoveredLabels = [...allLabels].sort();

  // 6. Apply the --prompt filter against discovered labels.
  let promptKeys;
  if (promptFilter === "all" || promptFilter === "both") {
    promptKeys = discoveredLabels;
  } else {
    const requested = promptFilter.split(",").map((s) => s.trim()).filter(Boolean);
    const unknown = requested.filter((l) => !discoveredLabels.includes(l));
    if (requested.length === 0 || unknown.length > 0) {
      console.error(
        `Error: --test must be one of: ${[...discoveredLabels, "all"].join(", ")}.\n` +
          `Got: "${promptFilter}"${unknown.length ? `\nUnknown labels: ${unknown.join(", ")}` : ""}`,
      );
      process.exit(1);
    }
    promptKeys = requested;
  }

  if (promptKeys.length === 0) {
    console.error("No matching test labels found in any of the loaded runs.");
    process.exit(1);
  }

  // Drop runs that don't contain at least one of the requested labels.
  const filteredRuns = runs.filter((r) =>
    promptKeys.some((pk) => r.report.prompts?.[pk]),
  );
  if (filteredRuns.length === 0) {
    console.error("No runs contain any of the requested test labels.");
    process.exit(1);
  }

  // 7. Build and emit the summary
  const md = renderSummary(filteredRuns, promptKeys, outputDir);

  if (saveToFile) {
    const ts = buildTimestamp();
    const outPath = join(outputDir, `summary-${ts}.md`);
    await writeFile(outPath, md, "utf-8");
    console.error(`Summary written to: ${outPath}`);
  } else {
    process.stdout.write(md);
  }
}

// ─── Markdown rendering ─────────────────────────────────────────────

function buildTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}.${pad(now.getMinutes())}`;
  return `${date}-${time}`;
}

/**
 * Render a cross-run summary for the given runs and prompt keys.
 *
 * @param {Array<{name: string, report: object}>} runs
 * @param {string[]} promptKeys
 * @param {string} scannedDir
 * @returns {string} markdown
 */
export function renderSummary(runs, promptKeys, scannedDir) {
  // Resolve per-run metrics for each requested label.
  const perRun = runs.map(({ name, report }) => {
    const row = { name };
    for (const pk of promptKeys) {
      const data = report.prompts?.[pk];
      row[pk] = data ? extractMetrics(data) : null;
    }
    return row;
  });

  // Aggregate across all runs, per label.
  const agg = {};
  for (const pk of promptKeys) {
    const sets = perRun.map((r) => r[pk]).filter(Boolean);
    agg[pk] = aggregateMetrics(sets);
  }

  const iters = agg[promptKeys[0]]?.totalIterations ?? 3;

  // ── Header ────────────────────────────────────────────────────────
  let md = `# Agent Test Summary\n\n`;
  md += `_Generated: ${new Date().toLocaleString()}_\n\n`;
  md += `**Output directory:** \`${scannedDir}\`  \n`;
  md += `**Runs included (${runs.length}):** ${runs.map((r) => r.name).join(", ")}  \n`;
  md += `**Tests:** ${promptKeys.join(", ")}  \n`;
  md += `**Iterations per run:** ${iters}  \n\n`;

  // ── Aggregate averages: one themed table per topic ────────────────
  md += `## Aggregate Averages (${runs.length} runs)\n\n`;
  md += renderMetricsTables(promptKeys, agg);
  md += "\n";

  // ── Cross-run variance (only meaningful with multiple runs) ───────
  if (runs.length > 1) {
    md += renderVarianceSection(promptKeys, agg);
  }

  return md;
}

const VARIANCE_COLUMNS = [
  ["Inline styles total", "inlineTotal"],
  ["Box inline styles", "boxInline"],
  ["Axe violations total", "axeTotal"],
  ["FCP (ms)", "fcpMs"],
  ["TBT (ms)", "tbtMs"],
  ["TTI (ms)", "ttiMs"],
  ["Lighthouse score", "performanceScore"],
  ["React mount (ms)", "reactMountMs"],
  ["Lines of code", "loc"],
  ["DOM elements", "domAvg"],
  ["Semantic ratio", "semanticRatio"],
  ["Component / iter", "componentAvg"],
  ["Visual diff %", "visualDiffAvg"],
];

/**
 * Per-test standard deviation across runs. Shown only when multiple
 * runs are aggregated, since std-dev of a single value is zero.
 */
function renderVarianceSection(promptKeys, agg) {
  const headers = ["Test", ...VARIANCE_COLUMNS.map(([h]) => h)];
  const rows = promptKeys.map((pk) => {
    const a = agg[pk];
    return [
      `**${pk}**`,
      ...VARIANCE_COLUMNS.map(([, key]) => fmt(a?.[`${key}_sd`], 1)),
    ];
  });
  return `## Metric Variance (std dev across runs)\n\n` + mdTable(headers, rows) + "\n";
}

// ─── Entry point ────────────────────────────────────────────────────

// Only run as CLI when invoked directly via `node`. Compare via
// pathToFileURL so paths with spaces (or Windows paths) match too —
// naive string interpolation never URL-encodes them.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}
