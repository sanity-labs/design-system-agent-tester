import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/**
 * Performance measurement combining two complementary tools:
 *
 * 1. Lighthouse — Google's official web-perf audit engine (same as Chrome
 *    DevTools / PageSpeed Insights). Measures Core Web Vitals: FCP, LCP,
 *    TBT, TTI, Speed Index, Performance Score.
 *    Runs LIGHTHOUSE_RUNS times and averages for stability.
 *
 * 2. React Profiler — injected via __REACT_DEVTOOLS_GLOBAL_HOOK__ (the same
 *    mechanism used by the React DevTools browser extension). This hook is
 *    installed before any page scripts run, so React calls into it on every
 *    commit without any modification to the generated app code.
 *    Captures actualDuration per commit from the fiber tree, which React
 *    populates in development builds (Vite dev server = dev build).
 */

const LIGHTHOUSE_RUNS = 3;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Measure performance metrics for a generated project.
 *
 * @param {object} opts
 * @param {string} opts.serverUrl  - URL of the running dev server
 * @param {string} opts.iterDir   - Directory for this iteration's output
 * @param {string} opts.iterLabel - Label for logging
 * @returns {Promise<object>} Performance results
 */
export async function measurePerformance({ serverUrl, iterDir, iterLabel }) {
  const { default: lighthouse, desktopConfig } = await import("lighthouse");
  const puppeteer = await import("puppeteer");

  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // ── Phase 1: Lighthouse ─────────────────────────────────────────────────
    console.log(
      `[${iterLabel}] Lighthouse (${LIGHTHOUSE_RUNS} runs)...`,
    );

    const port = parseInt(new URL(browser.wsEndpoint()).port);

    const lhRuns = [];
    for (let i = 0; i < LIGHTHOUSE_RUNS; i++) {
      const { lhr } = await lighthouse(
        serverUrl,
        { port, output: "json", logLevel: "error", throttlingMethod: "provided" },
        desktopConfig,
      );
      lhRuns.push(lhr);
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
    const siVals  = pick("speed-index");
    const scores  = lhRuns.map((lhr) =>
      Math.round((lhr.categories.performance?.score ?? 0) * 100),
    );

    // ── Phase 2: React Profiler ─────────────────────────────────────────────
    console.log(`[${iterLabel}] React Profiler...`);
    const reactProfile = await collectReactProfile(browser, serverUrl, iterLabel);

    // ── Assemble results ────────────────────────────────────────────────────
    const results = {
      label:            iterLabel,
      timestamp:        new Date().toISOString(),
      runs:             LIGHTHOUSE_RUNS,
      // Lighthouse metrics
      fcpMs:            avg(fcpVals),
      lcpMs:            avg(lcpVals),
      tbtMs:            avg(tbtVals),
      ttiMs:            avg(ttiVals),
      speedIndex:       avg(siVals),
      performanceScore: avg(scores),
      perRun: lhRuns.map((lhr, i) => ({
        run:              i + 1,
        fcpMs:            Math.round(lhr.audits["first-contentful-paint"]?.numericValue  ?? 0),
        lcpMs:            Math.round(lhr.audits["largest-contentful-paint"]?.numericValue ?? 0),
        tbtMs:            Math.round(lhr.audits["total-blocking-time"]?.numericValue      ?? 0),
        ttiMs:            Math.round(lhr.audits["interactive"]?.numericValue              ?? 0),
        performanceScore: Math.round((lhr.categories.performance?.score ?? 0) * 100),
      })),
      // React Profiler metrics
      reactProfile,
    };

    await writeFile(
      resolve(iterDir, "_perf_results.json"),
      JSON.stringify(results, null, 2),
      "utf-8",
    );

    console.log(
      `[${iterLabel}] FCP=${results.fcpMs}ms TBT=${results.tbtMs}ms score=${results.performanceScore}` +
      (reactProfile
        ? ` | React mount=${reactProfile.mountMs}ms commits=${reactProfile.commitCount}`
        : ""),
    );

    return results;
  } catch (err) {
    console.warn(`[${iterLabel}] Performance measurement failed: ${err.message}`);
    return {
      label:            iterLabel,
      timestamp:        new Date().toISOString(),
      runs:             LIGHTHOUSE_RUNS,
      fcpMs:            null,
      lcpMs:            null,
      tbtMs:            null,
      ttiMs:            null,
      speedIndex:       null,
      performanceScore: null,
      perRun:           [],
      reactProfile:     null,
      error:            err.message,
    };
  } finally {
    await browser.close();
  }
}

// ─── React Profiler ───────────────────────────────────────────────────────────

