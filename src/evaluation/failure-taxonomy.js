/**
 * Sort build failures into categories so the report says what to fix, not
 * just how often things broke.
 *
 * Categories come from tooling the harness already runs (tsc, eslint, the
 * browser, axe). No model is asked to judge — a judge would just add its own
 * errors to the measurement.
 */

/**
 * Categories, in the order they are tested. Order matters: the first match
 * wins, so put the specific patterns before the general ones.
 *
 * `id` is stored in reports and must stay stable. `label` is for display.
 */
export const FAILURE_CATEGORIES = [
  { id: "dependency", label: "Dependency resolution" },
  { id: "build-tooling", label: "Build tooling" },
  { id: "missing-export", label: "Missing or misnamed export" },
  { id: "wrong-import-path", label: "Wrong import path" },
  { id: "hallucinated-prop", label: "Hallucinated prop" },
  { id: "wrong-prop-type", label: "Wrong prop type" },
  { id: "missing-required-prop", label: "Missing required prop" },
  { id: "invalid-composition", label: "Invalid composition" },
  { id: "styles-not-applied", label: "Styles not applied" },
  { id: "render-timeout", label: "Rendered nothing" },
  { id: "accessibility", label: "Accessibility" },
  { id: "lint", label: "Lint" },
  { id: "tsconfig", label: "Project config" },
  { id: "no-error-recorded", label: "No error recorded" },
  { id: "other", label: "Other" },
];

const CATEGORY_IDS = new Set(FAILURE_CATEGORIES.map((c) => c.id));

/**
 * Tried in order against the error text.
 *
 * Keep the patterns generic. This file ships with the harness whatever design
 * system a test targets, so it must not name a specific package or component.
 */
const RULES = [
  // npm could not build a dependency tree, so nothing else ran.
  { id: "dependency", test: /npm error|ERESOLVE|npm install failed/i },

  // The bundler or its config failed, so the app never got a chance to run.
  // Package export maps land here too: the dependency installed fine, but the
  // subpath being imported is not one the package publishes.
  {
    id: "build-tooling",
    test: /Dev server exited|Missing "[^"]+" specifier|failed to load config|Failed to scan for dependencies|\[plugin [\w-]+\]/i,
  },

  // A provider or wrapper the design system requires was absent, caught by a
  // signature the test itself declared in `renderFailureSignatures`.
  { id: "invalid-composition", test: /known failure signature/i },

  // The page rendered but the stylesheet never arrived, so it is unstyled.
  { id: "styles-not-applied", test: /almost no CSS was applied|stylesheet rule\(s\) found/i },

  // tsc could not start: no inputs, stale build info, bad project references.
  { id: "tsconfig", test: /tsc exited abnormally|TS18003\b|TS630[56]\b/ },

  // Declared but never used. The compiler reports it, but it is a tidiness
  // rule rather than a broken API.
  { id: "lint", test: /TS6133\b|TS6196\b|is declared but (?:its value is )?never (?:read|used)/ },

  // The name was imported from a real package but does not exist there.
  // Covers both the compile-time error and the browser's version of it,
  // which only shows up after tsc has already passed.
  {
    id: "missing-export",
    test: /TS2(?:305|724)\b|has no exported member|does not provide an export named/,
  },

  // The module path itself does not resolve.
  { id: "wrong-import-path", test: /TS2307\b|Cannot find module|Failed to resolve import/ },

  // A prop was passed that the component does not accept.
  { id: "hallucinated-prop", test: /Property '[^']+' does not exist on type/ },

  // A required prop was left out.
  { id: "missing-required-prop", test: /TS2741\b|is missing in type .* but required in type/ },

  // The prop exists but the value is the wrong type — a number where a CSS
  // string belongs, a string where a union member belongs, and so on.
  { id: "wrong-prop-type", test: /TS2322\b|is not assignable to type/ },

  // Used as a JSX element but is not one, usually a default-vs-named import mixup.
  {
    id: "invalid-composition",
    test: /TS2604\b|TS2605\b|does not have any construct or call signatures/,
  },

  // A React context was missing, so a component threw while rendering. This
  // is the class tsc cannot see: the types are fine, the tree is wrong.
  {
    id: "invalid-composition",
    test: /missing context value|Cannot read propert\w+ of (?:undefined|null)/i,
  },

  // Compiled and loaded, but nothing visible appeared.
  { id: "render-timeout", test: /did not render any visible content|Page did not render/i },

  { id: "accessibility", test: /axe|violation/i },
  { id: "lint", test: /eslint|lint (?:error|failure)/i },
  { id: "tsconfig", test: /TS5023\b|TS6046\b|Unknown compiler option|tsconfig\.json\(/ },
];

