import { describe, expect, it } from "vitest";
import { toAnthropicTools } from "./mcp-client.js";

// ─── toAnthropicTools ──────────────────────────────────────────────────
//
// Regression coverage for the DSDS-removal refactor: `getToolsForAnthropic`
// used to hardcode ["dsds_lint_by_path", "dsds_lint_inline"] as its default
// exclusion. It's now a pure pass-through to this function with whatever
// list a test's own `mcp.excludeToolsForNonReasoningModels` config supplies
// — these tests confirm that exclusion actually excludes, by name, and that
// no tool is dropped when a test configures none.

describe("toAnthropicTools", () => {
  const tools = [
    { name: "some_lint_tool", description: "lints", inputSchema: { type: "object" } },
    { name: "some_other_lint_tool", description: "also lints" },
    { name: "get_component_docs", description: "docs" },
  ];

  it("excludes exactly the tool names given, regardless of what they're called", () => {
    const result = toAnthropicTools(tools, ["some_lint_tool", "some_other_lint_tool"]);
    expect(result.map((t) => t.name)).toEqual(["get_component_docs"]);
  });

  it("excludes nothing when the list is empty (a test with no lint tool configured)", () => {
    const result = toAnthropicTools(tools, []);
    expect(result.map((t) => t.name)).toEqual([
      "some_lint_tool",
      "some_other_lint_tool",
      "get_component_docs",
    ]);
  });

  it("excludes nothing when no exclude list is passed at all", () => {
    const result = toAnthropicTools(tools);
    expect(result).toHaveLength(3);
  });

  it("maps to the Anthropic SDK's tool shape, defaulting missing fields", () => {
    const result = toAnthropicTools(tools, []);
    expect(result[0]).toEqual({
      name: "some_lint_tool",
      description: "lints",
      input_schema: { type: "object" },
    });
    // No description, no inputSchema on the source tool — must not carry
    // `undefined` through to the Anthropic-facing shape.
    expect(result[1]).toEqual({
      name: "some_other_lint_tool",
      description: "also lints",
      input_schema: { type: "object", properties: {} },
    });
  });
});
