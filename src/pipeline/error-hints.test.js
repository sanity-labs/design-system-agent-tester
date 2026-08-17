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

  // Regression test: real tsc output for an OPTIONAL prop always appends
  // `| undefined` before the closing quote (e.g. 'Responsive<string> |
  // undefined'), never the bare 'Responsive<string>' the original regex
  // required. Since the vast majority of design-system props are optional,
  // this meant the hint had never fired in practice (2026-07-25) — caught
  // only by tracing a real run where the exact same single error survived
  // 5 fix attempts unchanged with no hint ever shown to the agent.
  it("hints at a number given for a CSS-string prop, including the realistic 'X | undefined' shape", () => {
    const text =
      "src/App.tsx(199,22): error TS2322: Type 'number' is not assignable to type 'Responsive<string> | undefined'.";
    const hints = deriveErrorHints(text);
    expect(hints.some((h) => h.includes("sizing/grid prop"))).toBe(true);
  });

  it("hints at a boolean prop given a string, including the realistic 'X | undefined' shape", () => {
    const text =
      "error TS2322: Type 'string' is not assignable to type 'Responsive<boolean> | undefined'.";
    const hints = deriveErrorHints(text);
    expect(hints.some((h) => h.includes("boolean prop was given a string"))).toBe(true);
  });

  it("hints at a boolean prop given a string for a bare (required, non-Responsive) boolean", () => {
    const text = "error TS2322: Type 'string' is not assignable to type 'boolean'.";
    const hints = deriveErrorHints(text);
    expect(hints.some((h) => h.includes("boolean prop was given a string"))).toBe(true);
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
