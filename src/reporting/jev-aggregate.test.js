import { describe, expect, it } from "vitest";
import { analyzeRepairLoop } from "./aggregators.js";

const iter = (n, over = {}) => ({
  iteration: n,
  exitStage: "clean",
  fixAttempts: 0,
  firstTryLint: 0,
  residualLint: 0,
  firstTryAxe: 0,
  residualAxe: 0,
  ...over,
});

describe("analyzeRepairLoop — jev", () => {
  it("reports measured: 0 when the gate never ran, so a paid gate being off is visible", () => {
    const rl = analyzeRepairLoop([iter(1), iter(2)]);
    expect(rl.jev.measured).toBe(0);
    expect(rl.jev.filesJudged).toBe(0);
    expect(rl.jev.inputTokens).toBe(0);
  });

  it("distinguishes 'judged, found nothing' from 'never judged'", () => {
    const rl = analyzeRepairLoop([
      iter(1, { firstTryJev: 0, residualJev: 0, jevJudged: 4, jevInputTokens: 12000 }),
      iter(2), // gate off this iteration
    ]);
    expect(rl.jev.measured).toBe(1);
    expect(rl.jev.iterationsCleanFirstTry).toBe(1);
    expect(rl.jev.iterationsWithResidual).toBe(0);
    expect(rl.jev.filesJudged).toBe(4);
  });

  it("averages departures and sums cost across judged iterations only", () => {
    const rl = analyzeRepairLoop([
      iter(1, { firstTryJev: 2, residualJev: 0, jevJudged: 3, jevInputTokens: 10000 }),
      iter(2, { firstTryJev: 4, residualJev: 1, jevJudged: 5, jevInputTokens: 20000 }),
    ]);
    expect(rl.jev.measured).toBe(2);
    expect(rl.jev.firstTryAvg).toBe(3);
    expect(rl.jev.residualAvg).toBe(0.5);
    expect(rl.jev.iterationsWithResidual).toBe(1);
    expect(rl.jev.filesJudged).toBe(8);
    expect(rl.jev.inputTokens).toBe(30000);
  });

  it("counts a jev exit stage", () => {
    const rl = analyzeRepairLoop([iter(1, { exitStage: "jev" })]);
    expect(rl.stageCounts.jev).toBe(1);
  });

  it("carries per-iteration jev numbers through", () => {
    const rl = analyzeRepairLoop([iter(1, { firstTryJev: 2, residualJev: 1 })]);
    expect(rl.perIteration[0]).toMatchObject({ firstTryJev: 2, residualJev: 1 });
  });
});
