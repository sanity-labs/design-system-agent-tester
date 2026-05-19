import { describe, it, expect } from "vitest";
import { render } from "./template.js";

describe("template engine", () => {
  describe("variable substitution", () => {
    it("substitutes top-level values", () => {
      expect(render("hi {{name}}", { name: "world" })).toBe("hi world");
    });

    it("supports dot paths", () => {
      const ctx = { packages: { ui: { name: "@org/ui" } } };
      expect(render("from {{packages.ui.name}}", ctx)).toBe("from @org/ui");
    });

    it("stringifies non-string values", () => {
      expect(render("count: {{n}}", { n: 42 })).toBe("count: 42");
      expect(render("flag: {{b}}", { b: true })).toBe("flag: true");
    });

    it("ignores whitespace inside braces", () => {
      expect(render("hi {{  name  }}", { name: "world" })).toBe("hi world");
    });

    it("leaves literal text untouched", () => {
      expect(render("no vars here", {})).toBe("no vars here");
    });

    it("throws on missing top-level keys", () => {
      expect(() => render("{{missing}}", {})).toThrow(
        /Template references unknown value/,
      );
    });

    it("throws on missing nested paths", () => {
      expect(() => render("{{a.b.c}}", { a: {} })).toThrow(
        /Template references unknown value/,
      );
    });

    it("throws on null values (don't silently render 'null')", () => {
      expect(() => render("{{x}}", { x: null })).toThrow();
    });
  });

  describe("{{#if}}", () => {
    it("renders the body when value is truthy", () => {
      expect(render("a {{#if x}}YES{{/if}} b", { x: true })).toBe("a YES b");
    });

    it("strips the body when value is falsy", () => {
      expect(render("a {{#if x}}YES{{/if}} b", { x: false })).toBe("a  b");
    });

    it("treats missing values as falsy without erroring", () => {
      expect(render("a {{#if missing}}YES{{/if}} b", {})).toBe("a  b");
    });

    it("does not error on {{var}} inside a falsy branch", () => {
      expect(
        render("a {{#if on}}{{missing}}{{/if}} b", { on: false }),
      ).toBe("a  b");
    });

    it("renders {{var}} inside a truthy branch", () => {
      expect(
        render("{{#if on}}hi {{name}}{{/if}}", { on: true, name: "you" }),
      ).toBe("hi you");
    });

    it("supports dot paths in the condition", () => {
      expect(
        render("{{#if cfg.flag}}on{{/if}}", { cfg: { flag: 1 } }),
      ).toBe("on");
    });
  });

  describe("{{#unless}}", () => {
    it("renders the body when value is falsy", () => {
      expect(render("{{#unless x}}NO{{/unless}}", { x: false })).toBe("NO");
    });

    it("strips the body when value is truthy", () => {
      expect(render("{{#unless x}}NO{{/unless}}", { x: true })).toBe("");
    });

    it("treats missing values as falsy", () => {
      expect(render("{{#unless missing}}NO{{/unless}}", {})).toBe("NO");
    });
  });

  describe("interactions", () => {
    it("processes if/unless before variable substitution", () => {
      // If variable substitution happened first, {{flag}} would be replaced
      // with "false" inside the {{#if}} which would then never match.
      // Processing conditionals first means the body is correctly stripped.
      expect(
        render("{{#if flag}}{{name}}{{/if}}", { flag: false, name: "x" }),
      ).toBe("");
    });

    it("handles multiple if blocks", () => {
      const tpl = "{{#if a}}A{{/if}}{{#if b}}B{{/if}}";
      expect(render(tpl, { a: true, b: false })).toBe("A");
      expect(render(tpl, { a: false, b: true })).toBe("B");
    });
  });
});
