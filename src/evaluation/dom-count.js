/**
 * Count DOM elements and measure the page's HTML size.
 *
 * Together these show how much markup the agent produced and how heavy each
 * element is. Opens its own browser and closes it again.
 */

import { withPage } from "./puppeteer-helpers.js";

/**
 * @param {string} serverUrl - URL of the running dev server
 * @param {string} [iterLabel] - label for log output
 * @returns {Promise<{count:number,htmlBytes:number}|null>} null on failure
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
