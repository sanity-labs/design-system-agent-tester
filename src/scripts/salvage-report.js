#!/usr/bin/env node
/**
 * Rebuild a report from a run directory after the run itself died.
 *
 * The harness normally reports from the results it is holding in memory, so a
 * run that is killed part-way leaves finished iterations on disk with no
 * report. This reads those back and produces one.
 *
 * Only iterations with a `_meta.json` are included, because that file is
 * written last and is what marks an iteration finished.
 *
 * Usage:
 *   node src/scripts/salvage-report.js output/2026-09-14/09.58
 *   node src/scripts/salvage-report.js output/2026-09-14/09.58 --out report-salvaged
 *
 * One number is missing compared to a normal report: how long each iteration
 * took is not stored in `_meta.json`, so the timing table shows dashes rather
 * than a guess made from file timestamps.
 *
 * Source-derived metrics added to the harness AFTER a run finished are
 * recomputed here from the project files on disk, so an older run can be
 * re-reported against the current metric set rather than showing dashes for
 * something the sources can still answer. See `backfillSourceMetrics`.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { getTest } from "../config/prompts.js";
import { extractComponentImports } from "../evaluation/extract-component-imports.js";
import { computeJsxPropDensity } from "../evaluation/jsx-prop-density.js";
import { isSourceFile } from "../evaluation/parse-files.js";
import { generateReport } from "../reporting/report.js";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: "string", default: "report" },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help || positionals.length === 0) {
  console.log(`
salvage-report — rebuild a report from a run directory after the run died.

Usage:
  node src/scripts/salvage-report.js <run-dir> [--out <basename>]

Writes <run-dir>/<basename>.json and .md. Defaults to "report", which
overwrites any existing one, so pass --out to keep both.
`);
  process.exit(values.help ? 0 : 1);
}

const runDir = resolve(positionals[0]);

/** Read the source files an iteration produced, for the variance metric. */
async function readProjectSources(projectDir) {
  const out = [];
  async function walk(dir, prefix = "") {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name.startsWith(".")) continue;
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) {
        await walk(join(dir, e.name), rel);
      } else if (isSourceFile(rel)) {
        try {
          out.push({ path: rel, content: await readFile(join(dir, e.name), "utf-8") });
        } catch {
          // Unreadable file: skip it rather than lose the whole iteration.
        }
      }
    }
  }
  await walk(projectDir);
  return out;
}

/**
 * Recompute source-derived metrics that a run's `_meta.json` predates.
 *
 * Only for metrics that are a pure function of the project sources plus the
 * test config — anything needing the browser, the agent log or timing cannot
 * be recovered and is left null. Existing values are never overwritten: a
 * number the run itself recorded is the authority.
 *
 * Needs the test config for its `coverage.primitives` and
 * `componentImportPaths`. A salvaged run can name an arm whose config has
 * since been renamed or deleted, so a lookup failure skips the backfill for
 * that arm instead of failing the salvage.
 */
function backfillSourceMetrics(iteration, arm) {
  if (iteration.jsxPropDensity !== undefined) return iteration;

  let test;
  try {
    test = getTest(arm);
  } catch {
    return iteration;
  }

  const files = iteration.files ?? [];
  const packageNames = Object.values(test.packages || {})
    .map((p) => p?.name)
    .filter((n) => typeof n === "string" && n.length > 0);
  // Prefer the component list the run recorded — it reflects the test config
  // as it was at the time. Fall back to re-extracting only if absent.
  const dsComponents = Array.isArray(iteration.componentImports)
    ? iteration.componentImports
    : extractComponentImports(files, packageNames, test.componentImportPaths);

  return {
    ...iteration,
    jsxPropDensity: computeJsxPropDensity(files, {
      dsComponents,
      primitives: test.coverage?.primitives,
      rawAllowlist: test.coverage?.rawAllowlist,
    }),
  };
}

const armDirs = (await readdir(runDir, { withFileTypes: true }))
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const allResults = {};
let total = 0;
let skipped = 0;

for (const arm of armDirs) {
  const armPath = join(runDir, arm);
  const iterNames = (await readdir(armPath, { withFileTypes: true }))
    .filter((e) => e.isDirectory() && e.name.startsWith("iteration-"))
    .map((e) => e.name)
    .sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]));

  const iterations = [];
  for (const name of iterNames) {
    const iterDir = join(armPath, name);
    let meta;
    try {
      meta = JSON.parse(await readFile(join(iterDir, "_meta.json"), "utf-8"));
    } catch {
      skipped += 1;
      continue;
    }
    iterations.push(
      backfillSourceMetrics(
        {
          ...meta,
          iteration: Number(name.split("-")[1]),
          // Not recorded per iteration, so the timing table shows dashes.
          elapsedSeconds: null,
          files: await readProjectSources(join(iterDir, "project")),
        },
        arm,
      ),
    );
    total += 1;
  }

  if (iterations.length > 0) {
    allResults[arm] = iterations;
    console.log(`  ${arm}: ${iterations.length} iteration(s)`);
  } else {
    console.log(`  ${arm}: none finished, omitted`);
  }
}

if (total === 0) {
  console.error("No finished iterations found. Nothing to report.");
  process.exit(1);
}

await generateReport(allResults, runDir, null, { reportName: values.out });
console.log(
  `\nRebuilt from ${total} iteration(s)${skipped ? `, skipped ${skipped} unfinished` : ""}.`,
);
console.log(`Wrote ${join(runDir, `${values.out}.json`)} and .md`);
