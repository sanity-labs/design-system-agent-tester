import { readFileSync } from "node:fs";
import { appendFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { isReasoningModel } from "../config/prompts.js";
import { groupFindingsByFile, runJevGate, writeJevResults } from "../evaluation/jev.js";
import { parseFeedback } from "../evaluation/parse-feedback.js";
import { parseFiles } from "../evaluation/parse-files.js";
import { killDevServer, validateProject } from "../evaluation/validate.js";
import { error, success, tag, warn } from "../util/color.js";
import { isLocalModel } from "../util/local-model.js";
import { isTransientError } from "../util/retry.js";
import {
  buildCliTool,
  execCliRaw,
  getCliCommandList,
  getCliInstructions,
  resolveCliCwd,
  runCliTool,
} from "./cli-tool.js";
import { createMcpClient } from "./mcp-client.js";
import { createOllamaClient } from "./ollama-client.js";
import {
  buildCurrentFilesText,
  buildFixPrompt,
  buildResult,
  getFixSystemPrompt,
  getSystemPrompt,
  readProjectFiles,
  runAccessibility,
  runPerformance,
  runStaticMeasurements,
  writeProjectFiles,
} from "./shared.js";

// Most tool-use round trips before the model is made to finish.
//
// Set to 30 because the CLI arm averages around 22 and sometimes ran out
// while still researching, which wasted the whole iteration. MCP arms sit
// near 13 and are not affected.
const MAX_TOOL_TURNS = 30;

// The turn where the loop starts telling the model to stop researching and
// write the files. Kept at a fixed number rather than tied to the limit
// above, so raising the limit gives a slow run room to finish instead of
// letting every run research for longer.
const TOOL_TURN_NUDGE_AT = 23;

const API_CALL_MAX_RETRIES = 3;
const API_CALL_RETRY_DELAY_MS = 15_000; // 15 seconds

// How many times to ask for the files again within the same conversation
// when the model finishes without writing any.
//
// Some models compose the whole project in their reasoning and end with a
// summary. The files are still in their context, so asking again in the
// same conversation gets them back. Starting a fresh attempt would throw
// that work away and usually fail the same way.
const MAX_EMISSION_NUDGES = 2;

/**
 * Call `client.messages.create()` with retry logic for transient connection errors.
 * Retries up to API_CALL_MAX_RETRIES times with a delay between attempts.
 */
async function callAnthropicWithRetry(client, params, label = "") {
  for (let attempt = 1; attempt <= API_CALL_MAX_RETRIES; attempt++) {
    try {
      // Use streaming to keep the connection alive during long generations.
      // Non-streaming holds a silent TCP connection for 100+ seconds on large
      // outputs, which triggers infrastructure-level connection drops.
      const stream = await client.messages.stream(params);
      return await stream.finalMessage();
    } catch (err) {
      if (isTransientError(err) && attempt < API_CALL_MAX_RETRIES) {
        const delaySec = Math.round(API_CALL_RETRY_DELAY_MS / 1000);
        console.warn(
          `${label ? `[${label}] ` : ""}API call failed (attempt ${attempt}/${API_CALL_MAX_RETRIES}): ${err.message}. Retrying in ${delaySec}s...`,
        );
        await new Promise((r) => setTimeout(r, API_CALL_RETRY_DELAY_MS));
        continue;
      }
      throw err;
    }
  }
}

// Models that accept an `effort` setting. Everything else rejects it, so it
// is never sent to them no matter what a test config asks for.
const EFFORT_SUPPORTED_PREFIXES = [
  "claude-fable",
  "claude-mythos", // covers both Mythos 5 and Mythos Preview
  "claude-opus-4-8",
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-opus-4-5",
  "claude-sonnet-5",
  "claude-sonnet-4-6",
];

function modelSupportsEffort(model) {
  return typeof model === "string" && EFFORT_SUPPORTED_PREFIXES.some((p) => model.startsWith(p));
}

/**
 * Extra request settings for the model. `effort` comes from the test config
 * and is only sent to models that accept it, so setting it for one model in
 * a multi-model run does not break the others.
 *
 * Reasoning models are fixed at "medium" and ignore the test setting. That
 * is the value this harness has actually been run against. At lower effort
 * one of them stopped writing files partway through and sent a summary
 * instead; at higher effort another composed whole files inside its
 * thinking, which the API never returns, and then summarised those.
 */
function modelTuning(model, effort = null) {
  if (isReasoningModel(model)) {
    return { output_config: { effort: "medium" } };
  }
  if (effort && modelSupportsEffort(model)) {
    return { output_config: { effort } };
  }
  return {};
}

/**
 * Whether the agent used the tools the test says it must.
 *
 * A test that sets no `groundingCheck` always passes. The harness has no
 * idea what counts as checking your work against a given server's docs, so
 * no setting means no opinion rather than some default.
 *
 * @param {{pattern: RegExp} | null} groundingCheck
 * @param {Array<{tool: string}>} toolLog
 * @returns {boolean}
 */
export function isGroundedByToolLog(groundingCheck, toolLog) {
  if (!groundingCheck) return true;
  return toolLog.some((t) => groundingCheck.pattern.test(t.tool));
}

/**
 * Tool names to hide from this model. `mcp.excludeTools` applies to every
 * model; `mcp.excludeToolsForNonReasoningModels` only to weaker ones. Both
 * default to hiding nothing.
 *
 * @param {{excludeTools?: string[], excludeToolsForNonReasoningModels?: string[]}} mcpConfig
 * @param {string} model
 * @returns {string[]}
 */
export function resolveExcludedTools(mcpConfig, model) {
  return [
    ...(mcpConfig.excludeTools ?? []),
    ...(isReasoningModel(model) ? [] : (mcpConfig.excludeToolsForNonReasoningModels ?? [])),
  ];
}

/**
 * One-shot generation, no tools.
 *
 * The system prompt is marked for caching. Every fix attempt in an
 * iteration uses the same one, so later attempts hit the cache and are
 * billed at a fraction of the normal rate.
 */
async function generateSimple({ client, model, promptContent, systemPrompt, effort = null }) {
  const response = await callAnthropicWithRetry(client, {
    model,
    max_tokens: 32000,
    ...modelTuning(model, effort),
    system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: promptContent }],
  });

  const fullText = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  const u = response.usage ?? {};
  return {
    fullText,
    uncachedInputTokens: u.input_tokens ?? 0,
    cacheReadInputTokens: u.cache_read_input_tokens ?? 0,
    cacheCreationInputTokens: u.cache_creation_input_tokens ?? 0,
    outputTokens: u.output_tokens ?? 0,
  };
}

/**
 * Generation with tool use, over MCP, a CLI, or both.
 *
 * 1. Start the MCP server and/or build the CLI tool, depending on what the
 *    test declares
 * 2. Register whichever tools exist
 * 3. Let the model call them
 * 4. Route each call to the right place and send the result back
 * 5. Stop when the model stops calling tools and writes its answer
 *
 * `mcpConfig` and `cliConfig` are both optional and independent. A test can
 * set either, both, or neither.
 */
