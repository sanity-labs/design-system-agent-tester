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
 * Logs are written to `_npm_install.txt` and `_tsc_check.txt` inside the
 * iteration directory so debugging doesn't require recreating the run.
 *
 * This file does NOT take measurements (no DOM counting, no screenshots,
 * no semantic-HTML analysis). Each of those lives in its own module.
 */

import { resolve, dirname } from "node:path";
import { appendFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { launchBrowser, waitForRenderedContent } from "./puppeteer-helpers.js";

const execFileAsync = promisify(execFile);

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

    const devServer = await startDevServer(projectDir, iterLabel);
    result.devServer = devServer;
    result.serverUrl = await waitForServerUrl(devServer);

    console.log(
      `[${iterLabel}] Dev server at ${result.serverUrl}, validating...`,
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
 */
export function killDevServer(devServer) {
  if (devServer && !devServer.killed) {
    devServer.kill("SIGTERM");
    setTimeout(() => {
      if (!devServer.killed) {
        devServer.kill("SIGKILL");
      }
    }, 3000);
  }
}

// ─── Internals ──────────────────────────────────────────────────────

async function runNpmInstall(projectDir, iterLabel) {
  console.log(`[${iterLabel}] Installing dependencies...`);
  const iterDir = dirname(projectDir);
  try {
    const { stdout, stderr } = await execFileAsync(
      "npm",
      ["install", "--no-audit", "--no-fund", "--legacy-peer-deps"],
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

    console.error(`[${iterLabel}] npm install failed:\n${detail}`);
    throw new Error(`npm install failed:\n${detail}`);
  }
}

async function runTypeCheck(projectDir, iterLabel) {
  const iterDir = dirname(projectDir);
  try {
    console.log(`[${iterLabel}] Running type check...`);
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
    console.warn(`[${iterLabel}] Type check found ${errorCount} error(s)`);

    if (errorCount > 0) {
      throw new Error(
        `TypeScript type check failed (${errorCount} error(s)):\n${errors}`,
      );
    }
  }
}

async function startDevServer(projectDir, iterLabel) {
  console.log(`[${iterLabel}] Starting dev server...`);
  return spawn("npm", ["run", "dev", "--", "--port", "0"], {
    cwd: projectDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, BROWSER: "none" },
  });
}

function waitForServerUrl(devServer) {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      reject(new Error("Dev server did not start within 30s"));
    }, 30_000);

    function handleData(data) {
      output += data.toString();
      const urlMatch = output.match(/https?:\/\/localhost:\d+/);
      if (urlMatch) {
        clearTimeout(timeout);
        resolve(urlMatch[0]);
      }
    }

    devServer.stdout.on("data", handleData);
    devServer.stderr.on("data", handleData);

    devServer.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    devServer.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(
          new Error(`Dev server exited with code ${code}.\nOutput: ${output}`),
        );
      }
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
