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
 * Self-contained: opens its own browser instance.
 */

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
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    let primaryPath = null;

    for (const cs of COLOR_SCHEMES) {
      await page.emulateMediaFeatures([
        { name: "prefers-color-scheme", value: cs.scheme },
      ]);

      for (const bp of SCREENSHOT_BREAKPOINTS) {
        await page.setViewport({ width: bp.width, height: bp.height });

        await page.goto(serverUrl, {
          waitUntil: "networkidle2",
          timeout: 30_000,
        });

        await waitForRenderedContent(page, { iterLabel });

        // Extra breathing room for CSS transitions / font loading
        await new Promise((r) => setTimeout(r, 1000));

        // Primary screenshot: laptop + light (backward-compatible filename)
        const isDefault = bp.name === "laptop" && cs.name === "light";
        const filename = isDefault
          ? "screenshot.png"
          : `screenshot-${bp.name}-${cs.name}.png`;
        const filepath = resolve(iterDir, filename);
        await page.screenshot({ path: filepath, fullPage: false });

        if (isDefault) {
          primaryPath = filepath;
        }
      }
    }

    if (iterLabel) {
      const total = SCREENSHOT_BREAKPOINTS.length * COLOR_SCHEMES.length;
      console.log(
        `[${iterLabel}] ${total} screenshots saved (${SCREENSHOT_BREAKPOINTS.map((b) => b.name).join(", ")} × ${COLOR_SCHEMES.map((c) => c.name).join(", ")})`,
      );
    }
    return primaryPath;
  } catch (err) {
    if (iterLabel) {
      console.warn(`[${iterLabel}] Screenshot capture failed: ${err.message}`);
    }
    return null;
  } finally {
    await browser.close();
  }
}
