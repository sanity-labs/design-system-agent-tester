import { describe, expect, it } from "vitest";
import {
  analyzeJsxPropDensity,
  computeJsxPropDensity,
  isPresentationProp,
  readTagAttributes,
} from "./jsx-prop-density.js";

const DS = ["Card", "Button", "Menu", "MenuItem", "Box", "Stack", "Flex", "Text"];
const PRIMITIVES = ["Box", "Stack", "Flex", "Text"];
const opts = { dsComponents: DS, primitives: PRIMITIVES };

const file = (content) => [{ path: "src/App.tsx", content }];

// `readTagAttributes` takes the index just past the tag name, which is what
// the tag regex hands it. For a one-tag fixture that is always after `<Name`.
const attrs = (tag) => {
  const nameEnd =
    tag.indexOf("<") + 1 + tag.slice(tag.indexOf("<") + 1).match(/^[\w.-]+/)[0].length;
  return readTagAttributes(tag, nameEnd);
};

describe("readTagAttributes", () => {
  it("counts a bare tag as zero props", () => {
    expect(attrs("<Card />").count).toBe(0);
    expect(attrs("<Card>").count).toBe(0);
  });

  it("counts string, numeric-expression and boolean-shorthand props", () => {
    // `border` has no value at all and is still one prop.
    const r = attrs('<Card tone="primary" padding={4} border />');
    expect(r.count).toBe(3);
    expect(r.names).toEqual(["tone", "padding", "border"]);
  });

  it("counts hyphenated and namespaced attribute names", () => {
    expect(attrs('<Button aria-label="Search" data-testid="x" />').count).toBe(2);
  });

  // The whole reason this is a scanner and not a regex.
  it("does not let a nested object value end the tag", () => {
    expect(attrs("<Box style={{ gap: 4, padding: 8 }} flex={1} />").count).toBe(2);
  });

  it("does not let an arrow function's > end the tag", () => {
    expect(attrs('<Button onClick={() => setOpen(true)} text="Go" />').count).toBe(2);
  });

  it("does not let JSX inside a prop value end the tag", () => {
    const r = attrs('<MenuButton id="m" menu={<Menu><MenuItem text="a" /></Menu>} portal />');
    expect(r.count).toBe(3);
    expect(r.names).toEqual(["id", "menu", "portal"]);
  });

  it("does not let a brace inside a string end the tag", () => {
    expect(attrs('<Text title="a } b" size={1} />').count).toBe(2);
  });

  // The `${…}` here is the fixture, not a mistake — it is the source text the
  // scanner has to handle, so it has to stay a plain string.
  // biome-ignore-start lint/suspicious/noTemplateCurlyInString: JSX fixture, not a template literal
  it("handles template literals, including nested ${}", () => {
    expect(attrs("<Box className={`a ${x ? `${y}` : ''} b`} flex={1} />").count).toBe(2);
  });
  // biome-ignore-end lint/suspicious/noTemplateCurlyInString: JSX fixture, not a template literal

  it("counts a spread as one prop and tracks it separately", () => {
    const r = attrs("<Card {...rest} padding={3} />");
    expect(r.count).toBe(2);
    expect(r.spreads).toBe(1);
  });

  it("reports what it read when the tag is never closed", () => {
    const r = attrs('<Card tone="primary" padding={4}');
    expect(r.count).toBe(2);
    expect(r.end).toBe('<Card tone="primary" padding={4}'.length);
  });
});

