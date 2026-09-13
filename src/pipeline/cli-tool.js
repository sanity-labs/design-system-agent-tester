/**
 * Generic, per-test-configurable CLI tool for the agent to call during
 * generation and repair — the same shape of capability MCP gives a test,
 * for a design system that ships an agent-facing CLI instead of (or
 * alongside) an MCP server.
 *
 * Why this exists: Astryx (`tests.internal/astrix`) ships
 * `@astryxdesign/cli` — `search`, `docs`, `component <Name>`, `discover` —
 * built for exactly this use case, but has no MCP server. Before this
 * module, the harness's only prior CLI integration was hardcoded to one
 * specific tool (the "DSDS CLI", removed 2026-09-XX) — every test that
 * wanted CLI access needed bespoke runner code. This is a config-driven
 * replacement: any test declares `cli: { command, args }` in its config.js
 * and gets one tool, exposed to the model exactly like an MCP tool, with no
 * runner-api.js changes required per test.
 *
 * Design decisions:
 *   - ONE tool, taking an `args: string[]` array appended to the test's
 *     configured base command+args. This mirrors how a human actually
 *     drives a CLI (`<base command> <subcommand> <flags>`), rather than
 *     inventing a bespoke schema per subcommand.
 *   - Executed with `execFile`, never a shell. The model's `args` become
 *     literal argv entries — there is no string interpolation for a shell
 *     to reinterpret, so there is no injection surface regardless of what
 *     the model passes (`"; rm -rf /"` is just a single, inert argv token).
 *   - Output is truncated (`MAX_OUTPUT_CHARS`) and execution is
 *     timeout-bounded, the same posture as the MCP client's own stdout cap
 *     (`MAX_BUFFER_BYTES` in mcp-client.js) and turn-loop timeouts.
 *   - Trust boundary: the test author chooses `cli.command`/`cli.args`
 *     (e.g. `npx -y @astryxdesign/cli`), exactly as they already choose
 *     `mcp.command`/`mcp.args` for an MCP server. The harness does not
 *     second-guess that choice by allowlisting subcommands — the test
 *     author already decided this package is safe to let an agent drive.
 *   - `cli.env` (object or `(projectDir) => object`, same shape as
 *     `mcp.env`) is merged over `process.env` for every call. Needed for
 *     any CLI that reads its configuration from the environment rather
 *     than a flag — e.g. `dsds-mcp`'s CLI takes `DSDS_CONFIG` this way, and
 *     its own `--config` flag turned out to only be accepted AFTER the
 *     subcommand (verified live), which this module's fixed-prefix-then-
 *     model-args call shape can't express. `env` sidesteps the ordering
 *     problem entirely.
 *   - `cli.frontloadArgs` (array of strings, optional) runs the CLI ONCE
 *     per iteration and appends its output to the system prompt — the CLI
 *     equivalent of an MCP server's `instructions` (see
 *     `mcpClient.getInstructions()` in runner-api.js). Without this, a CLI
 *     that supports the same front-loading pattern an MCP server does
 *     (e.g. `dsds instructions`) would only get read if the model happened
 *     to think to call it, biasing a CLI-vs-MCP comparison toward the MCP
 *     side for a reason that has nothing to do with the tool itself.
 */
import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Default per-call timeout. CLI calls here are doc/search lookups, not builds. */
const DEFAULT_TIMEOUT_MS = 20_000;

/** Cap on stdout+stderr collected from the subprocess before Node itself throws. */
const MAX_BUFFER_BYTES = 4 * 1024 * 1024;

/**
 * Cap on the text handed back to the model. A `--json` dump of an entire
 * catalog (seen in practice: `astryx component --list` for 163 components)
 * can run to tens of thousands of characters — bound it so one call can't
 * dominate the context window the way `ads_get_all_tokens` does on
 * Atlaskit's MCP server (measured there at ~47k tokens for one call).
 */
const MAX_OUTPUT_CHARS = 20_000;

const DEFAULT_TOOL_NAME = "run_cli";

/**
 * Resolve `cli.env` (object or `(projectDir) => object`) against the
 * process environment. Same object-or-function shape as `mcp.env`
 * (see the inline handling in `createMcpClient`, mcp-client.js) — a
 * directory-dependent env is needed there for things like
 * `LINT_SOURCE_DIR`, and the same need applies here.
 *
 * @param {object} cliConfig
 * @param {string} [projectDir]
 * @returns {Record<string,string>}
 */
function resolveCliEnv(cliConfig, projectDir) {
  const extra =
    typeof cliConfig.env === "function" ? cliConfig.env(projectDir) : (cliConfig.env ?? {});
  return { ...process.env, ...extra };
}

