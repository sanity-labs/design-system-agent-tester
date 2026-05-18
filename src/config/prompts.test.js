import { describe, it, expect } from "vitest";
import config from "./load.js";
import {
  TESTS,
  TEST_LABELS,
  getTest,
  buildSystemPrompt,
  buildFixSystemPrompt,
  buildUserPrompt,
} from "./prompts.js";

const BRIEF = "Build a small content management dashboard.";

describe("prompts engine", () => {
  describe("TESTS / TEST_LABELS", () => {
    it("exposes one normalised entry per test in the config", () => {
      expect(Array.isArray(TESTS)).toBe(true);
      expect(TESTS.length).toBe(config.tests.length);
      expect(TEST_LABELS.length).toBe(TESTS.length);
    });

    it("TEST_LABELS matches config order", () => {
      expect([...TEST_LABELS]).toEqual(config.tests.map((t) => t.label));
    });

    it("every normalised test has the required fields", () => {
      for (const t of TESTS) {
        expect(typeof t.label).toBe("string");
        expect(typeof t.requiresMcp).toBe("boolean");
        expect(typeof t.prompts).toBe("object");
        expect(typeof t.prompts.system).toBe("function");
        expect(typeof t.prompts.fixSystem).toBe("function");
        expect(typeof t.prompts.user).toBe("function");
      }
    });

    it("TESTS is frozen", () => {
      expect(Object.isFrozen(TESTS)).toBe(true);
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

    it.each(TEST_LABELS)(
      "%s — documents the FILE and FEEDBACK output formats",
      (label) => {
        const sys = buildSystemPrompt(label);
        expect(sys).toContain("---FILE:");
        expect(sys).toContain("---END FILE---");
        expect(sys).toContain("---FEEDBACK---");
        expect(sys).toContain("---END FEEDBACK---");
      },
    );
  });

  describe("buildFixSystemPrompt", () => {
    it.each(TEST_LABELS)("%s — returns a non-empty string", (label) => {
      const fix = buildFixSystemPrompt(label);
      expect(typeof fix).toBe("string");
      expect(fix.length).toBeGreaterThan(0);
    });

    it.each(TEST_LABELS)("%s — references the FILE format", (label) => {
      const fix = buildFixSystemPrompt(label);
      expect(fix).toContain("---FILE:");
      expect(fix).toContain("---END FILE---");
    });
  });

  describe("buildUserPrompt", () => {
    it("throws for an unknown label", () => {
      expect(() => buildUserPrompt("does-not-exist", BRIEF)).toThrow(
        /Unknown test label/,
      );
    });

    it.each(TEST_LABELS)("%s — injects the brief at the top", (label) => {
      const prompt = buildUserPrompt(label, BRIEF);
      expect(prompt.startsWith(BRIEF)).toBe(true);
    });
  });
});
