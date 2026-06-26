import { describe, expect, it } from "vitest";
import { extractInlineStyles } from "./extract-inline-styles.js";

// ---------------------------------------------------------------------------
// extractInlineStyles
// ---------------------------------------------------------------------------
describe("extractInlineStyles", () => {
  it("counts style={{ occurrences and identifies parent component", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: `<div style={{ color: 'red' }}></div>`,
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.total).toBe(1);
    expect(result.byComponent.div).toBe(1);
  });

  it("identifies PascalCase parent components", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: `<Card style={{ padding: '10px' }}>content</Card>`,
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.total).toBe(1);
    expect(result.byComponent.Card).toBe(1);
  });

  it("extracts CSS property names from style objects", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: `<div style={{ fontSize: '16px', backgroundColor: 'blue', margin: 0 }}></div>`,
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.byProperty.fontSize).toBe(1);
    expect(result.byProperty.backgroundColor).toBe(1);
    expect(result.byProperty.margin).toBe(1);
  });

  it("counts multiple inline styles in the same file", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: [
          `<Button style={{ color: 'red' }}>Click</Button>`,
          `<Text style={{ fontWeight: 'bold' }}>Hello</Text>`,
          `<Card style={{ padding: 8 }}>Content</Card>`,
        ].join("\n"),
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.total).toBe(3);
    expect(result.byComponent.Button).toBe(1);
    expect(result.byComponent.Text).toBe(1);
    expect(result.byComponent.Card).toBe(1);
  });

  it("provides perFile breakdown", () => {
    const files = [
      {
        path: "src/A.jsx",
        content: `<div style={{ width: '100%' }}></div>`,
      },
      {
        path: "src/B.tsx",
        content: [`<Box style={{ flex: 1 }} />`, `<Box style={{ flex: 2 }} />`].join("\n"),
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.total).toBe(3);
    expect(result.perFile).toHaveLength(2);

    const fileA = result.perFile.find((f) => f.path === "src/A.jsx");
    expect(fileA.total).toBe(1);

    const fileB = result.perFile.find((f) => f.path === "src/B.tsx");
    expect(fileB.total).toBe(2);
    expect(fileB.byComponent.Box).toBe(2);
  });

  it("skips non-JSX files", () => {
    const files = [
      {
        path: "src/styles.css",
        content: `.foo { style={{ color: 'red' }} }`,
      },
    ];

    const result = extractInlineStyles(files);
    expect(result.total).toBe(0);
  });

  it("returns zeroed result when no inline styles exist", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: "<Button className='primary'>Click</Button>",
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.total).toBe(0);
    expect(result.byComponent).toEqual({});
    expect(result.byProperty).toEqual({});
    expect(result.perFile).toEqual([]);
  });

  it("returns zeroed result for empty file list", () => {
    const result = extractInlineStyles([]);

    expect(result.total).toBe(0);
    expect(result.byComponent).toEqual({});
    expect(result.byProperty).toEqual({});
    expect(result.perFile).toEqual([]);
  });

  it("aggregates property counts across multiple files", () => {
    const files = [
      {
        path: "src/A.jsx",
        content: `<div style={{ color: 'red' }}></div>`,
      },
      {
        path: "src/B.jsx",
        content: `<span style={{ color: 'blue', fontSize: '14px' }}></span>`,
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.byProperty.color).toBe(2);
    expect(result.byProperty.fontSize).toBe(1);
  });

  it("handles style with extra whitespace", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: `<div style = { { color: 'red' } }></div>`,
      },
    ];

    const result = extractInlineStyles(files);

    expect(result.total).toBe(1);
    expect(result.byComponent.div).toBe(1);
  });
});
