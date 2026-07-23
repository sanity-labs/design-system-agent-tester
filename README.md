# Design system agent tester

Tests AI agents' ability to use a design system. The harness spins up one or more defined tests. Each test is populated with a group of agents to perform a task—all given the same prompt to make an interface. Each test's results are averaged, compared against the others, and collated in a report.

## Setup

This isn't published to npm. Clone, install, and run from the working tree.

Prerequisites:

- Node.js ≥ 22.12
- An Anthropic API key (`ANTHROPIC_API_KEY`).
- **macOS or Linux.** Windows is untested — the harness shells out to POSIX tools (e.g. `du`) and relies on POSIX process-group signals, so use WSL on Windows.

```sh
npm install
cp agent-tester.config.example.js agent-tester.config.js   # then edit it
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env
```

> **Safety:** the harness runs AI-generated code and `npm install`s whatever packages the agent decides to import. Run it in a sandbox (a VM or container) when you don't fully trust the output. See [SECURITY.md](SECURITY.md).

Notes:

- Puppeteer downloads Chromium on first install (~150MB).
- The `.env` approach above is convenient but not ideal — prefer `direnv` or a shell-level export to keep the key off disk.
- Pass `--yes` to skip the 5-second cost-warning delay at startup.
- Output grows quickly — each iteration writes 8 screenshots plus per-stage logs, so `output/` can reach gigabytes over many runs. Prune it with `npm run clean-output` (add `-- --dry-run` to preview first).

## Run it

```sh
# Run every test, 3 iterations each
npm start -- --test all

# One test, more iterations
npm start -- --test shad-cn --iterations 10

# A few specific tests
npm start -- --test carbon,spectrum

# Skip the cost-warning delay
npm start -- --test all --yes
```

Output lands in `output/<date>/<time>/`. One run per machine: a lock (`~/.agent-tester/run.lock`) makes a second concurrent run refuse to start — concurrent runs contend for CPU/npm/dev-server resources and invalidate each other's measurements. Stale locks from dead processes are stolen automatically.

The type-check stage is hardened against toolchain races: it runs the project's own `tsc` (never an npx-fetched one), pre-verifies `tsconfig.json` and dependency resolvability (one automatic reinstall if `node_modules` hasn't settled), and retries once when a failure contradicts the on-disk state — such retries are counted as **Toolchain flakes** in the report rather than agent errors. Open `report.md` to see the comparison.

### Options

| Flag | Default | What it does |
|---|---|---|
| `--test`, `-t` | `all` | Which test(s) to run. A label, `all`, or a comma list. |
| `--iterations`, `-n` | `3` | How many times to run each test. |
| `--model`, `-m` | `claude-sonnet-4-6` | Claude model ID. |
| `--models` | — | Comma-separated model IDs. Runs every test on every model (tests × models × iterations). Takes precedence over `--model`. |
| `--max-fixes`, `-f` | `5` | Max error→fix cycles per iteration. |
| `--no-fix-accessibility` | — | Still measure and report axe violations, but don't send the agent back to fix them (no fix budget spent on a11y, and an a11y repair can't regress a working build). |
| `--concurrency`, `-c` | `1` | Max parallel agent iterations. Default is sequential so Lighthouse / DOM measurements aren't biased by CPU contention. Pass `2+` to trade precision for wall-clock speed. |
| `--no-screenshot` | — | Skip browser validation and all browser-based metrics. |
| `--agent-prompt` | off | Generate a fresh brief from Claude (see Briefs below). |
| `--yes`, `-y` | off | Skip the cost-warning startup delay. |

### Models

