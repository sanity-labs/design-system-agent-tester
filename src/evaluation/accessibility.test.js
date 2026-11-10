import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  findUnnamedInteractive,
  isSafeTriggerLabel,
  runAccessibilityTests,
  summarizeBeyondStatic,
} from "./accessibility.js";

describe("findUnnamedInteractive", () => {
  const node = (role, name, extra = {}) => ({
    role: { value: role },
    name: { value: name },
    ...extra,
  });

  it("counts interactive controls with no accessible name", () => {
    const nodes = [
      node("button", ""),
      node("button", "Save"),
      node("link", "   "),
      node("textbox", "Email"),
      node("heading", ""), // not interactive
    ];
    const result = findUnnamedInteractive(nodes);
    expect(result.interactiveCount).toBe(4);
    expect(result.unnamedCount).toBe(2);
    expect(result.samples.map((s) => s.role)).toEqual(["button", "link"]);
  });

  it("skips ignored nodes, which assistive technology does not see", () => {
    const nodes = [node("button", "", { ignored: true }), node("button", "")];
    expect(findUnnamedInteractive(nodes).unnamedCount).toBe(1);
  });

  it("returns zero for an empty tree", () => {
    expect(findUnnamedInteractive([])).toEqual({
      interactiveCount: 0,
      unnamedCount: 0,
      samples: [],
    });
  });
});

describe("isSafeTriggerLabel", () => {
  it("excludes triggers that could submit, pay, delete or send", () => {
    for (const label of [
      "Delete project",
      "Sign out",
      "Submit order",
      "Pay now",
      "Send invoice",
      "Save changes",
    ]) {
      expect(isSafeTriggerLabel(label)).toBe(false);
    }
  });

  it("allows ordinary navigation and disclosure triggers", () => {
    for (const label of ["Open dialog", "Overview", "Add item", "(unnamed)"]) {
      expect(isSafeTriggerLabel(label)).toBe(true);
    }
  });
});

describe("summarizeBeyondStatic", () => {
  it("returns null when neither report-only check ran", () => {
    expect(summarizeBeyondStatic(null, null)).toBeNull();
    expect(summarizeBeyondStatic({ error: "timeout" }, { states: [] })).toBeNull();
  });

  it("totals the states and leaves unnamed count null when the tree failed", () => {
    const interaction = {
      states: [
        {
          axeNewViolations: ["image-alt"],
          focusNotInDialog: true,
          focusNotRestored: null,
          liveAnnouncements: 2,
        },
        {
          axeNewViolations: [],
          focusNotInDialog: null,
          focusNotRestored: true,
          liveAnnouncements: 0,
        },
        { skipped: "trigger changed on reload" },
      ],
    };
    expect(summarizeBeyondStatic({ error: "timeout" }, interaction)).toEqual({
      unnamedInteractive: null,
      statesTested: 2,
      statesWithNewViolations: 1,
      focusNotInDialog: 1,
      focusNotRestored: 1,
      liveAnnouncements: 2,
    });
  });
});

describe("runAccessibilityTests against a fixture with known problems", {
  timeout: 120_000,
}, () => {
  let dir;
  let results;
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "a11y-test-"));
    const page = join(dir, "index.html");
    await writeFile(
      page,
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>fixture</title></head><body>
<div id="root">
  <h1>Fixture</h1>
  <button id="icon-only"><svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16"/></svg></button>
  <button id="open-dialog">Open dialog</button>
  <div id="dlg" role="dialog" aria-modal="true" aria-label="Details" hidden><p>Body</p><button>Close</button></div>
  <button id="add">Add item</button>
  <div id="status" aria-live="polite"></div>
  <button id="save">Save changes</button>
</div>
<script>
  document.getElementById('open-dialog').addEventListener('click', () => { document.getElementById('dlg').hidden = false; });
  document.getElementById('add').addEventListener('click', () => {
    document.getElementById('status').textContent = 'Item added';
    const img = document.createElement('img'); img.src = 'x.png'; document.getElementById('root').appendChild(img);
  });
  document.getElementById('save').addEventListener('click', () => { window.saved = true; });
</script></body></html>`,
    );
    results = await runAccessibilityTests({
      serverUrl: pathToFileURL(page).href,
      iterDir: dir,
      iterLabel: "fixture",
    });
  }, 120_000);

  afterAll(async () => {
    log.mockRestore();
    warn.mockRestore();
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("keeps the gating result on static axe checks only", () => {
    expect(results.summary.skipped).toBeUndefined();
    expect(results.summary.passed).toBe(false);
    expect(results.axeViolations.map((v) => v.id)).toContain("button-name");
    // The click-only image violation must not reach the gating result.
    expect(results.axeViolations.map((v) => v.id)).not.toContain("image-alt");
  });

  it("finds the unnamed icon button in the accessibility tree", () => {
    expect(results.axeTree.unnamedCount).toBe(1);
  });

  it("finds a dialog whose focus was not moved into it", () => {
    const dialog = results.interaction.states.find((s) => s.trigger === "Open dialog");
    expect(dialog.dialogOpened).toBe(true);
    expect(dialog.focusNotInDialog).toBe(true);
  });

  it("records live-region text that changed after a click", () => {
    const add = results.interaction.states.find((s) => s.trigger === "Add item");
    expect(add.liveText).toContain("Item added");
  });

  it("flags a violation that only appears after a click as new in that state", () => {
    const add = results.interaction.states.find((s) => s.trigger === "Add item");
    expect(add.axeNewViolations).toContain("image-alt");
    expect(results.beyondStatic.statesWithNewViolations).toBeGreaterThanOrEqual(1);
  });

  it("never clicks a destructive trigger", () => {
    expect(results.interaction.states.map((s) => s.trigger)).not.toContain("Save changes");
    expect(results.interaction.triggersExcluded).toBeGreaterThanOrEqual(1);
  });

  it("writes the results file with the report-only sections", async () => {
    const saved = JSON.parse(await readFile(join(dir, "_a11y_results.json"), "utf-8"));
    expect(saved.scope).toMatch(/report only/);
    expect(saved.axeTree).toBeTruthy();
    expect(saved.interaction.statesTested).toBeGreaterThan(0);
  });
});
