import { describe, it, expect } from "vitest";
import {
  parseFiles,
  extractComponentImports,
  extractDesignSystemComponents,
  extractSanityUIComponents,
  extractComponentUsageCounts,
  extractInlineStyles,
  isSourceFile,
  parseFeedback,
} from "./analyze.js";

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
});

// ---------------------------------------------------------------------------
// extractComponentImports
// ---------------------------------------------------------------------------

const TEST_PACKAGE_NAMES = ["@sanity/ui", "@sanity/icons"];

describe("extractComponentImports", () => {
  it("extracts component names from @sanity/ui imports", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: `import { Button, Card, Text } from '@sanity/ui'`,
      },
    ];

    const result = extractComponentImports(files, TEST_PACKAGE_NAMES);

    expect(result).toBeInstanceOf(Set);
    expect(result).toContain("Button");
    expect(result).toContain("Card");
    expect(result).toContain("Text");
    expect(result.size).toBe(3);
  });

  it("extracts named imports from any listed package (no prefix)", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: `import { AddIcon, EditIcon } from '@sanity/icons'`,
      },
    ];

    const result = extractComponentImports(files, TEST_PACKAGE_NAMES);

    expect(result).toContain("AddIcon");
    expect(result).toContain("EditIcon");
    expect(result.size).toBe(2);
  });

  it("collects imports from multiple listed packages in the same file", () => {
    const files = [
      {
        path: "src/Toolbar.jsx",
        content: [
          `import { Button, Flex } from '@sanity/ui'`,
          `import { TrashIcon } from '@sanity/icons'`,
        ].join("\n"),
      },
    ];

    const result = extractComponentImports(files, TEST_PACKAGE_NAMES);

    expect(result).toContain("Button");
    expect(result).toContain("Flex");
    expect(result).toContain("TrashIcon");
    expect(result.size).toBe(3);
  });

  it("ignores imports from packages not in the list", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: `import { Box } from '@some-other/library'`,
      },
    ];

    const result = extractComponentImports(files, TEST_PACKAGE_NAMES);
    expect(result.size).toBe(0);
  });

  it("returns an empty set when packageNames is empty", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: `import { Button } from '@sanity/ui'`,
      },
    ];
    const result = extractComponentImports(files, []);
    expect(result.size).toBe(0);
  });

  it("returns an empty set when packageNames is missing", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: `import { Button } from '@sanity/ui'`,
      },
    ];
    const result = extractComponentImports(files);
    expect(result.size).toBe(0);
  });

  it("returns a Set (deduplicates across files)", () => {
    const files = [
      {
        path: "src/A.jsx",
        content: `import { Button } from '@sanity/ui'`,
      },
      {
        path: "src/B.jsx",
        content: `import { Button, Card } from '@sanity/ui'`,
      },
    ];

    const result = extractComponentImports(files, TEST_PACKAGE_NAMES);

    expect(result.size).toBe(2);
    expect(result).toContain("Button");
    expect(result).toContain("Card");
  });

  it("ignores non-source files", () => {
    const files = [
      {
        path: "README.md",
        content: `import { Button } from '@sanity/ui'`,
      },
      {
        path: "image.png",
        content: `import { Card } from '@sanity/ui'`,
      },
    ];

    const result = extractComponentImports(files, TEST_PACKAGE_NAMES);
    expect(result.size).toBe(0);
  });

  it("handles multiple imports from the same package in one file", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: [
          `import { Button } from '@sanity/ui'`,
          `import { Dialog, Popover } from '@sanity/ui'`,
        ].join("\n"),
      },
    ];

    const result = extractComponentImports(files, TEST_PACKAGE_NAMES);

    expect(result).toContain("Button");
    expect(result).toContain("Dialog");
    expect(result).toContain("Popover");
    expect(result.size).toBe(3);
  });

  it("handles aliased imports (keeps original name)", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: `import { Button as MyButton, Card as MyCard } from '@sanity/ui'`,
      },
    ];

    const result = extractComponentImports(files, TEST_PACKAGE_NAMES);

    expect(result).toContain("Button");
    expect(result).toContain("Card");
    expect(result).not.toContain("MyButton");
    expect(result.size).toBe(2);
  });

  it("handles double-quoted import paths", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: `import { Stack } from "@sanity/ui"`,
      },
    ];

    const result = extractComponentImports(files, TEST_PACKAGE_NAMES);
    expect(result).toContain("Stack");
  });

  it("returns empty set for empty file list", () => {
    const result = extractComponentImports([], TEST_PACKAGE_NAMES);
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it("is exposed under legacy aliases for backwards compatibility", () => {
    expect(extractDesignSystemComponents).toBe(extractComponentImports);
    expect(extractSanityUIComponents).toBe(extractComponentImports);
  });
});

