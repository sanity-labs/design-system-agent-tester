/**
 * Lighthouse performance audit.
 *
 * Data point: Core Web Vitals captured by Google Lighthouse — First
 * Contentful Paint, Largest Contentful Paint, Total Blocking Time, Time
 * to Interactive, Speed Index, and an overall performance score.
 *
 * Runs `LIGHTHOUSE_RUNS` times and averages each metric for stability.
 *
 * Self-contained: opens its own Chrome instance via Puppeteer.
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const LIGHTHOUSE_RUNS = 3;

/**
 * Run Lighthouse against a running dev server.
 *
 * @param {object} opts
 * @param {string} opts.serverUrl - URL of the running dev server
 * @param {string} opts.iterDir   - Directory for this iteration's output
 * @param {string} opts.iterLabel - Label for logging
 * @returns {Promise<object>} Lighthouse results (never throws)
 */
export async function measureLighthouse({ serverUrl, iterDir, iterLabel }) {
  const { default: lighthouse, desktopConfig } = await import("lighthouse");
  const puppeteer = await import("puppeteer");

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    console.log(`[${iterLabel}] Lighthouse (${LIGHTHOUSE_RUNS} runs)...`);

    const port = parseInt(new URL(browser.wsEndpoint()).port);

    const lhRuns = [];
    for (let i = 0; i < LIGHTHOUSE_RUNS; i++) {
      try {
        const { lhr } = await lighthouse(
          serverUrl,
          {
            // `port` reuses the Puppeteer-launched Chrome instance —
            // without it, lighthouse tries to spawn its own Chrome at
            // the default port 9222 and fails on a busy host (the
            // "Failed to fetch browser webSocket URL ... 9222" error).
            port,
            output: "json",
            logLevel: "error",
            // `provided` reports raw wall-clock timing, which is
            // sensitive to CPU contention — but the harness now
            // defaults to `--concurrency 1`, so concurrent iterations
            // don't compete and the numbers are stable. Switching to
            // `simulated` here doesn't work with lighthouse's
            // `desktopConfig` preset (the override leaves the rest of
            // the lantern pipeline misconfigured and audits return
            // null numeric values).
            throttlingMethod: "provided",
          },
          desktopConfig,
        );
        lhRuns.push(lhr);
      } catch (lhErr) {
        // Lighthouse internals (marky/lighthouse-logger) can crash on Node 24+
        // due to strict performance.measure() enforcement. Skip this run.
        console.warn(
          `[${iterLabel}] Lighthouse run ${i + 1}/${LIGHTHOUSE_RUNS} failed: ${lhErr.message}`,
        );
      }
    }

    if (lhRuns.length === 0) {
      const results = emptyResults(iterLabel, "All Lighthouse runs failed");
      await writeResults(iterDir, results);
      return results;
    }

    const pick = (key) =>
      lhRuns
        .map((lhr) => lhr.audits[key]?.numericValue ?? null)
        .filter((v) => v !== null);

    const mean = (vals) =>
      vals.length
        ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        : null;

    const median = (vals) => {
      if (!vals.length) return null;
      const sorted = [...vals].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2
        ? Math.round(sorted[mid])
        : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    };

    /** Build a `{mean, median, runs}` block for one metric. */
    const summary = (vals) => ({
      mean: mean(vals),
      median: median(vals),
      runs: vals,
    });

    const fcpVals = pick("first-contentful-paint");
    const lcpVals = pick("largest-contentful-paint");
    const tbtVals = pick("total-blocking-time");
    const ttiVals = pick("interactive");
    const siVals = pick("speed-index");
    const scoreVals = lhRuns.map((lhr) =>
      Math.round((lhr.categories.performance?.score ?? 0) * 100),
    );

    const metrics = {
      fcp: summary(fcpVals),
      lcp: summary(lcpVals),
      tbt: summary(tbtVals),
      tti: summary(ttiVals),
      speedIndex: summary(siVals),
      performanceScore: summary(scoreVals),
    };

    const results = {
      label: iterLabel,
      timestamp: new Date().toISOString(),
      runs: LIGHTHOUSE_RUNS,
      throttlingMethod: "provided",
      // Top-level scalar fields preserve backward-compat with older
      // consumers. They report the **median** across the lighthouse
      // runs (robust to outliers). The `metrics` block exposes the
      // mean / median / per-run values for each metric explicitly.
      fcpMs: metrics.fcp.median,
      lcpMs: metrics.lcp.median,
      tbtMs: metrics.tbt.median,
      ttiMs: metrics.tti.median,
      speedIndex: metrics.speedIndex.median,
      performanceScore: metrics.performanceScore.median,
      metrics,
      perRun: lhRuns.map((lhr, i) => ({
        run: i + 1,
        fcpMs: Math.round(lhr.audits["first-contentful-paint"]?.numericValue ?? 0),
        lcpMs: Math.round(lhr.audits["largest-contentful-paint"]?.numericValue ?? 0),
        tbtMs: Math.round(lhr.audits["total-blocking-time"]?.numericValue ?? 0),
        ttiMs: Math.round(lhr.audits["interactive"]?.numericValue ?? 0),
        performanceScore: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      })),
    };

    await writeResults(iterDir, results);

    console.log(
      `[${iterLabel}] FCP median=${metrics.fcp.median}ms mean=${metrics.fcp.mean}ms | TBT median=${metrics.tbt.median}ms | score=${metrics.performanceScore.median}`,
    );

    return results;
  } catch (err) {
    console.warn(`[${iterLabel}] Lighthouse measurement failed: ${err.message}`);
    const results = emptyResults(iterLabel, err.message);
    await writeResults(iterDir, results);
    return results;
  } finally {
    // Let any pending Lighthouse microtasks settle before tearing
    // down the CDP session. Lighthouse's internal `checkForQuiet`
    // polling can re-fire one more time after `lighthouse()` resolves,
    // and if we close the browser too eagerly its evaluate call hits
    // a dead session and rejects unhandled. A short flush gives those
    // tasks a chance to finish on a live session. The global
    // unhandledRejection handler in src/index.js catches anything
    // that still slips through.
    await new Promise((r) => setTimeout(r, 100));
    await browser.close();
  }
}

function emptyResults(iterLabel, errorMsg) {
  return {
    label: iterLabel,
    timestamp: new Date().toISOString(),
    runs: 0,
    fcpMs: null,
    lcpMs: null,
    tbtMs: null,
    ttiMs: null,
    speedIndex: null,
    performanceScore: null,
    perRun: [],
    error: errorMsg,
  };
}

async function writeResults(iterDir, results) {
  await writeFile(
    resolve(iterDir, "_lighthouse_results.json"),
    JSON.stringify(results, null, 2),
    "utf-8",
  );
}
