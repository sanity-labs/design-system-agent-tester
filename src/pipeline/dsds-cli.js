/**
 * Bridge to the dsds CLI (dsds-tools packages/cli) for harness-side gates.
 *
 * The CLI is the same tool registry as the dsds MCP server on a shell surface,
 * with two things the MCP surface doesn't give a harness: a machine-readable
 * `--json` envelope ({ ok, tool, exitCode, data|error, structured? }) and a
 * CI exit-code contract (0 ok · 1 error · 2 ran-and-found-problems).
 *
 * Used for:
 *   - `dsds doctor` as a pre-run gate — config/document integrity BEFORE any
 *     tokens are spent. Catches the run-poisoning class (dead LINT_RESOLVE_DIR,
 *     dead PACKAGE_EXPORT_PATHS, schema drift) that previously burned full runs.
 *   - `dsds lint --apply` as the per-iteration lint gate — replaces the
 *     dedicated MCP client the runner used to spawn just for the gate.
 *   - `execDsdsCommand` — the sandboxed executor behind the agent-facing
 *     `dsds_cli` tool in the shell-agent test path (ui4-cli).
 *
 * The CLI is not yet published to npm, so it is invoked as
 * `node <repo>/packages/cli/src/index.js …`.
 */
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { promisify } from "node:util";
import { isSafeRelativePath } from "../evaluation/parse-files.js";

const execFileAsync = promisify(execFile);

/**
 * Resolve the CLI entry for a test config. Explicit `test.cli.entry` wins;
 * otherwise derive `<mcp.defaultDirectory>/packages/cli/src/index.js` when it
 * exists. Returns null when the test has no reachable CLI (non-dsds MCP
 * servers, older checkouts) — callers fall back to MCP-based gates.
 */
export function resolveCliEntry(test) {
  const explicit = test?.cli?.entry;
  if (explicit) return existsSync(explicit) ? explicit : null;
  const dir = test?.mcp?.defaultDirectory;
  if (!dir) return null;
  const derived = resolve(dir, "packages/cli/src/index.js");
  return existsSync(derived) ? derived : null;
}

/** Resolve a test's env block (object or (dir) => object form). */
export function resolveTestEnv(test) {
  const source = test?.cli?.env ?? test?.mcp?.env ?? {};
  const dir = test?.cli?.defaultDirectory ?? test?.mcp?.defaultDirectory ?? null;
  return typeof source === "function" ? source(dir) : source;
}

/**
 * Run one dsds CLI command. argv is a pre-split array (never a shell string —
 * no shell is involved, so no injection surface). Returns
 * { exitCode, stdout, stderr, envelope } where envelope is the parsed --json
 * payload when stdout carries one.
 */
export async function execDsds(cliEntry, argv, { env = {}, cwd, timeoutMs = 60_000 } = {}) {
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [cliEntry, ...argv], {
      cwd,
      env: { ...process.env, ...env },
      timeout: timeoutMs,
      maxBuffer: 16 * 1024 * 1024,
    });
    return { exitCode: 0, stdout, stderr, envelope: parseEnvelope(stdout) };
  } catch (err) {
    if (typeof err.code === "number") {
      // The CLI ran and exited non-zero (1 usage/error, 2 findings).
      return {
        exitCode: err.code,
        stdout: err.stdout ?? "",
        stderr: err.stderr ?? "",
        envelope: parseEnvelope(err.stdout ?? ""),
      };
    }
    throw err; // spawn failure / timeout — infrastructure, not a CLI verdict
  }
}

