import { isJsxFile } from "./parse-files.js";

// Project files can be attacker-controlled (agent output, or MCP server
// output where a single file may be bounded only by the 16MB stdout cap —
// not by max_tokens). Cap the scanned length so a
// pathological file (e.g. `style={{}}` repeated to megabytes) can't drive
// superlinear work. The scan below is linear, but the cap is a belt-and-
// suspenders bound on total work regardless of content shape.
const MAX_STYLE_SCAN_BYTES = 2_000_000;
// Bound the look-ahead for a style object's closing `}}` so property
// extraction stays linear even if a `{{` is never closed.
const MAX_STYLE_BODY_LOOKAHEAD = 10_000;
const TAG_NAME_CHAR = /[A-Za-z0-9.]/;

// Raw SVG drawing primitives. Inline styles on these (geometry, gradient stops,
// transforms for a hand-drawn illustration) have no design-system prop path and
// are legitimately outside the DSDS lint rules — the eslint rule ignores them,
// so the harness metric must too, or SVG-heavy briefs (a bike preview, a chart)
// dilute the inline-style signal and wrongly penalise agents. Tracked in
// `svgExcluded` for transparency, not counted toward `total`/`byComponent`.
// Matched case-sensitively: these are all lowercase, so capitalised design-
// system components (`Text`, `Image`, `Path`) never collide.
const SVG_TAGS = new Set([
  "svg",
  "path",
  "line",
  "circle",
  "ellipse",
  "rect",
  "polygon",
  "polyline",
  "g",
  "defs",
  "stop",
  "linearGradient",
  "radialGradient",
  "use",
  "mask",
  "clipPath",
  "pattern",
  "symbol",
  "marker",
  "text",
  "tspan",
  "textPath",
  "foreignObject",
  "filter",
  "feGaussianBlur",
  "feOffset",
  "feBlend",
]);
const STYLE_PROP_RE = /(?:^|[,\n])\s*(?:'([^']+)'|"([^"]+)"|([a-zA-Z_$][a-zA-Z0-9_$]*))\s*:/g;

/**
 * Single forward pass over one file's source. Tracks the current open JSX
 * tag so each `style={{` is attributed to its component without slicing
 * the whole prefix per match (the previous implementation did
 * `content.slice(0, m.index)` plus a backward-scanning lookahead on every
 * match — O(n²) on files full of `style={{`). Total work here is O(n).
 */
function scanFileContent(rawContent) {
  const content =
    rawContent.length > MAX_STYLE_SCAN_BYTES
      ? rawContent.slice(0, MAX_STYLE_SCAN_BYTES)
      : rawContent;
  const byComponent = {};
  const byProperty = {};
  let total = 0;
  let svgExcluded = 0;
  const n = content.length;
  // Name of the tag whose opening `<Tag ...` we're currently inside, or
  // null once a `>` has closed it. Mirrors the old regex's `(?=[^<>]*$)`
  // guard: a style prop only binds to a tag while that tag is unclosed.
  let curTag = null;

  for (let i = 0; i < n; ) {
    const ch = content[i];
    if (ch === "<") {
      let j = i + 1;
      if (content[j] === "/") {
        curTag = null; // closing tag
        i = j + 1;
        continue;
      }
      const start = j;
      while (j < n && TAG_NAME_CHAR.test(content[j])) j++;
      curTag = j > start && /[A-Za-z]/.test(content[start]) ? content.slice(start, j) : curTag;
      i = j;
      continue;
    }
    if (ch === ">") {
      curTag = null;
      i++;
      continue;
    }
    // Cheap gate: only attempt the `style={{` match at an 's'.
    if (ch === "s" && /^style\s*=\s*\{\s*\{/.test(content.slice(i, i + 40))) {
      const componentName = curTag || "unknown";
      const bodyStart = i + content.slice(i, i + 40).match(/^style\s*=\s*\{\s*\{/)[0].length;
      // Raw SVG primitive: legitimately outside the DS lint rules — count it
      // separately and skip property attribution so it never dilutes the signal.
      if (SVG_TAGS.has(componentName)) {
        svgExcluded++;
        i = bodyStart;
        continue;
      }
      byComponent[componentName] = (byComponent[componentName] || 0) + 1;
      total++;

      // Extract property names within a bounded window up to the closing `}}`.
      const window = content.slice(bodyStart, bodyStart + MAX_STYLE_BODY_LOOKAHEAD);
      const closeIdx = window.search(/\}\s*\}/);
      if (closeIdx !== -1) {
        const styleBody = window.slice(0, closeIdx);
        STYLE_PROP_RE.lastIndex = 0;
        let pm;
        while ((pm = STYLE_PROP_RE.exec(styleBody)) !== null) {
          const prop = pm[1] || pm[2] || pm[3];
          if (prop) byProperty[prop] = (byProperty[prop] || 0) + 1;
        }
      }
      i = bodyStart; // resume just after `{{`, matching the old regex's lastIndex
      continue;
    }
    i++;
  }
  return { total, byComponent, byProperty, svgExcluded };
}

/**
 * Extract inline style usage counts from source files, broken down by
 * the JSX component the style prop is applied to.
 *
 * Returns an object:
 * {
 *   total: number,                       // total style={{}} occurrences
 *   byComponent: { ComponentName: n },   // count per component name
 *   perFile: [{ path, total, byComponent }]
 * }
 */
export function extractInlineStyles(files) {
  const globalByComponent = {};
  const globalByProperty = {};
  let globalTotal = 0;
  let globalSvgExcluded = 0;
  const perFile = [];

  for (const file of files) {
    if (!isJsxFile(file.path)) continue;

    const { total, byComponent, byProperty, svgExcluded } = scanFileContent(file.content);

    for (const [name, n] of Object.entries(byComponent)) {
      globalByComponent[name] = (globalByComponent[name] || 0) + n;
    }
    for (const [prop, n] of Object.entries(byProperty)) {
      globalByProperty[prop] = (globalByProperty[prop] || 0) + n;
    }
    globalTotal += total;
    globalSvgExcluded += svgExcluded;

    if (total > 0) {
      perFile.push({ path: file.path, total, byComponent });
    }
  }

  return {
    total: globalTotal,
    byComponent: globalByComponent,
    byProperty: globalByProperty,
    // Raw-SVG inline styles, excluded from `total` — reported for transparency.
    svgExcluded: globalSvgExcluded,
    perFile,
  };
}
