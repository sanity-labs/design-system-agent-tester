import { describe, expect, it } from "vitest";
import {
  buildReport,
  effectiveInput,
  extractSpec,
  issueClass,
  parseValidationResult,
  specMetrics,
} from "./analyze.js";

describe("issueClass", () => {
  it("collapses per-element issues to a component.prop — kind class", () => {
    expect(
      issueClass('Element "title" (Heading) /elements/title/props/size: must be number.'),
    ).toBe("Heading.size — must be number (string given?)");
    expect(issueClass('Element "c" (Card): tone = invalid value. Allowed: "neutral".')).toBe(
      "Card.tone — invalid enum value",
    );
    expect(issueClass('Element "c" (Card): prop "padding" is not allowed.')).toBe(
      "Card.padding — prop not allowed",
    );
    expect(issueClass('Element "x": component type "Dialog" is not in the catalog.')).toBe(
      "unknown component type",
    );
  });
});

describe("extractSpec", () => {
  it("parses a fenced json block", () => {
    const text = 'Here you go:\n```json\n{"root":"a","elements":{"a":{"type":"Card"}}}\n```\nDone.';
    const { spec } = extractSpec(text);
    expect(spec.root).toBe("a");
    expect(spec.elements.a.type).toBe("Card");
  });
  it("falls back to the first balanced object", () => {
    const { spec } = extractSpec('noise {"root":"x","elements":{}} trailing');
    expect(spec.root).toBe("x");
  });
  it("returns null spec on unparseable input", () => {
    expect(extractSpec("no json here").spec).toBeNull();
    expect(extractSpec("```json\n{bad json}\n```").spec).toBeNull();
  });
});

describe("parseValidationResult", () => {
  it("reads a valid result", () => {
    const r = parseValidationResult(
      "## UI spec is valid\n\n- Valid. 3 element(s), all within the catalog.",
    );
    expect(r.valid).toBe(true);
    expect(r.issueCount).toBe(0);
    expect(r.issues).toEqual([]);
  });
  it("reads an invalid result with issue count and bullets", () => {
    const text =
      '## UI spec failed validation — 2 issue(s)\n\n- Element "c" (Card): prop "padding" is not allowed.\n- Element "x": component type "Dialog" is not in the catalog.';
    const r = parseValidationResult(text);
    expect(r.valid).toBe(false);
    expect(r.issueCount).toBe(2);
    expect(r.issues).toHaveLength(2);
  });
});

describe("specMetrics", () => {
  it("counts elements and unique component types", () => {
    const spec = {
      root: "a",
      elements: { a: { type: "Card" }, b: { type: "Text" }, c: { type: "Card" } },
    };
    const m = specMetrics(spec);
    expect(m.elementCount).toBe(3);
    expect(m.componentsUsed.sort()).toEqual(["Card", "Text"]);
    expect(m.rootPresent).toBe(true);
  });
});

describe("effectiveInput", () => {
  it("weights cache buckets like the harness", () => {
    expect(effectiveInput({ uncached: 100, cacheRead: 1000, cacheCreation: 100 })).toBe(
      100 + 100 + 125,
    );
  });
});

describe("buildReport", () => {
  const records = [
    {
      brief: "a",
      iteration: 1,
      ok: true,
      validFirstTry: true,
      valid: true,
      fixAttempts: 0,
      issueCount: 0,
      issues: [],
      elementCount: 4,
      componentsUsed: ["Card", "Text"],
      tokens: { effIn: 500, out: 200 },
    },
    {
      brief: "a",
      iteration: 2,
      ok: true,
      validFirstTry: false,
      valid: true,
      fixAttempts: 1,
      issueCount: 0,
      issues: ['Element "c" (Card): prop "padding" is not allowed'],
      elementCount: 5,
      componentsUsed: ["Card"],
      tokens: { effIn: 700, out: 300 },
    },
    {
      brief: "b",
      iteration: 1,
      ok: false,
      error: "no parseable spec",
      tokens: { effIn: 100, out: 50 },
    },
  ];

  it("produces markdown and a json summary", () => {
    const { markdown, json } = buildReport(records, { model: "m", iterations: 2 });
    expect(markdown).toContain("# Generative-UI catalog test");
    expect(markdown).toContain("Component usage");
    expect(json.overall.produced).toBe(2);
    expect(json.overall.validFirstTry).toBe(1);
    expect(json.overall.validEventually).toBe(2);
    expect(json.componentFrequency.Card).toBe(2);
    expect(json.issueFrequency["Card.padding — prop not allowed"]).toBe(1);
  });

  it("lists iterations that produced no spec", () => {
    const { markdown } = buildReport(records, {});
    expect(markdown).toContain("produced no spec");
    expect(markdown).toContain("no parseable spec");
  });
});
