/**
 * Accessibility checks.
 *
 * One browser session produces two kinds of result.
 *
 * GATING — `summary.passed` and `axeViolations`: axe-core on the page as it
 * loads, in light and dark mode. Only this decides pass/fail, and it feeds the
 * repair loop. It is unchanged.
 *
 * REPORT ONLY — `axeTree`, `interaction` and `beyondStatic`: checks that look
 * past the first load. Added from the a11y-regression-spike findings
 * (docs/findings.md, Oct 2026). That study caught 16% of 77 regression
 * patterns with axe alone, 67% once the accessibility tree was added, and 75%
 * with event observation. These results are reported but do not gate, until
 * their false-alarm rate is known on clean builds.
 *
 *   - axeTree: the accessibility tree after load. Interactive controls with no
 *     accessible name are counted.
 *   - interaction: each safe trigger is clicked on a fresh page. axe and the
 *     tree check run at that state. Focus moves and live-region text are
 *     recorded. If a dialog opens, focus must be inside it, and it must return
 *     to the trigger after Escape.
 *
 * Self-contained: opens its own browser instance.
 */

import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import {
  launchBrowser,
  MEASURE_TIMEOUT_MS,
  NAV_TIMEOUT_MS,
  waitForRenderedContent,
  withTimeout,
} from "./puppeteer-helpers.js";

const require = createRequire(import.meta.url);

/**
 * WCAG tag sets to test against.
 * Each scan uses these tags to filter axe-core rules.
 */
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

/** Roles whose accessible name is required. A control with none is unusable by a screen reader. */
const INTERACTIVE_ROLES = new Set([
  "button",
  "checkbox",
  "combobox",
  "link",
  "menuitem",
  "radio",
  "searchbox",
  "slider",
  "spinbutton",
  "switch",
  "tab",
  "textbox",
]);

/** Candidates for a click in the interaction states: buttons, tabs and anything that opens a popup. */
const TRIGGER_SELECTOR = 'button, [role="button"], [role="tab"], [aria-haspopup], [aria-expanded]';

/** Most states tested per iteration. Each one reloads the page. */
const MAX_STATES = 5;

/** Stop starting new states once this much time has passed. */
const INTERACTION_BUDGET_MS = 90_000;

/** Time allowed for a click or key press to take effect. */
const STATE_SETTLE_MS = 400;

/**
 * Labels that suggest a click has an effect outside the page: submit, pay,
 * delete and similar. Those triggers are never clicked.
 */
const DESTRUCTIVE_LABEL =
  /delete|remove|sign ?out|log ?out|submit|pay|purchase|send|publish|confirm|save|reset|discard|checkout/i;

/** Run an axe-core scan of the document with the WCAG tags. */
function runAxe(page, label) {
  return withTimeout(
    page.evaluate(async (tags) => {
      return await window.axe.run(document, {
        runOnly: { type: "tag", values: tags },
      });
    }, AXE_TAGS),
    MEASURE_TIMEOUT_MS,
    `axe.run (${label})`,
  );
}

/** Accessible role of an accessibility-tree node, or "". */
export function roleOf(node) {
  return node?.role?.value ?? "";
}

/** Accessible name of an accessibility-tree node, trimmed, or "". */
export function nameOf(node) {
  return String(node?.name?.value ?? "").trim();
}

/**
 * Interactive controls in a Chrome accessibility tree that have no name.
 *
 * `axNodes` is the `nodes` array from `Accessibility.getFullAXTree`. Ignored
 * nodes are skipped, since they are not exposed to assistive technology.
 */
export function findUnnamedInteractive(axNodes = []) {
  const interactive = axNodes.filter((n) => !n.ignored && INTERACTIVE_ROLES.has(roleOf(n)));
  const unnamed = interactive.filter((n) => nameOf(n) === "");
  return {
    interactiveCount: interactive.length,
    unnamedCount: unnamed.length,
    samples: unnamed.slice(0, 5).map((n) => ({
      role: roleOf(n),
      backendDOMNodeId: n.backendDOMNodeId ?? null,
    })),
  };
}

