# Design system agent tester

Tests AI agents' ability to use a design system. Each test runs a group of agents against the same prompt to build an interface; results are averaged, compared, and collated into a report. Read all about it in our [Sanity blog post](https://www.sanity.io/engineering/design-system-evals?utm_source=github&utm_medium=readme).

## Setup

Not published to npm — clone, install, run from the working tree.

Prerequisites: Node.js ≥ 22.12, an Anthropic API key, macOS or Linux (Windows needs WSL).

```sh
npm install
cp agent-tester.config.example.js agent-tester.config.js   # then edit it
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env
```

> **Safety:** the harness runs AI-generated code and installs whatever packages the agent imports. Run it in a sandbox if you don't fully trust the output. See [SECURITY.md](SECURITY.md).

Notes: Puppeteer downloads Chromium on first install (~150MB). `output/` grows fast (screenshots + logs per iteration) — prune with `npm run clean-output`.

## Run it

```sh
npm start -- --test all                          # every test, 3 iterations each
npm start -- --test shad-cn --iterations 10       # one test, more iterations
npm start -- --test carbon,spectrum               # a few tests
npm start -- --test all --yes                     # skip the cost-warning delay
```

Output lands in `output/<date>/<time>/`. Only one run at a time per machine — a lock file blocks concurrent runs (they'd contend for resources and invalidate each other's measurements). Open `report.md` for the comparison.

### Options

| Flag | Default | What it does |
|---|---|---|
| `--test`, `-t` | `all` | Which test(s) to run. A label, `all`, or a comma list. |
| `--iterations`, `-n` | `3` | How many times to run each test. |
| `--model`, `-m` | `claude-sonnet-4-6` | Claude model ID. |
| `--models` | — | Comma-separated model IDs — runs every test on every model. |
| `--max-fixes`, `-f` | `5` | Max error→fix cycles per iteration. |
| `--no-fix-accessibility` | — | Measure axe violations but don't send the agent back to fix them. |
| `--concurrency`, `-c` | `1` | Max parallel agent iterations. |
| `--no-screenshot` | — | Skip browser validation and browser-based metrics. |
| `--agent-prompt` | off | Generate a fresh brief from Claude instead of the static default. |
| `--yes`, `-y` | off | Skip the cost-warning startup delay. |

Model IDs are retired over time — see [Anthropic's docs](https://docs.anthropic.com/en/docs/about-claude/models) for current ones. A few models get hardcoded request-parameter overrides (e.g. Fable's effort level) — see `modelTuning()` in `src/pipeline/runner-api.js`. Any override is recorded in the report so tuned and default runs are never silently compared.

## Tests

`tests/` ships with reference examples for public design systems (Atlassian, Carbon, Gestalt, Lightning, Nord, Polaris, shadcn/ui, Spectrum, Zendesk Garden). No affiliation with these vendors — the names just identify which npm packages each test installs. Add your own to test systems you care about.

## Add a test

```sh
npm run new-test -- mylib
```

Creates `tests/mylib/` with `config.js`, `system.md`, `user.md`. Edit them, then `npm start -- --test mylib`.

```js
// tests/mylib/config.js
export default {
  label: "mylib",
  packages: { ui: { name: "mylib", version: "latest" } },
  prompts: { system: "system.md", user: "user.md" },
};
```

Prompt templates are markdown with `{{var}}` placeholders referencing any config field, plus `{{#if path}}…{{/if}}` / `{{#unless path}}…{{/unless}}`. The harness adds shared boilerplate (output format, feedback format, base rules) — you only write what's specific to this test. Need a computed value? Add a `derive(ctx)` function to `config.js`.

Other config fields — see inline docs in `src/config/prompts.js` for full details:

