import { parseArgs } from "node:util";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { readdir, stat, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { attemptScreenshot } from "../evaluation/screenshot.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

const { values } = parseArgs({
  options: {
    prompt: {
      type: "string",
      short: "p",
      default: "both",
    },
    concurrency: {
      type: "string",
      short: "c",
      default: "3",
    },
    output: {
      type: "string",
      short: "o",
      default: "",
    },
  },
});

/**
 * Discover all run directories under output/, supporting both:
 *   - New format: output/YYYY-MM-DD/HH.MM/
 *   - Legacy format: output/YYYY-MM-DD-HH.MM/
 * Returns an array sorted newest-first: [{ sortKey, fullPath }]
 */
async function discoverAllRuns(outputRoot) {
  const entries = await readdir(outputRoot, { withFileTypes: true });
  const runs = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // New format: date directory containing time subdirectories
    if (/^\d{4}-\d{2}-\d{2}$/.test(entry.name)) {
      const dateDir = resolve(outputRoot, entry.name);
      const subs = await readdir(dateDir, { withFileTypes: true });
      for (const sub of subs) {
        if (sub.isDirectory() && /^\d{2}\.\d{2}$/.test(sub.name)) {
          runs.push({
            sortKey: `${entry.name}-${sub.name}`,
            fullPath: resolve(dateDir, sub.name),
          });
        }
      }
    }

    // Legacy format: YYYY-MM-DD-HH.MM
    if (/^\d{4}-\d{2}-\d{2}-\d{2}\.\d{2}$/.test(entry.name)) {
      runs.push({
        sortKey: entry.name,
        fullPath: resolve(outputRoot, entry.name),
      });
    }
  }

  runs.sort((a, b) => b.sortKey.localeCompare(a.sortKey)); // newest first
  return runs;
}

async function resolveRunDir(outputFlag) {
  if (outputFlag) return resolve(outputFlag);

  const outputRoot = resolve(ROOT, "output");
  if (!existsSync(outputRoot)) return outputRoot;

  const runs = await discoverAllRuns(outputRoot);

  if (runs.length > 0) {
    return runs[0].fullPath;
  }

  // Fallback: maybe it's an old-style flat output/ with control/training directly
  return outputRoot;
}

/**
 * Discover all iteration directories under a prompt output folder.
 * Each must contain a `project/` subdirectory with a `package.json`.
 */
async function discoverIterations(promptDir) {
  const iterations = [];

  if (!existsSync(promptDir)) return iterations;

  const entries = await readdir(promptDir);
  for (const entry of entries) {
    const iterDir = resolve(promptDir, entry);
    const iterStat = await stat(iterDir);
    if (!iterStat.isDirectory()) continue;

    const projectDir = resolve(iterDir, "project");
    const pkgJson = resolve(projectDir, "package.json");

    if (existsSync(pkgJson)) {
      iterations.push({
        name: entry,
        iterDir,
        projectDir,
      });
    }
  }

  // Sort by iteration number if names follow "iteration-N" pattern
  iterations.sort((a, b) => {
    const numA = parseInt(a.name.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.name.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });

  return iterations;
}

async function main() {
  const promptArg = values.prompt;
  const maxConcurrency = parseInt(values.concurrency, 10) || 3;
  const outputDir = await resolveRunDir(values.output);

  // Determine which prompt directories to scan
  let promptKeys;
  if (promptArg === "both") {
    promptKeys = ["control", "training"];
  } else if (["control", "training"].includes(promptArg)) {
    promptKeys = [promptArg];
  } else {
    console.error(
      `Error: --prompt must be "control", "training", or "both". Got "${promptArg}"`,
    );
    process.exit(1);
  }

  console.log("=== Re-Screenshot ===");
  console.log(`Output dir:   ${outputDir}`);
  console.log(`Prompts:      ${promptKeys.join(", ")}`);
  console.log(`Concurrency:  ${maxConcurrency}`);
  console.log("");

  let totalAttempted = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;

  for (const key of promptKeys) {
    const promptDir = resolve(outputDir, key);
    const iterations = await discoverIterations(promptDir);

    if (iterations.length === 0) {
      console.log(
        `[${key}] No iterations with project/package.json found in ${promptDir} — skipping\n`,
      );
      continue;
    }

    console.log(
      `--- Re-screenshotting "${key}" (${iterations.length} iterations) ---\n`,
    );

    // Process with bounded concurrency
    const queue = [...iterations];
    const inFlight = new Set();

    async function runNext() {
      if (queue.length === 0) return;
      const { name, iterDir, projectDir } = queue.shift();
      const iterLabel = `${key}/${name}`;
      totalAttempted++;

      console.log(`[${iterLabel}] Starting screenshot...`);
      const startTime = Date.now();

      try {
        const screenshotPath = await attemptScreenshot(
          projectDir,
          iterDir,
          iterLabel,
        );

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (screenshotPath) {
          totalSucceeded++;
          console.log(
            `[${iterLabel}] Done in ${elapsed}s — ${screenshotPath}\n`,
          );

          // Update _meta.json if it exists
          await updateMeta(iterDir, screenshotPath);
        } else {
          totalFailed++;
          console.log(
            `[${iterLabel}] No screenshot produced after ${elapsed}s\n`,
          );
        }
      } catch (err) {
        totalFailed++;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(
          `[${iterLabel}] Failed after ${elapsed}s: ${err.message}\n`,
        );
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
  }

  console.log("\n=== Summary ===");
  console.log(`Attempted:  ${totalAttempted}`);
  console.log(`Succeeded:  ${totalSucceeded}`);
  console.log(`Failed:     ${totalFailed}`);

  if (totalAttempted === 0) {
    console.log("\nNo iterations found. Run the test harness first:");
    console.log("  node src/index.js --prompt control");
  }
}

/**
 * Update the _meta.json file in an iteration directory with the new screenshot path.
 */
async function updateMeta(iterDir, screenshotPath) {
  const metaPath = resolve(iterDir, "_meta.json");
  if (!existsSync(metaPath)) return;

  try {
    const raw = await readFile(metaPath, "utf-8");
    const meta = JSON.parse(raw);
    meta.screenshotPath = screenshotPath;
    meta.rescreenshottedAt = new Date().toISOString();
    await writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
  } catch {
    // Non-fatal — just skip meta update
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
