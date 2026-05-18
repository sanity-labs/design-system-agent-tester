# Thread Summary — Design System Tester

This document captures the full context of work done across this conversation thread. Use it to onboard into the codebase without re-reading the conversation.

## What This Tool Does

A test harness that measures how effectively AI agents (Claude) build interfaces using a design system. It runs N independent agent iterations against the same prompt, validates each generates a working app, then evaluates output across accessibility, performance, code quality, visual consistency, and developer experience feedback.

Currently configured for the Sanity Design System (`@sanity-labs/design-system`), but architecturally generic — swap `src/config/design-system.js` to test any design system.

## Project Structure (Current State)

```
src/
├── index.js                          # Main entry point, CLI parsing, orchestration
├── pipeline/                         # Core test pipeline
│   ├── runner-api.js                 # Anthropic SDK runner (~735 lines)
│   ├── runner-cli.js                 # Claude CLI runner (~600 lines)
│   ├── shared.js                     # Shared runner logic (~300 lines)
│   └── mcp-client.js                # MCP JSON-RPC stdio transport
├── evaluation/                       # Measurement & analysis
│   ├── accessibility.js              # axe-core WCAG tests (light + dark mode)
│   ├── analyze.js                    # File parsing, component/style extraction
│   ├── performance.js                # Lighthouse + React profiling
│   ├── screenshot.js                 # Puppeteer: validation, screenshots, DOM analysis
│   ├── visual-diff.js                # Pixel-level image comparison
│   └── a11y/                         # Standalone Playwright a11y tests
│       ├── playwright.config.ts
│       ├── tsconfig.json
│       └── tests/output-accessibility.test.ts
├── reporting/                        # Output generation
│   ├── report.js                     # Per-run report (JSON + Markdown)
│   └── summarize.js                  # Cross-run aggregation
├── config/                           # Design-system-specific configuration
│   ├── design-system.js              # DS adapter (all package names, components, rules)
│   └── prompt-generator.js           # Interface brief generation
└── scripts/                          # Standalone re-run utilities
    ├── rebuild.js, rescreenshot.js, rediff-all.js, refilter.js, reperf.js

prompts/                              # All prompt markdown files
├── system.md                         # System prompt for code generation
├── system-fix.md                     # System prompt for fix cycles
├── PROMPT-CONTROL.md                 # Control prompt (no DS training)
├── PROMPT-WITH-TRAINING.md           # Training prompt (with DS docs)
└── PROMPT-WITH-TRAINING-MCP.md       # Training + MCP variant

docs/                                 # Architecture documentation
├── refactoring-plan.md               # Refactoring plan document
├── type-checking-guidance.md         # tsc --noEmit guidance for developers
└── thread-summary.md                 # This file
```

## Pipeline Flow (Per Iteration)

1. **Generate** — Agent receives prompt + DS docs, produces a Vite+React project
2. **Post-process** — `enforceUiPocImports()` in `shared.js` mechanically patches:
   - Adds DS package to `package.json` if missing
   - Upgrades React to ^19.2
   - Rewrites imports from legacy package → DS package for configured components
   - Injects `styles.css` import in `main.tsx`
3. **Validate** — `npm install` → `tsc --noEmit` → start dev server → Puppeteer check
4. **Fix loop** — If validation fails, errors are sent to Claude for fix (up to N cycles). Post-processing re-runs after each fix to prevent the agent from reverting DS imports.
5. **Measure** — Screenshots (4 breakpoints × 2 color schemes = 8), axe-core a11y (light + dark), Lighthouse perf, DOM element count, semantic HTML analysis
6. **Analyze** — Inline styles (by component + CSS property), component usage counts, code variance (3-gram Jaccard)
7. **Feedback** — Agent provides structured `---FEEDBACK---` block with categorized friction points
8. **Report** — All data aggregated into `report.json` + `report.md`

## Key Design Decisions Made

### Design-System Adapter (`config/design-system.js`)
All Sanity-specific values live in one config file: package names, component lists, CSS imports, React version, MCP server path, prompt trigger string. To test a different design system, swap this file.

### Mechanical Import Enforcement
The model's training data overwhelmingly associates `Box`/`Flex`/`Card` with `@sanity/ui`. Prompt instructions alone (even in the system prompt, even repeated 47 times) fail to override this prior reliably. The harness mechanically rewrites imports after generation and after every fix cycle. This was tried 3 times with prompt-only approaches before mechanical enforcement was added.

### axe-core as Sole A11y Engine
Originally had 13 custom test categories (1,719 lines). Replaced with two axe-core scans (light + dark mode, 284 lines). The custom tests duplicated what axe-core already covers. Violations are deduplicated by rule ID and track which color scheme they appeared in.

### No Custom Lint Rules
Originally had 13 Sanity-specific ESLint rules (526 lines + 14 rule files). Removed because they were entirely Sanity-specific and couldn't be generalized. The `tsc --noEmit` step catches the type-level issues the most impactful rules targeted.

### Shared Runner Logic
`runner-api.js` and `runner-cli.js` shared ~600 lines of identical code. Extracted into `shared.js`: `enforceUiPocImports()`, `buildResult()`, `writeProjectFiles()`, `readProjectFiles()`, `buildFixPrompt()`, `buildCurrentFilesText()`, and all system prompt constants.

### Screenshots at Multiple Breakpoints
4 viewports (mobile 375×812, tablet 768×1024, laptop 1440×900, desktop 1920×1080) × 2 color schemes (light, dark) = 8 screenshots per iteration. Primary screenshot (`screenshot.png`) is laptop+light for backward compatibility with visual diff.

