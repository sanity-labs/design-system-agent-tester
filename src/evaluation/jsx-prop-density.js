/**
 * Average number of props per JSX tag.
 *
 * `tieredCoverage` says WHICH components an agent reached for. This says how
 * hard it leaned on each one. The two answer different questions and can move
 * in opposite directions:
 *
 *   - A `Card` with eight props is an agent pushing a component to do
 *     something it was not shaped for. In a token-driven system that is
 *     usually the shape of an escape hatch being improvised out of legitimate
 *     props, and it does not show up in a coverage share at all — the
 *     component was used, so coverage counts it as a win.
 *   - A `Box` with one prop is the opposite: a primitive standing in for a
 *     plain element.
 *
 * Read alongside the coverage tiers, prop density is what separates "used the
 * design system" from "used the design system as intended". A design system
 * whose defaults fit the job should need few props per tag.
 *
 * Source-based, like `tieredCoverage`, so iterations that never built still
 * produce a number.
 *
 * KNOWN LIMITATION, shared deliberately with `extractComponentUsageCounts`
 * and `computeTieredCoverage`: the tag scan is textual, so a JSX tag written
 * inside a comment or a string literal is counted. Fixing it here alone would
 * make this metric's denominator disagree with `Avg components/iteration` in
 * the same report, which is worse than the noise — generated app code has
 * very little commented-out JSX.
 */

import { isJsxFile } from "./parse-files.js";
import { DEFAULT_RAW_ALLOWLIST } from "./tiered-coverage.js";

// Same pattern, and the same two generic guards, as `tiered-coverage.js`:
//  - the `<` must not follow an identifier character, which rules out
//    `useState<Filter>` and `Promise<Response>`
//  - the name must be followed by whitespace, `/` or `>`, which rules out
//    parameter lists like `<T,>(x) => ...`
const TAG_RE = /(?<![A-Za-z0-9_$])<([A-Za-z][A-Za-z0-9.-]*)(?=[\s/>])/g;

// React's own wrappers render nothing, so they are not part of the output.
const NON_RENDERING = new Set(["React.Fragment", "Fragment", "React.StrictMode", "StrictMode"]);

const IDENT_START = /[A-Za-z_$]/;
const IDENT_BODY = /[A-Za-z0-9_$:-]/;

/**
 * Walk a balanced `{ … }` expression starting at `i` (which must be the `{`).
 *
 * Has to be a real scanner rather than a regex because attribute values
 * routinely nest the delimiters that would terminate a naive match:
 * `style={{ gap: 4 }}`, `menu={<Menu><MenuItem text="a" /></Menu>}`,
 * `onClick={() => setOpen(v => !v)}`, and template literals with `${}`.
 * Counting `menu={<Menu>…}` as the end of the tag would attribute the inner
 * component's props to the outer one.
 *
 * @returns {number} index just past the matching `}`, or `content.length` if
 *          the expression is never closed (truncated or malformed source).
 */
function skipBraced(content, i) {
  let depth = 0;
  // Stack of open string/template contexts, so `"}"` inside a value does not
  // close the expression.
  let quote = null;
  // Template literals can nest `${ … }` which can itself contain a template.
  const templateStack = [];

  for (; i < content.length; i++) {
    const c = content[i];

    if (quote) {
      if (c === "\\") {
        i++;
        continue;
      }
      if (c === quote) {
        quote = null;
        continue;
      }
      // `${` inside a template literal re-enters expression context.
      if (quote === "`" && c === "$" && content[i + 1] === "{") {
        templateStack.push(quote);
        quote = null;
        depth++;
        i++;
      }
      continue;
    }

    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      continue;
    }
    if (c === "{") {
      depth++;
      continue;
    }
    if (c === "}") {
      depth--;
      if (depth === 0) return i + 1;
      // Closing a `${ … }` hands control back to the template literal.
      if (templateStack.length > 0 && depth === templateStack.length) {
        quote = templateStack.pop();
      }
    }
  }
  return content.length;
}

/** Walk a quoted string starting at `i` (which must be the quote). */
function skipQuoted(content, i) {
  const quote = content[i];
  for (i++; i < content.length; i++) {
    if (content[i] === "\\") {
      i++;
      continue;
    }
    if (content[i] === quote) return i + 1;
  }
  return content.length;
}

