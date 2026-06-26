/**
 * Generative-UI iteration logic, shared by the standalone runner
 * (`src/genui/run.js`) and the `--genui` flag on the main entry (`src/index.js`).
 *
 * One iteration: the agent fetches the catalog, emits a json-render
 * `{ root, elements }` spec for the brief, and the spec is validated by the real
 * `dsds_validate_ui` tool (with a bounded fix loop). Measures spec validity, not
 * a React build — so it writes no screenshots and runs no dev server.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  effectiveInput,
  extractSpec,
  parseValidationResult,
  specMetrics,
} from "../genui/analyze.js";
import { createMcpClient } from "./mcp-client.js";

const SYSTEM_PREAMBLE = `You generate user interfaces for the Sanity design system as a JSON specification — NOT React code.

Output a single \`\`\`json code block containing an object of this shape:
{ "root": "<id>", "elements": { "<id>": { "type": "<Component>", "props": { ... }, "children": ["<childId>", ...] }, ... } }

Rules:
- Every "type" MUST be a component from the CATALOG below. Do not invent components.
- Use only the props listed for that component. Props that are not listed (for example Card "padding") are not allowed.
- Scale props ("size", "gap", "padding", "margin", "radius") are integer literals, not strings: "size": 2, never "size": "2" or "size": "large".
- Enum props are NAMED strings from the catalog, never integers: "tone" (e.g. "neutral"), "density" ("compact" | "regular" | "loose"), "level" — never "density": 1.
- Text content goes in a "text" string prop on Heading, Text, Label, and Code.
- "children" is an array of element ids. Components with a "default" slot hold children; leaf components do not.
- "root" is the id of the top element. Every referenced child id must exist in "elements".
- Output ONLY the JSON code block — no prose, no explanation.

CATALOG
`;

export function buildGenuiSystem(catalogSummary) {
  return SYSTEM_PREAMBLE + catalogSummary;
}

function buildFixPrompt(rawSpec, issues) {
  return [
    "The UI spec you produced failed validation against the catalog.",
    "",
    "Issues:",
    ...issues.map((i) => `- ${i}`),
    "",
    "Your spec:",
    "```json",
    rawSpec ?? "(unparseable)",
    "```",
    "",
    "Return a corrected spec as a single ```json { root, elements } block, using only catalog components and their allowed props. Output only the JSON.",
  ].join("\n");
}

async function generate(client, { model, system, user }) {
  const stream = await client.messages.stream({
    model,
    // Full-app specs (50+ elements with text) exceed a small cap and get
    // truncated mid-JSON → unparseable. Match the React path's budget.
    max_tokens: 32000,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: user }],
  });
  const msg = await stream.finalMessage();
  const text = msg.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  const u = msg.usage ?? {};
  return {
    text,
    stop: msg.stop_reason,
    usage: {
      uncached: u.input_tokens ?? 0,
      cacheRead: u.cache_read_input_tokens ?? 0,
      cacheCreation: u.cache_creation_input_tokens ?? 0,
      out: u.output_tokens ?? 0,
    },
  };
}

/**
 * Run one genui iteration against an already-started MCP client + Anthropic
 * client + prebuilt system prompt. Writes artifacts into iterDir and returns a
 * record consumable by `buildReport` (brief is set to `briefId`).
 */
export async function runGenuiIteration({
  client,
  mcp,
  model,
  system,
  brief,
  briefId,
  maxFixes,
  iterDir,
}) {
  await mkdir(iterDir, { recursive: true });
  const acc = { uncached: 0, cacheRead: 0, cacheCreation: 0, out: 0 };
  const addUsage = (u) => {
    acc.uncached += u.uncached;
    acc.cacheRead += u.cacheRead;
    acc.cacheCreation += u.cacheCreation;
    acc.out += u.out;
  };

  const gen = await generate(client, { model, system, user: brief });
  addUsage(gen.usage);
  await writeFile(resolve(iterDir, "_response_0.txt"), gen.text, "utf-8");
  let { spec, raw } = extractSpec(gen.text);

  if (!spec) {
    const truncated = gen.stop === "max_tokens";
    await writeFile(
      resolve(iterDir, "_error.txt"),
      `No parseable spec in response.${truncated ? " Response truncated at max_tokens." : ""}`,
      "utf-8",
    );
    return {
      brief: briefId,
      ok: false,
      error: truncated ? "no parseable spec (truncated at max_tokens)" : "no parseable spec",
      tokens: { effIn: effectiveInput(acc), out: acc.out },
    };
  }

  let fixAttempts = 0;
  let validation = parseValidationResult(await mcp.callToolText("dsds_validate_ui", { spec }));
  const validFirstTry = validation.valid;
  const firstIssues = validation.issues;

  while (!validation.valid && fixAttempts < maxFixes) {
    fixAttempts++;
    const fix = await generate(client, {
      model,
      system,
      user: buildFixPrompt(raw, validation.issues),
    });
    addUsage(fix.usage);
    await writeFile(resolve(iterDir, `_response_fix${fixAttempts}.txt`), fix.text, "utf-8");
    const next = extractSpec(fix.text);
    if (!next.spec) break;
    spec = next.spec;
    raw = next.raw;
    validation = parseValidationResult(await mcp.callToolText("dsds_validate_ui", { spec }));
  }

  const metrics = specMetrics(spec);
  await writeFile(resolve(iterDir, "spec.json"), JSON.stringify(spec, null, 2), "utf-8");
  await writeFile(
    resolve(iterDir, "_validation.txt"),
    `valid: ${validation.valid}\nfixAttempts: ${fixAttempts}\n\n${validation.issues.map((i) => `- ${i}`).join("\n")}`,
    "utf-8",
  );

  return {
    brief: briefId,
    ok: true,
    validFirstTry,
    valid: validation.valid,
    fixAttempts,
    issueCount: validation.issueCount,
    issues: validation.issues,
    firstIssues,
    elementCount: metrics.elementCount,
    componentsUsed: metrics.componentsUsed,
    tokens: { effIn: effectiveInput(acc), out: acc.out },
  };
}

