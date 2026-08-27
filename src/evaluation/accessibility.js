/**
 * Accessibility audit (axe-core).
 *
 * Data point: WCAG accessibility violations detected by axe-core. Runs
 * one scan in light mode and one in dark mode (via
 * `prefers-color-scheme: dark` media emulation), then merges the results.
 *
 * Self-contained: opens its own browser instance.
 */

import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import {
  launchBrowser,
  MEASURE_TIMEOUT_MS,
  NAV_TIMEOUT_MS,
  waitForRenderedContent,
  withTimeout,
} from "./puppeteer-helpers.js";

const require = createRequire(import.meta.url);

/**
 * WCAG tag sets to test against.
 * Each scan uses these tags to filter axe-core rules.
 */
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

/**
 * Run accessibility tests against a running dev server URL.
 *
 * Uses axe-core as the sole engine — no custom test logic.
 * Runs two scans:
 *   1. Light mode (default) — standard axe sweep
 *   2. Dark mode — emulates prefers-color-scheme: dark, then re-scans
 *
 * @param {object} opts
 * @param {string} opts.serverUrl - The dev server URL to test
 * @param {string} opts.iterDir  - Directory for this iteration's output
 * @param {string} opts.iterLabel - Label for logging
 * @param {string[]} [opts.colorSchemes] - restrict to these schemes (per-test
 *   `measure.colorSchemes`). Omitted means both.
 * @returns {Promise<object>} A11y results object (never throws)
 */
