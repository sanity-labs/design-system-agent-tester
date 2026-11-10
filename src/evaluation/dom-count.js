/**
 * Count DOM elements, measure the page's HTML size, and measure how deeply
 * the elements nest.
 *
 * Together these show how much markup the agent produced, how heavy each
 * element is, and how far down the tree it goes. Opens its own browser and
 * closes it again.
 */

import { withPage } from "./puppeteer-helpers.js";

/**
 * @param {string} serverUrl - URL of the running dev server
 * @param {string} [iterLabel] - label for log output
 * @returns {Promise<{count:number,htmlBytes:number,maxDepth:number,avgDepth:number}|null>}
 *   `maxDepth` is the deepest element's depth and `avgDepth` the mean depth
 *   across all elements. `<html>` is depth 1. Null on failure.
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
          // Nesting: walk the element tree once, carrying each element's
          // depth. An explicit stack, not recursion, so a deeply nested
          // page cannot overflow the call stack.
          let maxDepth = 0;
          let depthSum = 0;
          let elements = 0;
          const stack = [[document.documentElement, 1]];
          while (stack.length > 0) {
            const [el, depth] = stack.pop();
            elements++;
            depthSum += depth;
            if (depth > maxDepth) maxDepth = depth;
            for (const child of el.children) stack.push([child, depth + 1]);
          }
          const avgDepth = depthSum / elements;
          return { count, htmlBytes, maxDepth, avgDepth };
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
