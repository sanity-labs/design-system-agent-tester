import { describe, expect, it } from "vitest";
import {
  aggregateMetrics,
  delta,
  extractMetrics,
  mean,
  renderMetricsTables,
  stdDev,
} from "./aggregate.js";

// ---------------------------------------------------------------------------
// extractMetrics — pull headline scalars out of a report.prompts[label] block
// ---------------------------------------------------------------------------
describe("extractMetrics", () => {
  it("returns null for every metric on an empty data block", () => {
    const m = extractMetrics({});
    expect(m.loc).toBeNull();
    expect(m.axeAvg).toBeNull();
    expect(m.fcpMs).toBeNull();
    // boxInline defaults to 0 (a count), not null
    expect(m.boxInline).toBe(0);
  });

  it("pulls nested values from a populated block", () => {
    const data = {
      totalIterations: 3,
      linesOfCode: { average: 120 },
      fixAttempts: { average: 1.5, total: 4, iterationsCleanOnFirstTry: 2 },
      accessibility: { totalViolations: 6, averageViolations: 2 },
      lighthouse: { medianFcpMs: 800, meanFcpMs: 820 },
      semanticHtml: { avgSemanticRatio: 0.4, avgSemanticCount: 10 },
    };
    const m = extractMetrics(data);
    expect(m.loc).toBe(120);
    expect(m.fixesAvg).toBe(1.5);
    expect(m.cleanOnFirstTry).toBe(2);
    expect(m.axeTotal).toBe(6);
    expect(m.fcpMs).toBe(800);
    expect(m.fcpMsMean).toBe(820);
    expect(m.semanticRatio).toBe(0.4);
  });

  it("prefers median over mean for lighthouse, falling back to mean", () => {
    expect(extractMetrics({ lighthouse: { avgFcpMs: 700 } }).fcpMs).toBe(700);
    expect(extractMetrics({ lighthouse: { medianFcpMs: 650, avgFcpMs: 700 } }).fcpMs).toBe(650);
  });
});

// ---------------------------------------------------------------------------
// aggregateMetrics — mean / sd / min / max bundle across runs
// ---------------------------------------------------------------------------
describe("aggregateMetrics", () => {
  it("computes mean / sd / min / max per key across runs", () => {
    const agg = aggregateMetrics([
      { loc: 100, totalIterations: 3 },
      { loc: 200, totalIterations: 3 },
    ]);
    expect(agg.count).toBe(2);
    expect(agg.loc).toBe(150);
    expect(agg.loc_min).toBe(100);
    expect(agg.loc_max).toBe(200);
    expect(agg.loc_sd).toBeCloseTo(50, 5);
    expect(agg.totalIterations).toBe(3);
  });

  it("ignores missing/null entries instead of producing NaN", () => {
    const agg = aggregateMetrics([
      { loc: 100 },
      { loc: null },
      { loc: 200 },
      {}, // loc undefined
    ]);
    expect(agg.loc).toBe(150);
    expect(Number.isNaN(agg.loc)).toBe(false);
  });

  it("returns null sd for a single run (spread undefined)", () => {
    const agg = aggregateMetrics([{ loc: 100 }]);
    expect(agg.loc).toBe(100);
    expect(agg.loc_sd).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// delta — percentage better/worse string, guarded against non-finite
// ---------------------------------------------------------------------------
describe("delta", () => {
  it("reports improvement when lower is better", () => {
    expect(delta(100, 70, true)).toBe("-30% better");
  });
  it("reports regression when lower is better", () => {
    expect(delta(100, 130, true)).toBe("+30% worse");
  });
  it("flips direction when higher is better", () => {
    expect(delta(100, 130, false)).toBe("+30% better");
  });
  it("returns '' when the baseline is 0 (no meaningful percentage)", () => {
    expect(delta(0, 50)).toBe("");
  });
  it("returns '' for missing or non-finite values", () => {
    expect(delta(null, 50)).toBe("");
    expect(delta(100, undefined)).toBe("");
    expect(delta(NaN, 50)).toBe("");
    expect(delta(100, NaN)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// renderMetricsTables — themed tables, winner marks, two-label Δ row
// ---------------------------------------------------------------------------
describe("renderMetricsTables", () => {
  const aggregates = {
    alpha: { loc: 100, axeTotal: 2, totalIterations: 3, cleanOnFirstTry: 2 },
    beta: { loc: 140, axeTotal: 5, totalIterations: 3, cleanOnFirstTry: 1 },
  };

  it("renders one section per metric group with the test labels as rows", () => {
    const md = renderMetricsTables(["alpha", "beta"], aggregates);
    expect(md).toContain("### Build");
    expect(md).toContain("### Accessibility");
    expect(md).toContain("**alpha**");
    expect(md).toContain("**beta**");
  });

  it("appends a Δ row only when exactly two labels are compared", () => {
    const two = renderMetricsTables(["alpha", "beta"], aggregates);
    expect(two).toContain("Δ (beta vs alpha)");

    const one = renderMetricsTables(["alpha"], { alpha: aggregates.alpha });
    expect(one).not.toContain("Δ (");
  });

  it("marks the winning cell for a metric with a check", () => {
    const md = renderMetricsTables(["alpha", "beta"], aggregates);
    // alpha has fewer axe violations (lower is better) → it wins that column.
    expect(md).toContain("✓");
  });
});

// Sanity: the stats re-exported from aggregate.js are the unified ones.
describe("aggregate re-exports unified stats", () => {
  it("mean ignores non-finite entries", () => {
    expect(mean([2, null, 4, NaN, 6])).toBe(4);
  });
  it("stdDev returns null for <2 values", () => {
    expect(stdDev([5])).toBeNull();
  });
});