// ---------------------------------------------------------------------------
// extractComponentUsageCounts
// ---------------------------------------------------------------------------
describe("extractComponentUsageCounts", () => {
  it("counts PascalCase JSX tag usage", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: [
          "<Button>Click</Button>",
          "<Card>",
          "  <Text>Hello</Text>",
          "</Card>",
        ].join("\n"),
      },
    ];

    const result = extractComponentUsageCounts(files);

    expect(result.total).toBe(3);
    expect(result.byComponent.Button).toBe(1);
    expect(result.byComponent.Card).toBe(1);
    expect(result.byComponent.Text).toBe(1);
  });

  it("counts multiple usages of the same component", () => {
    const files = [
      {
        path: "src/List.tsx",
        content: [
          "<Stack>",
          "  <Button>One</Button>",
          "  <Button>Two</Button>",
          "  <Button>Three</Button>",
          "</Stack>",
        ].join("\n"),
      },
    ];

    const result = extractComponentUsageCounts(files);

    expect(result.total).toBe(4);
    expect(result.byComponent.Button).toBe(3);
    expect(result.byComponent.Stack).toBe(1);
  });

  it("provides perFile breakdown", () => {
    const files = [
      {
        path: "src/A.jsx",
        content: "<Button /><Card />",
      },
      {
        path: "src/B.tsx",
        content: "<Dialog /><Dialog /><Text />",
      },
    ];

    const result = extractComponentUsageCounts(files);

    expect(result.total).toBe(5);
    expect(result.perFile).toHaveLength(2);

    const fileA = result.perFile.find((f) => f.path === "src/A.jsx");
    expect(fileA.total).toBe(2);
    expect(fileA.byComponent.Button).toBe(1);
    expect(fileA.byComponent.Card).toBe(1);

    const fileB = result.perFile.find((f) => f.path === "src/B.tsx");
    expect(fileB.total).toBe(3);
    expect(fileB.byComponent.Dialog).toBe(2);
    expect(fileB.byComponent.Text).toBe(1);
  });

  it("skips non-JSX files (css, json, html)", () => {
    const files = [
      {
        path: "src/styles.css",
        content: ".Button { color: red; }",
      },
      {
        path: "src/data.json",
        content: '{"Button": true}',
      },
      {
        path: "src/index.html",
        content: "<Button />",
      },
    ];

    const result = extractComponentUsageCounts(files);

    expect(result.total).toBe(0);
    expect(result.perFile).toHaveLength(0);
  });

  it("does not count lowercase HTML tags", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: "<div><span>text</span><p>paragraph</p></div>",
      },
    ];

    const result = extractComponentUsageCounts(files);
    expect(result.total).toBe(0);
  });

  it("handles dotted component names like Component.Sub", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: "<Menu.Item>option</Menu.Item>",
      },
    ];

    const result = extractComponentUsageCounts(files);

    expect(result.total).toBe(1);
    expect(result.byComponent["Menu.Item"]).toBe(1);
  });

  it("returns zeroed result for empty file list", () => {
    const result = extractComponentUsageCounts([]);

    expect(result.total).toBe(0);
    expect(result.byComponent).toEqual({});
    expect(result.perFile).toEqual([]);
  });

  it("excludes files with no component tags from perFile", () => {
    const files = [
      {
        path: "src/empty.jsx",
        content: "const x = 1;",
      },
    ];

    const result = extractComponentUsageCounts(files);
    expect(result.perFile).toHaveLength(0);
  });

  it("aggregates counts across multiple files in byComponent", () => {
    const files = [
      { path: "src/A.jsx", content: "<Button />" },
      { path: "src/B.jsx", content: "<Button /><Button />" },
    ];

    const result = extractComponentUsageCounts(files);

    expect(result.total).toBe(3);
    expect(result.byComponent.Button).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// extractInlineStyles
// ---------------------------------------------------------------------------
describe("extractInlineStyles", () => {
  it("counts style={{ occurrences and identifies parent component", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: `<div style={{ color: 'red' }}></div>`,
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.total).toBe(1);
    expect(result.byComponent.div).toBe(1);
  });

  it("identifies PascalCase parent components", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: `<Card style={{ padding: '10px' }}>content</Card>`,
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.total).toBe(1);
    expect(result.byComponent.Card).toBe(1);
  });

  it("extracts CSS property names from style objects", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: `<div style={{ fontSize: '16px', backgroundColor: 'blue', margin: 0 }}></div>`,
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.byProperty.fontSize).toBe(1);
    expect(result.byProperty.backgroundColor).toBe(1);
    expect(result.byProperty.margin).toBe(1);
  });

  it("counts multiple inline styles in the same file", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: [
          `<Button style={{ color: 'red' }}>Click</Button>`,
          `<Text style={{ fontWeight: 'bold' }}>Hello</Text>`,
          `<Card style={{ padding: 8 }}>Content</Card>`,
        ].join("\n"),
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.total).toBe(3);
    expect(result.byComponent.Button).toBe(1);
    expect(result.byComponent.Text).toBe(1);
    expect(result.byComponent.Card).toBe(1);
  });

  it("provides perFile breakdown", () => {
    const files = [
      {
        path: "src/A.jsx",
        content: `<div style={{ width: '100%' }}></div>`,
      },
      {
        path: "src/B.tsx",
        content: [
          `<Box style={{ flex: 1 }} />`,
          `<Box style={{ flex: 2 }} />`,
        ].join("\n"),
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.total).toBe(3);
    expect(result.perFile).toHaveLength(2);

    const fileA = result.perFile.find((f) => f.path === "src/A.jsx");
    expect(fileA.total).toBe(1);

    const fileB = result.perFile.find((f) => f.path === "src/B.tsx");
    expect(fileB.total).toBe(2);
    expect(fileB.byComponent.Box).toBe(2);
  });

  it("skips non-JSX files", () => {
    const files = [
      {
        path: "src/styles.css",
        content: `.foo { style={{ color: 'red' }} }`,
      },
    ];

    const result = extractInlineStyles(files);
    expect(result.total).toBe(0);
  });

  it("returns zeroed result when no inline styles exist", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: "<Button className='primary'>Click</Button>",
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.total).toBe(0);
    expect(result.byComponent).toEqual({});
    expect(result.byProperty).toEqual({});
    expect(result.perFile).toEqual([]);
  });

  it("returns zeroed result for empty file list", () => {
    const result = extractInlineStyles([]);

    expect(result.total).toBe(0);
    expect(result.byComponent).toEqual({});
    expect(result.byProperty).toEqual({});
    expect(result.perFile).toEqual([]);
  });

  it("aggregates property counts across multiple files", () => {
    const files = [
      {
        path: "src/A.jsx",
        content: `<div style={{ color: 'red' }}></div>`,
      },
      {
        path: "src/B.jsx",
        content: `<span style={{ color: 'blue', fontSize: '14px' }}></span>`,
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.byProperty.color).toBe(2);
    expect(result.byProperty.fontSize).toBe(1);
  });

  it("handles style with extra whitespace", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: `<div style = { { color: 'red' } }></div>`,
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.total).toBe(1);
    expect(result.byComponent.div).toBe(1);
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
// parseFeedback
// ---------------------------------------------------------------------------
describe("parseFeedback", () => {
  it("parses a structured ---FEEDBACK--- block", () => {
    const text = [
      "---FEEDBACK---",
      "- [components] Button API is confusing",
      "- [theming] Theme tokens are hard to discover",
      "---END FEEDBACK---",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      category: "components",
      text: "Button API is confusing",
    });
    expect(result[1]).toEqual({
      category: "theming",
      text: "Theme tokens are hard to discover",
    });
  });

  it("extracts category and text from each line", () => {
    const text = [
      "---FEEDBACK---",
      "- [documentation] Missing examples for Card component",
      "- [api] Unclear prop types on Dialog",
      "- [icons] Icon names inconsistent with docs",
      "---END FEEDBACK---",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(3);
    expect(result[0].category).toBe("documentation");
    expect(result[1].category).toBe("api");
    expect(result[2].category).toBe("icons");
    expect(result[0].text).toBe("Missing examples for Card component");
  });

  it("maps unknown categories to 'other'", () => {
    const text = [
      "---FEEDBACK---",
      "- [performance] Slow rendering",
      "- [other] General comment",
      "---END FEEDBACK---",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result[0].category).toBe("other"); // "performance" is not in VALID_CATEGORIES
    expect(result[1].category).toBe("other");
  });

  it("returns empty array when no feedback block exists", () => {
    const text = "Just some regular text, no feedback here.";
    expect(parseFeedback(text)).toEqual([]);
  });

  it("handles multiple ---FEEDBACK--- blocks", () => {
    const text = [
      "---FEEDBACK---",
      "- [api] First feedback",
      "---END FEEDBACK---",
      "",
      "Some text in between.",
      "",
      "---FEEDBACK---",
      "- [dx] Second feedback",
      "---END FEEDBACK---",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("First feedback");
    expect(result[1].text).toBe("Second feedback");
  });

  it("ignores lines that don't match the expected bullet format", () => {
    const text = [
      "---FEEDBACK---",
      "- [components] Valid feedback",
      "This is just a random line",
      "  Another random line",
      "- [api] Another valid one",
      "---END FEEDBACK---",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("Valid feedback");
    expect(result[1].text).toBe("Another valid one");
  });

  it("handles the dx category", () => {
    const text = [
      "---FEEDBACK---",
      "- [dx] Developer experience could be improved",
      "---END FEEDBACK---",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("dx");
  });

  // Fallback: markdown-style feedback sections
  it("falls back to markdown Feedback heading when no structured block", () => {
    const text = [
      "## Feedback",
      "- The component API was straightforward",
      "- **Documentation** Missing examples for theming",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result.length).toBeGreaterThan(0);
  });

  it("fallback infers category from bold prefix and content keywords", () => {
    const text = [
      "## Feedback",
      "- **Documentation**: Needs more examples",
      "- **API**: The component props are unclear",
      "- **Theming**: Styling tokens are hard to find",
      "- **Icons**: Icon naming is inconsistent",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(4);

    const docFeedback = result.find((f) => f.category === "documentation");
    expect(docFeedback).toBeDefined();

    const apiFeedback = result.find((f) => f.category === "api");
    expect(apiFeedback).toBeDefined();

    const themeFeedback = result.find((f) => f.category === "theming");
    expect(themeFeedback).toBeDefined();

    const iconFeedback = result.find((f) => f.category === "icons");
    expect(iconFeedback).toBeDefined();
  });

  it("fallback recognizes 'Areas of Friction' heading", () => {
    const text = [
      "### Areas of Friction",
      "- Some friction with the documentation",
      "- The API design was confusing",
    ].join("\n");

    const result = parseFeedback(text);
    expect(result.length).toBeGreaterThan(0);
  });

  it("does not use fallback when structured block exists", () => {
    const text = [
      "---FEEDBACK---",
      "- [api] Structured feedback only",
      "---END FEEDBACK---",
      "",
      "## Feedback",
      "- This fallback bullet should be ignored",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Structured feedback only");
  });

  it("handles category case-insensitivity", () => {
    const text = [
      "---FEEDBACK---",
      "- [COMPONENTS] Uppercase category",
      "- [Api] Mixed case category",
      "---END FEEDBACK---",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(2);
    expect(result[0].category).toBe("components");
    expect(result[1].category).toBe("api");
  });
});