/**
 * Build the Anthropic tool definition for a test's configured CLI. Returns
 * null when the test has no `cli` block — callers can unconditionally
 * spread `cliTool ? [cliTool] : []` into their tools array.
 *
 * @param {object|null} cliConfig - `test.cli` from config.js
 * @returns {{name: string, description: string, input_schema: object}|null}
 */
export function buildCliTool(cliConfig, commandList = "") {
  if (!cliConfig) return null;
  const invocation = [cliConfig.command, ...(cliConfig.args ?? [])].join(" ");
  // Appended verbatim when the test configures `cli.commandList` — see
  // `getCliCommandList`. Without it the model has to discover the CLI's
  // argument conventions by trial and error, one wasted turn per guess.
  const listBlock = commandList
    ? `\n\nAvailable commands and their exact usage — use these forms, do not guess ` +
      `flag names or argument order:\n${commandList}`
    : "";
  return {
    name: cliConfig.toolName || DEFAULT_TOOL_NAME,
    // The example must not name a SUBCOMMAND. This default is shared by every
    // CLI-backed test, and it used to read `{"args": ["component", "Button"]}`
    // — Astryx's command, correct there and nonexistent in dsds. The ui5-cli
    // arm inherits this description, so the agent was being shown `component`
    // as the way to use the tool and dutifully ran `dsds component …`: 14 of
    // that run's 36 failed calls, 2.8 per iteration, each burning a turn.
    // `--help` is the one argument every CLI here understands, and it points
    // the model at the command list instead of guessing one for it. A test
    // whose CLI has a distinctive shape should set `cli.description` rather
    // than teach it through this default.
    description:
      (cliConfig.description ||
        `Run the "${invocation}" CLI. Pass the arguments you'd type after that command as an ` +
          `array of strings — e.g. {"args": ["--help"]} runs "${invocation} --help", which ` +
          `lists the available commands. Start there if you do not already know them. ` +
          `Output over ${MAX_OUTPUT_CHARS.toLocaleString()} ` +
          `characters is truncated; prefer a narrower query over a full catalog dump.`) + listBlock,
    input_schema: {
      type: "object",
      properties: {
        args: {
          type: "array",
          items: { type: "string" },
          description: `Arguments appended after "${invocation}", in the order you'd type them.`,
        },
      },
      required: ["args"],
      additionalProperties: false,
    },
  };
}

/**
 * Execute one CLI tool call. Never throws — a failed or timed-out command
 * returns descriptive text instead, the same contract `mcpClient.callToolText`
 * gives the generation loop, so a broken CLI call degrades to "the model
 * sees an error message" rather than aborting the iteration.
 *
 * @param {object} cliConfig - `test.cli` from config.js
 * @param {{args?: string[]}} input - the model's tool_use.input
 * @param {string} [cwd] - working directory for the subprocess. Defaults to
 *   the configured `cli.cwd`, or the process's own cwd when that's also
 *   unset. Doc/search-style CLI subcommands (the expected use case) don't
 *   need project context; a test whose CLI DOES need it (e.g. a `doctor`
 *   subcommand inspecting installed dependencies) should pass the
 *   generation's `projectDir` here — see `resolveCliCwd`.
 * @param {string} [projectDir] - passed to `cli.env` when it's a function.
 * @returns {Promise<string>}
 */
export async function runCliTool(cliConfig, input, cwd, projectDir) {
  const modelArgs = Array.isArray(input?.args) ? input.args.map(String) : [];
  const fullArgs = [...(cliConfig.args ?? []), ...modelArgs];
  const timeout = cliConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const { stdout, stderr } = await execFileAsync(cliConfig.command, fullArgs, {
      cwd: cwd || cliConfig.cwd || process.cwd(),
      env: resolveCliEnv(cliConfig, projectDir),
      timeout,
      maxBuffer: MAX_BUFFER_BYTES,
      // Never `shell: true` — see the module doc comment on injection safety.
    });
    const text = [stdout, stderr].filter(Boolean).join("\n").trim() || "(no output)";
    return truncate(text);
  } catch (err) {
    // execFile rejects on non-zero exit, timeout, or spawn failure. All
    // three still carry useful stdout/stderr in most CLIs (usage errors,
    // "did you mean" suggestions) — surface it instead of just the message.
    const parts = [];
    if (err.killed || err.signal) {
      parts.push(`Command timed out after ${timeout}ms.`);
    } else if (typeof err.code === "number") {
      parts.push(`Command exited with code ${err.code}.`);
    } else {
      parts.push(`Command failed to run: ${err.message}`);
    }
    if (err.stdout) parts.push(`stdout:\n${err.stdout}`);
    if (err.stderr) parts.push(`stderr:\n${err.stderr}`);
    return truncate(parts.join("\n\n"));
  }
}