/** False for a trigger whose label suggests it submits, pays, deletes or sends something. */
export function isSafeTriggerLabel(label) {
  return !DESTRUCTIVE_LABEL.test(label);
}

/**
 * Run in the page. Finds the visible candidate triggers, tags each one with
 * `data-a11y-trigger=<n>` so it can be clicked again after a reload, and
 * returns what it found. The tag does not change how the element looks or
 * what assistive technology reads.
 */
function tagTriggers(selector) {
  const visible = [...document.querySelectorAll(selector)].filter((el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return (
      r.width > 0 &&
      r.height > 0 &&
      cs.visibility !== "hidden" &&
      cs.display !== "none" &&
      !el.disabled &&
      !el.closest('[aria-hidden="true"]')
    );
  });
  return visible.map((el, i) => {
    el.setAttribute("data-a11y-trigger", String(i));
    const text = (el.getAttribute("aria-label") || el.textContent || el.getAttribute("title") || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 80);
    const submits =
      el.tagName === "BUTTON" &&
      Boolean(el.form) &&
      (el.getAttribute("type") || "submit") === "submit";
    const offSite =
      el.tagName === "A" && Boolean(el.href) && new URL(el.href).origin !== location.origin;
    return {
      index: i,
      label: text || "(unnamed)",
      role: el.getAttribute("role") || el.tagName.toLowerCase(),
      submits,
      offSite,
    };
  });
}

