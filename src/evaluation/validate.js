/**
 * Project validation.
 *
 * Runs the generated project from start to finish:
 *
 *   1. `npm install` the dependencies the agent asked for
 *   2. Type check with `tsc --noEmit`
 *   3. Start the dev server
 *   4. Open the page in headless Chrome
 *   5. Record console errors and whether anything rendered
 *
 * Returns a result the runner uses to decide whether to carry on with the
 * other checks or go into the fix loop.
 *
 * Logs go to `_npm_install.txt`, `_tsc_check.txt` and `_dev_server.txt` in
 * the iteration directory, so debugging does not mean re-running anything.
 *
 * The dev server gets a random free port and is pinned to it, so a clash
 * fails loudly instead of quietly pointing the browser at another server.
 *
 * This file takes no measurements. Those each live in their own module.
 */

import { execFile, spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { appendFile, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { createServer } from "node:net";
import { dirname, join, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { error, tag, warn } from "../util/color.js";
import { launchBrowser, NAV_TIMEOUT_MS, waitForRenderedContent } from "./puppeteer-helpers.js";
import {
  extractMissingExports,
  hasConfigFallbackSignature,
  isTsconfigScaffoldError,
  memberInTypes,
  parseTsconfig,
} from "./tsc-flake.js";

const execFileAsync = promisify(execFile);

const DEV_SERVER_READY_TIMEOUT_MS = 30_000;

/**
 * Validate a generated project. Returns a result object — never throws.
 *
 * @param {string} projectDir
 * @param {string} iterLabel
 * @param {object} [opts]
 * @param {Array<string|RegExp>} [opts.renderFailureSignatures] - test-supplied
 *   patterns (config.js `renderFailureSignatures`); a rendered page whose
 *   body text matches one is treated as a fatal error, not a success. See
 *   `detectRenderFailureSignature`.
 * @param {number} [opts.minStylesheetRules=0] - test-supplied floor (config.js
 *   `minStylesheetRules`); a rendered page carrying fewer CSS rules than this
 *   is treated as a fatal error (its stylesheet build step never ran). 0
 *   disables the check. See `detectFatalError`.
 * @returns {Promise<{
 *   success: boolean,
 *   serverUrl: string|null,
 *   devServer: import("child_process").ChildProcess|null,
 *   rendered: boolean,
 *   consoleErrors: string[],
 *   fatalError: string|null
 * }>}
 */
export async function validateProject(projectDir, iterLabel, opts = {}) {
  const { renderFailureSignatures = [], minStylesheetRules = 0 } = opts;
  const result = {
    success: false,
    serverUrl: null,
    devServer: null,
    rendered: false,
    consoleErrors: [],
    fatalError: null,
    // True when this validation cycle failed at `npm install` (as
    // opposed to tsc, dev-server boot, or runtime render). Aggregated
    // into the report so the user can see which tests/models bleed fix
    // budget on dependency-install failures vs. real code errors.
    installFailed: false,
    // True when the type check initially failed with a toolchain-flake
    // signature (configless fallback / unsettled node_modules) and a single
    // retry passed. Counted in the report so infra noise is visible and
    // subtractable from agent-error analyses.
    tscFlaked: false,
    // True when the type check failed on a tsconfig/project-reference
    // scaffold error (see `isTsconfigScaffoldError`) — a broken config the
    // agent wrote, not a flake (retrying changes nothing) and not an
    // ordinary app-code bug. Counted separately in the report.
    tsconfigError: false,
  };

  try {
    await runNpmInstall(projectDir, iterLabel);
    const typeCheck = await runTypeCheck(projectDir, iterLabel);
    result.tscFlaked = !!typeCheck?.flaked;

    const iterDir = dirname(projectDir);
    const port = await getAvailablePort();
    const devServer = startDevServer(projectDir, iterLabel, port);
    result.devServer = devServer;
    // Owned by this validation attempt only — reset per call, so a Vite
    // error surfaced below can never be a stale one from a prior attempt
    // against a dev server that stayed alive across an HMR reload.
    const serverOutput = { text: "" };
    result.serverUrl = await waitForReady(devServer, port, iterDir, serverOutput);

    console.log(`${tag(iterLabel)} Dev server at ${result.serverUrl}, validating...`);

    const pageResult = await checkPageRender(result.serverUrl, iterLabel);
    result.consoleErrors = pageResult.consoleErrors;
    result.rendered = pageResult.rendered;

    const fatalError = detectFatalError(
      pageResult.consoleErrors,
      pageResult.rendered,
      serverOutput.text,
      pageResult.bodyText,
      renderFailureSignatures,
      pageResult.stylesheetRules,
      minStylesheetRules,
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
    if (err.stage === "install") result.installFailed = true;
    if (err.stage === "tsconfig") result.tsconfigError = true;
    killDevServer(result.devServer);
    result.devServer = null;
    return result;
  }
}

/**
 * Stop a dev server. Safe to call with null.
 *
 * `child.killed` only means a signal was sent, not that the process is
 * gone, so this checks whether it actually exited. The server starts Vite
 * as its own child, so the whole process group is signalled together.
 */
export function killDevServer(devServer) {
  if (!devServer) return;
  const exited = () => devServer.exitCode !== null || devServer.signalCode !== null;
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
    // Don't add --legacy-peer-deps. It stops npm installing peer dependencies
    // automatically, which modern packages rely on. The tree ends up
    // incomplete, which showed up as type errors about props that do exist.
    const { stdout, stderr } = await execFileAsync("npm", ["install", "--no-audit", "--no-fund"], {
      cwd: projectDir,
      timeout: 120_000,
    });

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
    const wrapped = new Error(`npm install failed:\n${detail}`);
    // `stage` lets `validateProject` distinguish install failures from
    // tsc / dev-server / runtime failures without string-matching the
    // error message.
    wrapped.stage = "install";
    throw wrapped;
  }
}

/**
 * Check the things tsc is about to rely on:
 *   - tsconfig.json exists and can be parsed. Without it tsc quietly falls
 *     back to defaults and reports a flood of errors that are not real.
 *   - every declared dependency, and tsc itself, is actually installed. A
 *     half-finished install produces the same flood.
 *
 * Returns { tsconfig, missing, tscBin }. `missing` is empty when ready.
 */
async function preflightTypeCheck(projectDir) {
  // A missing tsconfig.json is a broken project. A file we cannot parse is
  // not fatal, since tsc's dialect is the real authority and ours is only an
  // approximation; it just means one of the flake checks cannot run.
  let tsconfigRaw = null;
  try {
    tsconfigRaw = await readFile(join(projectDir, "tsconfig.json"), "utf-8");
  } catch {
    const err = new Error(
      "tsconfig.json is missing — the project scaffold is broken. " +
        "Emit a tsconfig.json at the project root.",
    );
    err.stage = "scaffold";
    throw err;
  }
  const tsconfig = parseTsconfig(tsconfigRaw);

  // Check each dependency is on disk. This looks at the filesystem rather
  // than trying to import it, because some packages hide their package.json
  // from imports and would look missing when they are installed fine.
  const installed = async (name) => {
    try {
      await readFile(join(projectDir, "node_modules", ...name.split("/"), "package.json"), "utf-8");
      return true;
    } catch {
      return false;
    }
  };

  let declared = [];
  try {
    const pkg = JSON.parse(await readFile(join(projectDir, "package.json"), "utf-8"));
    declared = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
  } catch {
    declared = []; // package.json problems surface via npm install itself
  }
  const missing = [];
  for (const name of declared) {
    if (!(await installed(name))) missing.push(name);
  }

  // The compiler binary: prefer the project's own install; fall back to
  // normal resolution (hoisted/workspace setups) before declaring it missing.
  let tscBin = join(projectDir, "node_modules", "typescript", "bin", "tsc");
  try {
    await readFile(tscBin, "utf-8");
  } catch {
    try {
      tscBin = createRequire(join(projectDir, "package.json")).resolve("typescript/bin/tsc");
    } catch {
      tscBin = null;
      missing.push("typescript");
    }
  }

  return { tsconfig, missing, tscBin };
}

/** One tsc invocation via the project's own compiler. Returns { ok, errors }. */
async function execTscOnce(projectDir, tscBin) {
  try {
    await execFileAsync(process.execPath, [tscBin, "--noEmit"], {
      cwd: projectDir,
      timeout: 60_000,
    });
    return { ok: true, errors: "" };
  } catch (tscErr) {
    const stderr = (tscErr.stderr || "").trim();
    const stdout = (tscErr.stdout || "").trim();
    return { ok: false, errors: stdout || stderr || tscErr.message };
  }
}

/**
 * True when the failure does not match what is actually on disk, which
 * means it is toolchain noise rather than a problem with the agent's code.
 */
function isWithin(root, p) {
  const r = resolve(root);
  const full = resolve(root, p);
  return full === r || full.startsWith(r + sep);
}

async function isSuspiciousTscFailure(projectDir, tsconfig, errors) {
  if (hasConfigFallbackSignature(errors) && tsconfig?.compilerOptions?.jsx) return true;

  const nmRoot = join(projectDir, "node_modules");
  for (const { module, member } of extractMissingExports(errors).slice(0, 5)) {
    try {
      // Both the module name and the package's own types field are influenced
      // by the agent or by an installed package, so keep every path built from
      // them inside the project. Otherwise a value like `../../../etc/passwd`
      // would turn this into a way to read any file.
      const modSegments = module.split("/");
      if (modSegments.includes("..")) continue;
      // Filesystem path, not require.resolve — `exports` maps that hide
      // "./package.json" would make installed packages unreadable here.
      const pkgDir = join(nmRoot, ...modSegments);
      if (!isWithin(nmRoot, pkgDir)) continue;
      const pkg = JSON.parse(await readFile(join(pkgDir, "package.json"), "utf-8"));
      const typesRel = pkg.types || pkg.typings || "dist/index.d.ts";
      const dtsPath = join(pkgDir, typesRel);
      if (!isWithin(pkgDir, dtsPath)) continue; // types must stay within the package
      const dts = await readFile(dtsPath, "utf-8");
      if (memberInTypes(dts, member)) return true; // export exists — tsc lied
    } catch {
      // package or types unreadable — can't prove a flake from this line
    }
  }
  return false;
}

async function runTypeCheck(projectDir, iterLabel) {
  const iterDir = dirname(projectDir);
  console.log(`${tag(iterLabel)} Running type check...`);

  // Pre-flight: never run tsc against a half-written config or a
  // half-installed tree — that produces error storms that look like (and get
  // counted as) agent mistakes. One reinstall heals an unsettled tree.
  let pre = await preflightTypeCheck(projectDir);
  if (pre.missing.length > 0) {
    console.warn(
      `${tag(iterLabel)} ${warn(`node_modules not settled (unresolvable: ${pre.missing.join(", ")}) — reinstalling once`)}`,
    );
    await appendFile(
      resolve(iterDir, "_tsc_check.txt"),
      `--- preflight [${new Date().toISOString()}] node_modules not settled (${pre.missing.join(", ")}) — reinstalling ---\n\n`,
      "utf-8",
    );
    await runNpmInstall(projectDir, iterLabel);
    pre = await preflightTypeCheck(projectDir);
    if (pre.missing.length > 0) {
      const err = new Error(
        `npm install failed:\ndependencies unresolvable after reinstall: ${pre.missing.join(", ")}` +
          (pre.missing.includes("typescript") ? " (typescript must be a devDependency)" : ""),
      );
      err.stage = "install";
      throw err;
    }
  }

  let attempt = await execTscOnce(projectDir, pre.tscBin);
  let flaked = false;

  if (!attempt.ok && (await isSuspiciousTscFailure(projectDir, pre.tsconfig, attempt.errors))) {
    // The failure contradicts the on-disk state (config parses + has jsx, or
    // the "missing" exports exist in the installed types). Retry ONCE after a
    // short settle instead of reporting toolchain noise as agent errors.
    await appendFile(
      resolve(iterDir, "_tsc_check.txt"),
      `--- tsc --noEmit [${new Date().toISOString()}] FLAKE-SUSPECT FAILURE (retrying once) ---\n${attempt.errors}\n\n`,
      "utf-8",
    );
    console.warn(
      `${tag(iterLabel)} ${warn("Type check failure contradicts on-disk state — retrying once")}`,
    );
    await new Promise((r) => setTimeout(r, 2_000));
    const retry = await execTscOnce(projectDir, pre.tscBin);
    if (retry.ok) {
      flaked = true;
      await appendFile(
        resolve(iterDir, "_tsc_check.txt"),
        `--- tsc --noEmit [${new Date().toISOString()}] FLAKE DETECTED — retry passed; first failure was transient ---\n\n`,
        "utf-8",
      );
      console.warn(
        `${tag(iterLabel)} ${warn("FLAKE DETECTED — tsc retry passed; counting as toolchain noise")}`,
      );
    }
    attempt = retry;
  }

  const ts = new Date().toISOString();
  if (attempt.ok) {
    await appendFile(
      resolve(iterDir, "_tsc_check.txt"),
      `--- tsc --noEmit [${ts}] OK ---\nNo type errors.\n\n`,
      "utf-8",
    );
    return { flaked };
  }

  const errors = attempt.errors;
  await appendFile(
    resolve(iterDir, "_tsc_check.txt"),
    `--- tsc --noEmit [${ts}] FAILED ---\n${errors}\n\n`,
    "utf-8",
  );

  const errorCount = (errors.match(/\): error TS/g) || []).length;
  console.warn(`${tag(iterLabel)} ${warn(`Type check found ${errorCount} error(s)`)}`);

  if (errorCount > 0) {
    const err = new Error(`TypeScript type check failed (${errorCount} error(s)):\n${errors}`);
    // Not a flake (retrying tsc changes nothing) — the tsconfig/project-
    // reference setup the agent wrote is itself invalid. `stage` lets
    // `validateProject` count this separately from ordinary app-code errors.
    if (isTsconfigScaffoldError(errors)) err.stage = "tsconfig";
    throw err;
  }

  // tsc exited non-zero but we couldn't parse any `): error TS` lines.
  // That's not "types are fine" — it's tsc itself failing (bad tsconfig,
  // a crash, a timeout, "Cannot find module"). Surface it instead of
  // letting validation proceed as if the type check passed.
  throw new Error(`Type check could not run (tsc exited abnormally):\n${errors}`);
}

/**
 * Get a free port by binding to port 0 and reading back what the OS picked.
 * There is a small gap between releasing it and the dev server taking it,
 * so the server is pinned to that exact port and fails loudly on a clash.
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
 * Start the dev server on a port already known to be free. Pinning the port
 * makes Vite exit on a clash instead of quietly moving to the next one,
 * which used to leave the harness talking to the wrong server.
 */
function startDevServer(projectDir, iterLabel, port) {
  console.log(`${tag(iterLabel)} Starting dev server on port ${port}...`);
  return spawn("npm", ["run", "dev", "--", "--port", String(port), "--strictPort"], {
    cwd: projectDir,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, BROWSER: "none" },
    // Own process group on POSIX so killDevServer can signal npm AND
    // the Vite child it spawns in one shot.
    detached: process.platform !== "win32",
  });
}

/**
 * Write the dev server's output to `_dev_server.txt` while watching for it
 * to become ready. Resolves with the URL we built ourselves, since we
 * already know the port.
 *
 * Ready means either the port shows up in a localhost URL, or the server
 * prints its usual startup line.
 */
function waitForReady(devServer, port, iterDir, serverOutput) {
  const logPath = resolve(iterDir, "_dev_server.txt");
  const stream = createWriteStream(logPath, { flags: "a" });
  stream.write(`\n--- dev server [${new Date().toISOString()}] port=${port} ---\n`);

  const readyPattern = new RegExp(`https?:\\/\\/localhost:${port}\\b|ready in \\d+\\s*ms`, "i");

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
      if (resolved) {
        if (serverOutput) serverOutput.text += text;
        return;
      }
      preReadyOutput += text;
      if (readyPattern.test(preReadyOutput)) {
        resolved = true;
        clearTimeout(timer);
        // Leave the stream + data listeners attached so post-ready
        // output (warnings, eventual crashes) keeps landing in the log
        // (and, from here on, in `serverOutput` too).
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
      // When the server dies before it is ready, the reason is sitting in the
      // output it already printed. Without passing that along, the model only
      // sees "exited with code 1" and wastes a fix attempt guessing why.
      const viteError = extractViteServerError(preReadyOutput);
      rejectFn(
        new Error(
          `Dev server exited with code ${code} before becoming ready.` +
            (viteError ? ` ${viteError}` : "") +
            ` See ${logPath} for full output.`,
        ),
      );
    });
  });
}

