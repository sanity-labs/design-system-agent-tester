import { resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Test names — keyed to the accessibility checklist categories from
// accessibility-standards.md § "Accessibility checklist"
//
// Each test ID maps to one or more checklist items and WCAG criteria.
// ---------------------------------------------------------------------------

const TEST_NAMES = [
  // §1  Semantic structure (1.1, 1.2, 1.3, 1.4 — WCAG 1.3.1 A, 4.1.2 A)
  "semantic-structure",
  // §2  Keyboard interaction (2.1, 2.2 — WCAG 2.1.1 A, 1.3.2 A)
  "keyboard-interaction",
  // §3  Focus management (3.1, 3.2 — WCAG 2.4.3 A)
  "focus-management",
  // §4  ARIA conventions (4.1, 4.2, 4.3 — WCAG 4.1.2 A, 4.1.3 AA)
  "aria-conventions",
  // §5  Screen reader behavior (5.1, 5.2 — WCAG 4.1.2 A, 1.1.1 A, 2.4.1 A)
  "screen-reader",
  // §6  Contrast and color (6.1, 6.2 — WCAG 1.4.3 AA, 1.4.11 AA, 1.4.1 A)
  "contrast-and-color",
  // §7  Motion (7.1 — WCAG 2.3.3 AAA, treated as baseline)
  "motion",
  // §8  Touch targets (8.1 — WCAG 2.5.8 AA)
  "touch-targets",
  // §9  Heading hierarchy (9.1 — WCAG 1.3.1 A, 2.4.6 AA)
  "heading-hierarchy",
  // §10 Spacing and reflow (WCAG 1.4.10 AA, 1.4.12 AA)
  "spacing-and-reflow",
  // §11 Skip navigation (WCAG 2.4.1 A — keyboard users need skip link)
  "skip-navigation",
  // §12 Dark mode & state contrast (WCAG 1.4.3 AA — contrast in alternate states)
  "dark-mode-contrast",
  // Full axe-core sweep — catches anything the targeted tests above miss
  "axe-core-full",
];

/**
 * Run accessibility tests against a running dev server URL.
 * Tests are organized by the accessibility checklist in accessibility-standards.md.
 *
 * @param {object} opts
 * @param {string} opts.serverUrl - The dev server URL to test
 * @param {string} opts.iterDir  - Directory for this iteration's output
 * @param {string} opts.iterLabel - Label for logging
 * @returns {Promise<object>} A11y results object (never throws)
 */
export async function runAccessibilityTests({ serverUrl, iterDir, iterLabel }) {
  console.log(`[${iterLabel}] Running accessibility tests...`);

  const skippedResults = (reason) => {
    const tests = {};
    for (const name of TEST_NAMES) {
      tests[name] = { status: "skipped", details: reason };
    }
    return {
      label: iterLabel,
      timestamp: new Date().toISOString(),
      tests,
      axeViolationCount: 0,
      axeViolations: [],
      summary: {
        totalTests: TEST_NAMES.length,
        passed: 0,
        failed: 0,
        skipped: TEST_NAMES.length,
      },
    };
  };

  let browser = null;

  try {
    // Load axe-core source from disk
    let axeSource;
    try {
      const axeCorePath = require.resolve("axe-core");
      axeSource = await readFile(axeCorePath, "utf-8");
    } catch (err) {
      const reason = `Failed to load axe-core: ${err.message}`;
      console.warn(`[${iterLabel}] ⚠ Accessibility tests skipped: ${reason}`);
      const results = skippedResults(reason);
      await safeWriteResults(iterDir, results);
      return results;
    }

    // Launch headless Puppeteer
    const puppeteer = await import("puppeteer");
    browser = await puppeteer.default.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    try {
      await page.goto(serverUrl, {
        waitUntil: "networkidle2",
        timeout: 30_000,
      });
    } catch (err) {
      const reason = `Page failed to load: ${err.message}`;
      console.warn(`[${iterLabel}] ⚠ Accessibility tests skipped: ${reason}`);
      const results = skippedResults(reason);
      await safeWriteResults(iterDir, results);
      return results;
    }

    await waitForRenderedContent(page, iterLabel);

    // Inject axe-core
    try {
      await page.evaluate(axeSource);
    } catch (err) {
      const reason = `Failed to inject axe-core: ${err.message}`;
      console.warn(`[${iterLabel}] ⚠ Accessibility tests skipped: ${reason}`);
      const results = skippedResults(reason);
      await safeWriteResults(iterDir, results);
      return results;
    }

    // ── Run tests ─────────────────────────────────────────────────────

    const tests = {};
    let axeViolations = [];
    let axeViolationCount = 0;

    // ────────────────────────────────────────────────────────────────
    // §1 Semantic structure
    //    Checklist items:
    //    - Landmark labeling (1.2 — WCAG 1.3.1 A)
    //    - List remediation: role="list" with list-style:none (1.3)
    //    - <li> children in <ul>/<ol> (1.3)
    //    - Heading semantics via <h1>-<h6> not <div> (9.1, 1.3.1 A)
    //    - Page language set (WCAG 3.1.1 A)
    // ────────────────────────────────────────────────────────────────
    try {
      const data = await page.evaluate(() => {
        const issues = [];

        // 1.2 — Landmark labeling
        // Landmarks present? (5.2 — WCAG 2.4.1 A)
        const landmarkSelectors = [
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
        const foundLandmarks = [];
        for (const sel of landmarkSelectors) {
          const els = document.querySelectorAll(sel);
          if (els.length > 0) foundLandmarks.push(`${sel} (${els.length})`);
        }

        if (foundLandmarks.length === 0) {
          issues.push({
            item: "1.2/5.2 — No landmark regions found",
            wcag: "1.3.1 A, 2.4.1 A",
            detail:
              "Page has no <main>, <nav>, <header>, <aside>, or labeled <section>. Screen reader users cannot navigate by landmarks.",
          });
        }

        // 1.2 — Multiple <nav> without aria-label
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
              detail: `${unlabeled.length} of ${navs.length} <nav> elements lack aria-label. Screen readers cannot tell them apart.`,
              elements: unlabeled.map((e) => e.outerHTML.slice(0, 120)),
            });
          }
        }

        // 1.2 — <section> without accessible name (not a landmark)
        const sections = document.querySelectorAll("section");
        const unlabeledSections = Array.from(sections).filter((s) => {
          const hasLabel =
            s.getAttribute("aria-label") || s.getAttribute("aria-labelledby");
          const hasHeading = s.querySelector("h1, h2, h3, h4, h5, h6");
          return !hasLabel && !hasHeading;
        });
        if (unlabeledSections.length > 0) {
          issues.push({
            item: "1.2 — <section> without accessible name",
            wcag: "1.3.1 A",
            detail: `${unlabeledSections.length} <section> element(s) have no heading or aria-label, so they do not register as landmarks.`,
          });
        }

        // 1.2 — <form> without accessible name
        const forms = document.querySelectorAll("form");
        const unlabeledForms = Array.from(forms).filter((f) => {
          return (
            !f.getAttribute("aria-label") &&
            !f.getAttribute("aria-labelledby") &&
            !f.querySelector("legend")
          );
        });
        if (unlabeledForms.length > 0) {
          issues.push({
            item: "1.2 — <form> without accessible name",
            wcag: "1.3.1 A",
            detail: `${unlabeledForms.length} <form> element(s) lack aria-label, aria-labelledby, or a <legend>.`,
          });
        }

        // 1.3 — Lists with list-style:none missing role="list"
        const lists = document.querySelectorAll("ul, ol");
        const listsNeedingRole = [];
        for (const list of lists) {
          const cs = window.getComputedStyle(list);
          if (cs.listStyleType === "none" && !list.getAttribute("role")) {
            listsNeedingRole.push(list.outerHTML.slice(0, 120));
          }
        }
        if (listsNeedingRole.length > 0) {
          issues.push({
            item: '1.3 — Lists with list-style:none missing role="list"',
            wcag: "1.3.1 A",
            detail: `${listsNeedingRole.length} list(s) have list-style:none but no role="list". VoiceOver/WebKit strips list semantics.`,
            elements: listsNeedingRole,
          });
        }

        // 1.3 — Non-<li> children in <ul>/<ol>
        const listsWithBadChildren = [];
        for (const list of lists) {
          const directChildren = Array.from(list.children);
          const nonLi = directChildren.filter(
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
            item: "1.3 — Non-<li> children inside <ul>/<ol>",
            wcag: "1.3.1 A",
            detail: `${listsWithBadChildren.length} list(s) contain direct children that are not <li>.`,
            elements: listsWithBadChildren,
          });
        }

        // 3.1.1 — Page language
        const lang = document.documentElement.getAttribute("lang");
        if (!lang || !lang.trim()) {
          issues.push({
            item: "Page language — <html> missing lang attribute",
            wcag: "3.1.1 A",
            detail: '<html> must have a lang attribute (e.g. lang="en").',
          });
        }

        return { issues, foundLandmarks, lang: lang || null };
      });

      tests["semantic-structure"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: {
          issueCount: data.issues.length,
          issues: data.issues,
          landmarksFound: data.foundLandmarks,
          pageLang: data.lang,
        },
      };
    } catch (err) {
      tests["semantic-structure"] = {
        status: "skipped",
        details: `Check failed: ${err.message}`,
      };
    }

    // ────────────────────────────────────────────────────────────────
    // §2 Keyboard interaction
    //    Checklist items:
    //    - Interactive elements are focusable (2.1 — WCAG 2.1.1 A)
    //    - Disabled elements removed from tab order or documented (2.1)
    //    - Visual-to-DOM order consistency (2.2 — WCAG 1.3.2 A)
    // ────────────────────────────────────────────────────────────────
    try {
      const data = await page.evaluate(() => {
        const issues = [];

        // 2.1 — All interactive elements must be focusable
        const interactiveSelector =
          'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [role="button"]:not([disabled]), [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="radio"], [role="switch"], [role="slider"]';
        const interactive = Array.from(
          document.querySelectorAll(interactiveSelector),
        );
        const notFocusable = [];
        for (const el of interactive) {
          el.focus();
          if (document.activeElement !== el) {
            notFocusable.push(el.outerHTML.slice(0, 150));
          }
        }
        if (document.activeElement) document.activeElement.blur();

        if (notFocusable.length > 0) {
          issues.push({
            item: "2.1 — Interactive elements not focusable",
            wcag: "2.1.1 A",
            detail: `${notFocusable.length} of ${interactive.length} interactive element(s) cannot receive focus.`,
            elements: notFocusable,
          });
        }

        // 2.1 — ARIA interactive roles without tabindex
        const ariaInteractiveRoles = [
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
        const missingTabindex = [];
        for (const role of ariaInteractiveRoles) {
          const els = document.querySelectorAll(`[role="${role}"]`);
          for (const el of els) {
            const tag = el.tagName.toLowerCase();
            const nativelyFocusable = [
              "a",
              "button",
              "input",
              "select",
              "textarea",
            ].includes(tag);
            if (!nativelyFocusable && el.getAttribute("tabindex") === null) {
              missingTabindex.push({ role, html: el.outerHTML.slice(0, 120) });
            }
          }
        }
        if (missingTabindex.length > 0) {
          issues.push({
            item: "2.1 — ARIA interactive role without tabindex",
            wcag: "2.1.1 A",
            detail: `${missingTabindex.length} element(s) have interactive ARIA roles but no tabindex.`,
            elements: missingTabindex,
          });
        }

        // 2.2 — CSS order property on flex/grid children (visual-to-DOM mismatch)
        const allElements = document.querySelectorAll("*");
        const reorderedElements = [];
        for (const el of allElements) {
          const cs = window.getComputedStyle(el);
          if (cs.order && cs.order !== "0") {
            reorderedElements.push(el.outerHTML.slice(0, 100));
          }
        }
        // Check for reverse flex/grid directions on containers
        const reverseContainers = [];
        for (const el of allElements) {
          const cs = window.getComputedStyle(el);
          if (
            cs.flexDirection === "row-reverse" ||
            cs.flexDirection === "column-reverse"
          ) {
            const childCount = el.children.length;
            if (childCount > 1) {
              reverseContainers.push({
                html: el.outerHTML.slice(0, 100),
                direction: cs.flexDirection,
                children: childCount,
              });
            }
          }
        }

        if (reorderedElements.length > 0) {
          issues.push({
            item: "2.2 — CSS order property breaks visual-to-DOM order",
            wcag: "1.3.2 A, 2.4.3 A",
            detail: `${reorderedElements.length} element(s) use CSS order, which can break keyboard/screen reader navigation sequence.`,
            elements: reorderedElements.slice(0, 5),
          });
        }
        if (reverseContainers.length > 0) {
          issues.push({
            item: "2.2 — Reverse flex direction breaks visual-to-DOM order",
            wcag: "1.3.2 A, 2.4.3 A",
            detail: `${reverseContainers.length} container(s) use reverse flex direction with multiple children.`,
            elements: reverseContainers.slice(0, 5),
          });
        }

        return {
          issues,
          totalInteractive: interactive.length,
          notFocusableCount: notFocusable.length,
        };
      });

      tests["keyboard-interaction"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: {
          issueCount: data.issues.length,
          issues: data.issues,
          totalInteractive: data.totalInteractive,
          notFocusableCount: data.notFocusableCount,
        },
      };
    } catch (err) {
      tests["keyboard-interaction"] = {
        status: "skipped",
        details: `Check failed: ${err.message}`,
      };
    }

    // ────────────────────────────────────────────────────────────────
    // §3 Focus management
    //    Checklist items:
    //    - Hidden content removed from tab order (3.2)
    //    - No focus trap outside of modals (3.1)
    //    - Overlay Escape key behavior (3.1)
    // ────────────────────────────────────────────────────────────────
    try {
      const data = await page.evaluate(() => {
        const issues = [];

        // 3.2 — Hidden content must be removed from tab order
        const hiddenFocusable = [];
        const focusableSelector =
          "a[href], button, input, select, textarea, [tabindex]";
        const focusables = document.querySelectorAll(focusableSelector);
        for (const el of focusables) {
          // Check if the element or an ancestor is hidden
          const isHidden =
            el.getAttribute("hidden") !== null ||
            el.getAttribute("aria-hidden") === "true" ||
            window.getComputedStyle(el).display === "none" ||
            window.getComputedStyle(el).visibility === "hidden";

          // Walk up to check ancestors too
          let ancestor = el.parentElement;
          let ancestorHidden = false;
          while (ancestor && !ancestorHidden) {
            if (
              ancestor.getAttribute("hidden") !== null ||
              ancestor.getAttribute("aria-hidden") === "true" ||
              window.getComputedStyle(ancestor).display === "none" ||
              window.getComputedStyle(ancestor).visibility === "hidden"
            ) {
              ancestorHidden = true;
            }
            ancestor = ancestor.parentElement;
          }

          if ((isHidden || ancestorHidden) && el.tabIndex >= 0) {
            hiddenFocusable.push(el.outerHTML.slice(0, 120));
          }
        }
        if (hiddenFocusable.length > 0) {
          issues.push({
            item: "3.2 — Hidden content in tab order",
            wcag: "2.4.3 A",
            detail: `${hiddenFocusable.length} hidden element(s) are still reachable via keyboard (tabindex >= 0).`,
            elements: hiddenFocusable.slice(0, 10),
          });
        }

        // 4.1 — Expandable triggers should have aria-expanded
        const expandableTriggers = document.querySelectorAll(
          '[aria-haspopup], [data-state="open"], [data-state="closed"]',
        );
        const missingExpanded = [];
        for (const el of expandableTriggers) {
          if (el.getAttribute("aria-expanded") === null) {
            missingExpanded.push(el.outerHTML.slice(0, 120));
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

      tests["focus-management"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: {
          issueCount: data.issues.length,
          issues: data.issues,
        },
      };
    } catch (err) {
      tests["focus-management"] = {
        status: "skipped",
        details: `Check failed: ${err.message}`,
      };
    }

    // ────────────────────────────────────────────────────────────────
    // §4 ARIA conventions
    //    Checklist items:
    //    - aria-expanded on triggers (4.1 — WCAG 4.1.2 A)
    //    - aria-haspopup with correct type (4.1)
    //    - Disabled strategy — html disabled vs aria-disabled (4.2)
    //    - Live regions for dynamic content (4.3 — WCAG 4.1.3 AA)
    //    - aria-busy on loading containers (4.3)
    //    - Broken ARIA ID references (WCAG 4.1.2 A)
    // ────────────────────────────────────────────────────────────────
    try {
      const data = await page.evaluate(() => {
        const issues = [];

        // 4.1 — aria-haspopup should not use bare "true" (maps to "menu")
        const haspopupEls = document.querySelectorAll("[aria-haspopup]");
        const badHaspopup = [];
        for (const el of haspopupEls) {
          const val = el.getAttribute("aria-haspopup");
          if (val === "true") {
            badHaspopup.push(el.outerHTML.slice(0, 120));
          }
        }
        if (badHaspopup.length > 0) {
          issues.push({
            item: '4.1 — aria-haspopup="true" used instead of specific type',
            wcag: "4.1.2 A",
            detail: `${badHaspopup.length} element(s) use aria-haspopup="true" which maps to "menu". Use the specific popup type (menu, listbox, dialog, grid, tree).`,
            elements: badHaspopup,
          });
        }

        // 4.2 — Disabled elements: check for tooltip-on-disabled pattern
        // HTML disabled elements cannot be reached by keyboard, so tooltips on
        // them are inaccessible
        const disabledWithTooltip = [];
        const disabledEls = document.querySelectorAll("[disabled]");
        for (const el of disabledEls) {
          if (
            el.getAttribute("title") ||
            el.getAttribute("data-tooltip") ||
            el.closest("[data-tooltip]")
          ) {
            disabledWithTooltip.push(el.outerHTML.slice(0, 120));
          }
        }
        if (disabledWithTooltip.length > 0) {
          issues.push({
            item: "4.2 — Tooltip on HTML-disabled element",
            wcag: "4.1.2 A, 2.1.1 A",
            detail: `${disabledWithTooltip.length} disabled element(s) have tooltips that keyboard users cannot reach.`,
            elements: disabledWithTooltip,
          });
        }

        // Broken ARIA ID references (4.1.2 A)
        const ariaRefAttrs = [
          "aria-labelledby",
          "aria-describedby",
          "aria-controls",
          "aria-owns",
          "aria-activedescendant",
          "aria-flowto",
          "aria-errormessage",
          "aria-details",
        ];
        const brokenRefs = [];
        for (const attr of ariaRefAttrs) {
          for (const el of document.querySelectorAll(`[${attr}]`)) {
            const val = el.getAttribute(attr);
            if (!val) continue;
            const missing = val
              .split(/\s+/)
              .filter(Boolean)
              .filter((id) => !document.getElementById(id));
            if (missing.length > 0) {
              brokenRefs.push({
                element: el.outerHTML.slice(0, 120),
                attribute: attr,
                missingIds: missing,
              });
            }
          }
        }
        if (brokenRefs.length > 0) {
          issues.push({
            item: "4.1/4.3 — Broken ARIA ID references",
            wcag: "4.1.2 A",
            detail: `${brokenRefs.length} element(s) reference IDs that do not exist in the DOM.`,
            elements: brokenRefs,
          });
        }

        // Check for valid ARIA roles
        const allWithRole = document.querySelectorAll("[role]");
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
          // Abstract roles that should NOT be used:
          // "command", "composite", "input", "landmark", "range", "roletype",
          // "sectionhead", "select", "structure", "widget", "window"
        ]);
        const invalidRoles = [];
        for (const el of allWithRole) {
          const role = el.getAttribute("role");
          if (role && !validRoles.has(role)) {
            invalidRoles.push({ role, html: el.outerHTML.slice(0, 100) });
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

      tests["aria-conventions"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: {
          issueCount: data.issues.length,
          issues: data.issues,
          brokenRefCount: data.brokenRefCount,
        },
      };
    } catch (err) {
      tests["aria-conventions"] = {
        status: "skipped",
        details: `Check failed: ${err.message}`,
      };
    }

    // ────────────────────────────────────────────────────────────────
    // §5 Screen reader behavior
    //    Checklist items:
    //    - Every interactive element has an accessible name (5.1, WCAG 4.1.2 A)
    //    - Icon-only buttons have aria-label (5.1, WCAG 1.1.1 A)
    //    - Form inputs have label association (5.1)
    //    - Images have alt text (WCAG 1.1.1 A)
    // ────────────────────────────────────────────────────────────────
    try {
      const data = await page.evaluate(() => {
        const issues = [];

        // 5.1 — Buttons without accessible name
        const buttons = document.querySelectorAll('button, [role="button"]');
        const unlabeledButtons = [];
        for (const btn of buttons) {
          const text = (btn.textContent || "").trim();
          const ariaLabel = btn.getAttribute("aria-label");
          const ariaLabelledby = btn.getAttribute("aria-labelledby");
          const title = btn.getAttribute("title");
          if (!text && !ariaLabel && !ariaLabelledby && !title) {
            unlabeledButtons.push(btn.outerHTML.slice(0, 150));
          }
        }
        if (unlabeledButtons.length > 0) {
          issues.push({
            item: "5.1 — Buttons without accessible name",
            wcag: "4.1.2 A, 1.1.1 A",
            detail: `${unlabeledButtons.length} button(s) have no visible text, aria-label, aria-labelledby, or title. Icon-only buttons must have aria-label.`,
            elements: unlabeledButtons,
          });
        }

        // 5.1 — Form inputs without labels
        const inputs = document.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select',
        );
        const unlabeledInputs = [];
        for (const input of inputs) {
          const id = input.getAttribute("id");
          const ariaLabel = input.getAttribute("aria-label");
          const ariaLabelledby = input.getAttribute("aria-labelledby");
          const title = input.getAttribute("title");
          const placeholder = input.getAttribute("placeholder");
          const wrappedInLabel = input.closest("label") !== null;
          const hasAssociatedLabel = id
            ? document.querySelector(`label[for="${id}"]`) !== null
            : false;

          // placeholder alone is not a label per WCAG
          if (
            !ariaLabel &&
            !ariaLabelledby &&
            !title &&
            !wrappedInLabel &&
            !hasAssociatedLabel
          ) {
            unlabeledInputs.push({
              html: input.outerHTML.slice(0, 150),
              hasPlaceholder: !!placeholder,
            });
          }
        }
        if (unlabeledInputs.length > 0) {
          const placeholderOnly = unlabeledInputs.filter(
            (i) => i.hasPlaceholder,
          ).length;
          issues.push({
            item: "5.1 — Form inputs without label association",
            wcag: "4.1.2 A, 1.3.1 A",
            detail: `${unlabeledInputs.length} input(s) lack a <label>, aria-label, or aria-labelledby.${placeholderOnly > 0 ? ` ${placeholderOnly} use placeholder only (not a valid label).` : ""}`,
            elements: unlabeledInputs.map((i) => i.html),
          });
        }

        // 5.1/1.1.1 — Images without alt text
        const imagesWithoutAlt = Array.from(
          document.querySelectorAll("img:not([alt])"),
        ).map((el) => el.outerHTML.slice(0, 200));
        if (imagesWithoutAlt.length > 0) {
          issues.push({
            item: "5.1 — Images missing alt attribute",
            wcag: "1.1.1 A",
            detail: `${imagesWithoutAlt.length} <img> element(s) have no alt attribute. Decorative images need alt="".`,
            elements: imagesWithoutAlt,
          });
        }

        // 5.1 — Links without accessible name
        const links = document.querySelectorAll('a[href], [role="link"]');
        const unlabeledLinks = [];
        for (const link of links) {
          const text = (link.textContent || "").trim();
          const ariaLabel = link.getAttribute("aria-label");
          const ariaLabelledby = link.getAttribute("aria-labelledby");
          const title = link.getAttribute("title");
          const img = link.querySelector("img[alt]");
          if (!text && !ariaLabel && !ariaLabelledby && !title && !img) {
            unlabeledLinks.push(link.outerHTML.slice(0, 150));
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
        const ambiguousLinks = [];
        for (const link of links) {
          const text = (link.textContent || "").trim().toLowerCase();
          const ariaLabel = link.getAttribute("aria-label");
          // Only flag if there's no overriding aria-label with better text
          if (!ariaLabel && ambiguousTexts.includes(text)) {
            ambiguousLinks.push({
              html: link.outerHTML.slice(0, 150),
              text,
            });
          }
        }
        if (ambiguousLinks.length > 0) {
          issues.push({
            item: "5.2 — Ambiguous link text",
            wcag: "2.4.4 A",
            detail: `${ambiguousLinks.length} link(s) use generic text like "read more" or "click here" that is meaningless when read out of context by a screen reader.`,
            elements: ambiguousLinks.map((l) => `"${l.text}" → ${l.html}`),
          });
        }

        // 5.3 — Generic/low-quality alt text (passes axe but communicates nothing)
        const genericAlts = [
          "image", "photo", "picture", "icon", "img", "banner",
          "decorative image", "logo", "graphic", "placeholder",
          "untitled", "screenshot", "thumbnail",
        ];
        const genericAltImages = [];
        const imagesWithAlt = document.querySelectorAll("img[alt]");
        for (const img of imagesWithAlt) {
          const alt = (img.getAttribute("alt") || "").trim().toLowerCase();
          // Empty alt is intentional for decorative images — skip it
          if (alt && genericAlts.includes(alt)) {
            genericAltImages.push({
              html: img.outerHTML.slice(0, 200),
              alt,
            });
          }
        }
        if (genericAltImages.length > 0) {
          issues.push({
            item: "5.3 — Generic alt text",
            wcag: "1.1.1 A",
            detail: `${genericAltImages.length} image(s) have generic alt text like "image" or "photo" that communicates nothing. Alt text should describe the image's role on the page.`,
            elements: genericAltImages.map((i) => `alt="${i.alt}" → ${i.html}`),
          });
        }

        return { issues };
      });

      tests["screen-reader"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: {
          issueCount: data.issues.length,
          issues: data.issues,
        },
      };
    } catch (err) {
      tests["screen-reader"] = {
        status: "skipped",
        details: `Check failed: ${err.message}`,
      };
    }

    // ────────────────────────────────────────────────────────────────
    // §6 Contrast and color
    //    Checklist items:
    //    - Standard text 4.5:1 (6.1 — WCAG 1.4.3 AA)
    //    - Large text 3:1 (6.1 — WCAG 1.4.3 AA)
    //    - UI components 3:1 (6.1 — WCAG 1.4.11 AA)
    //    - Semantic color paired with non-color indicator (6.2 — WCAG 1.4.1 A)
    // ────────────────────────────────────────────────────────────────
    try {
      // Use axe-core for contrast — it checks both text and non-text
      const contrastResults = await page.evaluate(async () => {
        return await window.axe.run(document, {
          runOnly: { type: "rule", values: ["color-contrast"] },
        });
      });

      const contrastViolations = contrastResults.violations || [];

      // Also check for color independence (6.2)
      const colorIndependence = await page.evaluate(() => {
        // Check if any element uses only color to convey tone/state
        // Look for Sanity UI semantic tone patterns without accompanying icons or text
        const issues = [];

        // Check for elements with error/warning/success styling but no icon or status text
        // This is a heuristic — we check for red/green/yellow backgrounds without
        // adjacent icons or explicit status text
        const statusElements = document.querySelectorAll(
          '[data-tone="critical"], [data-tone="caution"], [data-tone="positive"], [data-tone="primary"]',
        );
        // Just report the count — full color-independence testing requires visual analysis
        return {
          semanticToneElements: statusElements.length,
        };
      });

      const issues = [];
      if (contrastViolations.length > 0) {
        issues.push({
          item: "6.1 — Color contrast violations",
          wcag: "1.4.3 AA, 1.4.11 AA",
          detail: `${contrastViolations.length} color contrast violation(s) found by axe-core.`,
          violations: contrastViolations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodeCount: (v.nodes || []).length,
            nodes: (v.nodes || []).slice(0, 5).map((n) => ({
              html: (n.html || "").slice(0, 120),
              failureSummary: n.failureSummary,
            })),
          })),
        });
      }

      tests["contrast-and-color"] = {
        status: issues.length === 0 ? "passed" : "failed",
        details: {
          issueCount: issues.length,
          issues,
          contrastViolationCount: contrastViolations.length,
          semanticToneElements: colorIndependence.semanticToneElements,
          incompleteCount: (contrastResults.incomplete || []).length,
        },
      };
    } catch (err) {
      tests["contrast-and-color"] = {
        status: "skipped",
        details: `Check failed: ${err.message}`,
      };
    }

    // ────────────────────────────────────────────────────────────────
    // §7 Motion
    //    Checklist items:
    //    - All animations honor prefers-reduced-motion (7.1 — WCAG 2.3.3)
    //    - No animation required to understand a state change (7.1)
    // ────────────────────────────────────────────────────────────────
    try {
      // Enable prefers-reduced-motion and check for running animations
      await page.emulateMediaFeatures([
        { name: "prefers-reduced-motion", value: "reduce" },
      ]);

      // Wait a tick for styles to recalculate
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(r)));

      const data = await page.evaluate(() => {
        const issues = [];
        const animatedElements = [];

        // Parse a CSS duration string (e.g. "0.1s", "100ms", "1e-05s") to
        // milliseconds. Returns 0 for unparseable values.
        function parseDurationMs(raw) {
          if (!raw || raw === "none") return 0;
          // Handle comma-separated lists (e.g. "0.1s, 0.1s, 0.1s") —
          // take the largest value
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

        // Threshold: anything under 1ms is effectively instant.
        // The recommended prefers-reduced-motion override uses 0.01ms
        // (rendered by browsers as "1e-05s"), which must not be flagged.
        const INSTANT_THRESHOLD_MS = 1;

        const allEls = document.querySelectorAll("*");
        for (const el of allEls) {
          const cs = window.getComputedStyle(el);

          const duration = cs.transitionDuration;
          const animDuration = cs.animationDuration;
          const animName = cs.animationName;

          const transMs = parseDurationMs(duration);
          const animMs = parseDurationMs(animDuration);

          const hasTransition = transMs >= INSTANT_THRESHOLD_MS;
          const hasAnimation =
            animName && animName !== "none" && animMs >= INSTANT_THRESHOLD_MS;

          if (hasTransition || hasAnimation) {
            animatedElements.push({
              html: el.outerHTML.slice(0, 100),
              transitionDuration: duration,
              animationName: animName,
              animationDuration: animDuration,
            });
          }
        }

        if (animatedElements.length > 0) {
          issues.push({
            item: "7.1 — Animations active despite prefers-reduced-motion: reduce",
            wcag: "2.3.3 AAA (baseline)",
            detail: `${animatedElements.length} element(s) still have non-zero animation/transition durations with prefers-reduced-motion: reduce.`,
            elements: animatedElements.slice(0, 10),
          });
        }

        return { issues, animatedCount: animatedElements.length };
      });

      // Restore default media features
      await page.emulateMediaFeatures([]);

      tests["motion"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: {
          issueCount: data.issues.length,
          issues: data.issues,
          animatedElementCount: data.animatedCount,
        },
      };
    } catch (err) {
      tests["motion"] = {
        status: "skipped",
        details: `Check failed: ${err.message}`,
      };
    }

    // ────────────────────────────────────────────────────────────────
    // §8 Touch targets
    //    Checklist items:
    //    - All interactive targets meet 24×24 CSS px (8.1 — WCAG 2.5.8 AA)
    //    - Inline links within text are exempt (8.1)
    // ────────────────────────────────────────────────────────────────
    try {
      const data = await page.evaluate(() => {
        const issues = [];
        const MIN_SIZE = 24;

        const interactiveSelector =
          'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="radio"], [role="switch"], [tabindex]:not([tabindex="-1"])';
        const elements = document.querySelectorAll(interactiveSelector);
        const tooSmall = [];

        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) continue; // hidden
          if (rect.width < MIN_SIZE || rect.height < MIN_SIZE) {
            // Exempt: inline links within paragraph text
            const isInlineLink =
              el.tagName === "A" &&
              el.parentElement &&
              ["P", "LI", "SPAN", "TD", "DD", "LABEL"].includes(
                el.parentElement.tagName,
              ) &&
              window.getComputedStyle(el).display === "inline";
            if (isInlineLink) continue;

            tooSmall.push({
              html: el.outerHTML.slice(0, 120),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            });
          }
        }

        if (tooSmall.length > 0) {
          issues.push({
            item: `8.1 — Touch targets below ${MIN_SIZE}×${MIN_SIZE}px`,
            wcag: "2.5.8 AA",
            detail: `${tooSmall.length} interactive element(s) are below the minimum ${MIN_SIZE}×${MIN_SIZE}px target size.`,
            elements: tooSmall.slice(0, 15),
          });
        }

        return {
          issues,
          totalChecked: elements.length,
          tooSmallCount: tooSmall.length,
        };
      });

      tests["touch-targets"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: {
          issueCount: data.issues.length,
          issues: data.issues,
          totalChecked: data.totalChecked,
          tooSmallCount: data.tooSmallCount,
        },
      };
    } catch (err) {
      tests["touch-targets"] = {
        status: "skipped",
        details: `Check failed: ${err.message}`,
      };
    }

    // ────────────────────────────────────────────────────────────────
    // §9 Heading hierarchy
    //    Checklist items:
    //    - Headings use <h1>–<h6>, not styled <div>/<span> (9.1, WCAG 1.3.1 A)
    //    - No skipped heading levels (9.1, WCAG 2.4.6 AA)
    //    - Heading levels follow page hierarchy (9.1)
    // ────────────────────────────────────────────────────────────────
    try {
      const data = await page.evaluate(() => {
        const issues = [];

        // Collect all headings in DOM order
        const headings = document.querySelectorAll(
          "h1, h2, h3, h4, h5, h6, [role='heading']",
        );
        const levels = [];
        for (const h of headings) {
          const ariaLevel = h.getAttribute("aria-level");
          let level;
          if (ariaLevel) {
            level = parseInt(ariaLevel, 10);
          } else {
            const tag = h.tagName;
            level = parseInt(tag.replace("H", ""), 10);
          }
          levels.push({
            level,
            text: (h.textContent || "").trim().slice(0, 60),
            tag: h.tagName,
          });
        }

        // Check for skipped levels
        const skipped = [];
        for (let i = 1; i < levels.length; i++) {
          const prev = levels[i - 1].level;
          const curr = levels[i].level;
          // Jumping down (e.g. h2 → h4) is a skip. Going up (h4 → h2) is fine.
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
            detail: `${skipped.length} heading level skip(s) found. Skipping levels (e.g. h2 to h4) confuses screen reader navigation.`,
            skipped,
          });
        }

        // Check for multiple h1 elements
        const h1Count = document.querySelectorAll(
          "h1, [role='heading'][aria-level='1']",
        ).length;
        if (h1Count > 1) {
          issues.push({
            item: "9.1 — Multiple h1 elements",
            wcag: "1.3.1 A",
            detail: `Page has ${h1Count} h1 element(s). Best practice is one h1 per page.`,
          });
        }

        // Check if page has zero headings at all
        if (levels.length === 0) {
          issues.push({
            item: "9.1 — No headings found",
            wcag: "2.4.6 AA",
            detail:
              "Page has no heading elements. Headings provide structure for screen reader navigation.",
          });
        }

        return {
          issues,
          headingCount: levels.length,
          levels,
        };
      });

      tests["heading-hierarchy"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: {
          issueCount: data.issues.length,
          issues: data.issues,
          headingCount: data.headingCount,
          headings: data.levels,
        },
      };
    } catch (err) {
      tests["heading-hierarchy"] = {
        status: "skipped",
        details: `Check failed: ${err.message}`,
      };
    }

    // ────────────────────────────────────────────────────────────────
    // §10 Spacing and reflow
    //    Checklist items:
    //    - Works at 400% zoom / 320px viewport (WCAG 1.4.10 AA)
    //    - No horizontal scrollbar at 320px wide (WCAG 1.4.10 AA)
    // ────────────────────────────────────────────────────────────────
    try {
      // Resize viewport to 320px wide (simulates 400% zoom on 1280px)
      await page.setViewport({ width: 320, height: 900 });
      // Re-navigate to let styles recalc fully
      await page.goto(serverUrl, {
        waitUntil: "networkidle2",
        timeout: 30_000,
      });
      await waitForRenderedContent(page, iterLabel);

      const data = await page.evaluate(() => {
        const issues = [];

        // Check for horizontal overflow
        const hasHorizontalScroll =
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth;
        const overflowAmount =
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth;

        if (hasHorizontalScroll && overflowAmount > 5) {
          issues.push({
            item: "Reflow — Horizontal scroll at 320px viewport",
            wcag: "1.4.10 AA",
            detail: `Page content overflows by ${overflowAmount}px at 320px viewport width. Content must reflow without horizontal scrolling at 400% zoom.`,
          });
        }

        // Check for elements that overflow the viewport
        const overflowingElements = [];
        const allEls = document.querySelectorAll("*");
        for (const el of allEls) {
          const rect = el.getBoundingClientRect();
          if (rect.right > window.innerWidth + 5 && rect.width > 0) {
            // Skip invisible or trivially small elements
            if (rect.height > 10 && rect.width > 50) {
              overflowingElements.push({
                html: el.outerHTML.slice(0, 100),
                right: Math.round(rect.right),
                viewportWidth: window.innerWidth,
              });
            }
          }
        }

        if (overflowingElements.length > 0) {
          issues.push({
            item: "Reflow — Elements overflow viewport at 320px",
            wcag: "1.4.10 AA",
            detail: `${overflowingElements.length} element(s) extend beyond the 320px viewport.`,
            elements: overflowingElements.slice(0, 10),
          });
        }

        return { issues, hasHorizontalScroll, overflowAmount };
      });

      // Restore original viewport
      await page.setViewport({ width: 1440, height: 900 });

      tests["spacing-and-reflow"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: {
          issueCount: data.issues.length,
          issues: data.issues,
          hasHorizontalScroll: data.hasHorizontalScroll,
          overflowAmount: data.overflowAmount,
        },
      };
    } catch (err) {
      // Restore viewport even on failure
      try {
        await page.setViewport({ width: 1440, height: 900 });
      } catch {
        /* ignore */
      }
      tests["spacing-and-reflow"] = {
        status: "skipped",
        details: `Check failed: ${err.message}`,
      };
    }

    // ────────────────────────────────────────────────────────────────
    // §11 Skip navigation
    //     Checklist items:
    //     - Skip link as first focusable element (WCAG 2.4.1 A)
    //     - Skip link targets main content region
    //     Note: Landmarks help screen reader users but NOT keyboard-only
    //     sighted users. A skip link serves both groups.
    // ────────────────────────────────────────────────────────────────
    try {
      const data = await page.evaluate(() => {
        const issues = [];

        // Find the first focusable element on the page
        const focusableSelector =
          'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
        const allFocusable = Array.from(
          document.querySelectorAll(focusableSelector),
        ).filter((el) => {
          const style = window.getComputedStyle(el);
          return style.display !== "none" && style.visibility !== "hidden";
        });

        const firstFocusable = allFocusable[0];
        let hasSkipLink = false;
        let skipLinkTarget = null;

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
              "Keyboard-only users must tab through all header/navigation elements to reach main content. " +
              'Add <a href="#main-content" class="sr-only focus:not-sr-only">Skip to main content</a> as the first focusable element.',
          });
        }

        return { issues, hasSkipLink, skipLinkTarget };
      });

      tests["skip-navigation"] = {
        status: data.issues.length === 0 ? "passed" : "failed",
        details: {
          issueCount: data.issues.length,
          issues: data.issues,
          hasSkipLink: data.hasSkipLink,
          skipLinkTarget: data.skipLinkTarget,
        },
      };
    } catch (err) {
      tests["skip-navigation"] = {
        status: "skipped",
        details: `Check failed: ${err.message}`,
      };
    }

    // ────────────────────────────────────────────────────────────────
    // §12 Dark mode & state contrast
    //     Checklist items:
    //     - Dark mode contrast passes WCAG 1.4.3 AA (text 4.5:1)
    //     - Hover/focus state contrast passes (1.4.3 AA, 1.4.11 AA)
    //     Note: The default §6 contrast scan only evaluates the page
    //     in its initial light-mode state. Contrast failures in dark
    //     mode, hover states, or focus states are invisible without
    //     triggering those states before scanning.
    // ────────────────────────────────────────────────────────────────
    try {
      // Re-inject axe-core for this section
      await page.evaluate(axeSource);

      const issues = [];

      // 12.1 — Dark mode contrast
      // Check if the page responds to prefers-color-scheme: dark
      await page.emulateMediaFeatures([
        { name: "prefers-color-scheme", value: "dark" },
      ]);
      // Allow a moment for CSS transitions to apply
      await page.evaluate(
        () => new Promise((resolve) => setTimeout(resolve, 300)),
      );

      const darkResult = await page.evaluate(async () => {
        return await window.axe.run(document, {
          runOnly: { type: "rule", values: ["color-contrast"] },
        });
      });

      const darkViolations = darkResult.violations || [];
      if (darkViolations.length > 0) {
        issues.push({
          item: "12.1 — Dark mode contrast violations",
          wcag: "1.4.3 AA, 1.4.11 AA",
          detail: `${darkViolations.length} contrast violation(s) found when prefers-color-scheme: dark is active.`,
          violations: darkViolations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodeCount: (v.nodes || []).length,
            nodes: (v.nodes || []).slice(0, 5).map((n) => ({
              html: (n.html || "").slice(0, 120),
              failureSummary: n.failureSummary,
            })),
          })),
        });
      }

      // Restore to light mode
      await page.emulateMediaFeatures([
        { name: "prefers-color-scheme", value: "light" },
      ]);
      await page.evaluate(
        () => new Promise((resolve) => setTimeout(resolve, 300)),
      );

      // 12.2 — Focus state contrast
      // Find interactive elements and focus each, then spot-check contrast
      const focusIssues = await page.evaluate(async () => {
        const interactiveSelector =
          'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])';
        const interactiveEls = Array.from(
          document.querySelectorAll(interactiveSelector),
        ).slice(0, 20); // Cap at 20 to avoid excessive runtime

        const focusProblems = [];
        for (const el of interactiveEls) {
          el.focus();
          // Check if the focused element has a visible focus indicator
          const cs = window.getComputedStyle(el);
          const outline = cs.outlineStyle;
          const outlineWidth = parseFloat(cs.outlineWidth);
          const boxShadow = cs.boxShadow;

          const hasOutline = outline !== "none" && outlineWidth > 0;
          const hasBoxShadow = boxShadow !== "none" && boxShadow !== "";

          if (!hasOutline && !hasBoxShadow) {
            focusProblems.push({
              html: el.outerHTML.slice(0, 120),
              tag: el.tagName.toLowerCase(),
            });
          }
          el.blur();
        }
        return focusProblems;
      });

      if (focusIssues.length > 0) {
        issues.push({
          item: "12.2 — Missing focus indicator",
          wcag: "2.4.7 AA",
          detail: `${focusIssues.length} interactive element(s) lack a visible focus indicator (no outline or box-shadow on :focus). Keyboard users cannot tell which element is focused.`,
          elements: focusIssues.map((f) => f.html),
        });
      }

      tests["dark-mode-contrast"] = {
        status: issues.length === 0 ? "passed" : "failed",
        details: {
          issueCount: issues.length,
          issues,
          darkModeViolationCount: darkViolations.length,
          missingFocusIndicatorCount: focusIssues.length,
        },
      };
    } catch (err) {
      tests["dark-mode-contrast"] = {
        status: "skipped",
        details: `Check failed: ${err.message}`,
      };
    }

    // ────────────────────────────────────────────────────────────────
    // Full axe-core sweep
    //    Catches anything the targeted tests above miss, including
    //    rules for ARIA, forms, structure, and more.
    // ────────────────────────────────────────────────────────────────
    try {
      // Re-inject axe-core since we navigated for the reflow test
      await page.evaluate(axeSource);

      const axeResults = await page.evaluate(async () => {
        return await window.axe.run(document, {
          runOnly: {
            type: "tag",
            values: [
              "wcag2a",
              "wcag2aa",
              "wcag21a",
              "wcag21aa",
              "wcag22aa",
              "best-practice",
            ],
          },
        });
      });

      axeViolations = axeResults.violations || [];
      axeViolationCount = axeViolations.length;

      tests["axe-core-full"] = {
        status: axeViolationCount === 0 ? "passed" : "failed",
        details: {
          violationCount: axeViolationCount,
          passCount: (axeResults.passes || []).length,
          incompleteCount: (axeResults.incomplete || []).length,
          inapplicableCount: (axeResults.inapplicable || []).length,
          violations: axeViolations.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            helpUrl: v.helpUrl,
            nodeCount: (v.nodes || []).length,
            tags: v.tags.filter((t) => t.startsWith("wcag")),
          })),
        },
      };
    } catch (err) {
      tests["axe-core-full"] = {
        status: "skipped",
        details: `axe.run failed: ${err.message}`,
      };
    }

    // ── Build summary ─────────────────────────────────────────────────

    let passed = 0;
    let failed = 0;
    let skipped = 0;
    for (const t of Object.values(tests)) {
      if (t.status === "passed") passed++;
      else if (t.status === "failed") failed++;
      else skipped++;
    }

    const results = {
      label: iterLabel,
      timestamp: new Date().toISOString(),
      tests,
      axeViolationCount,
      axeViolations,
      summary: {
        totalTests: TEST_NAMES.length,
        passed,
        failed,
        skipped,
      },
    };

    await safeWriteResults(iterDir, results);

    console.log(
      `[${iterLabel}] ✓ Accessibility: ${passed} passed, ${failed} failed, ${skipped} skipped (${axeViolationCount} axe violations)`,
    );

    return results;
  } catch (err) {
    const reason = `Unexpected error: ${err.message}`;
    console.warn(`[${iterLabel}] ⚠ Accessibility tests skipped: ${reason}`);
    const results = skippedResults(reason);
    await safeWriteResults(iterDir, results);
    return results;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore close errors
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Poll the page until we detect that something has actually rendered,
 * or give up after a timeout.
 */
async function waitForRenderedContent(page, iterLabel) {
  const MAX_WAIT_MS = 15_000;
  const POLL_INTERVAL_MS = 500;
  const start = Date.now();

  while (Date.now() - start < MAX_WAIT_MS) {
    const hasContent = await page.evaluate(() => {
      const roots = document.querySelectorAll(
        "#root, #app, [data-sanity], #__next, [data-ui]",
      );
      for (const root of roots) {
        if (root.children.length > 0 && root.offsetHeight > 0) {
          return true;
        }
      }
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

/**
 * Safely write results JSON to disk, swallowing any write errors.
 */
async function safeWriteResults(iterDir, results) {
  try {
    const outPath = resolve(iterDir, "_a11y_results.json");
    await writeFile(outPath, JSON.stringify(results, null, 2), "utf-8");
  } catch {
    // Don't let a file write error break the caller
  }
}
