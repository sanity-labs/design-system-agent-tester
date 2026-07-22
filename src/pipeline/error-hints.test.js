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

  it("hints at a hallucinated theme/provider export as a ui-poc misunderstanding", () => {
    const text = `Module '"@sanity-labs/ui-poc"' has no exported member 'ThemeProvider'.`;
    const hints = deriveErrorHints(text);
    expect(hints.some((h) => h.includes("ui-poc is CSS-driven and has no theme provider"))).toBe(
      true,
    );
  });

  it("hints at a plain hallucinated export with the verification tool", () => {
    const text = `Module '"@sanity-labs/ui-poc"' has no exported member 'Stack'.`;
    const hints = deriveErrorHints(text);
    expect(hints.some((h) => h.includes("dsds_check_exports"))).toBe(true);
  });

  // Root-caused against a real failing run
  // (output/2026-07-21/17.13/ui4-mcp/claude-haiku-4-5/iteration-1): a project
  // with no ThemeProvider and a `Badge` from @sanity/ui failed to render with
  // only this message. Reproducing it directly (headless Chrome against the
  // actual failing build) surfaced the real stack trace — `getTheme_v2` →
  // `responsiveRadiusStyle` → `<StyledBadge>` — none of which reaches the
  // model; only `err.message` is captured, not `err.stack`. Across 5 fix
  // attempts the model never connected this message to the missing provider.
  it("recognizes the getTheme_v2 signature as a missing ThemeProvider, not a component bug", () => {
    const text = "[pageerror] Cannot read properties of undefined (reading 'v2')";
    const hints = deriveErrorHints(text);
    expect(hints.some((h) => h.includes("missing ThemeProvider"))).toBe(true);
    expect(hints.some((h) => h.includes("ThemeProvider theme={buildTheme()}"))).toBe(true);
  });

  it("does not fire the getTheme_v2 hint for an unrelated 'reading' TypeError", () => {
    const text = "Cannot read properties of undefined (reading 'map')";
    const hints = deriveErrorHints(text);
    expect(hints.some((h) => h.includes("missing ThemeProvider"))).toBe(false);
  });

  it("hints at tsconfig edits without touching unrelated errors", () => {
    const text = "tsconfig.json(4,5): error TS5023: Unknown compiler option 'foo'.";
    const hints = deriveErrorHints(text);
    expect(hints.some((h) => h.includes("Do not modify tsconfig.json"))).toBe(true);
  });

  it("de-duplicates repeated identical hints", () => {
    const text = [
      "[pageerror] Cannot read properties of undefined (reading 'v2')",
      "[pageerror] Cannot read properties of undefined (reading 'v2')",
    ].join("\n");
    const hints = deriveErrorHints(text);
    const matches = hints.filter((h) => h.includes("missing ThemeProvider"));
    expect(matches).toHaveLength(1);
  });
});
