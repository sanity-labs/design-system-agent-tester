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

## How It Works

Each iteration follows a **generate → validate → fix** loop:

1. **Generate** — Claude produces all project files from the prompt, plus structured feedback on Sanity UI friction points
2. **Validate** — The harness installs deps, starts a Vite dev server, opens the page in headless Chrome, and checks for fatal JS errors + visible rendered content
3. **Fix** (if needed) — If the page has fatal errors or fails to render, the current project files and browser errors are sent back to Claude with instructions to fix them
4. **Repeat** — Steps 2–3 repeat until the page renders successfully or the max fix attempts are exhausted
5. **Screenshot** — Once validated (or after max attempts), a screenshot is captured

This means an iteration is not considered complete until the app works. The number of fix cycles needed is tracked as a quality metric.

### Feedback Collection

The system prompt instructs Claude to emit a structured `---FEEDBACK---` block after all file output. Each feedback item is tagged with a category (`documentation`, `api`, `components`, `theming`, `icons`, `dx`, `other`) and describes a specific friction point encountered while implementing with Sanity UI.

The report aggregates feedback across all iterations: a deduplicated summary of unique items, a breakdown by category, and a full per-iteration line-item list. Feedback is also saved per-iteration as `_feedback.json`.

## Setup

```
npm install
```

Puppeteer downloads a bundled Chromium on first install.

## Runners

There are two ways to run the harness, depending on how you want to authenticate.

### API runner (default)

Uses the Anthropic SDK directly. Requires an `ANTHROPIC_API_KEY` environment variable.

```
export ANTHROPIC_API_KEY=sk-ant-...
node src/index.js --runner api
```

### CLI runner (no API key needed)

Uses the `claude` CLI tool, which manages its own auth session. If you've already run `claude` and logged in, this just works — no environment variables required.

```
node src/index.js --runner cli
```

> **Note:** The CLI runner does not report token usage since that data isn't exposed by the `claude` command.

#### Installing the Claude CLI

If you don't have it yet:

```
npm install -g @anthropic-ai/claude-code
claude auth login
```

## Usage

```
# Run both prompts with the API runner (default, 3 iterations each)
node src/index.js

# Run both prompts with the CLI runner (no API key)
node src/index.js --runner cli

# Run only the control prompt
node src/index.js --prompt control

# Run only the training prompt
node src/index.js --prompt training

# Configure iterations, model, and max fix attempts
node src/index.js --prompt control --iterations 5 --model claude-sonnet-4-20250514 --max-fixes 3

# Limit concurrency
node src/index.js --iterations 10 --concurrency 3

# Skip screenshots (and the validate/fix loop)
node src/index.js --no-screenshot
```

### Options

| Flag | Short | Default | Description |
|------|-------|---------|-------------|
| `--prompt` | `-p` | `both` | Which prompt to run: `control`, `training`, or `both` |
| `--iterations` | `-n` | `3` | Number of independent agent runs per prompt |
| `--model` | `-m` | `claude-sonnet-4-20250514` | Claude model to use |
| `--runner` | `-r` | `api` | Runner backend: `api` (SDK, needs `ANTHROPIC_API_KEY`) or `cli` (claude command, no key needed) |
| `--max-fixes` | `-f` | `5` | Max error→fix cycles per iteration before giving up |
| `--concurrency` | `-c` | `0` (unlimited) | Max parallel agent calls |
| `--screenshot` | `-s` | `true` | Capture screenshots and run the validate/fix loop |

### npm Scripts

```
npm run test:control          # Control prompt, API runner
npm run test:training         # Training prompt, API runner
npm run test:both             # Both prompts, API runner

npm run test:control:cli      # Control prompt, CLI runner
npm run test:training:cli     # Training prompt, CLI runner
npm run test:both:cli         # Both prompts, CLI runner

npm run rescreenshot          # Re-screenshot all iterations
npm run rescreenshot:control  # Re-screenshot control iterations only
npm run rescreenshot:training # Re-screenshot training iterations only

npm run rebuild               # Re-parse raw responses, rewrite projects, re-screenshot
npm run rebuild:control       # Rebuild control iterations only
npm run rebuild:training      # Rebuild training iterations only
```

## Output

Results are written to `output/`:

```
output/
├── report.json                    # Machine-readable report
├── report.md                      # Human-readable Markdown report
├── control/
│   ├── iteration-1/
│   │   ├── project/               # Generated (and fixed) project files
│   │   ├── screenshot.png         # App screenshot
│   │   ├── _raw_response.txt      # Initial Claude response
│   │   ├── _feedback.json         # Parsed feedback items
│   │   ├── _fix_response_1.txt    # First fix response (if needed)
│   │   ├── _fix_response_2.txt    # Second fix response (if needed)
│   │   ├── _console_errors.txt    # Final browser console errors (if any)
│   │   └── _meta.json             # Metrics including fixAttempts, fixLog, and feedback
│   ├── iteration-2/
│   └── ...
└── training/
    ├── iteration-1/
    └── ...
```

## How Isolation Works

Each iteration makes a completely independent call to Claude with no shared conversation history, no access to other iterations' output, and its own output directory. The system prompt instructs the model to emit all files in a parseable `---FILE: path---` block format.

Fix calls are also isolated — they are standalone requests with only the current iteration's files and errors as context. There is no multi-turn conversation carried across fix attempts.

- **API runner:** Creates a fresh `Anthropic()` client call each time — no conversation state carries over.
- **CLI runner:** Spawns a separate `claude --print` process per call with `--no-session-persistence` and all tools disabled.

## Architecture

- **`src/index.js`** — CLI entry point, argument parsing, runner selection, orchestration with bounded concurrency
- **`src/runner.js`** — API runner: generate → validate → fix loop using the Anthropic SDK (requires `ANTHROPIC_API_KEY`)
- **`src/runner-cli.js`** — CLI runner: same generate → validate → fix loop using `claude --print` (no API key needed)
- **`src/screenshot.js`** — Shared validation and screenshot pipeline: `validateProject()` (install, serve, check for errors/render), `captureScreenshot()`, `killDevServer()`
- **`src/analyze.js`** — Shared utilities: file parsing, Sanity UI component extraction, source file detection
- **`src/report.js`** — Aggregates results and generates JSON + Markdown reports (includes fix attempt metrics)
- **`src/rescreenshot.js`** — Re-run the screenshot pipeline on existing iteration output
- **`src/rebuild.js`** — Re-parse raw responses, rewrite project files, and re-screenshot

## Dependencies

- `@anthropic-ai/sdk` — Claude API client (only used by the API runner)
- `puppeteer` — Headless Chrome for validation and screenshots