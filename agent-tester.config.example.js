/**
 * Design System Agent Tester configuration — EXAMPLE.
 *
 * Copy this file to `agent-tester.config.js` at the project root and edit
 * for your own setup. It only holds engine-level settings — each test
 * (config + prompt templates) lives in its own directory under `tests/`.
 *
 * MCP config is declared **per test** (not here) — see
 * `tests/<label>/config.js` for the shape. Tests without an `mcp` block
 * run without MCP.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ FILE LAYOUT                                                      │
 * │                                                                  │
 * │  agent-tester.config.js    ← this file (engine settings)         │
 * │  briefs/default.js         ← interface brief generator           │
 * │  tests/<label>/            ← one directory per test, auto-found  │
 * │    config.js               ← test config (with optional `mcp`)   │
 * │    system.md               ← system-prompt template              │
 * │    user.md                 ← user-prompt template                │
 * │    fix-system.md           ← (optional) extra fix-rule template  │
 * │    docs.md                 ← (optional) docsPath target          │
 * └──────────────────────────────────────────────────────────────────┘
 *
 * To add a test:
 *   1. Run `npm run new-test -- <label>` to scaffold the directory.
 *   2. Edit the generated `tests/<label>/config.js`, `system.md`, `user.md`.
 *   3. That's it — the engine picks it up on the next run.
 *
 * To disable a test temporarily, rename `tests/foo/` → `tests/foo.disabled/`
 * (or prefix the directory with `_`).
 */

import briefGenerator from "./briefs/default.js";

export default {
  /** Human-readable name shown in report headings and log messages. */
  name: "Your Design System",

  /** CSS selectors Puppeteer uses to detect whether the app has rendered. */
  appRootSelectors: ["#root", "#app", "#__next", "[data-reactroot]"],

  /** Brief generator config — see `briefs/default.js` for the shape. */
  briefGenerator,

  /**
   * Optional. Override where tests are discovered (default: `tests/` at
   * the project root). Useful when running multiple config files
   * side-by-side via the AGENT_TESTER_CONFIG env var.
   */
  // testsDir: "tests",
};
