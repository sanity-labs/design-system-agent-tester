import { describe, expect, it } from "vitest";
import {
  describeAutofixRewrites,
  diffLineHunks,
  formatAutofixNote,
  withAutofixNote,
} from "./autofix-note.js";

// The 2026-10-02 case: the agent wrote the margin into `style`, and the
// autofix lifted it back out into a prop that does not accept it.
const AGENT = [
  "<Box",
  '  id="main-content"',
  "  flexGrow={1}",
  "  style={{ marginRight: panelItem ? '40%' : 0, transition: 'margin-right 0.25s ease' }}",
  ">",
].join("\n");
const AUTOFIXED = [
  "<Box",
  '  id="main-content"',
  "  flexGrow={1}",
  "  marginRight={panelItem ? '40%' : 0} style={{ transition: 'margin-right 0.25s ease' }}",
  ">",
].join("\n");

describe("diffLineHunks", () => {
  it("returns nothing for identical text", () => {
    expect(diffLineHunks("a\nb", "a\nb")).toEqual([]);
  });

  it("reports a changed line at its line number in the rewritten file", () => {
    const [h, ...rest] = diffLineHunks(AGENT, AUTOFIXED);
    expect(rest).toEqual([]);
    expect(h.line).toBe(4);
    expect(h.before[0]).toContain("style={{ marginRight");
    expect(h.after[0]).toContain("marginRight={panelItem");
  });

  it("keeps separate changes as separate hunks", () => {
    const a = ["1", "x", "3", "4", "5", "y", "7"].join("\n");
    const b = ["1", "X", "3", "4", "5", "Y", "7"].join("\n");
    expect(diffLineHunks(a, b).map((h) => h.line)).toEqual([2, 6]);
  });

  it("handles pure insertions and deletions", () => {
    expect(diffLineHunks("a\nc", "a\nb\nc")).toEqual([{ line: 2, before: [], after: ["b"] }]);
    expect(diffLineHunks("a\nb\nc", "a\nc")).toEqual([{ line: 2, before: ["b"], after: [] }]);
  });
});

describe("describeAutofixRewrites", () => {
  it("lists only files the autofix changed", () => {
    const before = [
      { path: "src/App.tsx", content: AGENT },
      { path: "src/main.tsx", content: "same" },
    ];
    const after = [
      { path: "src/App.tsx", content: AUTOFIXED },
      { path: "src/main.tsx", content: "same" },
    ];
    const r = describeAutofixRewrites(before, after);
    expect(r.map((x) => x.path)).toEqual(["src/App.tsx"]);
  });

  it("ignores files that were not on disk before the pass", () => {
    expect(describeAutofixRewrites([], [{ path: "new.tsx", content: "x" }])).toEqual([]);
  });
});

describe("formatAutofixNote", () => {
  it("is empty when nothing was rewritten, so it can be appended unconditionally", () => {
    expect(formatAutofixNote([])).toBe("");
    expect(withAutofixNote("PROMPT", "")).toBe("PROMPT");
  });

  it("shows what the agent wrote and what the autofix wrote, with the line", () => {
    const note = formatAutofixNote(
      describeAutofixRewrites(
        [{ path: "src/App.tsx", content: AGENT }],
        [{ path: "src/App.tsx", content: AUTOFIXED }],
      ),
    );
    expect(note).toContain("## Lint autofix rewrote these lines after your change");
    expect(note).toContain("@@ src/App.tsx, line 4 @@");
    expect(note).toContain("-  style={{ marginRight: panelItem ? '40%' : 0");
    expect(note).toContain("+  marginRight={panelItem ? '40%' : 0}");
    // The instruction that breaks the loop: don't repeat the same edit.
    expect(note).toMatch(/writing the same code again will be rewritten the same way/);
  });

  it("caps hunks and lines so a sweeping autofix can't crowd out the errors", () => {
    const before = Array.from({ length: 30 }, (_, i) => `line ${i}`).join("\n");
    const after = Array.from({ length: 30 }, (_, i) => (i % 2 ? `LINE ${i}` : `line ${i}`)).join(
      "\n",
    );
    const note = formatAutofixNote(
      describeAutofixRewrites(
        [{ path: "a.tsx", content: before }],
        [{ path: "a.tsx", content: after }],
      ),
      { maxHunks: 3 },
    );
    expect((note.match(/^@@ /gm) || []).length).toBe(3);
    expect(note).toContain("…and 12 more change(s).");
  });
});