| Field | What it does |
|---|---|
| `prompts.fixSystem` | Extra fix-loop rules. |
| `mcp` | MCP server for this test (see below). |
| `docsPath` | Docs file inlined as `{{docs}}`. |
| `reactVersion` | Exposed as `{{reactVersion}}`. |
| `measure` | `{ screenshots, performance, visualDiff }` booleans, default `true`. |
| `effort` | `"low"` – `"max"`, sets `output_config.effort` where supported. |
| `preflight` | `() => void` run before iterations start — abort the run on a broken fixture/config. |

### Per-test MCP

A test that needs an MCP server adds an `mcp` block; the harness spawns it and registers its tools. Tests without `mcp` run with no tools.

```js
mcp: {
  command: "node",
  args: (dir) => [resolve(dir, "src/index.js")],
  defaultDirectory: "/absolute/path/to/your-mcp",
  env: { DOCS_PATH: "/abs/path/to/docs.json" },      // optional
  lintTool: "your_lint_tool",                        // optional — harness's post-render lint gate
  excludeToolsForNonReasoningModels: ["your_lint_tool"], // optional
  groundingCheck: { pattern: /your_verify_tool/i, nudge: "…" }, // optional
  fixLoop: false,                                    // optional — default true
}
```

See the inline comments in `src/pipeline/runner-api.js` for what each optional field does. `{{#if requiresMcp}}` is true in templates whenever an `mcp` block is present.

**The fix loop gets the same tools as the build.** Repair turns spawn the server and register its tools, exactly as initial generation does. Set `fixLoop: false` to make repair turns tool-free.

This default flipped on 2026-09-09. Before that, every fix attempt was a stateless call carrying only the fix-system prompt and the broken files — no conversation history and no tools — which left the fix loop strictly less informed than the build that preceded it. It penalised tests whose knowledge lives in the MCP rather than in a hand-written fix prompt. In one Haiku run a front-loading arm spent all 16 of its fix rounds on the same `@sanity/icons` import trap and passed none of its first three iterations, because recovering needed one fact it could not look up. Note that repair turns now cost tool-call tokens, and each one starts and stops the server, adding a few seconds per attempt.

> **Security:** `command`/`args` here run as a real child process. Treat every test `config.js` as trusted code. See [SECURITY.md](SECURITY.md).

### Disable a test

Rename `tests/foo/` to `tests/foo.disabled/` (or prefix with `_`).

## Briefs

Every test in a run gets the same interface brief, so results stay comparable. `briefs/default.js` defines it: `staticBrief` (default, one fixed sentence) or, with `--agent-prompt`, a fresh PRD-style brief generated by Claude per run.

## What the report measures

| Section | Metric |
|---|---|
| Timing | Build time per iteration. |
| Lines of code | Avg, std dev, min, max. |
| Code variance | 3-gram Jaccard similarity. |
| Fix attempts | Clean-on-first-try rate, avg fixes. |
| Components | Unique components and icons used. |
| Feedback | Agent friction reports, by category. |
| Accessibility | axe-core violations, light + dark. |
| Performance | FCP, LCP, TBT, TTI, Lighthouse score. |
| Component usage | JSX instance counts per component. |
| Inline styles | Count by component, top CSS properties. |
| DOM elements | Total rendered count. |
| Semantic HTML | Semantic vs generic tags, ARIA roles. |
| Visual diff | Pairwise pixel comparison. |
| Screenshots | 8 per iteration (4 breakpoints × light/dark). |

## Other scripts

| Script | Purpose |
|---|---|
| `npm run new-test -- <label>` | Scaffold a new test directory. |
| `npm run summarize` | Aggregate metrics across runs. |
| `npm run capture-screenshots -- <path>` | Capture screenshots after the fact. |
| `npm run clean-output` | Reclaim disk space in `output/`. |
| `npm test` | Run unit tests. |

```sh
npm run summarize                                   # all runs
npm run summarize -- --count 5                      # last 5 runs
npm run summarize -- --test shad-cn                 # one test only
npm run summarize -- --from 2026-05-14/14.00 --save # since a date
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: see [SECURITY.md](SECURITY.md).