export async function runAccessibilityTests({ serverUrl, iterDir, iterLabel, colorSchemes }) {
  // A system that ships light only has no dark mode to audit. Scanning one
  // anyway measures whatever dark styling the agent invented and files it
  // under the design system's score.
  const scanDark = !colorSchemes?.length || colorSchemes.includes("dark");
  console.log(`[${iterLabel}] Running accessibility tests (axe-core)...`);

  let browser = null;

  try {
    // Load axe-core source
    let axeSource;
    try {
      const axeCorePath = require.resolve("axe-core");
      axeSource = await readFile(axeCorePath, "utf-8");
    } catch (err) {
      return skipAll(`Failed to load axe-core: ${err.message}`, iterLabel, iterDir);
    }

    browser = await launchBrowser();

    const page = await browser.newPage();
    page.setDefaultTimeout(NAV_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
    await page.setViewport({ width: 1440, height: 900 });

    // Navigate and wait for content
    try {
      await page.goto(serverUrl, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT_MS });
    } catch (err) {
      return skipAll(`Page failed to load: ${err.message}`, iterLabel, iterDir);
    }

    await waitForRenderedContent(page, { iterLabel });

    // Inject axe-core
    try {
      await page.evaluate(axeSource);
    } catch (err) {
      return skipAll(`Failed to inject axe-core: ${err.message}`, iterLabel, iterDir);
    }

    // axe.run walks the whole (agent-generated) DOM; bound it so a
    // pathological page can't hang the scan indefinitely.
    const runAxe = () =>
      withTimeout(
        page.evaluate(async (tags) => {
          return await window.axe.run(document, {
            runOnly: { type: "tag", values: tags },
          });
        }, AXE_TAGS),
        MEASURE_TIMEOUT_MS,
        `axe.run (${iterLabel})`,
      );

    // ── Scan 1: Light mode (default) ──────────────────────────────────────
    const lightResult = await runAxe();

    // ── Scan 2: Dark mode ─────────────────────────────────────────────────
    let darkResult = null;
    if (scanDark) {
      await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
      // Allow CSS transitions to settle
      await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));

      // Re-inject axe-core (media change may have triggered navigation in some
      // SPAs). If re-injection fails we must NOT run a dark scan — doing so
      // would silently re-run against the stale light-mode axe global and
      // report bogus dark numbers. Skip the dark scan entirely instead.
      let darkInjected = true;
      try {
        await page.evaluate(axeSource);
      } catch {
        darkInjected = false;
      }

      if (darkInjected) {
        try {
          darkResult = await runAxe();
        } catch {
          darkResult = null;
        }
      }
    }

    // ── Assemble results ──────────────────────────────────────────────────
    const lightViolations = lightResult.violations || [];
    const darkViolations = darkResult?.violations || [];

    // Merge violations — deduplicate by rule ID, but track which mode they appeared in
    const violationMap = new Map();

    for (const v of lightViolations) {
      violationMap.set(v.id, {
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        tags: v.tags.filter((t) => t.startsWith("wcag")),
        modes: ["light"],
        nodeCount: v.nodes.length,
        nodes: v.nodes.slice(0, 5).map((n) => ({
          html: (n.html || "").slice(0, 150),
          target: n.target,
          failureSummary: n.failureSummary,
        })),
      });
    }

    for (const v of darkViolations) {
      if (violationMap.has(v.id)) {
        const existing = violationMap.get(v.id);
        existing.modes.push("dark");
        existing.nodeCount = Math.max(existing.nodeCount, v.nodes.length);
      } else {
        violationMap.set(v.id, {
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          tags: v.tags.filter((t) => t.startsWith("wcag")),
          modes: ["dark"],
          nodeCount: v.nodes.length,
          nodes: v.nodes.slice(0, 5).map((n) => ({
            html: (n.html || "").slice(0, 150),
            target: n.target,
            failureSummary: n.failureSummary,
          })),
        });
      }
    }

    const allViolations = [...violationMap.values()];

    const results = {
      label: iterLabel,
      timestamp: new Date().toISOString(),
      axeViolationCount: allViolations.length,
      axeViolations: allViolations,
      light: {
        violationCount: lightViolations.length,
        passCount: (lightResult.passes || []).length,
        incompleteCount: (lightResult.incomplete || []).length,
        inapplicableCount: (lightResult.inapplicable || []).length,
      },
      dark: darkResult
        ? {
            violationCount: darkViolations.length,
            passCount: (darkResult.passes || []).length,
            incompleteCount: (darkResult.incomplete || []).length,
          }
        : // Distinguish "not asked for" from "tried and failed". Both are
          // `null` otherwise, and a reader of the JSON cannot tell a
          // deliberately light-only system from a broken dark scan.
          scanDark
          ? null
          : { skipped: "measure.colorSchemes excludes dark" },
      summary: {
        totalViolations: allViolations.length,
        lightViolations: lightViolations.length,
        darkOnlyViolations: darkViolations.filter(
          (v) => !lightViolations.some((lv) => lv.id === v.id),
        ).length,
        passed: allViolations.length === 0,
      },
    };

    await safeWriteResults(iterDir, results);

    const darkExtra = results.summary.darkOnlyViolations;
    console.log(
      `[${iterLabel}] ✓ Accessibility: ${allViolations.length} violation(s)` +
        ` (${lightViolations.length} light` +
        (darkExtra > 0 ? `, +${darkExtra} dark-only` : "") +
        `, ${(lightResult.passes || []).length} passed)`,
    );

    return results;
  } catch (err) {
    console.warn(`[${iterLabel}] ⚠ Accessibility tests failed: ${err.message}`);
    return skipAll(`Unexpected error: ${err.message}`, iterLabel, iterDir);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Return a "skipped" result when tests can't run.
 */
async function skipAll(reason, iterLabel, iterDir) {
  console.warn(`[${iterLabel}] ⚠ Accessibility tests skipped: ${reason}`);
  const results = {
    label: iterLabel,
    timestamp: new Date().toISOString(),
    axeViolationCount: 0,
    axeViolations: [],
    light: null,
    dark: null,
    summary: {
      totalViolations: 0,
      lightViolations: 0,
      darkOnlyViolations: 0,
      passed: false,
      skipped: true,
      reason,
    },
  };
  await safeWriteResults(iterDir, results);
  return results;
}

/**
 * Write results JSON, ignoring write errors.
 */
async function safeWriteResults(iterDir, results) {
  try {
    const outPath = resolve(iterDir, "_a11y_results.json");
    await writeFile(outPath, JSON.stringify(results, null, 2), "utf-8");
  } catch {
    // Ignore write errors — don't let them mask test results
  }
}