function parseEnvelope(stdout) {
  const text = (stdout ?? "").trim();
  if (!text.startsWith("{")) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Pre-run doctor gate. Returns { ok, report } where report is the human
 * rendering of what doctor found. `ok: false` means the test's configuration
 * or documents are broken and a run would produce garbage measurements.
 */
export async function runDoctorGate(cliEntry, env) {
  const { exitCode, stdout, stderr, envelope } = await execDsds(cliEntry, ["doctor", "--json"], {
    env,
  });
  if (exitCode === 0) return { ok: true, report: renderDoctor(envelope) ?? "all checks passed" };
  const report = renderDoctor(envelope) ?? (stdout || stderr || `doctor exited ${exitCode}`);
  return { ok: false, report };
}

function renderDoctor(envelope) {
  const checks = envelope?.data?.checks ?? envelope?.checks;
  if (!Array.isArray(checks)) return null;
  return checks
    .map(
      (c) =>
        `  ${c.status === "pass" ? "✓" : c.status === "skip" ? "–" : "✗"} ${c.name}${c.detail ? ` — ${c.detail}` : ""}`,
    )
    .join("\n");
}

// Source files the lint gate cares about (mirrors the runner's own filter).
const SOURCE_LINTABLE = /\.(tsx|ts|jsx|js)$/;

/**
 * Per-iteration lint gate via `dsds lint --apply --json`. Same return shape as
 * the runner's MCP-based gate: { remaining, files, warnings } with only
 * severity-2 messages gating. Auto-fixes are written to disk by the CLI.
 */
export async function runCliLintGate(cliEntry, env, projectDir, files) {
  const sources = files.filter((f) => SOURCE_LINTABLE.test(f.path));
  if (!sources.length) return { remaining: 0, files: [], warnings: 0 };

  let res;
  try {
    res = await execDsds(cliEntry, ["lint", "--apply", "--json", ...sources.map((f) => f.path)], {
      env: { ...env, LINT_SOURCE_DIR: projectDir },
      cwd: projectDir,
    });
  } catch (err) {
    return { remaining: 0, files: [], warnings: 0, error: err.message };
  }
  if (res.exitCode === 1) {
    // Environment problem (plugins missing, eslint absent) — gate unavailable.
    return {
      remaining: 0,
      files: [],
      warnings: 0,
      error: res.envelope?.error ?? res.stderr ?? "lint CLI error",
    };
  }
  const sc = res.envelope?.structured;
  if (!sc) return { remaining: 0, files: [], warnings: 0, unavailable: true };

  let warnings = 0;
  const errorFiles = [];
  for (const f of sc.files ?? []) {
    const errs = (f.messages ?? []).filter((m) => m.severity === 2);
    warnings += (f.messages ?? []).length - errs.length;
    if (errs.length) errorFiles.push({ ...f, messages: errs });
  }
  const remaining = errorFiles.reduce((n, f) => n + f.messages.length, 0);
  return { remaining, files: errorFiles, warnings };
}

// ── Sandboxed agent-facing executor (ui4-cli shell-agent path) ───────────────

// Reject anything that isn't a plain `dsds …` invocation. There is no shell —
// tokens are passed as argv — but these characters signal the agent EXPECTED
// shell behavior (pipes, redirects, substitution), so fail loudly instead of
// passing them through as literal arguments.
const SHELLISM = /[|&;<>`$\\]|\n/;

/**
 * Execute an agent-issued `dsds …` command line inside the sandbox:
 * only the dsds CLI, argv-split (no shell), cwd = the project directory.
 * Returns the text the agent sees.
 */
export async function execDsdsCommand(cliEntry, env, projectDir, commandLine) {
  const line = String(commandLine ?? "").trim();
  if (!line.startsWith("dsds")) {
    return {
      ok: false,
      output:
        "Only `dsds …` commands are available in this environment. Example: `dsds context button`.",
    };
  }
  if (SHELLISM.test(line)) {
    return {
      ok: false,
      output:
        "Shell operators (pipes, redirects, substitution) are not available — this is not a shell. " +
        "Run one plain `dsds …` command per call; JSON output is available via --json.",
    };
  }
  // argv split honoring single/double quotes (no expansion of any kind).
  const argv = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(line)) !== null) argv.push(m[1] ?? m[2] ?? m[3]);
  argv.shift(); // drop the leading "dsds"

  // The executor is contractually sandboxed to the project directory, but
  // the CLI is handed cwd=projectDir and some subcommands (e.g. `lint
  // --apply`) read and rewrite the paths they're given. SHELLISM doesn't
  // block `.` / `/` / `..`, so a path argument like `../../x` or `/etc/x`
  // would survive and point the CLI outside the sandbox. Reject any
  // path-like argument that escapes the project dir (matching the guard
  // every other agent-controlled path in the harness gets).
  const offending = argv.find((token) => {
    // Consider both bare args and the value side of `--flag=value`.
    const value =
      token.startsWith("-") && token.includes("=") ? token.slice(token.indexOf("=") + 1) : token;
    if (value === "" || value.startsWith("-")) return false;
    const looksLikePath =
      isAbsolute(value) ||
      value.includes("/") ||
      value.includes("\\") ||
      value.split(/[\\/]/).includes("..");
    return looksLikePath && !isSafeRelativePath(value);
  });
  if (offending) {
    return {
      ok: false,
      output:
        `Refusing to run: the argument "${offending}" points outside the project directory. ` +
        "Pass only paths inside the current project.",
    };
  }

  try {
    const res = await execDsds(cliEntry, argv, {
      env: { ...env, LINT_SOURCE_DIR: projectDir },
      cwd: projectDir,
      timeoutMs: 60_000,
    });
    const body = [
      res.stdout,
      res.stderr && res.exitCode !== 0 ? `\n[stderr]\n${res.stderr}` : "",
    ].join("");
    return { ok: res.exitCode === 0, output: `exit ${res.exitCode}\n${body}`.trim() };
  } catch (err) {
    return { ok: false, output: `dsds failed to run: ${err.message}` };
  }
}