/**
 * Open the page in headless Chrome, collect console errors, and check
 * whether anything rendered. Returns only what validation needs.
 */
async function checkPageRender(serverUrl, iterLabel) {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(NAV_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
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
      timeout: NAV_TIMEOUT_MS,
    });

    const rendered = await waitForRenderedContent(page, { iterLabel });

    // Collected whether or not the page rendered. Some libraries print their
    // own error message as ordinary text instead of throwing, which counts as
    // "something is on the page" while the app is entirely broken.
    const bodyText = await page
      .evaluate(() => document.body.innerText)
      .catch(() => "");

    // How many CSS rules the page loaded. When a stylesheet build step never
    // runs, the result is valid HTML with browser default styling: it
    // renders, nothing throws, and the console is clean. This count is the
    // only way to tell.
    const stylesheetRules = await page
      .evaluate(() => {
        let total = 0;
        const count = (rules) => {
          for (const rule of Array.from(rules)) {
            total++;
            if (rule.cssRules) count(rule.cssRules);
          }
        };
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            count(sheet.cssRules);
          } catch {
            // cross-origin stylesheet — not introspectable, ignore
          }
        }
        return total;
      })
      .catch(() => null);

    return { consoleErrors, rendered, bodyText, stylesheetRules };
  } catch (err) {
    return {
      consoleErrors: [`[validation-error] ${err.message}`],
      rendered: false,
      bodyText: "",
      stylesheetRules: null,
    };
  } finally {
    await browser.close();
  }
}

