/**
 * Prompt engine.
 *
 * This module is intentionally generic: it contains no design-system text
 * of its own. All prompt content is defined in the root config file
 * (`agent-tester.config.js`, see `tests[*].prompts.*`). This module:
 *
 *   1. Normalises the `tests: [...]` array from the config.
 *   2. Builds a `ctx` object from each test's fields.
 *   3. Loads each test's `docsPath` file lazily on demand.
 *   4. Dispatches to the user-supplied template functions.
 *
 * Tests are agnostic peers — the engine does not assign special meaning
 * to their order or labels.
 *
 * Public API:
 *   - TESTS                Array of normalised test configs.
 *   - TEST_LABELS          Array of test labels (in config order).
 *   - getTest(label)       Look up one test's normalised config by label.
 *   - buildSystemPrompt(label)
 *                          System prompt for the given test.
 *   - buildFixSystemPrompt(label)
 *                          Fix-cycle system prompt for the given test.
 *   - buildUserPrompt(label, brief)
 *                          Full user prompt for the given test.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import config, { PROJECT_ROOT } from "./load.js";

// ─── Normalisation ──────────────────────────────────────────────────

function ensureFn(name, fn) {
  if (typeof fn !== "function") {
    throw new Error(
      `Expected \`${name}\` to be a function in agent-tester.config.js.`,
    );
  }
  return fn;
}

function normaliseTest(raw, index) {
  if (!raw || typeof raw !== "object") {
    throw new Error(`tests[${index}] must be an object.`);
  }
  if (typeof raw.label !== "string" || !raw.label) {
    throw new Error(`tests[${index}].label must be a non-empty string.`);
  }
  if (!raw.prompts || typeof raw.prompts !== "object") {
    throw new Error(
      `tests[${index}] ("${raw.label}").prompts must be an object with system, fixSystem, and user functions.`,
    );
  }
  ensureFn(`tests[${index}].prompts.system`, raw.prompts.system);
  ensureFn(`tests[${index}].prompts.fixSystem`, raw.prompts.fixSystem);
  ensureFn(`tests[${index}].prompts.user`, raw.prompts.user);

  return {
    label: raw.label,
    packages: raw.packages ?? {},
    reactVersion: raw.reactVersion ?? null,
    requiresMcp: Boolean(raw.requiresMcp),
    docsPath: raw.docsPath ?? null,
    prompts: raw.prompts,
  };
}

const rawTests = Array.isArray(config.tests) ? config.tests : null;
if (!rawTests || rawTests.length === 0) {
  throw new Error(
    "agent-tester.config.js must export a `tests: [...]` array with at least one entry.",
  );
}

// Validate uniqueness of labels.
const seenLabels = new Set();
for (const t of rawTests) {
  if (t && typeof t.label === "string") {
    if (seenLabels.has(t.label)) {
      throw new Error(`Duplicate test label "${t.label}" in tests array.`);
    }
    seenLabels.add(t.label);
  }
}

/** Normalised test configs, in the order they appear in the config. */
export const TESTS = Object.freeze(rawTests.map(normaliseTest));

/** Labels (e.g. `["control", "variant"]`) in config order. */
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

// ─── Docs loader (lazy, per-test) ───────────────────────────────────

const docsCache = new Map();

function loadDocs(test) {
  if (!test.docsPath) return "";
  if (docsCache.has(test.label)) return docsCache.get(test.label);

  const fullPath = resolve(PROJECT_ROOT, test.docsPath);
  if (!existsSync(fullPath)) {
    throw new Error(
      `Docs file not found at "${test.docsPath}" for test "${test.label}". ` +
        `Update \`tests[*].docsPath\` in agent-tester.config.js or create the file.`,
    );
  }

  const content = readFileSync(fullPath, "utf-8").trim();
  docsCache.set(test.label, content);
  return content;
}

// ─── ctx assembly ───────────────────────────────────────────────────

/**
 * Build the context object passed to a test's prompt functions. The
 * fields below are the documented public surface; users can also reach
 * the full test config (`ctx.test`) or the full root config (`ctx.config`)
 * as escape hatches.
 *
 * @param {object} test    — normalised test config
 * @param {object} [extra] — additional fields (e.g. `{ brief }`)
 */
function buildCtx(test, extra = {}) {
  return {
    // Test-specific
    label: test.label,
    packages: test.packages,
    reactVersion: test.reactVersion,
    requiresMcp: test.requiresMcp,

    // Global
    name: config.name,
    config,
    test,

    ...extra,
  };
}

// ─── Public builders ────────────────────────────────────────────────

/**
 * Build the system prompt for the given test.
 *
 * @param {string} label
 * @returns {string}
 */
export function buildSystemPrompt(label) {
  const test = getTest(label);
  return String(test.prompts.system(buildCtx(test))).trim();
}

/**
 * Build the fix-cycle system prompt for the given test.
 *
 * @param {string} label
 * @returns {string}
 */
export function buildFixSystemPrompt(label) {
  const test = getTest(label);
  return String(test.prompts.fixSystem(buildCtx(test))).trim();
}

/**
 * Build the full user prompt for the given test, injecting the brief
 * and (if `docsPath` is set) the docs content as `ctx.docs`.
 *
 * @param {string} label
 * @param {string} brief
 * @returns {string}
 */
export function buildUserPrompt(label, brief) {
  const test = getTest(label);

  // Lazy docs loader — only loads when the template touches `ctx.docs`.
  const ctx = buildCtx(test, {
    brief,
    get docs() {
      return loadDocs(test);
    },
  });

  return String(test.prompts.user(ctx)).trim();
}