async function generateWithTools({
  client,
  model,
  promptContent,
  baseSystemPrompt,
  iterDir,
  iterLabel,
  mcpConfig,
  cliConfig = null,
  projectDir,
  effort = null,
  toolLogName = "_mcp_tool_log.json",
  // Put the tool's own instructions into the system prompt. True for the
  // first generation, false for repair turns.
  //
  // Repair turns skip it because those instructions are a getting-started
  // briefing. Re-sending them costs tokens and misleads: one server's block
  // opens with "call brief first before any work begins", and agents follow
  // that on repair rounds where the app already works.
  frontloadInstructions = true,
  // A repair round: the agent emits only the files it changes. Writes overlay
  // the project instead of replacing it, and the whole-project nudges are off.
  repairTurn = false,
}) {
  let mcpClient = null;
  try {
    // The project directory must exist before tools are callable so a
    // file-aware tool (an MCP self-lint tool, or a CLI subcommand a test
    // points at the project — see `resolveCliCwd`) can read files the agent
    // has already written, instead of resolving paths against nothing.
    await mkdir(projectDir, { recursive: true });

    if (mcpConfig) {
      console.log(`[${iterLabel}] Starting MCP server...`);
      const mcpConfigWithSource = {
        ...mcpConfig,
        env: (dir) => ({
          ...(typeof mcpConfig.env === "function" ? mcpConfig.env(dir) : (mcpConfig.env ?? {})),
          LINT_SOURCE_DIR: projectDir,
        }),
      };
      mcpClient = await createMcpClient(mcpConfigWithSource);
    }

    // `mcp.excludeTools` hides tools from every model, for a test that wants to
    // measure a narrower slice of a server without a second config.
    //
    // `mcp.excludeToolsForNonReasoningModels` hides them from weaker models
    // only. Those models are told in the prompt not to lint their own code,
    // since the harness does it afterwards anyway, but a prompt is only advice
    // and a tool's own description can tell them the opposite. Removing the
    // tool settles it.
    const mcpTools = mcpClient
      ? mcpClient.getToolsForAnthropic(resolveExcludedTools(mcpConfig, model))
      : [];
    // Both instruction sources are gated on `frontloadInstructions` — see
    // that parameter's doc comment for why repair turns skip them. Tools
    // themselves are NOT gated: a fix turn still gets the full tool surface,
    // it just isn't handed a "here's how to start building" briefing.
    const mcpInstructions =
      frontloadInstructions && mcpClient ? mcpClient.getInstructions() || "" : "";
    // Fetched for repair turns too, unlike the instructions above. The command
    // list lives in the tool description, which is re-sent every request, and a
    // repair turn needs the right argument syntax just as much as the first.
    const cliCommandList = cliConfig
      ? await getCliCommandList(cliConfig, resolveCliCwd(cliConfig, projectDir), projectDir)
      : "";
    const cliTool = buildCliTool(cliConfig, cliCommandList);
    const tools = cliTool ? [...mcpTools, cliTool] : mcpTools;
    // The CLI equivalent of `mcpInstructions` — see `cli.frontloadArgs` in
    // cli-tool.js. "" when the test hasn't configured it, or on a repair turn
    // (which also spares the subprocess the frontload would otherwise spawn).
    const cliInstructions =
      frontloadInstructions && cliConfig
        ? await getCliInstructions(cliConfig, resolveCliCwd(cliConfig, projectDir), projectDir)
        : "";

    if (mcpConfig) console.log(`[${iterLabel}] MCP ready — ${mcpTools.length} tools available`);
    if (cliTool) {
      console.log(
        `[${iterLabel}] CLI tool ready — "${cliTool.name}"` +
          (cliCommandList ? ` (+${cliCommandList.length} chars of command usage)` : ""),
      );
    }
    if (cliInstructions) {
      console.log(`[${iterLabel}] CLI front-loaded ${cliInstructions.length} chars of instructions`);
    }
    if (!frontloadInstructions) {
      console.log(`[${iterLabel}] Repair turn — tool instructions not front-loaded`);
    }

    // Build system prompt with MCP + CLI instructions appended (empty
    // strings, and no-op concats, when neither is configured).
    const systemPrompt = baseSystemPrompt + "\n\n" + mcpInstructions + "\n\n" + cliInstructions;

    // Conversation messages. Tool results get appended as the loop runs.
    //
    // The first user message is marked for caching so the system prompt and
    // that message are cached across all the turns in this conversation. With
    // tool use routinely running past 10 turns, this is the most valuable
    // place to cache.
    const messages = [
      {
        role: "user",
        content: [{ type: "text", text: promptContent, cache_control: { type: "ephemeral" } }],
      },
    ];

    // Track the token counts separately. Caching splits input into several
    // counters, and keeping them apart lets the report show whether caching is
    // working and what the run actually cost.
    let uncachedInputTokens = 0;
    let cacheReadInputTokens = 0;
    let cacheCreationInputTokens = 0;
    let outputTokens = 0;
    const allTextParts = [];
    let turns = 0;

    // Save a log of all tool interactions for debugging
    const toolLog = [];
    // Track seen tool calls to detect retry loops
    const seenToolCalls = new Set();
    let duplicateStreak = 0;
    // In-conversation emission recovery (see MAX_EMISSION_NUDGES).
    let emissionNudges = 0;
    let forceTextOnly = false;
    // A full project with no calls to any per-component lookup tool means every
    // prop and export name in it is a guess. When that happens, ask the model
    // in the same conversation to check its work and re-send anything that was
    // wrong, rather than accepting the guess.
    const groundingCheck = mcpConfig?.groundingCheck ?? cliConfig?.groundingCheck ?? null;
    let groundingNudges = 0;
    const MAX_GROUNDING_NUDGES = 1;
    // The block currently carrying the sliding conversation cache breakpoint.
    let cacheMarker = null;

    while (turns < MAX_TOOL_TURNS) {
      turns++;

      // Move the cache marker to the end of the newest message so everything
      // before it is cached. Without this only the system prompt and first
      // message are cached, and every turn re-bills all the tool results that
      // have piled up. The previous marker is cleared each time, and the first
      // message is left alone, which keeps us under the limit of four markers.
      if (messages.length > 1) {
        if (cacheMarker) delete cacheMarker.cache_control;
        const lastContent = messages[messages.length - 1].content;
        if (Array.isArray(lastContent) && lastContent.length > 0) {
          const lastBlock = lastContent[lastContent.length - 1];
          if (lastBlock && typeof lastBlock === "object") {
            lastBlock.cache_control = { type: "ephemeral" };
            cacheMarker = lastBlock;
          }
        }
      }

      // When approaching the limit or stuck in a loop, nudge the model to stop researching.
      // If the MCP server exposes a feedback tool, name it explicitly so the
      // "stop calling tools" directive doesn't prevent it from being called.
      const feedbackTool = mcpTools.find((t) => t.name.includes("feedback"));
      const nudge =
        turns >= TOOL_TURN_NUDGE_AT || duplicateStreak >= 3
          ? `\n\nYou have done enough research.${feedbackTool ? ` Call ${feedbackTool.name} now, then` : ""} produce ALL project files using ---FILE: path--- blocks. No other tool calls.`
          : "";

      // Split the system prompt so the unchanging part can be cached and the
      // per-turn nudge sits in its own uncached block at the end.
      const systemBlocks = [
        { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
      ];
      if (nudge) systemBlocks.push({ type: "text", text: nudge });

      const response = await callAnthropicWithRetry(
        client,
        {
          model,
          max_tokens: 32000,
          ...modelTuning(model, effort),
          // On an emission-nudge turn the model must write files as text, not
          // reach for the lint tool again. Changing tool_choice invalidates
          // the conversation cache for this one request — acceptable, since
          // the alternative is a failed attempt.
          ...(forceTextOnly ? { tool_choice: { type: "none" } } : {}),
          system: systemBlocks,
          tools,
          messages,
        },
        iterLabel,
      );
      forceTextOnly = false;

      const u = response.usage ?? {};
      uncachedInputTokens += u.input_tokens ?? 0;
      cacheReadInputTokens += u.cache_read_input_tokens ?? 0;
      cacheCreationInputTokens += u.cache_creation_input_tokens ?? 0;
      outputTokens += u.output_tokens ?? 0;

      // Per-turn usage incl. cache hits, so we can confirm the sliding cache
      // breakpoint is working (cache_read should grow across turns). For
      // reasoning models, thinking tokens reveal turns where the model is
      // composing content internally instead of emitting it as text.
      const thinkingTokens = u.output_tokens_details?.thinking_tokens;
      console.log(
        `[${iterLabel}] turn ${turns} usage: in=${u.input_tokens ?? 0} out=${u.output_tokens ?? 0} ` +
          `cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0}` +
          (thinkingTokens != null ? ` thinking=${thinkingTokens}` : "") +
          ` stop=${response.stop_reason}`,
      );

      // Extract text blocks from this turn
      const textBlocks = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text);
      allTextParts.push(...textBlocks);

      // Write whatever files the agent has produced so far to disk, so a lint
      // tool call later in this turn can read them from disk instead of the
      // agent pasting the whole source back as an argument. Revised files
      // overwrite earlier versions.
      const emittedSoFar = parseFiles(allTextParts.join("\n"));
      if (emittedSoFar.length > 0) {
        // A repair turn emits only what it changed: write over the project,
        // never clear it. Clearing deleted every unchanged file mid-turn.
        await writeProjectFiles(projectDir, emittedSoFar, { clear: !repairTurn });
      }

      // Extract tool_use blocks
      const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");

      // The model stopped without calling tools, so it thinks it is done. If
      // package.json is missing, the project only exists in its reasoning. Ask
      // for the files in this same conversation, where that work still is,
      // rather than failing and starting over.
      if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
        // A repair emits only the files it changed, so a missing package.json
        // is expected there. Nudging for it asked the agent to "write out EVERY
        // project file", and every repair turn in the 2026-09-23 runs obeyed —
        // re-emitting the whole project and once hitting the output cap. A
        // repair is only nudged when it emitted nothing at all.
        const hasScaffold = repairTurn
          ? emittedSoFar.length > 0
          : emittedSoFar.some((f) => f.path === "package.json");
        if (!hasScaffold && emissionNudges < MAX_EMISSION_NUDGES && turns < MAX_TOOL_TURNS) {
          emissionNudges++;
          const status = emittedSoFar.length
            ? `only ${emittedSoFar.length} ---FILE: block(s) (${emittedSoFar.map((f) => f.path).join(", ")}) and no package.json`
            : "ZERO ---FILE: blocks";
          console.log(
            `[${iterLabel}] Turn ended with ${status} — emission nudge ${emissionNudges}/${MAX_EMISSION_NUDGES}`,
          );
          messages.push({ role: "assistant", content: response.content });
          messages.push({
            role: "user",
            content: [
              {
                type: "text",
                text: repairTurn
                  ? "STOP: your visible text output contains ZERO ---FILE: blocks. Files composed in your reasoning were NOT output — the harness receives only the text you write. Output the files you changed for this fix, and only those, as complete `---FILE: path--- … ---END FILE---` blocks. No tool calls. No summary."
                  : `STOP: your visible text output contains ${status}. Files composed in your reasoning were NOT output — the harness receives only the text you write. Nothing is persisted after your response ends, and nothing you passed to tools was saved. Write out EVERY project file now — package.json, tsconfig.json, vite.config.ts, index.html, src/main.tsx, src/App.tsx, and every component/view — as complete \`---FILE: path--- … ---END FILE---\` blocks. No tool calls. No summary. Only the files.`,
              },
            ],
          });
          forceTextOnly = true;
          continue;
        }

        if (
          !repairTurn &&
          hasScaffold &&
          groundingCheck &&
          !isGroundedByToolLog(groundingCheck, toolLog) &&
          groundingNudges < MAX_GROUNDING_NUDGES &&
          turns < MAX_TOOL_TURNS
        ) {
          groundingNudges++;
          console.log(
            `[${iterLabel}] Scaffold emitted with ZERO component lookups — grounding nudge ${groundingNudges}/${MAX_GROUNDING_NUDGES}`,
          );
          messages.push({ role: "assistant", content: response.content });
          messages.push({
            role: "user",
            content: [{ type: "text", text: groundingCheck.nudge }],
          });
          continue;
        }

        console.log(
          `[${iterLabel}] Generation complete after ${turns} turn(s), ${toolLog.length} tool call(s)`,
        );
        break;
      }

      // The model wants to call tools — process each one
      // First, add the assistant's full response to the conversation
      messages.push({ role: "assistant", content: response.content });

      // Build the tool results
      const toolResults = [];
      for (const toolUse of toolUseBlocks) {
        const toolName = toolUse.name;
        const toolInput = toolUse.input || {};

        const callKey = `${toolName}:${JSON.stringify(toolInput)}`;
        const isDuplicate = seenToolCalls.has(callKey);
        seenToolCalls.add(callKey);

        if (isDuplicate) {
          duplicateStreak++;
        } else {
          duplicateStreak = 0;
        }

        console.log(
          `[${iterLabel}] Tool call: ${toolName}(${JSON.stringify(toolInput).slice(0, 100)})${isDuplicate ? " [DUPLICATE]" : ""}`,
        );

        let resultText;
        if (isDuplicate) {
          // Don't re-call the MCP server for duplicate requests — return a hint instead
          resultText = `You already called ${toolName} with these exact arguments. The result has not changed. Stop repeating tool calls and proceed to generate the project files.`;
        } else if (cliTool && toolName === cliTool.name) {
          // The CLI executor never throws (see runCliTool's doc comment) —
          // a failed/timed-out command already comes back as descriptive
          // text, so no try/catch needed here unlike the MCP branch below.
          resultText = await runCliTool(
            cliConfig,
            toolInput,
            resolveCliCwd(cliConfig, projectDir),
            projectDir,
          );
        } else {
          try {
            resultText = await mcpClient.callToolText(toolName, toolInput);
          } catch (err) {
            resultText = `Error calling ${toolName}: ${err.message}`;
            console.warn(`[${iterLabel}] Tool error: ${err.message}`);
          }
        }

        toolLog.push({
          turn: turns,
          tool: toolName,
          input: toolInput,
          // Full response text so post-hoc analysis can correlate
          // tool findings with the agent's subsequent code changes.
          // `resultLength` is retained as a quick-look field for
          // filtering.
          resultText,
          resultLength: resultText.length,
          isDuplicate,
        });

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: resultText,
        });
      }

      // Add tool results as the next user message
      messages.push({ role: "user", content: toolResults });
    }

    if (turns >= MAX_TOOL_TURNS) {
      console.warn(`[${iterLabel}] Hit max tool turns (${MAX_TOOL_TURNS}) — forcing completion`);
    }

    // Save tool log for debugging. Fix-loop calls pass their own name so a
    // repair turn's lookups don't overwrite the initial generation's log.
    if (toolLog.length > 0) {
      await writeFile(resolve(iterDir, toolLogName), JSON.stringify(toolLog, null, 2), "utf-8");
    }

    return {
      fullText: allTextParts.join("\n"),
      uncachedInputTokens,
      cacheReadInputTokens,
      cacheCreationInputTokens,
      outputTokens,
    };
  } finally {
    // Always shut down the MCP server
    if (mcpClient) {
      await mcpClient.stop().catch(() => {});
    }
  }
}

