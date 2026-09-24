/**
 * Shared browser helpers for the checks that need a real page.
 *
 * These are not measurements. They are the plumbing every browser-based
 * check needs: start Chrome, open the page, wait for it to render.
 */
import config from "../config/load.js";

/** Navigation / page-default timeout for browser ops (ms). */
export const NAV_TIMEOUT_MS = 30_000;

/**
 * Time limit for one low-level browser command, such as taking a
 * screenshot. Puppeteer's own default is three minutes and is not covered
 * by the usual timeout settings, so one stuck call against a broken page
 * would otherwise hold up the run for that long.
 */
export const PROTOCOL_TIMEOUT_MS = 45_000;

/**
 * Time limit for one measurement. The page runs code the agent wrote, and
 * an infinite loop or a huge DOM can make it hang forever. Timing out lets
 * the caller close the browser, which clears the stuck page.
 */
export const MEASURE_TIMEOUT_MS = 60_000;

/**
 * Give up on a promise after `ms`. This does not stop the underlying work,
 * which cannot be cancelled, but it frees the caller to close the browser.
 * The timer will not keep Node alive on its own.
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
 * Start a fresh headless Chrome. The one place the launch flags are set, so
 * they cannot drift between the checks that use them.
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
 * Wait until the page has rendered something, or give up. Looks for the app
 * root from the config, and otherwise counts visible elements.
 *
 * @param {import("puppeteer").Page} page
 * @param {object} [opts]
 * @param {string} [opts.iterLabel] - label for log output
 * @param {number} [opts.maxWaitMs] - how long to wait in total
 */
export async function waitForRenderedContent(page, opts = {}) {
  const { iterLabel, maxWaitMs = 15_000, pollIntervalMs = 500 } = opts;

  const start = Date.now();
  const rootSelector = config.appRootSelectors.join(", ");

  while (Date.now() - start < maxWaitMs) {
    // Code the agent wrote can hang the page, and checking the page has no
    // timeout of its own, so each check gets its own. A stuck one counts as
    // "not rendered yet" rather than blocking forever.
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
 * Open the page in a fresh browser, wait for it to render, take one
 * measurement with `fn`, then close the browser.
 *
 * The usual shape for a check that needs a single measurement at one size.
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
