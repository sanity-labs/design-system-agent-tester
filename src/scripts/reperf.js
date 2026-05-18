import { parseArgs } from "node:util";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";

import { validateProject, killDevServer } from "../evaluation/screenshot.js";
import { measurePerformance } from "../evaluation/performance.js";
import { generateReport } from "../reporting/report.js";
import { isSourceFile } from "../evaluation/parse-files.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

// ─── CLI ─────────────────────────────────────────────────────────────────────

const { values } = parseArgs({
  options: {
    output: { type: "string",  short: "o", default: "" },
    prompt: { type: "string",  short: "p", default: "both" },
    // Perf runs sequentially by default — parallel Lighthouse + dev-servers
    // compete for ports and CPU, making measurements noisier.
    concurrency: { type: "string", short: "c", default: "1" },
  },
  allowPositionals: false,
});

const VALID_PROMPTS = ["control", "variant", "both"];
if (!VALID_PROMPTS.includes(values.prompt)) {
  console.error(`--prompt must be one of: ${VALID_PROMPTS.join(", ")}`);
  process.exit(1);
}

// ─── Directory helpers ────────────────────────────────────────────────────────

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
 * Resolve the run directory. --output wins; otherwise the latest timestamped
 * subdirectory under output/ is used.
 */
async function resolveRunDir(outputFlag) {
  if (outputFlag) return resolve(outputFlag);

  const outputRoot = resolve(ROOT, "output");
  if (!existsSync(outputRoot)) {
    console.error(`output/ directory not found at ${outputRoot}`);
    process.exit(1);
  }

  const runs = await discoverAllRuns(outputRoot);

  if (!runs.length) {
    console.error("No timestamped run directories found in output/");
    process.exit(1);
  }

  return runs[0].fullPath;
}

/**
 * Find all iteration directories under a prompt folder that have a built
 * project (project/package.json must exist).
 */
async function discoverIterations(promptDir) {
  if (!existsSync(promptDir)) return [];

  const entries = await readdir(promptDir, { withFileTypes: true });
  const iterations = [];

  for (const e of entries) {
    if (!e.isDirectory()) continue;

    const iterDir  = resolve(promptDir, e.name);
    const pkgJson  = resolve(iterDir, "project", "package.json");

    if (existsSync(pkgJson)) {
      iterations.push({
        name:       e.name,
        iterDir,
        projectDir: resolve(iterDir, "project"),
      });
    }
  }

  // Sort by the trailing number so iteration-1 < iteration-2 etc.
  return iterations.sort((a, b) => {
    const n = (s) => parseInt(s.name.replace(/\D+/g, ""), 10) || 0;
    return n(a) - n(b);
  });
}

// ─── Per-iteration data reconstruction ───────────────────────────────────────

/**
 * Recursively collect all source files from a project directory,
 * skipping node_modules.
 */
async function readProjectFiles(projectDir) {
  const files = [];

  async function walk(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // directory disappeared — skip quietly
    }

    for (const e of entries) {
      if (e.name === "node_modules") continue;
      const fullPath = resolve(dir, e.name);

      if (e.isDirectory()) {
        await walk(fullPath);
      } else if (e.isFile() && isSourceFile(e.name)) {
        try {
          const content = await readFile(fullPath, "utf-8");
          files.push({ path: relative(projectDir, fullPath), content });
        } catch {
          // unreadable file — skip
        }
      }
    }
  }

  if (existsSync(projectDir)) await walk(projectDir);
  return files;
}

/**
 * Load a single iteration's complete result object from disk, suitable for
 * passing straight to generateReport().
 *
 * Fields are sourced from (in priority order):
 *   _meta.json           → most structured data
 *   _perf_results.json   → freshly written Lighthouse output
 *   project/             → file contents for code-variance analysis
 */
async function loadIterationResult(iteration) {
  const { name, iterDir, projectDir } = iteration;

  // ── _meta.json ─────────────────────────────────────────────────────────────
  let meta = {};
  const metaPath = resolve(iterDir, "_meta.json");
  if (existsSync(metaPath)) {
    try {
      meta = JSON.parse(await readFile(metaPath, "utf-8"));
    } catch (err) {
      console.warn(`[${name}] Could not parse _meta.json: ${err.message}`);
    }
  }

  // ── _perf_results.json ─────────────────────────────────────────────────────
  let perfResults = null;
  const perfPath = resolve(iterDir, "_perf_results.json");
  if (existsSync(perfPath)) {
    try {
      perfResults = JSON.parse(await readFile(perfPath, "utf-8"));
    } catch (err) {
      console.warn(`[${name}] Could not parse _perf_results.json: ${err.message}`);
    }
  }

  // ── project/ source files ──────────────────────────────────────────────────
  const files = await readProjectFiles(projectDir);

  const iterNum = parseInt(name.replace(/\D+/g, ""), 10) || 0;

  return {
    iteration:          iterNum,
    elapsedSeconds:     meta.elapsedSeconds     ?? 0,
    model:              meta.model              ?? null,
    linesOfCode:        meta.linesOfCode        ?? 0,
    files,
    sanityUIComponents: meta.sanityUIComponents ?? [],
    screenshotPath:     meta.screenshotPath     ?? null,
    inputTokens:        meta.inputTokens        ?? 0,
    outputTokens:       meta.outputTokens       ?? 0,
    fixAttempts:        meta.fixAttempts        ?? 0,
    fixLog:             meta.fixLog             ?? [],
    feedback:           meta.feedback           ?? [],
    a11yResults:        meta.a11yResults        ?? null,
    perfResults,
    inlineStyles:       meta.inlineStyles       ?? null,
    componentUsage:     meta.componentUsage     ?? null,
  };
}

