import { describe, expect, it } from "vitest";
import { renderSummary, selectRunDirs } from "./summarize.js";

// ---------------------------------------------------------------------------
// selectRunDirs — pure --from / --count filtering of sorted run-dir names
// ---------------------------------------------------------------------------
describe("selectRunDirs", () => {
  const names = ["2026-04-01/10.00", "2026-04-02/11.30", "2026-04-03/09.15", "2026-04-04/14.45"];

  it("returns all runs with no filters", () => {
    expect(selectRunDirs(names)).toEqual(names);
  });

  it("keeps runs at or after --from (lexical = chronological)", () => {
    expect(selectRunDirs(names, { fromFilter: "2026-04-03/09.15" })).toEqual([
      "2026-04-03/09.15",
      "2026-04-04/14.45",
    ]);
  });

  it("keeps runs strictly after a --from that falls between entries", () => {
    expect(selectRunDirs(names, { fromFilter: "2026-04-02/12.00" })).toEqual([
      "2026-04-03/09.15",
      "2026-04-04/14.45",
    ]);
  });

  it("returns empty when --from is after every run", () => {
    expect(selectRunDirs(names, { fromFilter: "2026-05-01/00.00" })).toEqual([]);
  });

  it("keeps the N most recent with --count", () => {
    expect(selectRunDirs(names, { maxCount: 2 })).toEqual(["2026-04-03/09.15", "2026-04-04/14.45"]);
  });

  it("applies --from before --count", () => {
    expect(selectRunDirs(names, { fromFilter: "2026-04-02/11.30", maxCount: 2 })).toEqual([
      "2026-04-03/09.15",
      "2026-04-04/14.45",
    ]);
  });

  it("does not mutate the input array", () => {
    const copy = [...names];
    selectRunDirs(names, { maxCount: 1 });
    expect(names).toEqual(copy);
  });
});

// ---------------------------------------------------------------------------
// renderSummary — cross-run markdown
// ---------------------------------------------------------------------------
describe("renderSummary", () => {
  const makeRun = (name, loc, axe) => ({
    name,
    report: {
      prompts: {
        "shad-cn": {
          totalIterations: 3,
          linesOfCode: { average: loc },
          accessibility: { totalViolations: axe, averageViolations: axe / 3 },
        },
      },
    },
  });

  it("renders a header, the run list, and an aggregate table", () => {
    const md = renderSummary(
      [makeRun("2026-04-01/10.00", 100, 3), makeRun("2026-04-02/11.30", 200, 6)],
      ["shad-cn"],
      "/tmp/output",
    );
    expect(md).toContain("# Agent Test Summary");
    expect(md).toContain("Runs included (2)");
    expect(md).toContain("shad-cn");
    expect(md).toContain("## Aggregate Averages");
  });

  it("includes a variance section only with multiple runs", () => {
    const multi = renderSummary(
      [makeRun("a", 100, 3), makeRun("b", 200, 6)],
      ["shad-cn"],
      "/tmp/output",
    );
    expect(multi).toContain("## Metric Variance");

    const single = renderSummary([makeRun("a", 100, 3)], ["shad-cn"], "/tmp/output");
    expect(single).not.toContain("## Metric Variance");
  });

  it("tolerates a run missing the requested label", () => {
    const runs = [
      makeRun("a", 100, 3),
      { name: "b", report: { prompts: {} } }, // no shad-cn
    ];
    expect(() => renderSummary(runs, ["shad-cn"], "/tmp/output")).not.toThrow();
  });
});
