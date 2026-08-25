# Changelog

All notable changes to this project are documented here. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The harness is API-only. The `cli` runner and the `--runner` flag were
  removed; runs use the Anthropic SDK and require `ANTHROPIC_API_KEY`
  (except for an all-local-model run — see Added).
- The startup cost warning is now model-aware (it notes that higher-tier
  models such as Opus cost several times the rough Sonnet estimate), and
  shows a no-cost variant for local-model runs.
- Generative-UI mode is clearly marked **experimental** in the CLI banner,
  the standalone runner, and the README.
- MCP tool names the harness previously hardcoded for one specific server
  (a self-lint tool and its exclusion for non-reasoning models, and the
  in-conversation "grounding" verification-tool pattern) are now supplied
  per test via `mcp.lintTool`, `mcp.excludeToolsForNonReasoningModels`, and
  `mcp.groundingCheck` — the harness makes no assumption about any
  particular MCP server's tool names.
- README substantially condensed — deep implementation rationale moved into
  source-file comments and pointed at instead of repeated inline.

### Added

- Local-model support: pass an Ollama tag (e.g. `qwen2.5-coder:14b`, any
  model ID containing a colon) to `--model`/`--models` to run generation
  against a local model instead of the Anthropic API. Skips the API-key
  requirement and cost warning when every model in the run is local; a
  mixed run still requires the key for its Claude models. `--agent-prompt`
  brief generation always uses the default Claude model regardless of the
  run's target model, since it's a one-off PRD-writing call, not part of
  the model under test.
- Per-test `preflight` hook (`config.js`): a function run once, synchronously,
  before that test's iterations start — for cheap up-front checks (a broken
  external tool config, a stale fixture path) that would otherwise fail
  silently deep into a run.
- A missing `ANTHROPIC_API_KEY` now fails fast with a clear message.
- `.nvmrc` and `engine-strict` to keep installs on the supported Node floor.
- README notes recommending a sandbox for untrusted runs and pointing at
  `npm run clean-output` for the (fast-growing) `output/` directory.
- Biome as the linter/formatter (`npm run lint`, `npm run format`), enforced
  in CI, plus a documented macOS/Linux support matrix.
- `clean-diff-images` can now also delete screenshots (`--screenshots` /
  `--screenshots-only`), not just visual-diff images.
- A generic fix-loop hint for a `Cannot find module 'X'` error, pointing at
  adding `X` to `package.json` — a weaker model was previously shown this
  exact error across two fix attempts and made no change either time.

### Fixed

- Updated the default model to a current id (`claude-sonnet-4-6`). The
  previous default (`claude-sonnet-4-20250514`) had been retired, so every
  default run failed immediately with a `404 not_found_error`.
- A failed iteration now writes its error (and stack) to `_error.txt` in the
  iteration directory instead of only logging to the terminal, so failures
  are diagnosable from the run artifacts.
- A dev-server crash before "ready" (e.g. a missing devDependency) now
  surfaces the real underlying error instead of just "exited with code 1" —
  previously the model had no way to diagnose the actual cause and burned
  fix attempts guessing.
- `package.json` is never elided from the fix-loop prompt, even when
  unchanged and unreferenced by the current error. A "Cannot find module"
  error names the file that *imports* the missing package, never
  `package.json` itself, so the one file a dependency fix needed to see was
  exactly the file getting hidden — a model observed doing this fabricated
  an entirely different, broken `package.json` from scratch instead of a
  one-line edit.
- File-block parsing now tolerates a `---FILE: path` header missing its
  trailing `---`, and no longer risks a missing trailing `---` causing the
  parser to match a stray `---` sequence inside the file's own content.
- A test's `preflight` config field is no longer silently dropped during
  normalization — it worked when a config module was imported and called
  directly, but the real CLI path never saw it, so the hook never actually
  ran.
- Retry classification now recognizes the local-model client's generic
  `fetch failed` error as transient.
- Type checking no longer reports success when `tsc` fails for a non-type
  reason (bad tsconfig, crash, timeout) — such failures now fail validation
  instead of passing silently.
- Transient-error retries key off HTTP status / socket error codes instead
  of substring-matching, so an unrelated number like "500" in a message no
  longer triggers spurious retries.
- Prompt templates throw a clear error on nested or unbalanced
  `{{#if}}` / `{{#unless}}` blocks instead of emitting a corrupted prompt.
- Component-import counting now includes `import type { … }` and only scans
  JS/TS source files.
- Lighthouse aggregates exclude runs with a missing performance score
  (previously coerced to 0, dragging the median and mean toward zero).
- The React profiler navigates with `networkidle2` (was `networkidle0`),
  avoiding spurious timeouts on the dev server's HMR socket.
- Test discovery no longer aborts on a broken symlink under `tests/`; the
  bad entry is skipped.
- Internal-test detection in error messages no longer assumes POSIX path
  separators (it was always wrong on Windows).

## [1.0.0]

- Initial version: parallel agent runs against a shared brief, with a
  build → validate → fix loop and an aggregated comparison report
  (timing, lines of code, code variance, accessibility, performance,
  component usage, inline styles, DOM/semantic HTML, visual diff).
