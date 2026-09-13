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

  // Regression (2026-09-03): this hint used to say the OPPOSITE — "Do not
  // modify tsconfig.json … they are pre-configured and valid. Only edit
  // files under `src/`" — and fired on any text containing "tsconfig.json".
  // In this harness the agent authors tsconfig.json itself, so that made
  // every compiler-config error unwinnable: the fix requires editing the one
  // file the hint forbade touching. These tests assert the hint now points
  // AT the file that needs the edit, and that it never resurfaces the old
  // wording.
  const CONFIG_ERROR_CODES = [
    ["TS5023", "tsconfig.json(4,5): error TS5023: Unknown compiler option 'foo'."],
    [
      "TS5070",
      "tsconfig.json(10,5): error TS5070: Option '--resolveJsonModule' cannot be specified when 'moduleResolution' is set to 'classic'.",
    ],
    ["TS6053", "error TS6053: File 'tsconfig.node.json' not found."],
    [
      "TS6305",
      "error TS6305: Output file 'src/App.d.ts' has not been built from source file 'src/App.tsx'.",
    ],
    ["TS6306", "tsconfig.json(5,5): error TS6306: Referenced project must have setting composite."],
    ["TS6310", "tsconfig.json(3,3): error TS6310: Referenced project may not disable emit."],
  ];

  it.each(CONFIG_ERROR_CODES)(
    "tells the model to fix its own tsconfig for %s",
    (_code, text) => {
      const hints = deriveErrorHints(text);
      expect(hints.some((h) => h.includes("compiler-configuration error"))).toBe(true);
      // The inverted, unwinnable instruction must never come back.
      expect(hints.some((h) => h.includes("Do not modify tsconfig"))).toBe(false);
    },
  );

  it("names the moduleResolution fix, since omitting it is what defaults to classic", () => {
    const text =
      "tsconfig.json(10,5): error TS5070: Option '--resolveJsonModule' cannot be specified when 'moduleResolution' is set to 'classic'.";
    const hint = deriveErrorHints(text).find((h) => h.includes("compiler-configuration error"));
    expect(hint).toContain("bundler");
  });

  it("still warns against weakening type checking to silence app-code errors", () => {
    const text = "tsconfig.json(4,5): error TS5023: Unknown compiler option 'foo'.";
    const hint = deriveErrorHints(text).find((h) => h.includes("compiler-configuration error"));
    expect(hint).toContain("strict: false");
  });

  it("does not fire the config hint for ordinary app-code type errors", () => {
    const text = "src/App.tsx(10,5): error TS2322: Type 'number' is not assignable to type 'string'.";
    const hints = deriveErrorHints(text);
    expect(hints.some((h) => h.includes("compiler-configuration error"))).toBe(false);
  });

  it("does not fire the config hint merely because a path mentions tsconfig.json", () => {
    // The old implementation keyed off the filename appearing anywhere, so a
    // stack trace or file list was enough to trigger it.
    const text = "Failed to load config from /project/tsconfig.json.bak — unrelated read error";
    const hints = deriveErrorHints(text);
    expect(hints.some((h) => h.includes("compiler-configuration error"))).toBe(false);
  });

  it("hints at a missing devDependency behind a 'Cannot find module' crash", () => {
    const text =
      "Dev server exited with code 1 before becoming ready. failed to load config from " +
      "/project/vite.config.ts\nerror when starting dev server:\n" +
      "Error: Cannot find module '@vitejs/plugin-react'\nRequire stack:\n- /project/vite.config.ts";
    const hints = deriveErrorHints(text);
    expect(hints.some((h) => h.includes("@vitejs/plugin-react") && h.includes("package.json"))).toBe(
      true,
    );
  });

  it("names every missing module when more than one is reported", () => {
    const text =
      "Cannot find module 'left-pad'\nCannot find module '@vitejs/plugin-react'";
    const hints = deriveErrorHints(text);
    const hint = hints.find((h) => h.includes("package.json"));
    expect(hint).toContain("left-pad");
    expect(hint).toContain("@vitejs/plugin-react");
  });

  it("de-duplicates repeated identical hints", () => {
    const text = [
      "tsconfig.json(4,5): error TS5023: Unknown compiler option 'foo'.",
      "tsconfig.json(4,5): error TS5023: Unknown compiler option 'foo'.",
    ].join("\n");
    const hints = deriveErrorHints(text);
    const matches = hints.filter((h) => h.includes("compiler-configuration error"));
    expect(matches).toHaveLength(1);
  });
});
