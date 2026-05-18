# Design System Tester

A test harness that measures how effectively AI agents build interfaces. You define a list of **tests** in `agent-tester.config.js` (any number, any labels). The harness runs N independent agent iterations of each test against the same interface brief, then evaluates each test's output across accessibility, performance, code quality, visual consistency, and developer experience.

Tests are agnostic peers — the engine assigns no built-in meaning to their order or names. Each test independently configures its own packages, version specifiers, MCP setting, and prompts. The shared interface brief guarantees all tests are building the same thing, so the harness can attribute differences in the output to differences between the tests themselves.

The tool makes no assumptions about what's being tested — it could be a design system migration, a prompt comparison, an MCP-vs-no-MCP study, or anything else where you want to compare different agent instructions against the same spec.

## How It Works

1. **Generate a brief** — Either a static fallback or an Anthropic-generated PRD-style spec
2. For each test in `tests: [...]`:
   1. **Generate** — The agent receives the test's system prompt + user prompt (brief + instructions) and produces a complete Vite + React project
   2. **Validate** — The harness installs dependencies, runs `tsc --noEmit`, starts a dev server, and checks for rendering errors
   3. **Fix** — If validation fails, the agent is given the errors and asked to fix them (up to N cycles)
   4. **Measure** — Once rendering, the harness captures screenshots (4 breakpoints × 2 color schemes), runs axe-core a11y scans, measures Lighthouse performance, counts DOM elements, and analyzes semantic HTML
   5. **Analyze** — Inline styles, component usage, and code variance are extracted from the source
   6. **Feedback** — The agent provides structured feedback on friction points encountered
3. **Report** — All data from every test is aggregated into `report.json` and `report.md`, including pairwise visual diffs between iterations of the same test

## Setup

```sh
git clone <repo-url>
cd agent-tester
npm install
```

### Environment Variables

Create a `.env` file:

```sh
ANTHROPIC_API_KEY=sk-ant-...   # Required for the API runner
```

### Install Playwright (for standalone a11y tests)

```sh
npm run test:a11y:install
```

## Usage

```sh
# Run every test in the config, 3 iterations each
npm start -- --prompt all

# Run one specific test by label
npm start -- --prompt variant --iterations 10 --model claude-sonnet-4-6

# Run a comma-separated subset
npm start -- --prompt control,variant

# Disable MCP for any test that opts in
npm start -- --prompt all --no-mcp

# Generate a varied interface brief with an agent
npm start -- --prompt all --agent-prompt

# Use the CLI runner (no API key needed)
npm start -- --prompt control --runner cli
```

### Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--prompt` | `-p` | `both` | Which test(s) to run: a single label, a comma-separated list, or `all` (`both` is accepted as an alias for `all`) |
| `--iterations` | `-n` | `3` | Number of independent agent runs per test |
| `--model` | `-m` | `claude-sonnet-4-20250514` | Claude model ID |
| `--runner` | `-r` | `api` | `api` (Anthropic SDK) or `cli` (Claude CLI) |
| `--max-fixes` | `-f` | `5` | Max error→fix cycles per iteration |
| `--concurrency` | `-c` | `2` | Max parallel agent calls |
| `--screenshot` | `-s` | `true` | Capture screenshots and run the validate/fix loop |
| `--no-mcp` | | `false` | Globally disable MCP tool use, even for tests that opt in via `requiresMcp: true` |
| `--agent-prompt` | | `false` | Generate a varied interface brief via Claude instead of using the static fallback |

### Models

| Model | ID | Context | Max Output |
|-------|-----|---------|------------|
| **Claude Opus 4.7** | `claude-opus-4-7` | 1M | 128k |
| **Claude Sonnet 4.6** | `claude-sonnet-4-6` | 1M | 64k |
| **Claude Opus 4.6** | `claude-opus-4-6` | 1M | 128k |
| **Claude Haiku 4.5** | `claude-haiku-4-5` | 200k | 64k |

## Project Structure