/**
 * Work out whether the console errors mean something fatal stopped React
 * from mounting, or whether the page simply never rendered.
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

/**
 * Catch a page whose only visible content is a library's own error message
 * rather than the app, such as a theme provider printing a warning in place
 * of the tree instead of throwing.
 *
 * This passes both the other checks: there is content on the page and
 * nothing was logged. Only the test knows what its own library prints, so
 * the patterns come from its `renderFailureSignatures` config.
 */
export function detectRenderFailureSignature(bodyText, signatures) {
  if (!bodyText || !signatures?.length) return null;
  for (const sig of signatures) {
    const pattern = sig instanceof RegExp ? sig : new RegExp(sig, "i");
    if (pattern.test(bodyText)) {
      return bodyText.trim().slice(0, 300);
    }
  }
  return null;
}

export function detectFatalError(
  consoleErrors,
  rendered,
  serverOutput,
  bodyText = "",
  renderFailureSignatures = [],
  stylesheetRules = null,
  minStylesheetRules = 0,
) {
  const fatalErrors = consoleErrors.filter((err) => FATAL_PATTERNS.some((pat) => pat.test(err)));

  if (fatalErrors.length > 0) {
    return fatalErrors.join("\n");
  }

  if (!rendered) {
    // The browser saw nothing fatal, but that only means nothing reached
    // it — a Vite dev-server-side error (bad import specifier, esbuild
    // pre-transform failure) never gets to the page at all. Prefer that
    // over the content-free fallback whenever one is present.
    const viteError = extractViteServerError(serverOutput);
    if (viteError) return viteError;
    return "Page did not render any visible content within the timeout period";
  }

  const signatureMatch = detectRenderFailureSignature(bodyText, renderFailureSignatures);
  if (signatureMatch) {
    return `Page rendered a known failure signature instead of the app: "${signatureMatch}"`;
  }

  // A page whose stylesheet step never ran still renders, with no error and
  // nothing in the console. Only a test that knows its own stack ships CSS
  // can say what too few rules means, so this is opt-in per test and off by
  // default.
  if (minStylesheetRules > 0 && stylesheetRules !== null && stylesheetRules < minStylesheetRules) {
    return (
      `Page rendered but almost no CSS was applied: ${stylesheetRules} stylesheet rule(s) found, ` +
      `expected at least ${minStylesheetRules}. The project's stylesheet build step most likely never ran — ` +
      `check that any CSS-framework plugin is both installed AND registered in the build config, and that the ` +
      `CSS entry file is actually imported. The page is valid HTML with browser-default styling.`
    );
  }

  return null;
}

