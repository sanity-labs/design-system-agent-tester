/**
 * Prompt engine.
 *
 * Auto-discovers tests from the `tests/` directory, validates each entry
 * against a small schema, and renders prompts from markdown templates
 * using a minimal `{{var}}` / `{{#if}}` / `{{#unless}}` engine. Engine
 * boilerplate (OUTPUT_FORMAT, FEEDBACK_FORMAT, BASE_RULES, FIX_PREAMBLE,
 * FIX_RULES_BASE) is appended automatically so users only write the
 * test-specific text.
 *
 * Public API:
 *   - TESTS                  Array of normalised test configs.
 *   - TEST_LABELS            Array of test labels (file-name order).
 *   - getTest(label)         Look up one normalised test by label.
 *   - buildSystemPrompt(label)
 *   - buildFixSystemPrompt(label)
 *   - buildUserPrompt(label, brief)
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { composeFix, composeSystem } from "./boilerplate.js";
import config, { PROJECT_ROOT } from "./load.js";
import { render } from "./template.js";

// ─── Test discovery ─────────────────────────────────────────────────

// Tests are discovered from two locations, both relative to the project
// root:
//   1. `testsDir` from agent-tester.config.js (default: `tests/`) — the
//      public/shipped tests.
//   2. `tests.internal/` — optional sibling directory for personal or
//      maintainer-specific tests. Gitignored by default so private
//      tests don't pollute the OSS distribution. Skipped when absent.
//
// Tests from both directories appear in the same `TESTS` list. Labels
// must be unique across BOTH directories (the duplicate-label check
// below enforces this). When the same label appears in both, the load
// errors out rather than silently picking one.
const PRIMARY_TESTS_DIR = resolve(PROJECT_ROOT, config.testsDir ?? "tests");
const INTERNAL_TESTS_DIR = resolve(PROJECT_ROOT, "tests.internal");

const TEST_DISCOVERY_DIRS = [PRIMARY_TESTS_DIR];
if (existsSync(INTERNAL_TESTS_DIR)) {
  TEST_DISCOVERY_DIRS.push(INTERNAL_TESTS_DIR);
}

if (!existsSync(PRIMARY_TESTS_DIR)) {
  throw new Error(
    `Tests directory not found at "${PRIMARY_TESTS_DIR}". ` +
      `Create a \`tests/\` folder at the project root (one subdirectory per test) ` +
      `or set \`testsDir\` in agent-tester.config.js.`,
  );
}

/**
 * Pair every discovered test directory with the base it came from so
 * later code can resolve paths and emit error messages that reference
 * the right parent (`tests/` vs `tests.internal/`).
 */
