/**
 * Lighthouse performance audit.
 *
 * Collects Core Web Vitals: First Contentful Paint, Largest Contentful
 * Paint, Total Blocking Time, Time to Interactive, Speed Index, and an
 * overall score.
 *
 * Runs several times and averages, because a single run varies too much to
 * compare against another.
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launchBrowser, withTimeout } from "./puppeteer-helpers.js";

const LIGHTHOUSE_RUNS = 3;

/**
 * Time limit for one Lighthouse run.
 *
 * A run normally takes a few seconds. This only catches a run that has stopped
 * making progress, which happens when its connection to the browser breaks: the
 * call then waits for a reply that never arrives.
 */
const PER_RUN_TIMEOUT_MS = 120_000;

/**
 * Time limit for the whole measurement, including starting and closing the
 * browser.
 *
 * This is the important one. Lighthouse runs are queued one at a time, so a
 * measurement that never finishes holds the queue and every later iteration
 * waits behind it forever. Bounding it means the queue always moves on.
 */
const TOTAL_TIMEOUT_MS = 8 * 60_000;

/**
 * Lighthouse runs one at a time.
 *
 * Two Lighthouse runs against the same browser at once clash over a shared
 * timing mark, and one of them fails with an error about a missing mark. The
 * failure happens inside a timer that nothing waits on, so it surfaces as an
 * unhandled rejection and the try/catch around each run never sees it. This
 * took down a whole run once, with six iterations in flight.
 *
 * Queueing them removes the clash. Everything else in an iteration still runs
 * concurrently; only this measurement waits. Those queued runs still share the
 * machine with other builds, so timings taken during a concurrent run are
 * noisier than a sequential one. This fixes the crash, not that noise.
 */
let lighthouseLock = Promise.resolve();

/**
 * Run `fn` once every previously queued Lighthouse job has finished.
 *
 * Neither a job that fails nor one that never finishes blocks the next: a job
 * that outlives `timeoutMs` is abandoned and the queue moves on. Exported for
 * tests.
 *
 * Abandoning a job does not stop it, so a caller that holds resources should
 * clean them up when this rejects.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {number} [timeoutMs]
 * @returns {Promise<T>}
 */
export function withLighthouseLock(fn, timeoutMs = TOTAL_TIMEOUT_MS) {
  // The time limit is applied here, not in the caller, because it is the queue
  // that needs protecting. A job that never settles would otherwise hold the
  // queue and every job behind it would wait forever.
  const guarded = () => withTimeout(fn(), timeoutMs, "Lighthouse measurement");
  const run = lighthouseLock.then(guarded, guarded);
  lighthouseLock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

export async function measureLighthouse(opts) {
  return measureLighthouseGuarded(opts);
}

/**
 * Close a browser we have given up waiting for.
 *
 * A measurement that timed out is still holding its browser, and its own
 * cleanup will never run because it is stuck waiting. Ask it to close, and if
 * that does not work either, kill the process. Without this the browser
 * outlives the run.
 */
async function forceCloseBrowser(browser, iterLabel) {
  if (!browser) return;
  try {
    await withTimeout(browser.close(), 10_000, "browser close");
  } catch {
    try {
      browser.process()?.kill("SIGKILL");
    } catch {
      console.warn(`[${iterLabel}] Could not close the Lighthouse browser; it may be left behind.`);
    }
  }
}

/**
 * Start the measurement and clean up after it if the queue abandons it.
 *
 * `measureLighthouseUnlocked` promises never to throw, but that is not the same
 * as promising to finish: if its connection to the browser breaks it can wait
 * forever. The queue puts a stop to that, and this turns the resulting failure
 * back into ordinary empty results.
 */
async function measureLighthouseGuarded(opts) {
  const handle = {};
  try {
    return await withLighthouseLock(() => measureLighthouseUnlocked(opts, handle));
  } catch (err) {
    console.warn(`[${opts.iterLabel}] ${err.message} — giving up on this measurement.`);
    await forceCloseBrowser(handle.browser, opts.iterLabel);
    const results = emptyResults(opts.iterLabel, err.message);
    await writeResults(opts.iterDir, results);
    return results;
  }
}

async function measureLighthouseUnlocked({ serverUrl, iterDir, iterLabel }, handle = {}) {
  // Everything that can throw lives inside the try so this function honors
  // its "never throws" contract and never leaks the browser. `browser` is
  // declared here so the `finally` can close it only when it was opened.
  let browser = null;
  try {
    const { default: lighthouse, desktopConfig } = await import("lighthouse");
    browser = await launchBrowser();
    // Share it with the guard above, so a measurement that times out can still
    // have its browser closed.
    handle.browser = browser;

    console.log(`[${iterLabel}] Lighthouse (${LIGHTHOUSE_RUNS} runs)...`);

    const port = parseInt(new URL(browser.wsEndpoint()).port, 10);
    if (!Number.isInteger(port)) {
      throw new Error(
        `Could not read the Chrome DevTools port from the Puppeteer endpoint (${browser.wsEndpoint()})`,
      );
    }

    const lhRuns = [];
    for (let i = 0; i < LIGHTHOUSE_RUNS; i++) {
      try {
        const { lhr } = await withTimeout(
          lighthouse(
            serverUrl,
            {
              // Reuse the Chrome we already started. Without this, Lighthouse tries to
              // start its own on a fixed port and fails when that port is in use.
              port,
              output: "json",
              logLevel: "error",
              // Report real timings rather than simulated ones. These are sensitive to
              // a busy machine, so the harness runs one iteration at a time by default
              // and serialises Lighthouse runs when it does not.
              throttlingMethod: "provided",
            },
            desktopConfig,
          ),
          PER_RUN_TIMEOUT_MS,
          `Lighthouse run ${i + 1}/${LIGHTHOUSE_RUNS} (${iterLabel})`,
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
      lhRuns.map((lhr) => lhr.audits[key]?.numericValue ?? null).filter((v) => v !== null);

    const mean = (vals) =>
      vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;

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
    // Drop runs with no score instead of counting them as zero, which would
    // pull the average down. Same as how the other metrics skip missing
    // values.
    const scoreVals = lhRuns
      .map((lhr) => lhr.categories.performance?.score)
      .filter((s) => s != null)
      .map((s) => Math.round(s * 100));

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
      // The top-level fields report the median across runs, which is less
      // affected by one bad run. The `metrics` block has the mean, median and
      // each individual run.
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
    // Give Lighthouse a moment to finish before closing the browser. Its own
    // polling can fire once more after it reports being done, and closing too
    // early makes that fail.
    if (browser) {
      await new Promise((r) => setTimeout(r, 100));
      await browser.close();
    }
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