// ─── Repair-loop gate helpers ────────────────────────────────────────────────

const SOURCE_LINTABLE = /\.(t|j)sx?$/;

/**
 * Count lint errors by rule across all files, so the report can show which
 * rules fire most and which survive the fix loop.
 */
function countByRule(errorFiles) {
  const byRule = {};
  for (const f of errorFiles ?? []) {
    for (const m of f.messages ?? []) {
      const rule = m.ruleId || "unknown";
      byRule[rule] = (byRule[rule] ?? 0) + 1;
    }
  }
  return byRule;
}

/**
 * Turn a list of linted files into the gate's result.
 *
 * Shared by the MCP and CLI paths so the error-versus-warning rule lives in
 * one place. A CLI's own problem count must not be used instead: at least
 * one counts warnings too, which would hold up the build over advice.
 *
 * Only errors count. Anything auto-fixable has already been fixed by the
 * time this runs.
 */
export function summarizeLintFiles(lintFiles) {
  let warnings = 0;
  const errorFiles = [];
  for (const f of lintFiles ?? []) {
    const errs = (f.messages ?? []).filter((m) => m.severity === 2);
    warnings += (f.messages ?? []).length - errs.length;
    if (errs.length) errorFiles.push({ ...f, messages: errs });
  }
  const remaining = errorFiles.reduce((n, f) => n + f.messages.length, 0);
  // Findings the fix pass removed. Servers that don't report them give 0.
  const autofixed = (lintFiles ?? []).reduce((n, f) => n + (f.fixedMessages?.length ?? 0), 0);
  return { remaining, files: errorFiles, warnings, byRule: countByRule(errorFiles), autofixed };
}

/**
 * The agent's own lint use, read from a tool log: how many times it called
 * the lint tool, and how many findings the first call reported. Reads the
 * header dsds_lint writes ("N fixable automatically, M need a change").
 */
export function selfLintStats(toolLog, toolName) {
  const calls = (toolLog ?? []).filter((e) => e?.tool === toolName);
  if (!calls.length) return { selfLintCalls: 0, selfLintFindings: null };
  const head = String(calls[0].resultText ?? "").split("\n")[0];
  const num = (re) => Number(re.exec(head)?.[1] ?? 0);
  return {
    selfLintCalls: calls.length,
    selfLintFindings: num(/(\d+) fixable automatically/) + num(/(\d+) needs? a change/),
  };
}

/**
 * Lint the project through the MCP server and write the fixes to disk.
 *
 * `toolName` comes from the test's `mcp.lintTool` setting, because the
 * harness cannot know what a given server calls its lint tool. See
 * `runCliLintGate` for the CLI version and `summarizeLintFiles` for the
 * shared rules.
 */
/** selfLintStats for the first-generation tool log in an iteration folder. */
function selfLintStatsFor(iterDir, toolName) {
  if (!toolName) return { selfLintCalls: null, selfLintFindings: null };
  try {
    return selfLintStats(JSON.parse(readFileSync(resolve(iterDir, "_mcp_tool_log.json"), "utf-8")), toolName);
  } catch {
    return { selfLintCalls: 0, selfLintFindings: null };
  }
}

export async function runLintGate(lintClient, files, toolName) {
  const sources = files.filter((f) => SOURCE_LINTABLE.test(f.path));
  if (!sources.length) return { remaining: 0, files: [], warnings: 0 };
  let result;
  try {
    result = await lintClient.callTool(toolName, {
      apply: true,
      files: sources.map((f) => ({ path: f.path, filename: f.path })),
    });
  } catch (err) {
    return { remaining: 0, files: [], warnings: 0, error: err.message };
  }
  const sc = result?.structuredContent;
  if (!sc) return { remaining: 0, files: [], warnings: 0, unavailable: true };
  return summarizeLintFiles(sc.files);
}

/**
 * Lint the project through the test's CLI and write the fixes to disk. The
 * CLI version of `runLintGate`.
 *
 * A test opts in with `cli.lint: { args, parse }`. `args` builds the
 * command line from a list of file paths, and `parse` turns the output into
 * a list of linted files. The test owns both, because the harness cannot
 * know a given CLI's flags or output format.
 */
export async function runCliLintGate(cliConfig, files, projectDir) {
  const sources = files.filter((f) => SOURCE_LINTABLE.test(f.path));
  if (!sources.length) return { remaining: 0, files: [], warnings: 0 };
  const lint = cliConfig?.lint;
  if (!lint || typeof lint.args !== "function" || typeof lint.parse !== "function") {
    return { remaining: 0, files: [], warnings: 0, unavailable: true };
  }
  const paths = sources.map((f) => resolve(projectDir, f.path));
  const result = await execCliRaw(cliConfig, lint.args(paths), {
    cwd: resolveCliCwd(cliConfig, projectDir),
    projectDir,
    // Same injection the MCP lint client gets — see the doc comment above.
    extraEnv: { LINT_SOURCE_DIR: projectDir },
  });
  if (result.spawnError) {
    return { remaining: 0, files: [], warnings: 0, error: result.spawnError };
  }
  // A lint CLI exits non-zero BY DESIGN when it finds problems (dsds-mcp's
  // uses 2 for "ran but found problems"), so exit status alone can't
  // distinguish "found violations" from "failed to run". Trust the parser:
  // if stdout parses, the run was real.
  try {
    return summarizeLintFiles(lint.parse(result.stdout));
  } catch (err) {
    return {
      remaining: 0,
      files: [],
      warnings: 0,
      error: `could not parse lint output: ${err.message}`,
    };
  }
}

/**
 * Build the prompt asking the agent to fix the lint problems that could not
 * be fixed automatically.
 *
 * It tells the agent to change as little as possible, the same as the
 * accessibility prompt. Both run only after the page is confirmed working,
 * so a broad rewrite here can only make things worse. A short instruction
 * was not enough on its own; models ignored it until it said why.
 */
export function buildLintFixPrompt(lintFiles, currentFilesText) {
  const lines = [
    "The app ALREADY BUILDS AND RENDERS. It has ESLint violations that auto-fix could not resolve — auto-fixable issues are already applied on disk. Fix the remaining ones below.",
    "",
    "CRITICAL — the build is working; do NOT regress it. Make the SMALLEST possible change that clears each violation:",
    "- Change ONLY what the violation names, on the line it names.",
    "- Do NOT rewrite files wholesale, do NOT refactor, and do NOT touch imports, types, or component APIs unrelated to the violations. Re-emitting a working file with an unrelated change (a hallucinated import, a renamed prop, a prop value the types reject) is how a passing build gets broken.",
    "- Do NOT re-emit project scaffold files — `package.json`, `tsconfig.json`, `vite.config.*`, `index.html`, entry points — unless a violation is actually reported IN one of them. They are already correct and every needless rewrite risks the build.",
    "- Re-emit ONLY the files you actually change. Leave every other file exactly as-is.",
    "- If a fix requires a prop, value, or API you are not certain of, verify it before writing it rather than guessing — a wrong value fails the type check and costs the whole repair budget.",
    "",
    "## Current Project Files",
    "",
    currentFilesText,
    "",
    "## Remaining lint violations",
    "",
  ];
  for (const f of lintFiles) {
    lines.push(`### ${f.filename}`);
    for (const m of f.messages)
      lines.push(`- \`${m.ruleId ?? "lint"}\` (line ${m.line}): ${m.message}`);
    lines.push("");
  }
  lines.push(
    "Fix every violation above and nothing else. Output ONLY the files you changed, each as a complete `---FILE: path---` / `---END FILE---` block, and change nothing in them beyond what the violations above require.",
  );
  return lines.join("\n");
}

