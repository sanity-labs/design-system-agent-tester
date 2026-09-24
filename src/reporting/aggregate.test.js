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

  it("shows builds-ultimately-succeeded per test as `X / N (P%)` in the Build group", () => {
    const withBuilds = {
      alpha: { ...aggregates.alpha, buildsSucceeded: 3 }, // 3/3 = 100%
      beta: { ...aggregates.beta, buildsSucceeded: 1 }, // 1/3 = 33%
    };
    const md = renderMetricsTables(["alpha", "beta"], withBuilds);
    expect(md).toContain("Builds succeeded (avg)");
    // Counts are averaged across runs, so they render with one decimal.
    expect(md).toContain("3.0 / 3 (100%)");
    expect(md).toContain("1.0 / 3 (33%)");
  });

  it("renders builds-succeeded as `—` when the metric is absent (older reports)", () => {
    const md = renderMetricsTables(["alpha"], { alpha: aggregates.alpha });
    // aggregates.alpha has no buildsSucceeded key.
    expect(md).toContain("Builds succeeded (avg)");
    expect(md).toContain("—");
  });

  it("reports tsconfig/project-reference errors in their own group, separate from Build and npm install", () => {
    const withTsconfigErrors = {
      alpha: { ...aggregates.alpha, tsconfigErrorsTotal: 0, tsconfigErrorsAffected: 0 },
      beta: { ...aggregates.beta, tsconfigErrorsTotal: 4, tsconfigErrorsAffected: 1 },
    };
    const md = renderMetricsTables(["alpha", "beta"], withTsconfigErrors);
    expect(md).toContain("### tsconfig / project-reference errors");
    expect(md).toContain("Total errors");
    expect(md).toContain("Iterations affected");

    // Not folded into the Build group's own metrics.
    const buildSection = md.slice(md.indexOf("### Build"), md.indexOf("### npm install failures"));
    expect(buildSection).not.toContain("tsconfig");
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

// Regression guard. A metric has to be listed in AGGREGATABLE_KEYS as well as
// extracted, or the summary silently prints "—" even though the report holds
// the data. That is exactly what happened when the failure-taxonomy and
// coverage metrics were first added: the detail sections showed real numbers
// while the summary at the top of the report showed dashes for every test.
describe("summary metrics survive aggregation", () => {
  const sampleReport = {
    totalIterations: 10,
    builtIterations: 9,
    linesOfCode: { average: 1200 },
    fixAttempts: { average: 1, total: 10, byStage: {} },
    failures: {
      measured: 10,
      failed: 1,
      unrecoverableRate: 0.1,
      byCategory: [{ id: "missing-export", label: "Missing or misnamed export", count: 3 }],
      turnsToGreen: { median: 1, p90: 2, cleanFirstTry: 2, measured: 9 },
    },
    tieredCoverage: {
      shares: { composite: 0.11, primitive: 0.72, raw: 0.17 },
    },
  };

  const NUMERIC_SUMMARY_KEYS = [
    "turnsToGreenMedian",
    "turnsToGreenP90",
    "unrecoverableRate",
    "compositeShare",
    "primitiveShare",
    "rawShare",
  ];

  it("extracts every summary metric from a report", () => {
    const m = extractMetrics(sampleReport);
    for (const k of NUMERIC_SUMMARY_KEYS) {
      expect(m[k], `extractMetrics dropped ${k}`).not.toBeNull();
    }
    expect(m.topFailureCategory).toBe("Missing or misnamed export");
  });

  it("carries them through aggregation instead of dropping them", () => {
    const agg = aggregateMetrics([extractMetrics(sampleReport)]);
    for (const k of NUMERIC_SUMMARY_KEYS) {
      expect(agg[k], `aggregateMetrics dropped ${k} — add it to AGGREGATABLE_KEYS`).not.toBeNull();
    }
    expect(agg.unrecoverableRate).toBeCloseTo(0.1);
    expect(agg.compositeShare).toBeCloseTo(0.11);
  });

  // A label cannot be averaged, so it needs its own path.
  it("picks the most common top-failure category across runs", () => {
    const other = {
      ...sampleReport,
      failures: {
        ...sampleReport.failures,
        byCategory: [{ id: "wrong-prop-type", label: "Wrong prop type", count: 1 }],
      },
    };
    const agg = aggregateMetrics([sampleReport, sampleReport, other].map(extractMetrics));
    expect(agg.topFailureCategory).toBe("Missing or misnamed export");
    expect(agg.topFailureCount).toBe(6);
  });

  it("renders them into the summary tables with real values, not dashes", () => {
    const agg = { arm: aggregateMetrics([extractMetrics(sampleReport)]) };
    const md = renderMetricsTables(["arm"], agg);
    expect(md).toContain("### Failure taxonomy");
    expect(md).toContain("### Design system coverage");
    expect(md).toContain("10.0%");
    expect(md).toContain("72.0%");
    expect(md).toContain("Missing or misnamed export");
  });

  it("still renders dashes when a report predates the metrics", () => {
    const old = { totalIterations: 10, linesOfCode: { average: 1 }, fixAttempts: {} };
    const agg = { arm: aggregateMetrics([extractMetrics(old)]) };
    const md = renderMetricsTables(["arm"], agg);
    expect(md).toContain("### Failure taxonomy");
    expect(md).toMatch(/Failure taxonomy[\s\S]*?—/);
  });
});
