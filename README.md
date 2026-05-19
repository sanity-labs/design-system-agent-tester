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
├── agent-tester.config.js          # Engine-level settings only (name, mcp, brief)
├── agent-tester.config.example.js  # Generic template to base your config on
├── briefs/
│   └── default.js                  # Interface-brief generator config
├── tests/                          # One directory per test, auto-discovered
│   ├── control/
│   │   ├── config.js               # Test config (label, packages, prompts)
│   │   ├── system.md               # System-prompt template
│   │   └── user.md                 # User-prompt template
│   ├── shad-cn/
│   │   ├── config.js
│   │   ├── system.md
│   │   └── user.md
│   └── variant/
│       ├── config.js               # Helpers live inline (only this test needs them)
│       ├── system.md
│       ├── fix-system.md           # Extra fix-rule, appended to engine base
│       ├── user.md
│       └── docs.md                 # Inlined when {{docs}} is referenced
├── src/
│   ├── index.js                    # Main entry point
│   ├── pipeline/                   # Core test pipeline
│   │   ├── runner-api.js           # Anthropic SDK runner
│   │   ├── runner-cli.js           # Claude CLI runner
│   │   ├── shared.js               # Shared runner logic
│   │   └── mcp-client.js           # MCP JSON-RPC transport
│   ├── evaluation/                 # Measurement & analysis (one data point per file)
│   │   ├── accessibility.js        # axe-core scans (light + dark mode)
│   │   ├── count-component-usage.js
│   │   ├── dom-count.js            # Total rendered DOM element count
│   │   ├── extract-component-imports.js
│   │   ├── extract-inline-styles.js
│   │   ├── lighthouse.js           # Lighthouse Core Web Vitals
│   │   ├── parse-feedback.js
│   │   ├── parse-files.js
│   │   ├── puppeteer-helpers.js    # Shared browser/page helpers
│   │   ├── react-profile.js        # React commit-level profiling
│   │   ├── screenshot.js           # Screenshot capture (4 breakpoints × light/dark)
│   │   ├── semantic-html.js        # Semantic vs generic tag analysis
│   │   ├── validate.js             # npm install + tsc + dev-server gating
│   │   └── visual-diff.js          # Pixel-level image comparison
│   ├── reporting/                  # Output generation
│   │   ├── report.js               # Per-run report (JSON + Markdown)
│   │   └── summarize.js            # Cross-run aggregation
│   ├── config/                     # Generic config engine
│   │   ├── load.js                 # Resolves & validates the root config
│   │   ├── prompts.js              # Test discovery + template rendering
│   │   ├── boilerplate.js          # Engine-required OUTPUT/FEEDBACK/RULES blocks
│   │   ├── template.js             # Mini mustache renderer
│   │   └── prompt-generator.js     # Brief generator (calls Anthropic API)
│   └── scripts/                    # Standalone utilities
│       ├── new-test.js             # Scaffold a new test directory
│       ├── rebuild.js              # Re-parse + re-screenshot existing output
│       ├── rescreenshot.js         # Re-capture screenshots only
│       ├── rediff-all.js           # Re-compute visual diffs
│       ├── refilter.js             # Regenerate report with exclusions
│       └── reperf.js               # Re-run Lighthouse measurements
├── output/                         # Test run output (YYYY-MM-DD/HH.MM/)
└── docs/                           # Architecture docs
```

## Configuration

Each test lives in its own directory under `tests/`, containing everything that test needs:

```
tests/control/
├── config.js     ← test config (label, packages, prompt references)
├── system.md     ← system-prompt template
└── user.md       ← user-prompt template
```

The directory name is the test's label. The engine auto-discovers every directory in `tests/`. To disable a test temporarily, rename `tests/foo/` → `tests/foo.disabled/` (or prefix with `_`).

`agent-tester.config.js` at the project root holds only engine-level settings (name, MCP server, brief generator) — you edit it rarely.

### Scaffolding a new test

```sh
npm run new-test -- <label>
```

This creates `tests/<label>/` with stub `config.js`, `system.md`, and `user.md` files, ready for you to fill in. Label validation refuses anything that wouldn't be a valid directory name or would be auto-skipped.

### A test config

```js
// tests/control/config.js
export default {
  label: "control",
  packages: {
    ui: { name: "@your-org/ui", version: "latest" },
    icons: { name: "@your-org/icons", version: "latest" },
  },
  prompts: {
    system: "system.md",    // relative to this test's directory
    user: "user.md",
  },
};
```

### A prompt template

```md
<!-- tests/control/system.md -->
You are an expert frontend developer.

