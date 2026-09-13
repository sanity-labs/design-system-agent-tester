import { describe, expect, it } from "vitest";
import {
  buildLintFixPrompt,
  isGroundedByToolLog,
  resolveExcludedTools,
  runCliLintGate,
  runLintGate,
  summarizeLintFiles,
} from "./runner-api.js";

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

// ─── resolveExcludedTools ────────────────────────────────────────────────
//
// `mcp.excludeTools` applies to every model; `mcp.excludeToolsForNonReasoningModels`
// applies only when the model isn't a reasoning model (claude-fable*/claude-mythos*).

describe("resolveExcludedTools", () => {
  it("excludes nothing when neither field is configured", () => {
    expect(resolveExcludedTools({}, "claude-sonnet-4-6")).toEqual([]);
  });

  it("applies excludeTools regardless of model", () => {
    const config = { excludeTools: ["acme_get_chunk", "acme_build_component"] };
    expect(resolveExcludedTools(config, "claude-sonnet-4-6")).toEqual([
      "acme_get_chunk",
      "acme_build_component",
    ]);
    expect(resolveExcludedTools(config, "claude-fable-1")).toEqual([
      "acme_get_chunk",
      "acme_build_component",
    ]);
  });

  it("applies excludeToolsForNonReasoningModels only to non-reasoning models", () => {
    const config = { excludeToolsForNonReasoningModels: ["acme_lint_tool"] };
    expect(resolveExcludedTools(config, "claude-sonnet-4-6")).toEqual(["acme_lint_tool"]);
    expect(resolveExcludedTools(config, "claude-fable-1")).toEqual([]);
  });

  it("combines both fields for a non-reasoning model", () => {
    const config = {
      excludeTools: ["acme_get_chunk"],
      excludeToolsForNonReasoningModels: ["acme_lint_tool"],
    };
    expect(resolveExcludedTools(config, "claude-haiku-4-5")).toEqual([
      "acme_get_chunk",
      "acme_lint_tool",
    ]);
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

// ─── summarizeLintFiles / runCliLintGate ──────────────────────────────
//
// The CLI-transport lint gate (added 2026-09-10 so `ui5-cli` reaches
// parity with `ui5-frontload`'s MCP gate). `summarizeLintFiles` is the
// error/warning policy both transports share — extracted from
// runLintGate so the two can't drift.

describe("summarizeLintFiles", () => {
  it("counts errors only, reports warnings separately", () => {
    const r = summarizeLintFiles([
      {
        filename: "a.tsx",
        messages: [
          { ruleId: "no-foo", severity: 2, message: "bad" },
          { ruleId: "meh", severity: 1, message: "advisory" },
        ],
      },
    ]);
    expect(r.remaining).toBe(1);
    expect(r.warnings).toBe(1);
    expect(r.byRule).toEqual({ "no-foo": 1 });
  });

  it("drops files whose findings are all warnings", () => {
    const r = summarizeLintFiles([
      { filename: "a.tsx", messages: [{ ruleId: "meh", severity: 1, message: "x" }] },
    ]);
    expect(r.remaining).toBe(0);
    expect(r.warnings).toBe(1);
    expect(r.files).toEqual([]);
  });

  it("tolerates empty/absent input", () => {
    expect(summarizeLintFiles([]).remaining).toBe(0);
    expect(summarizeLintFiles(undefined).remaining).toBe(0);
  });
});

describe("runCliLintGate", () => {
  const files = [
    { path: "src/App.tsx", content: "x" },
    { path: "package.json", content: "{}" }, // not lintable — filtered out
  ];
  // Echoes argv as JSON, so `parse` can assert on what was actually run.
  const echoCli = {
    command: "node",
    args: ["-e", "console.log(JSON.stringify(process.argv.slice(1)))"],
  };

  it("is inert (unavailable) when the test configures no cli.lint", async () => {
    const r = await runCliLintGate({ ...echoCli }, files, "/tmp");
    expect(r.unavailable).toBe(true);
    expect(r.remaining).toBe(0);
  });

  it("is inert when cli.lint is missing either half of the contract", async () => {
    const onlyArgs = { ...echoCli, lint: { args: () => [] } };
    expect((await runCliLintGate(onlyArgs, files, "/tmp")).unavailable).toBe(true);
    const onlyParse = { ...echoCli, lint: { parse: () => [] } };
    expect((await runCliLintGate(onlyParse, files, "/tmp")).unavailable).toBe(true);
  });

  it("passes only lintable sources, as absolute paths under projectDir", async () => {
    let seen = null;
    const cfg = {
      ...echoCli,
      lint: {
        args: (paths) => {
          seen = paths;
          return [];
        },
        parse: () => [],
      },
    };
    await runCliLintGate(cfg, files, "/proj");
    expect(seen).toEqual(["/proj/src/App.tsx"]);
  });

  it("applies the shared error/warning policy to whatever parse returns", async () => {
    const cfg = {
      ...echoCli,
      lint: {
        args: () => [],
        parse: () => [
          {
            filename: "src/App.tsx",
            messages: [
              { ruleId: "no-foo", severity: 2, message: "bad" },
              { ruleId: "meh", severity: 1, message: "advisory" },
            ],
          },
        ],
      },
    };
    const r = await runCliLintGate(cfg, files, "/tmp");
    expect(r.remaining).toBe(1);
    expect(r.warnings).toBe(1);
    expect(r.byRule).toEqual({ "no-foo": 1 });
  });

  // A lint CLI exits non-zero by design when it finds problems, so the gate
  // must not treat that as a failure — it trusts the parser instead.
  it("still parses output when the CLI exits non-zero (findings, not failure)", async () => {
    const cfg = {
      command: "node",
      args: ["-e", "console.log('FINDINGS'); process.exit(2)"],
      lint: {
        args: () => [],
        parse: (stdout) =>
          stdout.includes("FINDINGS")
            ? [{ filename: "a.tsx", messages: [{ ruleId: "r", severity: 2, message: "m" }] }]
            : [],
      },
    };
    const r = await runCliLintGate(cfg, files, "/tmp");
    expect(r.remaining).toBe(1);
    expect(r.error).toBeUndefined();
  });

  it("reports an error instead of throwing when parse fails", async () => {
    const cfg = {
      ...echoCli,
      lint: {
        args: () => [],
        parse: () => {
          throw new Error("bad json");
        },
      },
    };
    const r = await runCliLintGate(cfg, files, "/tmp");
    expect(r.error).toMatch(/could not parse lint output: bad json/);
    expect(r.remaining).toBe(0);
  });

  it("reports an error instead of throwing when the command cannot spawn", async () => {
    const cfg = {
      command: "definitely-not-a-real-binary-xyz",
      args: [],
      lint: { args: () => [], parse: () => [] },
    };
    const r = await runCliLintGate(cfg, files, "/tmp");
    expect(r.error).toBeTruthy();
    expect(r.remaining).toBe(0);
  });
});

// ─── buildLintFixPrompt ───────────────────────────────────────────────
//
// Regression coverage for 2026-09-10/21.48 ui5-cli iteration-5: a
// render-clean app got two real lint errors, and the lint fix re-emitted
// seven files — package.json, tsconfig.json, vite.config.ts, index.html,
// main.tsx among them — for a two-line styling change, breaking the type
// check and spending the build-fix budget. The prompt said only "Output
// ONLY the files you changed"; the a11y prompt, which runs in the same
// post-render situation, spelled out why and models respected it. 6 of 701
// pre-existing MCP-gate iterations show the same pattern, so this guards a
// long-standing shared-path weakness, not one transport's.

describe("buildLintFixPrompt", () => {
  const lintFiles = [
    {
      filename: "src/App.tsx",
      messages: [{ ruleId: "acme/no-inline-style", severity: 2, line: 69, message: "use the prop" }],
    },
  ];
  const prompt = () => buildLintFixPrompt(lintFiles, "<files here>");

  it("states the build already works, so a rewrite can only lose ground", () => {
    expect(prompt()).toMatch(/ALREADY BUILDS AND RENDERS/);
    expect(prompt()).toMatch(/do NOT regress it/);
  });

  it("demands the smallest possible change", () => {
    expect(prompt()).toMatch(/SMALLEST possible change/);
  });

  // The specific failure: scaffold files re-emitted for a styling fix.
  it("forbids re-emitting project scaffold files", () => {
    const p = prompt();
    for (const f of ["package.json", "tsconfig.json", "vite.config", "index.html"]) {
      expect(p).toContain(f);
    }
    expect(p).toMatch(/Do NOT re-emit project scaffold files/);
  });

  it("tells the model to re-emit only what it changed", () => {
    expect(prompt()).toMatch(/Re-emit ONLY the files you actually change/);
  });

  // The iteration-5 build break was a prop VALUE the types rejected.
  it("warns against guessing an unverified prop/value", () => {
    expect(prompt()).toMatch(/verify it before writing it rather than guessing/);
  });

  it("still reports every violation with its rule, line and message", () => {
    const p = prompt();
    expect(p).toContain("src/App.tsx");
    expect(p).toContain("acme/no-inline-style");
    expect(p).toContain("line 69");
    expect(p).toContain("use the prop");
  });

  // Shared harness code — must not bake in one design system's API.
  it("names no specific design system's props or packages", () => {
    const p = prompt();
    for (const leak of ["@sanity", "@astryxdesign", "@atlaskit", "tone=", "neutral"]) {
      expect(p).not.toContain(leak);
    }
  });
});
