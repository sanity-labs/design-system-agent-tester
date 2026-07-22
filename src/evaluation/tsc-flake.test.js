import { describe, expect, it } from "vitest";
import {
  extractMissingExports,
  hasConfigFallbackSignature,
  isTsconfigScaffoldError,
  memberInTypes,
  parseTsconfig,
} from "./tsc-flake.js";

describe("parseTsconfig", () => {
  it("parses plain JSON", () => {
    expect(parseTsconfig('{"compilerOptions":{"jsx":"react-jsx"}}')).toEqual({
      compilerOptions: { jsx: "react-jsx" },
    });
  });

  it("tolerates JSONC comments and trailing commas", () => {
    const raw = `{
      // project config
      "compilerOptions": {
        /* jsx runtime */
        "jsx": "react-jsx",
      },
    }`;
    expect(parseTsconfig(raw)?.compilerOptions?.jsx).toBe("react-jsx");
  });

  it("returns null for unreadable input", () => {
    expect(parseTsconfig("{nope")).toBeNull();
    expect(parseTsconfig("")).toBeNull();
    expect(parseTsconfig(undefined)).toBeNull();
  });
});

describe("hasConfigFallbackSignature", () => {
  it("detects TS17004 and TS6142", () => {
    expect(
      hasConfigFallbackSignature(
        "src/App.tsx(1,1): error TS17004: Cannot use JSX unless the '--jsx' flag is provided.",
      ),
    ).toBe(true);
    expect(
      hasConfigFallbackSignature(
        "error TS6142: Module './x' was resolved to 'x.tsx', but '--jsx' is not set.",
      ),
    ).toBe(true);
  });

  it("ignores ordinary type errors", () => {
    expect(hasConfigFallbackSignature("error TS2322: Type 'string' is not assignable")).toBe(false);
  });
});

describe("extractMissingExports", () => {
  it("extracts TS2305 and TS2724 forms, packages only", () => {
    const text = [
      `src/a.tsx(2,10): error TS2305: Module '"@sanity/icons"' has no exported member 'AddIcon'.`,
      `src/b.tsx(3,10): error TS2724: '"@sanity/icons"' has no exported member named 'CloseIcon'. Did you mean 'Close'?`,
      `src/c.tsx(4,10): error TS2305: Module '"./data"' has no exported member 'rows'.`,
    ].join("\n");
    expect(extractMissingExports(text)).toEqual([
      { module: "@sanity/icons", member: "AddIcon" },
      { module: "@sanity/icons", member: "CloseIcon" },
    ]);
  });
});

describe("isTsconfigScaffoldError", () => {
  it("detects tsconfig/project-reference scaffold codes", () => {
    expect(
      isTsconfigScaffoldError(
        "tsconfig.json(4,5): error TS5023: Unknown compiler option 'useDefineForModules'.",
      ),
    ).toBe(true);
    expect(
      isTsconfigScaffoldError(
        "tsconfig.json(17,18): error TS6053: File 'tsconfig.app.json' not found.",
      ),
    ).toBe(true);
    expect(
      isTsconfigScaffoldError(
        "error TS6305: Output file 'dist/App.d.ts' has not been built from source file 'src/App.tsx'.",
      ),
    ).toBe(true);
    expect(
      isTsconfigScaffoldError(
        `tsconfig.json(17,18): error TS6306: Referenced project 'tsconfig.app.json' must have setting "composite": true.`,
      ),
    ).toBe(true);
  });

  it("ignores ordinary type errors and missing/empty input", () => {
    expect(isTsconfigScaffoldError("error TS2322: Type 'string' is not assignable")).toBe(false);
    expect(isTsconfigScaffoldError("")).toBe(false);
    expect(isTsconfigScaffoldError(undefined)).toBe(false);
  });
});

describe("memberInTypes", () => {
  it("finds whole-word members only", () => {
    const dts = "export declare const AddIcon: Icon;\nexport declare const AddCircleIcon: Icon;";
    expect(memberInTypes(dts, "AddIcon")).toBe(true);
    expect(memberInTypes(dts, "CloseIcon")).toBe(false);
    expect(memberInTypes("const NotAddIconX = 1;", "AddIcon")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Security: parseTsconfig caps the lenient comment-strip path
// ---------------------------------------------------------------------------
describe("parseTsconfig resists quadratic comment-strip", () => {
  it("returns promptly (null) on an oversized /* flood", () => {
    const flood = "/*".repeat(300_000); // ~600KB, invalid JSON → lenient path
    const start = process.hrtime.bigint();
    const r = parseTsconfig(flood);
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    expect(r).toBeNull();
    expect(ms).toBeLessThan(1000);
  });

  it("still parses a normal JSONC tsconfig with comments", () => {
    const r = parseTsconfig('{\n  // comment\n  "compilerOptions": { "jsx": "react" },\n}');
    expect(r?.compilerOptions?.jsx).toBe("react");
  });
});
