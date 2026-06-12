import { describe, it, expect } from "vitest";
import { extractComponentUsageCounts } from "./count-component-usage.js";

// ---------------------------------------------------------------------------
// extractComponentUsageCounts
// ---------------------------------------------------------------------------
describe("extractComponentUsageCounts", () => {
  it("counts PascalCase JSX tag usage", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: [
          "<Button>Click</Button>",
          "<Card>",
          "  <Text>Hello</Text>",
          "</Card>",
        ].join("\n"),
      },
    ];

    const result = extractComponentUsageCounts(files);

    expect(result.total).toBe(3);
    expect(result.byComponent.Button).toBe(1);
    expect(result.byComponent.Card).toBe(1);
    expect(result.byComponent.Text).toBe(1);
  });

  it("counts multiple usages of the same component", () => {
    const files = [
      {
        path: "src/List.tsx",
        content: [
          "<Stack>",
          "  <Button>One</Button>",
          "  <Button>Two</Button>",
          "  <Button>Three</Button>",
          "</Stack>",
        ].join("\n"),
      },
    ];

    const result = extractComponentUsageCounts(files);

    expect(result.total).toBe(4);
    expect(result.byComponent.Button).toBe(3);
    expect(result.byComponent.Stack).toBe(1);
  });

  it("provides perFile breakdown", () => {
    const files = [
      {
        path: "src/A.jsx",
        content: "<Button /><Card />",
      },
      {
        path: "src/B.tsx",
        content: "<Dialog /><Dialog /><Text />",
      },
    ];

    const result = extractComponentUsageCounts(files);

    expect(result.total).toBe(5);
    expect(result.perFile).toHaveLength(2);

    const fileA = result.perFile.find((f) => f.path === "src/A.jsx");
    expect(fileA.total).toBe(2);
    expect(fileA.byComponent.Button).toBe(1);
    expect(fileA.byComponent.Card).toBe(1);

    const fileB = result.perFile.find((f) => f.path === "src/B.tsx");
    expect(fileB.total).toBe(3);
    expect(fileB.byComponent.Dialog).toBe(2);
    expect(fileB.byComponent.Text).toBe(1);
  });

  it("skips non-JSX files (css, json, html)", () => {
    const files = [
      {
        path: "src/styles.css",
        content: ".Button { color: red; }",
      },
      {
        path: "src/data.json",
        content: '{"Button": true}',
      },
      {
        path: "src/index.html",
        content: "<Button />",
      },
    ];

    const result = extractComponentUsageCounts(files);

    expect(result.total).toBe(0);
    expect(result.perFile).toHaveLength(0);
  });

  it("does not count lowercase HTML tags", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: "<div><span>text</span><p>paragraph</p></div>",
      },
    ];

    const result = extractComponentUsageCounts(files);
    expect(result.total).toBe(0);
  });

  it("handles dotted component names like Component.Sub", () => {
    const files = [
      {
        path: "src/App.jsx",
        content: "<Menu.Item>option</Menu.Item>",
      },
    ];

    const result = extractComponentUsageCounts(files);

    expect(result.total).toBe(1);
    expect(result.byComponent["Menu.Item"]).toBe(1);
  });

  it("returns zeroed result for empty file list", () => {
    const result = extractComponentUsageCounts([]);

    expect(result.total).toBe(0);
    expect(result.byComponent).toEqual({});
    expect(result.perFile).toEqual([]);
  });

  it("excludes files with no component tags from perFile", () => {
    const files = [
      {
        path: "src/empty.jsx",
        content: "const x = 1;",
      },
    ];

    const result = extractComponentUsageCounts(files);
    expect(result.perFile).toHaveLength(0);
  });

  it("aggregates counts across multiple files in byComponent", () => {
    const files = [
      { path: "src/A.jsx", content: "<Button />" },
      { path: "src/B.jsx", content: "<Button /><Button />" },
    ];

    const result = extractComponentUsageCounts(files);

    expect(result.total).toBe(3);
    expect(result.byComponent.Button).toBe(3);
  });

  it("does not count TypeScript generic type arguments", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: [
          "const [filter, setFilter] = useState<FilterState>('all');",
          "const ref = useRef<HTMLDivElement>(null);",
          "const items: Array<Item> = [];",
          "const lookup: Record<string, Member> = {};",
          "async function load(): Promise<Response> {}",
          "interface Props extends BaseProps<Config> {}",
          "return <Card><Button>Go</Button></Card>;",
        ].join("\n"),
      },
    ];

    const result = extractComponentUsageCounts(files);

    expect(result.byComponent).toEqual({ Card: 1, Button: 1 });
    expect(result.total).toBe(2);
  });

  it("does not count generic parameter lists in arrow functions", () => {
    const files = [
      {
        path: "src/util.tsx",
        content: "const identity = <T,>(value: T): T => value;",
      },
    ];

    const result = extractComponentUsageCounts(files);
    expect(result.total).toBe(0);
  });

  it("still counts JSX tags in expressions and multi-line tags", () => {
    const files = [
      {
        path: "src/App.tsx",
        content: [
          "{open && <Modal onClose={close} />}",
          "const el = condition ? <Spinner/> : null;",
          "return (",
          "  <Flex",
          "    direction='column'>",
          "  </Flex>",
          ");",
        ].join("\n"),
      },
    ];

    const result = extractComponentUsageCounts(files);

    expect(result.byComponent).toEqual({ Modal: 1, Spinner: 1, Flex: 1 });
    expect(result.total).toBe(3);
  });
});
