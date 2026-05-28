# Design system agent tester

Test AI agents' ability to use a design system. The harness spins up one or more defined tests. Each test is populated with a group of agents to perform a task. Each test is given the same prompt to make an interface. Each test's results are averaged and compared against the others. You get one report with each test's results.

## Setup

```sh
npm install
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env
```

## Run it

```sh
# Run every test, 3 iterations each
npm start -- --prompt all

# One test, more iterations
npm start -- --prompt variant --iterations 10

# A few specific tests
npm start -- --prompt control,variant

# Skip MCP
npm start -- --prompt all --no-mcp
```

Output lands in `output/<date>/<time>/`. Open `report.md` to see the comparison.

### Options

| Flag | Default | What it does |
|---|---|---|
| `--prompt`, `-p` | `all` | Which test(s) to run. A label, `all`, or a comma list. |
| `--iterations`, `-n` | `3` | How many times to run each test. |
| `--model`, `-m` | `claude-sonnet-4-6` | Claude model ID. |
| `--runner`, `-r` | `api` | `api` (SDK) or `cli` (Claude CLI). |
| `--max-fixes`, `-f` | `5` | Max error→fix cycles per iteration. |
| `--concurrency`, `-c` | `2` | Max parallel agent calls. |
| `--no-mcp` | off | Disable MCP for tests that opt in. |
| `--agent-prompt` | off | Generate a fresh brief from Claude. |

### Models

| Model | ID |
|---|---|
| Opus 4.7 | `claude-opus-4-7` |
| Sonnet 4.6 | `claude-sonnet-4-6` |
| Opus 4.6 | `claude-opus-4-6` |
| Haiku 4.5 | `claude-haiku-4-5` |

## Add a test

```sh
npm run new-test -- gestalt
```

That creates `tests/gestalt/` with three stub files:

```
tests/gestalt/
├── config.js     ← packages, prompt paths
├── system.md     ← system prompt
└── user.md       ← user prompt
```

Edit them, then run `npm start -- --prompt gestalt`. The directory name is the test's label.

### `config.js`

```js
export default {
  label: "gestalt",
  packages: {
    ui: { name: "gestalt", version: "latest" },
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
| `requiresMcp` | Enable MCP for this test. |
| `docsPath` | Path to a docs file. Inlined as `{{docs}}`. |
| `reactVersion` | String exposed as `{{reactVersion}}`. |
| `derive` | `(ctx) => object` adding fields to template context. |

### Disable a test

Rename `tests/foo/` to `tests/foo.disabled/` (or prefix with `_`). The engine skips it.

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
npm run summarize -- --prompt variant               # One test only
npm run summarize -- --from 2026-05-14/14.00 --save # Since a date
```
