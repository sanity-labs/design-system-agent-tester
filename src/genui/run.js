/**
 * Standalone generative-UI runner over the built-in briefs (src/genui/briefs.js).
 *
 *   npm run genui -- -n 5 -m claude-haiku-4-5
 *
 * The main entry (`src/index.js --genui`) runs the same path over the workflow's
 * resolved brief with full concurrency/retry/run-dir machinery. Both share the
 * iteration logic in `../pipeline/runner-genui.js`.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import { TESTS } from "../config/prompts.js";
import { createMcpClient } from "../pipeline/mcp-client.js";
import { buildGenuiSystem, runGenuiIteration } from "../pipeline/runner-genui.js";
import { loadEnvFile, requireApiKey } from "../util/load-env.js";
import { buildReport } from "./analyze.js";
import BRIEFS from "./briefs.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");

const { values } = parseArgs({
  options: {
    test: { type: "string", short: "t" },
    iterations: { type: "string", short: "n", default: "3" },
    model: { type: "string", short: "m", default: "claude-haiku-4-5" },
    "max-fixes": { type: "string", short: "f", default: "3" },
    brief: { type: "string", short: "b" },
    yes: { type: "boolean", short: "y", default: false },
  },
});

/**
 * Pick the MCP-capable test to run genui against. Genui needs a test whose
 * `config.js` declares an `mcp` block (it drives the server's catalog +
 * validation tools). `--test <label>` selects one explicitly; otherwise we
 * use the first auto-discovered test that has an `mcp` block.
 */
function resolveGenuiTest(label) {
  const mcpTests = TESTS.filter((t) => t.mcp);
  if (label) {
    const t = TESTS.find((x) => x.label === label);
    if (!t) {
      const valid = TESTS.map((x) => x.label).join(", ") || "(none)";
      throw new Error(`Unknown test "${label}". Available: ${valid}`);
    }
    if (!t.mcp) {
      throw new Error(`Test "${label}" has no \`mcp\` block; genui needs one.`);
    }
    return t;
  }
  if (mcpTests.length === 0) {
    throw new Error(
      "genui needs a test with an `mcp` block, but none were found. " +
        "Add an `mcp: { command, args, ... }` block to a test config (see README → Per-test MCP), " +
        "then pass it with --test <label>.",
    );
  }
  return mcpTests[0];
}

async function claimRunDir() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}.${pad(now.getMinutes())}`;
  const dateDir = resolve(ROOT, "output", date);
  await mkdir(dateDir, { recursive: true });
  for (let suffix = 0; ; suffix++) {
    const name = suffix === 0 ? `${time}-genui` : `${time}-genui.${suffix}`;
    const full = resolve(dateDir, name);
    try {
      await mkdir(full, { recursive: false });
      return full;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
    }
  }
}

async function main() {
  loadEnvFile(resolve(ROOT, ".env"));
  requireApiKey();

  const iterations = parseInt(values.iterations, 10);
  const maxFixes = parseInt(values["max-fixes"], 10);
  const model = values.model;

  if (isNaN(iterations) || iterations < 1) {
    console.error("Error: --iterations must be a positive integer");
    process.exit(1);
  }
  if (isNaN(maxFixes) || maxFixes < 0) {
    console.error("Error: --max-fixes must be a non-negative integer");
    process.exit(1);
  }
  const briefs = values.brief ? BRIEFS.filter((b) => b.id === values.brief) : BRIEFS;
  if (briefs.length === 0) {
    console.error(
      `Unknown brief "${values.brief}". Available: ${BRIEFS.map((b) => b.id).join(", ")}`,
    );
    process.exit(1);
  }

  let test;
  try {
    test = resolveGenuiTest(values.test);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }

  const runDir = await claimRunDir();
  console.log("=== Generative-UI catalog test (EXPERIMENTAL) ===");
  console.log(
    "genui mode is experimental and needs a test with an `mcp` block exposing a component catalog + validation tool.",
  );
  console.log(
    `Test: ${test.label} · Model: ${model} · Briefs: ${briefs.length} · Iterations/brief: ${iterations} · Max fixes: ${maxFixes}`,
  );
  console.log(`Output: ${runDir}\n`);

  if (!values.yes) {
    console.log(
      `About to run ${iterations * briefs.length} generations against ${model}. Ctrl-C within 4s to abort, or pass --yes.`,
    );
    await new Promise((r) => setTimeout(r, 4000));
  }

  const client = new Anthropic({ timeout: 10 * 60 * 1000, maxRetries: 1 });
  const mcp = await createMcpClient(test.mcp);
  console.log(`MCP ready — ${mcp.getTools().length} tools.`);

  const records = [];
  try {
    const catalogSummary = await mcp.callToolText("dsds_get_catalog", { format: "summary" });
    await writeFile(resolve(runDir, "_catalog.md"), catalogSummary, "utf-8");
    const system = buildGenuiSystem(catalogSummary);

    for (const brief of briefs) {
      const briefDir = resolve(runDir, brief.id);
      for (let i = 1; i <= iterations; i++) {
        const label = `${brief.id} #${i}`;
        process.stdout.write(`[${label}] generating… `);
        try {
          const rec = await runGenuiIteration({
            client,
            mcp,
            model,
            system,
            brief: brief.brief,
            briefId: brief.id,
            maxFixes,
            iterDir: resolve(briefDir, `iteration-${i}`),
          });
          rec.iteration = i;
          records.push(rec);
          console.log(
            rec.ok
              ? `${rec.valid ? "valid" : "INVALID"} (fixes: ${rec.fixAttempts}, elements: ${rec.elementCount ?? 0})`
              : `no spec (${rec.error})`,
          );
        } catch (err) {
          records.push({
            brief: brief.id,
            iteration: i,
            ok: false,
            error: err.message,
            tokens: { effIn: 0, out: 0 },
          });
          console.log(`error: ${err.message}`);
        }
      }
    }
  } finally {
    await mcp.stop().catch(() => {});
  }

  const { markdown, json } = buildReport(records, {
    generatedAt: new Date().toISOString(),
    model,
    iterations,
  });
  await writeFile(resolve(runDir, "report.md"), markdown, "utf-8");
  await writeFile(resolve(runDir, "report.json"), JSON.stringify(json, null, 2), "utf-8");

  console.log(
    `\nValid first try: ${json.overall.validFirstTry}/${json.overall.produced} · valid eventually: ${json.overall.validEventually}/${json.overall.produced}`,
  );
  console.log(`Report: ${resolve(runDir, "report.md")}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