/**
 * Read one JSX opening tag's attribute list, starting just past the tag name.
 *
 * @returns {{count: number, spreads: number, names: string[], end: number}}
 *          `end` is the index just past the tag's `>`, so the caller can
 *          resume scanning without re-reading the attributes.
 */
export function readTagAttributes(content, i) {
  let count = 0;
  let spreads = 0;
  const names = [];

  while (i < content.length) {
    const c = content[i];

    // End of the opening tag. `/` here is the self-closing slash.
    if (c === ">") return { count, spreads, names, end: i + 1 };
    if (c === "/" && content[i + 1] === ">") return { count, spreads, names, end: i + 2 };

    if (/\s/.test(c)) {
      i++;
      continue;
    }

    // `{...props}` — one attribute syntactically, an unknown number of props
    // in practice. Counted as one and tracked separately so a spread-heavy
    // app can't quietly deflate the average without being visible.
    if (c === "{") {
      const next = skipBraced(content, i);
      const inner = content.slice(i + 1, next - 1).trimStart();
      if (inner.startsWith("...")) {
        count++;
        spreads++;
        names.push("...");
      }
      i = next;
      continue;
    }

    if (IDENT_START.test(c)) {
      let j = i + 1;
      while (j < content.length && IDENT_BODY.test(content[j])) j++;
      const name = content.slice(i, j);
      count++;
      names.push(name);
      i = j;

      // Skip the value, if there is one. A bare name is a boolean shorthand
      // (`selected`, `border`) and still counts as one prop.
      while (i < content.length && /\s/.test(content[i])) i++;
      if (content[i] !== "=") continue;
      i++;
      while (i < content.length && /\s/.test(content[i])) i++;
      if (content[i] === "{") i = skipBraced(content, i);
      else if (content[i] === '"' || content[i] === "'") i = skipQuoted(content, i);
      continue;
    }

    // Anything else inside a tag is malformed. Step over it rather than
    // looping forever on it.
    i++;
  }

  // Unterminated tag — truncated source. Report what was read.
  return { count, spreads, names, end: content.length };
}

/**
 * Count props per JSX tag across a project's source files.
 *
 * The tier buckets mirror `computeTieredCoverage` so the two sections of a
 * report describe the same elements, with one addition: allowlisted raw
 * elements (`li`, `svg`, `option`, …) are dropped from the coverage
 * denominator there, but get their own bucket here. Without it the overall
 * average and the tier averages would not reconcile, and an
 * `<svg viewBox … fill … stroke …>` carries real props that have to land
 * somewhere.
 *
 * @param {Array<{path:string,content:string}>} files
 * @param {object} [options]
 * @param {Set<string>|string[]} [options.dsComponents] Names imported from the
 *        design system, from `extractComponentImports`. Without it the tier
 *        breakdown is omitted and only the overall average is returned.
 * @param {string[]} [options.primitives] Which of those are layout primitives.
 * @param {string[]} [options.rawAllowlist] Defaults to DEFAULT_RAW_ALLOWLIST.
 * @returns {object|null} null when the project contains no JSX tags at all.
 */