/**
 * genui generation phase for the main pipeline's `--genui` flag. Drives the
 * agent to a catalog-VALID spec (generate → dsds_validate_ui → fix), then
 * compiles it to a runnable React project via dsds_render_ui. Returns the
 * project files as `fullText` (---FILE: blocks) so `runAgent`'s normal
 * downstream (write → install → build → screenshot → measure → report) runs
 * unchanged. The spec and intermediate responses are saved for inspection.
 */
export async function generateGenuiProjectWithMcp({
  client,
  model,
  promptContent,
  iterDir,
  iterLabel,
  mcpConfig,
  maxSpecFixes = 3,
}) {
  const mcp = await createMcpClient(mcpConfig);
  const acc = { uncached: 0, cacheRead: 0, cacheCreation: 0, out: 0 };
  const add = (u) => {
    acc.uncached += u.uncached;
    acc.cacheRead += u.cacheRead;
    acc.cacheCreation += u.cacheCreation;
    acc.out += u.out;
  };

  try {
    const catalogSummary = await mcp.callToolText("dsds_get_catalog", { format: "summary" });
    const system = buildGenuiSystem(catalogSummary);

    console.log(`[${iterLabel}] genui: generating spec…`);
    const gen = await generate(client, { model, system, user: promptContent });
    add(gen.usage);
    await writeFile(resolve(iterDir, "_genui_response_0.txt"), gen.text, "utf-8");
    let { spec, raw } = extractSpec(gen.text);
    let fullText = gen.text; // no spec → no files → runAgent's generation retry
    if (!spec) {
      console.log(
        `[${iterLabel}] genui: no parseable spec${gen.stop === "max_tokens" ? " — response truncated at max_tokens (raise the limit)" : ""}.`,
      );
    }

    if (spec) {
      let validation = parseValidationResult(await mcp.callToolText("dsds_validate_ui", { spec }));
      let fixes = 0;
      while (!validation.valid && fixes < maxSpecFixes) {
        fixes++;
        console.log(
          `[${iterLabel}] genui: spec invalid (${validation.issueCount} issue(s)) — fix ${fixes}/${maxSpecFixes}…`,
        );
        const fix = await generate(client, {
          model,
          system,
          user: buildFixPrompt(raw, validation.issues),
        });
        add(fix.usage);
        await writeFile(resolve(iterDir, `_genui_response_fix${fixes}.txt`), fix.text, "utf-8");
        const next = extractSpec(fix.text);
        if (!next.spec) break;
        spec = next.spec;
        raw = next.raw;
        validation = parseValidationResult(await mcp.callToolText("dsds_validate_ui", { spec }));
      }
      await writeFile(resolve(iterDir, "genui-spec.json"), JSON.stringify(spec, null, 2), "utf-8");
      console.log(
        `[${iterLabel}] genui: spec ${validation.valid ? "valid" : "INVALID"} after ${fixes} fix(es) — compiling to React…`,
      );
      // ---FILE: blocks on success; a "Cannot render" message (no files) if still invalid.
      fullText = await mcp.callToolText("dsds_render_ui", { spec });
    }

    return {
      fullText,
      uncachedInputTokens: acc.uncached,
      cacheReadInputTokens: acc.cacheRead,
      cacheCreationInputTokens: acc.cacheCreation,
      outputTokens: acc.out,
    };
  } finally {
    await mcp.stop().catch(() => {});
  }
}
