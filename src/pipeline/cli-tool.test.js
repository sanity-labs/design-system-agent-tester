import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCliTool,
  checkCliAvailable,
  getCliCommandList,
  getCliInstructions,
  resolveCliCwd,
  runCliTool,
} from "./cli-tool.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(HERE, "__fixtures__/fake-cli.mjs");
const baseConfig = { command: "node", args: [FIXTURE] };

describe("buildCliTool", () => {
  it("returns null when no cli config is present", () => {
    expect(buildCliTool(null)).toBeNull();
    expect(buildCliTool(undefined)).toBeNull();
  });

  it("builds a tool definition with the default name", () => {
    const tool = buildCliTool(baseConfig);
    expect(tool.name).toBe("run_cli");
    expect(tool.input_schema.required).toEqual(["args"]);
    expect(tool.input_schema.properties.args.type).toBe("array");
  });

  it("uses a custom toolName and description when given", () => {
    const tool = buildCliTool({ ...baseConfig, toolName: "astrix_cli", description: "custom" });
    expect(tool.name).toBe("astrix_cli");
    expect(tool.description).toBe("custom");
  });

  it("the default description names the configured invocation", () => {
    const tool = buildCliTool({ command: "npx", args: ["-y", "@astryxdesign/cli"] });
    expect(tool.description).toContain("npx -y @astryxdesign/cli");
  });
});

describe("runCliTool", () => {
  it("passes the model's args through to the subprocess and returns stdout", async () => {
    const text = await runCliTool(baseConfig, { args: ["component", "Button"] });
    expect(JSON.parse(text)).toEqual(["component", "Button"]);
  });

  it("treats a missing/non-array args field as no arguments", async () => {
    const text = await runCliTool(baseConfig, {});
    expect(JSON.parse(text)).toEqual([]);
  });

  // The injection-safety claim in the module doc comment: a shell
  // metacharacter in a model-supplied arg must reach the subprocess as a
  // single literal argv token, never be interpreted by a shell. execFile
  // without `shell: true` guarantees this; assert it holds.
  it("never interprets shell metacharacters — they arrive as one literal argv token", async () => {
    const dangerous = "; rm -rf / #";
    const text = await runCliTool(baseConfig, { args: [dangerous] });
    expect(JSON.parse(text)).toEqual([dangerous]);
  });

  it("reports a non-zero exit code and includes stderr", async () => {
    const text = await runCliTool(baseConfig, { args: ["--fail"] });
    expect(text).toContain("exited with code 3");
    expect(text).toContain("simulated failure");
  });

  it("reports a timeout instead of hanging the caller", async () => {
    const text = await runCliTool({ ...baseConfig, timeoutMs: 300 }, { args: ["--hang"] });
    expect(text).toMatch(/timed out after 300ms/);
  }, 10_000);

  it("truncates output over the configured cap and says so", async () => {
    const text = await runCliTool(baseConfig, { args: ["--big"] });
    expect(text.length).toBeLessThan(21_000);
    expect(text).toMatch(/truncated — 50,000 characters total/);
  });

  it("runs in the given cwd", async () => {
    const text = await runCliTool(baseConfig, { args: ["component", "Button"] }, "/tmp");
    expect(JSON.parse(text)).toEqual(["component", "Button"]);
  });

  // `cli.env` — needed for a CLI that reads its config from the
  // environment (e.g. dsds-mcp's CLI + DSDS_CONFIG). Mirrors mcp.env.
  it("merges a plain-object cli.env into the subprocess environment", async () => {
    const cfg = { ...baseConfig, env: { MY_VAR: "hello" } };
    const text = await runCliTool(cfg, { args: ["--echo-env", "MY_VAR"] });
    expect(text.trim()).toBe("hello");
  });

  it("calls a function cli.env with the project directory", async () => {
    const cfg = { ...baseConfig, env: (dir) => ({ MY_VAR: `dir=${dir}` }) };
    const text = await runCliTool(cfg, { args: ["--echo-env", "MY_VAR"] }, undefined, "/proj");
    expect(text.trim()).toBe("dir=/proj");
  });

  it("still has the surrounding process.env available (env is merged, not replaced)", async () => {
    const cfg = { ...baseConfig, env: { MY_VAR: "hello" } };
    const text = await runCliTool(cfg, { args: ["--echo-env", "PATH"] });
    expect(text.trim()).not.toBe("(unset)");
  });
});

describe("getCliInstructions", () => {
  it("returns an empty string when frontloadArgs is not configured", async () => {
    expect(await getCliInstructions(baseConfig, undefined)).toBe("");
  });

  it("returns an empty string when frontloadArgs is an empty array", async () => {
    expect(await getCliInstructions({ ...baseConfig, frontloadArgs: [] }, undefined)).toBe("");
  });

  it("runs the CLI with frontloadArgs and returns its output", async () => {
    const cfg = { ...baseConfig, frontloadArgs: ["component", "Button"] };
    const text = await getCliInstructions(cfg, undefined);
    expect(JSON.parse(text)).toEqual(["component", "Button"]);
  });

  it("passes projectDir through to a function cli.env, same as runCliTool", async () => {
    const cfg = { ...baseConfig, env: (dir) => ({ MY_VAR: `dir=${dir}` }), frontloadArgs: ["--echo-env", "MY_VAR"] };
    const text = await getCliInstructions(cfg, undefined, "/proj");
    expect(text.trim()).toBe("dir=/proj");
  });
});

