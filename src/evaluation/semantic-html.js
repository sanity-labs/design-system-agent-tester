/**
 * Semantic HTML analysis.
 *
 * Data point: how much of the rendered DOM uses semantic HTML elements
 * (e.g. `<nav>`, `<main>`, `<button>`, `<h1>`) vs. generic containers
 * (`<div>`, `<span>`), plus how many ARIA `role` attributes are present.
 *
 * The "semantic ratio" is `semanticCount / (semanticCount + genericCount)`
 * — a single headline number you can compare across tests.
 *
 * Self-contained: opens its own browser instance.
 */

import { withPage } from "./puppeteer-helpers.js";

/**
 * MDN's list of HTML elements with built-in semantics.
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element
 *
 * Exported so it can be referenced from tests if needed; the actual
 * counting runs inside `page.evaluate` and uses a copy of this set
 * (functions / Sets can't cross the browser boundary directly).
 */
export const SEMANTIC_TAGS = [
  // Content sectioning
  "article", "aside", "footer", "header", "h1", "h2", "h3", "h4", "h5", "h6",
  "hgroup", "main", "nav", "section", "search", "address",
  // Text content
  "blockquote", "dd", "dl", "dt", "figcaption", "figure", "hr",
  "li", "menu", "ol", "p", "pre", "ul",
  // Inline text semantics
  "a", "abbr", "b", "bdi", "bdo", "cite", "code", "data", "dfn",
  "em", "i", "kbd", "mark", "q", "rp", "rt", "ruby", "s",
  "samp", "small", "strong", "sub", "sup", "time", "u", "var",
  // Forms
  "button", "datalist", "fieldset", "form", "input", "label",
  "legend", "meter", "optgroup", "option", "output", "progress",
  "select", "textarea",
  // Interactive elements
  "details", "dialog", "summary",
  // Table content
  "caption", "col", "colgroup", "table", "tbody", "td", "tfoot",
  "th", "thead", "tr",
  // Media & embedded content
  "audio", "canvas", "embed", "iframe", "img", "object",
  "picture", "source", "svg", "video",
];

export const GENERIC_TAGS = ["div", "span"];

/**
 * @typedef {object} SemanticHtmlResult
 * @property {number} total                — semanticCount + genericCount
 * @property {number} semanticCount        — count of semantic-tag elements
 * @property {number} genericCount         — count of div/span elements
 * @property {number} roleCount            — count of elements with a `role` attribute
 * @property {number} semanticRatio        — semantic / total, as a percentage (0–100), 1-decimal
 * @property {Record<string, number>} semanticByTag
 * @property {Record<string, number>} genericByTag
 * @property {Record<string, number>} rolesByValue
 */

/**
 * Analyze semantic HTML usage in the rendered DOM.
 *
 * @param {string} serverUrl
 * @param {string} [iterLabel]
 * @returns {Promise<SemanticHtmlResult|null>}
 */
export async function analyzeSemanticHtml(serverUrl, iterLabel) {
  try {
    return await withPage(
      serverUrl,
      (page) =>
        page.evaluate(
          (semanticTagList, genericTagList) => {
            const SEMANTIC = new Set(semanticTagList);
            const GENERIC = new Set(genericTagList);

            const semanticByTag = {};
            const genericByTag = {};
            const rolesByValue = {};
            let semanticCount = 0;
            let genericCount = 0;
            let roleCount = 0;

            for (const el of document.querySelectorAll("*")) {
              const tag = el.tagName.toLowerCase();
              if (SEMANTIC.has(tag)) {
                semanticCount++;
                semanticByTag[tag] = (semanticByTag[tag] || 0) + 1;
              } else if (GENERIC.has(tag)) {
                genericCount++;
                genericByTag[tag] = (genericByTag[tag] || 0) + 1;
              }

              const role = el.getAttribute("role");
              if (role) {
                roleCount++;
                rolesByValue[role] = (rolesByValue[role] || 0) + 1;
              }
            }

            const total = semanticCount + genericCount;
            return {
              total,
              semanticCount,
              genericCount,
              roleCount,
              semanticRatio:
                total > 0
                  ? Math.round((semanticCount / total) * 1000) / 10
                  : 0,
              semanticByTag,
              genericByTag,
              rolesByValue,
            };
          },
          SEMANTIC_TAGS,
          GENERIC_TAGS,
        ),
      { iterLabel },
    );
  } catch (err) {
    if (iterLabel) {
      console.warn(`[${iterLabel}] Semantic HTML analysis failed: ${err.message}`);
    }
    return null;
  }
}
