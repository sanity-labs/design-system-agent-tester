import { describe, expect, it } from "vitest";
import { parseFeedback } from "./parse-feedback.js";

// ---------------------------------------------------------------------------
// parseFeedback
// ---------------------------------------------------------------------------
describe("parseFeedback", () => {
  it("parses a structured ---FEEDBACK--- block", () => {
    const text = [
      "---FEEDBACK---",
      "- [components] Button API is confusing",
      "- [theming] Theme tokens are hard to discover",
      "---END FEEDBACK---",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      category: "components",
      text: "Button API is confusing",
    });
    expect(result[1]).toEqual({
      category: "theming",
      text: "Theme tokens are hard to discover",
    });
  });

  it("extracts category and text from each line", () => {
    const text = [
      "---FEEDBACK---",
      "- [documentation] Missing examples for Card component",
      "- [api] Unclear prop types on Dialog",
      "- [icons] Icon names inconsistent with docs",
      "---END FEEDBACK---",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(3);
    expect(result[0].category).toBe("documentation");
    expect(result[1].category).toBe("api");
    expect(result[2].category).toBe("icons");
    expect(result[0].text).toBe("Missing examples for Card component");
  });

  it("maps unknown categories to 'other'", () => {
    const text = [
      "---FEEDBACK---",
      "- [performance] Slow rendering",
      "- [other] General comment",
      "---END FEEDBACK---",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result[0].category).toBe("other"); // "performance" is not in VALID_CATEGORIES
    expect(result[1].category).toBe("other");
  });

  it("returns empty array when no feedback block exists", () => {
    const text = "Just some regular text, no feedback here.";
    expect(parseFeedback(text)).toEqual([]);
  });

  it("handles multiple ---FEEDBACK--- blocks", () => {
    const text = [
      "---FEEDBACK---",
      "- [api] First feedback",
      "---END FEEDBACK---",
      "",
      "Some text in between.",
      "",
      "---FEEDBACK---",
      "- [dx] Second feedback",
      "---END FEEDBACK---",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("First feedback");
    expect(result[1].text).toBe("Second feedback");
  });

  it("ignores lines that don't match the expected bullet format", () => {
    const text = [
      "---FEEDBACK---",
      "- [components] Valid feedback",
      "This is just a random line",
      "  Another random line",
      "- [api] Another valid one",
      "---END FEEDBACK---",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("Valid feedback");
    expect(result[1].text).toBe("Another valid one");
  });

  it("handles the dx category", () => {
    const text = [
      "---FEEDBACK---",
      "- [dx] Developer experience could be improved",
      "---END FEEDBACK---",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("dx");
  });

  // Fallback: markdown-style feedback sections
  it("falls back to markdown Feedback heading when no structured block", () => {
    const text = [
      "## Feedback",
      "- The component API was straightforward",
      "- **Documentation** Missing examples for theming",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result.length).toBeGreaterThan(0);
  });

  it("fallback infers category from bold prefix and content keywords", () => {
    const text = [
      "## Feedback",
      "- **Documentation**: Needs more examples",
      "- **API**: The component props are unclear",
      "- **Theming**: Styling tokens are hard to find",
      "- **Icons**: Icon naming is inconsistent",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(4);

    const docFeedback = result.find((f) => f.category === "documentation");
    expect(docFeedback).toBeDefined();

    const apiFeedback = result.find((f) => f.category === "api");
    expect(apiFeedback).toBeDefined();

    const themeFeedback = result.find((f) => f.category === "theming");
    expect(themeFeedback).toBeDefined();

    const iconFeedback = result.find((f) => f.category === "icons");
    expect(iconFeedback).toBeDefined();
  });

  it("fallback recognizes 'Areas of Friction' heading", () => {
    const text = [
      "### Areas of Friction",
      "- Some friction with the documentation",
      "- The API design was confusing",
    ].join("\n");

    const result = parseFeedback(text);
    expect(result.length).toBeGreaterThan(0);
  });

  it("does not use fallback when structured block exists", () => {
    const text = [
      "---FEEDBACK---",
      "- [api] Structured feedback only",
      "---END FEEDBACK---",
      "",
      "## Feedback",
      "- This fallback bullet should be ignored",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Structured feedback only");
  });

  it("handles category case-insensitivity", () => {
    const text = [
      "---FEEDBACK---",
      "- [COMPONENTS] Uppercase category",
      "- [Api] Mixed case category",
      "---END FEEDBACK---",
    ].join("\n");

    const result = parseFeedback(text);

    expect(result).toHaveLength(2);
    expect(result[0].category).toBe("components");
    expect(result[1].category).toBe("api");
  });
});
