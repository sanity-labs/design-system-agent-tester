import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn, execFile, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "..");
const OUTPUT_ROOT = path.join(ROOT, "output");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IterationEntry {
  /** e.g. "control" or "training" */
  prompt: string;
  /** e.g. "iteration-1" */
  name: string;
  /** Full path to the iteration directory */
  iterDir: string;
  /** Full path to the generated Vite+React project */
  projectDir: string;
  /** Display label for test titles, e.g. "control / iteration-1" */
  label: string;
}

interface A11yResults {
  label: string;
  timestamp: string;
  tests: Record<
    string,
    {
      status: "passed" | "failed" | "skipped";
      details?: unknown;
    }
  >;
  axeViolationCount: number;
  axeViolations: unknown[];
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

/**
 * Resolve the run directory to scan. Supports:
 *  - A11Y_RUN_DIR env var pointing at a specific timestamped run dir
 *  - Auto-detection of the latest timestamped dir under output/
 *  - Fallback to flat output/ for old-style layouts
 */
function resolveRunDir(): string {
  const explicit = process.env.A11Y_RUN_DIR?.trim();
  if (explicit) {
    const abs = path.isAbsolute(explicit)
      ? explicit
      : path.resolve(ROOT, explicit);
    if (existsSync(abs)) return abs;
  }

  if (!existsSync(OUTPUT_ROOT)) return OUTPUT_ROOT;

  // Collect all run directories: both new (YYYY-MM-DD/HH.MM) and legacy (YYYY-MM-DD-HH.MM)
  const entries = readdirSync(OUTPUT_ROOT, { withFileTypes: true });
  const runs: Array<{ sortKey: string; fullPath: string }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    // New format: date directory containing time subdirectories
    if (/^\d{4}-\d{2}-\d{2}$/.test(entry.name)) {
      const dateDir = path.join(OUTPUT_ROOT, entry.name);
      const subs = readdirSync(dateDir, { withFileTypes: true });
      for (const sub of subs) {
        if (sub.isDirectory() && /^\d{2}\.\d{2}$/.test(sub.name)) {
          runs.push({
            sortKey: `${entry.name}-${sub.name}`,
            fullPath: path.join(dateDir, sub.name),
          });
        }
      }
    }

    // Legacy format: YYYY-MM-DD-HH.MM
    if (/^\d{4}-\d{2}-\d{2}-\d{2}\.\d{2}$/.test(entry.name)) {
      runs.push({
        sortKey: entry.name,
        fullPath: path.join(OUTPUT_ROOT, entry.name),
      });
    }
  }

  runs.sort((a, b) => b.sortKey.localeCompare(a.sortKey)); // newest first

  if (runs.length > 0) {
    return runs[0].fullPath;
  }

  return OUTPUT_ROOT;
}

function discoverIterations(): IterationEntry[] {
  const promptFilter = process.env.A11Y_PROMPT?.trim().toLowerCase();
  const iterationFilter = process.env.A11Y_ITERATION?.trim();
  const runDir = resolveRunDir();

  const promptKeys = ["control", "training"];
  const iterations: IterationEntry[] = [];

  for (const prompt of promptKeys) {
    if (promptFilter && prompt !== promptFilter) continue;

    const promptDir = path.join(runDir, prompt);
    if (!existsSync(promptDir)) continue;

    const entries = readdirSync(promptDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (!entry.name.startsWith("iteration-")) continue;

      if (iterationFilter) {
        const iterNum = entry.name.replace(/\D/g, "");
        if (iterNum !== iterationFilter) continue;
      }

      const iterDir = path.join(promptDir, entry.name);
      const projectDir = path.join(iterDir, "project");
      const pkgJson = path.join(projectDir, "package.json");

      if (!existsSync(pkgJson)) continue;

      iterations.push({
        prompt,
        name: entry.name,
        iterDir,
        projectDir,
        label: `${prompt} / ${entry.name}`,
      });
    }
  }

  iterations.sort((a, b) => {
    if (a.prompt !== b.prompt) return a.prompt.localeCompare(b.prompt);
    const numA = parseInt(a.name.replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(b.name.replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });

  return iterations;
}

// ---------------------------------------------------------------------------
// Dev server helpers (mirrors patterns from src/screenshot.js)
// ---------------------------------------------------------------------------

function waitForServerUrl(
  devServer: ChildProcess,
  timeoutMs = 60_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = "";
    const timeout = setTimeout(() => {
      reject(new Error(`Dev server did not print a URL within ${timeoutMs}ms`));
    }, timeoutMs);

    function handleData(data: Buffer) {
      output += data.toString();
      const urlMatch = output.match(/https?:\/\/localhost:\d+/);
      if (urlMatch) {
        clearTimeout(timeout);
        resolve(urlMatch[0]);
      }
    }

    devServer.stdout?.on("data", handleData);
    devServer.stderr?.on("data", handleData);

    devServer.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    devServer.on("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(
          new Error(
            `Dev server exited with code ${code}.\nOutput:\n${output.slice(-2000)}`,
          ),
        );
      }
    });
  });
}

function killDevServer(devServer: ChildProcess | null) {
  if (!devServer || devServer.killed) return;
  devServer.kill("SIGTERM");
  setTimeout(() => {
    if (!devServer.killed) {
      devServer.kill("SIGKILL");
    }
  }, 3_000);
}

// ---------------------------------------------------------------------------
// Page readiness helper
// ---------------------------------------------------------------------------

async function waitForRenderedContent(
  page: Page,
  timeoutMs = 15_000,
): Promise<boolean> {
  const pollInterval = 500;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const hasContent = await page.evaluate(() => {
      const roots = document.querySelectorAll(
        "#root, #app, [data-sanity], #__next, [data-ui]",
      );
      for (const root of roots) {
        if (root.children.length > 0 && (root as HTMLElement).offsetHeight > 0)
          return true;
      }
      const allElements = document.body.querySelectorAll("*");
      let visibleCount = 0;
      for (const el of allElements) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          visibleCount++;
        }
        if (visibleCount >= 5) return true;
      }
      return false;
    });

    if (hasContent) return true;
    await new Promise((r) => setTimeout(r, pollInterval));
  }

  return false;
}

// ---------------------------------------------------------------------------
// Result persistence
// ---------------------------------------------------------------------------

function saveA11yResults(iterDir: string, results: A11yResults) {
  try {
    const outPath = path.join(iterDir, "_a11y_results.json");
    writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8");
  } catch {
    // Non-fatal
  }
}

// ---------------------------------------------------------------------------
// Shared navigation helper — loads the page + waits for content
// ---------------------------------------------------------------------------

async function navigateAndWait(page: Page, url: string): Promise<boolean> {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
  return waitForRenderedContent(page);
}

