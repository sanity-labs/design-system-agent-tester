import { describe, expect, it } from "vitest";
import config, { CONFIG_PATH } from "./load.js";
import { MODES } from "./prompt-generator.js";

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

  // One generator per `--mode`. The same four keys drive both, so the shape
  // is asserted per mode rather than once — a component pool with an app
  // system prompt would satisfy a single combined check.
  describe("briefGenerators", () => {
    it("is an object", () => {
      expect(typeof config.briefGenerators).toBe("object");
      expect(config.briefGenerators).not.toBeNull();
    });

    it("covers every mode the CLI accepts", () => {
      for (const mode of MODES) {
        expect(config.briefGenerators[mode], `missing generator for --mode ${mode}`).toBeTruthy();
      }
    });

    for (const mode of MODES) {
      describe(mode, () => {
        const gen = () => config.briefGenerators[mode];

        it("has a non-empty staticBrief string", () => {
          expect(typeof gen().staticBrief).toBe("string");
          expect(gen().staticBrief.length).toBeGreaterThan(0);
        });

        it("has a non-empty systemPrompt string", () => {
          expect(typeof gen().systemPrompt).toBe("string");
          expect(gen().systemPrompt.length).toBeGreaterThan(0);
        });

        it("has a non-empty domains array", () => {
          expect(Array.isArray(gen().domains)).toBe(true);
          expect(gen().domains.length).toBeGreaterThan(0);
        });

        it("has a buildUserMessage function that uses the idea it is given", () => {
          expect(typeof gen().buildUserMessage).toBe("function");
          const msg = gen().buildUserMessage({ domain: "A-UNIQUE-IDEA", mode });
          expect(msg).toContain("A-UNIQUE-IDEA");
        });
      });
    }

    // The two pools must not be the same list. Pointing both modes at one
    // generator would make `--mode component` silently produce app briefs.
    it("gives each mode a distinct idea pool", () => {
      const [a, b] = MODES.map((m) => config.briefGenerators[m].domains);
      expect(a).not.toEqual(b);
    });
  });

  it("does NOT have a top-level `tests` array — tests are discovered from tests/*.js", () => {
    expect(config.tests).toBeUndefined();
  });
});
