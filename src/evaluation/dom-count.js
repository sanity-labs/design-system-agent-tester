/**
 * DOM element count.
 *
 * Data point: the total number of DOM elements rendered in the running
 * app. Useful as a rough proxy for how much markup the agent produced.
 *
 * This module is self-contained: it opens its own browser, navigates to
 * the page, runs the count, and closes the browser.
 */

import { withPage } from "./puppeteer-helpers.js";

/**
 * Count every DOM element on the rendered page.
 *
 * @param {string} serverUrl  — URL of the running dev server
 * @param {string} [iterLabel] — optional label for log output
 * @returns {Promise<number|null>} — element count, or null on failure
 */
export async function countDomElements(serverUrl, iterLabel) {
  try {
    return await withPage(
      serverUrl,
      (page) =>
        page.evaluate(() => document.querySelectorAll("*").length),
      { iterLabel },
    );
  } catch (err) {
    if (iterLabel) {
      console.warn(`[${iterLabel}] DOM count failed: ${err.message}`);
    }
    return null;
  }
}
