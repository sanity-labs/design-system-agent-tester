#!/usr/bin/env node
/**
 * refilter.js — Regenerate a report for a specific run, excluding contaminated
 * iterations where agents imported Box/Flex/Grid/Text/Heading/Card from @sanity/ui
 * instead of ui-poc.
 *
 * Usage:
 *   node src/refilter.js
 *
 * Hardcoded for: output/2026-04-15-11.24, training only, exclude iterations 1, 2, 20.
 */

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { generateReport } from "../reporting/report.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");

// ─── Config ───────────────────────────────────────────────────────────────────

const RUN_DIR        = resolve(ROOT, "output/2026-04-15-11.24");
const PROMPT         = "training";
const EXCLUDE        = new Set([1, 2, 20]);
const TOTAL_ITERS    = 30;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function readJson(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf-8"));
  } catch {
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const included = [];
  for (let i = 1; i <= TOTAL_ITERS; i++) {
    if (EXCLUDE.has(i)) continue;
    included.push(i);
  }

  console.log(`Run dir : ${RUN_DIR}`);
  console.log(`Prompt  : ${PROMPT}`);
  console.log(`Excluded: ${[...EXCLUDE].join(", ")}`);
  console.log(`Included: ${included.length} iterations (${included.join(", ")})\n`);

  const results = [];

  for (const n of included) {
    const iterDir  = resolve(RUN_DIR, PROMPT, `iteration-${n}`);
    const metaPath = resolve(iterDir, "_meta.json");
    const perfPath = resolve(iterDir, "_perf_results.json");

    const meta = await readJson(metaPath);
    if (!meta) {
      console.warn(`[iteration-${n}] No _meta.json — skipping`);
      continue;
    }

    const perfFromFile = await readJson(perfPath);
    const perfResults  = perfFromFile ?? meta.perfResults ?? null;

    results.push({
      iteration:          n,
      elapsedSeconds:     meta.elapsedSeconds     ?? 0,
      model:              meta.model              ?? null,
      linesOfCode:        meta.linesOfCode        ?? 0,
      files:              [],   // project dirs are gone; code variance will be empty
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
    });

    console.log(`[iteration-${n}] loaded`);
  }

  if (results.length === 0) {
    console.error("No iterations loaded — aborting.");
    process.exit(1);
  }

  console.log(`\nLoaded ${results.length} iterations. Generating report…\n`);

  await generateReport({ [PROMPT]: results }, RUN_DIR);

  // ── Quick summary from the freshly written report.json ─────────────────────
  const reportPath = resolve(RUN_DIR, "report.json");
  const report     = await readJson(reportPath);
  const p          = report?.prompts?.[PROMPT];

  if (p) {
    const is   = p.inlineStyles;
    const perf = p.performance;
    const fa   = p.fixAttempts;
    const sc   = p.sanityUIComponents;

    console.log("─── Report summary ─────────────────────────────────────────");
    console.log(`Iterations in report : ${p.totalIterations}`);
    console.log(`Successful iterations: ${p.successfulIterations}`);
    console.log("");
    console.log("Fix attempts");
    console.log(`  avg per iteration  : ${fa?.average}`);
    console.log(`  clean on first try : ${fa?.iterationsCleanOnFirstTry}`);
    console.log("");
    console.log("Inline styles");
    console.log(`  total              : ${is?.totalAcrossIterations}`);
    console.log(`  avg per iteration  : ${is?.averagePerIteration}`);
    console.log(`  Box inline styles  : ${is?.byComponent?.Box ?? 0}`);
    console.log("");
    console.log("Performance");
    console.log(`  avg FCP (ms)       : ${perf?.avgFcpMs}`);
    console.log(`  avg TBT (ms)       : ${perf?.avgTbtMs}`);
    console.log(`  avg React mount    : ${perf?.reactMountMs}`);
    console.log("");
    console.log("Sanity UI components");
    console.log(`  avg per iteration  : ${sc?.averageComponentsPerIteration}`);
    console.log("────────────────────────────────────────────────────────────");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
