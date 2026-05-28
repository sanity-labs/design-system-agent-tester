import { describe, it, expect } from "vitest";
import { extractComponentImports } from "./extract-component-imports.js";

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
});
