import { describe, expect, it } from "vitest";
import { jaccardSimilarity } from "../reporting/stats.js";
import { normalizationAvailable, normalizeIteration } from "./normalize-structure.js";

const DS = ["Dialog", "Button", "Box", "Text", "Card", "Stack"];
const file = (content) => [{ path: "src/App.tsx", content }];
const norm = (content) => normalizeIteration(file(content), { dsComponents: DS });
const simOf = (a, b, key = "elements") => jaccardSimilarity(norm(a)[key], norm(b)[key]);

describe("normalizeIteration", () => {
  it("is available in this environment", () => {
    expect(normalizationAvailable()).toBe(true);
  });

  it("reduces each element to its name and sorted prop names", () => {
    const { elements } = norm(`const A = () => <Button tone="critical" onClick={go}>x</Button>;`);
    expect([...elements]).toEqual(["ds:Button{onClick,tone}"]);
  });

  it("labels elements as ds, local or html", () => {
    const { elements } = norm(`const A = () => <div><Button /><MyThing /></div>;`);
    expect([...elements].sort()).toEqual(["ds:Button{}", "html:div{}", "local:*{}"]);
  });

  it("records parent-to-child pairs, tagged by kind", () => {
    const { composition } = norm(`const A = () => <Dialog><Button /></Dialog>;`);
    expect([...composition]).toEqual(["ds:Dialog>ds:Button"]);
  });

  it("judges a compound name by its root", () => {
    const { elements } = norm(`const A = () => <Dialog.Footer />;`);
    expect([...elements]).toEqual(["ds:Dialog.Footer{}"]);
  });

  it("ignores wrappers that render nothing", () => {
    const { elements } = norm(
      `const A = () => <><React.StrictMode><Button /></React.StrictMode></>;`,
    );
    expect([...elements]).toEqual(["ds:Button{}"]);
  });

  it("records a spread so it is not confused with listing props", () => {
    const { elements } = norm(`const A = () => <Button {...rest} tone="x" />;`);
    expect([...elements]).toEqual(["ds:Button{...,tone}"]);
  });

  it("skips non-JSX files", () => {
    const files = [
      { path: "src/data.json", content: "<Dialog />" },
      { path: "src/App.tsx", content: "const A = () => <Button />;" },
    ];
    expect([...normalizeIteration(files, { dsComponents: DS }).elements]).toEqual(["ds:Button{}"]);
  });

  it("survives a file it cannot parse without losing the others", () => {
    const files = [
      { path: "src/Broken.tsx", content: "const = = = <<<>>> ((((" },
      { path: "src/App.tsx", content: "const A = () => <Button />;" },
    ];
    const { elements } = normalizeIteration(files, { dsComponents: DS });
    expect([...elements]).toContain("ds:Button{}");
  });

  it("handles empty and missing input", () => {
    expect(normalizeIteration([], {}).elements.size).toBe(0);
    expect(normalizeIteration(undefined, {}).elements.size).toBe(0);
  });
});

// The whole point of the repair. Each of these pairs is the SAME app written
// differently, and each used to move the text-based n-gram number.
describe("cosmetic differences score identical", () => {
  const base = `
    const App = () => (
      <Dialog open header="Confirm">
        <Text size={1}>Delete this?</Text>
        <Button tone="critical" onClick={handleDelete}>Delete</Button>
      </Dialog>
    );`;

  it("renamed variables and handlers", () => {
    const renamed = `
      const Screen = () => (
        <Dialog open header="Confirm">
          <Text size={1}>Delete this?</Text>
          <Button tone="critical" onClick={onRemove}>Delete</Button>
        </Dialog>
      );`;
    expect(simOf(base, renamed)).toBe(1);
  });

  it("reordered JSX attributes", () => {
    const reordered = `
      const App = () => (
        <Dialog header="Confirm" open>
          <Text size={1}>Delete this?</Text>
          <Button onClick={handleDelete} tone="critical">Delete</Button>
        </Dialog>
      );`;
    expect(simOf(base, reordered)).toBe(1);
  });

  it("different formatting and indentation", () => {
    const reflowed = `const App=()=>(<Dialog open header="Confirm"><Text size={1}>Delete this?</Text><Button tone="critical" onClick={handleDelete}>Delete</Button></Dialog>);`;
    expect(simOf(base, reflowed)).toBe(1);
  });

  it("added comments", () => {
    const commented = `
      // Confirmation screen
      const App = () => (
        /* the dialog */
        <Dialog open header="Confirm">
          <Text size={1}>Delete this?</Text>
          {/* the destructive action */}
          <Button tone="critical" onClick={handleDelete}>Delete</Button>
        </Dialog>
      );`;
    expect(simOf(base, commented)).toBe(1);
  });

  it("changed prop values and copy", () => {
    const revalued = `
      const App = () => (
        <Dialog open header="Are you sure?">
          <Text size={2}>This cannot be undone.</Text>
          <Button tone="critical" onClick={doIt}>Remove</Button>
        </Dialog>
      );`;
    expect(simOf(base, revalued)).toBe(1);
  });
});

