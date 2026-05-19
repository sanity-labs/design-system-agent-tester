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

  it("does NOT have a top-level `tests` array — tests are discovered from tests/*.js", () => {
    expect(config.tests).toBeUndefined();
  });
});
