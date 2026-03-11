import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Validate a generated project by installing deps, starting the dev server,
 * and checking whether the page renders without fatal errors.
 *
 * Returns a structured result — does NOT take a screenshot.
 *
 * @param {string} projectDir - Path to the generated project
 * @param {string} iterLabel - Label for logging
 * @returns {Promise<{
 *   success: boolean,
 *   serverUrl: string|null,
 *   rendered: boolean,
 *   consoleErrors: string[],
 *   fatalError: string|null,
 *   devServer: import("child_process").ChildProcess|null
 * }>}
 */
export async function validateProject(projectDir, iterLabel) {
  const result = {
    success: false,
    serverUrl: null,
    rendered: false,
    consoleErrors: [],
    fatalError: null,
    devServer: null,
  };

  try {
    // Install dependencies
    console.log(`[${iterLabel}] Installing dependencies...`);
    await execFileAsync("npm", ["install", "--no-audit", "--no-fund"], {
      cwd: projectDir,
      timeout: 120_000,
    });

    // Start dev server
    console.log(`[${iterLabel}] Starting dev server...`);
    const devServer = spawn("npm", ["run", "dev", "--", "--port", "0"], {
      cwd: projectDir,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, BROWSER: "none" },
    });
    result.devServer = devServer;

    // Wait for server to print a URL
    result.serverUrl = await waitForServerUrl(devServer, iterLabel);

    console.log(
      `[${iterLabel}] Dev server at ${result.serverUrl}, validating...`,
    );

    // Open the page and check for errors + rendered content
    const pageResult = await checkPage(result.serverUrl, iterLabel);
    result.consoleErrors = pageResult.consoleErrors;
    result.rendered = pageResult.rendered;

    // Determine if there are fatal errors (page crashes / missing exports)
    // Fatal errors are ones that prevent React from mounting at all
    const fatalPatterns = [
      /does not provide an export named/i,
      /is not defined/i,
      /Cannot read properties of (undefined|null)/i,
      /Failed to fetch dynamically imported module/i,
      /Failed to resolve module/i,
      /Unexpected token/i,
      /SyntaxError/i,
    ];

    const fatalErrors = pageResult.consoleErrors.filter((err) =>
      fatalPatterns.some((pat) => pat.test(err)),
    );

    if (fatalErrors.length > 0) {
      result.fatalError = fatalErrors.join("\n");
      result.success = false;
    } else if (!pageResult.rendered) {
      // No fatal JS errors but nothing rendered — could be a subtler issue
      result.fatalError =
        "Page did not render any visible content within the timeout period";
      result.success = false;
    } else {
      result.success = true;
    }

    return result;
  } catch (err) {
    result.fatalError = err.message;
    result.success = false;
    // Kill the dev server if it was started
    killDevServer(result.devServer);
    result.devServer = null;
    return result;
  }
  // Note: caller is responsible for killing devServer when done
}

/**
 * Kill a dev server process cleanly.
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

/**
 * Full screenshot pipeline: validate + capture.
 * This is the simple all-in-one function for callers that don't need the
 * iterative fix loop.
 *
 * @param {string} projectDir - Path to the generated project
 * @param {string} iterDir - Path to the iteration output directory
 * @param {string} iterLabel - Label for logging
 * @returns {Promise<{
 *   screenshotPath: string|null,
 *   rendered: boolean,
 *   consoleErrors: string[],
 *   fatalError: string|null
 * }>}
 */
export async function attemptScreenshot(projectDir, iterDir, iterLabel) {
  const validation = await validateProject(projectDir, iterLabel);

  try {
    let screenshotPath = null;

    if (validation.serverUrl) {
      screenshotPath = await captureScreenshot(
        validation.serverUrl,
        iterDir,
        iterLabel,
      );
    }

    // Save console errors if any
    if (validation.consoleErrors.length > 0) {
      const errLog = validation.consoleErrors.join("\n");
      await writeFile(resolve(iterDir, "_console_errors.txt"), errLog, "utf-8");
      console.warn(
        `[${iterLabel}] ${validation.consoleErrors.length} console error(s) captured — see _console_errors.txt`,
      );
    }

    return {
      screenshotPath,
      rendered: validation.rendered,
      consoleErrors: validation.consoleErrors,
      fatalError: validation.fatalError,
    };
  } finally {
    killDevServer(validation.devServer);
  }
}

/**
 * Capture a screenshot from a running dev server URL.
 * Assumes the page is already validated / server is running.
 *
 * @param {string} serverUrl - The dev server URL to screenshot
 * @param {string} iterDir - Directory to write the screenshot to
 * @param {string} iterLabel - Label for logging
 * @returns {Promise<string|null>} Path to the screenshot file, or null on failure
 */
export async function captureScreenshot(serverUrl, iterDir, iterLabel) {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    await page.goto(serverUrl, {
      waitUntil: "networkidle2",
      timeout: 30_000,
    });

    // Wait for content to render
    await waitForRenderedContent(page, iterLabel);

    // Extra breathing room for CSS transitions / font loading
    await new Promise((r) => setTimeout(r, 1500));

    const screenshotFile = resolve(iterDir, "screenshot.png");
    await page.screenshot({ path: screenshotFile, fullPage: false });
    console.log(`[${iterLabel}] Screenshot saved`);

    return screenshotFile;
  } catch (err) {
    console.warn(`[${iterLabel}] Screenshot capture failed: ${err.message}`);
    return null;
  } finally {
    await browser.close();
  }
}

/**
 * Open a page in a headless browser and check for console errors + rendered content.
 * Does NOT take a screenshot — purely for validation.
 *
 * @param {string} serverUrl - The dev server URL to check
 * @param {string} iterLabel - Label for logging
 * @returns {Promise<{ consoleErrors: string[], rendered: boolean }>}
 */
async function checkPage(serverUrl, iterLabel) {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

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

    const rendered = await waitForRenderedContent(page, iterLabel);

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
 * Wait for the dev server to emit a localhost URL.
 */
function waitForServerUrl(devServer, iterLabel) {
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
 * Poll the page until we detect that something has actually rendered,
 * or give up after a timeout.
 *
 * @returns {Promise<boolean>} true if content was detected
 */
async function waitForRenderedContent(page, iterLabel) {
  const MAX_WAIT_MS = 15_000;
  const POLL_INTERVAL_MS = 500;
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    const hasContent = await page.evaluate(() => {
      // Check common React/app root containers
      const roots = document.querySelectorAll(
        "#root, #app, [data-sanity], #__next, [data-ui]",
      );
      for (const root of roots) {
        if (root.children.length > 0 && root.offsetHeight > 0) {
          return true;
        }
      }

      // Fallback: count visible elements
      const allElements = document.body.querySelectorAll("*");
      let visibleCount = 0;
      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          visibleCount++;
        }
        if (visibleCount >= 5) {
          return true;
        }
      }

      return false;
    });

    if (hasContent) {
      const elapsed = Date.now() - start;
      console.log(`[${iterLabel}] Content detected after ${elapsed}ms`);
      return true;
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  console.warn(
    `[${iterLabel}] Page may not have rendered meaningful content within ${MAX_WAIT_MS}ms`,
  );
  return false;
}
