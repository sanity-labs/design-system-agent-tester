import { describe, it, expect } from "vitest";
import { parseFiles, isSourceFile } from "./parse-files.js";

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

  it("returns an empty array when there are no file blocks", () => {
    const text = "Just some plain text with no file markers.";
    expect(parseFiles(text)).toEqual([]);
  });

  it("trims whitespace from file paths", () => {
    const text = [
      "---FILE:   src/Trimmed.jsx  ---",
      "content",
      "---END FILE---",
    ].join("\n");

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
    const text = [
      "```css",
      "# src/styles.css",
      "body { margin: 0; }",
      "```",
    ].join("\n");

    const result = parseFiles(text);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe("src/styles.css");
  });

  // Second fallback: ```filename.ext patterns
  it("falls back to ```filename.ext code blocks", () => {
    const text = [
      "```src/App.jsx",
      "function App() { return <div /> }",
      "```",
    ].join("\n");

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
    expect(result[0].content.trim()).toBe(
      "export default function App() { return null }",
    );
  });

  it("strips an unlabelled wrapping fence", () => {
    const text = [
      "---FILE: app.ts---",
      "```",
      "console.log('hi')",
      "```",
      "---END FILE---",
    ].join("\n");

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
