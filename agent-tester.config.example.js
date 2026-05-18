/**
 * Agent Tester configuration — EXAMPLE.
 *
 * Copy this file to `agent-tester.config.js` at the project root and edit
 * the values for your test.
 *
 * The harness runs an arbitrary list of tests in `tests: [...]` and
 * compares their outputs against the same interface brief. Each test is
 * fully self-contained: its own packages, version specifiers, MCP setting,
 * and prompts. The engine treats tests as agnostic peers — there is no
 * built-in concept of "legacy" vs "new" and no mechanical post-processing.
 * If your test depends on the agent using a specific package, say so in
 * the prompts.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ MENTAL MODEL                                                     │
 * │                                                                  │
 * │  Define one entry in `tests: []` per condition you want to       │
 * │  compare. The brief generator produces a single product spec;   │
 * │  every test is asked to implement that spec but receives its    │
 * │  own prompts. The harness then measures the differences in     │
 * │  the resulting code, screenshots, and metrics.                  │
 * │                                                                  │
 * │  Add as many tests as you like — the engine just iterates.      │
 * └──────────────────────────────────────────────────────────────────┘
 */

// ─── Helpers (feel free to add your own) ──────────────────────────────

const quoted = (list) => list.map((c) => `\`${c}\``).join(", ");

const importTable = (components, primaryPkg, fallbackPkg) => {
  const rows = components.map((c) => `| \`${c}\` | \`${primaryPkg}\` |`);
  return [
    "| Component | Import from |",
    "|-----------|-------------|",
    ...rows,
    `| Everything else | \`${fallbackPkg}\` |`,
  ].join("\n");
};

// ─── Shared boilerplate ───────────────────────────────────────────────
// Lift any text that appears in multiple tests here to avoid copy-paste.

const OUTPUT_FORMAT = `Your task is to produce ALL the files needed for a complete, working project. Output each file using the following format:

---FILE: path/to/file---
(file contents here)
---END FILE---`;

const FEEDBACK_FORMAT = `After ALL file blocks, you MUST provide feedback in this exact format:

---FEEDBACK---
- [category] Your feedback item here
---END FEEDBACK---

Categories must be one of: [documentation], [api], [components], [theming], [icons], [dx], [other]`;

const BASE_RULES = `Rules:
- Output ALL files needed (package.json, index.html, config files, source files, etc.)
- Make sure the project works with "npm install && npm run dev"
- Do not include unit tests`;

const FIX_PREAMBLE = `You are an expert frontend developer debugging a web application that fails to render.

Output ONLY the files that need to change, using this format:

---FILE: path/to/file---
(complete file contents here)
---END FILE---`;

const FIX_RULES_BASE = `Rules:
- Output the COMPLETE contents of each file you change
- Fix the root cause, not the symptoms`;

// ─── Configuration ────────────────────────────────────────────────────