```
├── agent-tester.config.js          # ⚡ Your test config (tests: [...] array)
├── agent-tester.config.example.js  # Generic template to base your config on
├── src/
│   ├── index.js                    # Main entry point
│   ├── pipeline/                   # Core test pipeline
│   │   ├── runner-api.js           # Anthropic SDK runner
│   │   ├── runner-cli.js           # Claude CLI runner
│   │   ├── shared.js               # Shared runner logic
│   │   └── mcp-client.js           # MCP JSON-RPC transport
│   ├── evaluation/                 # Measurement & analysis
│   │   ├── accessibility.js        # axe-core scans (light + dark mode)
│   │   ├── analyze.js              # File parsing, component/style extraction
│   │   ├── performance.js          # Lighthouse + React profiling
│   │   ├── screenshot.js           # Puppeteer capture + DOM analysis
│   │   └── visual-diff.js          # Pixel-level image comparison
│   ├── reporting/                  # Output generation
│   │   ├── report.js               # Per-run report (JSON + Markdown)
│   │   └── summarize.js            # Cross-run aggregation
│   ├── config/                     # Generic config engine (zero DS-specific text)
│   │   ├── load.js                 # Resolves & validates the root config
│   │   ├── prompts.js              # Per-test prompt builder
│   │   └── prompt-generator.js     # Brief generator (uses config templates)
│   └── scripts/                    # Standalone re-run utilities
│       ├── rebuild.js              # Re-parse + re-screenshot existing output
│       ├── rescreenshot.js         # Re-capture screenshots only
│       ├── rediff-all.js           # Re-compute visual diffs
│       ├── refilter.js             # Regenerate report with exclusions
│       └── reperf.js               # Re-run Lighthouse measurements
├── prompts/                        # Docs appended to a test's user prompt via docsPath
│   └── variant-docs.md             # Default location for the `variant` test's docs
├── a11y/                           # Standalone Playwright a11y tests
├── output/                         # Test run output (YYYY-MM-DD/HH.MM/)
└── docs/                           # Architecture docs
```

## Configuration

The harness reads `tests: [...]` from `agent-tester.config.js`. Each entry is an independent test — the engine treats them all as peers, with no built-in concept of "legacy" vs "new". Add as many tests as you want to compare.

```js
export default {
  name: "My Test",

  // Shared infrastructure (used by all tests)
  briefGenerator: { ... },        // Interface brief shared by every test
  mcp: { ... },                   // MCP server config (used when a test opts in)
  appRootSelectors: [ ... ],      // DOM selectors Puppeteer uses to detect render

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
        system: (ctx) => "...",
        fixSystem: (ctx) => "...",
        user: (ctx) => `${ctx.brief}\n\n# Instructions\n...`,
      },
    },
    {
      label: "variant",
      packages: {
        ds: { name: "...", version: "...", components: [...], cssImport: "..." },
        ui: { name: "@your-org/ui" },
        icons: { name: "@your-org/icons" },
      },
      reactVersion: "^19.2",
      requiresMcp: true,
      docsPath: "prompts/variant-docs.md",
      prompts: { system, fixSystem, user },
    },
    // ...add more tests as needed
  ],
};
```

To bootstrap a new test setup:

1. Copy `agent-tester.config.example.js` to `agent-tester.config.js`.
2. Edit the entries in `tests: [...]` to describe what you want to compare. Each test has its own `packages`, `prompts`, and runtime flags.
3. If a test uses docs-in-prompt, drop your documentation into the file referenced by `docsPath` (default: `prompts/variant-docs.md`).
4. (Optional) Set `AGENT_TESTER_CONFIG=path/to/other-config.js` to load a different config without editing files — useful for running multiple test setups side-by-side.

### Test fields

| Field | Required | Description |
|---|---|---|
| `label` | yes | Unique identifier used as the output directory name and in report headings |
| `prompts.system` | yes | `(ctx) => string` — system prompt for code generation |
| `prompts.fixSystem` | yes | `(ctx) => string` — system prompt for fix cycles |
| `prompts.user` | yes | `(ctx) => string` — user prompt; receives `ctx.brief`, `ctx.docs`, and all test fields |
| `packages` | no | Free-form object. Each entry's `name` field is scanned for component imports; the whole object is exposed as `ctx.packages` for use in your prompt templates |
| `reactVersion` | no | String referenced in the prompt via `ctx.reactVersion`, or `null` |
| `requiresMcp` | no | If `true`, MCP tool use is enabled for this test's generations (subject to `--no-mcp`) |
| `docsPath` | no | Path to a file whose contents are exposed as `ctx.docs` in the user-prompt builder |

### Prompt context (`ctx`)

The `ctx` object passed to every prompt function:

```
{
  label,          // this test's label
  packages,       // this test's `packages` object
  reactVersion,   // this test's reactVersion
  requiresMcp,    // boolean
  name,           // global config.name
  brief,          // the interface brief (user prompts only)
  docs,           // contents of docsPath, lazily loaded (user prompts only)
  test,           // full normalised test config (escape hatch)
  config,         // full root config (escape hatch)
}
```

There is **no** built-in legacy/design-system distinction and **no** mechanical post-processing of the agent's output. If you want the agent to use a specific package, say so in the prompts.

## Output

Each run creates a timestamped directory:

```
output/
└── 2026-05-14/
    └── 16.24/
        ├── report.json
        ├── report.md
        ├── control/
        │   ├── iteration-1/
        │   │   ├── project/                  # Generated project files
        │   │   ├── screenshot.png            # Laptop + light (primary)
        │   │   ├── screenshot-mobile-light.png
        │   │   ├── screenshot-mobile-dark.png
        │   │   ├── screenshot-tablet-light.png
        │   │   ├── screenshot-tablet-dark.png
        │   │   ├── screenshot-laptop-dark.png
        │   │   ├── screenshot-desktop-light.png
        │   │   ├── screenshot-desktop-dark.png
        │   │   ├── _raw_response.txt
        │   │   ├── _agent_log.txt
        │   │   ├── _feedback.json
        │   │   ├── _meta.json
        │   │   ├── _a11y_results.json
        │   │   ├── _perf_results.json
        │   │   ├── _npm_install.txt
        │   │   ├── _tsc_check.txt
        │   │   ├── _console_errors.txt
        │   │   └── _prompt.txt
        │   └── iteration-2/
        └── variant/
            └── ...