describe("checkCliAvailable", () => {
  // Guards process.exit(1) so a failing case doesn't kill the test runner,
  // and captures console output for assertions.
  let exitSpy, errorSpy, logSpy;
  beforeEach(() => {
    exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("passes silently when the smoke command exits 0", () => {
    checkCliAvailable(baseConfig, ["component", "Button"], "test-label");
    expect(exitSpy).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("smoke test passed"));
  });

  it("exits 1 and reports the failure when the smoke command exits non-zero", () => {
    expect(() => checkCliAvailable(baseConfig, ["--fail"], "test-label")).toThrow(
      "process.exit called",
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("simulated failure"));
  });

  it("includes the failing command in the error output for debuggability", () => {
    expect(() => checkCliAvailable(baseConfig, ["--fail"], "test-label")).toThrow();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("--fail"));
  });
});

describe("resolveCliCwd", () => {
  it("defaults to the project directory when cli.cwd is unset", () => {
    expect(resolveCliCwd({}, "/proj")).toBe("/proj");
  });

  it("prefers a string cli.cwd over the project directory", () => {
    expect(resolveCliCwd({ cwd: "/fixed" }, "/proj")).toBe("/fixed");
  });

  it("calls a function cli.cwd with the project directory", () => {
    expect(resolveCliCwd({ cwd: (dir) => `${dir}/sub` }, "/proj")).toBe("/proj/sub");
  });
});

describe("buildCliTool — the default description", () => {
  const cfg = { command: "node", args: ["/tmp/fake-cli.js"], toolName: "fake_cli" };

  // Regression guard. The default used to name `component`, which is
  // Astryx's subcommand and does not exist in dsds. Every CLI-backed test
  // inherits this string, so a subcommand named here is a subcommand
  // asserted to exist in CLIs the author never looked at: the ui5-cli arm
  // spent 14 calls across one run on `dsds component …`, 2.8 per iteration,
  // each one a wasted tool turn.
  it("names no subcommand, because it is shared by every CLI", () => {
    const { description } = buildCliTool(cfg);
    for (const word of ["component", "search", "docs", "context", "chunk", "brief"]) {
      expect(description, `default description must not name "${word}"`).not.toMatch(
        new RegExp(`\\["${word}"`),
      );
    }
  });

  it("points at --help, the one argument every CLI here understands", () => {
    expect(buildCliTool(cfg).description).toContain('{"args": ["--help"]}');
  });

  it("lets a test override it when its CLI has a distinctive shape", () => {
    const custom = buildCliTool({ ...cfg, description: "Run the widget CLI." });
    expect(custom.description).toBe("Run the widget CLI.");
  });
});

// ─── getCliCommandList / description embedding ────────────────────────
//
// 2026-09-11: ui5-cli failed 10-12% of CLI calls purely on argument
// syntax, each costing a turn. `--help` lists names without usage, so
// `brief` (positional <build|author|ask>) and `check-exports` (positional
// <Component…>) kept failing. This inlines the CLI's own usage strings.

describe("getCliCommandList", () => {
  const echo = { command: "node", args: [FIXTURE] };

  it("returns '' when commandList is not configured", async () => {
    expect(await getCliCommandList(echo, undefined)).toBe("");
  });

  it("returns '' when either half of the contract is missing", async () => {
    expect(await getCliCommandList({ ...echo, commandList: { args: [] } }, undefined)).toBe("");
    expect(await getCliCommandList({ ...echo, commandList: { parse: () => "x" } }, undefined)).toBe("");
  });

  it("runs the configured args and returns the parsed list", async () => {
    const cfg = {
      ...echo,
      commandList: { args: ["a", "b"], parse: (out) => JSON.parse(out).join(" | ") },
    };
    expect(await getCliCommandList(cfg, undefined)).toBe("a | b");
  });

  it("returns '' rather than throwing when parse fails", async () => {
    const cfg = { ...echo, commandList: { args: ["x"], parse: () => { throw new Error("bad"); } } };
    expect(await getCliCommandList(cfg, undefined)).toBe("");
  });

  it("returns '' rather than throwing when the command cannot spawn", async () => {
    const cfg = {
      command: "definitely-not-a-real-binary-xyz",
      args: [],
      commandList: { args: ["x"], parse: () => "should not get here" },
    };
    expect(await getCliCommandList(cfg, undefined)).toBe("");
  });
});

describe("buildCliTool — command list embedding", () => {
  const cfg = { command: "dsds", args: [], toolName: "t" };

  it("appends the list with an instruction not to guess", () => {
    const d = buildCliTool(cfg, "dsds brief <build|author|ask>").description;
    expect(d).toContain("dsds brief <build|author|ask>");
    expect(d).toMatch(/do not guess/i);
  });

  it("omits the block entirely when there is no list", () => {
    const d = buildCliTool(cfg, "").description;
    expect(d).not.toMatch(/Available commands and their exact usage/);
  });

  // A test that supplies its own description must still get the usage list.
  it("appends the list to a custom description too", () => {
    const d = buildCliTool({ ...cfg, description: "custom text" }, "dsds foo <bar>").description;
    expect(d).toContain("custom text");
    expect(d).toContain("dsds foo <bar>");
  });
});
