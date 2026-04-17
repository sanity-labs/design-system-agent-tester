import { parseArgs } from "node:util";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readdir,
  readFile,
  writeFile,
  stat,
  mkdir,
  rm,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import {
  parseFiles,
  extractSanityUIComponents,
  isSourceFile,
} from "./analyze.js";
import { attemptScreenshot } from "./screenshot.js";
import { runAccessibilityTests } from "./a11y.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

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
      default: "2",
    },
    output: {
      type: "string",
      short: "o",
      default: "",
    },
    "skip-screenshot": {
      type: "boolean",
      default: false,
    },
    "skip-install": {
      type: "boolean",
      default: false,
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

/**
 * Resolve the run directory. If --output is given, use it directly.
 * Otherwise, find the latest timestamped subdirectory under output/.
 */
async function resolveRunDir(outputFlag) {
  if (outputFlag) return resolve(outputFlag);

  const outputRoot = resolve(ROOT, "output");
  if (!existsSync(outputRoot)) return outputRoot;

  // Collect all run directories: both new (YYYY-MM-DD/HH.MM) and legacy (YYYY-MM-DD-HH.MM)
  const runs = await discoverAllRuns(outputRoot);

  if (runs.length > 0) {
    return runs[0].fullPath;
  }

  // Fallback: maybe it's an old-style flat output/ with control/training directly
  return outputRoot;
}

/**
 * Discover all iteration directories under a prompt output folder.
 * Each must contain a `_raw_response.txt` to re-parse from.
 */
async function discoverIterations(promptDir) {
  const iterations = [];

  if (!existsSync(promptDir)) return iterations;

  const entries = await readdir(promptDir);
  for (const entry of entries) {
    const iterDir = resolve(promptDir, entry);
    const iterStat = await stat(iterDir);
    if (!iterStat.isDirectory()) continue;

    const rawFile = resolve(iterDir, "_raw_response.txt");
    if (existsSync(rawFile)) {
      iterations.push({
        name: entry,
        iterDir,
        rawFile,
      });
    }
  }

  // Sort by iteration number
  iterations.sort((a, b) => {
    const numA = parseInt(a.name.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.name.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });

  return iterations;
}

/**
 * Re-parse a raw response, write all project files to disk, and optionally re-screenshot.
 */
async function rebuildIteration({
  iterDir,
  rawFile,
  iterLabel,
  skipScreenshot,
  skipInstall,
}) {
  const rawText = await readFile(rawFile, "utf-8");

  // Parse files from the raw response
  const files = parseFiles(rawText);

  if (files.length === 0) {
    console.warn(`[${iterLabel}] No files parsed from raw response — skipping`);
    return { success: false, reason: "no files parsed" };
  }

  console.log(`[${iterLabel}] Parsed ${files.length} files from raw response`);

  // Clean and recreate the project directory
  const projectDir = resolve(iterDir, "project");
  if (existsSync(projectDir)) {
    await rm(projectDir, { recursive: true, force: true });
  }
  await mkdir(projectDir, { recursive: true });

  // Write all files
  for (const file of files) {
    const filePath = resolve(projectDir, file.path);
    const dir = resolve(filePath, "..");
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, file.content, "utf-8");
  }

  console.log(`[${iterLabel}] Wrote ${files.length} files to ${projectDir}`);

  // Verify files on disk
  const writtenPaths = [];
  for (const file of files) {
    const filePath = resolve(projectDir, file.path);
    if (existsSync(filePath)) {
      writtenPaths.push(file.path);
    } else {
      console.warn(`[${iterLabel}] Failed to write: ${file.path}`);
    }
  }
  console.log(
    `[${iterLabel}] Verified ${writtenPaths.length}/${files.length} files on disk`,
  );

  // Compute metrics
  const linesOfCode = files.reduce(
    (sum, f) => sum + f.content.split("\n").length,
    0,
  );
  const sanityUIComponents = extractSanityUIComponents(files);

  // Take screenshot
  let screenshotPath = null;
  if (!skipScreenshot && files.some((f) => f.path === "package.json")) {
    console.log(`[${iterLabel}] Starting screenshot pipeline...`);
    screenshotPath = await attemptScreenshot(projectDir, iterDir, iterLabel);

    if (screenshotPath) {
      console.log(`[${iterLabel}] Screenshot saved: ${screenshotPath}`);
    } else {
      console.warn(`[${iterLabel}] Screenshot pipeline produced no output`);
    }
  } else if (skipScreenshot) {
    console.log(`[${iterLabel}] Skipping screenshot (--skip-screenshot)`);
  } else {
    console.warn(`[${iterLabel}] No package.json found — skipping screenshot`);
  }

  // Update _meta.json
  const metaPath = resolve(iterDir, "_meta.json");
  let meta = {};
  if (existsSync(metaPath)) {
    try {
      meta = JSON.parse(await readFile(metaPath, "utf-8"));
    } catch {
      // start fresh if meta is corrupt
    }
  }

  meta.linesOfCode = linesOfCode;
  meta.fileCount = files.length;
  meta.filePaths = files.map((f) => f.path);
  meta.sanityUIComponents = [...sanityUIComponents];
  meta.screenshotPath = screenshotPath;
  meta.rebuiltAt = new Date().toISOString();

  await writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");

  return {
    success: true,
    fileCount: files.length,
    linesOfCode,
    screenshotPath,
    components: sanityUIComponents.size,
  };
}

async function main() {
  const promptArg = values.prompt;
  const maxConcurrency = parseInt(values.concurrency, 10) || 2;
  const outputDir = await resolveRunDir(values.output);
  const skipScreenshot = values["skip-screenshot"];
  const skipInstall = values["skip-install"];

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

  console.log("=== Rebuild & Re-Screenshot ===");
  console.log(`Output dir:       ${outputDir}`);
  console.log(`Prompts:          ${promptKeys.join(", ")}`);
  console.log(`Concurrency:      ${maxConcurrency}`);
  console.log(`Skip screenshot:  ${skipScreenshot}`);
  console.log("");

  let totalAttempted = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;
  let totalNoFiles = 0;

  for (const key of promptKeys) {
    const promptDir = resolve(outputDir, key);
    const iterations = await discoverIterations(promptDir);

    if (iterations.length === 0) {
      console.log(
        `[${key}] No iterations with _raw_response.txt found in ${promptDir} — skipping\n`,
      );
      continue;
    }

    console.log(
      `\n--- Rebuilding "${key}" (${iterations.length} iterations) ---\n`,
    );

    // Process with bounded concurrency
    const queue = [...iterations];
    const inFlight = new Set();

    async function runNext() {
      if (queue.length === 0) return;
      const { name, iterDir, rawFile } = queue.shift();
      const iterLabel = `${key}/${name}`;
      totalAttempted++;

      const startTime = Date.now();

      try {
        const result = await rebuildIteration({
          iterDir,
          rawFile,
          iterLabel,
          skipScreenshot,
          skipInstall,
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        if (result.success) {
          totalSucceeded++;
          console.log(
            `[${iterLabel}] ✓ Done in ${elapsed}s — ${result.fileCount} files, ${result.linesOfCode} LOC, ${result.components} components${result.screenshotPath ? ", screenshot ✓" : ""}\n`,
          );
        } else {
          totalNoFiles++;
          console.log(`[${iterLabel}] ⚠ ${result.reason} (${elapsed}s)\n`);
        }
      } catch (err) {
        totalFailed++;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(
          `[${iterLabel}] ✗ Failed after ${elapsed}s: ${err.message}\n`,
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
  console.log(`Attempted:   ${totalAttempted}`);
  console.log(`Succeeded:   ${totalSucceeded}`);
  console.log(`No files:    ${totalNoFiles}`);
  console.log(`Failed:      ${totalFailed}`);

  if (totalAttempted === 0) {
    console.log("\nNo iterations found. Run the test harness first:");
    console.log("  node src/index.js --prompt control");
  } else {
    console.log("\nTo re-screenshot only (without rebuilding):");
    console.log("  node src/rescreenshot.js");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
