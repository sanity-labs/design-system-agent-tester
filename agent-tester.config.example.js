/**
 * Design System Agent Tester configuration — EXAMPLE.
 *
 * Copy this file to `agent-tester.config.js` at the project root and edit
 * for your own setup. It only holds engine-level settings — each test
 * (config + prompt templates) lives in its own directory under `tests/`.
 *
 * ┌──────────────────────────────────────────────────────────────────┐
 * │ FILE LAYOUT                                                      │
 * │                                                                  │
 * │  agent-tester.config.js    ← this file (engine settings)         │
 * │  briefs/default.js         ← interface brief generator           │
 * │  tests/<label>/            ← one directory per test, auto-found  │
 * │    config.js               ← test config                         │
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

import { resolve } from "node:path";
import briefGenerator from "./briefs/default.js";

export default {
  /** Human-readable name shown in report headings and log messages. */
  name: "Your Design System",

  /**
   * MCP server config used by any test with `requiresMcp: true`.
   *
   * Fields:
   *   - `command` / `args(directory)` — how to spawn the server.
   *   - `defaultDirectory` — where the server's source lives on disk.
   *   - `env` — optional. Plain object or `(directory) => env`.
   *      Merged into `process.env` at spawn time. Use for things like
   *      `DSDS_PATHS` that the server needs as env vars.
   *   - `toolPrefix` — label the harness uses for tool calls.
   *
   * The example below points at dsds-mcp (https://designsystemdocspec.org).
   * If your MCP server is Python-based, swap `command` to `"uv"` and
   * `args` to `["run", "--directory", directory, "mcp", "run", "main.py"]`.
   */
  mcp: {
    command: "node",
    args: (directory) => [resolve(directory, "src/index.js")],
    defaultDirectory: "/absolute/path/to/dsds-mcp",
    env: {
      DSDS_PATHS: "/absolute/path/to/your-design-system.dsds.json",
    },
    toolPrefix: "mcp__dsds",
  },

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
