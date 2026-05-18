/**
 * Shared Puppeteer helpers used by the dynamic evaluations
 * (dom-count, semantic-html, screenshot, validate).
 *
 * These are NOT data points. They're just plumbing that every
 * browser-based evaluation needs: launching Chrome, navigating to the
 * page, and waiting for the app to render.
 */
import config from "../config/load.js";

/**
 * Launch a fresh headless Chrome instance.
 *
 * @returns {Promise<import("puppeteer").Browser>}
 */
export async function launchBrowser() {
  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
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
  const {
    iterLabel,
    maxWaitMs = 15_000,
    pollIntervalMs = 500,
  } = opts;

  const start = Date.now();
  const rootSelector = config.appRootSelectors.join(", ");

  while (Date.now() - start < maxWaitMs) {
    const hasContent = await page.evaluate((selector) => {
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
    }, rootSelector);

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
  const { iterLabel, viewport = { width: 1440, height: 900 } } = opts;

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    await page.goto(serverUrl, { waitUntil: "networkidle2", timeout: 30_000 });
    await waitForRenderedContent(page, { iterLabel });
    return await fn(page);
  } finally {
    await browser.close();
  }
}
