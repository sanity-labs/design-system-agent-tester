import { describe, expect, it } from "vitest";
import { deriveErrorHints } from "./error-hints.js";

describe("deriveErrorHints", () => {
  it("returns an empty array for empty or missing input", () => {
    expect(deriveErrorHints("")).toEqual([]);
    expect(deriveErrorHints(null)).toEqual([]);
    expect(deriveErrorHints(undefined)).toEqual([]);
  });

  it("hints at an invalid prop from a TS2322 Props error", () => {
    const text = "Property 'gap' does not exist on type 'IntrinsicAttributes & BoxProps<\"div\">'.";
    const hints = deriveErrorHints(text);
    expect(hints.some((h) => h.includes("`Box` has no `gap` prop"))).toBe(true);
  });

  it("hints at tsconfig edits without touching unrelated errors", () => {
    const text = "tsconfig.json(4,5): error TS5023: Unknown compiler option 'foo'.";
    const hints = deriveErrorHints(text);
    expect(hints.some((h) => h.includes("Do not modify tsconfig.json"))).toBe(true);
  });

  it("de-duplicates repeated identical hints", () => {
    const text = [
      "tsconfig.json(4,5): error TS5023: Unknown compiler option 'foo'.",
      "tsconfig.json(4,5): error TS5023: Unknown compiler option 'foo'.",
    ].join("\n");
    const hints = deriveErrorHints(text);
    const matches = hints.filter((h) => h.includes("Do not modify tsconfig.json"));
    expect(matches).toHaveLength(1);
  });
});
