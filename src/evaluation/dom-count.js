/**
 * DOM element count + serialized size.
 *
 * Data points: the total number of DOM elements rendered, plus the byte
 * size of the serialized HTML tree (`document.documentElement.outerHTML`
 * as UTF-8). Together they show how much markup the agent produced and
 * how verbose each element is.
 *
 * This module is self-contained: it opens its own browser, navigates to
 * the page, runs the measurement, and closes the browser.
 */

import { withPage } from "./puppeteer-helpers.js";

/**
 * Count every DOM element on the rendered page and measure the byte
 * size of the serialized HTML tree.
 *
 * @param {string} serverUrl  — URL of the running dev server
 * @param {string} [iterLabel] — optional label for log output
 * @returns {Promise<{count:number,htmlBytes:number}|null>} — null on failure
 */
export async function measureDom(serverUrl, iterLabel) {
  try {
    return await withPage(
      serverUrl,
      (page) =>
        page.evaluate(() => {
          const count = document.querySelectorAll("*").length;
          // outerHTML on documentElement excludes the doctype declaration,
          // which Vite/React don't render at runtime anyway — measuring the
          // serialized tree the browser actually built is the goal.
          const html = document.documentElement.outerHTML;
          const htmlBytes = new TextEncoder().encode(html).length;
          return { count, htmlBytes };
        }),
      { iterLabel },
    );
  } catch (err) {
    if (iterLabel) {
      console.warn(`[${iterLabel}] DOM measurement failed: ${err.message}`);
    }
    return null;
  }
}