/**
 * Errors from the dev server itself, such as an import it cannot resolve,
 * are only printed to its own output. The browser never sees them, so the
 * console-error checks above never find them and the page just fails to
 * render with no explanation.
 */
const VITE_SERVER_ERROR_PATTERNS = [
  /Internal server error:/i,
  /Pre-transform error:/i,
  /Missing ".*" specifier in ".*" package/i,
  /Failed to resolve import/i,
  /Failed to scan for dependencies/i,
  // vite.config.ts itself failing to load (e.g. it imports a devDependency
  // the model forgot to declare in package.json, like `@vitejs/plugin-react`)
  // crashes the process before any of the Vite-specific banners above ever
  // print — this is a plain Node `require()`/`import` failure instead.
  /failed to load config from/i,
  /error when starting dev server:/i,
  /Cannot find (module|package) /i,
];

/**
 * Pull the first server error out of the dev server output since it last
 * reported ready. Returns the error line plus the few lines after it, which
 * is where the file and line number are, and stops before the noise.
 */
const ANSI_ESCAPE_PATTERN = /\[[0-9;]*m/g;

export function extractViteServerError(serverOutput) {
  if (!serverOutput) return null;
  const cleaned = serverOutput.replace(ANSI_ESCAPE_PATTERN, "");
  const lines = cleaned.split("\n");
  const startIdx = lines.findIndex((line) =>
    VITE_SERVER_ERROR_PATTERNS.some((pat) => pat.test(line)),
  );
  if (startIdx === -1) return null;

  const MAX_CONTEXT_LINES = 10;
  const block = [];
  for (let i = startIdx; i < lines.length && block.length < MAX_CONTEXT_LINES; i++) {
    // Internal call-stack frames add noise without diagnostic value —
    // stop the block there rather than dumping the whole esbuild trace.
    if (/^\s+at\s+\S/.test(lines[i]) && block.length > 0) break;
    block.push(lines[i]);
  }
  return block.join("\n").trim();
}
