import { describe, it, expect } from "vitest";
import config, { CONFIG_PATH } from "./load.js";

describe("agent-tester.config.js (loaded via ./load.js)", () => {
  it("resolves a config path inside the project", () => {
    expect(typeof CONFIG_PATH).toBe("string");
    expect(CONFIG_PATH.length).toBeGreaterThan(0);
  });

  it("has a `name` string", () => {
    expect(typeof config.name).toBe("string");
    expect(config.name.length).toBeGreaterThan(0);
  });

  describe("mcp", () => {
    it("has a `command` string", () => {
      expect(typeof config.mcp.command).toBe("string");
      expect(config.mcp.command.length).toBeGreaterThan(0);
    });

    it("has an `args` function that returns an array", () => {
      expect(typeof config.mcp.args).toBe("function");
      const result = config.mcp.args("/some/directory");
      expect(Array.isArray(result)).toBe(true);
    });

    it("has a `defaultDirectory` string", () => {
      expect(typeof config.mcp.defaultDirectory).toBe("string");
      expect(config.mcp.defaultDirectory.length).toBeGreaterThan(0);
    });
  });

  describe("appRootSelectors", () => {
    it("is a non-empty array", () => {
      expect(Array.isArray(config.appRootSelectors)).toBe(true);
      expect(config.appRootSelectors.length).toBeGreaterThan(0);
    });
  });

  describe("briefGenerator", () => {
    it("is an object", () => {
      expect(typeof config.briefGenerator).toBe("object");
      expect(config.briefGenerator).not.toBeNull();
    });

    it("has a non-empty staticBrief string", () => {
      expect(typeof config.briefGenerator.staticBrief).toBe("string");
      expect(config.briefGenerator.staticBrief.length).toBeGreaterThan(0);
    });

    it("has a non-empty systemPrompt string", () => {
      expect(typeof config.briefGenerator.systemPrompt).toBe("string");
      expect(config.briefGenerator.systemPrompt.length).toBeGreaterThan(0);
    });

    it("has a non-empty domains array", () => {
      expect(Array.isArray(config.briefGenerator.domains)).toBe(true);
      expect(config.briefGenerator.domains.length).toBeGreaterThan(0);
    });

    it("has a buildUserMessage function", () => {
      expect(typeof config.briefGenerator.buildUserMessage).toBe("function");
    });
  });

  // ─── tests array ──────────────────────────────────────────────────

  describe("tests", () => {
    it("is a non-empty array", () => {
      expect(Array.isArray(config.tests)).toBe(true);
      expect(config.tests.length).toBeGreaterThan(0);
    });

    it("every entry has a non-empty label", () => {
      for (const t of config.tests) {
        expect(typeof t.label).toBe("string");
        expect(t.label.length).toBeGreaterThan(0);
      }
    });

    it("labels are unique", () => {
      const labels = config.tests.map((t) => t.label);
      expect(new Set(labels).size).toBe(labels.length);
    });

    it("every entry has a prompts block with system, fixSystem, and user functions", () => {
      for (const t of config.tests) {
        expect(typeof t.prompts).toBe("object");
        expect(typeof t.prompts.system).toBe("function");
        expect(typeof t.prompts.fixSystem).toBe("function");
        expect(typeof t.prompts.user).toBe("function");
      }
    });

    it("optional fields are typed correctly when present", () => {
      for (const t of config.tests) {
        if (t.packages !== undefined) {
          expect(typeof t.packages).toBe("object");
        }
        if (t.reactVersion !== undefined && t.reactVersion !== null) {
          expect(typeof t.reactVersion).toBe("string");
        }
        if (t.requiresMcp !== undefined) {
          expect(typeof t.requiresMcp).toBe("boolean");
        }
        if (t.docsPath !== undefined && t.docsPath !== null) {
          expect(typeof t.docsPath).toBe("string");
        }
      }
    });
  });
});