// ─── Perf runner ─────────────────────────────────────────────────────────────

/**
 * Run Lighthouse against one iteration's project.  Starts the dev server,
 * measures, then kills the server.  Writes _perf_results.json and patches
 * _meta.json so the data persists for future report runs.
 */
async function reperfIteration({ name, iterDir, projectDir }, iterLabel) {
  console.log(`[${iterLabel}] Starting dev server...`);
  const validation = await validateProject(projectDir, iterLabel);

  if (!validation.serverUrl) {
    console.warn(`[${iterLabel}] Dev server failed to start — skipping perf`);
    killDevServer(validation.devServer);
    return null;
  }

  try {
    const perfResults = await measurePerformance({
      serverUrl: validation.serverUrl,
      iterDir,
      iterLabel,
    });

    // Patch _meta.json so the result is persisted for future report regenerations.
    const metaPath = resolve(iterDir, "_meta.json");
    if (existsSync(metaPath)) {
      try {
        const meta = JSON.parse(await readFile(metaPath, "utf-8"));
        meta.perfResults = perfResults;
        await writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
      } catch (err) {
        console.warn(`[${iterLabel}] Could not update _meta.json: ${err.message}`);
      }
    }

    return perfResults;
  } finally {
    killDevServer(validation.devServer);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const runDir       = await resolveRunDir(values.output);
  const maxConc      = Math.max(1, parseInt(values.concurrency, 10) || 1);
  const promptArg    = values.prompt;
  const targetKeys   = promptArg === "both" ? ["control", "variant"] : [promptArg];

  console.log("=== Re-Perf (Lighthouse) ===");
  console.log(`Run dir:     ${runDir}`);
  console.log(`Prompts:     ${targetKeys.join(", ")}`);
  console.log(`Concurrency: ${maxConc}`);
  console.log("");

  // ── Step 1: run Lighthouse for every iteration in the targeted prompts ─────

  let totalAttempted = 0;
  let totalSucceeded = 0;
  let totalFailed    = 0;

  for (const key of targetKeys) {
    const promptDir  = resolve(runDir, key);
    const iterations = await discoverIterations(promptDir);

    if (!iterations.length) {
      console.log(`[${key}] No iterations with a built project found — skipping\n`);
      continue;
    }

    console.log(`--- "${key}" (${iterations.length} iteration(s)) ---\n`);

    // Process with bounded concurrency
    const queue   = [...iterations];
    const inFlight = new Set();

    const runNext = async () => {
      if (!queue.length) return;
      const iteration = queue.shift();
      const iterLabel = `${key}/${iteration.name}`;
      totalAttempted++;

      try {
        const result = await reperfIteration(iteration, iterLabel);
        if (result) {
          totalSucceeded++;
        } else {
          totalFailed++;
        }
      } catch (err) {
        totalFailed++;
        console.error(`[${iterLabel}] Failed: ${err.message}`);
      }
    };

    const processQueue = async () => {
      while (queue.length || inFlight.size) {
        while (queue.length && inFlight.size < maxConc) {
          const p = runNext();
          inFlight.add(p);
          p.finally(() => inFlight.delete(p));
        }
        if (inFlight.size) await Promise.race(inFlight);
      }
    };

    await processQueue();
    console.log("");
  }

  console.log(`Perf complete — attempted: ${totalAttempted}, succeeded: ${totalSucceeded}, failed: ${totalFailed}`);

  // ── Step 2: reconstruct allResults from disk and regenerate the report ─────
  //
  // We always load ALL prompt directories present in the run, not just the
  // ones we re-perfed, so the report stays complete.

  console.log("\n=== Regenerating Report ===\n");

  const allPromptDirs = await readdir(runDir, { withFileTypes: true })
    .then((es) => es.filter((e) => e.isDirectory()).map((e) => e.name))
    .catch(() => []);

  const knownPrompts = allPromptDirs.filter((d) =>
    ["control", "variant"].includes(d),
  );

  const allResults = {};

  for (const key of knownPrompts) {
    const promptDir  = resolve(runDir, key);
    const iterations = await discoverIterations(promptDir);
    if (!iterations.length) continue;

    console.log(`Loading ${iterations.length} iteration(s) for "${key}"...`);
    allResults[key] = await Promise.all(
      iterations.map((iter) => loadIterationResult(iter)),
    );
  }

  if (!Object.keys(allResults).length) {
    console.error("No iteration data found — cannot generate report.");
    process.exit(1);
  }

  await generateReport(allResults, runDir);
  console.log(`\nDone. Report written to ${runDir}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
