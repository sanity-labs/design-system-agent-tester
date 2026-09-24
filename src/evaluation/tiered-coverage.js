/**
 * Split the elements an app renders into three tiers: design-system
 * composites, design-system primitives, and everything else.
 *
 * A single "percent design system" ratio is misleading, because primitives
 * are design system components too. A Dialog rebuilt out of Box, Stack, Text
 * and Button scores close to 100% on that ratio while being exactly the
 * failure the design system exists to prevent. Splitting the tiers apart
 * makes the rebuild visible: a rising primitive share is the warning sign.
 *
 * Source-based, so it still produces a number for iterations that never
 * built.
 */

import { isJsxFile } from "./parse-files.js";

/**
 * Raw HTML that is correct to use directly. These are dropped from the
 * denominator rather than counted against the app.
 *
 * Without this, the metric rewards wrapping everything in a Box, which is
 * worse than the plain element it replaced.
 */
export const DEFAULT_RAW_ALLOWLIST = [
  // Document structure with no component equivalent
  "html",
  "head",
  "body",
  "main",
  "form",
  "fieldset",
  "legend",
  "label",
  "option",
  "optgroup",
  // List and table internals. These are forced by the choice of container:
  // picking a raw <table> is what counts, not the rows it then requires. The
  // containers themselves (table, ul, ol, dl) are deliberately absent.
  "li",
  "dt",
  "dd",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "caption",
  "colgroup",
  "col",
  // Inline semantics
  "strong",
  "em",
  "small",
  "abbr",
  "time",
  "code",
  "kbd",
  "br",
  "hr",
  // Media and vector content
  "svg",
  "path",
  "g",
  "rect",
  "circle",
  "line",
  "polyline",
  "polygon",
  "img",
  "picture",
  "source",
  "video",
  "audio",
  "track",
];

// Matches a JSX opening tag and captures the name.
//
// Two guards keep TypeScript generics out of the count:
//  - the `<` must not follow an identifier character, which rules out
//    `useState<Filter>` and `Promise<Response>`
//  - the name must be followed by whitespace, `/` or `>`, which rules out
//    parameter lists like `<T,>(x) => ...`
const TAG_RE = /(?<![A-Za-z0-9_$])<([A-Za-z][A-Za-z0-9.-]*)(?=[\s/>])/g;

// React's own wrappers render nothing, so they are not part of the output.
const NON_RENDERING = new Set(["React.Fragment", "Fragment", "React.StrictMode", "StrictMode"]);

/**
 * @param {Array<{path:string,content:string}>} files
 * @param {object} options
 * @param {Set<string>|string[]} options.dsComponents
 *        Names imported from the design system, from `extractComponentImports`.
 * @param {string[]} options.primitives
 *        Which of those are layout primitives. Everything else in the design
 *        system counts as a composite. Required: pass `[]` for a design system
 *        that genuinely has none. Leaving it out returns null rather than
 *        quietly counting every component as a composite, which would make any
 *        design system look composite-heavy.
 * @param {string[]} [options.rawAllowlist]
 *        Raw elements to leave out of the denominator. Defaults to
 *        DEFAULT_RAW_ALLOWLIST.
 * @returns {object|null} null when `dsComponents` is empty or `primitives` is
 *        missing, since neither tier can be worked out without them.
 */
export function computeTieredCoverage(files, options = {}) {
  const ds = new Set(options.dsComponents ?? []);
  if (ds.size === 0) return null;
  if (!Array.isArray(options.primitives)) return null;

  const primitives = new Set(options.primitives);
  const allowed = new Set(options.rawAllowlist ?? DEFAULT_RAW_ALLOWLIST);

  const tiers = { composite: 0, primitive: 0, raw: 0 };
  const byComponent = { composite: {}, primitive: {}, raw: {} };
  let allowlistedRaw = 0;
  let localComponents = 0;

  for (const file of files ?? []) {
    if (!isJsxFile(file.path)) continue;
    let m;
    TAG_RE.lastIndex = 0;
    while ((m = TAG_RE.exec(file.content)) !== null) {
      const name = m[1];
      if (NON_RENDERING.has(name)) continue;

      // `Dialog.Footer` belongs to whichever tier `Dialog` is in.
      const root = name.split(".")[0];
      const isComponent = /^[A-Z]/.test(root);

      if (isComponent && ds.has(root)) {
        const tier = primitives.has(root) ? "primitive" : "composite";
        tiers[tier] += 1;
        byComponent[tier][name] = (byComponent[tier][name] ?? 0) + 1;
        continue;
      }

      if (isComponent) {
        // A component defined in the app itself.
        localComponents += 1;
        tiers.raw += 1;
        byComponent.raw[name] = (byComponent.raw[name] ?? 0) + 1;
        continue;
      }

      if (allowed.has(name)) {
        allowlistedRaw += 1;
        continue;
      }

      tiers.raw += 1;
      byComponent.raw[name] = (byComponent.raw[name] ?? 0) + 1;
    }
  }

  const total = tiers.composite + tiers.primitive + tiers.raw;
  const share = (n) => (total ? n / total : 0);

  return {
    total,
    tiers,
    shares: {
      composite: share(tiers.composite),
      primitive: share(tiers.primitive),
      raw: share(tiers.raw),
    },
    byComponent,
    allowlistedRaw,
    localComponents,
  };
}

/**
 * Average the tier shares across iterations.
 *
 * Shares are averaged per iteration rather than pooled across all elements,
 * so one unusually large app cannot dominate the result.
 */
export function analyzeTieredCoverage(iterations) {
  const withData = (iterations ?? []).filter((r) => r?.tieredCoverage?.total > 0);
  if (withData.length === 0) {
    return { iterationsWithData: 0, shares: null, perIteration: [] };
  }

  const mean = (pick) =>
    withData.reduce((acc, r) => acc + pick(r.tieredCoverage), 0) / withData.length;

  return {
    iterationsWithData: withData.length,
    shares: {
      composite: mean((c) => c.shares.composite),
      primitive: mean((c) => c.shares.primitive),
      raw: mean((c) => c.shares.raw),
    },
    averageElements: mean((c) => c.total),
    perIteration: withData.map((r) => ({
      iteration: r.iteration,
      total: r.tieredCoverage.total,
      shares: r.tieredCoverage.shares,
    })),
  };
}