/**
 * Collect React commit-level timing by injecting __REACT_DEVTOOLS_GLOBAL_HOOK__
 * into the page before any scripts run.
 *
 * React calls onCommitFiberRoot() synchronously at the end of every commit
 * phase. Each fiber carries actualDuration (ms) — the time React spent
 * rendering that fiber and its entire subtree. This field is populated in
 * development builds; Vite's dev server always produces development builds.
 *
 * Returns null if the page has no React, or if actualDuration is unavailable
 * (e.g. a production/minified build).
 *
 * @param {import("puppeteer").Browser} browser
 * @param {string} serverUrl
 * @param {string} iterLabel
 * @returns {Promise<ReactProfile | null>}
 *
 * @typedef {{
 *   mountMs:      number,   // Initial mount duration (first commit)
 *   commitCount:  number,   // Total number of React commits observed
 *   avgUpdateMs:  number,   // Average duration of commits after the initial mount
 *   maxUpdateMs:  number,   // Slowest update commit
 *   commits:      Array<{ durationMs: number, timestampMs: number }>,
 * }} ReactProfile
 */
async function collectReactProfile(browser, serverUrl, iterLabel) {
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1440, height: 900 });

    // Install the hook BEFORE any page scripts execute.
    // React reads window.__REACT_DEVTOOLS_GLOBAL_HOOK__ at module evaluation
    // time and stores a reference — setting it afterwards has no effect.
    await page.evaluateOnNewDocument(() => {
      window.__REACT_PROFILER_COMMITS__ = [];

      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        // Minimum interface React 16–18 expects on the hook object.
        supportsFiber:       true,
        isDisabled:          false,
        renderers:           new Map(),

        // Called once per renderer (ReactDOM) at module initialisation.
        inject:              () => {},
        // Used by React to assert that dead-code elimination ran correctly.
        checkDCE:            () => {},

        // Scheduling notifications — not needed for profiling but must exist.
        onScheduleFiberRoot: () => {},
        onScheduleRoot:      () => {},

        // Called when a root unmounts.
        onUnmountFiberRoot:  () => {},

        // Called when an individual fiber unmounts.
        onCommitFiberUnmount: () => {},

        // Called after passive effects (useEffect) flush — not used here.
        onPostCommitFiberRoot: () => {},

        /**
         * Called synchronously at the end of every React commit phase.
         *
         * @param {number}  _rendererID  - opaque ID assigned by React
         * @param {object}  root         - FiberRoot object
         */
        onCommitFiberRoot: (_rendererID, root) => {
          // root.current is the HostRoot fiber. Its child is the top-most
          // user component (e.g. <App> or <React.StrictMode>).
          // actualDuration on the child equals the total reconciler time for
          // the entire component tree during this commit.
          const topFiber = root?.current?.child;
          if (!topFiber) return;

          const duration = topFiber.actualDuration;

          // actualDuration is undefined in production builds and is 0 only
          // when React bailed out of the entire subtree (no re-render needed).
          // Both are valid data points so we record them.
          if (typeof duration !== "number") return;

          window.__REACT_PROFILER_COMMITS__.push({
            durationMs:  duration,
            timestampMs: performance.now(),
          });
        },
      };
    });

    // Navigate and wait for the app to fully render and settle.
    await page.goto(serverUrl, {
      waitUntil: "networkidle0",
      timeout:   30_000,
    });

    // Give React time to flush any deferred useEffect / Suspense work.
    await new Promise((r) => setTimeout(r, 1500));

    const commits = await page.evaluate(
      () => window.__REACT_PROFILER_COMMITS__ ?? [],
    );

    if (commits.length === 0) {
      // No commits recorded — either not a React app, or a production build.
      console.warn(
        `[${iterLabel}] React Profiler: no commits recorded (production build or non-React page)`,
      );
      return null;
    }

    const mountMs = round(commits[0].durationMs);

    // Updates = everything after the initial mount.
    const updates = commits.slice(1).filter((c) => c.durationMs > 0);
    const avgUpdateMs = updates.length
      ? round(updates.reduce((s, c) => s + c.durationMs, 0) / updates.length)
      : 0;
    const maxUpdateMs = updates.length
      ? round(Math.max(...updates.map((c) => c.durationMs)))
      : 0;

    return {
      mountMs,
      commitCount:  commits.length,
      avgUpdateMs,
      maxUpdateMs,
      commits: commits.map((c) => ({
        durationMs:  round(c.durationMs),
        timestampMs: round(c.timestampMs),
      })),
    };
  } catch (err) {
    console.warn(`[${iterLabel}] React Profiler failed: ${err.message}`);
    return null;
  } finally {
    await page.close();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return n;
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}
