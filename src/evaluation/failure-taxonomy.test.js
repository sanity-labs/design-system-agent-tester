import { describe, expect, it } from "vitest";
import {
  analyzeFailures,
  classifyFailure,
  FAILURE_CATEGORIES,
  firstBlockingError,
  turnsToGreen,
} from "./failure-taxonomy.js";

// The error strings below are copied from real _meta.json fixLog entries
// (2026-09-09 through 2026-09-12 runs). Synthetic strings would only prove the
// regexes match themselves.

describe("classifyFailure", () => {
  // A failure with no recorded error is a harness gap, not an agent mistake,
  // so it is kept apart from the genuinely unrecognised ones.
  it("returns 'no-error-recorded' when there is no error text", () => {
    expect(classifyFailure("")).toBe("no-error-recorded");
    expect(classifyFailure("   \n ")).toBe("no-error-recorded");
    expect(classifyFailure(null)).toBe("no-error-recorded");
    expect(classifyFailure(undefined)).toBe("no-error-recorded");
    expect(classifyFailure(42)).toBe("no-error-recorded");
  });

  it("catches a bundler or bundler-config failure", () => {
    expect(classifyFailure("Dev server exited with code 1 before becoming ready.")).toBe(
      "build-tooling",
    );
    expect(
      classifyFailure(
        `[vite] Internal server error: Missing "./dist/styles.css" specifier in "@sanity/ui" package`,
      ),
    ).toBe("build-tooling");
    expect(classifyFailure("failed to load config from /tmp/vite.config.ts")).toBe("build-tooling");
  });

  // Declared by the test in `renderFailureSignatures` — the app mounted but
  // rendered the library's own "you forgot the provider" message.
  it("catches a test-declared render failure signature", () => {
    expect(
      classifyFailure(
        `Page rendered a known failure signature instead of the app: "ThemeProvider: no "theme" property provided"`,
      ),
    ).toBe("invalid-composition");
  });

  it("catches a page that rendered without its stylesheet", () => {
    expect(
      classifyFailure(
        "Page rendered but almost no CSS was applied: 0 stylesheet rule(s) found, expected at least 300.",
      ),
    ).toBe("styles-not-applied");
  });

  it("catches tsc failing to start", () => {
    expect(
      classifyFailure(
        "Type check could not run (tsc exited abnormally): error TS18003: No inputs were found",
      ),
    ).toBe("tsconfig");
  });

  it("treats an unused declaration as lint, not a broken API", () => {
    expect(
      classifyFailure(
        "src/App.tsx(1,1): error TS6133: 'React' is declared but its value is never read.",
      ),
    ).toBe("lint");
  });

  it("catches an npm dependency conflict before anything else", () => {
    const text = `npm install failed:
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
npm error peer react@"^19.2" from @sanity/ui-v5@5.0.0-alpha.9`;
    expect(classifyFailure(text)).toBe("dependency");
  });

  it("catches an invented export name (TS2305 / TS2724)", () => {
    expect(
      classifyFailure(
        `src/App.tsx(20,3): error TS2305: Module '"@sanity/icons"' has no exported member 'EyeIcon'.`,
      ),
    ).toBe("missing-export");
    expect(
      classifyFailure(
        `src/App.tsx(17,3): error TS2724: '"@sanity/icons"' has no exported member named 'FlagIcon'. Did you mean 'TagIcon'?`,
      ),
    ).toBe("missing-export");
  });

  // The same mistake reaches the browser when the import is a subpath that
  // resolves but has no such named export. tsc passes; the page throws.
  it("catches the runtime form of a bad export", () => {
    expect(
      classifyFailure(
        `[pageerror] The requested module '/node_modules/.vite/deps/@sanity_icons.js?v=fa0c3dd2' does not provide an export named 'SearchIcon'`,
      ),
    ).toBe("missing-export");
  });

  it("catches an unresolvable module path", () => {
    expect(
      classifyFailure(
        `src/App.tsx(19,23): error TS2307: Cannot find module '@sanity/icons/Eye' or its corresponding type declarations.`,
      ),
    ).toBe("wrong-import-path");
  });

  it("catches a prop the component does not accept", () => {
    expect(
      classifyFailure(
        `Property 'mode' does not exist on type 'IntrinsicAttributes & ButtonProps<"button">'.`,
      ),
    ).toBe("hallucinated-prop");
  });

  it("catches a required prop that was left out", () => {
    expect(
      classifyFailure(
        `src/App.tsx(247,18): error TS2741: Property 'label' is missing in type '{ checked: boolean; }' but required in type 'CheckboxProps'.`,
      ),
    ).toBe("missing-required-prop");
  });

  it("catches a wrong value type for a real prop", () => {
    expect(
      classifyFailure(
        `src/App.tsx(149,9): error TS2322: Type 'number' is not assignable to type 'Responsive<string> | undefined'.`,
      ),
    ).toBe("wrong-prop-type");
  });

  it("catches a default-vs-named import mixup used as JSX", () => {
    expect(
      classifyFailure(
        `src/App.tsx(93,24): error TS2604: JSX element type 'AddIcon' does not have any construct or call signatures.`,
      ),
    ).toBe("invalid-composition");
  });

  // The class tsc cannot see: types check out, the component tree is wrong.
  it("catches a missing React context at runtime", () => {
    expect(classifyFailure("[pageerror] useRootTheme(): missing context value")).toBe(
      "invalid-composition",
    );
  });

  it("catches a blank page", () => {
    expect(
      classifyFailure("Page did not render any visible content within the timeout period"),
    ).toBe("render-timeout");
  });

  it("catches a broken tsconfig", () => {
    expect(
      classifyFailure(
        `tsconfig.json(4,5): error TS5023: Unknown compiler option 'useDefineForEnumMembers'.`,
      ),
    ).toBe("tsconfig");
  });

  it("falls back to 'other' for an unrecognised error", () => {
    expect(classifyFailure("something nobody has seen before")).toBe("other");
  });

  // Ordering guard. A dependency failure dumps a wall of npm output that can
  // also contain the word "module"; it must not be read as an import problem.
  it("prefers the more specific category when several could match", () => {
    const text = `npm install failed:\nnpm error ERESOLVE\nCannot find module 'react'`;
    expect(classifyFailure(text)).toBe("dependency");
  });

  it("only ever returns a declared category id", () => {
    const ids = new Set(FAILURE_CATEGORIES.map((c) => c.id));
    const samples = [
      "npm error ERESOLVE",
      "has no exported member",
      "TS2307: Cannot find module",
      "Property 'x' does not exist on type 'Y'",
      "TS2741",
      "TS2322",
      "TS2604",
      "missing context value",
      "Page did not render",
      "axe violation",
      "eslint error",
      "TS5023",
      "unmatched",
    ];
    for (const s of samples) expect(ids).toContain(classifyFailure(s));
  });
});

