import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  enforceUiPocImports,
  buildFixPrompt,
} from "./shared.js";

// ─── enforceUiPocImports ─────────────────────────────────────────────────────

describe("enforceUiPocImports", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- helpers ---

  function makeFiles({ deps = {}, devDeps, sources = [], mainContent } = {}) {
    const pkg = { dependencies: deps };
    if (devDeps) pkg.devDependencies = devDeps;

    const files = [
      { path: "package.json", content: JSON.stringify(pkg, null, 2) },
      ...sources,
    ];
    if (mainContent !== undefined) {
      files.push({ path: "src/main.tsx", content: mainContent });
    }
    return files;
  }

  function parsePkg(files) {
    const f = files.find((f) => f.path === "package.json");
    return JSON.parse(f.content);
  }

  // --- package.json: enforced deps ---

  it("adds @sanity-labs/design-system and classnames to package.json when missing", () => {
    const files = makeFiles({
      deps: { react: "^19.2", "react-dom": "^19.2" },
    });

    const changed = enforceUiPocImports(files, "test");
    expect(changed).toBe(true);

    const pkg = parsePkg(files);
    expect(pkg.dependencies["@sanity-labs/design-system"]).toBe("latest");
    expect(pkg.dependencies["classnames"]).toBe("latest");
  });

  it("does not add enforced deps if they already exist", () => {
    const files = makeFiles({
      deps: {
        react: "^19.2",
        "react-dom": "^19.2",
        "@sanity-labs/design-system": "^1.0.0",
        classnames: "^2.5.0",
      },
    });

    const changed = enforceUiPocImports(files, "test");
    expect(changed).toBe(false);

    const pkg = parsePkg(files);
    // Values should remain untouched
    expect(pkg.dependencies["@sanity-labs/design-system"]).toBe("^1.0.0");
    expect(pkg.dependencies["classnames"]).toBe("^2.5.0");
  });

  // --- package.json: React version upgrade ---

  it("upgrades react and react-dom from 18 to 19", () => {
    const files = makeFiles({
      deps: {
        react: "^18.3.1",
        "react-dom": "^18.3.1",
      },
    });

    enforceUiPocImports(files, "test");
    const pkg = parsePkg(files);
    expect(pkg.dependencies["react"]).toBe("^19.2");
    expect(pkg.dependencies["react-dom"]).toBe("^19.2");
  });

  it("does not touch react if it is already v19", () => {
    const files = makeFiles({
      deps: {
        react: "^19.0.0",
        "react-dom": "^19.0.0",
        "@sanity-labs/design-system": "latest",
        classnames: "latest",
      },
    });

    const changed = enforceUiPocImports(files, "test");
    expect(changed).toBe(false);

    const pkg = parsePkg(files);
    expect(pkg.dependencies["react"]).toBe("^19.0.0");
  });

  // --- package.json: devDependencies @types/react ---

  it("upgrades @types/react and @types/react-dom in devDependencies to v19", () => {
    const files = makeFiles({
      deps: {
        react: "^19.2",
        "@sanity-labs/design-system": "latest",
        classnames: "latest",
      },
      devDeps: {
        "@types/react": "^18.2.0",
        "@types/react-dom": "^18.2.0",
      },
    });

    const changed = enforceUiPocImports(files, "test");
    expect(changed).toBe(true);

    const pkg = parsePkg(files);
    expect(pkg.devDependencies["@types/react"]).toBe("^19");
    expect(pkg.devDependencies["@types/react-dom"]).toBe("^19");
  });

  // --- package.json: malformed JSON ---

  it("handles malformed package.json gracefully", () => {
    const files = [
      { path: "package.json", content: "{ this is not valid json" },
      {
        path: "src/App.tsx",
        content: "import { Box } from '@sanity/ui'",
      },
    ];

    // Should not throw
    const changed = enforceUiPocImports(files, "test");
    // Still true because the import rewrite happened
    expect(changed).toBe(true);
    // package.json should be untouched
    expect(files[0].content).toBe("{ this is not valid json");
  });

  // --- import rewriting: full move ---

  it("rewrites @sanity/ui imports to @sanity-labs/design-system when all components are DS", () => {
    const files = makeFiles({
      deps: {
        react: "^19.2",
        "@sanity-labs/design-system": "latest",
        classnames: "latest",
      },
      sources: [
        {
          path: "src/App.tsx",
          content: `import { Box, Flex, Grid } from '@sanity/ui'\n\nexport default function App() { return <Box /> }`,
        },
      ],
    });

    const changed = enforceUiPocImports(files, "test");
    expect(changed).toBe(true);

    const app = files.find((f) => f.path === "src/App.tsx");
    expect(app.content).toContain(
      "import { Box, Flex, Grid } from '@sanity-labs/design-system'",
    );
    expect(app.content).not.toContain("@sanity/ui");
  });

  // --- import rewriting: split imports ---

  it("splits mixed imports — DS components move, non-DS stay in @sanity/ui", () => {
    const files = makeFiles({
      deps: {
        react: "^19.2",
        "@sanity-labs/design-system": "latest",
        classnames: "latest",
      },
      sources: [
        {
          path: "src/App.tsx",
          content: `import { Box, Button, Flex, TextInput } from '@sanity/ui'`,
        },
      ],
    });

    enforceUiPocImports(files, "test");

    const app = files.find((f) => f.path === "src/App.tsx");
    expect(app.content).toContain(
      "import { Box, Flex } from '@sanity-labs/design-system'",
    );
    expect(app.content).toContain(
      "import { Button, TextInput } from '@sanity/ui'",
    );
  });

  it("does not touch imports that have no DS components", () => {
    const files = makeFiles({
      deps: {
        react: "^19.2",
        "@sanity-labs/design-system": "latest",
        classnames: "latest",
      },
      sources: [
        {
          path: "src/App.tsx",
          content: `import { Button, TextInput, Dialog } from '@sanity/ui'`,
        },
      ],
    });

    const changed = enforceUiPocImports(files, "test");
    expect(changed).toBe(false);

    const app = files.find((f) => f.path === "src/App.tsx");
    expect(app.content).toBe(
      "import { Button, TextInput, Dialog } from '@sanity/ui'",
    );
  });

  // --- import rewriting: multiple import lines ---

  it("rewrites multiple import statements from @sanity/ui in the same file", () => {
    const content = [
      "import { Box } from '@sanity/ui'",
      "import { Card, Dialog } from '@sanity/ui'",
      "",
      "export default function App() { return <Box><Card /></Box> }",
    ].join("\n");

    const files = makeFiles({
      deps: {
        react: "^19.2",
        "@sanity-labs/design-system": "latest",
        classnames: "latest",
      },
      sources: [{ path: "src/App.tsx", content }],
    });

    enforceUiPocImports(files, "test");

    const app = files.find((f) => f.path === "src/App.tsx");
    expect(app.content).toContain(
      "import { Box } from '@sanity-labs/design-system'",
    );
    expect(app.content).toContain(
      "import { Card } from '@sanity-labs/design-system'",
    );
    expect(app.content).toContain(
      "import { Dialog } from '@sanity/ui'",
    );
  });

  // --- import rewriting: double-quote imports ---

  it("rewrites double-quoted @sanity/ui imports", () => {
    const files = makeFiles({
      deps: {
        react: "^19.2",
        "@sanity-labs/design-system": "latest",
        classnames: "latest",
      },
      sources: [
        {
          path: "src/App.tsx",
          content: `import { Text, Heading } from "@sanity/ui"`,
        },
      ],
    });

    enforceUiPocImports(files, "test");
    const app = files.find((f) => f.path === "src/App.tsx");
    expect(app.content).toContain(
      "import { Text, Heading } from '@sanity-labs/design-system'",
    );
  });

  // --- CSS import injection in main.tsx ---

  it("injects design-system CSS import into main.tsx when missing", () => {
    const mainContent = [
      "import React from 'react'",
      "import App from './App'",
      "",
      "ReactDOM.createRoot(document.getElementById('root')!).render(<App />)",
    ].join("\n");

    const files = makeFiles({
      deps: {
        react: "^19.2",
        "@sanity-labs/design-system": "latest",
        classnames: "latest",
      },
      mainContent,
    });

    enforceUiPocImports(files, "test");

    const main = files.find((f) => f.path === "src/main.tsx");
    expect(main.content).toContain(
      "import '@sanity-labs/design-system/styles.css'",
    );
  });

  it("does not inject CSS import if it already exists in main.tsx", () => {
    const mainContent = [
      "import React from 'react'",
      "import '@sanity-labs/design-system/styles.css'",
      "import App from './App'",
      "",
      "ReactDOM.createRoot(document.getElementById('root')!).render(<App />)",
    ].join("\n");

    const files = makeFiles({
      deps: {
        react: "^19.2",
        "@sanity-labs/design-system": "latest",
        classnames: "latest",
      },
      mainContent,
    });

    const changed = enforceUiPocImports(files, "test");
    expect(changed).toBe(false);

    const main = files.find((f) => f.path === "src/main.tsx");
    // Should appear exactly once
    const count = main.content.split("@sanity-labs/design-system/styles.css").length - 1;
    expect(count).toBe(1);
  });

  // --- skips non-source files ---

  it("does not attempt import rewriting on non-source files", () => {
    const files = makeFiles({
      deps: {
        react: "^19.2",
        "@sanity-labs/design-system": "latest",
        classnames: "latest",
      },
      sources: [
        {
          path: "README.md",
          content: `import { Box } from '@sanity/ui'`,
        },
      ],
    });

    const changed = enforceUiPocImports(files, "test");
    expect(changed).toBe(false);

    const readme = files.find((f) => f.path === "README.md");
    expect(readme.content).toBe("import { Box } from '@sanity/ui'");
  });

  // --- returns false when nothing changes ---

  it("returns false and logs nothing when all files are already correct", () => {
    const files = makeFiles({
      deps: {
        react: "^19.2",
        "react-dom": "^19.2",
        "@sanity-labs/design-system": "latest",
        classnames: "latest",
      },
      sources: [
        {
          path: "src/App.tsx",
          content: `import { Box } from '@sanity-labs/design-system'\nimport { Button } from '@sanity/ui'`,
        },
      ],
      mainContent: [
        "import React from 'react'",
        "import '@sanity-labs/design-system/styles.css'",
        "import App from './App'",
      ].join("\n"),
    });

    const changed = enforceUiPocImports(files, "test");
    expect(changed).toBe(false);
    expect(console.log).not.toHaveBeenCalled();
  });

  // --- end-to-end realistic scenario ---

  it("handles a realistic full project file set", () => {
    const files = [
      {
        path: "package.json",
        content: JSON.stringify({
          dependencies: {
            react: "^18.3.1",
            "react-dom": "^18.3.1",
            "@sanity/ui": "^2.0.0",
          },
          devDependencies: {
            "@types/react": "^18.2.0",
            "@types/react-dom": "^18.2.0",
          },
        }),
      },
      {
        path: "src/App.tsx",
        content: [
          "import { Box, Button, Flex, TextInput } from '@sanity/ui'",
          "import { Heading, Card } from '@sanity/ui'",
          "",
          "export default function App() {",
          "  return (",
          "    <Box><Flex><Card><Heading>Hello</Heading><Button text='Click' /><TextInput /></Card></Flex></Box>",
          "  )",
          "}",
        ].join("\n"),
      },
      {
        path: "src/main.tsx",
        content: [
          "import React from 'react'",
          "import ReactDOM from 'react-dom/client'",
          "import App from './App'",
          "",
          "ReactDOM.createRoot(document.getElementById('root')!).render(<App />)",
        ].join("\n"),
      },
    ];

    const changed = enforceUiPocImports(files, "iter-1");
    expect(changed).toBe(true);

    // package.json assertions
    const pkg = JSON.parse(files[0].content);
    expect(pkg.dependencies["react"]).toBe("^19.2");
    expect(pkg.dependencies["react-dom"]).toBe("^19.2");
    expect(pkg.dependencies["@sanity-labs/design-system"]).toBe("latest");
    expect(pkg.dependencies["classnames"]).toBe("latest");
    expect(pkg.devDependencies["@types/react"]).toBe("^19");
    expect(pkg.devDependencies["@types/react-dom"]).toBe("^19");

    // App.tsx: imports split correctly
    const app = files[1];
    expect(app.content).toContain(
      "import { Box, Flex } from '@sanity-labs/design-system'",
    );
    expect(app.content).toContain(
      "import { Button, TextInput } from '@sanity/ui'",
    );
    expect(app.content).toContain(
      "import { Heading, Card } from '@sanity-labs/design-system'",
    );
    // No leftover legacy import for DS-only line
    expect(app.content).not.toMatch(
      /import\s*\{\s*\}\s*from\s*'@sanity\/ui'/,
    );

    // main.tsx: CSS import injected
    const main = files[2];
    expect(main.content).toContain(
      "import '@sanity-labs/design-system/styles.css'",
    );

    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Post-processed files"),
    );
  });

  it("works when package.json has no dependencies key at all", () => {
    const files = [
      { path: "package.json", content: JSON.stringify({ name: "test" }) },
    ];

    // Should not throw — the `deps` object is initialized as empty
    const changed = enforceUiPocImports(files, "test");
    expect(changed).toBe(true);

    const pkg = JSON.parse(files[0].content);
    expect(pkg.dependencies["@sanity-labs/design-system"]).toBe("latest");
    expect(pkg.dependencies["classnames"]).toBe("latest");
  });
});