/**
 * Put one error into a category.
 *
 * @param {string} text - the fatal error, optionally with console errors appended
 * @returns {string} a category id from FAILURE_CATEGORIES; "other" if nothing matched
 */
export function classifyFailure(text) {
  // An iteration can fail with nothing written down. That is a gap in the
  // harness, not a mistake the agent made, so it gets its own bucket instead
  // of padding "other".
  if (!text || typeof text !== "string" || !text.trim()) return "no-error-recorded";
  for (const rule of RULES) {
    if (rule.test.test(text)) return rule.id;
  }
  return "other";
}

/**
 * Find the error that actually ended the run.
 *
 * The last entry in the fix log is the one that was never repaired, so that is
 * the one worth categorising. Earlier entries were all fixed.
 *
 * Console errors are included because the useful detail is often there rather
 * than in the fatal error, which may just say the page never rendered.
 *
 * @param {object} iteration - a parsed _meta.json
 * @returns {string} empty when the iteration did not fail
 */
export function firstBlockingError(iteration) {
  const log = Array.isArray(iteration?.fixLog) ? iteration.fixLog : [];
  if (log.length === 0) return "";
  const final = log.find((e) => e?.final) ?? log[log.length - 1];
  const parts = [final?.fatalError, ...(Array.isArray(final?.errors) ? final.errors : [])];
  return parts.filter(Boolean).join("\n");
}

/**
 * How many repair rounds it took to get a working build.
 *
 * Counts only build-stage fixes. Lint and accessibility rounds run after the
 * page already renders, so counting them would conflate "could not build it"
 * with "polished it afterwards".
 *
 * @returns {number|null} rounds needed, or null if it never built
 */
export function turnsToGreen(iteration) {
  if (iteration?.exitStage == null || iteration.exitStage === "build") return null;
  const log = Array.isArray(iteration.fixLog) ? iteration.fixLog : [];
  return log.filter((e) => e?.stage === "build").length;
}

/**
 * Total up failure categories and repair cost across iterations.
 *
 * Iterations with no exit stage never got as far as the build, usually because
 * of an API error before any code existed. They are left out rather than
 * counted as failures.
 */
export function analyzeFailures(iterations) {
  const measured = (iterations ?? []).filter((r) => r?.exitStage != null);
  const failed = measured.filter((r) => r.exitStage === "build");

  const counts = {};
  for (const r of failed) {
    const id = classifyFailure(firstBlockingError(r));
    counts[id] = (counts[id] ?? 0) + 1;
  }

  const byCategory = FAILURE_CATEGORIES.filter((c) => counts[c.id]).map((c) => ({
    id: c.id,
    label: c.label,
    count: counts[c.id],
    share: counts[c.id] / failed.length,
  }));
  byCategory.sort((a, b) => b.count - a.count);

  const turns = measured.map(turnsToGreen).filter((n) => n != null);

  return {
    measured: measured.length,
    failed: failed.length,
    unrecoverableRate: measured.length ? failed.length / measured.length : null,
    byCategory,
    turnsToGreen: {
      median: percentile(turns, 0.5),
      p90: percentile(turns, 0.9),
      cleanFirstTry: turns.filter((n) => n === 0).length,
      measured: turns.length,
    },
    perIteration: measured.map((r) => ({
      iteration: r.iteration,
      exitStage: r.exitStage,
      category: r.exitStage === "build" ? classifyFailure(firstBlockingError(r)) : null,
      turnsToGreen: turnsToGreen(r),
    })),
  };
}

/** Nearest-rank percentile. Returns null for an empty list. */
function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

export { CATEGORY_IDS };