See [Anthropic's documentation](https://docs.anthropic.com/en/docs/about-claude/models) for current model IDs. Pass via `--model`. The default is `claude-sonnet-4-6`. Model IDs are retired over time — if a run fails with a `404 not_found_error: model: …`, pass a current id via `--model`.

#### Comparing models

`--models` runs the same test suite across several models in one run:

```bash
node --env-file=.env src/index.js --test ui4-mcp --iterations 3 \
  --models claude-sonnet-4-6,claude-haiku-4-5
```

Every model receives the identical brief and prompts. Each test × model
combination gets its own output directory (`output/<run>/<test>/<model>/`)
and its own section in `report.json` / `report.md`, keyed `<test>/<model>`,
so per-model metrics are never mixed. Iterations stay independent across
models exactly as they are within one model. Single-model runs (via
`--model` or a one-item `--models`) keep the flat `output/<run>/<test>/`
layout and plain report keys, so existing tooling is unaffected.

#### Per-model request tuning

Most models run with the harness's default request settings. The exceptions are
hardcoded in `modelTuning()` in `src/pipeline/runner-api.js`:

| Model | Override | Why |
| --- | --- | --- |
| `claude-fable-*`, `claude-mythos-*` | `output_config: { effort: "medium" }` | Fable's extended thinking is always on and never returned by the API. At the default (`high`) effort it composes entire projects inside its reasoning and ends the turn with a summary instead of `---FILE:` blocks. Medium effort shifts it from deliberation to action. |

**Comparing results across models:** any override applied during a run is
recorded as `modelTuning` in `report.json` (per prompt), in each iteration's
`_meta.json`, and as a "Model tuning" row in `report.md` — so tuned results
are never silently compared against other models' default-settings results.
Related mechanisms for reasoning models (in-conversation emission nudges,
retry-attempt isolation) apply to all models and don't change request
settings.

## Tests

The `tests/` directory ships with nine reference examples covering public design systems:

- `atlaskit` — Atlassian Design System
- `carbon` — IBM Carbon Design System
- `gestalt` — Pinterest Gestalt
- `lightning` — Salesforce Lightning
- `nord` — Nordhealth Nord
- `polaris` — Shopify Polaris
- `shad-cn` — shadcn/ui
- `spectrum` — Adobe Spectrum
- `zendesk-garden` — Zendesk Garden

These are reference examples. Add your own to test the systems you care about. This project has no affiliation with these vendors. The names identify which public npm packages each test installs.

## Add a test

```sh
npm run new-test -- mylib
```

That creates `tests/mylib/` with three stub files:

```
tests/mylib/
├── config.js     ← packages, prompt paths
├── system.md     ← system prompt
└── user.md       ← user prompt
```

Edit them, then run `npm start -- --test mylib`. The directory name is the test's label.

### `config.js`

```js
export default {
  label: "mylib",
  packages: {
    ui: { name: "mylib", version: "latest" },
  },
  prompts: {
    system: "system.md",
    user: "user.md",
  },
};
```

### Prompt templates

Markdown with `{{var}}` placeholders. Reference any field from the test config:

```md
You are an expert frontend developer.

Install `{{packages.ui.name}}@{{packages.ui.version}}` and only use components from that package.
```

The harness adds boilerplate (output format, feedback format, base rules) on top. You only write what's specific to this test.

Three template constructs are supported:

- `{{path.to.value}}` — substitute a value
- `{{#if path}}…{{/if}}` — render if truthy
- `{{#unless path}}…{{/unless}}` — render if falsy

Need a derived value (e.g. a comma-joined list)? Add a `derive(ctx)` function to `config.js` that returns extra fields.

### Optional config fields

| Field | What it does |
|---|---|
| `prompts.fixSystem` | Extra fix-loop rules. Appended to engine base. |
| `mcp` | MCP server config for this test (see below). Presence enables MCP for this test only; absence runs the test without MCP. |
| `docsPath` | Path to a docs file. Inlined as `{{docs}}`. |
| `reactVersion` | String exposed as `{{reactVersion}}`. |
| `derive` | `(ctx) => object` adding fields to template context. |
| `measure` | `{ screenshots, performance, visualDiff }` — non-core report metrics, each an independent boolean defaulting to `true`. See below. |
| `effort` | `"low"` \| `"medium"` \| `"high"` \| `"xhigh"` \| `"max"`, or omitted/`null` for no override. Sets `output_config.effort` on every request for this test. Silently ignored on models that don't accept the parameter (any Haiku; older Sonnet/Opus). See below. |

#### Non-core measurements (`measure`)

Screenshots, Lighthouse/React-profiler performance, and the pairwise visual diff are each independently toggleable per test — useful for a test whose brief doesn't produce a meaningfully diffable UI, or to cut wall-clock time on a variant where those metrics aren't the point:

```js
// tests/<label>/config.js
measure: {
  screenshots: true,  // capture screenshots (DOM count / semantic HTML still run either way)
  performance: true,  // Lighthouse + React profiler
  visualDiff: true,    // pairwise pixel diff across the iteration set (needs `screenshots: true` to have anything to diff)
}
```

Omit `measure` entirely, or any of its keys, to keep the default (`true`).

#### Model effort (`effort`)

Some Claude models accept an `output_config.effort` request parameter ("low" through "max") that trades capability for token spend — see [Anthropic's effort docs](https://platform.claude.com/docs/en/build-with-claude/effort). Set it per test to tune cost/behavior for whichever models that test runs against:

```js
// tests/<label>/config.js
effort: "medium",
```

The harness only sends `output_config.effort` to models that actually accept it (currently: Fable, Mythos, Sonnet 4.6+, Opus 4.5+ — see `EFFORT_SUPPORTED_PREFIXES` in `runner-api.js`); it's silently omitted for any other model (e.g. every Haiku generation), so one `effort` value is safe to set even in a multi-model run.

**Reasoning models (Fable/Mythos) are hardcoded to `"medium"` and ignore this field entirely** — their adaptive thinking is always on and cannot be disabled, and at the API default (`"high"`) they've been observed composing entire files inside never-returned thinking and only emitting a summary instead of the project. `"medium"` is the only value validated end-to-end; `"low"` was tried (2026-07-22) and reproduced that exact failure — Fable abandoned file emission mid-generation and crashed the iteration. A test's `effort` field still applies normally to every other supported model.

`effort` also gates `{{isReasoningModel}}` in the system-prompt template context — a test's `system.md` can use `{{#if isReasoningModel}}…{{/if}}` / `{{#unless isReasoningModel}}…{{/unless}}` to keep reasoning-model-specific instructions (e.g. an explicit self-lint workflow) scoped to the models that actually need them, without paying their token cost on every other model.

### Per-test MCP

A test that needs an MCP server adds an `mcp` block to its `config.js`. The harness spawns the server, registers its tools, and lets the model call them during generation. Tests without `mcp` run with no tools at all.

```js
// tests/<label>/config.js
mcp: {
  command: "node",                                  // executable
  args: (directory) => [resolve(directory, "src/index.js")],  // array or (dir) => array
  defaultDirectory: "/absolute/path/to/your-mcp",   // where the server lives
  env: { DSDS_PATHS: "/abs/path/to/docs.dsds.json" }, // optional; object or (dir) => env
  toolPrefix: "mcp__your-server",                   // optional; reserved for tool-name filtering
}
```

Inside templates, `{{#if requiresMcp}}` is true whenever an `mcp` block is present. Prompts can branch on MCP availability without duplicating the check.

> **Security:** the `command` and `args` you declare here are spawned as a
> child process and run verbatim. Treat every test `config.js` as trusted
> code, and don't run tests whose config you haven't reviewed. See
> [SECURITY.md](SECURITY.md).

### Disable a test

Rename `tests/foo/` to `tests/foo.disabled/` (or prefix with `_`). The engine skips it.

## Briefs

Every test in a run gets the same interface brief. That keeps results comparable. `briefs/default.js` defines it (wired up via `briefGenerator` in `agent-tester.config.js`):

- By default, `staticBrief` is used — one fixed sentence describing the app to build.
- With `--agent-prompt`, Claude generates a fresh PRD-style brief per run using the `systemPrompt`, `domains`, and `buildUserMessage` fields.

Edit `briefs/default.js` (or point `briefGenerator` at your own module) to change what the agents are asked to build.

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
| `npm test` | Run unit tests. |

### Summarize across runs

```sh
npm run summarize                                   # All runs
npm run summarize -- --count 5                      # Last 5 runs
npm run summarize -- --test shad-cn                 # One test only
npm run summarize -- --from 2026-05-14/14.00 --save # Since a date
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security issues: see [SECURITY.md](SECURITY.md).
