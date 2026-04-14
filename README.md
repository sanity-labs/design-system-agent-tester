# Agent Tester

A test harness for running AI agents in parallel to measure output consistency and quality. Each agent runs independently with zero shared context. The harness validates that every generated app actually renders in a browser before considering the job complete.

## What It Does

Sends a prompt to Claude N times in parallel, collects the generated code, validates each app renders without fatal errors, auto-fixes broken output, and produces a report measuring:

1. **Average time** to complete each iteration (including fix cycles)
2. **Average lines of code** produced
3. **Code variance** across iterations (pairwise Jaccard similarity on 3-gram sets)
4. **Unique Sanity UI components** used across all iterations
5. **Screenshots** of each generated app (saved to `output/`)
6. **Fix attempts** — how many error→fix cycles were needed before the page rendered
7. **Sanity UI feedback** — friction points and developer experience issues reported by each agent
8. **Accessibility compliance** — WCAG 2.2 AA violations in each generated app (via Puppeteer + axe-core)

## How It Works

Each iteration follows a **generate → validate → fix** loop:

1. **Generate** — Claude produces all project files from the prompt, plus structured feedback on Sanity UI friction points
2. **Validate** — The harness installs deps, starts a Vite dev server, opens the page in headless Chrome, and checks for fatal JS errors + visible rendered content
3. **Fix** (if needed) — If the page has fatal errors or fails to render, the current project files and browser errors are sent back to Claude with instructions to fix them
4. **Repeat** — Steps 2–3 repeat until the page renders successfully or the max fix attempts are exhausted
5. **Screenshot** — Once validated (or after max attempts), a screenshot is captured

This means an iteration is not considered complete until the app works. The number of fix cycles needed is tracked as a quality metric.

### MCP Tool Use

When the training prompt references the Sanity UI MCP server, the API runner automatically starts a local MCP server process and registers its tools with the Anthropic SDK. This enables the model to call design system tools (`list_components`, `get_component_guideline`, `validate_icons`, etc.) during generation — fetching real component docs, props, and best practices before writing code.

The tool-use conversation is multi-turn: the model calls tools, receives results, and continues until it has enough context to generate the project files. A safety limit (25 turns) prevents infinite tool-call loops, and duplicate calls are detected and short-circuited.

MCP tool interactions are logged per-iteration as `_mcp_tool_log.json`.

To disable MCP (e.g. for a pure baseline comparison), pass `--no-mcp`.

### Feedback Collection

The system prompt instructs Claude to emit a structured `---FEEDBACK---` block after all file output. Each feedback item is tagged with a category (`documentation`, `api`, `components`, `theming`, `icons`, `dx`, `other`) and describes a specific friction point encountered while implementing with Sanity UI.

The report aggregates feedback across all iterations: a deduplicated summary of unique items, a breakdown by category, and a full per-iteration line-item list. Feedback is also saved per-iteration as `_feedback.json`.

## Setup

```
npm install
```

Puppeteer downloads a bundled Chromium on first install.

### Environment Variables

Create a `.env` file in the project root:

```
ANTHROPIC_API_KEY=sk-ant-...
```

The `.env` file is loaded automatically by all npm scripts via Node's `--env-file` flag. It is gitignored.

## Runners

There are two ways to run the harness, depending on how you want to authenticate.

### API runner (default)

Uses the Anthropic SDK directly. Requires `ANTHROPIC_API_KEY` in `.env` or as an environment variable. Supports MCP tool use for training prompts.

```
node --env-file=.env src/index.js --runner api
```

### CLI runner

Uses the `claude` CLI tool, which manages its own auth session. If you've already run `claude` and logged in, this just works — no environment variables required. MCP tools are accessed via the CLI's own MCP server configuration.

```
node src/index.js --runner cli
```

> **Note:** The CLI runner does not report token usage since that data isn't exposed by the `claude` command. The CLI runner also cannot handle very large prompts (>~5KB) reliably — use the API runner for the training prompt.

#### Installing the Claude CLI

If you don't have it yet:

```
npm install -g @anthropic-ai/claude-code
claude auth login
```

## Usage

```
# Current command being run for all existing tests
node --env-file=.env src/index.js --prompt both --iterations 3 --model claude-sonnet-4-6 --no-mcp

# Run both prompts with the API runner (default, 3 iterations each)
node --env-file=.env src/index.js

# Run only the control prompt
node --env-file=.env src/index.js --prompt control

# Run only the training prompt
node --env-file=.env src/index.js --prompt training

# Configure iterations, model, and max fix attempts
node --env-file=.env src/index.js --prompt control --iterations 5 --model claude-sonnet-4-20250514 --max-fixes 3

# Limit concurrency
node --env-file=.env src/index.js --iterations 10 --concurrency 3

# Disable MCP tool use (pure baseline — no design system context)
node --env-file=.env src/index.js --prompt training --no-mcp

# Skip screenshots (and the validate/fix loop)
node --env-file=.env src/index.js --no-screenshot

# Use the CLI runner
node src/index.js --runner cli --prompt control
```

### Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--prompt` | `-p` | `both` | Which prompt to run: `control`, `training`, or `both` |
| `--iterations` | `-n` | `3` | Number of independent agent runs per prompt |
| `--model` | `-m` | `claude-sonnet-4-20250514` | Claude model to use (see [Models](#models) below) |
| `--runner` | `-r` | `api` | Runner backend: `api` (SDK, needs `ANTHROPIC_API_KEY`) or `cli` (claude command, no key needed) |
| `--max-fixes` | `-f` | `5` | Max error→fix cycles per iteration before giving up |
| `--concurrency` | `-c` | `2` | Max parallel agent calls. Capped at 2 by default to avoid rate limiting on slower models. Set higher with `--concurrency 5` if your API tier supports it. |
| `--screenshot` | `-s` | `true` | Capture screenshots and run the validate/fix loop |
| `--no-mcp` | | `false` | Disable MCP tool use. By default, MCP is auto-detected from prompt content (enabled when the prompt mentions "MCP"). Pass `--no-mcp` to force it off. |
| `--no-copy-assets` | | `false` | Disable copying asset directories (e.g. `ui-poc/`) into each generated project before validation. By default, any directories listed in `COPY_ASSETS` are copied into the project so agents can reference local libraries. |

### Models

The `--model` flag accepts any Claude model ID. Here are the available options:

#### Current generation (Claude 4.6)

| Model | ID | Tier | Context | Max Output | Speed | Cost (input / output per 1M tokens) |
|-------|-----|------|---------|------------|-------|--------------------------------------|
| **Claude Opus 4.6** | `claude-opus-4-6` | Most intelligent | 1M tokens | 128k tokens | Moderate | $5 / $25 |
| **Claude Sonnet 4.6** | `claude-sonnet-4-6` | Best speed/intelligence balance | 1M tokens | 64k tokens | Fast | $3 / $15 |
| **Claude Haiku 4.5** | `claude-haiku-4-5` | Fastest, near-frontier | 200k tokens | 64k tokens | Fastest | $1 / $5 |

#### Previous generation (Claude 4)

| Model | ID | Tier | Context | Max Output | Speed | Cost (input / output per 1M tokens) |
|-------|-----|------|---------|------------|-------|--------------------------------------|
| **Claude Opus 4** | `claude-opus-4-20250514` | Most intelligent (v4) | 200k tokens | 32k tokens | Moderate | $15 / $75 |
| **Claude Sonnet 4** | `claude-sonnet-4-20250514` | Balanced (v4) | 200k tokens | 64k tokens | Fast | $3 / $15 |

#### Aliases

You can also use short aliases with the Claude CLI runner:

| Alias | Resolves to |
|-------|-------------|
| `opus` | Latest Claude Opus |
| `sonnet` | Latest Claude Sonnet |
| `haiku` | Latest Claude Haiku |

#### Examples

```
# Use the latest Opus (most capable, highest cost)
node --env-file=.env src/index.js --model claude-opus-4-6

# Use Sonnet 4 (default — good balance of quality and cost)
node --env-file=.env src/index.js --model claude-sonnet-4-20250514

# Use the latest Sonnet 4.6
node --env-file=.env src/index.js --model claude-sonnet-4-6

# Use Haiku (fastest, cheapest — good for quick iteration)
node --env-file=.env src/index.js --model claude-haiku-4-5
```

### npm Scripts

```
npm run test:control          # Control prompt, API runner
npm run test:training         # Training prompt, API runner
npm run test:both             # Both prompts, API runner

npm run test:control:cli      # Control prompt, CLI runner
npm run test:training:cli     # Training prompt, CLI runner
npm run test:both:cli         # Both prompts, CLI runner

npm run rescreenshot          # Re-screenshot all iterations (latest run)
npm run rescreenshot:control  # Re-screenshot control iterations only
npm run rescreenshot:training # Re-screenshot training iterations only

npm run rebuild               # Re-parse raw responses, rewrite projects, re-screenshot (latest run)
npm run rebuild:control       # Rebuild control iterations only
npm run rebuild:training      # Rebuild training iterations only

npm run test:a11y             # Run standalone a11y tests against latest run
npm run test:a11y:control     # A11y tests for control iterations only
npm run test:a11y:training    # A11y tests for training iterations only
```

## Output

Each run creates a timestamped directory under `output/`:

```
output/
├── 2026-03-18-14.30/                  # One directory per run, timestamped YYYY-MM-DD-HH.MM
│   ├── report.json                    # Machine-readable report (includes accessibility data)
│   ├── report.md                      # Human-readable Markdown report
│   ├── control/
│   │   ├── iteration-1/
│   │   │   ├── project/               # Generated (and fixed) project files
│   │   │   ├── screenshot.png         # App screenshot
│   │   │   ├── _raw_response.txt      # Initial Claude response
│   │   │   ├── _feedback.json         # Parsed feedback items
│   │   │   ├── _fix_response_1.txt    # First fix response (if needed)
│   │   │   ├── _fix_response_2.txt    # Second fix response (if needed)
│   │   │   ├── _console_errors.txt    # Final browser console errors (if any)
│   │   │   ├── _meta.json            # Metrics including fixAttempts, fixLog, feedback, and a11yResults
│   │   │   └── _a11y_results.json     # Accessibility test results (7 WCAG tests per iteration)
│   │   ├── iteration-2/
│   │   └── ...
│   └── training/
│       ├── iteration-1/
│       │   ├── ...                    # Same files as control iterations
│       │   └── _mcp_tool_log.json     # MCP tool call log (only when MCP is enabled)
│       └── ...
├── 2026-03-19-09.15/                  # Previous runs are preserved
│   └── ...
└── ...
```

Accessibility tests run automatically after each iteration successfully builds. Results are included in both the per-iteration `_a11y_results.json` and the summarized `report.json` / `report.md`.

## MCP Integration

The harness integrates with the **Sanity UI MCP server** (`sanity-ui-mcp`) to give the model access to real design system data during generation.

### How It Works

1. The API runner detects that the prompt references MCP (the word "mcp" appears in the prompt content)
2. It spawns the local `sanity-ui-mcp` server as a child process using the MCP stdio protocol
3. The server's tool definitions are registered with the Anthropic SDK as tools
4. The model can call tools like `list_components`, `get_component_guideline`, `validate_icons`, etc.
5. Each tool call is routed to the MCP server, and the result is sent back to the model
6. This continues in a multi-turn loop until the model has enough context and starts generating code

### Available MCP Tools

| Tool | Description |
|------|-------------|
| `list_components` | Browse all Sanity UI components, filterable by category |
| `get_component_guideline` | Get props, usage, best practices, accessibility, variants for a component |
| `list_icons` | Browse icons from `@sanity/icons` with search |
| `get_icon_details` | Get details and usage guidelines for a specific icon |
| `search_design_system` | Free-text search across all design system entities |
| `validate_icons` | Verify icon names exist before writing code |

### MCP Server Setup

The Sanity UI MCP server must be installed locally:

```
# The server is expected at this path (configurable in src/mcp-client.js)
/Users/pj/Documents/Labs/sanity-ui-mcp
```

It is run via `uv`:

```
uv run --directory /path/to/sanity-ui-mcp mcp run main.py
```

### Disabling MCP

```
# Force MCP off for a training prompt run
node --env-file=.env src/index.js --prompt training --no-mcp
```

When MCP is disabled, the training prompt behaves like the control prompt — the model generates code from its training data only, with no design system tool access.

## Accessibility Testing

Accessibility tests run **automatically** as part of the main harness. When an iteration's generated app successfully renders, the runner immediately tests it for WCAG 2.2 AA compliance using Puppeteer + axe-core. Results are saved per-iteration (`_a11y_results.json`) and aggregated in the final report.

### What It Tests

Each iteration is checked with seven accessibility tests:

| Test | What it checks |
|------|----------------|
| **axe-core violations** | Full WCAG 2.2 AA + best-practice scan via axe-core |
| **Images without alt** | `<img>` elements missing the `alt` attribute |
| **Keyboard accessibility** | All interactive elements (buttons, links, inputs) can receive focus |
| **ARIA references** | `aria-labelledby`, `aria-describedby`, `aria-controls`, etc. all point to existing DOM IDs |
| **Color contrast** | Targeted axe-core `color-contrast` rule with detailed per-node reporting |
| **Page language** | `<html>` has a non-empty `lang` attribute (WCAG 3.1.1) |
| **Landmark structure** | At least one landmark region exists (`<main>`, `<nav>`, `<header>`, `[role="main"]`, etc.) |

### Report Output

The Markdown report includes an **♿ Accessibility** section per prompt with:

- Total and average axe violations per iteration
- Pass rate per test across all iterations
- Most common axe violation IDs ranked by frequency
- Per-iteration pass/fail/skip summary

### Standalone Playwright Tests

You can also re-run accessibility tests independently against existing output using Playwright:

```
# Install Playwright browsers (one-time)
npm run test:a11y:install

# Test all iterations in the latest run
npm run test:a11y

# Test only control prompt outputs
npm run test:a11y:control

# Test only training prompt outputs
npm run test:a11y:training

# Test a specific iteration
A11Y_ITERATION=2 npm run test:a11y:control

# Point at a specific run directory
A11Y_RUN_DIR=output/2026-03-18-14.30 npm run test:a11y
```

The standalone Playwright tests auto-detect the latest timestamped run directory under `output/`, or you can point at a specific one with `A11Y_RUN_DIR`.

### Results Format

Each iteration gets an `_a11y_results.json` file:

```json
{
  "label": "control-iter-1",
  "timestamp": "2026-03-18T12:30:00.000Z",
  "tests": {
    "axe-core": { "status": "failed", "details": { "violationCount": 3, "..." : "..." } },
    "images-alt": { "status": "passed", "details": { "missingAltCount": 0 } },
    "keyboard-accessible": { "status": "passed", "details": { "totalInteractive": 8, "notFocusableCount": 0 } },
    "aria-references": { "status": "passed", "details": { "brokenCount": 0 } },
    "color-contrast": { "status": "passed", "details": { "violationCount": 0 } },
    "page-lang": { "status": "passed", "details": { "lang": "en" } },
    "landmark-structure": { "status": "passed", "details": { "landmarkCount": 2, "landmarks": ["main (1)", "nav (1)"] } }
  },
  "axeViolationCount": 3,
  "axeViolations": ["..."],
  "summary": { "totalTests": 7, "passed": 6, "failed": 1, "skipped": 0 }
}
```

### Environment Variables (Playwright)

| Variable | Example | Description |
|----------|---------|-------------|
| `A11Y_PROMPT` | `control` | Only test iterations for this prompt (Playwright only) |
| `A11Y_ITERATION` | `2` | Only test a specific iteration number (Playwright only) |
| `A11Y_RUN_DIR` | `output/2026-03-18-14.30` | Point Playwright at a specific run directory |

## How Isolation Works

Each iteration makes a completely independent call to Claude with no shared conversation history, no access to other iterations' output, and its own output directory. The system prompt instructs the model to emit all files in a parseable `---FILE: path---` block format.

Fix calls are also isolated — they are standalone requests with only the current iteration's files and errors as context. There is no multi-turn conversation carried across fix attempts.

- **API runner:** Creates a fresh `Anthropic()` client call each time — no conversation state carries over. When MCP is enabled, a fresh MCP server process is started per iteration and shut down after generation completes.
- **CLI runner:** Spawns a separate `claude --print` process per call with `--no-session-persistence`. When MCP is enabled, the CLI accesses the `sanity-ui` MCP server via its own user-level config.

## Architecture

- **`src/index.js`** — CLI entry point, argument parsing, runner selection, orchestration with bounded concurrency. Creates a timestamped run directory per invocation.
- **`src/runner.js`** — API runner: generate → validate → a11y test → fix loop using the Anthropic SDK (requires `ANTHROPIC_API_KEY`). Supports MCP tool use via `src/mcp-client.js`.
- **`src/runner-cli.js`** — CLI runner: same generate → validate → a11y test → fix loop using `claude --print` (no API key needed). Supports MCP via the CLI's MCP server config.
- **`src/mcp-client.js`** — Lightweight MCP stdio client. Spawns the local Sanity UI MCP server, performs the JSON-RPC handshake, and exposes `callTool()` / `getToolsForAnthropic()` for the API runner.
- **`src/screenshot.js`** — Shared validation and screenshot pipeline: `validateProject()` (install, serve, check for errors/render), `captureScreenshot()`, `killDevServer()`
- **`src/a11y.js`** — Inline accessibility testing module: runs 7 WCAG 2.2 AA tests via Puppeteer + axe-core against a live dev server
- **`src/analyze.js`** — Shared utilities: file parsing, Sanity UI component extraction, source file detection
- **`src/report.js`** — Aggregates results and generates JSON + Markdown reports (includes fix attempts, feedback, and accessibility metrics)
- **`src/rescreenshot.js`** — Re-run the screenshot pipeline on existing iteration output. Auto-detects latest timestamped run dir.
- **`src/rebuild.js`** — Re-parse raw responses, rewrite project files, and re-screenshot. Auto-detects latest timestamped run dir.
- **`a11y/playwright.config.ts`** — Playwright config for standalone accessibility tests (chromium only, sequential, no shared webServer)
- **`a11y/tests/output-accessibility.test.ts`** — Discovers iteration outputs in timestamped run dirs and runs WCAG 2.2 AA tests against each

## Dependencies

- `@anthropic-ai/sdk` — Claude API client (only used by the API runner)
- `puppeteer` — Headless Chrome for validation, screenshots, and inline accessibility testing
- `axe-core` — WCAG accessibility engine, injected into Puppeteer pages for inline testing
- `@playwright/test` — Test runner for standalone accessibility tests (dev dependency)
- `@axe-core/playwright` — axe-core integration for Playwright (dev dependency)
- `typescript` — TypeScript compiler for the a11y test files (dev dependency)
