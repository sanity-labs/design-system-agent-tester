import { describe, it, expect } from "vitest";
import config from "./design-system.js";

describe("design-system config", () => {
  it("has a `name` string", () => {
    expect(typeof config.name).toBe("string");
    expect(config.name.length).toBeGreaterThan(0);
  });

  describe("packages.designSystem", () => {
    it("has a `name` string", () => {
      expect(typeof config.packages.designSystem.name).toBe("string");
      expect(config.packages.designSystem.name.length).toBeGreaterThan(0);
    });

    it("has a non-empty `components` array", () => {
      expect(Array.isArray(config.packages.designSystem.components)).toBe(true);
      expect(config.packages.designSystem.components.length).toBeGreaterThan(0);
    });

    it("has a `cssImport` string", () => {
      expect(typeof config.packages.designSystem.cssImport).toBe("string");
      expect(config.packages.designSystem.cssImport.length).toBeGreaterThan(0);
    });

    it("has all component names in PascalCase", () => {
      const pascalCaseRe = /^[A-Z][a-zA-Z0-9]*$/;
      for (const name of config.packages.designSystem.components) {
        expect(name).toMatch(pascalCaseRe);
      }
    });
  });

  describe("packages.legacy", () => {
    it("has a `name` string", () => {
      expect(typeof config.packages.legacy.name).toBe("string");
      expect(config.packages.legacy.name.length).toBeGreaterThan(0);
    });
  });

  describe("packages.icons", () => {
    it("has a `name` string", () => {
      expect(typeof config.packages.icons.name).toBe("string");
      expect(config.packages.icons.name.length).toBeGreaterThan(0);
    });
  });

  describe("enforcedDeps", () => {
    it("is an object with at least one entry", () => {
      expect(typeof config.enforcedDeps).toBe("object");
      expect(config.enforcedDeps).not.toBeNull();
      expect(Object.keys(config.enforcedDeps).length).toBeGreaterThan(0);
    });
  });

  describe("reactVersion", () => {
    it("is a string or null", () => {
      const valid =
        typeof config.reactVersion === "string" || config.reactVersion === null;
      expect(valid).toBe(true);
    });
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

  describe("promptTrigger", () => {
    it("is a non-empty string", () => {
      expect(typeof config.promptTrigger).toBe("string");
      expect(config.promptTrigger.length).toBeGreaterThan(0);
    });
  });
});