const isDirSafe = (p) => {
  // statSync follows symlinks (so a symlink to a dir still counts), but a
  // dangling symlink or an entry removed between readdir and statSync throws.
  // Skip those rather than aborting all test discovery.
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

const testEntries = TEST_DISCOVERY_DIRS.flatMap((baseDir) =>
  readdirSync(baseDir)
    .filter((name) => !name.startsWith("_"))
    .filter((name) => !name.endsWith(".disabled"))
    .filter((name) => isDirSafe(resolve(baseDir, name)))
    .map((dirName) => ({ baseDir, dirName })),
);

// Sort by dirName for stable ordering across both directories. When the
// same name exists in both, the duplicate-label check below catches it.
testEntries.sort((a, b) => a.dirName.localeCompare(b.dirName));

if (testEntries.length === 0) {
  throw new Error(
    `No test directories found in "${PRIMARY_TESTS_DIR}" or "${INTERNAL_TESTS_DIR}". ` +
      `Add at least one \`<label>/\` directory containing \`config.js\`. ` +
      `Use \`npm run new-test -- <label>\` to scaffold one. ` +
      `Directories starting with "_" or ending with ".disabled" are skipped.`,
  );
}

/**
 * Resolve a relative prompt path against the test's own directory.
 * Absolute paths and paths starting with `../` pass through `resolve()`
 * normally — useful for sharing templates across tests if you want.
 */
function resolveTestPath(testDir, relOrAbsPath) {
  return resolve(testDir, relOrAbsPath);
}

/**
 * Validate one raw test definition. Throws with a path-prefixed message
 * pointing at the directory the error came from.
 */
function validateTest(raw, dirName, testDir) {
  // Use the test's actual parent directory in error messages so
  // `tests.internal/` configs aren't reported under `tests/`. Compare
  // resolved paths rather than sniffing for "/tests.internal/" — the
  // latter never matches on Windows, where separators are backslashes.
  const baseName = testDir.startsWith(INTERNAL_TESTS_DIR) ? "tests.internal" : "tests";
  const where = `${baseName}/${dirName}/config.js`;

  if (!raw || typeof raw !== "object") {
    throw new Error(`${where}: default export must be an object.`);
  }
  if (typeof raw.label !== "string" || !raw.label.trim()) {
    throw new Error(`${where}: \`label\` must be a non-empty string.`);
  }

  if (!raw.prompts || typeof raw.prompts !== "object") {
    throw new Error(
      `${where} ("${raw.label}"): \`prompts\` must be an object with at least \`system\` and \`user\` template paths.`,
    );
  }
  for (const key of ["system", "user"]) {
    if (typeof raw.prompts[key] !== "string" || !raw.prompts[key].trim()) {
      throw new Error(
        `${where} ("${raw.label}"): \`prompts.${key}\` must be a path to a markdown template (relative to this test's directory).`,
      );
    }
    const tplPath = resolveTestPath(testDir, raw.prompts[key]);
    if (!existsSync(tplPath)) {
      throw new Error(
        `${where} ("${raw.label}"): \`prompts.${key}\` points at "${raw.prompts[key]}" but no such file exists at ${tplPath}.`,
      );
    }
  }
  if (raw.prompts.fixSystem !== undefined) {
    if (typeof raw.prompts.fixSystem !== "string") {
      throw new Error(
        `${where} ("${raw.label}"): \`prompts.fixSystem\`, when set, must be a path to a markdown template.`,
      );
    }
    const tplPath = resolveTestPath(testDir, raw.prompts.fixSystem);
    if (!existsSync(tplPath)) {
      throw new Error(
        `${where} ("${raw.label}"): \`prompts.fixSystem\` points at "${raw.prompts.fixSystem}" but no such file exists at ${tplPath}.`,
      );
    }
  }

  if (raw.packages !== undefined && typeof raw.packages !== "object") {
    throw new Error(`${where} ("${raw.label}"): \`packages\` must be an object.`);
  }

  // `requiresMcp: true` was the previous opt-in mechanism — it relied
  // on a global `mcp` field in `agent-tester.config.js`. MCP config is
  // now declared per-test, so reject the old field with a migration
  // hint rather than silently ignoring it.
  if (raw.requiresMcp !== undefined) {
    throw new Error(
      `${where} ("${raw.label}"): \`requiresMcp\` is no longer supported. ` +
        `Declare an \`mcp: { command, args, defaultDirectory, env?, toolPrefix }\` ` +
        `block on this test config instead. Tests without an \`mcp\` field run without MCP.`,
    );
  }

  if (raw.mcp !== undefined) {
    if (!raw.mcp || typeof raw.mcp !== "object") {
      throw new Error(`${where} ("${raw.label}"): \`mcp\`, when set, must be an object.`);
    }
    if (typeof raw.mcp.command !== "string" || !raw.mcp.command.trim()) {
      throw new Error(
        `${where} ("${raw.label}"): \`mcp.command\` must be a non-empty string (e.g. "node", "uv").`,
      );
    }
    if (typeof raw.mcp.args !== "function" && !Array.isArray(raw.mcp.args)) {
      throw new Error(
        `${where} ("${raw.label}"): \`mcp.args\` must be an array or \`(directory) => string[]\`.`,
      );
    }
    if (
      raw.mcp.defaultDirectory !== undefined &&
      raw.mcp.defaultDirectory !== null &&
      typeof raw.mcp.defaultDirectory !== "string"
    ) {
      throw new Error(
        `${where} ("${raw.label}"): \`mcp.defaultDirectory\` must be a string or null.`,
      );
    }
    if (
      raw.mcp.env !== undefined &&
      typeof raw.mcp.env !== "object" &&
      typeof raw.mcp.env !== "function"
    ) {
      throw new Error(
        `${where} ("${raw.label}"): \`mcp.env\` must be an object or \`(directory) => env\`.`,
      );
    }
    if (raw.mcp.toolPrefix !== undefined && typeof raw.mcp.toolPrefix !== "string") {
      throw new Error(`${where} ("${raw.label}"): \`mcp.toolPrefix\` must be a string.`);
    }
  }

  if (
    raw.reactVersion !== undefined &&
    raw.reactVersion !== null &&
    typeof raw.reactVersion !== "string"
  ) {
    throw new Error(`${where} ("${raw.label}"): \`reactVersion\` must be a string or null.`);
  }
  if (raw.docsPath !== undefined && raw.docsPath !== null) {
    if (typeof raw.docsPath !== "string") {
      throw new Error(`${where} ("${raw.label}"): \`docsPath\` must be a string or null.`);
    }
    const docsAbs = resolveTestPath(testDir, raw.docsPath);
    if (!existsSync(docsAbs)) {
      throw new Error(
        `${where} ("${raw.label}"): \`docsPath\` points at "${raw.docsPath}" but no such file exists at ${docsAbs}.`,
      );
    }
  }
  if (raw.derive !== undefined && typeof raw.derive !== "function") {
    throw new Error(
      `${where} ("${raw.label}"): \`derive\` must be a function returning an object of extra template values.`,
    );
  }

  if (raw.measure !== undefined) {
    if (!raw.measure || typeof raw.measure !== "object") {
      throw new Error(`${where} ("${raw.label}"): \`measure\`, when set, must be an object.`);
    }
    for (const key of ["screenshots", "performance", "visualDiff"]) {
      if (raw.measure[key] !== undefined && typeof raw.measure[key] !== "boolean") {
        throw new Error(`${where} ("${raw.label}"): \`measure.${key}\` must be a boolean.`);
      }
    }
  }

  if (raw.effort !== undefined && raw.effort !== null) {
    const validEffortLevels = ["low", "medium", "high", "xhigh", "max"];
    if (!validEffortLevels.includes(raw.effort)) {
      throw new Error(
        `${where} ("${raw.label}"): \`effort\` must be one of ${validEffortLevels.join(", ")} (or omitted/null). ` +
          `Only applied to models that accept \`output_config.effort\` — silently ignored on others (e.g. any Haiku). ` +
          `Ignored on Fable/Mythos too: they're hardcoded to "medium" regardless of this value (see modelTuning in runner-api.js).`,
      );
    }
  }

  if (raw.renderFailureSignatures !== undefined) {
    if (!Array.isArray(raw.renderFailureSignatures)) {
      throw new Error(
        `${where} ("${raw.label}"): \`renderFailureSignatures\`, when set, must be an array of strings or RegExps.`,
      );
    }
    for (const sig of raw.renderFailureSignatures) {
      if (typeof sig !== "string" && !(sig instanceof RegExp)) {
        throw new Error(
          `${where} ("${raw.label}"): each \`renderFailureSignatures\` entry must be a string or a RegExp.`,
        );
      }
    }
  }
}

/**
 * Resolve every path on the raw test against `testDir`, so the runtime
 * can do simple `readFileSync` calls without any further resolution.
 */
function normalise(raw, dirName, testDir) {
  return {
    label: raw.label,
    dir: testDir,
    packages: raw.packages ?? {},
    reactVersion: raw.reactVersion ?? null,
    // `requiresMcp` is derived from presence of `mcp`. Kept on the
    // normalised shape so templates can keep using `{{#if requiresMcp}}`.
    requiresMcp: Boolean(raw.mcp),
    mcp: raw.mcp ?? null,
    // Shift-left (P4): when true, the generation system prompt gets the
    // design-system lint advisory so the agent authors to the rules up front.
    // Enable on lint-enabled tests only, so the A/B measures linting's full
    // contribution (prevention + gate).
    lintAdvisory: Boolean(raw.lintAdvisory),
    // Non-core report metrics — each independently toggleable, all default
    // true. `screenshots` gates the screenshot image capture (DOM count and
    // semantic HTML still run); `performance` gates Lighthouse + the React
    // profiler; `visualDiff` gates the pairwise pixel-diff pass across an
    // iteration set.
    measure: {
      screenshots: raw.measure?.screenshots ?? true,
      performance: raw.measure?.performance ?? true,
      visualDiff: raw.measure?.visualDiff ?? true,
    },
    // Per-test `output_config.effort` override — "low"/"medium"/"high"/
    // "xhigh"/"max", or null (no override; the model's own API default
    // applies). Silently ignored on models that don't accept the parameter
    // (e.g. any Haiku), so one value is safe to set across a multi-model
    // run. Also ignored on reasoning models (Fable/Mythos) — they're
    // hardcoded to "medium" regardless of this field; see `modelTuning`
    // in runner-api.js for why.
    effort: raw.effort ?? null,
    // Patterns matched against the rendered page's visible text; a match
    // is treated as a fatal error even though the page technically
    // rendered something. See `detectRenderFailureSignature` in
    // evaluation/validate.js.
    renderFailureSignatures: raw.renderFailureSignatures ?? [],
    docsPath: raw.docsPath ? resolveTestPath(testDir, raw.docsPath) : null,
    prompts: {
      system: resolveTestPath(testDir, raw.prompts.system),
      user: resolveTestPath(testDir, raw.prompts.user),
      fixSystem: raw.prompts.fixSystem ? resolveTestPath(testDir, raw.prompts.fixSystem) : null,
    },
    derive: raw.derive ?? null,
  };
}

// Load every test directory (top-level await — ES modules support this).
const loadedTests = [];
const seenLabels = new Set();

for (const { baseDir, dirName } of testEntries) {
  const testDir = resolve(baseDir, dirName);
  const configPath = resolve(testDir, "config.js");
  // Display path that names the actual parent (tests/ or tests.internal/)
  // so error messages point a maintainer at the right file.
  const baseName = baseDir === INTERNAL_TESTS_DIR ? "tests.internal" : (config.testsDir ?? "tests");
  const displayPath = `${baseName}/${dirName}`;

  if (!existsSync(configPath)) {
    throw new Error(
      `${displayPath}/: missing \`config.js\`. ` +
        `Every test directory needs a \`config.js\` exporting a default object. ` +
        `Prefix the directory name with "_" or add ".disabled" to skip it.`,
    );
  }

  let mod;
  try {
    mod = await import(pathToFileURL(configPath).href);
  } catch (err) {
    throw new Error(`Failed to import ${displayPath}/config.js: ${err.message}`);
  }
  const raw = mod.default;
  validateTest(raw, dirName, testDir);

  if (seenLabels.has(raw.label)) {
    throw new Error(
      `Duplicate test label "${raw.label}" — appears in ${displayPath}/ and another test directory. ` +
        `Labels must be unique across \`tests/\` and \`tests.internal/\`.`,
    );
  }
  seenLabels.add(raw.label);

  // Surface mismatch between directory name and label early — easy to miss.
  if (raw.label !== dirName) {
    throw new Error(
      `${displayPath}/config.js: \`label\` is "${raw.label}" but the directory is named "${dirName}". ` +
        `Rename one so they match — the directory name is used as the on-disk identifier for output.`,
    );
  }

  loadedTests.push(normalise(raw, dirName, testDir));
}

/** Normalised test configs, in file-name order. */
export const TESTS = Object.freeze(loadedTests);

/** Labels (e.g. `["control", "shad-cn", "variant"]`). */
export const TEST_LABELS = Object.freeze(TESTS.map((t) => t.label));

/**
 * Look up a normalised test config by label.
 *
 * @param {string} label
 * @returns {object}
 */
export function getTest(label) {
  const t = TESTS.find((x) => x.label === label);
  if (!t) {
    throw new Error(`Unknown test label: "${label}". Valid labels: ${TEST_LABELS.join(", ")}.`);
  }
  return t;
}

// ─── Template loading + rendering ────────────────────────────────────

const templateCache = new Map();

function loadTemplate(absPath) {
  if (templateCache.has(absPath)) return templateCache.get(absPath);
  const contents = readFileSync(absPath, "utf-8");
  templateCache.set(absPath, contents);
  return contents;
}

const docsCache = new Map();

function loadDocs(test) {
  if (!test.docsPath) return "";
  if (docsCache.has(test.label)) return docsCache.get(test.label);
  const content = readFileSync(test.docsPath, "utf-8").trim();
  docsCache.set(test.label, content);
  return content;
}

/**
 * Build the render context for one test. Includes the test's own fields,
 * any values returned by `derive()`, and the global config name. The
 * caller adds `brief` / `docs` when those make sense.
 */
function buildCtx(test, extra = {}) {
  const base = {
    label: test.label,
    packages: test.packages,
    reactVersion: test.reactVersion,
    requiresMcp: test.requiresMcp,
    name: config.name,
    harnessRoot: PROJECT_ROOT,
    ...extra,
  };
  const derived = test.derive ? test.derive(base) : {};
  return { ...base, ...derived };
}

// Adaptive thinking is always-on and non-optional for these model families
// (Anthropic docs: `thinking: {type: "disabled"}` is rejected on both) — the
// only lever is how much they think, not whether. Templates use this to keep
// reasoning-model-specific instructions (e.g. the self-lint workflow) scoped
// to the models that actually need them.
export function isReasoningModel(model) {
  return (
    typeof model === "string" &&
    (model.startsWith("claude-fable") || model.startsWith("claude-mythos"))
  );
}

// ─── Public builders ────────────────────────────────────────────────

/**
 * Build the system prompt for a test: rendered intro template, then
 * engine-required OUTPUT/FEEDBACK/BASE_RULES blocks appended.
 *
 * `docs` is exposed to the template (in addition to the base context) so
 * a test can pull its docs into the system prompt if useful. The docs
 * file is read once and cached, so referencing `{{docs}}` here costs
 * the same as referencing it from the user template.
 */
export function buildSystemPrompt(label, model = null) {
  const test = getTest(label);
  const tpl = loadTemplate(test.prompts.system);
  const intro = render(
    tpl,
    buildCtx(test, { docs: loadDocs(test), isReasoningModel: isReasoningModel(model) }),
  );
  return composeSystem(intro, { lintAdvisory: test.lintAdvisory });
}

/**
 * Build the fix-system prompt: engine preamble + engine base rules,
 * plus any test-specific extra rules from `prompts.fixSystem`. Like
 * the system prompt, `docs` is in scope so fix instructions can quote
 * the docs when explaining what a fix should do.
 */
export function buildFixSystemPrompt(label) {
  const test = getTest(label);
  const extras = test.prompts.fixSystem
    ? render(loadTemplate(test.prompts.fixSystem), buildCtx(test, { docs: loadDocs(test) }))
    : "";
  return composeFix(extras);
}

/**
 * Build the user prompt for a test, injecting the brief and (if
 * `docsPath` is set) the docs content.
 */
export function buildUserPrompt(label, brief) {
  const test = getTest(label);
  const ctx = buildCtx(test, {
    brief,
    docs: loadDocs(test),
  });
  const tpl = loadTemplate(test.prompts.user);
  return render(tpl, ctx).trim();
}
