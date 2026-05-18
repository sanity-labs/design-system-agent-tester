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
          { port, output: "json", logLevel: "error", throttlingMethod: "provided" },
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

    const avg = (vals) =>
      vals.length
        ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        : null;

    const fcpVals = pick("first-contentful-paint");
    const lcpVals = pick("largest-contentful-paint");
    const tbtVals = pick("total-blocking-time");
    const ttiVals = pick("interactive");
    const siVals = pick("speed-index");
    const scores = lhRuns.map((lhr) =>
      Math.round((lhr.categories.performance?.score ?? 0) * 100),
    );

    const results = {
      label: iterLabel,
      timestamp: new Date().toISOString(),
      runs: LIGHTHOUSE_RUNS,
      fcpMs: avg(fcpVals),
      lcpMs: avg(lcpVals),
      tbtMs: avg(tbtVals),
      ttiMs: avg(ttiVals),
      speedIndex: avg(siVals),
      performanceScore: avg(scores),
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
      `[${iterLabel}] FCP=${results.fcpMs}ms TBT=${results.tbtMs}ms score=${results.performanceScore}`,
    );

    return results;
  } catch (err) {
    console.warn(`[${iterLabel}] Lighthouse measurement failed: ${err.message}`);
    const results = emptyResults(iterLabel, err.message);
    await writeResults(iterDir, results);
    return results;
  } finally {
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