```

## What the Report Measures

| Section | Metrics |
|---------|---------|
| **Timing** | Avg/min/max build time per iteration |
| **Lines of Code** | Avg/stddev/min/max across iterations |
| **Code Variance** | 3-gram Jaccard similarity + structural file-path similarity |
| **Fix Attempts** | Clean-on-first-try rate, avg fixes, error categories |
| **Components** | Unique design system components and icons used |
| **Feedback** | Agent friction reports by category (components, API, docs, DX, theming, icons) |
| **Accessibility** | axe-core violations (light + dark mode) |
| **Performance** | FCP, LCP, TBT, TTI, Lighthouse score, React mount/commit timing |
| **Component Usage** | JSX instance counts per component |
| **Inline Styles** | Count by component + top CSS properties used |
| **DOM Elements** | Total rendered DOM element count |
| **Semantic HTML** | Semantic vs generic tags, ARIA roles, semantic ratio |
| **Visual Diff** | Pairwise pixel comparison between iterations of the same test |
| **Screenshots** | 8 per iteration (4 breakpoints × light/dark) |

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm start -- [flags]` | Run the test harness |
| `npm run summarize` | Aggregate metrics across multiple runs |
| `npm run rebuild` | Re-parse and re-screenshot existing output |
| `npm run rescreenshot` | Re-capture screenshots for existing output |
| `npm run reperf` | Re-run Lighthouse measurements |
| `npm run rediff` | Re-compute visual diffs across all runs |
| `npm test` | Run unit tests (vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:a11y` | Run standalone Playwright accessibility tests |
| `npm run test:a11y:install` | Install Playwright browsers |

All scripts accept `--prompt <label>|all` to filter by test (`both` is also accepted as an alias for `all`).

## Summarizing Multiple Runs

```sh
npm run summarize                          # All runs, every test
npm run summarize -- --count 5             # Last 5 runs
npm run summarize -- --from 2026-05-14/14.00 --save  # Since a date, save to file
npm run summarize -- --prompt variant      # Variant test only
```

## Standalone Accessibility Tests

The Playwright-based a11y tests can re-run against existing output:

```sh
npm run test:a11y                                    # All iterations
A11Y_PROMPT=variant npm run test:a11y                # Variant only
A11Y_ITERATION=2 A11Y_PROMPT=control npm run test:a11y  # Specific iteration
A11Y_RUN_DIR=output/2026-05-14/16.24 npm run test:a11y  # Specific run
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `@anthropic-ai/sdk` | Anthropic API client |
| `puppeteer` | Headless browser for screenshots + validation |
| `axe-core` | Accessibility testing engine |
| `lighthouse` | Performance measurement |
| `pixelmatch` / `pngjs` | Visual diff comparison |
| `vitest` | Unit testing |
| `@playwright/test` | Standalone a11y test runner |
