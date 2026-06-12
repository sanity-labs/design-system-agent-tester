/**
 * Project validation.
 *
 * Runs the generated project end-to-end:
 *
 *   1. `npm install` the agent-generated dependencies
 *   2. `tsc --noEmit` type check
 *   3. Start the dev server
 *   4. Open the page in headless Chrome
 *   5. Record any console errors and whether the page actually rendered
 *
 * Returns a structured result the runner can use to decide whether to
 * proceed with the other evaluations (screenshot, dom-count, etc.) or
 * fall into the fix loop.
 *
 * Logs are written to `_npm_install.txt`, `_tsc_check.txt`, and
 * `_dev_server.txt` inside the iteration directory so debugging doesn't
 * require recreating the run.
 *
 * The dev server is bound to an OS-allocated random port (via `bind(0)`)
 * and pinned with `--strictPort`, so a port collision fails loudly
 * rather than landing Puppeteer on the wrong server.
 *
 * This file does NOT take measurements (no DOM counting, no screenshots,
 * no semantic-HTML analysis). Each of those lives in its own module.
 */

import { resolve, dirname } from "node:path";
import { appendFile } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { execFile, spawn } from "node:child_process";
import { createServer } from "node:net";
import { promisify } from "node:util";
import { launchBrowser, waitForRenderedContent } from "./puppeteer-helpers.js";
import { error, tag, warn } from "../util/color.js";

const execFileAsync = promisify(execFile);

const DEV_SERVER_READY_TIMEOUT_MS = 30_000;

/**
 * Validate a generated project. Returns a result object — never throws.
 *
 * @param {string} projectDir
 * @param {string} iterLabel
 * @returns {Promise<{
 *   success: boolean,
 *   serverUrl: string|null,
 *   devServer: import("child_process").ChildProcess|null,
 *   rendered: boolean,
 *   consoleErrors: string[],
 *   fatalError: string|null
 * }>}
 */
export async function validateProject(projectDir, iterLabel) {
  const result = {
    success: false,
    serverUrl: null,
    devServer: null,
    rendered: false,
    consoleErrors: [],
    fatalError: null,
  };

  try {
    await runNpmInstall(projectDir, iterLabel);
    await runTypeCheck(projectDir, iterLabel);

    const iterDir = dirname(projectDir);
    const port = await getAvailablePort();
    const devServer = startDevServer(projectDir, iterLabel, port);
    result.devServer = devServer;
    result.serverUrl = await waitForReady(devServer, port, iterDir);

    console.log(
      `${tag(iterLabel)} Dev server at ${result.serverUrl}, validating...`,
    );

    const pageResult = await checkPageRender(result.serverUrl, iterLabel);
    result.consoleErrors = pageResult.consoleErrors;
    result.rendered = pageResult.rendered;

    const fatalError = detectFatalError(
      pageResult.consoleErrors,
      pageResult.rendered,
    );
    if (fatalError) {
      result.fatalError = fatalError;
      result.success = false;
    } else {
      result.success = true;
    }

    return result;
  } catch (err) {
    result.fatalError = err.message;
    result.success = false;
    killDevServer(result.devServer);
    result.devServer = null;
    return result;
  }
}

/**
 * Kill a dev server process cleanly. Safe to call with `null`.
 *
 * Note `child.killed` only records that a signal was *sent*, not that
 * the process exited — escalation has to check the actual exit state.
 * The server is `npm run dev`, which spawns Vite as its own child, so
 * on POSIX the whole detached process group is signalled; signalling
 * just `npm` leaves Vite holding the port.
 */
export function killDevServer(devServer) {
  if (!devServer) return;
  const exited = () =>
    devServer.exitCode !== null || devServer.signalCode !== null;
  if (exited()) return;

  const signalServer = (signal) => {
    try {
      if (process.platform !== "win32" && devServer.pid) {
        process.kill(-devServer.pid, signal);
      } else {
        devServer.kill(signal);
      }
    } catch {
      // Process (group) is already gone.
    }
  };

  signalServer("SIGTERM");
  const timer = setTimeout(() => {
    if (!exited()) signalServer("SIGKILL");
  }, 3000);
  timer.unref();
  devServer.once("exit", () => clearTimeout(timer));
}

// ─── Internals ──────────────────────────────────────────────────────

