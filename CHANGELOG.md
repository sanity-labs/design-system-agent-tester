# Changelog

All notable changes to this project are documented here. The format is
based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
project aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- The harness is API-only. The `cli` runner and the `--runner` flag were
  removed; runs use the Anthropic SDK and require `ANTHROPIC_API_KEY`.
- The startup cost warning is now model-aware (it notes that higher-tier
  models such as Opus cost several times the rough Sonnet estimate).
- Generative-UI mode is clearly marked **experimental** in the CLI banner,
  the standalone runner, and the README.

### Added

- A missing `ANTHROPIC_API_KEY` now fails fast with a clear message.
- `.nvmrc` and `engine-strict` to keep installs on the supported Node floor.
- README notes recommending a sandbox for untrusted runs and pointing at
  `npm run clean-output` for the (fast-growing) `output/` directory.
- Biome as the linter/formatter (`npm run lint`, `npm run format`), enforced
  in CI, plus a documented macOS/Linux support matrix.

### Fixed

- Updated the default model to a current id (`claude-sonnet-4-6`). The
  previous default (`claude-sonnet-4-20250514`) had been retired, so every
  default run failed immediately with a `404 not_found_error`.
- A failed iteration now writes its error (and stack) to `_error.txt` in the
  iteration directory instead of only logging to the terminal, so failures
  are diagnosable from the run artifacts.

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