/**
 * Fetch the CLI's own command list, for embedding in the tool description
 * (see `buildCliTool`). Returns "" when the test hasn't configured
 * `cli.commandList`.
 *
 * Why this exists, measured rather than assumed: in 2026-09-10/22.22 the
 * ui5-cli arm failed 12% of its CLI calls (65/520) purely on argument
 * syntax, each failure burning a whole turn. Pointing the default
 * description at `--help` (2026-09-11/00.20) removed one class — the
 * `component` guess, 3 → 0 — but only moved the total to 10%, because
 * `--help` lists command NAMES without per-command usage. The two dominant
 * survivors were exactly the ones whose argument shape you cannot infer
 * from a name: `brief` (10 failures; it takes a positional
 * `<build|author|ask>`, and the model tried `useCase=build` then
 * `--useCase build`) and `check-exports` (8; positional `<Component…>`,
 * tried as `--components '["Box",…]'`). dsds-mcp's own `manifest` carries
 * a `usage` string per command — all 27 inline to ~1.2k chars, which is
 * cheap against ~12 turns of guessing at ~50k cached-prefix tokens each.
 *
 * Both halves are test-supplied because the harness knows neither how to
 * ask an arbitrary CLI for its command list nor how to read the result:
 *   - `args: string[]` — the subcommand that prints it
 *   - `parse: (stdout) => string` — reduce that to the lines to inline
 *
 * Never throws: a failure returns "" and the tool simply ships without the
 * list, exactly as it did before this existed.
 *
 * @param {object} cliConfig
 * @param {string} [cwd]
 * @param {string} [projectDir]
 * @returns {Promise<string>}
 */
export async function getCliCommandList(cliConfig, cwd, projectDir) {
  const spec = cliConfig?.commandList;
  if (!spec || !Array.isArray(spec.args) || typeof spec.parse !== "function") return "";
  const result = await execCliRaw(cliConfig, spec.args, { cwd, projectDir });
  if (result.spawnError) return "";
  try {
    const text = spec.parse(result.stdout);
    return typeof text === "string" ? text.trim() : "";
  } catch {
    return "";
  }
}

/**
 * Run `cli.frontloadArgs` once and return its output, for the caller to
 * append to the system prompt the same way `mcpClient.getInstructions()` is
 * appended — see the module doc comment's `frontloadArgs` entry. Returns
 * `""` when the test hasn't configured it (no-op concat at the call site).
 *
 * Never throws, matching `runCliTool`'s contract — a failed frontload call
 * degrades to an empty string rather than aborting generation. Uses the
 * SAME `MAX_OUTPUT_CHARS` truncation as an ordinary tool call; a very large
 * instructions payload is still capped rather than paid for in full on
 * every cached-prefix rebuild.
 *
 * @param {object} cliConfig - `test.cli` from config.js
 * @param {string} cwd - resolved via `resolveCliCwd`
 * @param {string} [projectDir]
 * @returns {Promise<string>}
 */
export async function getCliInstructions(cliConfig, cwd, projectDir) {
  if (!Array.isArray(cliConfig.frontloadArgs) || cliConfig.frontloadArgs.length === 0) return "";
  return runCliTool(cliConfig, { args: cliConfig.frontloadArgs }, cwd, projectDir);
}

/**
 * Run the configured CLI and return its RAW output — no truncation, stdout
 * and stderr kept separate, non-zero exit reported rather than thrown.
 *
 * Distinct from `runCliTool` on every one of those points, because the
 * consumer is different: `runCliTool` formats a result for a language model
 * (merge the streams, cap the size, describe failures in prose), while this
 * feeds machine parsing — e.g. the CLI lint gate's `--json` envelope, which
 * a 20k-char truncation would corrupt into invalid JSON, and whose CLI
 * exits non-zero by design when it finds violations.
 *
 * Never throws. A spawn failure comes back as `{spawnError}`.
 *
 * @param {object} cliConfig
 * @param {string[]} args - appended to `cli.args`
 * @param {object} [opts]
 * @param {string} [opts.cwd]
 * @param {string} [opts.projectDir] - passed to a function-form `cli.env`
 * @param {Record<string,string>} [opts.extraEnv] - merged last, over `cli.env`
 * @returns {Promise<{stdout: string, stderr: string, status: number|null, spawnError?: string}>}
 */