describe("firstBlockingError", () => {
  it("returns empty string when there is no fixLog", () => {
    expect(firstBlockingError({})).toBe("");
    expect(firstBlockingError({ fixLog: [] })).toBe("");
    expect(firstBlockingError(null)).toBe("");
  });

  // The final entry is the one that was never repaired. Earlier entries were
  // all fixed, so categorising them would describe solved problems.
  it("prefers the entry flagged final over the last one", () => {
    const iteration = {
      fixLog: [
        { attempt: 1, fatalError: "npm error ERESOLVE" },
        { attempt: 5, final: true, fatalError: "Page did not render" },
        { attempt: 6, fatalError: "not reached" },
      ],
    };
    expect(firstBlockingError(iteration)).toContain("Page did not render");
  });

  it("falls back to the last entry when none is flagged final", () => {
    const iteration = {
      fixLog: [{ fatalError: "first" }, { fatalError: "last" }],
    };
    expect(firstBlockingError(iteration)).toBe("last");
  });

  // The real signal is often in `errors` rather than `fatalError` — a render
  // timeout says nothing, while the console error beside it names the cause.
  it("folds console errors in alongside the fatal error", () => {
    const iteration = {
      fixLog: [
        {
          final: true,
          fatalError: "Page did not render any visible content within the timeout period",
          errors: ["[pageerror] useRootTheme(): missing context value"],
        },
      ],
    };
    const text = firstBlockingError(iteration);
    expect(text).toContain("did not render");
    expect(text).toContain("useRootTheme");
    // And the more specific console error decides the category.
    expect(classifyFailure(text)).toBe("invalid-composition");
  });
});

