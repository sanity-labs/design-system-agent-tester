import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";

/**
 * Performance measurement module.
 *
 * Collects:
 * - FCP (First Contentful Paint) via PerformanceObserver
 * - LCP (Largest Contentful Paint) via PerformanceObserver
 * - Average render time over N full page loads
 *
 * Requires a running dev server URL and uses Puppeteer for measurement.
 */

const NUM_RENDER_SAMPLES = 10;
const NAVIGATION_TIMEOUT = 30_000;
const RENDER_SETTLE_MS = 1500;

/**
 * Measure performance metrics for a generated project.
 *
 * @param {object} opts
 * @param {string} opts.serverUrl - URL of the running dev server
 * @param {string} opts.iterDir - Directory for this iteration's output
 * @param {string} opts.iterLabel - Label for logging
 * @returns {Promise<object>} Performance results
 */
export async function measurePerformance({ serverUrl, iterDir, iterLabel }) {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    console.log(
      `[${iterLabel}] Measuring performance (${NUM_RENDER_SAMPLES} samples)...`,
    );

    // --- Collect FCP and LCP on the first load ---
    const webVitals = await collectWebVitals(browser, serverUrl, iterLabel);

    // --- Collect render times over multiple page loads ---
    const renderTimes = await collectRenderTimes(
      browser,
      serverUrl,
      NUM_RENDER_SAMPLES,
      iterLabel,
    );

    const avgRenderMs =
      renderTimes.length > 0
        ? round(renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length)
        : null;

    const minRenderMs =
      renderTimes.length > 0 ? round(Math.min(...renderTimes)) : null;
    const maxRenderMs =
      renderTimes.length > 0 ? round(Math.max(...renderTimes)) : null;

    const results = {
      label: iterLabel,
      timestamp: new Date().toISOString(),
      samples: NUM_RENDER_SAMPLES,
      fcpMs: webVitals.fcp,
      lcpMs: webVitals.lcp,
      lcpSize: webVitals.lcpSize ?? null,
      lcpElement: webVitals.lcpElement ?? null,
      lcpCandidateCount: webVitals.lcpCandidateCount ?? 0,
      renderTimes: {
        samples: renderTimes.map((t) => round(t)),
        averageMs: avgRenderMs,
        minMs: minRenderMs,
        maxMs: maxRenderMs,
        count: renderTimes.length,
      },
    };

    // Save results to disk
    const perfPath = resolve(iterDir, "_perf_results.json");
    await writeFile(perfPath, JSON.stringify(results, null, 2), "utf-8");
    console.log(
      `[${iterLabel}] Performance: FCP=${fmt(results.fcpMs)} LCP=${fmt(results.lcpMs)} avgRender=${fmt(avgRenderMs)} (${renderTimes.length} samples)`,
    );

    return results;
  } catch (err) {
    console.warn(
      `[${iterLabel}] Performance measurement failed: ${err.message}`,
    );
    return {
      label: iterLabel,
      timestamp: new Date().toISOString(),
      samples: NUM_RENDER_SAMPLES,
      fcpMs: null,
      lcpMs: null,
      renderTimes: {
        samples: [],
        averageMs: null,
        minMs: null,
        maxMs: null,
        count: 0,
      },
      error: err.message,
    };
  } finally {
    await browser.close();
  }
}

/**
 * Collect FCP and LCP from a single page load.
 *
 * Uses two complementary approaches:
 * - FCP: PerformanceObserver on "paint" entries (reliable, fires once)
 * - LCP: PerformanceObserver on "largest-contentful-paint" entries.
 *   LCP entries arrive progressively as larger elements render. The final
 *   LCP value is the LAST entry before user interaction or page fully loaded.
 *   We track every entry with its size and renderTime, wait for the page to
 *   fully settle, then take the last (largest) entry.
 */
