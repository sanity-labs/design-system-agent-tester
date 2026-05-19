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

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import config, { PROJECT_ROOT } from "./load.js";
import { render } from "./template.js";
import { composeSystem, composeFix } from "./boilerplate.js";

// ─── Test discovery ─────────────────────────────────────────────────

const TESTS_DIR = resolve(PROJECT_ROOT, config.testsDir ?? "tests");

if (!existsSync(TESTS_DIR)) {
  throw new Error(
    `Tests directory not found at "${TESTS_DIR}". ` +
      `Create a \`tests/\` folder at the project root (one subdirectory per test) ` +
      `or set \`testsDir\` in agent-tester.config.js.`,
  );
}

const testDirs = readdirSync(TESTS_DIR)
  .filter((name) => !name.startsWith("_"))
  .filter((name) => !name.endsWith(".disabled"))
  .filter((name) => statSync(resolve(TESTS_DIR, name)).isDirectory())
  .sort();

if (testDirs.length === 0) {
  throw new Error(
    `No test directories found in "${TESTS_DIR}". ` +
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
  const where = `tests/${dirName}/config.js`;

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
  if (raw.requiresMcp !== undefined && typeof raw.requiresMcp !== "boolean") {
    throw new Error(
      `${where} ("${raw.label}"): \`requiresMcp\` must be a boolean.`,
    );
  }
  if (
    raw.reactVersion !== undefined &&
    raw.reactVersion !== null &&
    typeof raw.reactVersion !== "string"
  ) {
    throw new Error(
      `${where} ("${raw.label}"): \`reactVersion\` must be a string or null.`,
    );
  }
  if (raw.docsPath !== undefined && raw.docsPath !== null) {
    if (typeof raw.docsPath !== "string") {
      throw new Error(
        `${where} ("${raw.label}"): \`docsPath\` must be a string or null.`,
      );
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
    requiresMcp: Boolean(raw.requiresMcp),
    docsPath: raw.docsPath ? resolveTestPath(testDir, raw.docsPath) : null,
    prompts: {
      system: resolveTestPath(testDir, raw.prompts.system),
      user: resolveTestPath(testDir, raw.prompts.user),
      fixSystem: raw.prompts.fixSystem
        ? resolveTestPath(testDir, raw.prompts.fixSystem)
        : null,
    },
    derive: raw.derive ?? null,
  };
}

// Load every test directory (top-level await — ES modules support this).
const loadedTests = [];
const seenLabels = new Set();

for (const dirName of testDirs) {
  const testDir = resolve(TESTS_DIR, dirName);
  const configPath = resolve(testDir, "config.js");

  if (!existsSync(configPath)) {
    throw new Error(
      `tests/${dirName}/: missing \`config.js\`. ` +
        `Every test directory needs a \`config.js\` exporting a default object. ` +
        `Prefix the directory name with "_" or add ".disabled" to skip it.`,
    );
  }

  let mod;
  try {
    mod = await import(pathToFileURL(configPath).href);
  } catch (err) {
    throw new Error(`Failed to import tests/${dirName}/config.js: ${err.message}`);
  }
  const raw = mod.default;
  validateTest(raw, dirName, testDir);

  if (seenLabels.has(raw.label)) {
    throw new Error(
      `Duplicate test label "${raw.label}" — appears in tests/${dirName}/ and another test directory.`,
    );
  }
  seenLabels.add(raw.label);

  // Surface mismatch between directory name and label early — easy to miss.
  if (raw.label !== dirName) {
    throw new Error(
      `tests/${dirName}/config.js: \`label\` is "${raw.label}" but the directory is named "${dirName}". ` +
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
    throw new Error(
      `Unknown test label: "${label}". Valid labels: ${TEST_LABELS.join(", ")}.`,
    );
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
    ...extra,
  };
  const derived = test.derive ? test.derive(base) : {};
  return { ...base, ...derived };
}

// ─── Public builders ────────────────────────────────────────────────

/**
 * Build the system prompt for a test: rendered intro template, then
 * engine-required OUTPUT/FEEDBACK/BASE_RULES blocks appended.
 */
export function buildSystemPrompt(label) {
  const test = getTest(label);
  const tpl = loadTemplate(test.prompts.system);
  const intro = render(tpl, buildCtx(test));
  return composeSystem(intro);
}

/**
 * Build the fix-system prompt: engine preamble + engine base rules,
 * plus any test-specific extra rules from `prompts.fixSystem`.
 */
export function buildFixSystemPrompt(label) {
  const test = getTest(label);
  const extras = test.prompts.fixSystem
    ? render(loadTemplate(test.prompts.fixSystem), buildCtx(test))
    : "";
  return composeFix(extras);
}

/**
 * Build the user prompt for a test, injecting the brief and (if
 * `docsPath` is set) the docs content.
 *
 * `opts.requiresMcp` overrides the static test-config value in the
 * template context. The harness passes the *effective* runtime state
 * (`mcpEnabled && test.requiresMcp`) so that `{{#if requiresMcp}}`
 * blocks honor `--no-mcp` instead of always reflecting the test's
 * compile-time intent.
 */
export function buildUserPrompt(label, brief, opts = {}) {
  const test = getTest(label);
  const extra = {
    brief,
    docs: loadDocs(test),
  };
  if (opts.requiresMcp !== undefined) {
    extra.requiresMcp = Boolean(opts.requiresMcp);
  }
  const ctx = buildCtx(test, extra);
  const tpl = loadTemplate(test.prompts.user);
  return render(tpl, ctx).trim();
}