/** Run in the page before a click. Records focus moves and live-region text. */
function installProbe() {
  const probe = (window.__a11yProbe = { focus: [], live: [] });
  const describe = (el) => (el ? `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}` : null);
  document.addEventListener(
    "focusin",
    (e) => {
      if (probe.focus.length < 50) probe.focus.push(describe(e.target));
    },
    true,
  );
  new MutationObserver((mutations) => {
    for (const m of mutations) {
      const node = m.target.nodeType === 1 ? m.target : m.target.parentElement;
      const region = node?.closest(
        '[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"]',
      );
      const text = region?.textContent.trim().replace(/\s+/g, " ").slice(0, 120);
      if (text && probe.live.length < 50) probe.live.push(text);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true });
}

/** Run in the page. Returns null when no dialog is open, else whether focus is inside it. */
function dialogFocus() {
  const dialog = [
    ...document.querySelectorAll('[role="dialog"], [role="alertdialog"], dialog[open]'),
  ].find((el) => el.getBoundingClientRect().width > 0);
  if (!dialog) return null;
  return { focusInside: dialog.contains(document.activeElement) };
}

/** Run in the page. The data-a11y-trigger index of the focused element, or null. */
function focusedTriggerIndex() {
  return document.activeElement?.getAttribute("data-a11y-trigger") ?? null;
}

/** Load the page and inject axe-core. Dialogs the app opens are dismissed, so they cannot block a run. */
async function loadFresh(browser, serverUrl, axeSource, iterLabel) {
  const page = await browser.newPage();
  page.setDefaultTimeout(NAV_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(serverUrl, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT_MS });
  await waitForRenderedContent(page, { iterLabel });
  await page.evaluate(axeSource);
  return page;
}

/** The accessibility tree of the page, as unnamed-control counts. */
async function collectAxeTree(page) {
  const session = await page.createCDPSession();
  try {
    const { nodes } = await withTimeout(
      session.send("Accessibility.getFullAXTree"),
      MEASURE_TIMEOUT_MS,
      "Accessibility.getFullAXTree",
    );
    return findUnnamedInteractive(nodes);
  } finally {
    await session.detach().catch(() => {});
  }
}

/**
 * Click one trigger on a fresh page and record what happens. Never throws:
 * a state that cannot run is returned with `skipped` set.
 */
async function runState({ browser, serverUrl, axeSource, iterLabel, candidate, staticIds }) {
  const base = { index: candidate.index, trigger: candidate.label, role: candidate.role };
  let page = null;
  try {
    page = await loadFresh(browser, serverUrl, axeSource, iterLabel);
    // A reload can change the page, so the trigger is matched by label before it is clicked.
    const again = await page.evaluate(tagTriggers, TRIGGER_SELECTOR);
    const match = again.find((c) => c.index === candidate.index);
    if (!match || match.label !== candidate.label) {
      return { ...base, skipped: "trigger changed on reload" };
    }

    await page.evaluate(installProbe);
    await page.click(`[data-a11y-trigger="${candidate.index}"]`);
    await page.evaluate((ms) => new Promise((r) => setTimeout(r, ms)), STATE_SETTLE_MS);

    const probe = await page.evaluate(() => window.__a11yProbe ?? { focus: [], live: [] });
    const dialog = await page.evaluate(dialogFocus);
    const axe = await runAxe(page, iterLabel);
    const tree = await withTimeout(collectAxeTree(page), MEASURE_TIMEOUT_MS, "accessibility tree");

    const axeIds = [...new Set((axe.violations || []).map((v) => v.id))];
    const state = {
      ...base,
      dialogOpened: dialog !== null,
      // Focus should move into an opened dialog. Null when no dialog opened.
      focusNotInDialog: dialog ? !dialog.focusInside : null,
      focusNotRestored: null,
      focusMoves: probe.focus.length,
      liveAnnouncements: probe.live.length,
      liveText: probe.live.slice(0, 5),
      axeViolations: axeIds,
      axeNewViolations: axeIds.filter((id) => !staticIds.has(id)),
      unnamedInteractive: tree.unnamedCount,
    };

    if (dialog) {
      // Escape should close the dialog and return focus to the trigger.
      await page.keyboard.press("Escape");
      await page.evaluate((ms) => new Promise((r) => setTimeout(r, ms)), STATE_SETTLE_MS);
      state.focusNotRestored =
        (await page.evaluate(focusedTriggerIndex)) !== String(candidate.index);
    }
    return state;
  } catch (err) {
    return { ...base, skipped: err.message };
  } finally {
    if (page) await page.close().catch(() => {});
  }
}

/**
 * The interaction states for one iteration: a list of candidate triggers is
 * found on a fresh page, and each safe one (up to MAX_STATES) is run on its
 * own page. Returns null when the page has no candidates at all.
 */
async function runInteractionStates({ browser, serverUrl, axeSource, iterLabel, staticIds }) {
  const discover = await loadFresh(browser, serverUrl, axeSource, iterLabel);
  let candidates;
  try {
    candidates = await discover.evaluate(tagTriggers, TRIGGER_SELECTOR);
  } finally {
    await discover.close().catch(() => {});
  }

  const picked = candidates
    .filter((c) => !c.submits && !c.offSite && isSafeTriggerLabel(c.label))
    .slice(0, MAX_STATES);

  const started = Date.now();
  const states = [];
  for (const candidate of picked) {
    if (Date.now() - started > INTERACTION_BUDGET_MS) {
      states.push({
        index: candidate.index,
        trigger: candidate.label,
        role: candidate.role,
        skipped: "time budget",
      });
      continue;
    }
    states.push(await runState({ browser, serverUrl, axeSource, iterLabel, candidate, staticIds }));
  }

  return {
    triggersFound: candidates.length,
    triggersExcluded: candidates.length - picked.length,
    statesTested: states.filter((s) => !s.skipped).length,
    statesSkipped: states.filter((s) => s.skipped).length,
    states,
  };
}

/**
 * Run accessibility tests against a running dev server URL.
 *
 * Gating: axe-core in light mode, then dark mode (via
 * `prefers-color-scheme: dark` media emulation), merged.
 * Report only: the accessibility tree after load, and the interaction states.
 *
 * @param {object} opts
 * @param {string} opts.serverUrl - The dev server URL to test
 * @param {string} opts.iterDir  - Directory for this iteration's output
 * @param {string} opts.iterLabel - Label for logging
 * @returns {Promise<object>} A11y results object (never throws)
 */
export async function runAccessibilityTests({ serverUrl, iterDir, iterLabel }) {
  console.log(`[${iterLabel}] Running accessibility tests (axe-core)...`);

  let browser = null;

  try {
    // Load axe-core source
    let axeSource;
    try {
      const axeCorePath = require.resolve("axe-core");
      axeSource = await readFile(axeCorePath, "utf-8");
    } catch (err) {
      return skipAll(`Failed to load axe-core: ${err.message}`, iterLabel, iterDir);
    }

    browser = await launchBrowser();

    const page = await browser.newPage();
    page.setDefaultTimeout(NAV_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);
    await page.setViewport({ width: 1440, height: 900 });

    // Navigate and wait for content
    try {
      await page.goto(serverUrl, { waitUntil: "networkidle2", timeout: NAV_TIMEOUT_MS });
    } catch (err) {
      return skipAll(`Page failed to load: ${err.message}`, iterLabel, iterDir);
    }

    await waitForRenderedContent(page, { iterLabel });

    // Inject axe-core
    try {
      await page.evaluate(axeSource);
    } catch (err) {
      return skipAll(`Failed to inject axe-core: ${err.message}`, iterLabel, iterDir);
    }

    // ── Scan 1: Light mode (default) ──────────────────────────────────────
    // axe.run walks the whole (agent-generated) DOM; runAxe bounds it so a
    // pathological page can't hang the scan indefinitely.
    const lightResult = await runAxe(page, iterLabel);

    // Report only: the accessibility tree, read in light mode before the
    // dark emulation below.
    const axeTree = await withTimeout(
      collectAxeTree(page),
      MEASURE_TIMEOUT_MS,
      "accessibility tree",
    ).catch((err) => ({ error: err.message }));

    // ── Scan 2: Dark mode ─────────────────────────────────────────────────
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
    // Allow CSS transitions to settle
    await page.evaluate(() => new Promise((r) => setTimeout(r, 500)));

    // Re-inject axe-core (media change may have triggered navigation in some
    // SPAs). If re-injection fails we must NOT run a dark scan — doing so
    // would silently re-run against the stale light-mode axe global and
    // report bogus dark numbers. Skip the dark scan entirely instead.
    let darkInjected = true;
    try {
      await page.evaluate(axeSource);
    } catch {
      darkInjected = false;
    }

    let darkResult = null;
    if (darkInjected) {
      try {
        darkResult = await runAxe(page, iterLabel);
      } catch {
        darkResult = null;
      }
    }

    // ── Assemble results ──────────────────────────────────────────────────
    const lightViolations = lightResult.violations || [];
    const darkViolations = darkResult?.violations || [];

    // Merge violations — deduplicate by rule ID, but track which mode they appeared in
    const violationMap = new Map();

    for (const v of lightViolations) {
      violationMap.set(v.id, {
        id: v.id,
        impact: v.impact,
        description: v.description,
        help: v.help,
        helpUrl: v.helpUrl,
        tags: v.tags.filter((t) => t.startsWith("wcag")),
        modes: ["light"],
        nodeCount: v.nodes.length,
        nodes: v.nodes.slice(0, 5).map((n) => ({
          html: (n.html || "").slice(0, 150),
          target: n.target,
          failureSummary: n.failureSummary,
        })),
      });
    }

    for (const v of darkViolations) {
      if (violationMap.has(v.id)) {
        const existing = violationMap.get(v.id);
        existing.modes.push("dark");
        existing.nodeCount = Math.max(existing.nodeCount, v.nodes.length);
      } else {
        violationMap.set(v.id, {
          id: v.id,
          impact: v.impact,
          description: v.description,
          help: v.help,
          helpUrl: v.helpUrl,
          tags: v.tags.filter((t) => t.startsWith("wcag")),
          modes: ["dark"],
          nodeCount: v.nodes.length,
          nodes: v.nodes.slice(0, 5).map((n) => ({
            html: (n.html || "").slice(0, 150),
            target: n.target,
            failureSummary: n.failureSummary,
          })),
        });
      }
    }

    const allViolations = [...violationMap.values()];

    // Report only: the interaction states. A failure here must not cost the
    // gating result above, so it is recorded instead of thrown.
    const staticIds = new Set(allViolations.map((v) => v.id));
    const interaction = await runInteractionStates({
      browser,
      serverUrl,
      axeSource,
      iterLabel,
      staticIds,
    }).catch((err) => ({
      error: err.message,
      triggersFound: 0,
      statesTested: 0,
      statesSkipped: 0,
      states: [],
    }));

    const results = {
      label: iterLabel,
      timestamp: new Date().toISOString(),
      scope:
        "gating: axe-core at load, light and dark. report only: axeTree, interaction, beyondStatic.",
      axeViolationCount: allViolations.length,
      axeViolations: allViolations,
      light: {
        violationCount: lightViolations.length,
        passCount: (lightResult.passes || []).length,
        incompleteCount: (lightResult.incomplete || []).length,
        inapplicableCount: (lightResult.inapplicable || []).length,
      },
      dark: darkResult
        ? {
            violationCount: darkViolations.length,
            passCount: (darkResult.passes || []).length,
            incompleteCount: (darkResult.incomplete || []).length,
          }
        : null,
      summary: {
        totalViolations: allViolations.length,
        lightViolations: lightViolations.length,
        darkOnlyViolations: darkViolations.filter(
          (v) => !lightViolations.some((lv) => lv.id === v.id),
        ).length,
        passed: allViolations.length === 0,
      },
      axeTree,
      interaction,
      beyondStatic: summarizeBeyondStatic(axeTree, interaction),
    };

    await safeWriteResults(iterDir, results);

    const darkExtra = results.summary.darkOnlyViolations;
    console.log(
      `[${iterLabel}] ✓ Accessibility: ${allViolations.length} violation(s)` +
        ` (${lightViolations.length} light` +
        (darkExtra > 0 ? `, +${darkExtra} dark-only` : "") +
        `, ${(lightResult.passes || []).length} passed)`,
    );
    const beyond = results.beyondStatic;
    if (beyond) {
      console.log(
        `[${iterLabel}]   beyond static (report only): ${beyond.unnamedInteractive ?? "—"} unnamed control(s), ` +
          `${beyond.statesTested} state(s), ${beyond.statesWithNewViolations} with new violations, ` +
          `${beyond.focusNotInDialog + beyond.focusNotRestored} focus problem(s)`,
      );
    }

    return results;
  } catch (err) {
    console.warn(`[${iterLabel}] ⚠ Accessibility tests failed: ${err.message}`);
    return skipAll(`Unexpected error: ${err.message}`, iterLabel, iterDir);
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

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Totals for the report-only checks, one object per iteration. Null when
 * neither check produced anything.
 */
export function summarizeBeyondStatic(axeTree, interaction) {
  const treeOk = axeTree && !axeTree.error;
  const states = (interaction?.states ?? []).filter((s) => !s.skipped);
  if (!treeOk && states.length === 0) return null;
  return {
    unnamedInteractive: treeOk ? axeTree.unnamedCount : null,
    statesTested: states.length,
    statesWithNewViolations: states.filter((s) => s.axeNewViolations.length > 0).length,
    focusNotInDialog: states.filter((s) => s.focusNotInDialog === true).length,
    focusNotRestored: states.filter((s) => s.focusNotRestored === true).length,
    liveAnnouncements: states.reduce((n, s) => n + s.liveAnnouncements, 0),
  };
}

/**
 * Return a "skipped" result when tests can't run.
 */
async function skipAll(reason, iterLabel, iterDir) {
  console.warn(`[${iterLabel}] ⚠ Accessibility tests skipped: ${reason}`);
  const results = {
    label: iterLabel,
    timestamp: new Date().toISOString(),
    scope: "skipped",
    axeViolationCount: 0,
    axeViolations: [],
    light: null,
    dark: null,
    summary: {
      totalViolations: 0,
      lightViolations: 0,
      darkOnlyViolations: 0,
      passed: false,
      skipped: true,
      reason,
    },
    axeTree: null,
    interaction: null,
    beyondStatic: null,
  };
  await safeWriteResults(iterDir, results);
  return results;
}

/**
 * Write results JSON, ignoring write errors.
 */
async function safeWriteResults(iterDir, results) {
  try {
    const outPath = resolve(iterDir, "_a11y_results.json");
    await writeFile(outPath, JSON.stringify(results, null, 2), "utf-8");
  } catch {
    // Ignore write errors — don't let them mask test results
  }
}
