import { describe, it, expect } from "vitest";
import { STATIC_PROMPT, generateAppPrompt } from "./prompt-generator.js";

describe("prompt-generator", () => {
  describe("STATIC_PROMPT", () => {
    it("is a non-empty string", () => {
      expect(typeof STATIC_PROMPT).toBe("string");
      expect(STATIC_PROMPT.length).toBeGreaterThan(0);
    });

    it("does not contain placeholder markers", () => {
      expect(STATIC_PROMPT).not.toContain("[ADD PROMPT HERE]");
      expect(STATIC_PROMPT).not.toContain("[TODO]");
      expect(STATIC_PROMPT).not.toContain("[PLACEHOLDER]");
    });
  });

  describe("generateAppPrompt", () => {
    it("is exported as a function", () => {
      expect(typeof generateAppPrompt).toBe("function");
    });
  });
});