const config = {
  /** Human-readable name shown in report headings and log messages. */
  name: "Your Design System",

  // ─── Shared infrastructure ──────────────────────────────────────

  /** MCP server config used by any test with `requiresMcp: true`. */
  mcp: {
    command: "uv",
    args: (directory) => [
      "run",
      "--directory",
      directory,
      "mcp",
      "run",
      "main.py",
    ],
    defaultDirectory: "/absolute/path/to/your/mcp-server",
    toolPrefix: "mcp__your-design-system",
  },

  /**
   * CSS selectors used by Puppeteer to detect whether the generated app
   * has rendered.
   */
  appRootSelectors: ["#root", "#app", "#__next", "[data-reactroot]"],

  // ─── Brief generator ────────────────────────────────────────────
  /**
   * Produces a PRD-style interface brief that is fed to EVERY test in a
   * run, so all tests build the same spec.
   *
   *   - `staticBrief` is used when `--agent-prompt` is OFF.
   *   - `systemPrompt`/`domains`/`buildUserMessage` are used to call the
   *     Anthropic API to generate a fresh brief when `--agent-prompt` is ON.
   */
  briefGenerator: {
    staticBrief: "Create a small content management dashboard.",

    systemPrompt: `You are a senior product manager writing a one-page interface brief for a frontend engineering team.

Rules you must follow:
- The deliverable is a FRONTEND-ONLY prototype. All data must be hardcoded or mocked directly in the React component.
- The interface must resemble a real admin panel — navigation sidebar, content area, and optionally an inspector panel.
- Choose a specific, realistic domain each time.
- Be concrete: name the content types, the columns in lists, the fields in detail views.
- Keep the brief between 200 and 350 words.
- Use clear numbered sections with short headings.
- Do NOT mention React, Vite, TypeScript, or any specific technology.
- End with a short "Out of scope" list.

Output ONLY the brief text. No preamble, no meta-commentary, no markdown code fences.`,

    domains: [
      "a news and editorial platform",
      "a travel content platform",
      "an e-commerce product catalogue",
      "a developer documentation platform",
      "an HR onboarding portal",
    ],

    buildUserMessage: ({ domain }) =>
      `Write an interface brief for an admin panel built for ${domain}. ` +
      `The interface is a frontend-only prototype — all data must be hardcoded. ` +
      `Make the brief concrete and specific to the domain.`,
  },

  // ─── Tests ──────────────────────────────────────────────────────
  //
  // Each entry is one independent test. The engine iterates this array
  // and runs the same brief through each test's prompts. Tests are
  // agnostic peers — no built-in notion of "legacy" vs "new".
  //
  // Required fields per test:
  //   - `label`     (unique; used as the output directory name)
  //   - `prompts`   { system, fixSystem, user } — see below
  //
  // Optional fields:
  //   - `packages`     free-form, available in `ctx.packages` in prompts
  //   - `reactVersion` string, available in `ctx.reactVersion`
  //   - `requiresMcp`  boolean, enables MCP tool use (subject to --no-mcp)
  //   - `docsPath`     path to a file whose contents become `ctx.docs`
  //
  // The `ctx` object passed to every prompt function contains:
  //   { label, packages, reactVersion, requiresMcp, name, docs, brief, test, config }

  tests: [
    {
      label: "control",
      packages: {
        ui: { name: "@your-org/ui" },
        icons: { name: "@your-org/icons" },
      },
      reactVersion: null,
      requiresMcp: false,
      docsPath: null,

      prompts: {
        system: ({ packages }) =>
          `You are an expert frontend developer. You will be given instructions to build a web application.

CRITICAL — Package imports:
- All UI components come from \`${packages.ui.name}\`. Use the latest version.
- Icons come from \`${packages.icons.name}\`. Use the latest version.

${OUTPUT_FORMAT}

${FEEDBACK_FORMAT}

${BASE_RULES}`,

        fixSystem: () => `${FIX_PREAMBLE}

${FIX_RULES_BASE}`,

        user: ({ brief, packages }) => `${brief}

# Instructions
* Use the latest version of \`${packages.ui.name}\` and \`${packages.icons.name}\`.
* The project should be built on top of Vite.
* Do not add unit tests of any kind.
* Provide feedback on areas of friction.`,
      },
    },

    {
      label: "variant",
      packages: {
        ds: {
          name: "@your-org/design-system",
          /**
           * Version string the agent should write into the generated
           * `package.json`. Common choices:
           *   - `"latest"` — always resolves to the latest npm dist-tag.
           *   - `"1.2.3"` — pin to a known-good version.
           *   - `"^1.2.3"` — caret range (only safe for stable releases).
           *
           * IMPORTANT: if your package is published as pre-releases
           * (e.g. `0.0.1-alpha.0`), do NOT use a bare caret range like
           * `"^0.0.1"` — it will not match pre-release versions per semver.
           * Use `"latest"` or a concrete version instead.
           */
          version: "latest",
          components: ["Box", "Stack", "Text", "Heading", "Button"],
          cssImport: "@your-org/design-system/styles.css",
        },
        ui: { name: "@your-org/ui" },
        icons: { name: "@your-org/icons" },
      },
      reactVersion: "^19.2",
      requiresMcp: false,
      docsPath: "prompts/variant-docs.md",

      prompts: {
        system: ({ packages, reactVersion }) =>
          `You are an expert frontend developer. You will be given instructions to build a web application.

CRITICAL — Package imports you MUST follow:
- ${quoted(packages.ds.components)} come from \`${packages.ds.name}\`, NOT from \`${packages.ui.name}\`.
- In \`package.json\`, add the design system as: \`"${packages.ds.name}": "${packages.ds.version}"\`.
- You MUST import \`${packages.ds.cssImport}\` in main.tsx.
- \`${packages.ds.name}\` requires React ${reactVersion}.

${OUTPUT_FORMAT}

${FEEDBACK_FORMAT}

${BASE_RULES}`,

        fixSystem: ({ packages }) => `${FIX_PREAMBLE}

${FIX_RULES_BASE}
- Do NOT remove \`${packages.ds.name}\` from package.json.`,

        user: (ctx) => {
          const { brief, packages, requiresMcp, docs } = ctx;
          const components = packages.ds.components;
          const installLine = `npm i ${packages.ds.name}@${packages.ds.version}`;

          const baseInstructions = `# Instructions
* DO NOT import ${quoted(components)} from \`${packages.ui.name}\`. Use \`${packages.ds.name}\` instead.
* Install with \`${installLine}\`. In package.json, write the dependency as \`"${packages.ds.name}": "${packages.ds.version}"\`.
* The project should be built on top of Vite.

**Quick import reference:**

${importTable(components, packages.ds.name, packages.ui.name)}`;

          if (requiresMcp) {
            return `${brief}

${baseInstructions}

Use the design system MCP server to gain context on how to use \`${packages.ds.name}\`.`;
          }

          return `${brief}

${baseInstructions}

**Design system guidelines below**

---

${docs}`;
        },
      },
    },
  ],
};

export default config;
