import { describe, expect, it } from "vitest";
import {
  analyzeTieredCoverage,
  computeTieredCoverage,
  DEFAULT_RAW_ALLOWLIST,
} from "./tiered-coverage.js";

const DS = ["Dialog", "Menu", "Button", "Badge", "Box", "Stack", "Flex", "Text"];
const PRIMITIVES = ["Box", "Stack", "Flex", "Text"];
const opts = { dsComponents: DS, primitives: PRIMITIVES };

const file = (content) => [{ path: "src/App.tsx", content }];

describe("computeTieredCoverage", () => {
  it("returns null when no design system components are known", () => {
    expect(computeTieredCoverage(file("<Box />"), { dsComponents: [], primitives: [] })).toBeNull();
    expect(computeTieredCoverage(file("<Box />"), {})).toBeNull();
  });

  // Without a primitives list every design system component would count as a
  // composite, which flatters any design system. Better to report nothing.
  it("returns null when primitives is not configured", () => {
    expect(computeTieredCoverage(file("<Box /><Button />"), { dsComponents: DS })).toBeNull();
  });

  // An empty list is a real answer: some design systems have no layout
  // primitives at all.
  it("accepts an explicitly empty primitives list", () => {
    const r = computeTieredCoverage(file("<Box /><Button />"), {
      dsComponents: DS,
      primitives: [],
    });
    expect(r.tiers).toEqual({ composite: 2, primitive: 0, raw: 0 });
  });

  it("splits design system usage into composites and primitives", () => {
    const r = computeTieredCoverage(file("<Dialog><Box><Button /></Box></Dialog>"), opts);
    expect(r.tiers).toEqual({ composite: 2, primitive: 1, raw: 0 });
    expect(r.total).toBe(3);
    expect(r.shares.composite).toBeCloseTo(2 / 3);
  });

  it("counts unknown lowercase elements as raw", () => {
    const r = computeTieredCoverage(file("<div><Button /></div>"), opts);
    expect(r.tiers).toEqual({ composite: 1, primitive: 0, raw: 1 });
  });

  // Otherwise the metric rewards wrapping a <td> in a <Box>, which is worse
  // than the element it replaced.
  it("leaves allowlisted raw elements out of the denominator", () => {
    const r = computeTieredCoverage(file("<ul><li>one</li><li>two</li></ul><Button />"), opts);
    expect(r.allowlistedRaw).toBe(2);
    expect(r.tiers).toEqual({ composite: 1, primitive: 0, raw: 1 });
  });

  // `table` counts, `tr`/`td` do not. Choosing a raw table is one decision;
  // the rows and cells under it are forced by that choice. Counting them too
  // would let a single table decide the score for the whole file.
  it("counts a raw container once, not once per element it forces", () => {
    const rows = Array.from({ length: 20 }, () => "<tr><td>x</td></tr>").join("");
    const r = computeTieredCoverage(file(`<table>${rows}</table><Button />`), opts);
    expect(r.tiers.raw).toBe(1);
    expect(r.allowlistedRaw).toBe(40);
    expect(r.shares.composite).toBeCloseTo(0.5);
  });

  it("accepts a custom allowlist", () => {
    const r = computeTieredCoverage(file("<div><Button /></div>"), {
      ...opts,
      rawAllowlist: ["div"],
    });
    expect(r.tiers.raw).toBe(0);
    expect(r.allowlistedRaw).toBe(1);
  });

  it("counts locally defined components as raw and tracks them separately", () => {
    const r = computeTieredCoverage(file("<Toolbar /><DataTable /><Button />"), opts);
    expect(r.tiers.raw).toBe(2);
    expect(r.localComponents).toBe(2);
  });

  // `Dialog.Footer` is part of Dialog, so it belongs to Dialog's tier.
  it("puts a compound component in its root component's tier", () => {
    const r = computeTieredCoverage(file("<Dialog><Dialog.Footer /></Dialog>"), opts);
    expect(r.tiers.composite).toBe(2);
    expect(r.byComponent.composite["Dialog.Footer"]).toBe(1);
  });

  it("ignores wrappers that render nothing", () => {
    const r = computeTieredCoverage(
      file("<React.StrictMode><Fragment><Button /></Fragment></React.StrictMode>"),
      opts,
    );
    expect(r.total).toBe(1);
  });

  // The rebuild signature the metric exists to expose: no composite in sight,
  // everything assembled out of primitives.
  it("shows a primitive-heavy rebuild as a high primitive share", () => {
    const r = computeTieredCoverage(
      file("<Box><Stack><Flex><Text>Confirm</Text></Flex><Button /></Stack></Box>"),
      opts,
    );
    expect(r.shares.primitive).toBeCloseTo(4 / 5);
    expect(r.shares.composite).toBeCloseTo(1 / 5);
  });

  it("skips files that are not JSX", () => {
    const files = [
      { path: "src/data.json", content: "<Dialog />" },
      { path: "src/App.tsx", content: "<Button />" },
    ];
    expect(computeTieredCoverage(files, opts).total).toBe(1);
  });

  // TypeScript generics look like JSX tags to a regex. They must not count.
  it("does not count type parameters as elements", () => {
    const r = computeTieredCoverage(
      file("const [x, setX] = useState<FilterState>(); const p: Promise<Response> = f();"),
      opts,
    );
    expect(r.total).toBe(0);
  });

  it("aggregates across multiple files", () => {
    const files = [
      { path: "src/App.tsx", content: "<Dialog />" },
      { path: "src/Toolbar.tsx", content: "<Box /><Button />" },
    ];
    const r = computeTieredCoverage(files, opts);
    expect(r.tiers).toEqual({ composite: 2, primitive: 1, raw: 0 });
  });

  it("handles empty and missing input", () => {
    expect(computeTieredCoverage([], opts).total).toBe(0);
    expect(computeTieredCoverage(undefined, opts).total).toBe(0);
  });

  it("ships an allowlist that covers table and list internals", () => {
    for (const tag of ["td", "tr", "li", "form", "svg", "path"]) {
      expect(DEFAULT_RAW_ALLOWLIST).toContain(tag);
    }
    // A plain container is NOT allowlisted — using one where a primitive
    // exists is the thing worth counting.
    expect(DEFAULT_RAW_ALLOWLIST).not.toContain("div");
    expect(DEFAULT_RAW_ALLOWLIST).not.toContain("span");
    expect(DEFAULT_RAW_ALLOWLIST).not.toContain("button");
  });
});

