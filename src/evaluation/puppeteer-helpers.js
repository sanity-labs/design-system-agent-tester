/**
 * Shared Puppeteer helpers used by the dynamic evaluations
 * (dom-count, semantic-html, screenshot, validate).
 *
 * These are NOT data points. They're just plumbing that every
 * browser-based evaluation needs: launching Chrome, navigating to the
 * page, and waiting for the app to render.
 */
import config from "../config/load.js";

/** Navigation / page-default timeout for browser ops (ms). */
export const NAV_TIMEOUT_MS = 30_000;

/**
 * Ceiling on a single low-level CDP command (ms) — e.g. `Page.captureScreenshot`.
 * Puppeteer's own default is 180_000 (3 minutes), which isn't caught by
 * `setDefaultTimeout`/`setDefaultNavigationTimeout` (those only cover
 * navigation/waiting APIs, not raw protocol commands). A single wedged
 * screenshot call — observed against a genuinely broken generated page —
 * then silently eats 3 minutes even though every caller already tolerates
 * and logs individual-shot failures. Cap it well under that so a hung
 * command fails fast instead of stalling the whole fix loop.
 */
export const PROTOCOL_TIMEOUT_MS = 45_000;

/**
 * Overall ceiling on a single measurement callback (ms). We run untrusted,
 * agent-generated code in the page — an infinite loop or a pathological DOM
 * can make `page.evaluate` hang forever (it has no built-in timeout). Racing
 * against this lets the caller's `finally` close the browser, which tears
 * down the wedged page.
 */
export const MEASURE_TIMEOUT_MS = 60_000;

/**
 * Race a promise against a timeout. Does NOT cancel the underlying work
 * (you can't cancel a `page.evaluate`), but unblocks the caller so it can
 * close the browser. The timer is `unref`'d so it never keeps Node alive.
 *
 * @template T
 * @param {Promise<T>} promise
 * @param {number} ms
 * @param {string} [label]
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, label = "operation") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    timer.unref?.();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Launch a fresh headless Chrome instance. Single source of truth for the
 * launch flags — lighthouse and react-profile also call this so the sandbox
 * args never drift between evaluators.
 *
 * @returns {Promise<import("puppeteer").Browser>}
 */
export async function launchBrowser() {
  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    protocolTimeout: PROTOCOL_TIMEOUT_MS,
  });
}

/**
 * Poll the page until something has actually rendered, or give up after
 * a timeout. Uses the `appRootSelectors` from the config to detect a
 * mounted React/app root; falls back to counting visible elements.
 *
 * @param {import("puppeteer").Page} page
 * @param {object} [opts]
 * @param {string} [opts.iterLabel]    — used for log output
 * @param {number} [opts.maxWaitMs]    — total timeout (default 15s)
 * @param {number} [opts.pollIntervalMs] — poll interval (default 500ms)
 * @returns {Promise<boolean>} — true if content was detected
 */
export async function waitForRenderedContent(page, opts = {}) {
  const { iterLabel, maxWaitMs = 15_000, pollIntervalMs = 500 } = opts;

  const start = Date.now();
  const rootSelector = config.appRootSelectors.join(", ");

  while (Date.now() - start < maxWaitMs) {
    // `page.evaluate` has no built-in timeout (see MEASURE_TIMEOUT_MS above) —
    // agent-generated code can hang the page's JS thread (infinite loop, runaway
    // effect), which would otherwise block this poll (and the outer maxWaitMs
    // check that depends on it) forever. Race each poll independently so one
    // wedged evaluation just counts as "not yet rendered" instead of hanging
    // the whole harness process.
    const hasContent = await withTimeout(
      page.evaluate((selector) => {
        const roots = document.querySelectorAll(selector);
        for (const root of roots) {
          if (root.children.length > 0 && root.offsetHeight > 0) {
            return true;
          }
        }

        // Fallback: count visible elements
        const allElements = document.body.querySelectorAll("*");
        let visibleCount = 0;
        for (const el of allElements) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            visibleCount++;
          }
          if (visibleCount >= 5) {
            return true;
          }
        }

        return false;
      }, rootSelector),
      Math.max(pollIntervalMs * 4, 5_000),
      "render-content poll",
    ).catch(() => false);

    if (hasContent) {
      const elapsed = Date.now() - start;
      if (iterLabel) {
        console.log(`[${iterLabel}] Content detected after ${elapsed}ms`);
      }
      return true;
    }

    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  if (iterLabel) {
    console.warn(
      `[${iterLabel}] Page may not have rendered meaningful content within ${maxWaitMs}ms`,
    );
  }
  return false;
}

/**
 * Open a page at `serverUrl` in a fresh browser, wait for it to render,
 * call `fn(page)` to take the measurement, then close the browser.
 *
 * This is the standard pattern for browser-based evaluations that just
 * need one measurement at a single viewport.
 *
 * @param {string} serverUrl
 * @param {(page: import("puppeteer").Page) => Promise<T>} fn
 * @param {object} [opts]
 * @param {string} [opts.iterLabel]
 * @param {{width:number,height:number}} [opts.viewport]
 * @template T
 * @returns {Promise<T>}
 */
export async function withPage(serverUrl, fn, opts = {}) {
  const {
    iterLabel,
    viewport = { width: 1440, height: 900 },
    timeoutMs = MEASURE_TIMEOUT_MS,
  } = opts;

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(NAV_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
    await page.setViewport(viewport);
    await page.goto(serverUrl, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT_MS });
    await waitForRenderedContent(page, { iterLabel });
    return await withTimeout(fn(page), timeoutMs, `measurement (${iterLabel ?? serverUrl})`);
  } finally {
    await browser.close();
  }
}
