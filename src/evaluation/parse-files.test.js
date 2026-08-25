import { describe, expect, it, vi } from "vitest";
import { isSafeRelativePath, isSourceFile, parseFiles } from "./parse-files.js";

// ---------------------------------------------------------------------------
// parseFiles
// ---------------------------------------------------------------------------
describe("parseFiles", () => {
  it("parses a single ---FILE--- block", () => {
    const text = [
      "---FILE: src/App.jsx---",
      "export default function App() { return <div /> }",
      "---END FILE---",
    ].join("\n");

    const result = parseFiles(text);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/App.jsx");
    expect(result[0].content).toContain("export default function App()");
  });

  it("parses multiple ---FILE--- blocks", () => {
    const text = [
      "---FILE: src/App.jsx---",
      "function App() {}",
      "---END FILE---",
      "",
      "---FILE: src/index.js---",
      "import App from './App'",
      "---END FILE---",
      "",
      "---FILE: src/utils/helpers.ts---",
      "export const add = (a, b) => a + b;",
      "---END FILE---",
    ].join("\n");

    const result = parseFiles(text);

    expect(result).toHaveLength(3);
    expect(result[0].path).toBe("src/App.jsx");
    expect(result[1].path).toBe("src/index.js");
    expect(result[2].path).toBe("src/utils/helpers.ts");
  });

  it("tolerates a header missing its trailing --- (observed with qwen2.5-coder:14b)", () => {
    const text = [
      "---FILE: package.json",
      '{ "name": "app" }',
      "---END FILE---",
      "",
      "---FILE: src/main.tsx",
      "console.log('hi')",
      "---END FILE---",
    ].join("\n");

    const result = parseFiles(text);

    expect(result).toHaveLength(2);
    expect(result[0].path).toBe("package.json");
    expect(result[0].content).toContain('"name": "app"');
    expect(result[1].path).toBe("src/main.tsx");
    expect(result[1].content).toContain("console.log");
  });

  it("does not let a missing trailing --- on the header swallow the file's own content", () => {
    // Regression guard for the bug the tolerant header fix also happened to
    // close: searching forward for the next literal "---\n" (instead of
    // stopping at the header line's own newline) could walk straight past
    // a missing "---" into the file body and match one embedded in it.
    const text = [
      "---FILE: src/App.tsx",
      "const x = 'a---b';",
      "---END FILE---",
    ].join("\n");

    const result = parseFiles(text);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/App.tsx");
    expect(result[0].content.trim()).toBe("const x = 'a---b';");
  });

  it("returns an empty array when there are no file blocks", () => {
    const text = "Just some plain text with no file markers.";
    expect(parseFiles(text)).toEqual([]);
  });

  it("drops files whose paths escape the project directory", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const text = [
      "---FILE: ../../outside.txt---",
      "escaped",
      "---END FILE---",
      "",
      "---FILE: /etc/passwd---",
      "absolute",
      "---END FILE---",
      "",
      "---FILE: src/App.jsx---",
      "function App() {}",
      "---END FILE---",
    ].join("\n");

    const result = parseFiles(text);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/App.jsx");
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("keeps paths whose `..` segments stay inside the project", () => {
    const text = ["---FILE: src/../App.jsx---", "function App() {}", "---END FILE---"].join("\n");

    expect(parseFiles(text)).toHaveLength(1);
  });

  it("trims whitespace from file paths", () => {
    const text = ["---FILE:   src/Trimmed.jsx  ---", "content", "---END FILE---"].join("\n");

    const result = parseFiles(text);
    expect(result[0].path).toBe("src/Trimmed.jsx");
  });

  it("preserves multi-line file content exactly", () => {
    const content = [
      "import React from 'react';",
      "",
      "export default function Comp() {",
      "  return (",
      "    <div>",
      "      <span>Hello</span>",
      "    </div>",
      "  );",
      "}",
    ].join("\n");

    const text = `---FILE: src/Comp.jsx---\n${content}\n---END FILE---`;
    const result = parseFiles(text);

    expect(result).toHaveLength(1);
    expect(result[0].content).toContain("import React from 'react';");
    expect(result[0].content).toContain("<span>Hello</span>");
  });

  // Fallback: fenced code blocks with // file: comment
  it("falls back to fenced code blocks with // file: comment", () => {
    const text = [
      "```jsx",
      "// file: src/App.jsx",
      "function App() { return <div /> }",
      "```",
    ].join("\n");

    const result = parseFiles(text);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/App.jsx");
    expect(result[0].content).toContain("function App()");
  });

  it("falls back to fenced code blocks with # file: comment", () => {
    const text = ["```css", "# src/styles.css", "body { margin: 0; }", "```"].join("\n");

    const result = parseFiles(text);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/styles.css");
  });

  // Second fallback: ```filename.ext patterns
  it("falls back to ```filename.ext code blocks", () => {
    const text = ["```src/App.jsx", "function App() { return <div /> }", "```"].join("\n");

    const result = parseFiles(text);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/App.jsx");
  });

  it("second fallback filters out language-only labels without dots or slashes", () => {
    // "javascript" has no dot or slash — should NOT be parsed as a file path
    const text = ["```javascript", "const x = 1;", "```"].join("\n");

    const result = parseFiles(text);
    expect(result).toEqual([]);
  });

  it("does not use fallback when ---FILE--- blocks exist", () => {
    const text = [
      "---FILE: src/Main.jsx---",
      "main content",
      "---END FILE---",
      "",
      "```src/Extra.jsx",
      "extra content",
      "```",
    ].join("\n");

    const result = parseFiles(text);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/Main.jsx");
  });

  // ─── Wrapping-fence stripping ──────────────────────────────────────
  //
  // Some agents emit file contents inside a ```lang fence inside the
  // FILE block. The parser strips a fence that wraps the whole body,
  // but leaves intentional inner fences (e.g. fenced code examples in
  // a README) alone.

  it("strips a wrapping ```json fence from package.json", () => {
    const text = [
      "---FILE: package.json---",
      "```json",
      "{",
      '  "name": "demo"',
      "}",
      "```",
      "---END FILE---",
    ].join("\n");

    const result = parseFiles(text);
    expect(result).toHaveLength(1);
    expect(result[0].content.trimEnd()).toBe('{\n  "name": "demo"\n}');
    expect(result[0].content.startsWith("```")).toBe(false);
  });

  it("strips a wrapping ```tsx fence with surrounding blank lines", () => {
    const text =
      "---FILE: src/App.tsx---\n" +
      "\n" +
      "```tsx\n" +
      "export default function App() { return null }\n" +
      "```\n" +
      "\n" +
      "---END FILE---";

    const result = parseFiles(text);
    expect(result[0].content.trim()).toBe("export default function App() { return null }");
  });

  it("strips an unlabelled wrapping fence", () => {
    const text = ["---FILE: app.ts---", "```", "console.log('hi')", "```", "---END FILE---"].join(
      "\n",
    );

    const result = parseFiles(text);
    expect(result[0].content.trim()).toBe("console.log('hi')");
  });

  it("preserves inner fences that aren't wrapping the whole body", () => {
    // First non-empty line is regular markdown, NOT a fence — leave alone.
    const text = [
      "---FILE: README.md---",
      "# Title",
      "",
      "Example:",
      "",
      "```js",
      "const x = 1;",
      "```",
      "",
      "Done.",
      "---END FILE---",
    ].join("\n");

    const result = parseFiles(text);
    expect(result[0].content).toContain("# Title");
    expect(result[0].content).toContain("```js");
    expect(result[0].content).toContain("```\n\nDone.");
  });

  // ─── Missing ---END FILE--- recovery ────────────────────────────────
  //
  // Fix-loop replies occasionally omit the closing marker on the final
  // (often only) file block despite the system prompt showing the format.
  // Discarding the whole reply in that case burns a fix attempt for
  // nothing — the model's correction never reaches disk and the same
  // error repeats next attempt. Recover the trailing content instead.

  it("recovers a single ---FILE--- block missing its closing marker", () => {
    const text = [
      "---FILE: src/chunks/InspectorPanel.tsx---",
      "export function InspectorPanel() { return null }",
    ].join("\n");

    const result = parseFiles(text);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/chunks/InspectorPanel.tsx");
    expect(result[0].content).toContain("export function InspectorPanel()");
  });

  it("recovers a trailing unterminated block after earlier properly-closed blocks", () => {
    const text = [
      "---FILE: src/App.tsx---",
      "properly closed content",
      "---END FILE---",
      "",
      "---FILE: src/Trailing.tsx---",
      "unterminated content",
    ].join("\n");

    const result = parseFiles(text);

    expect(result).toHaveLength(2);
    expect(result[0].path).toBe("src/App.tsx");
    expect(result[1].path).toBe("src/Trailing.tsx");
    expect(result[1].content).toContain("unterminated content");
  });

  it("does not guess when an unterminated block is followed by another ---FILE--- header", () => {
    // Ambiguous: no way to know where the first file's content ends and
    // the second file's header begins. Bail out on the unterminated one
    // rather than swallow the next header as part of its content. Neither
    // block has a closing marker here — if the second one did, the nearest
    // ---END FILE--- would (pre-existing, unrelated behavior) just get
    // matched to the first header instead, which isn't what this test is
    // isolating.
    const text = [
      "---FILE: src/First.tsx---",
      "first content, never closed",
      "---FILE: src/Second.tsx---",
      "second content, also never closed",
    ].join("\n");

    const result = parseFiles(text);

    expect(result).toHaveLength(0);
  });

  it("strips a wrapping fence from a recovered unterminated block", () => {
    const text = ["---FILE: src/App.tsx---", "```tsx", "export default 1;", "```"].join("\n");

    const result = parseFiles(text);
    expect(result[0].content.trim()).toBe("export default 1;");
  });

  it("leaves content untouched when the body opens with a fence but doesn't close with one", () => {
    // An asymmetric fence isn't a wrapping fence — don't strip.
    const text = [
      "---FILE: notes.md---",
      "```",
      "this is not closed properly",
      "more lines",
      "---END FILE---",
    ].join("\n");

    const result = parseFiles(text);
    expect(result[0].content).toContain("```");
  });
});

// ---------------------------------------------------------------------------
// isSourceFile
// ---------------------------------------------------------------------------
describe("isSourceFile", () => {
  it.each([
    ["src/App.js", true],
    ["src/App.jsx", true],
    ["src/App.ts", true],
    ["src/App.tsx", true],
    ["src/styles.css", true],
    ["src/index.html", true],
    ["src/data.json", true],
  ])("returns true for source file %s", (filePath, expected) => {
    expect(isSourceFile(filePath)).toBe(expected);
  });

  it.each([
    ["README.md", false],
    ["image.png", false],
    ["photo.jpg", false],
    ["archive.zip", false],
    ["document.pdf", false],
    ["data.yaml", false],
    ["config.toml", false],
    ["binary.wasm", false],
  ])("returns false for non-source file %s", (filePath, expected) => {
    expect(isSourceFile(filePath)).toBe(expected);
  });

  it("is case-insensitive for extensions", () => {
    expect(isSourceFile("src/App.JSX")).toBe(true);
    expect(isSourceFile("src/App.Tsx")).toBe(true);
    expect(isSourceFile("src/styles.CSS")).toBe(true);
  });

  it("handles deeply nested paths", () => {
    expect(isSourceFile("src/components/ui/buttons/Primary.tsx")).toBe(true);
    expect(isSourceFile("docs/images/screenshot.png")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isSafeRelativePath
// ---------------------------------------------------------------------------
describe("isSafeRelativePath", () => {
  it.each([
    ["src/App.jsx", true],
    ["package.json", true],
    ["src/components/deep/Nested.tsx", true],
    ["src/../App.jsx", true],
    ["../escape.txt", false],
    ["../../etc/passwd", false],
    ["src/../../escape.txt", false],
    ["/etc/passwd", false],
    ["..", false],
    ["C:\\Windows\\system32\\evil.dll", false],
    ["C:/Windows/evil.dll", false],
    ["\\\\server\\share\\evil.txt", false],
    ["", false],
    ["   ", false],
  ])("%s -> %s", (filePath, expected) => {
    expect(isSafeRelativePath(filePath)).toBe(expected);
  });

  it("rejects non-string input", () => {
    expect(isSafeRelativePath(null)).toBe(false);
    expect(isSafeRelativePath(undefined)).toBe(false);
    expect(isSafeRelativePath(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Security: linear-time parsing of adversarial output (no ReDoS / quadratic)
// ---------------------------------------------------------------------------
describe("parseFiles resists algorithmic-complexity attacks", () => {
  it("handles tens of thousands of unterminated ---FILE: markers in linear time", () => {
    const text = "---FILE: a---\n".repeat(80_000); // no ---END FILE---
    const start = process.hrtime.bigint();
    const files = parseFiles(text);
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    // No complete blocks → no files; must not hang (old regex was ~8s here).
    expect(files).toEqual([]);
    expect(ms).toBeLessThan(1000);
  });

  it("handles a code fence followed by a long whitespace run in linear time", () => {
    const text = "```\n" + " ".repeat(400_000); // fenced fallback, no comment marker
    const start = process.hrtime.bigint();
    parseFiles(text);
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    expect(ms).toBeLessThan(1000);
  });

  it("caps oversized input before scanning", () => {
    // A valid block sitting past the cap must not be parsed; a huge input
    // must still return promptly.
    const filler = "x".repeat(3_000_000);
    const start = process.hrtime.bigint();
    const files = parseFiles(filler + "---FILE: late.tsx---\nhi\n---END FILE---");
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    expect(files).toEqual([]); // block was beyond MAX_PARSE_BYTES
    expect(ms).toBeLessThan(1000);
  });

  it("still parses normal ---FILE: blocks unchanged", () => {
    const files = parseFiles("---FILE: src/App.tsx---\nexport default 1;\n---END FILE---");
    expect(files).toEqual([{ path: "src/App.tsx", content: "export default 1;\n" }]);
  });
});

// ---------------------------------------------------------------------------
// Security: refuse node_modules paths (symlink-escape vector)
// ---------------------------------------------------------------------------
describe("isSafeRelativePath rejects node_modules segments", () => {
  it("rejects any path containing a node_modules segment", () => {
    expect(isSafeRelativePath("node_modules/esc/.env")).toBe(false);
    expect(isSafeRelativePath("node_modules/pkg/index.js")).toBe(false);
    expect(isSafeRelativePath("src/x/node_modules/y.js")).toBe(false);
    expect(isSafeRelativePath("node_modules")).toBe(false);
  });

  it("still accepts ordinary project paths", () => {
    expect(isSafeRelativePath("src/App.tsx")).toBe(true);
    expect(isSafeRelativePath("package.json")).toBe(true);
    // A filename that merely contains the substring is fine (not a segment).
    expect(isSafeRelativePath("src/node_modules_helper.ts")).toBe(true);
  });

  it("parseFiles drops node_modules blocks and keeps the rest", () => {
    const files = parseFiles(
      "---FILE: node_modules/esc/shared.js---\nx\n---END FILE---\n" +
        "---FILE: src/A.tsx---\ny\n---END FILE---",
    );
    expect(files.map((f) => f.path)).toEqual(["src/A.tsx"]);
  });
});
