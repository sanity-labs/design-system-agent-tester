import { describe, expect, it } from "vitest";
import { isGroundedByToolLog, runLintGate } from "./runner-api.js";

// ─── isGroundedByToolLog ───────────────────────────────────────────────
//
// Regression coverage for the DSDS-removal refactor: the grounding-nudge
// feature used to hardcode a tool-name pattern for dsds-mcp's own
// verification tools. It's now gated entirely on a test's own
// `mcp.groundingCheck` config — absent means the harness has no opinion
// (always considered grounded), present means it matches by the test's own
// pattern, not a built-in one.

describe("isGroundedByToolLog", () => {
  it("is always grounded when no test configures a groundingCheck", () => {
    expect(isGroundedByToolLog(null, [])).toBe(true);
    expect(isGroundedByToolLog(null, [{ tool: "anything" }])).toBe(true);
  });

  it("is not grounded when a groundingCheck is configured but its pattern never matched", () => {
    const groundingCheck = { pattern: /get_agent_context|check_exports/i };
    const toolLog = [{ tool: "some_context_brief" }, { tool: "some_search_entities" }];
    expect(isGroundedByToolLog(groundingCheck, toolLog)).toBe(false);
  });

  it("is grounded once any tool call matches the configured pattern", () => {
    const groundingCheck = { pattern: /get_agent_context|check_exports/i };
    const toolLog = [{ tool: "some_context_brief" }, { tool: "some_check_exports" }];
    expect(isGroundedByToolLog(groundingCheck, toolLog)).toBe(true);
  });

  it("matches by substring, not exact name — the pattern is the test's own naming, not this harness's", () => {
    const groundingCheck = { pattern: /verify_component/i };
    const toolLog = [{ tool: "acme_verify_component_props" }];
    expect(isGroundedByToolLog(groundingCheck, toolLog)).toBe(true);
  });
});

// ─── runLintGate ───────────────────────────────────────────────────────
//
// Regression coverage for the DSDS-removal refactor: the lint gate used to
// hardcode the tool name "dsds_lint_by_path". It now takes the tool name as
// a parameter — sourced from a test's own `mcp.lintTool` config — so these
// tests confirm the CONFIGURED name is what actually gets called, not a
// baked-in one.

function fakeLintClient(handler) {
  return { callTool: async (name, args) => handler(name, args) };
}

describe("runLintGate", () => {
  const files = [
    { path: "src/App.tsx", content: "export default function App() {}" },
    { path: "package.json", content: "{}" }, // not lintable — filtered out
  ];

  it("calls the configured tool name, not a hardcoded one", async () => {
    let calledWith = null;
    const client = fakeLintClient((name, args) => {
      calledWith = name;
      return { structuredContent: { files: [] } };
    });
    await runLintGate(client, files, "acme_lint_tool");
    expect(calledWith).toBe("acme_lint_tool");
  });

  it("only sends lintable source files, not the whole project", async () => {
    let sentFiles = null;
    const client = fakeLintClient((name, args) => {
      sentFiles = args.files;
      return { structuredContent: { files: [] } };
    });
    await runLintGate(client, files, "acme_lint_tool");
    expect(sentFiles).toEqual([{ path: "src/App.tsx", filename: "src/App.tsx" }]);
  });

  it("returns zero with no tool call when there are no lintable files", async () => {
    let called = false;
    const client = fakeLintClient(() => {
      called = true;
      return { structuredContent: { files: [] } };
    });
    const result = await runLintGate(client, [{ path: "package.json" }], "acme_lint_tool");
    expect(called).toBe(false);
    expect(result).toEqual({ remaining: 0, files: [], warnings: 0 });
  });

  it("counts only severity-2 messages as gating errors; severity-1 are warnings", async () => {
    const client = fakeLintClient(() => ({
      structuredContent: {
        files: [
          {
            filename: "src/App.tsx",
            messages: [
              { ruleId: "no-foo", severity: 2, message: "bad" },
              { ruleId: "prefer-bar", severity: 1, message: "meh" },
            ],
          },
        ],
      },
    }));
    const result = await runLintGate(client, files, "acme_lint_tool");
    expect(result.remaining).toBe(1);
    expect(result.warnings).toBe(1);
    expect(result.byRule).toEqual({ "no-foo": 1 });
  });

  it("reports unavailable when the tool responds with no structuredContent", async () => {
    const client = fakeLintClient(() => ({}));
    const result = await runLintGate(client, files, "acme_lint_tool");
    expect(result.unavailable).toBe(true);
  });

  it("reports an error instead of throwing when the tool call rejects", async () => {
    const client = { callTool: async () => { throw new Error("boom"); } };
    const result = await runLintGate(client, files, "acme_lint_tool");
    expect(result.error).toBe("boom");
    expect(result.remaining).toBe(0);
  });
});
