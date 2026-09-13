import { describe, expect, it } from "vitest";
import {
  buildFixSystemPrompt,
  buildSystemPrompt,
  buildUserPrompt,
  getTest,
  isReasoningModel,
  TEST_LABELS,
  TESTS,
} from "./prompts.js";

const BRIEF = "Build a small content management dashboard.";

describe("prompts engine", () => {
  describe("TESTS / TEST_LABELS", () => {
    it("auto-discovers at least one test from tests/", () => {
      expect(Array.isArray(TESTS)).toBe(true);
      expect(TESTS.length).toBeGreaterThan(0);
      expect(TEST_LABELS.length).toBe(TESTS.length);
    });

    it("every normalised test has the required fields", () => {
      for (const t of TESTS) {
        expect(typeof t.label).toBe("string");
        expect(typeof t.requiresMcp).toBe("boolean");
        expect(typeof t.prompts).toBe("object");
        expect(typeof t.prompts.system).toBe("string"); // path
        expect(typeof t.prompts.user).toBe("string"); // path
      }
    });

    it("normalises `measure` to booleans on every discovered test", () => {
      // Local, gitignored `tests.internal/` configs may legitimately opt out
      // (e.g. to cut cost on maintainer runs) — assert shape, not value.
      for (const t of TESTS) {
        expect(typeof t.measure).toBe("object");
        expect(typeof t.measure.screenshots).toBe("boolean");
        expect(typeof t.measure.performance).toBe("boolean");
        expect(typeof t.measure.visualDiff).toBe("boolean");
      }
    });

    it("passes through `preflight` from raw config (null if absent, never undefined)", () => {
      // Regression test: `normalise()` builds its output as an explicit
      // whitelist of named fields. A config.js key not added to that
      // whitelist is silently dropped — no error, no warning — which is
      // exactly what happened to `preflight` (2026-08-21): it worked when a
      // test's config module was imported and called directly, but the
      // real CLI path (which reads through `TESTS`, i.e. through
      // `normalise()`) never saw it, so the hook silently never ran. This
      // asserts the field exists in normalise()'s output for every test —
      // `null` is fine, `undefined` means the whitelist dropped it again.
      for (const t of TESTS) {
        expect(t.preflight === null || typeof t.preflight === "function").toBe(true);
      }
    });

    it("passes through `minStylesheetRules` as a number (0 when absent, never undefined)", () => {
      // Same normalise()-whitelist hazard as `preflight` above — a dropped
      // field silently disables the check for every test.
      for (const t of TESTS) {
        expect(typeof t.minStylesheetRules).toBe("number");
        expect(t.minStylesheetRules).toBeGreaterThanOrEqual(0);
      }
    });

    // Same normalise()-whitelist hazard as `preflight`/`minStylesheetRules`
    // above (2026-08-21) — a field not added to normalise()'s explicit
    // output object is silently dropped, no error. `cli` is new (2026-09-10,
    // config-driven CLI tool support) and easy to add without remembering to
    // whitelist it in normalise() too.
    it("passes through `cli` as an object or null (never undefined), with `requiresCli` derived from it", () => {
      for (const t of TESTS) {
        expect(t.cli === null || typeof t.cli === "object").toBe(true);
        expect(typeof t.requiresCli).toBe("boolean");
        expect(t.requiresCli).toBe(t.cli !== null);
      }
    });

    it("passes through `componentImportPaths` as an array (empty when absent)", () => {
      for (const t of TESTS) {
        expect(Array.isArray(t.componentImportPaths)).toBe(true);
        for (const p of t.componentImportPaths) expect(typeof p).toBe("string");
      }
    });

    // Regression (2026-09-03): LINT_ADVISORY used to live in the engine
    // holding Sanity UI's rules verbatim, switched on by `lintAdvisory: true`.
    // Any non-Sanity test setting that flag would have had another design
    // system's component and package names injected into its prompt. The text
    // is now test-supplied via `prompts.lintAdvisory`.
    it("no test uses the removed boolean `lintAdvisory` flag", () => {
      for (const t of TESTS) {
        expect(typeof t.lintAdvisory).not.toBe("boolean");
      }
    });

    it("exposes `lintAdvisoryPath` as a resolved path or null", () => {
      for (const t of TESTS) {
        expect(t.lintAdvisoryPath === null || typeof t.lintAdvisoryPath === "string").toBe(true);
      }
    });

    it("only tests that declare an advisory get one in their system prompt", () => {
      for (const t of TESTS) {
        const sys = buildSystemPrompt(t.label);
        const hasAdvisory = sys.includes("lint rules — author to these up front");
        expect(hasAdvisory).toBe(Boolean(t.lintAdvisoryPath));
      }
    });

    it("labels are unique", () => {
      const set = new Set(TEST_LABELS);
      expect(set.size).toBe(TEST_LABELS.length);
    });

    it("TESTS is frozen", () => {
      expect(Object.isFrozen(TESTS)).toBe(true);
    });
  });

  describe("isReasoningModel", () => {
    it("matches Fable and Mythos model IDs", () => {
      expect(isReasoningModel("claude-fable-5")).toBe(true);
      expect(isReasoningModel("claude-mythos-5")).toBe(true);
      expect(isReasoningModel("claude-mythos-preview")).toBe(true);
    });

    it("does not match other model families", () => {
      expect(isReasoningModel("claude-sonnet-4-6")).toBe(false);
      expect(isReasoningModel("claude-haiku-4-5")).toBe(false);
      expect(isReasoningModel("claude-opus-4-8")).toBe(false);
    });

    it("handles null/undefined/non-string input without throwing", () => {
      expect(isReasoningModel(null)).toBe(false);
      expect(isReasoningModel(undefined)).toBe(false);
      expect(isReasoningModel(42)).toBe(false);
    });
  });

  describe("getTest", () => {
    it("returns the normalised test for a valid label", () => {
      const t = getTest(TEST_LABELS[0]);
      expect(t.label).toBe(TEST_LABELS[0]);
    });

    it("throws on an unknown label", () => {
      expect(() => getTest("does-not-exist")).toThrow(/Unknown test label/);
    });
  });

  describe("buildSystemPrompt", () => {
    it.each(TEST_LABELS)("%s — returns a non-empty string", (label) => {
      const sys = buildSystemPrompt(label);
      expect(typeof sys).toBe("string");
      expect(sys.length).toBeGreaterThan(0);
    });

    it.each(TEST_LABELS)("%s — engine auto-appends FILE and FEEDBACK output formats", (label) => {
      const sys = buildSystemPrompt(label);
      expect(sys).toContain("---FILE:");
      expect(sys).toContain("---END FILE---");
      expect(sys).toContain("---FEEDBACK---");
      expect(sys).toContain("---END FEEDBACK---");
    });

    it.each(TEST_LABELS)("%s — engine auto-appends BASE_RULES", (label) => {
      const sys = buildSystemPrompt(label);
      expect(sys).toMatch(/Rules:/);
    });
  });

  describe("buildFixSystemPrompt", () => {
    it.each(TEST_LABELS)("%s — returns a non-empty string", (label) => {
      const fix = buildFixSystemPrompt(label);
      expect(typeof fix).toBe("string");
      expect(fix.length).toBeGreaterThan(0);
    });

    it.each(TEST_LABELS)("%s — engine auto-includes FIX_PREAMBLE and the FILE format", (label) => {
      const fix = buildFixSystemPrompt(label);
      expect(fix).toContain("---FILE:");
      expect(fix).toContain("---END FILE---");
      expect(fix).toMatch(/debugging a web application/i);
    });
  });

  describe("buildUserPrompt", () => {
    it("throws for an unknown label", () => {
      expect(() => buildUserPrompt("does-not-exist", BRIEF)).toThrow(/Unknown test label/);
    });

    it.each(TEST_LABELS)("%s — injects the brief at the top", (label) => {
      const prompt = buildUserPrompt(label, BRIEF);
      expect(prompt.startsWith(BRIEF)).toBe(true);
    });
  });
});
