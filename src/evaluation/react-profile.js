/**
 * React commit-level profiling.
 *
 * Data point: per-commit render durations from the React reconciler.
 * Captured by injecting `__REACT_DEVTOOLS_GLOBAL_HOOK__` into the page
 * before any scripts run — the same mechanism the React DevTools browser
 * extension uses. React calls `onCommitFiberRoot()` synchronously at the
 * end of every commit phase; each fiber carries an `actualDuration` field
 * (populated in development builds, which Vite's dev server always emits).
 *
 * Returns:
 *   - mountMs:      initial mount duration (first commit)
 *   - commitCount:  total commits observed
 *   - avgUpdateMs:  average duration of post-mount commits
 *   - maxUpdateMs:  slowest update commit
 *   - commits:      raw per-commit array
 *
 * Returns null if the page has no React, or if `actualDuration` is
 * unavailable (e.g. a production / minified build).
 *
 * Self-contained: opens its own Chrome instance via Puppeteer.
 */

import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { round } from "../util/round.js";
import { launchBrowser, NAV_TIMEOUT_MS } from "./puppeteer-helpers.js";

/**
 * @typedef {{
 *   mountMs:     number,
 *   commitCount: number,
 *   avgUpdateMs: number,
 *   maxUpdateMs: number,
 *   commits:     Array<{ durationMs: number, timestampMs: number }>,
 * }} ReactProfile
 */

/**
 * Capture React commit-level timing for a running dev server.
 *
 * @param {object} opts
 * @param {string} opts.serverUrl
 * @param {string} opts.iterDir
 * @param {string} opts.iterLabel
 * @returns {Promise<ReactProfile | null>}
 */
export async function measureReactProfile({ serverUrl, iterDir, iterLabel }) {
  // Launch inside the try so a launch/import failure honors the null
  // contract instead of throwing, and never leaks a half-open browser.
  let browser = null;
  try {
    browser = await launchBrowser();
    console.log(`[${iterLabel}] React Profiler...`);
    const page = await browser.newPage();
    page.setDefaultTimeout(NAV_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
    await page.setViewport({ width: 1440, height: 900 });

    // Install the hook BEFORE any page scripts execute. React reads
    // window.__REACT_DEVTOOLS_GLOBAL_HOOK__ at module evaluation time and
    // stores a reference — setting it afterwards has no effect.
    await page.evaluateOnNewDocument(() => {
      window.__REACT_PROFILER_COMMITS__ = [];

      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        supportsFiber: true,
        isDisabled: false,
        renderers: new Map(),
        inject: () => {},
        checkDCE: () => {},
        onScheduleFiberRoot: () => {},
        onScheduleRoot: () => {},
        onUnmountFiberRoot: () => {},
        onCommitFiberUnmount: () => {},
        onPostCommitFiberRoot: () => {},
        onCommitFiberRoot: (_rendererID, root) => {
          // Prefer the HostRoot fiber's actualDuration — it aggregates the
          // whole commit (all top-level children / Fragments). Fall back to
          // the first child fiber for renderer versions that don't populate
          // it on the root.
          const rootFiber = root?.current;
          if (!rootFiber) return;
          const duration =
            typeof rootFiber.actualDuration === "number"
              ? rootFiber.actualDuration
              : rootFiber.child?.actualDuration;
          if (typeof duration !== "number") return;
          window.__REACT_PROFILER_COMMITS__.push({
            durationMs: duration,
            timestampMs: performance.now(),
          });
        },
      };
    });

    await page.goto(serverUrl, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT_MS });
    // Allow React to flush deferred useEffect / Suspense work.
    await new Promise((r) => setTimeout(r, 1500));

    const commits = await page.evaluate(() => window.__REACT_PROFILER_COMMITS__ ?? []);

    if (commits.length === 0) {
      console.warn(
        `[${iterLabel}] React Profiler: no commits recorded (production build or non-React page)`,
      );
      await writeResults(iterDir, null);
      return null;
    }

    const mountMs = round(commits[0].durationMs);
    const updates = commits.slice(1).filter((c) => c.durationMs > 0);
    const avgUpdateMs = updates.length
      ? round(updates.reduce((s, c) => s + c.durationMs, 0) / updates.length)
      : 0;
    const maxUpdateMs = updates.length ? round(Math.max(...updates.map((c) => c.durationMs))) : 0;

    const profile = {
      mountMs,
      commitCount: commits.length,
      avgUpdateMs,
      maxUpdateMs,
      commits: commits.map((c) => ({
        durationMs: round(c.durationMs),
        timestampMs: round(c.timestampMs),
      })),
    };

    await writeResults(iterDir, profile);

    console.log(`[${iterLabel}] React mount=${profile.mountMs}ms commits=${profile.commitCount}`);

    return profile;
  } catch (err) {
    console.warn(`[${iterLabel}] React Profiler failed: ${err.message}`);
    await writeResults(iterDir, null);
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

async function writeResults(iterDir, profile) {
  await writeFile(
    resolve(iterDir, "_react_profile.json"),
    JSON.stringify(profile, null, 2),
    "utf-8",
  );
}