async function runNpmInstall(projectDir, iterLabel) {
  console.log(`${tag(iterLabel)} Installing dependencies...`);
  const iterDir = dirname(projectDir);
  try {
    // No --legacy-peer-deps: that flag reverts npm to v6 behavior where
    // peer dependencies are NOT auto-installed. Modern packages depend on
    // npm v7+ auto-installing peers. Suppressing it silently leaves the
    // tree incomplete, which surfaced as bogus "Property X does not exist
    // on Box" tsc errors when the agent's code referenced the real API
    // surface against incomplete types. If a peer conflict ever surfaces
    // from agent-generated code, that's a real signal worth reporting in
    // the fix loop — not something to mask.
    const { stdout, stderr } = await execFileAsync(
      "npm",
      ["install", "--no-audit", "--no-fund"],
      { cwd: projectDir, timeout: 120_000 },
    );

    const ts = new Date().toISOString();
    const log =
      [
        `\n--- npm install [${ts}] OK ---`,
        stderr ? `[stderr]\n${stderr.trim()}` : null,
        stdout ? `[stdout]\n${stdout.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n\n") + "\n";
    await appendFile(resolve(iterDir, "_npm_install.txt"), log, "utf-8");
  } catch (npmErr) {
    const stderr = (npmErr.stderr || "").trim();
    const stdout = (npmErr.stdout || "").trim();
    const detail = stderr || stdout || npmErr.message;

    const ts = new Date().toISOString();
    const log =
      [
        `\n--- npm install [${ts}] FAILED (exit code ${npmErr.code ?? "unknown"}) ---`,
        stderr ? `[stderr]\n${stderr}` : null,
        stdout ? `[stdout]\n${stdout}` : null,
        `[error]\n${npmErr.message}`,
      ]
        .filter(Boolean)
        .join("\n\n") + "\n";
    await appendFile(resolve(iterDir, "_npm_install.txt"), log, "utf-8");

    console.error(`${tag(iterLabel)} ${error("npm install failed:")}\n${detail}`);
    throw new Error(`npm install failed:\n${detail}`);
  }
}

async function runTypeCheck(projectDir, iterLabel) {
  const iterDir = dirname(projectDir);
  try {
    console.log(`${tag(iterLabel)} Running type check...`);
    const { stdout: tscOut, stderr: tscErr } = await execFileAsync(
      "npx",
      ["tsc", "--noEmit"],
      { cwd: projectDir, timeout: 60_000 },
    );

    const ts = new Date().toISOString();
    const tscLog =
      `--- tsc --noEmit [${ts}] OK ---\n` +
      (tscOut ? `[stdout]\n${tscOut.trim()}\n` : "") +
      (tscErr ? `[stderr]\n${tscErr.trim()}\n` : "No type errors.\n");
    await appendFile(resolve(iterDir, "_tsc_check.txt"), tscLog + "\n", "utf-8");
  } catch (tscErr) {
    const stderr = (tscErr.stderr || "").trim();
    const stdout = (tscErr.stdout || "").trim();
    const errors = stdout || stderr || tscErr.message;

    const ts = new Date().toISOString();
    const tscLog = `--- tsc --noEmit [${ts}] FAILED ---\n${errors}\n`;
    await appendFile(resolve(iterDir, "_tsc_check.txt"), tscLog + "\n", "utf-8");

    const errorCount = (errors.match(/\): error TS/g) || []).length;
    console.warn(`${tag(iterLabel)} ${warn(`Type check found ${errorCount} error(s)`)}`);

    if (errorCount > 0) {
      throw new Error(
        `TypeScript type check failed (${errorCount} error(s)):\n${errors}`,
      );
    }
  }
}

/**
 * Ask the OS for an available loopback port by binding to port 0 and
 * reading back the assigned number. There's a tiny race between closing
 * the probe socket and the dev server binding the port — `--strictPort`
 * below turns any collision into a loud, diagnosable failure instead of
 * the silent misdetection the harness used to suffer from.
 */
function getAvailablePort() {
  return new Promise((resolveFn, rejectFn) => {
    const probe = createServer();
    probe.unref();
    probe.on("error", rejectFn);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolveFn(port));
    });
  });
}

/**
 * Spawn `npm run dev` against the project, pinning Vite to a specific
 * port we already know is free. `--strictPort` makes Vite exit rather
 * than silently auto-incrementing (which is what caused the harness to
 * connect to the wrong port and report bogus "ERR_CONNECTION_REFUSED at
 * localhost:5173" errors).
 */
function startDevServer(projectDir, iterLabel, port) {
  console.log(`${tag(iterLabel)} Starting dev server on port ${port}...`);
  return spawn(
    "npm",
    ["run", "dev", "--", "--port", String(port), "--strictPort"],
    {
      cwd: projectDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, BROWSER: "none" },
      // Own process group on POSIX so killDevServer can signal npm AND
      // the Vite child it spawns in one shot.
      detached: process.platform !== "win32",
    },
  );
}

/**
 * Stream the dev server's stdout/stderr into `_dev_server.txt` while
 * watching for a readiness signal. Resolves with the URL we constructed
 * ourselves (no stdout-parsing for URLs — we already know the port).
 *
 * Considered "ready" when either:
 *   - the configured port appears in a `localhost:<port>` URL, or
 *   - vite prints a `ready in <ms> ms` banner.
 *
 * Rejects if the process exits before ready, or if 30s elapse without a
 * signal. In both cases the full output is on disk for diagnosis.
 */
function waitForReady(devServer, port, iterDir) {
  const logPath = resolve(iterDir, "_dev_server.txt");
  const stream = createWriteStream(logPath, { flags: "a" });
  stream.write(
    `\n--- dev server [${new Date().toISOString()}] port=${port} ---\n`,
  );

  const readyPattern = new RegExp(
    `https?:\\/\\/localhost:${port}\\b|ready in \\d+\\s*ms`,
    "i",
  );

  let resolved = false;
  let preReadyOutput = "";

  return new Promise((resolveFn, rejectFn) => {
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        stream.end();
        rejectFn(
          new Error(
            `Dev server did not become ready on port ${port} within ${Math.round(
              DEV_SERVER_READY_TIMEOUT_MS / 1000,
            )}s. See ${logPath}.`,
          ),
        );
      }
    }, DEV_SERVER_READY_TIMEOUT_MS);

    function handleData(data) {
      const text = data.toString();
      stream.write(text);
      if (resolved) return;
      preReadyOutput += text;
      if (readyPattern.test(preReadyOutput)) {
        resolved = true;
        clearTimeout(timer);
        // Leave the stream + data listeners attached so post-ready
        // output (warnings, eventual crashes) keeps landing in the log.
        resolveFn(`http://localhost:${port}`);
      }
    }

    devServer.stdout.on("data", handleData);
    devServer.stderr.on("data", handleData);

    devServer.on("error", (err) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      stream.end();
      rejectFn(err);
    });

    devServer.on("close", (code) => {
      stream.end();
      if (resolved) return;
      resolved = true;
      clearTimeout(timer);
      rejectFn(
        new Error(
          `Dev server exited with code ${code} before becoming ready. ` +
            `See ${logPath} for full output.`,
        ),
      );
    });
  });
}