describe("computeJsxPropDensity", () => {
  it("returns null for a project with no JSX", () => {
    expect(
      computeJsxPropDensity([{ path: "src/x.ts", content: "export const a = 1;" }]),
    ).toBeNull();
    expect(computeJsxPropDensity([])).toBeNull();
  });

  it("averages props over tags", () => {
    // 3 props over 2 tags.
    const r = computeJsxPropDensity(
      file('<Card tone="primary" padding={4}><Box flex={1} /></Card>'),
    );
    expect(r.tags).toBe(2);
    expect(r.props).toBe(3);
    expect(r.average).toBe(1.5);
  });

  // A tag nested inside a prop value belongs to the app and must be counted
  // once, as itself — not skipped, and not folded into its parent.
  it("counts JSX embedded in a prop value as its own tag", () => {
    const r = computeJsxPropDensity(
      file('<MenuButton id="m" menu={<Menu><MenuItem text="a" /></Menu>} />'),
    );
    expect(r.byComponent.MenuButton).toMatchObject({ tags: 1, props: 2 });
    expect(r.byComponent.Menu).toMatchObject({ tags: 1, props: 0 });
    expect(r.byComponent.MenuItem).toMatchObject({ tags: 1, props: 1 });
    expect(r.tags).toBe(3);
  });

  it("skips non-rendering wrappers", () => {
    const r = computeJsxPropDensity(file("<StrictMode><Card padding={4} /></StrictMode>"));
    expect(r.tags).toBe(1);
    expect(r.byComponent.StrictMode).toBeUndefined();
  });

  it("ignores TypeScript generics", () => {
    const r = computeJsxPropDensity(
      file("const [v, s] = useState<Filter>('a');\n<Card padding={4} />"),
    );
    expect(r.tags).toBe(1);
    expect(r.props).toBe(1);
  });

  it("omits the tier breakdown when primitives are not configured", () => {
    expect(computeJsxPropDensity(file("<Card />"), { dsComponents: DS }).byTier).toBeNull();
    expect(computeJsxPropDensity(file("<Card />")).byTier).toBeNull();
  });

  it("splits tiers the same way tiered coverage does", () => {
    const r = computeJsxPropDensity(
      file(
        '<Card tone="primary" padding={4} radius={3}>' +
          "<Box flex={1} />" +
          '<Widget a="1" b="2" />' +
          '<div className="x" />' +
          '<li role="none" />' +
          "</Card>",
      ),
      opts,
    );
    // Card is a composite: 3 props / 1 tag.
    expect(r.byTier.composite).toMatchObject({ tags: 1, props: 3, average: 3 });
    // Box is a design-system primitive.
    expect(r.byTier.primitive).toMatchObject({ tags: 1, props: 1, average: 1 });
    // A local component and a non-allowlisted raw element both land in raw.
    expect(r.byTier.raw).toMatchObject({ tags: 2, props: 3 });
    // `li` is allowlisted — excluded from the coverage denominator, but its
    // props still have to land somewhere for the totals to reconcile.
    expect(r.byTier.allowlistedRaw).toMatchObject({ tags: 1, props: 1 });
    const summed = Object.values(r.byTier).reduce((a, t) => a + t.tags, 0);
    expect(summed).toBe(r.tags);
  });

  it("attributes a compound tag to its root component's tier", () => {
    const r = computeJsxPropDensity(file('<Menu.Item text="a" icon={X} />'), opts);
    expect(r.byTier.composite).toMatchObject({ tags: 1, props: 2 });
  });
});

describe("analyzeJsxPropDensity", () => {
  const iter = (n, density) => ({ iteration: n, jsxPropDensity: density });

  it("reports no data when no iteration has any", () => {
    const r = analyzeJsxPropDensity([iter(1, null), iter(2, { tags: 0 })]);
    expect(r.iterationsWithData).toBe(0);
    expect(r.average).toBeNull();
  });

  // Per-iteration, not pooled: one huge app must not dominate.
  it("averages per iteration rather than pooling every tag", () => {
    const r = analyzeJsxPropDensity([
      iter(1, { tags: 1, props: 4, average: 4, byComponent: {} }),
      iter(2, { tags: 99, props: 99, average: 1, byComponent: {} }),
    ]);
    expect(r.average).toBe(2.5);
    expect(r.iterationsWithData).toBe(2);
  });

  // Pooled, unlike the headline average: a per-component figure needs every
  // instance it can get.
  it("pools byComponent across iterations", () => {
    const r = analyzeJsxPropDensity([
      iter(1, { tags: 1, props: 4, average: 4, byComponent: { Card: { tags: 1, props: 4 } } }),
      iter(2, { tags: 3, props: 2, average: 0.67, byComponent: { Card: { tags: 3, props: 2 } } }),
    ]);
    expect(r.byComponent.Card).toMatchObject({ tags: 4, props: 6, average: 1.5 });
  });

  it("omits tiers when no iteration has them", () => {
    const r = analyzeJsxPropDensity([iter(1, { tags: 1, props: 1, average: 1, byComponent: {} })]);
    expect(r.byTier).toBeNull();
  });
});