describe("analyzeTieredCoverage", () => {
  const iteration = (composite, primitive, raw) => {
    const total = composite + primitive + raw;
    return {
      iteration: 1,
      tieredCoverage: {
        total,
        tiers: { composite, primitive, raw },
        shares: { composite: composite / total, primitive: primitive / total, raw: raw / total },
      },
    };
  };

  it("reports nothing when no iteration carries coverage data", () => {
    const r = analyzeTieredCoverage([{ iteration: 1 }, { iteration: 2, tieredCoverage: null }]);
    expect(r.iterationsWithData).toBe(0);
    expect(r.shares).toBeNull();
  });

  it("averages the shares across iterations", () => {
    const r = analyzeTieredCoverage([iteration(8, 2, 0), iteration(2, 8, 0)]);
    expect(r.iterationsWithData).toBe(2);
    expect(r.shares.composite).toBeCloseTo(0.5);
    expect(r.shares.primitive).toBeCloseTo(0.5);
  });

  // Averaging per iteration rather than pooling elements keeps one oversized
  // app from deciding the result for the whole run.
  it("weights every iteration equally regardless of size", () => {
    const r = analyzeTieredCoverage([iteration(100, 0, 0), iteration(0, 1, 0)]);
    expect(r.shares.composite).toBeCloseTo(0.5);
  });

  it("handles empty and missing input", () => {
    expect(analyzeTieredCoverage([]).iterationsWithData).toBe(0);
    expect(analyzeTieredCoverage(undefined).iterationsWithData).toBe(0);
  });
});