export function computeJsxPropDensity(files, options = {}) {
  const ds = new Set(options.dsComponents ?? []);
  const primitives = new Set(options.primitives ?? []);
  const allowed = new Set(options.rawAllowlist ?? DEFAULT_RAW_ALLOWLIST);
  // Only split by tier when the test said which components are primitives —
  // same contract as `computeTieredCoverage`, so a design system without that
  // declaration gets no tier numbers rather than misleading ones.
  const canTier = ds.size > 0 && Array.isArray(options.primitives);

  const bucket = () => ({ tags: 0, props: 0, spreads: 0 });
  const tiers = {
    composite: bucket(),
    primitive: bucket(),
    raw: bucket(),
    allowlistedRaw: bucket(),
  };
  const byComponent = {};
  const overall = bucket();

  for (const file of files ?? []) {
    if (!isJsxFile(file.path)) continue;
    TAG_RE.lastIndex = 0;
    let m;
    while ((m = TAG_RE.exec(file.content)) !== null) {
      const name = m[1];
      const attrsStart = m.index + m[0].length;
      const { count, spreads } = readTagAttributes(file.content, attrsStart);
      // The regex deliberately resumes right after the tag NAME, not after
      // the tag's `>`. A tag embedded in an attribute value
      // (`menu={<Menu><MenuItem /></Menu>}`) is really rendered by the app,
      // and both `extractComponentUsageCounts` and `computeTieredCoverage`
      // count it — so it gets its own entry here too. There is no
      // double-counting: `readTagAttributes` already consumed that value for
      // the OUTER tag's prop count, and the inner tags are then read once
      // each as themselves.

      if (NON_RENDERING.has(name)) continue;

      overall.tags += 1;
      overall.props += count;
      overall.spreads += spreads;

      const entry = (byComponent[name] ??= bucket());
      entry.tags += 1;
      entry.props += count;
      entry.spreads += spreads;

      if (!canTier) continue;

      // `Dialog.Footer` belongs to whichever tier `Dialog` is in.
      const root = name.split(".")[0];
      const isComponent = /^[A-Z]/.test(root);
      let tier;
      if (isComponent && ds.has(root)) tier = primitives.has(root) ? "primitive" : "composite";
      else if (isComponent)
        tier = "raw"; // a component defined in the app itself
      else if (allowed.has(name)) tier = "allowlistedRaw";
      else tier = "raw";

      tiers[tier].tags += 1;
      tiers[tier].props += count;
      tiers[tier].spreads += spreads;
    }
  }

  if (overall.tags === 0) return null;

  const withAverage = (b) => ({ ...b, average: b.tags ? b.props / b.tags : null });

  return {
    ...withAverage(overall),
    byTier: canTier
      ? {
          composite: withAverage(tiers.composite),
          primitive: withAverage(tiers.primitive),
          raw: withAverage(tiers.raw),
          allowlistedRaw: withAverage(tiers.allowlistedRaw),
        }
      : null,
    byComponent: Object.fromEntries(
      Object.entries(byComponent).map(([k, v]) => [k, withAverage(v)]),
    ),
  };
}

/**
 * Average prop density across iterations.
 *
 * Averaged per iteration rather than pooled across every tag, matching
 * `analyzeTieredCoverage`, so one unusually large app cannot dominate the
 * result. `byComponent` is pooled instead — a per-component average needs
 * every instance it can get to mean anything, and the components that matter
 * most here are the ones used a handful of times per app.
 */
export function analyzeJsxPropDensity(iterations) {
  const withData = (iterations ?? []).filter((r) => r?.jsxPropDensity?.tags > 0);
  if (withData.length === 0) {
    return {
      iterationsWithData: 0,
      average: null,
      byTier: null,
      byComponent: {},
      perIteration: [],
    };
  }

  const mean = (pick) => {
    const vals = withData.map(pick).filter((v) => typeof v === "number" && Number.isFinite(v));
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  const tierKeys = ["composite", "primitive", "raw", "allowlistedRaw"];
  const anyTiers = withData.some((r) => r.jsxPropDensity.byTier);

  const pooled = {};
  for (const r of withData) {
    for (const [name, v] of Object.entries(r.jsxPropDensity.byComponent ?? {})) {
      const e = (pooled[name] ??= { tags: 0, props: 0, spreads: 0 });
      e.tags += v.tags;
      e.props += v.props;
      e.spreads += v.spreads ?? 0;
    }
  }

  return {
    iterationsWithData: withData.length,
    average: mean((r) => r.jsxPropDensity.average),
    averageTags: mean((r) => r.jsxPropDensity.tags),
    averageProps: mean((r) => r.jsxPropDensity.props),
    spreadTotal: withData.reduce((acc, r) => acc + (r.jsxPropDensity.spreads ?? 0), 0),
    byTier: anyTiers
      ? Object.fromEntries(
          tierKeys.map((k) => [
            k,
            {
              average: mean((r) => r.jsxPropDensity.byTier?.[k]?.average),
              averageTags: mean((r) => r.jsxPropDensity.byTier?.[k]?.tags),
            },
          ]),
        )
      : null,
    byComponent: Object.fromEntries(
      Object.entries(pooled).map(([k, v]) => [k, { ...v, average: v.props / v.tags }]),
    ),
    perIteration: withData.map((r) => ({
      iteration: r.iteration,
      tags: r.jsxPropDensity.tags,
      props: r.jsxPropDensity.props,
      average: r.jsxPropDensity.average,
    })),
  };
}
