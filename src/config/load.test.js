import { describe, expect, it } from "vitest";
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
    it("is NOT declared at the top level — MCP config moved to per-test `tests/<label>/config.js`", () => {
      expect(config.mcp).toBeUndefined();
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

  it("does NOT have a top-level `tests` array — tests are discovered from tests/*.js", () => {
    expect(config.tests).toBeUndefined();
  });
});
