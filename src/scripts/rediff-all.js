/**
 * Re-run visual diffs and regenerate reports for all existing runs.
 *
 * Usage:
 *   node --env-file=.env src/rediff-all.js
 *   node --env-file=.env src/rediff-all.js --run 2026-03-27/12.29   # single run
 *   node --env-file=.env src/rediff-all.js --concurrency 4          # parallel runs
 */

import { parseArgs } from "node:util";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { computeVisualDiff } from "../evaluation/visual-diff.js";
import { generateReport } from "../reporting/report.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const OUTPUT_ROOT = resolve(ROOT, "output");

const { values } = parseArgs({
  options: {
    run: {
      type: "string",
      short: "r",
      default: "",
    },
    concurrency: {
      type: "string",
      short: "c",
      default: "2",
    },
    "skip-report": {
      type: "boolean",
      default: false,
    },
  },
});

/**
 * Discover all timestamped run directories under output/, supporting both:
 *   - New format: output/YYYY-MM-DD/HH.MM/  (returned as "YYYY-MM-DD/HH.MM")
 *   - Legacy format: output/YYYY-MM-DD-HH.MM/  (returned as "YYYY-MM-DD-HH.MM")
 * Returns names sorted chronologically (oldest first).
 */
async function discoverRuns() {
  if (!existsSync(OUTPUT_ROOT)) return [];

  const entries = await readdir(OUTPUT_ROOT, { withFileTypes: true });
  const runs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // New format: date directory containing time subdirectories
    if (/^\d{4}-\d{2}-\d{2}$/.test(entry.name)) {
      const dateDir = resolve(OUTPUT_ROOT, entry.name);
      const subs = await readdir(dateDir, { withFileTypes: true });
      for (const sub of subs) {
        if (sub.isDirectory() && /^\d{2}\.\d{2}$/.test(sub.name)) {
          runs.push(`${entry.name}/${sub.name}`);
        }
      }
    }

    // Legacy format: YYYY-MM-DD-HH.MM
    if (/^\d{4}-\d{2}-\d{2}-\d{2}\.\d{2}$/.test(entry.name)) {
      runs.push(entry.name);
    }
  }

  // Both formats sort correctly lexicographically (YYYY-MM-DD/HH.MM and YYYY-MM-DD-HH.MM)
  runs.sort();
  return runs;
}

/**
 * Discover iterations for a given prompt within a run.
 */
async function discoverIterations(promptDir) {
  if (!existsSync(promptDir)) return [];

  const entries = await readdir(promptDir);
  const iterations = [];

  for (const entry of entries) {
    const iterDir = resolve(promptDir, entry);
    const iterStat = await stat(iterDir);
    if (!iterStat.isDirectory()) continue;

    const num = parseInt(entry.replace(/\D/g, ""), 10) || 0;
    const metaPath = resolve(iterDir, "_meta.json");
    const screenshotPath = resolve(iterDir, "screenshot.png");

    if (existsSync(metaPath)) {
      iterations.push({
        name: entry,
        num,
        iterDir,
        metaPath,
        screenshotPath: existsSync(screenshotPath) ? screenshotPath : null,
      });
    }
  }

  return iterations.sort((a, b) => a.num - b.num);
}

/**
 * Reconstruct allResults from meta files for report generation.
 */
async function reconstructResults(runDir) {
  const allResults = {};
  const prompts = ["control", "training"];

  for (const key of prompts) {
    const promptDir = resolve(runDir, key);
    const iters = await discoverIterations(promptDir);
    if (iters.length === 0) continue;

    const iterations = [];
    for (const iter of iters) {
      try {
        const meta = JSON.parse(await readFile(iter.metaPath, "utf-8"));

        // Read source files for code variance analysis
        const files = [];
        for (const fp of meta.filePaths || []) {
          try {
            const content = await readFile(
              resolve(iter.iterDir, "project", fp),
              "utf-8",
            );
            const ext = fp.split(".").pop().toLowerCase();
            if (
              ["js", "jsx", "ts", "tsx", "css", "html", "json"].includes(ext)
            ) {
              files.push({ path: fp, content });
            }
          } catch {
            // file missing — skip
          }
        }

        iterations.push({
          iteration: iter.num,
          elapsedSeconds: meta.elapsedSeconds || 0,
          linesOfCode: meta.linesOfCode || 0,
          fileCount: meta.fileCount || 0,
          files,
          sanityUIComponents: meta.sanityUIComponents || [],
          screenshotPath: iter.screenshotPath,
          inputTokens: meta.inputTokens || null,
          outputTokens: meta.outputTokens || null,
          fixAttempts: meta.fixAttempts || 0,
          fixLog: meta.fixLog || [],
          feedback: meta.feedback || [],
          a11yResults: meta.a11yResults || null,
        });
      } catch {
        // corrupt meta — skip
      }
    }

    if (iterations.length > 0) {
      allResults[key] = iterations;
    }
  }

  return allResults;
}