describe("turnsToGreen", () => {
  it("returns null when the iteration never built", () => {
    expect(turnsToGreen({ exitStage: "build", fixLog: [{ stage: "build" }] })).toBeNull();
  });

  it("returns null when the iteration never reached the build gate", () => {
    expect(turnsToGreen({ exitStage: null })).toBeNull();
    expect(turnsToGreen({})).toBeNull();
  });

  it("returns 0 for an iteration that built on the first try", () => {
    expect(turnsToGreen({ exitStage: "clean", fixLog: [] })).toBe(0);
  });

  // Lint and a11y rounds happen after the page already renders, so they are
  // not part of the cost of getting it to build.
  it("counts build rounds only", () => {
    const iteration = {
      exitStage: "accessibility",
      fixLog: [
        { stage: "build" },
        { stage: "build" },
        { stage: "lint" },
        { stage: "accessibility" },
      ],
    };
    expect(turnsToGreen(iteration)).toBe(2);
  });
});

describe("analyzeFailures", () => {
  const iterations = [
    { iteration: 1, exitStage: "clean", fixLog: [] },
    { iteration: 2, exitStage: "accessibility", fixLog: [{ stage: "build" }] },
    {
      iteration: 3,
      exitStage: "build",
      fixLog: [
        { stage: "build", final: true, fatalError: "TS2305: has no exported member 'EyeIcon'" },
      ],
    },
    {
      iteration: 4,
      exitStage: "build",
      fixLog: [
        {
          stage: "build",
          final: true,
          fatalError: "TS2724: has no exported member named 'FlagIcon'",
        },
      ],
    },
    {
      iteration: 5,
      exitStage: "build",
      fixLog: [
        {
          stage: "build",
          final: true,
          fatalError: "Page did not render",
          errors: ["missing context value"],
        },
      ],
    },
  ];

  it("reports the share of iterations that never built", () => {
    const r = analyzeFailures(iterations);
    expect(r.measured).toBe(5);
    expect(r.failed).toBe(3);
    expect(r.unrecoverableRate).toBeCloseTo(0.6);
  });

  it("ranks categories by frequency", () => {
    const r = analyzeFailures(iterations);
    expect(r.byCategory[0]).toMatchObject({ id: "missing-export", count: 2 });
    expect(r.byCategory[0].share).toBeCloseTo(2 / 3);
    expect(r.byCategory.map((c) => c.id)).toContain("invalid-composition");
  });

  it("omits categories that did not occur", () => {
    const r = analyzeFailures(iterations);
    expect(r.byCategory.map((c) => c.id)).not.toContain("lint");
  });

  it("summarises repair cost across the iterations that did build", () => {
    const r = analyzeFailures(iterations);
    expect(r.turnsToGreen.measured).toBe(2);
    expect(r.turnsToGreen.cleanFirstTry).toBe(1);
    expect(r.turnsToGreen.median).toBe(0);
    expect(r.turnsToGreen.p90).toBe(1);
  });

  // An iteration that died before the build gate (an API error, say) is not
  // evidence about the design system either way.
  it("ignores iterations that never reached the build gate", () => {
    const r = analyzeFailures([...iterations, { iteration: 6, exitStage: null }]);
    expect(r.measured).toBe(5);
  });

  it("handles an empty input without dividing by zero", () => {
    const r = analyzeFailures([]);
    expect(r.measured).toBe(0);
    expect(r.failed).toBe(0);
    expect(r.unrecoverableRate).toBeNull();
    expect(r.byCategory).toEqual([]);
    expect(r.turnsToGreen.median).toBeNull();
  });

  it("handles undefined input", () => {
    expect(analyzeFailures(undefined).measured).toBe(0);
  });
});
