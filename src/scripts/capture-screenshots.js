#!/usr/bin/env node
/**
 * capture-screenshots.js — Post-hoc screenshot capture for a completed run.
 *
 * Some tests disable live screenshot capture during generation
 * (`measure.screenshots: false`, e.g. `ui5-mcp` / `ui5-mcp-nolint`) to skip
 * the browser/Lighthouse overhead across many iterations. The generated
 * project is still on disk under each `iteration-N/project/`, so screenshots
 * can be captured later, on demand, for whichever run you actually want to
 * look at — without re-running generation.
 *
 * Finds every `iteration-N/project` directory under the given root
 * (recursively, so it works whether you point it at a single test's output
 * dir, a whole date/time run with multiple tests, or a specific model
 * subdirectory), and for each one: npm install (usually a no-op — deps are
 * already there from the original run), start the dev server, capture
 * screenshots at every breakpoint × color-scheme combination (same helper
 * the live pipeline uses), then tear the server down.
 *
 * Usage:
 *   node src/scripts/capture-screenshots.js <path> [options]
 *
 * Examples:
 *   node src/scripts/capture-screenshots.js output/2026-07-23/17.01/ui5-mcp
 *   node src/scripts/capture-screenshots.js output/2026-07-23/17.01 --concurrency 4
 *   node src/scripts/capture-screenshots.js output/2026-07-23/17.01/ui5-mcp/iteration-3 --force
 *
 * Options:
 *   --concurrency <n>   How many iterations to process in parallel (default 3)
 *   --force             Recapture even if screenshot.png already exists
 *   --dry-run           List the iterations that would be processed, do nothing
 */
import { readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { captureScreenshots } from "../evaluation/screenshot.js";
import { killDevServer, validateProject } from "../evaluation/validate.js";
import { getTest, TEST_LABELS } from "../config/prompts.js";
import { error, success, tag, warn } from "../util/color.js";

/**
 * Find which known test a project path belongs to, by matching any path
 * segment against `TEST_LABELS` (e.g. `.../ui5-mcp/iteration-3/project` or
 * `.../ui5-mcp/claude-opus-4-8/iteration-3/project`). Returns null for a
 * path outside any known test (config lookup is skipped, not fatal —
 * `renderFailureSignatures` just defaults to none).
 */
function findTestLabel(projectDir) {
  const segments = projectDir.split("/");
  return segments.find((s) => TEST_LABELS.includes(s)) ?? null;
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    concurrency: { type: "string", default: "3" },
    force: { type: "boolean", default: false },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help || positionals.length === 0) {
  console.log(`
capture-screenshots — Post-hoc screenshot capture for a completed run.

Usage:
  node src/scripts/capture-screenshots.js <path> [options]

<path> is any directory under output/ — a single iteration, a test's output
dir, a model subdirectory, or a whole date/time run. Every iteration-N/project/
found anywhere underneath it (recursively) is processed.

Options:
  --concurrency <n>   How many iterations to process in parallel (default 3)
  --force             Recapture even if screenshot.png already exists
  --dry-run           List the iterations that would be processed, do nothing
`);
  process.exit(values.help ? 0 : 1);
}

const root = resolve(positionals[0]);
if (!existsSync(root)) {
  console.error(`${error("✗")} No such path: ${root}`);
  process.exit(1);
}
const concurrency = Math.max(1, parseInt(values.concurrency, 10) || 3);

/**
 * Recursively find every directory named `project` whose parent looks like
 * an iteration directory (`iteration-<n>`), anywhere under `dir`. Does not
 * descend into `node_modules` — nested projects/packages there are never
 * iteration output.
 */
async function findIterationProjects(dir, results = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return results;
    throw err;
  }
  const isIterationDir = /^iteration-\d+$/.test(dir.split("/").pop());
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "node_modules") continue;
    const child = join(dir, entry.name);
    if (isIterationDir && entry.name === "project") {
      results.push(child);
      continue;
    }
    await findIterationProjects(child, results);
  }
  return results;
}

const projectDirs = (await findIterationProjects(root)).sort();

if (projectDirs.length === 0) {
  console.log(`No iteration-*/project/ directories found under ${root}.`);
  process.exit(0);
}

console.log(`Found ${projectDirs.length} iteration project(s) under ${root}.`);

if (values["dry-run"]) {
  for (const p of projectDirs) console.log(`  ${p}`);
  console.log("(dry-run — nothing was captured)");
  process.exit(0);
}

let done = 0;
let captured = 0;
let skipped = 0;
let failed = 0;

async function processOne(projectDir) {
  const iterDir = resolve(projectDir, "..");
  const iterLabel = iterDir.split("/").slice(-2).join("/"); // e.g. "ui5-mcp/iteration-3"

  if (!existsSync(join(projectDir, "package.json"))) {
    console.log(`${tag(iterLabel)} ${warn("skip — no package.json (generation never emitted a scaffold)")}`);
    skipped++;
    return;
  }
  if (!values.force && existsSync(join(iterDir, "screenshot.png"))) {
    console.log(`${tag(iterLabel)} skip — screenshot.png already exists (use --force to recapture)`);
    skipped++;
    return;
  }

  const testLabel = findTestLabel(projectDir);
  let renderFailureSignatures = [];
  let minStylesheetRules = 0;
  if (testLabel) {
    try {
      const test = getTest(testLabel);
      renderFailureSignatures = test.renderFailureSignatures;
      minStylesheetRules = test.minStylesheetRules;
    } catch {
      // Unknown/misconfigured test — fall through with no signatures rather
      // than failing the whole capture over a config lookup.
    }
  }

  console.log(`${tag(iterLabel)} Validating + starting dev server...`);
  const validation = await validateProject(projectDir, iterLabel, {
    renderFailureSignatures,
    minStylesheetRules,
  });
  try {
    if (!validation.serverUrl) {
      console.log(
        `${tag(iterLabel)} ${error(`✗ Dev server never came up: ${validation.fatalError || "unknown error"}`)}`,
      );
      failed++;
      return;
    }
    if (!validation.success) {
      // Don't screenshot a build that didn't actually pass — a screenshot of
      // a broken app (or a page that only rendered a library's own error
      // text, e.g. via `renderFailureSignatures`) isn't useful output, and
      // capturing it risks being mistaken for a successful iteration when
      // reviewed later. Treat it the same as "dev server never came up."
      console.log(
        `${tag(iterLabel)} ${warn(`⚠ Build did not pass validation (${validation.fatalError || "render issue"}) — skipping capture`)}`,
      );
      failed++;
      return;
    }
    const primary = await captureScreenshots(validation.serverUrl, iterDir, iterLabel);
    if (primary) {
      console.log(`${tag(iterLabel)} ${success("✓ Screenshots captured")}`);
      captured++;
    } else {
      console.log(`${tag(iterLabel)} ${error("✗ Screenshot capture failed (see _screenshot.txt)")}`);
      failed++;
    }
  } finally {
    killDevServer(validation.devServer);
    done++;
  }
}

// Bounded worker pool — each iteration owns its own dev server on its own
// OS-allocated port, so running several in parallel is the same shape as the
// main pipeline's --concurrency.
let next = 0;
async function worker() {
  while (next < projectDirs.length) {
    const dir = projectDirs[next++];
    await processOne(dir);
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, projectDirs.length) }, worker));

console.log(
  `\nDone. ${captured} captured, ${skipped} skipped, ${failed} failed (of ${projectDirs.length} total).`,
);
process.exit(failed > 0 && captured === 0 ? 1 : 0);