/**
 * Process a single run: compute visual diffs and regenerate report.
 */
async function processRun(runName, skipReport) {
  const runDir = resolve(OUTPUT_ROOT, runName);
  const prompts = ["control", "training"];

  let diffCount = 0;

  // Compute visual diffs per prompt
  for (const key of prompts) {
    const promptDir = resolve(runDir, key);
    const iters = await discoverIterations(promptDir);

    const withScreenshots = iters.filter((i) => i.screenshotPath);
    if (withScreenshots.length < 2) {
      continue;
    }

    const diffInput = withScreenshots.map((i) => ({
      iteration: i.num,
      screenshotPath: i.screenshotPath,
    }));

    try {
      const vd = await computeVisualDiff(diffInput, promptDir);
      diffCount += vd.pairwiseDiffs.length;
      console.log(
        `  [${runName}/${key}] ${withScreenshots.length} screenshots → avg ${vd.averageDiffPercent}% diff (${vd.pairwiseDiffs.length} pairs)`,
      );

      // Store the visual diff result in a JSON file for the report regeneration
      await writeFile(
        resolve(promptDir, "_visual_diff.json"),
        JSON.stringify(vd, null, 2),
        "utf-8",
      );
    } catch (err) {
      console.warn(`  [${runName}/${key}] Visual diff failed: ${err.message}`);
    }
  }

  if (diffCount === 0) {
    console.log(`  [${runName}] No diffs computed (not enough screenshots)`);
  }

  // Regenerate the report
  if (!skipReport) {
    try {
      const allResults = await reconstructResults(runDir);

      // Attach visual diff data from the files we just wrote
      for (const [key, iterations] of Object.entries(allResults)) {
        const vdPath = resolve(runDir, key, "_visual_diff.json");
        if (existsSync(vdPath)) {
          try {
            const vd = JSON.parse(await readFile(vdPath, "utf-8"));
            for (const iter of iterations) {
              iter._visualDiff = vd;
            }
          } catch {
            // skip
          }
        }
      }

      if (Object.keys(allResults).length > 0) {
        await generateReport(allResults, runDir);
        console.log(`  [${runName}] Report regenerated`);
      } else {
        console.log(`  [${runName}] No iteration data found — skipping report`);
      }
    } catch (err) {
      console.warn(`  [${runName}] Report generation failed: ${err.message}`);
    }
  }

  return diffCount;
}

async function main() {
  const singleRun = values.run;
  const maxConcurrency = parseInt(values.concurrency, 10) || 2;
  const skipReport = values["skip-report"];

  let runNames;
  if (singleRun) {
    runNames = [singleRun];
  } else {
    runNames = await discoverRuns();
  }

  if (runNames.length === 0) {
    console.log("No runs found in output/");
    process.exit(0);
  }

  console.log(`=== Visual Diff & Report Regeneration ===`);
  console.log(`Runs:         ${runNames.length}`);
  console.log(`Concurrency:  ${maxConcurrency}`);
  console.log(`Skip report:  ${skipReport}`);
  console.log("");

  let totalRuns = 0;
  let totalDiffs = 0;
  let failedRuns = 0;

  // Process with bounded concurrency
  const queue = [...runNames];
  const inFlight = new Set();

  async function runNext() {
    if (queue.length === 0) return;
    const runName = queue.shift();
    totalRuns++;

    console.log(`[${runName}] Processing...`);
    try {
      const diffs = await processRun(runName, skipReport);
      totalDiffs += diffs;
    } catch (err) {
      failedRuns++;
      console.error(`[${runName}] Failed: ${err.message}`);
    }
  }

  async function processQueue() {
    while (queue.length > 0 || inFlight.size > 0) {
      while (queue.length > 0 && inFlight.size < maxConcurrency) {
        const promise = runNext();
        inFlight.add(promise);
        promise.then(() => inFlight.delete(promise));
      }
      if (inFlight.size > 0) {
        await Promise.race(inFlight);
      }
    }
  }

  await processQueue();

  console.log("");
  console.log(`=== Summary ===`);
  console.log(`Runs processed: ${totalRuns}`);
  console.log(`Total diffs:    ${totalDiffs}`);
  console.log(`Failed:         ${failedRuns}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