describe("real differences score apart", () => {
  const withDialog = `const A = () => <Dialog open><Button tone="critical">Delete</Button></Dialog>;`;

  it("a rebuild out of primitives instead of the real component", () => {
    const rebuilt = `const A = () => <Box><Stack><Text>Delete</Text><Button tone="critical">Delete</Button></Stack></Box>;`;
    const sim = simOf(withDialog, rebuilt);
    expect(sim).toBeLessThan(0.4);
  });

  it("raw HTML in place of design system components", () => {
    const raw = `const A = () => <div><button className="danger">Delete</button></div>;`;
    expect(simOf(withDialog, raw)).toBe(0);
  });

  it("a different prop set on the same component", () => {
    const extraProps = `const A = () => <Dialog open><Button tone="critical" disabled loading>Delete</Button></Dialog>;`;
    expect(simOf(withDialog, extraProps)).toBeLessThan(1);
  });

  // Same components, assembled differently. The element sets match, so this is
  // exactly the case `composition` exists to catch.
  it("the same components nested differently", () => {
    const a = `const A = () => <Card><Dialog><Button /></Dialog></Card>;`;
    const b = `const A = () => <Dialog><Card><Button /></Card></Dialog>;`;
    expect(simOf(a, b, "elements")).toBe(1);
    expect(simOf(a, b, "composition")).toBeLessThan(1);
  });
});

// What an agent calls its own wrapper, and how it splits the app into
// components, are choices about style and factoring — not differences in what
// was built. Measured on a real run: local names alone drove element
// similarity down from 0.55 to 0.26, with pairs like Stepper/StepperRail and
// ConfirmModal/ConfirmationDialog counting as structural differences.
describe("local component names do not affect the comparison", () => {
  it("records local components without their names", () => {
    const { elements } = norm(`const A = () => <StepperRail items={x} />;`);
    expect([...elements]).toEqual(["local:*{}"]);
  });

  it("scores two identical trees the same despite different local names", () => {
    const a = `const A = () => <Stepper><Button /></Stepper>;`;
    const b = `const A = () => <StepperRail><Button /></StepperRail>;`;
    expect(simOf(a, b, "elements")).toBe(1);
    expect(simOf(a, b, "composition")).toBe(1);
  });

  it("ignores how the app is split into local components", () => {
    const split = `const A = () => <ConfirmModal><Button tone="critical" /></ConfirmModal>;`;
    const renamed = `const A = () => <ConfirmationDialog><Button tone="critical" /></ConfirmationDialog>;`;
    expect(simOf(split, renamed)).toBe(1);
  });

  // The gap this absorbs: an icon imported from a package subpath is not in
  // dsComponents, so it arrives here as a local component.
  it("stops differently-named icons reading as structural differences", () => {
    const a = `const A = () => <Button><EditIcon /></Button>;`;
    const b = `const A = () => <Button><CheckmarkIcon /></Button>;`;
    expect(simOf(a, b)).toBe(1);
  });

  // Design system and raw elements must still be distinguished by name — only
  // local ones collapse.
  it("still tells design system components apart", () => {
    const a = `const A = () => <Dialog />;`;
    const b = `const A = () => <Card />;`;
    expect(simOf(a, b)).toBe(0);
  });

  it("still tells raw HTML apart", () => {
    expect(simOf(`const A = () => <ul />;`, `const A = () => <table />;`)).toBe(0);
  });

  it("can be turned off to inspect raw output", () => {
    const { elements } = normalizeIteration(file(`const A = () => <Stepper a={1} />;`), {
      dsComponents: DS,
      collapseLocalNames: false,
    });
    expect([...elements]).toEqual(["local:Stepper{a}"]);
  });
});