### DOM-Based Semantic HTML Analysis
Runs in Puppeteer against the rendered DOM, not JSX source. Counts every element as semantic (comprehensive MDN list: `nav`, `main`, `button`, `table`, `a`, `form`, `h1`–`h6`, etc.) or generic (`div`, `span`). Also counts ARIA `role` attributes. Reports a semantic ratio.

## What Was Removed

| Removed | Reason |
|---------|--------|
| AILF task generation | Sanity-specific (AILF = AI Language Feedback benchmark suite) |
| Contribution generation | Sanity-specific workflow |
| 13 custom a11y test categories | Replaced by axe-core |
| 13 ESLint rules + plugin | Sanity-specific |
| `ui-poc` directory copying | Package now installed via npm |
| `--no-copy-assets` flag | No longer needed |

## Key Files to Understand

| File | Purpose | Lines |
|------|---------|-------|
| `src/index.js` | Entry point — CLI parsing, concurrency, prompt loading, visual diff, report generation | ~380 |
| `src/pipeline/runner-api.js` | Anthropic SDK runner — generation, MCP tool use, fix loop | ~735 |
| `src/pipeline/shared.js` | Shared logic — import enforcement, buildResult, file I/O, prompts | ~300 |
| `src/config/design-system.js` | All DS-specific config values | ~86 |
| `src/evaluation/screenshot.js` | Puppeteer validation + screenshot + DOM analysis | ~430 |
| `src/evaluation/accessibility.js` | axe-core light+dark mode scans | ~284 |
| `src/reporting/report.js` | Report generation — 15 analysis functions + markdown renderer | ~1,200 |

## Tests

- **173 → 165 unit tests** (vitest) across 5 test files
- `analyze.js`: 68 tests (97.7% coverage)
- `shared.js`: 24 tests (71% coverage)
- `report.js`: 56 tests (36% statements, 64% functions)
- `design-system.js`: 14 tests (100%)
- `prompt-generator.js`: 3 tests
- Files at 0% require external services (Puppeteer, Lighthouse, Anthropic API)

Run: `npm test` / `npm run test:coverage`

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm start -- [flags]` | Run the test harness |
| `npm run summarize` | Aggregate metrics across runs |
| `npm run rebuild` | Re-parse + re-screenshot existing output |
| `npm run rescreenshot` | Re-capture screenshots only |
| `npm run reperf` | Re-run Lighthouse measurements |
| `npm run rediff` | Re-compute visual diffs |
| `npm test` | Unit tests |
| `npm run test:coverage` | Tests with coverage |
| `npm run test:a11y` | Standalone Playwright a11y tests |

## Output Structure

```
output/YYYY-MM-DD/HH.MM/
├── report.json, report.md
├── control/
│   └── iteration-N/
│       ├── project/                    # Generated code
│       ├── screenshot.png              # Primary (laptop+light)
│       ├── screenshot-{bp}-{mode}.png  # 7 additional screenshots
│       ├── _raw_response.txt           # Initial agent response
│       ├── _agent_log.txt              # Full agent conversation
│       ├── _feedback.json              # Parsed feedback
│       ├── _meta.json                  # All metrics
│       ├── _a11y_results.json          # Accessibility results
│       ├── _perf_results.json          # Performance results
│       ├── _npm_install.txt            # npm install logs (all attempts)
│       ├── _tsc_check.txt              # TypeScript check logs
│       ├── _console_errors.txt         # Browser console errors
│       └── _prompt.txt                 # Resolved prompt sent to agent
└── training/
    └── iteration-N/
        ├── (same as above)
        └── _mcp_tool_log.json          # MCP tool calls (if MCP enabled)
```

## Report Metrics

| Section | What it measures |
|---------|-----------------|
| Timing | Build time per iteration |
| Lines of Code | Code volume |
| Code Variance | 3-gram Jaccard similarity + structural file-path similarity |
| Fix Attempts | Clean-on-first-try rate, error categories |
| Components | Unique DS components and icons used |
| Feedback | Agent friction reports by category |
| Accessibility | axe-core violations (light + dark mode), pass rate |
| Performance | FCP, LCP, TBT, TTI, Lighthouse score, React mount/commit |
| Component Usage | JSX instance counts |
| Inline Styles | Count by component + top CSS properties |
| DOM Elements | Total rendered DOM count |
| Semantic HTML | Semantic vs generic tags, ARIA roles, semantic ratio |
| Visual Diff | Pairwise pixel comparison |
| Screenshots | 8 per iteration (4 breakpoints × 2 color schemes) |

## Known Issues / Incomplete Items

1. **Lighthouse crashes on Node 24** — `marky` library calls `performance.measure()` with unset marks. Each Lighthouse run is wrapped in try/catch; if all fail, only React profiling runs.
2. **MCP server path is hardcoded** in `config/design-system.js` (`/Users/pj/Documents/Projects/sanity-ui-mcp`). Should be an env var for portability.
3. **`@sanity-labs/ui-poc` references** still exist in `package.json` dependencies and in `shared.js`'s `enforceUiPocImports` function name. The function was renamed internally to use config but the export name wasn't changed for backward compatibility.
4. **Summarizer** (`reporting/summarize.js`) references `axeTotal`/`axeAvg` metric keys that may not match the new a11y result shape after the axe-core simplification.
5. **No integration tests** — unit tests cover pure functions only. Files requiring Puppeteer, Lighthouse, or Anthropic API have 0% coverage.
6. **`contributions/` directory** still exists at project root with a prototype icon registry contribution. It's not wired into anything — can be deleted or kept as reference.