export async function execCliRaw(cliConfig, args, opts = {}) {
  const { cwd, projectDir, extraEnv = {} } = opts;
  try {
    const { stdout, stderr } = await execFileAsync(
      cliConfig.command,
      [...(cliConfig.args ?? []), ...args],
      {
        cwd: cwd || cliConfig.cwd || process.cwd(),
        env: { ...resolveCliEnv(cliConfig, projectDir), ...extraEnv },
        timeout: cliConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        maxBuffer: MAX_BUFFER_BYTES,
        // Never `shell: true` — see the module doc comment.
      },
    );
    return { stdout: stdout ?? "", stderr: stderr ?? "", status: 0 };
  } catch (err) {
    // A non-zero exit still carries the output we want (a lint CLI reporting
    // findings is the normal case here), so this is not necessarily an
    // error path. Only a genuine spawn/timeout failure has no usable stdout.
    if (typeof err.code === "number" && (err.stdout || err.stderr)) {
      return { stdout: err.stdout ?? "", stderr: err.stderr ?? "", status: err.code };
    }
    const reason =
      err.killed || err.signal
        ? `timed out after ${cliConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`
        : err.message;
    return { stdout: err.stdout ?? "", stderr: err.stderr ?? "", status: null, spawnError: reason };
  }
}

function truncate(text) {
  if (text.length <= MAX_OUTPUT_CHARS) return text;
  return (
    text.slice(0, MAX_OUTPUT_CHARS) +
    `\n\n[truncated — ${text.length.toLocaleString()} characters total, ` +
    `showing the first ${MAX_OUTPUT_CHARS.toLocaleString()}. Ask a narrower question instead ` +
    `of requesting the full list/catalog.]`
  );
}

/**
 * Hard-fail before iterations start if a test's configured CLI can't
 * actually run in its configured `cwd`. Meant to be called from a test's
 * own `preflight` hook (see `tests.internal/astrix/config.js`) — sync and
 * unawaited, matching how `src/index.js` invokes `test.preflight`.
 *
 * Exists because of a real failure mode: if `cli.cwd` points at a
 * `_astrix-cli-home`-style installed reference (see that test's config
 * comment for why) and that install is ever missing or stale, EVERY
 * `astrix_cli`-style tool call fails silently for the whole run — the model
 * just sees an error string it can't fix, and nothing on the harness side
 * flags it as a setup problem rather than a model mistake. This runs the
 * configured command once, synchronously, before any iteration starts.
 *
 * @param {object} cliConfig - `test.cli` from config.js
 * @param {string[]} smokeArgs - a cheap, harmless subcommand to run (e.g.
 *   `["--help"]` or `["search", "x"]`) — whatever proves the CLI can
 *   actually resolve its target package from `cli.cwd`.
 * @param {string} [label] - identifies the caller in log output
 */
export function checkCliAvailable(cliConfig, smokeArgs, label = cliConfig.toolName || "cli") {
  const cwd = cliConfig.cwd || process.cwd();
  const result = spawnCliSync(cliConfig, smokeArgs, cwd);
  if (result.status !== 0) {
    const detail = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
    console.error(
      `[${label}] configured CLI failed a startup smoke test in ${cwd}:\n` +
        `  ${cliConfig.command} ${[...(cliConfig.args ?? []), ...smokeArgs].join(" ")}\n` +
        (detail ? `${detail}\n` : "") +
        `Every tool call this test makes during real runs will fail the same way. ` +
        `If \`cli.cwd\` points at a standing reference install, reinstall it.`,
    );
    process.exit(1);
  }
  console.log(`[${label}] CLI smoke test passed in ${cwd}.`);
}

function spawnCliSync(cliConfig, args, cwd) {
  try {
    const stdout = execFileSync(cliConfig.command, [...(cliConfig.args ?? []), ...args], {
      cwd,
      env: resolveCliEnv(cliConfig, cwd),
      timeout: cliConfig.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout };
  } catch (err) {
    return { status: err.status ?? 1, stdout: err.stdout, stderr: err.stderr ?? err.message };
  }
}

/**
 * Resolve the cwd a CLI call should run in. Exists as a named export so the
 * "default to the project directory" policy is documented in one place
 * rather than inlined at each `runCliTool` call site.
 *
 * @param {object} cliConfig
 * @param {string} projectDir - the generation's project directory (exists
 *   on disk by the time tools are callable — see generateWithTools).
 * @returns {string}
 */
export function resolveCliCwd(cliConfig, projectDir) {
  if (typeof cliConfig.cwd === "function") return cliConfig.cwd(projectDir);
  return cliConfig.cwd || projectDir;
}
