/**
 * Gives the agent one CLI to call during generation and repair, configured
 * per test. The CLI equivalent of what MCP provides, for a design system
 * that ships a command-line tool instead of, or as well as, a server.
 *
 * Any test declares `cli: { command, args }` in its config and gets a tool
 * the model can use exactly like an MCP tool, with no per-test runner code.
 *
 * How it works:
 *   - One tool, taking an `args` array that is appended to the test's base
 *     command. This is how a person drives a CLI, rather than inventing a
 *     separate schema per subcommand.
 *   - Run with `execFile`, never through a shell. The model's arguments
 *     become literal argv entries, so there is nothing for a shell to
 *     reinterpret and no way to inject a second command.
 *   - Output is capped and calls time out, matching the MCP client.
 *   - The test author picks the command, the same as they already pick an
 *     MCP server's command. The harness does not second-guess that by
 *     allowlisting subcommands.
 *   - `cli.env` is merged over the environment on every call, for a CLI
 *     that reads its configuration from there rather than from a flag.
 *   - `cli.frontloadArgs` runs once per iteration and its output is added
 *     to the system prompt, matching what an MCP server's instructions do.
 *     Without it, a CLI offering the same thing would only be read if the
 *     model happened to think of it, which would tilt a CLI-versus-MCP
 *     comparison for a reason unrelated to the tools themselves.
 */
import { execFileSync, execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Default per-call timeout. CLI calls here are doc/search lookups, not builds. */
const DEFAULT_TIMEOUT_MS = 20_000;

/** Cap on stdout+stderr collected from the subprocess before Node itself throws. */
const MAX_BUFFER_BYTES = 4 * 1024 * 1024;

/**
 * Cap on the text handed back to the model. Dumping a whole component
 * catalog can run to tens of thousands of characters, so one call is not
 * allowed to fill the context window.
 */
const MAX_OUTPUT_CHARS = 20_000;

const DEFAULT_TOOL_NAME = "run_cli";

/**
 * Build the environment for a CLI call. `cli.env` is either an object or a
 * function taking the project directory, and is merged over the current
 * environment. Same shape as `mcp.env`.
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
 * Build the tool definition for a test's CLI. Returns null when the test has
 * no `cli` block, so callers can spread `cliTool ? [cliTool] : []`.
 *
 * @param {object|null} cliConfig
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
    // The example must not name a subcommand. Every CLI-backed test shares
    // this description, and it used to show one design system's command,
    // which does not exist in the others. Agents copied it and the call
    // failed, wasting a turn each time. `--help` works everywhere and points
    // the model at the real command list.
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
 * Run one CLI call for the model.
 *
 * Never throws. A failed or timed-out command comes back as text describing
 * what went wrong, so the model sees an error message instead of the whole
 * iteration dying.
 *
 * @param {object} cliConfig
 * @param {{args?: string[]}} input - the model's tool input
 * @param {string} [cwd] - where to run. Defaults to `cli.cwd`, then to the
 *   current directory.
 * @param {string} [projectDir] - passed to a function-shaped `cli.env`
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
 * Get the CLI's own list of commands, to put in the tool description.
 * Returns "" when the test has not configured `cli.commandList`.
 *
 * Worth the extra subprocess: around a tenth of CLI calls used to fail on
 * argument syntax alone, and each failure cost a turn. Pointing the
 * description at `--help` fixed some of it, but `--help` lists command
 * names without showing how to call them, so commands taking a positional
 * argument kept being guessed wrong. Inlining the real usage strings ends
 * the guessing.
 *
 * A failure here returns "" rather than throwing. The list is an
 * improvement, not a requirement.
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
 * Run `cli.frontloadArgs` once and return the output, for the caller to add
 * to the system prompt. Returns "" when the test has not configured it.
 *
 * Never throws, same as `runCliTool`, and truncates to the same cap.
 */
export async function getCliInstructions(cliConfig, cwd, projectDir) {
  if (!Array.isArray(cliConfig.frontloadArgs) || cliConfig.frontloadArgs.length === 0) return "";
  return runCliTool(cliConfig, { args: cliConfig.frontloadArgs }, cwd, projectDir);
}

/**
 * Run the CLI and return its output untouched: nothing truncated, stdout
 * and stderr kept apart, and a non-zero exit reported rather than thrown.
 *
 * Different from `runCliTool` on every one of those points because the
 * reader is different. `runCliTool` formats a result for a model, while this
 * feeds something that parses the output. Truncating JSON would make it
 * invalid, and a lint CLI exits non-zero on purpose when it finds problems.
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
 * Check the test's CLI actually runs before any iterations start. Meant to
 * be called from a test's `preflight` hook.
 *
 * Without it, a missing or stale install makes every CLI call fail silently
 * for the whole run. The model just sees errors and carries on guessing, so
 * the run looks like a bad result rather than a broken setup.
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
 * Work out which directory a CLI call should run in, so the "default to the
 * project directory" rule is written down in one place.
 *
 * @param {object} cliConfig
 * @param {string} projectDir
 * @returns {string}
 */
export function resolveCliCwd(cliConfig, projectDir) {
  if (typeof cliConfig.cwd === "function") return cliConfig.cwd(projectDir);
  return cliConfig.cwd || projectDir;
}
