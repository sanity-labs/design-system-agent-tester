# Design System Tester

A test harness that measures how effectively AI agents build interfaces using a design system. It runs multiple independent agent iterations against the same prompt, then evaluates the output across accessibility, performance, code quality, visual consistency, and developer experience.

While currently configured for the Sanity Design System, the tool is architecture-agnostic — swap `src/config/design-system.js` to test any design system.

## How It Works

1. **Generate** — An AI agent receives a prompt (interface brief + design system docs) and produces a complete Vite + React project
2. **Validate** — The harness installs dependencies, runs `tsc --noEmit`, starts a dev server, and checks for rendering errors
3. **Fix** — If validation fails, the agent is given the errors and asked to fix them (up to N cycles)
4. **Measure** — Once rendering, the harness captures screenshots (4 breakpoints × 2 color schemes), runs 13 accessibility tests, measures Lighthouse performance, counts DOM elements, and analyzes semantic HTML
5. **Analyze** — Inline styles, component usage, and code variance are extracted from the source
6. **Feedback** — The agent provides structured feedback on friction points encountered
7. **Report** — All data is aggregated into `report.json` and `report.md`

## Setup

```sh
git clone <repo-url>
cd design-system-tester
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
# Run both prompts (control + training), 3 iterations each
npm start -- --prompt both

# Training prompt only, 10 iterations, specific model
npm start -- --prompt training --iterations 10 --model claude-sonnet-4-6

# With MCP context (auto-detected from prompt content)
npm start -- --prompt training --iterations 5

# Disable MCP, use static brief
npm start -- --prompt training --no-mcp

# Generate a varied interface brief with an agent
npm start -- --prompt both --agent-prompt



# Use the CLI runner (no API key needed)
npm start -- --prompt control --runner cli
```

### Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--prompt` | `-p` | `both` | Which prompt to run: `control`, `training`, or `both` |
| `--iterations` | `-n` | `3` | Number of independent agent runs per prompt |
| `--model` | `-m` | `claude-sonnet-4-20250514` | Claude model ID |
| `--runner` | `-r` | `api` | `api` (Anthropic SDK) or `cli` (Claude CLI) |
| `--max-fixes` | `-f` | `5` | Max error→fix cycles per iteration |
| `--concurrency` | `-c` | `2` | Max parallel agent calls |
| `--screenshot` | `-s` | `true` | Capture screenshots and run the validate/fix loop |
| `--no-mcp` | | `false` | Disable MCP tool use |

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
├── src/
│   ├── index.js                    # Main entry point
│   ├── pipeline/                   # Core test pipeline
│   │   ├── runner-api.js           # Anthropic SDK runner
│   │   ├── runner-cli.js           # Claude CLI runner
│   │   ├── shared.js               # Shared runner logic
│   │   └── mcp-client.js           # MCP JSON-RPC transport
│   ├── evaluation/                 # Measurement & analysis
│   │   ├── accessibility.js        # 13 WCAG test categories + axe-core
│   │   ├── analyze.js              # File parsing, component/style extraction
│   │   ├── performance.js          # Lighthouse + React profiling
│   │   ├── screenshot.js           # Puppeteer capture + DOM analysis
│   │   └── visual-diff.js          # Pixel-level image comparison
│   ├── reporting/                  # Output generation
│   │   ├── report.js               # Per-run report (JSON + Markdown)
│   │   └── summarize.js            # Cross-run aggregation
│   ├── config/                     # Design-system-specific config
│   │   ├── design-system.js        # DS adapter (packages, components, rules)
│   │   ├── prompt-generator.js     # Interface brief generation
│   │   └── eslint-plugin/          # Custom lint rules
│   └── scripts/                    # Standalone re-run utilities
│       ├── rebuild.js              # Re-parse + re-screenshot existing output
│       ├── rescreenshot.js         # Re-capture screenshots only
│       ├── rediff-all.js           # Re-compute visual diffs
│       ├── refilter.js             # Regenerate report with exclusions
│       └── reperf.js               # Re-run Lighthouse measurements
├── prompts/                        # All prompt files
│   ├── system.md                   # System prompt for code generation
│   ├── system-fix.md               # System prompt for fix cycles

│   ├── PROMPT-CONTROL.md           # Control prompt (no DS training)
│   ├── PROMPT-WITH-TRAINING.md     # Training prompt (with DS docs)
│   └── PROMPT-WITH-TRAINING-MCP.md # Training + MCP variant
├── a11y/                           # Standalone Playwright a11y tests
├── output/                         # Test run output (YYYY-MM-DD/HH.MM/)

└── docs/                           # Architecture docs
```

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
        │   │   ├── _prompt.txt

        │   └── iteration-2/
        └── training/
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
| **Accessibility** | 13 WCAG test categories + axe-core violations |
| **Performance** | FCP, LCP, TBT, TTI, Lighthouse score, React mount/commit timing |
| **Component Usage** | JSX instance counts per component |
| **Inline Styles** | Count by component + top CSS properties used |
| **DOM Elements** | Total rendered DOM element count |
| **Semantic HTML** | Semantic vs generic tags, ARIA roles, semantic ratio |
| **Visual Diff** | Pairwise pixel comparison between iteration screenshots |
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

All scripts accept `--prompt control|training|both` to filter by prompt type.

## Summarizing Multiple Runs

```sh
npm run summarize                          # All runs, both prompts
npm run summarize -- --count 5             # Last 5 runs
npm run summarize -- --from 2026-05-14/14.00 --save  # Since a date, save to file
npm run summarize -- --prompt training     # Training only
```

## Configuring for a Different Design System

Edit `src/config/design-system.js`:

```js
export default {
  name: "Your Design System",
  packages: {
    designSystem: {
      name: "@your-org/design-system",
      components: ["Box", "Flex", "Grid", ...],
      cssImport: "@your-org/design-system/styles.css",
    },
    legacy: { name: "@your-org/ui" },
    icons: { name: "@your-org/icons" },
  },
  enforcedDeps: { "@your-org/design-system": "latest" },
  reactVersion: "^19.0",
  promptTrigger: "@your-org/design-system",
  // ...
};
```

Then update the prompts in `prompts/` to reference your design system's docs and components.

## Standalone Accessibility Tests

The Playwright-based a11y tests can re-run against existing output:

```sh
npm run test:a11y                                    # All iterations
A11Y_PROMPT=training npm run test:a11y               # Training only
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