// Design-system tags only: the presentation share of the props, and props set
// to the component's own default (2026-10-07).
describe("designSystem: presentation and default-valued props", () => {
  const file = (content) => [{ path: "src/App.tsx", content }];
  const DEFAULTS = {
    Card: { density: "regular", tone: "neutral" },
    Button: { level: "primary" },
    "List.Item": { density: "regular" },
  };
  const ds = ["Card", "Button", "List", "Text"];

  it("reads literal attribute values, and leaves expressions undefined", () => {
    const src = `<Card density="regular" tone={'neutral'} size={2} gap={-1} border open={x} flag={false}>`;
    const { names, values } = readTagAttributes(src, 5);
    expect(Object.fromEntries(names.map((n, i) => [n, values[i]]))).toEqual({
      density: "regular",
      tone: "neutral",
      size: 2,
      gap: -1,
      border: true,
      open: undefined,
      flag: false,
    });
  });

  it("splits presentation from wiring", () => {
    for (const p of ["padding", "gap", "tone", "size", "density", "level", "flexGrow", "muted"])
      expect(isPresentationProp(p)).toBe(true);
    for (const p of [
      "key",
      "value",
      "onChange",
      "aria-label",
      "data-testid",
      "text",
      "htmlFor",
      "style",
      "...",
    ])
      expect(isPresentationProp(p)).toBe(false);
  });

  it("counts presentation props per design-system tag, ignoring raw and local tags", () => {
    const r = computeJsxPropDensity(
      file(
        `<Card density="loose" tone="critical" key={k}><Text size={1} weight="bold">x</Text><div className="a" /><Local padding={3} /></Card>`,
      ),
      { dsComponents: ds, propDefaults: DEFAULTS },
    );
    expect(r.designSystem.tags).toBe(2);
    expect(r.designSystem.presentation).toBe(4); // density, tone, size, weight — not key
    expect(r.designSystem.presentationAverage).toBe(2);
  });

  it("counts props set to the component's default, including compound members", () => {
    const r = computeJsxPropDensity(
      file(
        `<Card density="regular"><Button level="primary" text="Save" /><Button level="tertiary" /><List><List.Item density="regular">a</List.Item></List></Card>`,
      ),
      { dsComponents: ds, propDefaults: DEFAULTS },
    );
    expect(r.designSystem.defaultValued).toBe(3);
    expect(r.designSystem.defaultValuedByProp).toEqual({
      'Card density="regular"': 1,
      'Button level="primary"': 1,
      'List.Item density="regular"': 1,
    });
  });

  it("does not count a default that follows a spread — it overrides the spread", () => {
    const r = computeJsxPropDensity(file(`<Button {...rest} level="primary" />`), {
      dsComponents: ds,
      propDefaults: DEFAULTS,
    });
    expect(r.designSystem.defaultValued).toBe(0);
  });

  it("reports default-valued props as unknown, not zero, without a defaults table", () => {
    const r = computeJsxPropDensity(file(`<Card density="regular" />`), { dsComponents: ds });
    expect(r.designSystem.defaultValued).toBeNull();
    expect(r.designSystem.presentationAverage).toBe(1);
  });

  it("averages per iteration and pools the default-valued props", () => {
    const it1 = computeJsxPropDensity(file(`<Card density="regular" />`), {
      dsComponents: ds,
      propDefaults: DEFAULTS,
    });
    const it2 = computeJsxPropDensity(file(`<Card density="regular" /><Card density="loose" />`), {
      dsComponents: ds,
      propDefaults: DEFAULTS,
    });
    const a = analyzeJsxPropDensity([
      { iteration: 1, jsxPropDensity: it1 },
      { iteration: 2, jsxPropDensity: it2 },
    ]);
    expect(a.defaultValuedPerIteration).toBe(1);
    expect(a.defaultValuedByProp).toEqual({ 'Card density="regular"': 2 });
    expect(a.presentationAverage).toBe(1);
    expect(a.defaultValuedShare).toBeCloseTo((1 / 1 + 1 / 2) / 2);
  });
});