// ─── buildFixPrompt ──────────────────────────────────────────────────────────

describe("buildFixPrompt", () => {
  it("includes current files text and a call to action", () => {
    const prompt = buildFixPrompt("--- app.tsx ---\nconsole.log('hi')\n--- end ---", [], null);
    expect(prompt).toContain("--- app.tsx ---");
    expect(prompt).toContain("console.log('hi')");
    expect(prompt).toContain("## Current Project Files");
    expect(prompt).toContain("Please fix all errors");
  });

  it("includes a fatal error when provided", () => {
    const prompt = buildFixPrompt("files", [], "TypeError: cannot read undefined");
    expect(prompt).toContain("**Fatal error (app did not mount):**");
    expect(prompt).toContain("TypeError: cannot read undefined");
  });

  it("does not include fatal error section when fatalError is null", () => {
    const prompt = buildFixPrompt("files", [], null);
    expect(prompt).not.toContain("Fatal error");
  });

  it("filters console errors to the most relevant ones", () => {
    const consoleErrors = [
      "[pageerror] Uncaught ReferenceError: foo is not defined",
      "some random log message",
      "Failed to fetch resource",
      "SyntaxError: Unexpected token '<'",
      "does not provide an export named 'Box'",
      "Cannot read properties of undefined (reading 'map')",
    ];

    const prompt = buildFixPrompt("files", consoleErrors, null);
    // Relevant errors should all appear (they match the filter)
    expect(prompt).toContain("[pageerror]");
    expect(prompt).toContain("Failed to");
    expect(prompt).toContain("SyntaxError");
    expect(prompt).toContain("does not provide an export");
    expect(prompt).toContain("Cannot read properties");
    // The non-matching line should NOT appear because relevantErrors was non-empty
    expect(prompt).not.toContain("some random log message");
  });

  it("falls back to first 5 errors when none match the relevance filter", () => {
    const consoleErrors = [
      "Warning: componentDidMount is deprecated",
      "Info: dev tools initialized",
      "Debug: render cycle complete",
      "Log: state updated",
      "Notice: feature flag enabled",
      "Trace: event fired",
    ];

    const prompt = buildFixPrompt("files", consoleErrors, null);
    // First 5 should appear
    expect(prompt).toContain("Warning: componentDidMount is deprecated");
    expect(prompt).toContain("Notice: feature flag enabled");
    // 6th should not
    expect(prompt).not.toContain("Trace: event fired");
  });

  it("handles empty console errors array", () => {
    const prompt = buildFixPrompt("files", [], null);
    expect(prompt).toContain("## Errors");
    // Should not contain the console errors heading
    expect(prompt).not.toContain("**Browser console errors:**");
  });

  it("handles both fatal error and console errors together", () => {
    const prompt = buildFixPrompt(
      "files",
      ["[pageerror] ReferenceError: x is not defined"],
      "App failed to mount: root element not found",
    );
    expect(prompt).toContain("**Fatal error (app did not mount):**");
    expect(prompt).toContain("App failed to mount: root element not found");
    expect(prompt).toContain("**Browser console errors:**");
    expect(prompt).toContain("[pageerror] ReferenceError: x is not defined");
  });
});
