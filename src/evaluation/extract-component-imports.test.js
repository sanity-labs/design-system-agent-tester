import { describe, expect, it } from "vitest";
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

// ---------------------------------------------------------------------------
// Security: linear-time scan of adversarial import content (no quadratic blowup)
// ---------------------------------------------------------------------------
describe("extractComponentImports resists algorithmic-complexity attacks", () => {
  it("returns promptly on a multi-megabyte `import {`-flood with no closing brace", () => {
    const content = "import {".repeat(250_000); // exactly ~2MB, all unclosed
    const start = process.hrtime.bigint();
    const s = extractComponentImports([{ path: "A.tsx", content }], ["@sanity/ui"]);
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    expect(s.size).toBe(0);
    expect(ms).toBeLessThan(1000); // old backtracking regex hung for minutes here
  });

  it("returns promptly on many closed-but-non-matching imports", () => {
    const content = 'import {x} from "nope"'.repeat(100_000);
    const start = process.hrtime.bigint();
    extractComponentImports([{ path: "A.tsx", content }], ["@sanity/ui"]);
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    expect(ms).toBeLessThan(1000);
  });

  it("still extracts named + type + aliased imports from the target package", () => {
    const content =
      'import { Box, Button as B } from "@sanity/ui"\nimport type { P } from "@sanity/ui"';
    const s = extractComponentImports([{ path: "A.tsx", content }], ["@sanity/ui"]);
    expect([...s].sort()).toEqual(["Box", "Button", "P"]);
  });

  it("ignores imports from other packages", () => {
    const s = extractComponentImports(
      [{ path: "A.tsx", content: 'import { Card } from "other"' }],
      ["@sanity/ui"],
    );
    expect(s.size).toBe(0);
  });

  // Copy-in design systems (shadcn/ui) vendor components into the project, so
  // app code imports a local path, not a package. Package-name matching alone
  // reported ~0 components for such a test (2026-09-03). `importPathPrefixes`
  // is additive and measurement-only.
  describe("importPathPrefixes (copy-in design systems)", () => {
    const shadcnApp = [
      {
        path: "App.tsx",
        content: [
          'import { Button } from "@/components/ui/button"',
          'import { Card, CardHeader } from "@/components/ui/card"',
          'import { ChevronDown } from "lucide-react"',
          'import { useState } from "react"',
          'import { Header } from "@/components/layout/header"',
        ].join("\n"),
      },
    ];

    it("collects named imports from a declared local path prefix", () => {
      const s = extractComponentImports(shadcnApp, [], ["@/components/ui/"]);
      expect([...s].sort()).toEqual(["Button", "Card", "CardHeader"]);
    });

    it("only matches the declared prefix, not sibling directories", () => {
      const s = extractComponentImports(shadcnApp, [], ["@/components/ui/"]);
      // `@/components/layout/header` shares a parent but is not the prefix.
      expect(s.has("Header")).toBe(false);
    });

    it("combines path prefixes with package names", () => {
      const s = extractComponentImports(shadcnApp, ["lucide-react"], ["@/components/ui/"]);
      expect([...s].sort()).toEqual(["Button", "Card", "CardHeader", "ChevronDown"]);
      expect(s.has("useState")).toBe(false);
    });

    // The guarantee that matters for comparability: adding this feature must
    // not change what any existing package-based test counts.
    it("leaves package-name-only behaviour byte-identical", () => {
      const content =
        'import { Box } from "@sanity/ui"\nimport { SearchIcon } from "@sanity/icons/Search"';
      const before = extractComponentImports([{ path: "A.tsx", content }], ["@sanity/ui"]);
      const after = extractComponentImports([{ path: "A.tsx", content }], ["@sanity/ui"], []);
      const undef = extractComponentImports([{ path: "A.tsx", content }], ["@sanity/ui"], undefined);
      expect([...after].sort()).toEqual([...before].sort());
      expect([...undef].sort()).toEqual([...before].sort());
      // A package subpath is still NOT matched by an exact package name —
      // unchanged from before, deliberately not "improved" here.
      expect(before.has("SearchIcon")).toBe(false);
    });

    it("returns empty when both packages and prefixes are absent", () => {
      expect(extractComponentImports(shadcnApp, [], []).size).toBe(0);
      expect(extractComponentImports(shadcnApp).size).toBe(0);
    });

    // Atlassian's design system exports most components as DEFAULTS, one
    // package per component (`import Button from "@atlaskit/button/new"`).
    // The brace scanner only sees `import { … } from`, so before 2026-09-09
    // the majority of an Atlaskit app's components were uncounted.
    describe("default imports", () => {
      const ATLAS = ["@atlaskit/"];
      it("captures a default import from a matching specifier", () => {
        const files = [{ path: "A.tsx", content: 'import Button from "@atlaskit/button/new";' }];
        expect([...extractComponentImports(files, [], ATLAS)]).toEqual(["Button"]);
      });

      it("captures default and named from the same statement", () => {
        const files = [{ path: "A.tsx", content: 'import Avatar, { AvatarItem } from "@atlaskit/avatar";' }];
        expect([...extractComponentImports(files, [], ATLAS)].sort()).toEqual(["Avatar", "AvatarItem"]);
      });

      it("ignores default imports from non-matching specifiers", () => {
        const files = [{ path: "A.tsx", content:
          'import Local from "./local";\nimport React from "react";\nimport B from "@atlaskit/button";' }];
        expect([...extractComponentImports(files, [], ATLAS)]).toEqual(["B"]);
      });

      it("captures `import type X from`", () => {
        const files = [{ path: "A.tsx", content: 'import type Props from "@atlaskit/button";' }];
        expect([...extractComponentImports(files, [], ATLAS)]).toEqual(["Props"]);
      });

      // The guarantee: named-import-only design systems must be unaffected.
      // Verified empirically against 63 historical iterations (ui5-mcp,
      // ui5-frontload, shad-cn-mcp) — 0 newly-captured imports.
      it("does not change counts for named-import design systems", () => {
        const files = [{ path: "A.tsx", content:
          'import { Box, Button } from "@sanity/ui-v5";\nimport { Card } from "@/components/ui/card";' }];
        const a = extractComponentImports(files, ["@sanity/ui-v5"], ["@/components/ui/"]);
        expect([...a].sort()).toEqual(["Box", "Button", "Card"]);
      });
    });

    it("escapes regex metacharacters in a prefix", () => {
      const files = [{ path: "A.tsx", content: 'import { X } from "~ui+lib/btn"' }];
      expect(extractComponentImports(files, [], ["~ui+lib/"]).has("X")).toBe(true);
      // `+` must be literal, so this near-miss must not match.
      expect(extractComponentImports(files, [], ["~uii+lib/"]).size).toBe(0);
    });
  });
});