/**
 * Open the page in headless Chrome, capture console errors, and check
 * whether anything actually rendered. Returns just what validation needs
 * — no measurements.
 */
async function checkPageRender(serverUrl, iterLabel) {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(`[pageerror] ${err.message}`);
    });

    await page.goto(serverUrl, {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });

    const rendered = await waitForRenderedContent(page, { iterLabel });

    return { consoleErrors, rendered };
  } catch (err) {
    return {
      consoleErrors: [`[validation-error] ${err.message}`],
      rendered: false,
    };
  } finally {
    await browser.close();
  }
}

/**
 * Identify whether the captured console errors indicate a fatal problem
 * (one that prevents React from mounting), or whether the page simply
 * never rendered.
 */
const FATAL_PATTERNS = [
  /does not provide an export named/i,
  /is not defined/i,
  /Cannot read properties of (undefined|null)/i,
  /Failed to fetch dynamically imported module/i,
  /Failed to resolve module/i,
  /Unexpected token/i,
  /SyntaxError/i,
];

function detectFatalError(consoleErrors, rendered) {
  const fatalErrors = consoleErrors.filter((err) =>
    FATAL_PATTERNS.some((pat) => pat.test(err)),
  );

  if (fatalErrors.length > 0) {
    return fatalErrors.join("\n");
  }

  if (!rendered) {
    return "Page did not render any visible content within the timeout period";
  }

  return null;
}
