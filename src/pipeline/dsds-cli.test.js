import { describe, expect, it } from "vitest";
import { execDsdsCommand, resolveCliEntry, resolveTestEnv } from "./dsds-cli.js";

describe("execDsdsCommand sandbox", () => {
  // Rejection paths never spawn anything, so a fake entry is fine.
  const ENTRY = "/nonexistent/cli.js";

  it("rejects non-dsds commands without spawning", async () => {
    for (const cmd of ["rm -rf /", "ls", "node evil.js", "curl http://x", ""]) {
      const r = await execDsdsCommand(ENTRY, {}, "/tmp", cmd);
      expect(r.ok).toBe(false);
      expect(r.output).toContain("dsds");
    }
  });

  it("rejects shell operators — this is argv, not a shell", async () => {
    for (const cmd of [
      "dsds list | grep button",
      "dsds get button > out.txt",
      "dsds list; rm -rf /",
      "dsds get `whoami`",
      "dsds get $(id)",
      "dsds list & dsds search x",
    ]) {
      const r = await execDsdsCommand(ENTRY, {}, "/tmp", cmd);
      expect(r.ok).toBe(false);
      expect(r.output).toContain("not a shell");
    }
  });

  it("reports a broken CLI entry as a non-ok result, not a throw", async () => {
    // node spawns fine and exits 1 (module not found) — the executor must
    // surface that as a tool message the agent can read, never a throw.
    const r = await execDsdsCommand(ENTRY, {}, "/tmp", "dsds list");
    expect(r.ok).toBe(false);
    expect(r.output).toMatch(/exit 1|failed to run/);
  });
});

describe("resolveCliEntry / resolveTestEnv", () => {
  it("explicit cli.entry wins; missing file → null", () => {
    expect(resolveCliEntry({ cli: { entry: "/nope/index.js" } })).toBeNull();
  });

  it("returns null with no cli and no mcp directory", () => {
    expect(resolveCliEntry({})).toBeNull();
    expect(resolveCliEntry({ mcp: {} })).toBeNull();
  });

  it("cli.env takes precedence over mcp.env; function form receives the directory", () => {
    expect(resolveTestEnv({ cli: { env: { A: "1" } }, mcp: { env: { A: "2" } } })).toEqual({
      A: "1",
    });
    const t = { mcp: { defaultDirectory: "/d", env: (dir) => ({ DIR: dir }) } };
    expect(resolveTestEnv(t)).toEqual({ DIR: "/d" });
  });
});

describe("execDsdsCommand rejects path arguments that escape the project", () => {
  // Rejection happens before any spawn, so a fake cliEntry/projectDir is fine.
  const run = (cmd) => execDsdsCommand("/nonexistent/cli.js", {}, "/tmp/proj", cmd);

  it("rejects a relative-traversal path argument", async () => {
    const r = await run("dsds lint --apply ../../../../etc/passwd");
    expect(r.ok).toBe(false);
    expect(r.output).toMatch(/outside the project directory/);
  });

  it("rejects an absolute path argument", async () => {
    const r = await run("dsds context /etc/passwd");
    expect(r.ok).toBe(false);
    expect(r.output).toMatch(/outside the project directory/);
  });

  it("rejects traversal in a --flag=value argument", async () => {
    const r = await run("dsds lint --out=../../x");
    expect(r.ok).toBe(false);
    expect(r.output).toMatch(/outside the project directory/);
  });

  it("does not reject legitimate in-project path or bare-word arguments", async () => {
    // These pass the guard and reach the spawn step (which fails only because
    // the fake cliEntry doesn't exist) — the point is no path rejection.
    for (const cmd of ["dsds context button", "dsds lint src/App.tsx"]) {
      const r = await run(cmd);
      expect(r.output).not.toMatch(/outside the project directory/);
    }
  });
});
