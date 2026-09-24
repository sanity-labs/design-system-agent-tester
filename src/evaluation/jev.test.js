import { describe, expect, it } from "vitest";
import { buildJevFixPrompt } from "../pipeline/runner-api.js";
import { groupFindingsByFile, runJevGate } from "./jev.js";

describe("groupFindingsByFile", () => {
  it("groups findings per file, preserving order", () => {
    const grouped = groupFindingsByFile([
      { file: "src/App.tsx", guideline: "a" },
      { file: "src/Card.tsx", guideline: "b" },
      { file: "src/App.tsx", guideline: "c" },
    ]);
    expect(grouped).toEqual([
      {
        file: "src/App.tsx",
        items: [
          { file: "src/App.tsx", guideline: "a" },
          { file: "src/App.tsx", guideline: "c" },
        ],
      },
      { file: "src/Card.tsx", items: [{ file: "src/Card.tsx", guideline: "b" }] },
    ]);
  });

  it("returns nothing for no findings", () => {
    expect(groupFindingsByFile([])).toEqual([]);
  });
});

describe("runJevGate", () => {
  it("is unavailable, not throwing, without a toolDir", async () => {
    const r = await runJevGate(["src/App.tsx"], "/tmp", {});
    expect(r.unavailable).toBe(true);
    expect(r.findings).toEqual([]);
  });

  it("is unavailable, not throwing, when the judge cannot be loaded", async () => {
    const r = await runJevGate(["src/App.tsx"], "/tmp", { toolDir: "/nonexistent/judge" });
    expect(r.unavailable).toBe(true);
    expect(r.error).toMatch(/load:/);
  });
});

describe("buildJevFixPrompt", () => {
  const prompt = buildJevFixPrompt(
    [
      {
        file: "src/App.tsx",
        items: [
          { statement: "Flex elements carry no `style` attribute.", entity: "flex" },
          { statement: "Headings carry no icon.", entity: null },
        ],
      },
    ],
    "<files here>",
  );

  it("leads with the guideline statement, which is the actionable part", () => {
    expect(prompt).toContain("Flex elements carry no `style` attribute.");
    expect(prompt).toContain("src/App.tsx");
  });

  it("names the entity when there is one, and omits it cleanly when not", () => {
    expect(prompt).toContain("(`flex`)");
    expect(prompt).toContain("- Headings carry no icon.\n");
  });

  it("never shows the probability — it invites arguing with the score", () => {
    expect(prompt).not.toMatch(/0\.\d\d/);
    expect(prompt.toLowerCase()).not.toContain("probability");
  });

  it("carries the do-not-regress instruction the other fix prompts use", () => {
    expect(prompt).toContain("do NOT regress it");
    expect(prompt).toContain("ALREADY BUILDS AND RENDERS");
  });
});

describe("runJevGate — input shape", () => {
  // Regression: the loop carries `{ path, content }` records, not paths. The
  // first version filtered them as strings, so every file was dropped and the
  // gate reported a clean pass having judged nothing.
  it("accepts { path, content } records", async () => {
    const r = await runJevGate([{ path: "src/App.tsx", content: "<div/>" }], "/tmp", {
      toolDir: "/nonexistent",
    });
    // Still unavailable (no judge), but it must fail at load, not by
    // silently filtering the file list to nothing.
    expect(r.unavailable).toBe(true);
    expect(r.error).toMatch(/load:/);
  });

  it("ignores non-source files in the record list", async () => {
    const r = await runJevGate(
      [
        { path: "package.json", content: "{}" },
        { path: "src/App.tsx", content: "<div/>" },
      ],
      "/tmp",
      {},
    );
    expect(r.unavailable).toBe(true);
  });
});

describe("runJevGate retries", () => {
  // A stand-in tool directory: the gate imports build-questions.mjs and
  // ask.mjs from it, so a fake pair exercises the real loading path.
  async function fakeTool(behaviour) {
    const { mkdtempSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "jev-tool-"));
    writeFileSync(
      join(dir, "build-questions.mjs"),
      `export async function buildQuestions() {
         return { questions: { q: {} }, items: [{ id: "q", statement: "S", entity: "e" }] };
       }`,
    );
    writeFileSync(
      join(dir, "ask.mjs"),
      `globalThis.__jevCalls = 0;
       const plan = ${JSON.stringify(behaviour)};
       export async function systemOne({ state }) {
         const n = globalThis.__jevCalls++;
         const step = plan[state.filename]?.[n] ?? plan[state.filename]?.at(-1) ?? "ok";
         if (step !== "ok") throw new Error(step);
         return { answers: { q: { noul: 0.1 } }, usage: { input_tokens: 10 } };
       }
       export async function logJudgments() {}
       export const thresholdsFor = () => ({ yes: 0.8, no: 0.2 });
       export const verdict = () => "clean";
       export const isSurfaceable = () => false;`,
    );
    return dir;
  }
  const file = [{ path: "src/App.tsx", content: "<div />" }];
  const retry = { delays: [0, 0, 0], sleep: async () => {} };

  it("retries a 529 overload and then judges the file", async () => {
    const toolDir = await fakeTool({ "src/App.tsx": ["systemone 529: system_overloaded", "ok"] });
    const r = await runJevGate(file, "/tmp", { toolDir, retry });
    expect(r.judged).toBe(1);
    expect(r.unjudged).toEqual([]);
  });

  it("reports a file that never succeeds as unjudged, not as a judgment", async () => {
    const toolDir = await fakeTool({ "src/App.tsx": ["systemone 529: system_overloaded"] });
    const r = await runJevGate(file, "/tmp", { toolDir, retry });
    expect(r.judged).toBe(0);
    expect(r.all).toEqual([]);
    expect(r.unjudged).toHaveLength(1);
    expect(r.unjudged[0]).toMatchObject({ file: "src/App.tsx", attempts: 4 });
  });

  it("does not retry an error that is not transient", async () => {
    const toolDir = await fakeTool({ "src/App.tsx": ["systemone 400: bad request"] });
    const r = await runJevGate(file, "/tmp", { toolDir, retry });
    expect(r.unjudged[0].attempts).toBe(1);
  });
});
