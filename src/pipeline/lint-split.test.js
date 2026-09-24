import { describe, expect, it } from "vitest";
import { selfLintStats, summarizeLintFiles } from "./runner-api.js";

// The report splits lint findings into what the harness fixed, what needed a
// person, and whether the agent linted its own code.
describe("lint split", () => {
  it("counts the findings the fix pass removed", () => {
    const r = summarizeLintFiles([
      { filename: "a.tsx", fixedMessages: [{}, {}], messages: [{ severity: 2, ruleId: "x" }] },
      { filename: "b.tsx", fixedMessages: [{}], messages: [] },
    ]);
    expect(r.autofixed).toBe(3);
    expect(r.remaining).toBe(1);
  });

  it("reads the agent's lint calls and first findings from the tool log", () => {
    const log = [
      { tool: "dsds_get_agent_context" },
      {
        tool: "dsds_lint",
        resultText:
          "## Lint results — 4 files linted, 3 fixable automatically, 2 need a change from you\n...",
      },
      {
        tool: "dsds_lint",
        resultText: "## Lint results — 1 file linted, 0 need a change from you",
      },
    ];
    expect(selfLintStats(log, "dsds_lint")).toEqual({ selfLintCalls: 2, selfLintFindings: 5 });
    expect(selfLintStats([], "dsds_lint")).toEqual({ selfLintCalls: 0, selfLintFindings: null });
  });
});