async function collectWebVitals(browser, serverUrl, iterLabel) {
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1440, height: 900 });

    // Set up performance observers BEFORE navigation via evaluateOnNewDocument
    await page.evaluateOnNewDocument(() => {
      window.__PERF_FCP__ = null;
      // Store ALL LCP candidates — the last one at read-time is the true LCP
      window.__PERF_LCP_ENTRIES__ = [];

      // FCP observer
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === "first-contentful-paint") {
              window.__PERF_FCP__ = entry.startTime;
            }
          }
        }).observe({ type: "paint", buffered: true });
      } catch (e) {
        // paint observer not supported
      }

      // LCP observer — accumulate ALL candidates
      try {
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            window.__PERF_LCP_ENTRIES__.push({
              startTime: entry.startTime,
              renderTime: entry.renderTime || 0,
              loadTime: entry.loadTime || 0,
              size: entry.size || 0,
              element: entry.element ? entry.element.tagName : null,
            });
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });
      } catch (e) {
        // LCP observer not supported
      }
    });

    // Navigate and wait for full load (not just networkidle — we want late paints)
    await page.goto(serverUrl, {
      waitUntil: "networkidle0",
      timeout: NAVIGATION_TIMEOUT,
    });

    // Wait longer for LCP to settle — images, fonts, lazy content can trigger
    // late LCP entries. 3 seconds is the standard recommendation.
    await new Promise((r) => setTimeout(r, 3000));

    // Finalize LCP by dispatching a keydown event — LCP observation stops
    // on first user input per the spec. This ensures no more entries arrive.
    await page.keyboard.press("Tab");
    await new Promise((r) => setTimeout(r, 200));

    // Collect the metrics
    const metrics = await page.evaluate(() => {
      const entries = window.__PERF_LCP_ENTRIES__ || [];
      // True LCP is the last entry (largest element rendered last)
      const lastLcp = entries.length > 0 ? entries[entries.length - 1] : null;

      // LCP time is renderTime if available (more accurate), else startTime
      let lcpMs = null;
      if (lastLcp) {
        lcpMs = lastLcp.renderTime > 0 ? lastLcp.renderTime : lastLcp.startTime;
      }

      return {
        fcp: window.__PERF_FCP__,
        lcp: lcpMs,
        lcpSize: lastLcp ? lastLcp.size : null,
        lcpElement: lastLcp ? lastLcp.element : null,
        lcpCandidateCount: entries.length,
      };
    });

    // Fallback for FCP via the Performance API directly
    if (metrics.fcp === null) {
      metrics.fcp = await page.evaluate(() => {
        const entries = performance.getEntriesByType("paint");
        const fcp = entries.find((e) => e.name === "first-contentful-paint");
        return fcp ? fcp.startTime : null;
      });
    }

    return {
      fcp: metrics.fcp !== null ? round(metrics.fcp) : null,
      lcp: metrics.lcp !== null ? round(metrics.lcp) : null,
      lcpSize: metrics.lcpSize,
      lcpElement: metrics.lcpElement,
      lcpCandidateCount: metrics.lcpCandidateCount,
    };
  } finally {
    await page.close();
  }
}

/**
 * Measure page load/render time over multiple navigations.
 *
 * Each sample does a fresh navigation to the server URL and measures
 * the time from navigation start to when meaningful content is rendered.
 * This captures the full render pipeline: HTML parse, JS execution,
 * React hydration/render, and DOM paint.
 */
async function collectRenderTimes(browser, serverUrl, count, iterLabel) {
  const page = await browser.newPage();
  const times = [];

  try {
    await page.setViewport({ width: 1440, height: 900 });

    for (let i = 0; i < count; i++) {
      try {
        // Navigate with cache disabled to get a fresh render each time
        await page.setCacheEnabled(false);

        const start = Date.now();

        await page.goto(serverUrl, {
          waitUntil: "networkidle2",
          timeout: NAVIGATION_TIMEOUT,
        });

        // Wait until we detect rendered content (same check as validation)
        const rendered = await waitForRenderedContent(page);

        const elapsed = Date.now() - start;

        if (rendered) {
          times.push(elapsed);
        }

        // Also collect the browser's own performance timing for more precision
        const perfTiming = await page.evaluate(() => {
          const nav = performance.getEntriesByType("navigation")[0];
          if (nav) {
            return {
              domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
              loadComplete: nav.loadEventEnd - nav.startTime,
              domInteractive: nav.domInteractive - nav.startTime,
            };
          }
          return null;
        });

        // If we got browser timing, prefer domContentLoaded as it's more precise
        if (perfTiming && perfTiming.domContentLoaded > 0) {
          // Replace the wall-clock time with the more precise browser timing
          // but only if the page actually rendered
          if (rendered && times.length > 0) {
            times[times.length - 1] = perfTiming.domContentLoaded;
          }
        }
      } catch (err) {
        // Skip failed samples — don't break the loop
        console.warn(
          `[${iterLabel}] Render sample ${i + 1}/${count} failed: ${err.message}`,
        );
      }
    }
  } finally {
    await page.close();
  }

  return times;
}

/**
 * Poll the page until meaningful content is detected.
 * Simplified version of the validation check in screenshot.js.
 */
async function waitForRenderedContent(page) {
  const MAX_WAIT_MS = 10_000;
  const POLL_INTERVAL_MS = 200;
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    const hasContent = await page.evaluate(() => {
      const roots = document.querySelectorAll(
        "#root, #app, [data-sanity], #__next, [data-ui]",
      );
      for (const root of roots) {
        if (root.children.length > 0 && root.offsetHeight > 0) {
          return true;
        }
      }
      const allElements = document.body.querySelectorAll("*");
      let visibleCount = 0;
      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          visibleCount++;
        }
        if (visibleCount >= 5) return true;
      }
      return false;
    });

    if (hasContent) return true;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  return false;
}

function round(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return n;
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

function fmt(ms) {
  if (ms === null || ms === undefined) return "N/A";
  return `${round(ms)}ms`;
}