// ---------------------------------------------------------------------------
// Test suite — organized by the accessibility checklist categories from
// accessibility-standards.md § "Accessibility checklist"
//
// Each test maps to one or more checklist items with their WCAG levels.
// ---------------------------------------------------------------------------

const iterations = discoverIterations();

if (iterations.length === 0) {
  test.skip("no iterations found", () => {
    // No output directories discovered — nothing to test.
    // Set A11Y_PROMPT, A11Y_ITERATION, or A11Y_RUN_DIR env vars,
    // or run the agent harness first.
  });
}

for (const iteration of iterations) {
  test.describe(iteration.label, () => {
    let devServer: ChildProcess | null = null;
    let serverUrl: string | null = null;
    let startupError: string | null = null;

    const results: A11yResults = {
      label: iteration.label,
      timestamp: new Date().toISOString(),
      tests: {},
      axeViolationCount: 0,
      axeViolations: [],
    };

    test.beforeAll(async () => {
      try {
        await execFileAsync("npm", ["install", "--no-audit", "--no-fund"], {
          cwd: iteration.projectDir,
          timeout: 90_000,
        });
      } catch (err) {
        startupError = `npm install failed: ${(err as Error).message}`;
        return;
      }

      try {
        devServer = spawn("npm", ["run", "dev", "--", "--port", "0"], {
          cwd: iteration.projectDir,
          stdio: ["ignore", "pipe", "pipe"],
          env: { ...process.env, BROWSER: "none" },
        });
        serverUrl = await waitForServerUrl(devServer);
      } catch (err) {
        startupError = `Dev server failed to start: ${(err as Error).message}`;
        killDevServer(devServer);
        devServer = null;
      }
    });

    test.afterAll(async () => {
      killDevServer(devServer);
      devServer = null;
      saveA11yResults(iteration.iterDir, results);
    });

    function requireServer() {
      if (startupError || !serverUrl) {
        test.skip();
      }
    }

    // ================================================================
    // §1 Semantic structure (1.1–1.4 — WCAG 1.3.1 A, 4.1.2 A)
    //
    // Checklist:
    // - Landmark regions exist (1.2, 5.2 — WCAG 2.4.1 A)
    // - Multiple <nav> have unique labels (1.2)
    // - <section> has accessible name to register as landmark (1.2)
    // - <form> has accessible name (1.2)
    // - Lists with list-style:none have role="list" (1.3)
    // - <ul>/<ol> children are <li> (1.3)
    // - Page language is set (WCAG 3.1.1 A)
    // ================================================================
    test("§1 semantic structure", async ({ page }) => {
      requireServer();
      const rendered = await navigateAndWait(page, serverUrl!);
      if (!rendered) {
        results.tests["semantic-structure"] = {
          status: "skipped",
          details: "Page did not render",
        };
        test.skip();
        return;
      }

      const data = await page.evaluate(() => {
        const issues: Array<{
          item: string;
          wcag: string;
          detail: string;
          elements?: unknown[];
        }> = [];

        // Landmarks
        const landmarkSels = [
          "main",
          '[role="main"]',
          "nav",
          '[role="navigation"]',
          "header",
          '[role="banner"]',
          "footer",
          '[role="contentinfo"]',
          "aside",
          '[role="complementary"]',
          '[role="search"]',
          "section[aria-label]",
          "section[aria-labelledby]",
          '[role="region"][aria-label]',
          '[role="region"][aria-labelledby]',
        ];
        const foundLandmarks: string[] = [];
        for (const sel of landmarkSels) {
          const els = document.querySelectorAll(sel);
          if (els.length > 0) foundLandmarks.push(`${sel} (${els.length})`);
        }
        if (foundLandmarks.length === 0) {
          issues.push({
            item: "1.2/5.2 — No landmark regions",
            wcag: "1.3.1 A, 2.4.1 A",
            detail:
              "No <main>, <nav>, <header>, <aside>, or labeled <section> found.",
          });
        }

        // Multiple <nav> without labels
        const navs = document.querySelectorAll("nav, [role='navigation']");
        if (navs.length > 1) {
          const unlabeled = Array.from(navs).filter(
            (n) =>
              !n.getAttribute("aria-label") &&
              !n.getAttribute("aria-labelledby"),
          );
          if (unlabeled.length > 0) {
            issues.push({
              item: "1.2 — Multiple <nav> without unique labels",
              wcag: "1.3.1 A",
              detail: `${unlabeled.length} of ${navs.length} <nav> lack aria-label.`,
            });
          }
        }

        // <section> without accessible name
        const sections = document.querySelectorAll("section");
        const unlabeledSections = Array.from(sections).filter((s) => {
          return (
            !s.getAttribute("aria-label") &&
            !s.getAttribute("aria-labelledby") &&
            !s.querySelector("h1, h2, h3, h4, h5, h6")
          );
        });
        if (unlabeledSections.length > 0) {
          issues.push({
            item: "1.2 — <section> without accessible name",
            wcag: "1.3.1 A",
            detail: `${unlabeledSections.length} <section> element(s) have no heading or aria-label.`,
          });
        }

        // <form> without accessible name
        const forms = document.querySelectorAll("form");
        const unlabeledForms = Array.from(forms).filter(
          (f) =>
            !f.getAttribute("aria-label") &&
            !f.getAttribute("aria-labelledby") &&
            !f.querySelector("legend"),
        );
        if (unlabeledForms.length > 0) {
          issues.push({
            item: "1.2 — <form> without accessible name",
            wcag: "1.3.1 A",
            detail: `${unlabeledForms.length} <form> lack aria-label or <legend>.`,
          });
        }

        // Lists with list-style:none missing role="list"
        const lists = document.querySelectorAll("ul, ol");
        const listsNeedingRole: string[] = [];
        for (const list of lists) {
          const cs = window.getComputedStyle(list);
          if (cs.listStyleType === "none" && !list.getAttribute("role")) {
            listsNeedingRole.push(list.outerHTML.slice(0, 120));
          }
        }
        if (listsNeedingRole.length > 0) {
          issues.push({
            item: '1.3 — list-style:none without role="list"',
            wcag: "1.3.1 A",
            detail: `${listsNeedingRole.length} list(s) lose semantics in WebKit.`,
            elements: listsNeedingRole,
          });
        }

        // Non-<li> children in <ul>/<ol>
        const listsWithBadChildren: Array<{
          list: string;
          invalidChildren: string;
        }> = [];
        for (const list of lists) {
          const nonLi = Array.from(list.children).filter(
            (c) =>
              c.tagName !== "LI" &&
              c.tagName !== "SCRIPT" &&
              c.tagName !== "TEMPLATE",
          );
          if (nonLi.length > 0) {
            listsWithBadChildren.push({
              list: list.outerHTML.slice(0, 80),
              invalidChildren: nonLi.map((c) => c.tagName).join(", "),
            });
          }
        }
        if (listsWithBadChildren.length > 0) {
          issues.push({
            item: "1.3 — Non-<li> children in <ul>/<ol>",
            wcag: "1.3.1 A",
            detail: `${listsWithBadChildren.length} list(s) contain non-<li> direct children.`,
            elements: listsWithBadChildren,
          });
        }

        // Page language
        const lang = document.documentElement.getAttribute("lang");
        if (!lang || !lang.trim()) {
          issues.push({
            item: "Page language — missing <html lang>",
            wcag: "3.1.1 A",
            detail: '<html> must have a lang attribute (e.g. lang="en").',
          });
        }

        return { issues, foundLandmarks, lang: lang || null };
      });

      results.tests["semantic-structure"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: data,
      };

      expect(
        data.issues,
        `Semantic structure: ${data.issues.length} issue(s):\n` +
          data.issues
            .map((i) => `  [${i.wcag}] ${i.item}: ${i.detail}`)
            .join("\n"),
      ).toHaveLength(0);
    });

    // ================================================================
    // §2 Keyboard interaction (2.1–2.2 — WCAG 2.1.1 A, 1.3.2 A)
    //
    // Checklist:
    // - Interactive elements are focusable (2.1)
    // - ARIA interactive roles have tabindex (2.1)
    // - No CSS order / reverse flex breaking visual-to-DOM order (2.2)
    // ================================================================
    test("§2 keyboard interaction", async ({ page }) => {
      requireServer();
      await navigateAndWait(page, serverUrl!);

      const data = await page.evaluate(() => {
        const issues: Array<{
          item: string;
          wcag: string;
          detail: string;
          elements?: unknown[];
        }> = [];

        // 2.1 — Interactive elements must be focusable
        const interactiveSel =
          'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
          "select:not([disabled]), textarea:not([disabled]), " +
          '[tabindex]:not([tabindex="-1"]), [role="button"]:not([disabled]), ' +
          '[role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], ' +
          '[role="radio"], [role="switch"], [role="slider"]';
        const interactive = Array.from(
          document.querySelectorAll(interactiveSel),
        );
        const notFocusable: string[] = [];
        for (const el of interactive) {
          (el as HTMLElement).focus();
          if (document.activeElement !== el) {
            notFocusable.push((el as HTMLElement).outerHTML.slice(0, 150));
          }
        }
        if (document.activeElement)
          (document.activeElement as HTMLElement).blur();

        if (notFocusable.length > 0) {
          issues.push({
            item: "2.1 — Interactive elements not focusable",
            wcag: "2.1.1 A",
            detail: `${notFocusable.length} of ${interactive.length} interactive element(s) cannot receive focus.`,
            elements: notFocusable,
          });
        }

        // 2.1 — ARIA interactive roles without tabindex
        const ariaRoles = [
          "button",
          "link",
          "tab",
          "menuitem",
          "checkbox",
          "radio",
          "switch",
          "slider",
          "combobox",
          "searchbox",
          "textbox",
        ];
        const missingTabindex: Array<{ role: string; html: string }> = [];
        for (const role of ariaRoles) {
          for (const el of document.querySelectorAll(`[role="${role}"]`)) {
            const tag = el.tagName.toLowerCase();
            const nativelyFocusable = [
              "a",
              "button",
              "input",
              "select",
              "textarea",
            ].includes(tag);
            if (!nativelyFocusable && el.getAttribute("tabindex") === null) {
              missingTabindex.push({
                role,
                html: (el as HTMLElement).outerHTML.slice(0, 120),
              });
            }
          }
        }
        if (missingTabindex.length > 0) {
          issues.push({
            item: "2.1 — ARIA role without tabindex",
            wcag: "2.1.1 A",
            detail: `${missingTabindex.length} element(s) have interactive ARIA roles but no tabindex.`,
            elements: missingTabindex,
          });
        }

        // 2.2 — CSS order breaks visual-to-DOM order
        const allEls = document.querySelectorAll("*");
        const reordered: string[] = [];
        const reversed: Array<{ html: string; direction: string }> = [];
        for (const el of allEls) {
          const cs = window.getComputedStyle(el);
          if (cs.order && cs.order !== "0") {
            reordered.push((el as HTMLElement).outerHTML.slice(0, 100));
          }
          if (
            (cs.flexDirection === "row-reverse" ||
              cs.flexDirection === "column-reverse") &&
            (el as HTMLElement).children.length > 1
          ) {
            reversed.push({
              html: (el as HTMLElement).outerHTML.slice(0, 100),
              direction: cs.flexDirection,
            });
          }
        }
        if (reordered.length > 0) {
          issues.push({
            item: "2.2 — CSS order property used",
            wcag: "1.3.2 A, 2.4.3 A",
            detail: `${reordered.length} element(s) use CSS order.`,
            elements: reordered.slice(0, 5),
          });
        }
        if (reversed.length > 0) {
          issues.push({
            item: "2.2 — Reverse flex direction",
            wcag: "1.3.2 A, 2.4.3 A",
            detail: `${reversed.length} container(s) use reverse flex direction.`,
            elements: reversed.slice(0, 5),
          });
        }

        return { issues, totalInteractive: interactive.length };
      });

      results.tests["keyboard-interaction"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: data,
      };

      expect(
        data.issues,
        `Keyboard interaction: ${data.issues.length} issue(s):\n` +
          data.issues
            .map((i) => `  [${i.wcag}] ${i.item}: ${i.detail}`)
            .join("\n"),
      ).toHaveLength(0);
    });

    // ================================================================
    // §3 Focus management (3.1–3.2 — WCAG 2.4.3 A)
    //
    // Checklist:
    // - Hidden content removed from tab order (3.2)
    // - Expandable triggers have aria-expanded (4.1 — tested here for
    //   focus-lifecycle completeness)
    // ================================================================
    test("§3 focus management", async ({ page }) => {
      requireServer();
      await navigateAndWait(page, serverUrl!);

      const data = await page.evaluate(() => {
        const issues: Array<{
          item: string;
          wcag: string;
          detail: string;
          elements?: unknown[];
        }> = [];

        // 3.2 — Hidden content in tab order
        const focusableSel =
          "a[href], button, input, select, textarea, [tabindex]";
        const focusables = document.querySelectorAll(focusableSel);
        const hiddenFocusable: string[] = [];
        for (const el of focusables) {
          const isHidden = (check: Element): boolean => {
            let curr: Element | null = check;
            while (curr) {
              if (
                curr.getAttribute("hidden") !== null ||
                curr.getAttribute("aria-hidden") === "true" ||
                window.getComputedStyle(curr).display === "none" ||
                window.getComputedStyle(curr).visibility === "hidden"
              ) {
                return true;
              }
              curr = curr.parentElement;
            }
            return false;
          };
          if (isHidden(el) && (el as HTMLElement).tabIndex >= 0) {
            hiddenFocusable.push((el as HTMLElement).outerHTML.slice(0, 120));
          }
        }
        if (hiddenFocusable.length > 0) {
          issues.push({
            item: "3.2 — Hidden content in tab order",
            wcag: "2.4.3 A",
            detail: `${hiddenFocusable.length} hidden element(s) remain keyboard-reachable.`,
            elements: hiddenFocusable.slice(0, 10),
          });
        }

        // 4.1 — Expandable triggers should have aria-expanded
        const expandTriggers = document.querySelectorAll(
          '[aria-haspopup], [data-state="open"], [data-state="closed"]',
        );
        const missingExpanded: string[] = [];
        for (const el of expandTriggers) {
          if (el.getAttribute("aria-expanded") === null) {
            missingExpanded.push((el as HTMLElement).outerHTML.slice(0, 120));
          }
        }
        if (missingExpanded.length > 0) {
          issues.push({
            item: "4.1 — Trigger missing aria-expanded",
            wcag: "4.1.2 A",
            detail: `${missingExpanded.length} expandable trigger(s) lack aria-expanded.`,
            elements: missingExpanded,
          });
        }

        return { issues };
      });

      results.tests["focus-management"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: data,
      };

      expect(
        data.issues,
        `Focus management: ${data.issues.length} issue(s):\n` +
          data.issues
            .map((i) => `  [${i.wcag}] ${i.item}: ${i.detail}`)
            .join("\n"),
      ).toHaveLength(0);
    });

    // ================================================================
    // §4 ARIA conventions (4.1–4.3 — WCAG 4.1.2 A, 4.1.3 AA)
    //
    // Checklist:
    // - aria-haspopup uses specific type, not bare "true" (4.1)
    // - Disabled-with-tooltip pattern warned (4.2)
    // - Broken ARIA ID references (4.1.2 A)
    // - Valid ARIA roles only (4.1.2 A)
    // ================================================================
    test("§4 ARIA conventions", async ({ page }) => {
      requireServer();
      await navigateAndWait(page, serverUrl!);

      const data = await page.evaluate(() => {
        const issues: Array<{
          item: string;
          wcag: string;
          detail: string;
          elements?: unknown[];
        }> = [];

        // 4.1 — aria-haspopup="true" (maps to "menu")
        const haspopupEls = document.querySelectorAll("[aria-haspopup]");
        const badHaspopup: string[] = [];
        for (const el of haspopupEls) {
          if (el.getAttribute("aria-haspopup") === "true") {
            badHaspopup.push((el as HTMLElement).outerHTML.slice(0, 120));
          }
        }
        if (badHaspopup.length > 0) {
          issues.push({
            item: '4.1 — aria-haspopup="true" instead of specific type',
            wcag: "4.1.2 A",
            detail: `${badHaspopup.length} element(s) use "true" which maps to "menu". Use the specific popup type.`,
            elements: badHaspopup,
          });
        }

        // 4.2 — Tooltip on HTML-disabled element
        const disabledEls = document.querySelectorAll("[disabled]");
        const disabledWithTooltip: string[] = [];
        for (const el of disabledEls) {
          if (
            el.getAttribute("title") ||
            el.getAttribute("data-tooltip") ||
            (el as HTMLElement).closest("[data-tooltip]")
          ) {
            disabledWithTooltip.push(
              (el as HTMLElement).outerHTML.slice(0, 120),
            );
          }
        }
        if (disabledWithTooltip.length > 0) {
          issues.push({
            item: "4.2 — Tooltip on disabled element",
            wcag: "4.1.2 A, 2.1.1 A",
            detail: `${disabledWithTooltip.length} disabled element(s) have tooltips keyboard users cannot reach.`,
            elements: disabledWithTooltip,
          });
        }

        // Broken ARIA ID references
        const refAttrs = [
          "aria-labelledby",
          "aria-describedby",
          "aria-controls",
          "aria-owns",
          "aria-activedescendant",
          "aria-flowto",
          "aria-errormessage",
          "aria-details",
        ];
        const brokenRefs: Array<{
          element: string;
          attribute: string;
          missingIds: string[];
        }> = [];
        for (const attr of refAttrs) {
          for (const el of document.querySelectorAll(`[${attr}]`)) {
            const val = el.getAttribute(attr);
            if (!val) continue;
            const missing = val
              .split(/\s+/)
              .filter(Boolean)
              .filter((id) => !document.getElementById(id));
            if (missing.length > 0) {
              brokenRefs.push({
                element: (el as HTMLElement).outerHTML.slice(0, 120),
                attribute: attr,
                missingIds: missing,
              });
            }
          }
        }
        if (brokenRefs.length > 0) {
          issues.push({
            item: "4 — Broken ARIA ID references",
            wcag: "4.1.2 A",
            detail: `${brokenRefs.length} element(s) reference IDs that do not exist.`,
            elements: brokenRefs,
          });
        }

        // Invalid ARIA roles
        const validRoles = new Set([
          "alert",
          "alertdialog",
          "application",
          "article",
          "banner",
          "button",
          "cell",
          "checkbox",
          "columnheader",
          "combobox",
          "complementary",
          "contentinfo",
          "definition",
          "dialog",
          "directory",
          "document",
          "feed",
          "figure",
          "form",
          "grid",
          "gridcell",
          "group",
          "heading",
          "img",
          "link",
          "list",
          "listbox",
          "listitem",
          "log",
          "main",
          "marquee",
          "math",
          "menu",
          "menubar",
          "menuitem",
          "menuitemcheckbox",
          "menuitemradio",
          "navigation",
          "none",
          "note",
          "option",
          "presentation",
          "progressbar",
          "radio",
          "radiogroup",
          "region",
          "row",
          "rowgroup",
          "rowheader",
          "scrollbar",
          "search",
          "searchbox",
          "separator",
          "slider",
          "spinbutton",
          "status",
          "switch",
          "tab",
          "table",
          "tablist",
          "tabpanel",
          "term",
          "textbox",
          "timer",
          "toolbar",
          "tooltip",
          "tree",
          "treegrid",
          "treeitem",
        ]);
        const invalidRoles: Array<{ role: string; html: string }> = [];
        for (const el of document.querySelectorAll("[role]")) {
          const role = el.getAttribute("role");
          if (role && !validRoles.has(role)) {
            invalidRoles.push({
              role,
              html: (el as HTMLElement).outerHTML.slice(0, 100),
            });
          }
        }
        if (invalidRoles.length > 0) {
          issues.push({
            item: "4 — Invalid ARIA roles",
            wcag: "4.1.2 A",
            detail: `${invalidRoles.length} element(s) use invalid ARIA role values.`,
            elements: invalidRoles,
          });
        }

        return { issues, brokenRefCount: brokenRefs.length };
      });

      results.tests["aria-conventions"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: data,
      };

      expect(
        data.issues,
        `ARIA conventions: ${data.issues.length} issue(s):\n` +
          data.issues
            .map((i) => `  [${i.wcag}] ${i.item}: ${i.detail}`)
            .join("\n"),
      ).toHaveLength(0);
    });

    // ================================================================
    // §5 Screen reader behavior (5.1–5.2 — WCAG 4.1.2 A, 1.1.1 A)
    //
    // Checklist:
    // - Buttons have accessible name (5.1)
    // - Icon-only buttons have aria-label (5.1)
    // - Form inputs have label association (5.1)
    // - Images have alt text (1.1.1 A)
    // - Links have accessible name (5.1, 2.4.4 A)
    // ================================================================
    test("§5 screen reader behavior", async ({ page }) => {
      requireServer();
      await navigateAndWait(page, serverUrl!);

      const data = await page.evaluate(() => {
        const issues: Array<{
          item: string;
          wcag: string;
          detail: string;
          elements?: unknown[];
        }> = [];

        // Buttons without accessible name
        const buttons = document.querySelectorAll('button, [role="button"]');
        const unlabeledButtons: string[] = [];
        for (const btn of buttons) {
          const text = (btn.textContent || "").trim();
          const ariaLabel = btn.getAttribute("aria-label");
          const ariaLabelledby = btn.getAttribute("aria-labelledby");
          const title = btn.getAttribute("title");
          if (!text && !ariaLabel && !ariaLabelledby && !title) {
            unlabeledButtons.push((btn as HTMLElement).outerHTML.slice(0, 150));
          }
        }
        if (unlabeledButtons.length > 0) {
          issues.push({
            item: "5.1 — Buttons without accessible name",
            wcag: "4.1.2 A, 1.1.1 A",
            detail: `${unlabeledButtons.length} button(s) have no text, aria-label, or title.`,
            elements: unlabeledButtons,
          });
        }

        // Form inputs without labels
        const inputs = document.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select',
        );
        const unlabeledInputs: Array<{
          html: string;
          hasPlaceholder: boolean;
        }> = [];
        for (const input of inputs) {
          const id = input.getAttribute("id");
          const ariaLabel = input.getAttribute("aria-label");
          const ariaLabelledby = input.getAttribute("aria-labelledby");
          const title = input.getAttribute("title");
          const wrappedInLabel =
            (input as HTMLElement).closest("label") !== null;
          const hasAssociatedLabel = id
            ? document.querySelector(`label[for="${id}"]`) !== null
            : false;
          if (
            !ariaLabel &&
            !ariaLabelledby &&
            !title &&
            !wrappedInLabel &&
            !hasAssociatedLabel
          ) {
            unlabeledInputs.push({
              html: (input as HTMLElement).outerHTML.slice(0, 150),
              hasPlaceholder: !!input.getAttribute("placeholder"),
            });
          }
        }
        if (unlabeledInputs.length > 0) {
          const placeholderOnly = unlabeledInputs.filter(
            (i) => i.hasPlaceholder,
          ).length;
          issues.push({
            item: "5.1 — Form inputs without label",
            wcag: "4.1.2 A, 1.3.1 A",
            detail:
              `${unlabeledInputs.length} input(s) lack a <label>, aria-label, or aria-labelledby.` +
              (placeholderOnly > 0
                ? ` ${placeholderOnly} use placeholder only (not valid).`
                : ""),
            elements: unlabeledInputs.map((i) => i.html),
          });
        }

        // Images without alt
        const imgsNoAlt = Array.from(
          document.querySelectorAll("img:not([alt])"),
        ).map((el) => (el as HTMLElement).outerHTML.slice(0, 200));
        if (imgsNoAlt.length > 0) {
          issues.push({
            item: "5.1 — Images missing alt attribute",
            wcag: "1.1.1 A",
            detail: `${imgsNoAlt.length} <img> without alt. Decorative images need alt="".`,
            elements: imgsNoAlt,
          });
        }

        // Links without accessible name
        const links = document.querySelectorAll('a[href], [role="link"]');
        const unlabeledLinks: string[] = [];
        for (const link of links) {
          const text = (link.textContent || "").trim();
          const ariaLabel = link.getAttribute("aria-label");
          const ariaLabelledby = link.getAttribute("aria-labelledby");
          const title = link.getAttribute("title");
          const imgWithAlt = link.querySelector("img[alt]");
          if (!text && !ariaLabel && !ariaLabelledby && !title && !imgWithAlt) {
            unlabeledLinks.push((link as HTMLElement).outerHTML.slice(0, 150));
          }
        }
        if (unlabeledLinks.length > 0) {
          issues.push({
            item: "5.1 — Links without accessible name",
            wcag: "4.1.2 A, 2.4.4 A",
            detail: `${unlabeledLinks.length} link(s) have no visible text, aria-label, or title.`,
            elements: unlabeledLinks,
          });
        }

        // 5.2 — Ambiguous link text (passes axe but useless to screen readers)
        const ambiguousTexts = [
          "read more", "click here", "browse all", "learn more",
          "here", "more", "details", "link", "continue",
        ];
        const ambiguousLinks: Array<{ html: string; text: string }> = [];
        for (const link of links) {
          const text = (link.textContent || "").trim().toLowerCase();
          const ariaLabel = link.getAttribute("aria-label");
          if (!ariaLabel && ambiguousTexts.includes(text)) {
            ambiguousLinks.push({
              html: (link as HTMLElement).outerHTML.slice(0, 150),
              text,
            });
          }
        }
        if (ambiguousLinks.length > 0) {
          issues.push({
            item: "5.2 — Ambiguous link text",
            wcag: "2.4.4 A",
            detail: `${ambiguousLinks.length} link(s) use generic text like "read more" or "click here" that is meaningless out of context.`,
            elements: ambiguousLinks.map((l) => `"${l.text}" → ${l.html}`),
          });
        }

        // 5.3 — Generic/low-quality alt text (passes axe but communicates nothing)
        const genericAlts = [
          "image", "photo", "picture", "icon", "img", "banner",
          "decorative image", "logo", "graphic", "placeholder",
          "untitled", "screenshot", "thumbnail",
        ];
        const genericAltImages: Array<{ html: string; alt: string }> = [];
        const allImgsWithAlt = document.querySelectorAll("img[alt]");
        for (const img of allImgsWithAlt) {
          const alt = (img.getAttribute("alt") || "").trim().toLowerCase();
          if (alt && genericAlts.includes(alt)) {
            genericAltImages.push({
              html: (img as HTMLElement).outerHTML.slice(0, 200),
              alt,
            });
          }
        }
        if (genericAltImages.length > 0) {
          issues.push({
            item: "5.3 — Generic alt text",
            wcag: "1.1.1 A",
            detail: `${genericAltImages.length} image(s) have generic alt text like "image" or "photo" that communicates nothing.`,
            elements: genericAltImages.map((i) => `alt="${i.alt}" → ${i.html}`),
          });
        }

        return { issues };
      });

      results.tests["screen-reader"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: data,
      };

      expect(
        data.issues,
        `Screen reader behavior: ${data.issues.length} issue(s):\n` +
          data.issues
            .map((i) => `  [${i.wcag}] ${i.item}: ${i.detail}`)
            .join("\n"),
      ).toHaveLength(0);
    });

    // ================================================================
    // §6 Contrast and color (6.1–6.2 — WCAG 1.4.3 AA, 1.4.11 AA, 1.4.1 A)
    //
    // Checklist:
    // - Standard text 4.5:1 (6.1)
    // - Large text 3:1 (6.1)
    // - UI components 3:1 (6.1)
    // - Semantic color paired with non-color indicator (6.2)
    // ================================================================
    test("§6 contrast and color", async ({ page }) => {
      requireServer();
      const rendered = await navigateAndWait(page, serverUrl!);
      if (!rendered) {
        results.tests["contrast-and-color"] = {
          status: "skipped",
          details: "Page did not render",
        };
        test.skip();
        return;
      }

      const axeResult = await new AxeBuilder({ page })
        .withRules(["color-contrast"])
        .analyze();

      results.tests["contrast-and-color"] = {
        status: axeResult.violations.length === 0 ? "passed" : "failed",
        details: {
          contrastViolationCount: axeResult.violations.length,
          violations: axeResult.violations.flatMap((v) =>
            v.nodes.map((n) => ({
              target: n.target,
              html: n.html.slice(0, 150),
              impact: n.impact,
              message: n.failureSummary,
            })),
          ),
          incompleteCount: axeResult.incomplete.length,
        },
      };

      const detail = axeResult.violations
        .flatMap((v) =>
          v.nodes.map(
            (n) =>
              `  → ${n.target.join(", ")}: ${n.failureSummary?.split("\n")[0] ?? ""}`,
          ),
        )
        .join("\n");

      expect(
        axeResult.violations,
        `Color contrast: ${axeResult.violations.length} violation(s):\n${detail}`,
      ).toHaveLength(0);
    });

    // ================================================================
    // §7 Motion (7.1 — WCAG 2.3.3 AAA, treated as baseline)
    //
    // Checklist:
    // - All animations honor prefers-reduced-motion (7.1)
    // - No animation required to understand a state change (7.1)
    // ================================================================
    test("§7 motion", async ({ page }) => {
      requireServer();
      await navigateAndWait(page, serverUrl!);

      // Emulate prefers-reduced-motion: reduce
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));

      const data = await page.evaluate(() => {
        const issues: Array<{
          item: string;
          wcag: string;
          detail: string;
          elements?: unknown[];
        }> = [];
        const animated: Array<{
          html: string;
          transitionDuration: string;
          animationName: string;
          animationDuration: string;
        }> = [];

        // Parse a CSS duration string (e.g. "0.1s", "100ms", "1e-05s")
        // to milliseconds. Handles comma-separated lists by taking the
        // largest value. Returns 0 for unparseable values.
        function parseDurationMs(raw: string): number {
          if (!raw || raw === "none") return 0;
          const parts = raw.split(",").map((s) => s.trim());
          let max = 0;
          for (const part of parts) {
            const num = parseFloat(part);
            if (isNaN(num)) continue;
            const ms = part.endsWith("ms") ? num : num * 1000;
            if (ms > max) max = ms;
          }
          return max;
        }

        // Anything under 1ms is effectively instant. The recommended
        // prefers-reduced-motion override uses 0.01ms (browsers render
        // this as "1e-05s"), which must not be flagged.
        const INSTANT_THRESHOLD_MS = 1;

        for (const el of document.querySelectorAll("*")) {
          const cs = window.getComputedStyle(el);
          const transMs = parseDurationMs(cs.transitionDuration);
          const animMs = parseDurationMs(cs.animationDuration);
          const hasTrans = transMs >= INSTANT_THRESHOLD_MS;
          const hasAnim =
            cs.animationName &&
            cs.animationName !== "none" &&
            animMs >= INSTANT_THRESHOLD_MS;
          if (hasTrans || hasAnim) {
            animated.push({
              html: (el as HTMLElement).outerHTML.slice(0, 100),
              transitionDuration: cs.transitionDuration,
              animationName: cs.animationName,
              animationDuration: cs.animationDuration,
            });
          }
        }

        if (animated.length > 0) {
          issues.push({
            item: "7.1 — Animations active with prefers-reduced-motion: reduce",
            wcag: "2.3.3 AAA (baseline)",
            detail: `${animated.length} element(s) still animate.`,
            elements: animated.slice(0, 10),
          });
        }

        return { issues, animatedCount: animated.length };
      });

      // Restore
      await page.emulateMedia({ reducedMotion: null });

      results.tests["motion"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: data,
      };

      expect(
        data.issues,
        `Motion: ${data.issues.length} issue(s):\n` +
          data.issues
            .map((i) => `  [${i.wcag}] ${i.item}: ${i.detail}`)
            .join("\n"),
      ).toHaveLength(0);
    });

    // ================================================================
    // §8 Touch targets (8.1 — WCAG 2.5.8 AA)
    //
    // Checklist:
    // - All interactive targets meet 24×24 CSS px minimum (8.1)
    // - Inline links within text are exempt (8.1)
    // ================================================================
    test("§8 touch targets", async ({ page }) => {
      requireServer();
      await navigateAndWait(page, serverUrl!);

      const data = await page.evaluate(() => {
        const issues: Array<{
          item: string;
          wcag: string;
          detail: string;
          elements?: unknown[];
        }> = [];
        const MIN = 24;

        const sel =
          'a[href], button, input:not([type="hidden"]), select, textarea, ' +
          '[role="button"], [role="link"], [role="tab"], [role="menuitem"], ' +
          '[role="checkbox"], [role="radio"], [role="switch"], ' +
          '[tabindex]:not([tabindex="-1"])';
        const els = document.querySelectorAll(sel);
        const tooSmall: Array<{ html: string; width: number; height: number }> =
          [];

        for (const el of els) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) continue;
          if (rect.width < MIN || rect.height < MIN) {
            // Exempt inline links in text
            const isInlineLink =
              el.tagName === "A" &&
              el.parentElement &&
              ["P", "LI", "SPAN", "TD", "DD", "LABEL"].includes(
                el.parentElement.tagName,
              ) &&
              window.getComputedStyle(el).display === "inline";
            if (isInlineLink) continue;

            tooSmall.push({
              html: (el as HTMLElement).outerHTML.slice(0, 120),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            });
          }
        }

        if (tooSmall.length > 0) {
          issues.push({
            item: `8.1 — Touch targets below ${MIN}×${MIN}px`,
            wcag: "2.5.8 AA",
            detail: `${tooSmall.length} target(s) are too small.`,
            elements: tooSmall.slice(0, 15),
          });
        }

        return {
          issues,
          totalChecked: els.length,
          tooSmallCount: tooSmall.length,
        };
      });

      results.tests["touch-targets"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: data,
      };

      expect(
        data.issues,
        `Touch targets: ${data.issues.length} issue(s):\n` +
          data.issues
            .map((i) => `  [${i.wcag}] ${i.item}: ${i.detail}`)
            .join("\n"),
      ).toHaveLength(0);
    });

    // ================================================================
    // §9 Heading hierarchy (9.1 — WCAG 1.3.1 A, 2.4.6 AA)
    //
    // Checklist:
    // - Headings use <h1>–<h6>, not styled <div>/<span> (9.1)
    // - No skipped heading levels (9.1)
    // - Heading levels follow page hierarchy (9.1)
    // ================================================================
    test("§9 heading hierarchy", async ({ page }) => {
      requireServer();
      await navigateAndWait(page, serverUrl!);

      const data = await page.evaluate(() => {
        const issues: Array<{
          item: string;
          wcag: string;
          detail: string;
          skipped?: unknown[];
        }> = [];

        const headings = document.querySelectorAll(
          "h1, h2, h3, h4, h5, h6, [role='heading']",
        );
        const levels: Array<{ level: number; text: string; tag: string }> = [];
        for (const h of headings) {
          const ariaLevel = h.getAttribute("aria-level");
          const level = ariaLevel
            ? parseInt(ariaLevel, 10)
            : parseInt(h.tagName.replace("H", ""), 10);
          levels.push({
            level,
            text: (h.textContent || "").trim().slice(0, 60),
            tag: h.tagName,
          });
        }

        // Skipped levels
        const skipped: Array<{
          from: string;
          to: string;
          skippedLevels: string;
        }> = [];
        for (let i = 1; i < levels.length; i++) {
          const prev = levels[i - 1].level;
          const curr = levels[i].level;
          if (curr > prev + 1) {
            skipped.push({
              from: `h${prev} "${levels[i - 1].text}"`,
              to: `h${curr} "${levels[i].text}"`,
              skippedLevels: Array.from(
                { length: curr - prev - 1 },
                (_, j) => `h${prev + j + 1}`,
              ).join(", "),
            });
          }
        }
        if (skipped.length > 0) {
          issues.push({
            item: "9.1 — Skipped heading levels",
            wcag: "1.3.1 A, 2.4.6 AA",
            detail: `${skipped.length} heading level skip(s).`,
            skipped,
          });
        }

        // Multiple h1
        const h1Count = document.querySelectorAll(
          "h1, [role='heading'][aria-level='1']",
        ).length;
        if (h1Count > 1) {
          issues.push({
            item: "9.1 — Multiple h1",
            wcag: "1.3.1 A",
            detail: `Page has ${h1Count} h1 elements. Best practice is one.`,
          });
        }

        // No headings
        if (levels.length === 0) {
          issues.push({
            item: "9.1 — No headings found",
            wcag: "2.4.6 AA",
            detail:
              "No heading elements. Headings provide structure for navigation.",
          });
        }

        return { issues, headingCount: levels.length, levels };
      });

      results.tests["heading-hierarchy"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: data,
      };

      expect(
        data.issues,
        `Heading hierarchy: ${data.issues.length} issue(s):\n` +
          data.issues
            .map((i) => `  [${i.wcag}] ${i.item}: ${i.detail}`)
            .join("\n"),
      ).toHaveLength(0);
    });

    // ================================================================
    // §10 Spacing and reflow (WCAG 1.4.10 AA, 1.4.12 AA)
    //
    // Checklist:
    // - Works at 400% zoom / 320px viewport without horizontal scroll
    // ================================================================
    test("§10 spacing and reflow", async ({ page }) => {
      requireServer();

      // 320px simulates 400% zoom on a 1280px viewport
      await page.setViewportSize({ width: 320, height: 900 });
      await navigateAndWait(page, serverUrl!);

      const data = await page.evaluate(() => {
        const issues: Array<{
          item: string;
          wcag: string;
          detail: string;
          elements?: unknown[];
        }> = [];

        const overflowAmount =
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth;
        if (overflowAmount > 5) {
          issues.push({
            item: "Reflow — Horizontal scroll at 320px",
            wcag: "1.4.10 AA",
            detail: `Content overflows by ${overflowAmount}px at 320px width.`,
          });
        }

        const overflowing: Array<{ html: string; right: number }> = [];
        for (const el of document.querySelectorAll("*")) {
          const rect = el.getBoundingClientRect();
          if (
            rect.right > window.innerWidth + 5 &&
            rect.height > 10 &&
            rect.width > 50
          ) {
            overflowing.push({
              html: (el as HTMLElement).outerHTML.slice(0, 100),
              right: Math.round(rect.right),
            });
          }
        }
        if (overflowing.length > 0) {
          issues.push({
            item: "Reflow — Elements overflow 320px viewport",
            wcag: "1.4.10 AA",
            detail: `${overflowing.length} element(s) extend beyond viewport.`,
            elements: overflowing.slice(0, 10),
          });
        }

        return { issues, overflowAmount };
      });

      // Restore viewport
      await page.setViewportSize({ width: 1440, height: 900 });

      results.tests["spacing-and-reflow"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: data,
      };

      expect(
        data.issues,
        `Spacing and reflow: ${data.issues.length} issue(s):\n` +
          data.issues
            .map((i) => `  [${i.wcag}] ${i.item}: ${i.detail}`)
            .join("\n"),
      ).toHaveLength(0);
    });

    // ================================================================
    // §11 Skip navigation (WCAG 2.4.1 A)
    //
    // Checklist:
    // - Skip link is the first focusable element
    // - Skip link targets the main content region
    // - Landmarks alone don't help keyboard-only sighted users
    // ================================================================
    test("§11 skip navigation", async ({ page }) => {
      requireServer();
      await navigateAndWait(page, serverUrl!);

      const data = await page.evaluate(() => {
        const issues: Array<{
          item: string;
          wcag: string;
          detail: string;
        }> = [];

        const focusableSelector =
          'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
        const allFocusable = Array.from(
          document.querySelectorAll(focusableSelector),
        ).filter((el) => {
          const style = window.getComputedStyle(el);
          return style.display !== "none" && style.visibility !== "hidden";
        });

        const firstFocusable = allFocusable[0] as HTMLElement | undefined;
        let hasSkipLink = false;
        let skipLinkTarget: string | null = null;

        if (firstFocusable) {
          const tag = firstFocusable.tagName.toLowerCase();
          const href = firstFocusable.getAttribute("href") || "";
          const text = (firstFocusable.textContent || "").trim().toLowerCase();
          const ariaLabel = (
            firstFocusable.getAttribute("aria-label") || ""
          )
            .trim()
            .toLowerCase();

          const isAnchor = tag === "a" && href.startsWith("#");
          const looksLikeSkip =
            /skip/i.test(text) ||
            /skip/i.test(ariaLabel) ||
            /main.content/i.test(text) ||
            /main.content/i.test(ariaLabel);

          if (isAnchor && looksLikeSkip) {
            hasSkipLink = true;
            const targetId = href.slice(1);
            const targetEl = targetId
              ? document.getElementById(targetId)
              : null;
            if (!targetEl) {
              skipLinkTarget = "missing";
              issues.push({
                item: "11.1 — Skip link target missing",
                wcag: "2.4.1 A",
                detail: `Skip link points to "${href}" but no element with id="${targetId}" exists.`,
              });
            } else {
              skipLinkTarget = targetId;
            }
          }
        }

        if (!hasSkipLink) {
          issues.push({
            item: "11.1 — No skip navigation link",
            wcag: "2.4.1 A",
            detail:
              "No skip link found as the first focusable element. " +
              "Keyboard-only users must tab through all header/nav elements to reach main content.",
          });
        }

        return { issues, hasSkipLink, skipLinkTarget };
      });

      results.tests["skip-navigation"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: data,
      };

      expect(
        data.issues,
        `Skip navigation: ${data.issues.length} issue(s):\n` +
          data.issues
            .map((i) => `  [${i.wcag}] ${i.item}: ${i.detail}`)
            .join("\n"),
      ).toHaveLength(0);
    });

    // ================================================================
    // §12 Dark mode & state contrast (WCAG 1.4.3 AA, 2.4.7 AA)
    //
    // Checklist:
    // - Dark mode contrast passes (1.4.3 AA)
    // - Focus states have visible indicators (2.4.7 AA)
    // - The default §6 scan only evaluates initial light-mode state;
    //   contrast failures in dark mode or focus states are invisible
    //   without triggering those states before scanning.
    // ================================================================
    test("§12 dark mode & state contrast", async ({ page }) => {
      requireServer();
      const rendered = await navigateAndWait(page, serverUrl!);
      if (!rendered) {
        results.tests["dark-mode-contrast"] = {
          status: "skipped",
          details: "Page did not render",
        };
        test.skip();
        return;
      }

      const issues: Array<{
        item: string;
        wcag: string;
        detail: string;
        violations?: unknown[];
        elements?: string[];
      }> = [];

      // 12.1 — Dark mode contrast
      await page.emulateMedia({ colorScheme: "dark" });
      await navigateAndWait(page, serverUrl!);

      const darkResult = await new AxeBuilder({ page })
        .withRules(["color-contrast"])
        .analyze();

      if (darkResult.violations.length > 0) {
        issues.push({
          item: "12.1 — Dark mode contrast violations",
          wcag: "1.4.3 AA, 1.4.11 AA",
          detail: `${darkResult.violations.length} contrast violation(s) in dark mode.`,
          violations: darkResult.violations.flatMap((v) =>
            v.nodes.map((n) => ({
              target: n.target,
              html: n.html.slice(0, 150),
              impact: n.impact,
              message: n.failureSummary,
            })),
          ),
        });
      }

      // Restore light mode for focus indicator check
      await page.emulateMedia({ colorScheme: "light" });
      await navigateAndWait(page, serverUrl!);

      // 12.2 — Focus indicator visibility
      const focusIssues = await page.evaluate(() => {
        const interactiveSelector =
          'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
        const interactiveEls = Array.from(
          document.querySelectorAll(interactiveSelector),
        ).slice(0, 20);

        const problems: Array<{ html: string; tag: string }> = [];
        for (const el of interactiveEls) {
          (el as HTMLElement).focus();
          const cs = window.getComputedStyle(el);
          const outline = cs.outlineStyle;
          const outlineWidth = parseFloat(cs.outlineWidth);
          const boxShadow = cs.boxShadow;

          const hasOutline = outline !== "none" && outlineWidth > 0;
          const hasBoxShadow = boxShadow !== "none" && boxShadow !== "";

          if (!hasOutline && !hasBoxShadow) {
            problems.push({
              html: (el as HTMLElement).outerHTML.slice(0, 120),
              tag: el.tagName.toLowerCase(),
            });
          }
          (el as HTMLElement).blur();
        }
        return problems;
      });

      if (focusIssues.length > 0) {
        issues.push({
          item: "12.2 — Missing focus indicator",
          wcag: "2.4.7 AA",
          detail: `${focusIssues.length} interactive element(s) lack a visible focus indicator.`,
          elements: focusIssues.map((f) => f.html),
        });
      }

      results.tests["dark-mode-contrast"] = {
        status: issues.length === 0 ? "passed" : "failed",
        details: {
          issueCount: issues.length,
          issues,
          darkModeViolationCount: darkResult.violations.length,
          missingFocusIndicatorCount: focusIssues.length,
        },
      };

      const detail = issues
        .map((i) => `  [${i.wcag}] ${i.item}: ${i.detail}`)
        .join("\n");

      expect(
        issues,
        `Dark mode & state contrast: ${issues.length} issue(s):\n${detail}`,
      ).toHaveLength(0);
    });

    // ================================================================
    // Full axe-core sweep — catches anything the targeted tests miss
    // ================================================================
    test("axe-core full sweep", async ({ page }) => {
      requireServer();
      const rendered = await navigateAndWait(page, serverUrl!);
      if (!rendered) {
        results.tests["axe-core-full"] = {
          status: "skipped",
          details: "Page did not render",
        };
        test.skip();
        return;
      }

      const axeResult = await new AxeBuilder({ page })
        .withTags([
          "wcag2a",
          "wcag2aa",
          "wcag21a",
          "wcag21aa",
          "wcag22aa",
          "best-practice",
        ])
        .analyze();

      results.axeViolations = axeResult.violations;
      results.axeViolationCount = axeResult.violations.length;

      results.tests["axe-core-full"] = {
        status: axeResult.violations.length === 0 ? "passed" : "failed",
        details: {
          violationCount: axeResult.violations.length,
          passCount: axeResult.passes.length,
          incompleteCount: axeResult.incomplete.length,
          violations: axeResult.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            helpUrl: v.helpUrl,
            nodeCount: v.nodes.length,
            wcagTags: v.tags.filter((t) => t.startsWith("wcag")),
          })),
        },
      };

      const summary = axeResult.violations
        .map(
          (v) =>
            `  [${v.impact?.toUpperCase()}] ${v.id}: ${v.help} (${v.nodes.length} node(s))` +
            `\n    ${v.helpUrl}` +
            v.nodes
              .slice(0, 3)
              .map(
                (n) =>
                  `\n    → ${n.target.join(", ")}: ${n.html.slice(0, 100)}`,
              )
              .join(""),
        )
        .join("\n\n");

      expect(
        axeResult.violations,
        `axe-core found ${axeResult.violations.length} violation(s):\n\n${summary}`,
      ).toHaveLength(0);
    });
  });
}