/**
 * Fix prompt for Jev findings — design-system guidelines a linter cannot decide.
 *
 * Unlike lint, a finding here carries no line number: the judgment is about
 * the file, not a token in it. So the prompt leads with the guideline's own
 * statement, which is the actionable part, and names the file to look in.
 *
 * The probability is deliberately NOT shown. It is a calibration artefact for
 * the report; an agent given "0.83" will argue with it or treat it as a
 * priority ranking. Only findings above their item's calibrated threshold and
 * marked surfaceable reach this function at all — by the time a finding is
 * here, it has already earned being stated as fact.
 */
export function buildJevFixPrompt(findingsByFile, currentFilesText) {
  const lines = [
    "The app ALREADY BUILDS AND RENDERS. It departs from design-system guidelines that the linter cannot check. Fix the departures below.",
    "",
    "CRITICAL — the build is working; do NOT regress it. Make the SMALLEST possible change that satisfies each guideline:",
    "- Change ONLY what the guideline requires, in the file named.",
    "- Do NOT rewrite files wholesale, do NOT refactor, and do NOT touch imports, types, or component APIs unrelated to the guidelines below.",
    "- Do NOT re-emit project scaffold files — `package.json`, `tsconfig.json`, `vite.config.*`, `index.html`, entry points.",
    "- Re-emit ONLY the files you actually change.",
    "- If a guideline names a prop or component you are not certain of, verify it against the design system before writing it. A guessed prop fails the type check and costs the whole repair budget.",
    "",
    "## Current Project Files",
    "",
    currentFilesText,
    "",
    "## Guideline departures",
    "",
  ];
  for (const { file, items } of findingsByFile) {
    lines.push(`### ${file}`);
    for (const f of items) {
      lines.push(`- ${f.statement}${f.entity ? ` (\`${f.entity}\`)` : ""}`);
    }
    lines.push("");
  }
  lines.push(
    "Fix every departure above and nothing else. Output ONLY the files you changed, each as a complete `---FILE: path---` / `---END FILE---` block.",
  );
  return lines.join("\n");
}

/** Fix prompt for axe violations — names what to change, where, and why. */
function buildA11yFixPrompt(axeViolations, currentFilesText) {
  const lines = [
    "The app ALREADY BUILDS AND RENDERS. axe-core found accessibility violations. Fix each one in the component code that renders the offending element.",
    "",
    "CRITICAL — the build is working; do NOT regress it. Make the SMALLEST possible change that resolves the violations:",
    "- Change ONLY what each violation requires (e.g. wrap content in a `<main>` landmark, add a label/alt/ARIA attribute, fix a contrast value).",
    "- Do NOT rewrite files wholesale, do NOT refactor, and do NOT touch imports, types, or component APIs that are unrelated to the violations. Re-emitting a working file with an unrelated change (a hallucinated import, a renamed prop) is how a passing build gets broken.",
    "- Re-emit ONLY the files you actually change. Leave every other file exactly as-is.",
    "",
    "## Current Project Files",
    "",
    currentFilesText,
    "",
    "## Accessibility violations (axe-core, WCAG)",
    "",
  ];
  for (const v of axeViolations) {
    lines.push(
      `### ${v.id} — impact: ${v.impact ?? "n/a"}${v.modes ? ` (${v.modes.join("/")} mode)` : ""}`,
    );
    lines.push(`- What: ${v.help}`);
    if (v.description) lines.push(`- Why: ${v.description}${v.helpUrl ? ` — ${v.helpUrl}` : ""}`);
    const n = (v.nodes ?? [])[0];
    if (n) {
      lines.push(`- Where: \`${(n.target ?? []).join(" ")}\` → \`${n.html}\``);
      if (n.failureSummary) lines.push(`- How: ${n.failureSummary.replace(/\s*\n\s*/g, " ")}`);
    }
    if ((v.nodeCount ?? 1) > 1)
      lines.push(`- (${v.nodeCount} elements affected — fix the pattern, not just one.)`);
    lines.push("");
  }
  lines.push(
    "Add a label, landmark, alt text, ARIA attribute, or fix contrast as appropriate — nothing more. Output ONLY the files you changed, each as a complete `---FILE: path---` / `---END FILE---` block, and change nothing in them beyond what the violations above require.",
  );
  return lines.join("\n");
}

/**
 * One repair turn: prompt the agent, then write the fixed files to disk.
 * `logNote` adds an optional line to the prompt's header, which the build
 * stage uses to record the error it is fixing.
 *
 * Repair turns get the same tools the first generation had. Without them,
 * a fix attempt has to guess at the same API it just got wrong.
 */
/**
 * Project scaffold. These are written once by the generation step and are
 * proven working by the time any post-render gate runs.
 */
const SCAFFOLD = new Set([
  "package.json",
  "tsconfig.json",
  "tsconfig.node.json",
  "vite.config.ts",
  "vite.config.js",
  "index.html",
  "src/main.tsx",
  "src/main.jsx",
]);

/** Gates that run only after the page has rendered successfully. */
const POST_RENDER_STAGES = new Set(["lint", "jev", "accessibility"]);

/**
 * Drop scaffold rewrites from a post-render repair.
 *
 * Every fix prompt already tells the agent not to re-emit scaffold files.
 * Models ignore it. Measured 2026-09-22 on one run: a lint fix re-emitted 24
 * files and a jev fix 15, both including `package.json`, `tsconfig.json`,
 * `vite.config.ts`, `index.html` and `main.tsx` — the jev one introduced 12
 * TypeScript errors and cost three build-recovery rounds.
 *
 * Scoped to post-render stages on purpose. A build repair may legitimately
 * need `package.json` (a missing dependency) or `tsconfig.json`; lint, jev
 * and accessibility repairs run only once the page already renders, so a
 * scaffold rewrite there can fix nothing that was broken and can break
 * something that worked.
 *
 * A file that does not yet exist is always allowed through — the guard is
 * against rewrites, not against creating something genuinely missing.
 *
 * @returns {{kept: Array, dropped: string[]}}
 */
export function guardRepairScope(parsed, stage, existingPaths) {
  if (!POST_RENDER_STAGES.has(stage)) return { kept: parsed, dropped: [] };
  const kept = [];
  const dropped = [];
  for (const f of parsed) {
    if (SCAFFOLD.has(f.path) && existingPaths.has(f.path)) dropped.push(f.path);
    else kept.push(f);
  }
  return { kept, dropped };
}

async function runRepair({
  client,
  model,
  fixSystemPrompt,
  fixPrompt,
  files,
  projectDir,
  iterDir,
  iterLabel,
  agentLogPath,
  stage,
  attempt,
  maxFixes,
  logNote = "",
  effort = null,
  mcpConfig = null,
  cliConfig = null,
}) {
  await appendFile(
    agentLogPath,
    `=== FIX (${stage}) ${attempt}/${maxFixes} — PROMPT [${new Date().toISOString()}] ===\n${logNote ? logNote + "\n" : ""}\n${fixPrompt}\n\n`,
    "utf-8",
  );
  // Each tool opts into (or out of) the fix loop independently — a test
  // could in principle want its CLI available during repair but not its
  // (heavier, stateful) MCP server, or vice versa.
  const repairMcpConfig = mcpConfig && mcpConfig.fixLoop !== false ? mcpConfig : null;
  const repairCliConfig = cliConfig && cliConfig.fixLoop !== false ? cliConfig : null;
  const useTools = Boolean(repairMcpConfig) || Boolean(repairCliConfig);
  const resp = useTools
    ? await generateWithTools({
        client,
        model,
        promptContent: fixPrompt,
        baseSystemPrompt: fixSystemPrompt,
        iterDir,
        iterLabel,
        mcpConfig: repairMcpConfig,
        cliConfig: repairCliConfig,
        projectDir,
        effort,
        // Repair turns keep the tools but not the getting-started briefing —
        // see `frontloadInstructions` in generateWithTools for the measured
        // reason (repair rounds were re-running discovery instead of
        // reading the error).
        frontloadInstructions: false,
        repairTurn: true,
        toolLogName: `_mcp_tool_log_fix_${stage}_${attempt}.json`,
      })
    : await generateSimple({
        client,
        model,
        promptContent: fixPrompt,
        systemPrompt: fixSystemPrompt,
        effort,
      });
  const fixText = resp.fullText;
  await writeFile(resolve(iterDir, `_fix_response_${attempt}.txt`), fixText, "utf-8");
  const parsed = parseFiles(fixText);
  await appendFile(
    agentLogPath,
    `=== FIX (${stage}) ${attempt} — RESPONSE [${new Date().toISOString()}] ===\nFiles: ${parsed.map((f) => f.path).join(", ") || "(none)"}\n\n${fixText}\n\n`,
    "utf-8",
  );
  const { kept, dropped } = guardRepairScope(parsed, stage, new Set(files.map((f) => f.path)));
  if (dropped.length) {
    // Agents sometimes emit the same file block twice in one response, so
    // report distinct files and note the block count when they differ.
    const distinct = [...new Set(dropped)];
    const extra = dropped.length > distinct.length ? ` (${dropped.length} blocks)` : "";
    console.log(
      `${tag(iterLabel)} ${warn(`⚠ Ignored ${distinct.length} scaffold rewrite(s)${extra} in the ${stage} fix: ${distinct.join(", ")}`)}`,
    );
    await appendFile(
      agentLogPath,
      `=== FIX (${stage}) ${attempt} — SCOPE GUARD ===\nDropped scaffold rewrites: ${dropped.join(", ")}\n\n`,
      "utf-8",
    );
  }
  let updated = files;
  if (kept.length) {
    updated = [...files];
    for (const fx of kept) {
      const i = updated.findIndex((f) => f.path === fx.path);
      if (i >= 0) updated[i] = fx;
      else updated.push(fx);
    }
    await writeProjectFiles(projectDir, updated);
  }
  return { files: updated, produced: kept.length > 0, usage: resp, droppedScaffold: dropped };
}

/**
 * Run a single isolated agent iteration using the Anthropic SDK.
 * Iterates: generate → validate → fix → validate → ... until the page renders
 * or MAX_FIX_ATTEMPTS is exhausted.
 *
 * @param {object} opts
 * @param {string} opts.promptContent - The full prompt text
 * @param {string} opts.model - The Claude model to use
 * @param {string} opts.iterDir - Directory for this iteration's output
 * @param {string} opts.iterLabel - Label for logging
 * @param {boolean} opts.takeScreenshots - Whether to take screenshots
 * @param {string}  opts.testLabel - Which test is being run
 * @param {object | null} opts.mcpConfig - The test's `mcp` block (null = no MCP)
 * @param {object | null} opts.cliConfig - The test's `cli` block (null = no
 *   agent-facing CLI tool). Independent of `mcpConfig` — see `pipeline/cli-tool.js`.
 * @returns {Promise<object>} Result metrics
 */
export async function runAgent({
  promptContent,
  model,
  iterDir,
  iterLabel,
  testLabel,
  takeScreenshots,
  maxFixes = 5,
  // 0 by default — an iteration completes at a successful render. See
  // the `--max-lint-fixes` flag in index.js for the full rationale.
  maxLintFixes = 0,
  jevConfig = null,
  maxGenerationRetries = 3,
  // When false (CLI `--no-fix-accessibility`), axe still runs and violations
  // are measured/recorded, but the agent is never sent back to fix them — no
  // fix budget is spent on a11y and an a11y repair can't regress the build.
  fixAccessibility = true,
  // Per-test `measure.*` toggles (config.js), all default true. Screenshots
  // still degrade gracefully when off — DOM count/semantic HTML are
  // unaffected, and the report/visual-diff simply see no screenshot path.
  measureScreenshots = true,
  measurePerformance = true,
  // Per-test `effort` setting, applied only to models that accept it. It also
  // controls whether reasoning-model instructions appear in the system
  // prompt, so those stay scoped to the models they are written for.
  effort = null,
  mcpConfig = null,
  // Test-supplied `cli` block (config.js) — see `pipeline/cli-tool.js`.
  // Independent of `mcpConfig`: a test can set either, both, or neither.
  cliConfig = null,
  // Patterns from the test's `renderFailureSignatures`, matched against the
  // page's visible text. Catches a library printing its own error message on
  // the page instead of throwing: nothing looks wrong to the render check,
  // but the app is broken. Empty by default.
  renderFailureSignatures = [],
  // The test's `minStylesheetRules` floor: how many CSS rules a working page
  // must have. Catches a stylesheet build step that never ran, which leaves
  // valid HTML with browser-default styling and no error anywhere. 0 turns
  // the check off.
  minStylesheetRules = 0,
}) {
  const systemPrompt = getSystemPrompt(testLabel, model);
  const fixSystemPrompt = getFixSystemPrompt(testLabel);
  // Per-model request overrides (e.g. Fable's effort cap in modelTuning())
  // are recorded in _meta.json and the report, so tuned results are never
  // mistaken for default-settings results when comparing models.
  const tuning = modelTuning(model, effort);
  const tuningNote = Object.keys(tuning).length > 0 ? tuning : null;
  // Generation can take a few minutes per call. The default timeout and retry
  // count allow up to half an hour for one call, so shorten both to stop a
  // slow call from holding up the whole run.
  //
  // A model name with a colon in it is an Ollama tag, not a Claude model, so
  // route it to the local client instead.
  const client = isLocalModel(model)
    ? createOllamaClient()
    : new Anthropic({
        timeout: 15 * 60 * 1000, // 15 minutes
        maxRetries: 1,
      });

  const needsTools = Boolean(mcpConfig) || Boolean(cliConfig);

  // Save the fully-resolved prompt for this iteration so it can be inspected
  // later to confirm every iteration received the same brief.
  await writeFile(resolve(iterDir, "_prompt.txt"), promptContent, "utf-8");

  // --- Step 1: Initial generation (with retries if no files are produced) ---
  let fullText = "";
  let files = [];
  let generationAttempt = 0;

  // Track token usage across all calls (including generation retries
  // and fix attempts). Four buckets, kept separate so the report can
  // show the prompt-cache breakdown rather than collapsing it.
  let totalUncachedInputTokens = 0;
  let totalCacheReadInputTokens = 0;
  let totalCacheCreationInputTokens = 0;
  let totalOutputTokens = 0;
  const addUsage = (u) => {
    totalUncachedInputTokens += u.uncachedInputTokens ?? 0;
    totalCacheReadInputTokens += u.cacheReadInputTokens ?? 0;
    totalCacheCreationInputTokens += u.cacheCreationInputTokens ?? 0;
    totalOutputTokens += u.outputTokens ?? 0;
  };

  // How many times `npm install` failed across the iteration's validation
  // cycles. Reported by `validateProject` via `result.installFailed`.
  // Aggregated at the report layer to surface dependency-resolution
  // problems separately from real code-error fixes.
  let npmInstallFailures = 0;
  // How many validation cycles hit a transient toolchain flake (tsc failure
  // contradicting on-disk state, healed by one retry). Reported via
  // `result.tscFlaked` so infra noise is subtractable from agent errors.
  let tscFlakes = 0;
  // Type checks that failed because the agent wrote a broken tsconfig, rather
  // than because the code is wrong. Counted separately so a run full of
  // scaffolding mistakes does not look like one full of real bugs.
  let tsconfigErrors = 0;
  const trackInstall = (v) => {
    if (v?.installFailed) npmInstallFailures++;
    if (v?.tscFlaked) tscFlakes++;
    if (v?.tsconfigError) tsconfigErrors++;
  };

  const agentLogPath = resolve(iterDir, "_agent_log.txt");
  // Computed up front so the MCP-enabled generation can write the agent's
  // files here as they are emitted, enabling lint-by-path during generation.
  const projectDir = resolve(iterDir, "project");

  let rejectReason = "";
  while (generationAttempt < maxGenerationRetries) {
    generationAttempt++;

    let retryNotice = "";
    if (generationAttempt > 1) {
      console.log(
        `[${iterLabel}] Generation attempt ${generationAttempt}/${maxGenerationRetries} (previous attempt produced no files)...`,
      );
      // Attempts must not see each other's files. Files left behind by a failed
      // attempt would lint clean here, which teaches the model that files it
      // never wrote out somehow persist, so it stops writing them out at all.
      await rm(projectDir, { recursive: true, force: true });
      // Keep the failed attempt's artifacts for post-hoc analysis instead of
      // letting the next attempt overwrite them.
      const prev = generationAttempt - 1;
      await rename(
        resolve(iterDir, "_raw_response.txt"),
        resolve(iterDir, `_raw_response.attempt-${prev}.txt`),
      ).catch(() => {});
      await rename(
        resolve(iterDir, "_mcp_tool_log.json"),
        resolve(iterDir, `_mcp_tool_log.attempt-${prev}.json`),
      ).catch(() => {});
      retryNotice =
        `\n\n# RETRY NOTICE — attempt ${generationAttempt} of ${maxGenerationRetries}\n` +
        `Your previous response was REJECTED: ${rejectReason}. Nothing from it was kept — ` +
        `the project directory is now EMPTY. A file exists ONLY if your response text ` +
        "contains it as a `---FILE: path---` … `---END FILE---` block. Tool calls do not " +
        `persist files, and no persistence happens after your response ends. Emit EVERY ` +
        `project file (package.json, tsconfig.json, vite.config.ts, index.html, ` +
        `src/main.tsx, src/App.tsx, and every component) as ---FILE: blocks now.`;
    }

    const attemptPrompt = promptContent + retryNotice;

    let result;
    if (needsTools) {
      result = await generateWithTools({
        client,
        model,
        promptContent: attemptPrompt,
        baseSystemPrompt: systemPrompt,
        iterDir,
        iterLabel,
        mcpConfig,
        cliConfig,
        projectDir,
        effort,
      });
    } else {
      result = await generateSimple({
        client,
        model,
        promptContent: attemptPrompt,
        systemPrompt,
        effort,
      });
    }

    addUsage(result);
    fullText = result.fullText;

    // Save raw response
    await writeFile(resolve(iterDir, "_raw_response.txt"), fullText, "utf-8");

    // Start (attempt 1) or extend (retries) the cumulative agent log, so
    // every generation attempt's response text survives for post-hoc analysis.
    const attemptHeader =
      generationAttempt === 1
        ? `=== INITIAL GENERATION [${new Date().toISOString()}] ===\n`
        : `=== GENERATION RETRY ${generationAttempt}/${maxGenerationRetries} [${new Date().toISOString()}] ===\n`;
    const attemptLog =
      attemptHeader +
      `Model: ${model}\n` +
      `Response length: ${fullText.length} bytes\n` +
      `Files parsed: ${parseFiles(fullText).length}\n\n` +
      fullText +
      "\n\n";
    if (generationAttempt === 1) {
      await writeFile(agentLogPath, attemptLog, "utf-8");
    } else {
      await appendFile(agentLogPath, attemptLog, "utf-8");
    }

    // Parse files from the response, deduplicating by path (keep last occurrence).
    // The agent sometimes emits a file twice mid-response when it revises its work.
    // Normalising here means the fix-merge loop (which uses findIndex) always sees
    // exactly one entry per path, so a fixed version is never silently overwritten.
    const rawFiles = parseFiles(fullText);
    const seenPaths = new Set();
    files = [...rawFiles]
      .reverse()
      .filter((f) => (seenPaths.has(f.path) ? false : seenPaths.add(f.path)))
      .reverse();

    // A generation is only usable if the model wrote out a whole project, which
    // means at least a package.json. Some models compose the project in their
    // head, decide it is fine, and send back only the one file they think they
    // changed. Everything below depends on package.json being there.
    const hasScaffold =
      files.some((f) => f.path === "package.json") &&
      files.some((f) => f.path === "src/main.tsx" || f.path === "src/main.jsx");

    if (files.length > 0 && (!takeScreenshots || hasScaffold)) {
      break;
    }

    rejectReason =
      files.length === 0
        ? "your response text contained ZERO ---FILE: blocks, so the harness parsed no files"
        : `partial project — got ${files.length} file(s), missing package.json or src/main.tsx (paths: ${files.map((f) => f.path).join(", ")})`;
    console.warn(
      `[${iterLabel}] Generation attempt ${generationAttempt}/${maxGenerationRetries} rejected: ${rejectReason} (response: ${fullText.length} bytes)`,
    );
  }

  // After all retries: if we STILL have no files at all, or (when
  // screenshots are on) still no scaffold, the iteration is a genuine
  // failure. Throwing surfaces it as a real error rather than the
  // former silent "one-file iteration with no measurements" no-op.
  const finalHasScaffold =
    files.some((f) => f.path === "package.json") &&
    files.some((f) => f.path === "src/main.tsx" || f.path === "src/main.jsx");
  if (files.length === 0) {
    throw new Error(
      `All ${maxGenerationRetries} generation attempts returned no parseable files. Raw response was ${fullText.length} bytes.`,
    );
  }
  if (takeScreenshots && !finalHasScaffold) {
    const paths = files.map((f) => f.path).join(", ");
    throw new Error(
      `All ${maxGenerationRetries} generation attempts produced a partial project (no package.json or main.tsx). Got: ${paths}. The model likely treated the initial run as a fix-only response and skipped the scaffold.`,
    );
  }

  const feedback = parseFeedback(fullText);

  if (feedback.length > 0) {
    console.log(`[${iterLabel}] Extracted ${feedback.length} feedback item(s)`);
    await writeFile(resolve(iterDir, "_feedback.json"), JSON.stringify(feedback, null, 2), "utf-8");
  }
  await writeProjectFiles(projectDir, files);

  // Track fix attempts
  let fixAttempts = 0;
  const fixLog = [];

  // Per-iteration snapshot of file hashes from the previous fix
  // attempt. Used by buildCurrentFilesText to elide unchanged-and-
  // not-error-referenced files into a manifest on attempts ≥ 2.
  let previousFileHashes = null;

  // --- Step 2: ordered, bounded repair loop — lint → build → accessibility ---
  if (takeScreenshots && files.some((f) => f.path === "package.json")) {
    // Lint and a11y gate the React-code path (all agents write React directly).
    const gateLintAndA11y = true;
    let exitStage = null;
    let firstTryLint = null;
    let firstTryAxe = null;
    let residualLint = null;
    let residualAxe = null;
    // Remember the last working render. Once the app renders, the final result
    // must never be worse than that. An accessibility fix can rewrite a file
    // and break the build again, which would score the iteration below what it
    // already achieved. If the loop later runs out of attempts with a broken
    // build, we fall back to this snapshot.
    let lastGoodFiles = null;
    let lastGoodAxe = null;
    // Lint has two halves that behave differently:
    //  - Auto-fixable rules are a mechanical code transform, not an agent
    //    rewrite, so they are safe to apply to any code at any point. They run
    //    at the top of every pass.
    //  - Everything else needs the agent to make the change, which risks
    //    breaking a working build, so it waits until the page renders.
    let lintFixAttempts = 0;
    let lintSettled = false;
    // Jev gate state. Off unless a test configures it — it is the only gate
    // that calls a paid external API.
    const jevGateActive = Boolean(jevConfig?.enabled && jevConfig.toolDir);
    // Default 0: judge and record, do not repair. Measured 2026-09-22 on a
    // real run — the one surfaced finding triggered a repair that re-emitted
    // 15 files (the prompt named one), introduced 12 TypeScript errors, cost
    // three build-recovery rounds, and left three departures where there had
    // been one. Judging is cheap and safe; repairing inherits the harness's
    // existing over-emission problem. Opt in per test once that is fixed.
    const maxJevFixes = jevConfig?.maxFixes ?? 0;
    let jevFixAttempts = 0;
    let jevSettled = false;
    let jevResult = null;
    let firstTryJev = null;
    let residualJev = null;
    // Per-rule telemetry (P5): first-try vs residual eslint ruleId → count.
    // "First try" now means "the first post-render check", not "before any
    // build attempt" — a build that never renders has no shippable code to
    // report lint compliance for, so these stay null for build failures.
    let firstTryLintRules = null;
    // Lint split for the report: what the harness fixed automatically, and
    // whether the gate ran at all (null when the test has no lint gate).
    let lintAutofixed = 0;
    let lintGateStatus = null;
    let residualLintRules = null;

    // The lint gate is a harness step, not the agent's choice, and works over
    // either transport. It turns on when the test sets `mcp.lintTool` or
    // `cli.lint`. Without either, the harness has nothing to call, so it stays
    // off.
    let lintClient = null;
    if (gateLintAndA11y && mcpConfig && mcpConfig.lintTool) {
      try {
        lintClient = await createMcpClient({
          ...mcpConfig,
          env: (dir) => ({
            ...(typeof mcpConfig.env === "function" ? mcpConfig.env(dir) : (mcpConfig.env ?? {})),
            LINT_SOURCE_DIR: projectDir,
          }),
        });
      } catch (err) {
        console.warn(
          `${tag(iterLabel)} ${warn("⚠ Lint gate disabled (MCP failed to start):")} ${err.message}`,
        );
      }
    }
    // CLI-transport lint gate. No long-lived client to start — each pass is
    // one subprocess — so this is just a capability flag.
    const cliLintEnabled = Boolean(gateLintAndA11y && cliConfig && cliConfig.lint);
    if (cliLintEnabled) {
      console.log(`${tag(iterLabel)} Lint gate enabled via CLI`);
    }
    const lintGateActive = Boolean(lintClient) || cliLintEnabled;
    /** Run whichever lint transport this test configured. */
    const runConfiguredLintGate = () =>
      lintClient
        ? runLintGate(lintClient, files, mcpConfig.lintTool)
        : runCliLintGate(cliConfig, files, projectDir);

    try {
      while (true) {
        // Auto-fix pass, run every time on whatever was just written. It is a
        // mechanical transform rather than an agent rewrite, so it is safe even
        // before the build has ever worked. The result is kept so the check
        // after the render does not need a second call.
        let lastLintResult = null;
        if (lintGateActive) {
          const autofix = await runConfiguredLintGate();
          if (!autofix.unavailable && !autofix.error) {
            files = await readProjectFiles(projectDir, files); // pick up applied auto-fixes
            lastLintResult = autofix;
            lintAutofixed += autofix.autofixed ?? 0;
            lintGateStatus = "ran";
          } else if (lintGateStatus !== "ran") {
            // A gate that never ran must not read as "no findings" — that is
            // how a stale tool name hid for days (see checkMcpToolNames).
            lintGateStatus = autofix.error ? "error" : "unavailable";
            console.warn(
              `${tag(iterLabel)} ${warn(`⚠ Lint gate did not run (${autofix.error ?? "no structured result"}) — lint is unmeasured for this pass`)}`,
            );
          }
        }

        console.log(
          `[${iterLabel}] Validating project${fixAttempts > 0 ? ` (after fix #${fixAttempts})` : ""}...`,
        );

        const validation = await validateProject(projectDir, iterLabel, {
          renderFailureSignatures,
          minStylesheetRules,
        });
        trackInstall(validation);

        try {
          if (validation.success) {
            console.log(`${tag(iterLabel)} ${success("✓ Page renders successfully")}`);

            // Snapshot the working state now, before either gate below can send the
            // code back for a fix that breaks it. Taking this after the lint gate
            // would leave nothing to fall back to if a lint fix broke the build.
            lastGoodFiles = await readProjectFiles(projectDir, files);

            // Gate 2: the lint problems that need the agent, reached only once the
            // page renders. `lastLintResult` is from the top of this pass and is
            // still accurate, since nothing has written files since.
            if (!lintSettled && lintGateActive) {
              if (lastLintResult) {
                if (firstTryLint === null) {
                  firstTryLint = lastLintResult.remaining;
                  firstTryLintRules = lastLintResult.byRule ?? null;
                }
                residualLint = lastLintResult.remaining;
                residualLintRules = lastLintResult.byRule ?? null;
                if (lastLintResult.remaining > 0 && lintFixAttempts < maxLintFixes) {
                  lintFixAttempts++;
                  console.log(
                    `${tag(iterLabel)} ${warn(`✗ Lint: ${lastLintResult.remaining} error(s) (lint fix ${lintFixAttempts}/${maxLintFixes})${lastLintResult.warnings ? `, ${lastLintResult.warnings} warning(s) ignored` : ""}`)}`,
                  );
                  fixLog.push({
                    attempt: lintFixAttempts,
                    stage: "lint",
                    remaining: lastLintResult.remaining,
                    rules: lastLintResult.byRule ?? undefined,
                  });
                  // Files that have not changed are normally replaced by a one-line
                  // summary to save tokens. Files with violations must be sent in full
                  // anyway, or the agent is told about a problem in a file it cannot see.
                  const lintReferencedPaths = [
                    ...new Set((lastLintResult.files ?? []).map((f) => f.filename ?? f.path)),
                  ];
                  const { text: lintFilesText, newHashes } = await buildCurrentFilesText(
                    projectDir,
                    files,
                    { previousHashes: previousFileHashes, errorReferencedPaths: lintReferencedPaths },
                  );
                  previousFileHashes = newHashes;
                  const fix = await runRepair({
                    client,
                    model,
                    fixSystemPrompt,
                    fixPrompt: buildLintFixPrompt(lastLintResult.files, lintFilesText),
                    files,
                    projectDir,
                    iterDir,
                    agentLogPath,
                    stage: "lint",
                    attempt: lintFixAttempts,
                    maxFixes: maxLintFixes,
                    effort,
                    iterLabel,
                    mcpConfig,
                    cliConfig,
                  });
                  files = fix.files;
                  addUsage(fix.usage);
                  continue; // dev server is killed in the finally below
                }
                lintSettled = true;
                if (lastLintResult.remaining > 0) {
                  console.log(
                    `${tag(iterLabel)} ${warn(`⚠ Lint budget (${maxLintFixes}) spent with ${lastLintResult.remaining} error(s) remaining — proceeding to accessibility`)}`,
                  );
                }
              } else {
                // Gate unavailable/errored this pass — don't retry escalation.
                lintSettled = true;
              }
            }

            // ── Gate 2b: Jev ──
            // Runs after lint settles and before accessibility. It judges
            // source, like lint, so it belongs on this side of the render
            // gates — but it runs second because lint is free and
            // deterministic, and there is no point paying an API to look at
            // code that is about to be rewritten by a lint fix.
            if (jevGateActive && !jevSettled) {
              jevResult = await runJevGate(files, projectDir, {
                toolDir: jevConfig.toolDir,
                surfaceOnly: jevConfig.surfaceOnly !== false,
              });
              writeJevResults(iterDir, jevResult);
              if (!jevResult.unavailable && jevResult.unjudged?.length) {
                // Never silent: an unjudged file is a hole in the measurement,
                // not a clean file.
                console.log(
                  `${tag(iterLabel)} ${warn(`⚠ Jev: ${jevResult.unjudged.length} file(s) not judged after retries (${[...new Set(jevResult.unjudged.map((u) => u.error.slice(0, 40)))].join("; ")})`)}`,
                );
              }
              if (jevResult.unavailable) {
                console.log(
                  `${tag(iterLabel)} ${warn(`⚠ Jev gate unavailable (${jevResult.error}) — skipping`)}`,
                );
                jevSettled = true;
              } else {
                const count = jevResult.findings.length;
                if (firstTryJev === null) firstTryJev = count;
                residualJev = count;
                if (count > 0 && jevFixAttempts < maxJevFixes) {
                  jevFixAttempts++;
                  console.log(
                    `${tag(iterLabel)} ${warn(`✗ Jev: ${count} guideline departure(s) across ${jevResult.judged} file(s) (jev fix ${jevFixAttempts}/${maxJevFixes})`)}`,
                  );
                  const byFile = groupFindingsByFile(jevResult.findings);
                  fixLog.push({
                    attempt: jevFixAttempts,
                    stage: "jev",
                    findings: count,
                    guidelines: [...new Set(jevResult.findings.map((f) => f.guideline))],
                  });
                  // Same reasoning as the lint gate: a file named in a
                  // finding must be sent in full, or the agent is told about
                  // a problem in a file it cannot see.
                  const { text: jevFilesText, newHashes } = await buildCurrentFilesText(
                    projectDir,
                    files,
                    {
                      previousHashes: previousFileHashes,
                      errorReferencedPaths: byFile.map((g) => g.file),
                    },
                  );
                  previousFileHashes = newHashes;
                  const fix = await runRepair({
                    client,
                    model,
                    fixSystemPrompt,
                    fixPrompt: buildJevFixPrompt(byFile, jevFilesText),
                    files,
                    projectDir,
                    iterDir,
                    agentLogPath,
                    stage: "jev",
                    attempt: jevFixAttempts,
                    maxFixes: maxJevFixes,
                    effort,
                    iterLabel,
                    mcpConfig,
                    cliConfig,
                  });
                  files = fix.files;
                  addUsage(fix.usage);
                  continue; // dev server is killed in the finally below
                }
                jevSettled = true;
                if (count > 0 && maxJevFixes === 0) {
                  // Judge-only mode: not a spent budget, a deliberate choice.
                  console.log(
                    `${tag(iterLabel)} ${warn(`⚠ Jev: ${count} departure(s) recorded, not repaired (jev.maxFixes = 0)`)}`,
                  );
                } else if (count > 0) {
                  console.log(
                    `${tag(iterLabel)} ${warn(`⚠ Jev budget (${maxJevFixes}) spent with ${count} departure(s) remaining`)}`,
                  );
                } else if (jevResult.judged > 0) {
                  const gap = jevResult.unjudged?.length
                    ? `, ${jevResult.unjudged.length} not judged`
                    : "";
                  console.log(
                    `${tag(iterLabel)} ${success(`✓ Jev: no surfaceable departures (${jevResult.judged} file(s)${gap})`)}`,
                  );
                } else if (jevResult.unjudged?.length) {
                  // Every file failed at the API. Already warned above; this is
                  // an outage, not a misconfiguration.
                } else {
                  // Judging nothing is a misconfiguration, not a pass. Silence
                  // here once hid a gate that filtered every file out and
                  // looked exactly like a clean run.
                  console.log(
                    `${tag(iterLabel)} ${warn("⚠ Jev: judged 0 files — nothing matched, check the gate is receiving source files")}`,
                  );
                }
              }
            }

            // The accessibility gate runs after lint because it can also send the
            // code back for another fix. Taking the expensive measurements
            // (screenshots, DOM, Lighthouse) before that check wasted a full pass
            // on every render the gate then threw away.

            // Run accessibility tests against the live dev server
            const a11yResults = await runAccessibility(validation.serverUrl, iterDir, iterLabel);
            lastGoodAxe = a11yResults?.axeViolationCount ?? 0;

            // ── Gate 3: Accessibility (React-code path only) ──
            // The app builds; now axe must pass. Violations become fix
            // instructions and re-enter the loop under the shared fix budget.
            if (gateLintAndA11y && a11yResults && !a11yResults.summary?.skipped) {
              const axeCount = a11yResults.axeViolationCount ?? 0;
              if (firstTryAxe === null) firstTryAxe = axeCount;
              residualAxe = axeCount;
              // Axe is always measured above; `fixAccessibility` gates only the
              // repair. When off, violations are recorded but never sent back
              // to the agent — so no fix budget is spent and an a11y rewrite
              // can't regress the build.
              if (fixAccessibility && axeCount > 0 && fixAttempts < maxFixes) {
                fixAttempts++;
                exitStage = "accessibility";
                console.log(
                  `${tag(iterLabel)} ${warn(`✗ Accessibility: ${axeCount} violation(s) (fix ${fixAttempts}/${maxFixes})`)}`,
                );
                fixLog.push({
                  attempt: fixAttempts,
                  stage: "accessibility",
                  violations: a11yResults.axeViolations.map((v) => v.id),
                });
                // Files are always sent in full here. Accessibility violations name a
                // DOM element rather than a file, so there is no reliable way to work
                // out which files matter, and guessing would hide the file the agent
                // needs to fix.
                const { text: a11yFilesText, newHashes } = await buildCurrentFilesText(
                  projectDir,
                  files,
                );
                previousFileHashes = newHashes;
                const fix = await runRepair({
                  client,
                  model,
                  fixSystemPrompt,
                  fixPrompt: buildA11yFixPrompt(a11yResults.axeViolations, a11yFilesText),
                  files,
                  projectDir,
                  iterDir,
                  agentLogPath,
                  stage: "accessibility",
                  attempt: fixAttempts,
                  maxFixes,
                  effort,
                  iterLabel,
                  mcpConfig,
                  cliConfig,
                });
                files = fix.files;
                addUsage(fix.usage);
                continue; // dev server is killed in the finally below
              }
            }
            // Reaching here, lint passed and axe is clean or out of budget.
            // This is the final rendered state, so take the heavy measurements
            // exactly once — screenshots + DOM + semantic HTML, then Lighthouse
            // + React profiler (each runs its own browser).
            exitStage = gateLintAndA11y && (residualAxe ?? 0) > 0 ? "accessibility" : "clean";

            const { screenshotPath, domElementCount, domHtmlBytes, semanticHtml } =
              await runStaticMeasurements(validation.serverUrl, iterDir, iterLabel, {
                screenshots: measureScreenshots,
              });

            const { lighthouseResults, reactProfile } = measurePerformance
              ? await runPerformance(validation.serverUrl, iterDir, iterLabel)
              : { lighthouseResults: null, reactProfile: null };

            // Save any non-fatal console errors for reference
            if (validation.consoleErrors.length > 0) {
              await writeFile(
                resolve(iterDir, "_console_errors.txt"),
                validation.consoleErrors.join("\n"),
                "utf-8",
              );
            }

            // Collect final metrics
            files = await readProjectFiles(projectDir, files);

            const result = buildResult({
              files,
              model,
              modelTuning: tuningNote,
              iterDir,
              iterLabel,
              testLabel,
              screenshotPath,
              totalUncachedInputTokens,
              totalCacheReadInputTokens,
              totalCacheCreationInputTokens,
              totalOutputTokens,
              fixAttempts: fixAttempts + lintFixAttempts,
              fixLog,
              feedback,
              a11yResults,
              lighthouseResults,
              reactProfile,
              domElementCount,
              domHtmlBytes,
              semanticHtml,
              runner: "api",
              exitStage,
              firstTryLint,
              firstTryLintRules,
              lintAutofixed: lintGateStatus ? lintAutofixed : null,
              lintGateStatus,
              ...selfLintStatsFor(iterDir, mcpConfig?.lintTool),
              firstTryAxe,
              residualLint,
              residualLintRules,
              residualAxe,
              firstTryJev,
              residualJev,
              jevJudged: jevResult?.judged ?? null,
              jevUnjudged: jevResult ? (jevResult.unjudged?.length ?? 0) : null,
              jevInputTokens: jevResult?.inputTokens ?? null,
              npmInstallFailures,
              tscFlakes,
              tsconfigErrors,
            });
            return result;
          }

          // --- Validation (build) failed — attempt a fix ---
          if (fixAttempts >= maxFixes) {
            console.warn(
              `${tag(iterLabel)} ${error(`✗ Fix budget (${maxFixes}) exhausted with the BUILD still failing — giving up`)}`,
            );
            // Record this failure before giving up. Otherwise the last entry in the
            // log is the error that prompted the final fix, not the result of it,
            // and whatever actually went wrong last is never written down.
            fixLog.push({
              attempt: fixAttempts,
              stage: "build",
              final: true,
              errors: validation.consoleErrors,
              fatalError: validation.fatalError,
            });
            exitStage = "build";
            break;
          }

          exitStage = "build";
          fixAttempts++;
          const errorSummary = validation.fatalError || "Unknown error";
          console.log(
            `${tag(iterLabel)} ${warn(`✗ Build failed (build fix ${fixAttempts}/${maxFixes}):`)} ${errorSummary.split("\n")[0]}`,
          );

          const fixLogEntry = {
            attempt: fixAttempts,
            stage: "build",
            errors: validation.consoleErrors,
            fatalError: validation.fatalError,
          };
          fixLog.push(fixLogEntry);

          // Pull file paths mentioned in the error output so they're
          // always included in the fix prompt even when their hash
          // hasn't changed since the previous attempt. Matches `src/...`
          // and similar relative paths up to the next paren or colon.
          const errorText = [validation.fatalError || "", ...validation.consoleErrors].join("\n");
          const errorReferencedPaths = [
            ...new Set(
              (
                errorText.match(/(?:^|[\s(])([a-zA-Z0-9._/-]+\.(?:tsx?|jsx?|css|json|html))/g) || []
              ).map((m) => m.replace(/^[\s(]/, "")),
            ),
          ];

          // Build the fix prompt from the current files and errors. From the
          // second attempt on, files that have not changed and are not mentioned
          // in the error are replaced by a one-line summary to save tokens.
          //
          // That is skipped when the error names no project file at all, which
          // happens for browser errors that point at a bundled path or nowhere.
          // With nothing to match on, sending everything is the safe choice.
          const filesTextOpts =
            errorReferencedPaths.length > 0
              ? { previousHashes: previousFileHashes, errorReferencedPaths }
              : {};
          const { text: currentFilesText, newHashes } = await buildCurrentFilesText(
            projectDir,
            files,
            filesTextOpts,
          );
          previousFileHashes = newHashes;
          const fixPrompt = buildFixPrompt(
            currentFilesText,
            validation.consoleErrors,
            validation.fatalError,
          );

          console.log(`[${iterLabel}] Asking Claude to fix errors...`);
          const fix = await runRepair({
            client,
            model,
            fixSystemPrompt,
            fixPrompt,
            files,
            projectDir,
            iterDir,
            agentLogPath,
            stage: "build",
            attempt: fixAttempts,
            maxFixes,
            iterLabel,
            mcpConfig,
            cliConfig,
            logNote: `Fatal error: ${(validation.fatalError || "none").split("\n")[0]}\nConsole errors: ${validation.consoleErrors.length}`,
            effort,
          });
          files = fix.files;
          addUsage(fix.usage);
          if (!fix.produced) {
            console.warn(
              `[${iterLabel}] Claude returned no file blocks in fix response — re-validating unchanged project`,
            );
          }
        } finally {
          // Always kill the dev server between validation attempts.
          // `validation` is undefined if validateProject itself threw — guard
          // so the finally never masks the original error with a TypeError.
          killDevServer(validation?.devServer);
        }
      }

      // The loop ended with a broken build, but an earlier attempt worked and a
      // later fix broke it. Reporting the broken end state would score the
      // iteration below a build it already reached, so measure the last good
      // render instead.
      if (exitStage === "build" && lastGoodFiles) {
        console.warn(
          `${tag(iterLabel)} ${warn("A later fix regressed a previously-working build — restoring the last good render for the final result")}`,
        );
        await writeProjectFiles(projectDir, lastGoodFiles);
        files = lastGoodFiles;
        // Reflect the restored (rendering) state, not the discarded broken one.
        exitStage = (lastGoodAxe ?? 0) > 0 ? "accessibility" : "clean";
      }

      // Out of fix attempts. Whether a final measurement pass is worth doing
      // depends on where it stopped:
      //  - build: the page will not render, so skip everything. It saves
      //    starting a dev server and keeps broken-page numbers out of the
      //    report.
      //  - lint: lint never settled, so the build was never tested. Try once.
      //  - otherwise: an earlier render was restored above, so measure that.
      let screenshotPath = null;
      let lastDomElementCount = null;
      let lastDomHtmlBytes = null;
      let lastSemanticHtml = null;
      let lastA11y = null;

      if (exitStage === "build") {
        console.log(
          `${tag(iterLabel)} ${warn("Skipping final screenshot / measurements: build failed after max attempts")}`,
        );
      } else {
        console.log(`[${iterLabel}] Taking screenshot of final state...`);
        const lastValidation = await validateProject(projectDir, iterLabel, {
          renderFailureSignatures,
          minStylesheetRules,
        });
        trackInstall(lastValidation);
        try {
          if (lastValidation.success) {
            ({
              screenshotPath,
              domElementCount: lastDomElementCount,
              domHtmlBytes: lastDomHtmlBytes,
              semanticHtml: lastSemanticHtml,
            } = await runStaticMeasurements(lastValidation.serverUrl, iterDir, iterLabel, {
              screenshots: measureScreenshots,
            }));
            if (gateLintAndA11y) {
              lastA11y = await runAccessibility(lastValidation.serverUrl, iterDir, iterLabel);
              if (lastA11y && !lastA11y.summary?.skipped) {
                if (firstTryAxe === null) firstTryAxe = lastA11y.axeViolationCount ?? 0;
                residualAxe = lastA11y.axeViolationCount ?? 0;
              }
            }
          } else {
            console.log(
              `${tag(iterLabel)} ${warn("Skipping final screenshot / measurements: page did not render")}`,
            );
          }
          if (lastValidation.consoleErrors.length > 0) {
            await writeFile(
              resolve(iterDir, "_console_errors.txt"),
              lastValidation.consoleErrors.join("\n"),
              "utf-8",
            );
          }
        } finally {
          killDevServer(lastValidation?.devServer);
        }
      }

      files = await readProjectFiles(projectDir, files);
      return buildResult({
        files,
        model,
        modelTuning: tuningNote,
        iterDir,
        iterLabel,
        testLabel,
        screenshotPath,
        totalUncachedInputTokens,
        totalCacheReadInputTokens,
        totalCacheCreationInputTokens,
        totalOutputTokens,
        fixAttempts: fixAttempts + lintFixAttempts,
        fixLog,
        feedback,
        a11yResults: lastA11y,
        lighthouseResults: null,
        reactProfile: null,
        domElementCount: lastDomElementCount,
        domHtmlBytes: lastDomHtmlBytes,
        semanticHtml: lastSemanticHtml,
        runner: "api",
        exitStage,
        firstTryLint,
        firstTryLintRules,
        lintAutofixed: lintGateStatus ? lintAutofixed : null,
        lintGateStatus,
        ...selfLintStatsFor(iterDir, mcpConfig?.lintTool),
        firstTryAxe,
        residualLint,
        residualLintRules,
        residualAxe,
        firstTryJev,
        residualJev,
        jevJudged: jevResult?.judged ?? null,
        jevUnjudged: jevResult ? (jevResult.unjudged?.length ?? 0) : null,
        jevInputTokens: jevResult?.inputTokens ?? null,
        npmInstallFailures,
        tscFlakes,
        tsconfigErrors,
      });
    } finally {
      if (lintClient) await lintClient.stop().catch(() => {});
    }
  }

  // No screenshots requested or no package.json — just return metrics
  return buildResult({
    files,
    model,
    modelTuning: tuningNote,
    iterDir,
    iterLabel,
    testLabel,
    screenshotPath: null,
    totalUncachedInputTokens,
    totalCacheReadInputTokens,
    totalCacheCreationInputTokens,
    totalOutputTokens,
    fixAttempts,
    fixLog,
    feedback,
    a11yResults: null,
    lighthouseResults: null,
    reactProfile: null,
    domElementCount: null,
    domHtmlBytes: null,
    semanticHtml: null,
    runner: "api",
    npmInstallFailures,
    tscFlakes,
    tsconfigErrors,
  });
}
