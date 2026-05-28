/**
 * Screenshot capture.
 *
 * Data point: PNG screenshots of the rendered app at four breakpoints
 * (mobile / tablet / laptop / desktop) × two color schemes (light / dark)
 * = 8 images per iteration.
 *
 * The primary screenshot (laptop / light) is saved as `screenshot.png`
 * for backward compatibility with the visual-diff pipeline. The other
 * seven are saved as `screenshot-{breakpoint}-{scheme}.png`.
 *
 * Per-shot outcomes are logged to `_screenshot.txt` in the iteration
 * directory — mirroring `_npm_install.txt` / `_tsc_check.txt` /
 * `_dev_server.txt` — so when something goes wrong the failure is
 * still on disk after the run finishes.
 *
 * Each shot is wrapped individually: one failed viewport no longer
 * tanks the remaining seven. The function returns the primary
 * screenshot's path if it succeeded, otherwise null.
 *
 * Self-contained: opens its own browser instance.
 */

import { appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { launchBrowser, waitForRenderedContent } from "./puppeteer-helpers.js";

/** Breakpoints for responsive screenshots. */
export const SCREENSHOT_BREAKPOINTS = [
  { name: "mobile", width: 375, height: 812, label: "Mobile (375×812)" },
  { name: "tablet", width: 768, height: 1024, label: "Tablet (768×1024)" },
  { name: "laptop", width: 1440, height: 900, label: "Laptop (1440×900)" },
  { name: "desktop", width: 1920, height: 1080, label: "Desktop (1920×1080)" },
];

export const COLOR_SCHEMES = [
  { name: "light", scheme: "light" },
  { name: "dark", scheme: "dark" },
];

/**
 * Capture screenshots at every (breakpoint × color scheme) combination.
 *
 * @param {string} serverUrl
 * @param {string} iterDir
 * @param {string} [iterLabel]
 * @returns {Promise<string|null>} — path to the primary (laptop/light) screenshot, or null on failure
 */
export async function captureScreenshots(serverUrl, iterDir, iterLabel) {
  const logPath = resolve(iterDir, "_screenshot.txt");
  const lines = [
    `\n--- screenshots [${new Date().toISOString()}] serverUrl=${serverUrl} ---`,
  ];
  const log = (msg) => lines.push(msg);

  let browser;
  let primaryPath = null;
  const total = SCREENSHOT_BREAKPOINTS.length * COLOR_SCHEMES.length;
  let okCount = 0;

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    for (const cs of COLOR_SCHEMES) {
      try {
        await page.emulateMediaFeatures([
          { name: "prefers-color-scheme", value: cs.scheme },
        ]);
      } catch (err) {
        log(`[scheme=${cs.name}] emulateMediaFeatures failed: ${err.message}`);
        continue;
      }

      for (const bp of SCREENSHOT_BREAKPOINTS) {
        const tag = `${bp.name}-${cs.name}`;
        const isDefault = bp.name === "laptop" && cs.name === "light";
        const filename = isDefault
          ? "screenshot.png"
          : `screenshot-${tag}.png`;
        const filepath = resolve(iterDir, filename);

        try {
          await page.setViewport({ width: bp.width, height: bp.height });
          await page.goto(serverUrl, {
            waitUntil: "networkidle2",
            timeout: 30_000,
          });
          await waitForRenderedContent(page, { iterLabel });
          // Extra breathing room for CSS transitions / font loading.
          await new Promise((r) => setTimeout(r, 1000));
          await page.screenshot({ path: filepath, fullPage: false });

          okCount++;
          log(`[${tag}] OK ${bp.width}x${bp.height} → ${filename}`);
          if (isDefault) primaryPath = filepath;
        } catch (err) {
          // Keep going — one bad viewport shouldn't kill the others.
          log(`[${tag}] FAILED ${bp.width}x${bp.height}: ${err.message}`);
        }
      }
    }

    log(`Summary: ${okCount}/${total} screenshots saved.`);
    if (iterLabel) {
      console.log(
        `[${iterLabel}] ${okCount}/${total} screenshots saved (see _screenshot.txt)`,
      );
    }
    return primaryPath;
  } catch (err) {
    log(`FATAL: ${err.message}`);
    if (iterLabel) {
      console.warn(
        `[${iterLabel}] Screenshot capture failed: ${err.message} (see _screenshot.txt)`,
      );
    }
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
    try {
      await appendFile(logPath, lines.join("\n") + "\n", "utf-8");
    } catch {
      // If we can't even write the log file, there's nothing more we can do.
    }
  }
}