CRITICAL — Package imports:
- All UI components come from `{{packages.ui.name}}@{{packages.ui.version}}`.
- All icons come from `{{packages.icons.name}}@{{packages.icons.version}}`.
```

The engine appends the required `---FILE: …---` / `---FEEDBACK---` instructions and base rules automatically — you only write the test-specific text.

### Template syntax

The mini-renderer supports three constructs:

| Syntax | Behavior |
|---|---|
| `{{path.to.value}}` | Substitute a value (dot paths work; throws on unknown paths) |
| `{{#if path}}…{{/if}}` | Render the body if the value is truthy |
| `{{#unless path}}…{{/unless}}` | Render the body if the value is falsy |

No loops, no nesting, no helpers. If you need a derived value (a comma-joined list, a markdown table), compute it in JS via `derive(ctx)` and reference it as `{{yourValue}}`:

```js
// tests/variant/config.js
const quoted = (list) => list.map((c) => `\`${c}\``).join(", ");

export default {
  label: "variant",
  packages: { ds: { components: ["Box", "Text"] }, ui: { name: "@your-org/ui" } },
  prompts: { system: "system.md", user: "user.md" },
  derive: ({ packages }) => ({
    componentsQuoted: quoted(packages.ds.components),
  }),
};
```

Helpers live inline in the test file so each test directory remains self-contained.

### Test fields

| Field | Required | Description |
|---|---|---|
| `label` | yes | Unique identifier — must match the directory name (e.g. `tests/control/` → `"control"`) |
| `prompts.system` | yes | Path to the system-prompt markdown template (relative to this test's directory) |
| `prompts.user` | yes | Path to the user-prompt markdown template (relative to this test's directory) |
| `prompts.fixSystem` | no | Path to a markdown file with test-specific *extra* fix rules (appended to the engine's base fix prompt) |
| `packages` | no | Free-form object. Each entry's `name` field is scanned for component imports; the whole object is exposed as `{{packages.…}}` in templates |
| `reactVersion` | no | String available as `{{reactVersion}}` in templates |
| `requiresMcp` | no | If `true`, MCP tool use is enabled (subject to `--no-mcp`). Available as `{{requiresMcp}}` for conditional template blocks |
| `docsPath` | no | Path to a file whose contents are exposed as `{{docs}}` in the user template (relative to this test's directory) |
| `derive` | no | `(ctx) => object` returning extra fields to merge into the template context |

### Template context

```
{
  label,          // this test's label
  packages,       // this test's `packages` object
  reactVersion,   // this test's reactVersion
  requiresMcp,    // boolean
  name,           // global config.name
  brief,          // the interface brief (user template only)
  docs,           // contents of docsPath, lazily loaded (user template only)
  …derive(ctx)    // anything returned from your derive() function
}
```

### Validation

The engine validates every test on load and fails fast with a useful message. Examples:

```
tests/foo/config.js ("foo"): `prompts.system` points at "system.md" but no such file exists at /…/tests/foo/system.md.
tests/foo/config.js: `label` is "foo" but the directory is named "bar". …
Template references unknown value: {{packages.ds.name}}. Available top-level keys: label, packages, …
```

### Bootstrap a new test setup

1. Copy `agent-tester.config.example.js` to `agent-tester.config.js` and edit the engine-level fields.
2. Run `npm run new-test -- <label>` to scaffold `tests/<label>/` with stubs.
3. Edit `tests/<label>/config.js`, `system.md`, and `user.md`.
4. (Optional) Set `AGENT_TESTER_CONFIG=path/to/other-config.js` to load a different config without editing files.

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
| `npm run new-test -- <label>` | Scaffold a new test directory under `tests/<label>/` |
| `npm run summarize` | Aggregate metrics across multiple runs |
| `npm run rebuild` | Re-parse and re-screenshot existing output |
| `npm run rescreenshot` | Re-capture screenshots for existing output |
| `npm run reperf` | Re-run Lighthouse measurements |
| `npm run rediff` | Re-compute visual diffs across all runs |
| `npm test` | Run unit tests (vitest) |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

All scripts accept `--prompt <label>|all` to filter by test (`both` is also accepted as an alias for `all`).

## Summarizing Multiple Runs

```sh
npm run summarize                          # All runs, every test
npm run summarize -- --count 5             # Last 5 runs
npm run summarize -- --from 2026-05-14/14.00 --save  # Since a date, save to file
npm run summarize -- --prompt variant      # Variant test only
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
