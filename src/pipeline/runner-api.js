import { appendFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { isReasoningModel } from "../config/prompts.js";
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

// Max tool-use round-trips before we force the model to finish.
//
// Raised 25 -> 30 on 2026-09-11. The CLI arm was averaging ~22 turns with a
// long tail: two iterations across 22.22 and 23.10 reached 25 while still
// researching, emitted no ---FILE: blocks, and were regenerated from
// scratch — a wasted ~200-300k characters each. MCP arms sit near 13 and
// are unaffected by the raise.
const MAX_TOOL_TURNS = 30;

// The turn at which the loop starts telling the model to stop researching
// and emit. Deliberately NOT expressed as `MAX_TOOL_TURNS - 2`: raising the
// ceiling is meant to give a slow iteration room to land, not to let every
// iteration research five turns longer. Keeping the nudge where it has
// always been means behaviour up to turn 23 is unchanged from every run
// before the raise, and the extra turns are pure headroom past the warning.
const TOOL_TURN_NUDGE_AT = 23;

const API_CALL_MAX_RETRIES = 3;
const API_CALL_RETRY_DELAY_MS = 15_000; // 15 seconds

// How many times to demand file emission IN the same conversation when the
// model ends its turn without having emitted a scaffold. Reasoning models
// (observed with Fable) compose the whole project inside their never-returned
// thinking and end with a summary; the composed files are still in the
// model's context, so an in-conversation demand recovers them — a fresh
// retry attempt throws them away and repeats the same failure.
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

// Models that accept `output_config.effort` at the API level (per Anthropic's
// effort docs). Haiku (any generation), older Sonnet/Opus (4, 4.1), and any
// model not listed here reject the param outright — `modelTuning` never sends
// it to them, regardless of what a test config asks for. Fable/Mythos are
// listed for accuracy (they do accept the param) but never reach this check
// in practice — `modelTuning` hardcodes them to "medium" before this list is
// ever consulted; see the doc comment above `modelTuning`.
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
 * Extra request params for the model. `effort` is a per-test config override
 * (config.js `effort` field) — applied only when the model actually accepts
 * `output_config.effort`; silently omitted otherwise so an effort value set
 * for one model in a multi-model run never 400s against an unsupported one.
 *
 * Reasoning models (Fable/Mythos) are HARDCODED to "medium", ignoring any
 * test-level `effort` — validated end-to-end at this value; other levels are
 * untested and "low" reproduced the exact failure this cap exists to prevent
 * (2026-07-22: Fable at "low" abandoned file emission mid-generation and
 * summarized instead, crashing the iteration). Their adaptive thinking is
 * always on and cannot be disabled (`thinking: {type: "disabled"}` is
 * rejected); at "high" (the API default) Fable was separately observed
 * composing entire project files inside its thinking (never returned by the
 * API) and then "summarizing" instead of emitting them as ---FILE: blocks.
 * Every other supported model uses the test's configured `effort` as-is.
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
 * Whether a tool-call log satisfies a test's own grounding check —
 * `mcpConfig.groundingCheck` (see the doc comment above its use in
 * `generateWithTools`). A test that configures no `groundingCheck` is always
 * considered grounded: this harness has no built-in idea of what "verified
 * against the real docs" means for an arbitrary MCP server, so absent
 * config means no opinion, not a default pattern.
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
 * Tool names to withhold from this model's tool list — `mcp.excludeTools`
 * (always) plus `mcp.excludeToolsForNonReasoningModels` (only when `model`
 * isn't a reasoning model). Both default to no exclusion.
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
 * Simple single-shot generation (no MCP tools).
 *
 * The system prompt is wrapped as a single text block with
 * `cache_control: { type: "ephemeral" }` — for fix-loop calls, the same
 * fix-system prompt is used for every attempt within an iteration, so
 * subsequent attempts within the ~5-minute cache TTL hit the cached
 * prefix and are billed at ~10% of the normal input rate.
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
 * Multi-turn generation with tool use — MCP, a config-driven CLI, or both.
 *
 * 1. Start the local MCP server (if the test declares `mcp`) and/or build
 *    the CLI tool (if the test declares `cli` — see `pipeline/cli-tool.js`)
 * 2. Register whichever tools exist with the Anthropic SDK
 * 3. Let the model call tools (list_components, get_component_guideline,
 *    the configured CLI, etc.)
 * 4. Route each tool call to the MCP server or the CLI executor by name,
 *    and send results back
 * 5. Continue until the model stops calling tools and emits its final text
 *
 * Named `generateWithTools` (was `generateWithMcp` before CLI support
 * existed) — both `mcpConfig` and `cliConfig` are optional and independent;
 * a test can set either, both, or neither (neither means this function is
 * never called — see `needsTools` at its call sites).
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
  // Front-load the tool's own instructions into the system prompt — an MCP
  // server's `instructions` block, and/or the output of `cli.frontloadArgs`.
  // TRUE for initial generation, FALSE for repair turns (see `runRepair`).
  //
  // Why repair turns opt out (changed 2026-09-11): those instructions are a
  // getting-started briefing, and re-sending them to a fix turn both costs
  // tokens and actively misdirects. dsds-mcp's block opens "START HERE:
  // Call dsds brief first to get a full briefing before any work begins",
  // and agents obey it on repair rounds where the app already renders.
  // Measured in 2026-09-10/21.48 ui5-cli iteration-3: a lint repair round
  // on a rendering app spent ALL THREE of its tool calls on `brief`
  // (twice, fumbling the arg syntax) and a placeholder lint call — zero
  // useful research. Across 195 ui5-frontload repair rounds, 130 (67%)
  // opened with `dsds_context_brief` rather than looking at the error.
  //
  // The fix prompt already carries the error and the current files; the
  // briefing adds ~1,700 tokens of freshly-cached prefix per round (each
  // repair is a new conversation, so it cannot reuse the generation's
  // cache) and, for a CLI, an extra subprocess per round.
  frontloadInstructions = true,
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

    // `mcp.excludeTools` — always withheld, regardless of model. For a test
    // that wants to measure a narrower slice of an MCP server's surface
    // (e.g. docs lookup only, no chunk/compose tools) without needing a
    // second server or config file.
    //
    // `mcp.excludeToolsForNonReasoningModels` — withheld only from
    // non-reasoning models. Non-reasoning models are told in system.md not
    // to self-lint (the harness's own post-hoc gate does it for free, see
    // runLintGate below), but a prompt instruction is advisory, and a lint
    // tool's own schema description (server-authored, outside this
    // harness's control) can actively say the opposite ("lint your
    // finished component code"). Observed in practice (2026-07-22, one
    // test's self-lint tool): Haiku called it 3 times in one iteration
    // despite the instruction not to. Omitting the tool entirely is the
    // only way to guarantee the model can't reach for it.
    //
    // Both are empty/absent by default — no exclusion. See
    // `resolveExcludedTools` above. Excluding a tool by name only makes
    // sense for MCP's many-tools-per-server shape — the CLI tool is always
    // exactly one tool, so there's nothing analogous to exclude there.
    const mcpTools = mcpClient
      ? mcpClient.getToolsForAnthropic(resolveExcludedTools(mcpConfig, model))
      : [];
    // Both instruction sources are gated on `frontloadInstructions` — see
    // that parameter's doc comment for why repair turns skip them. Tools
    // themselves are NOT gated: a fix turn still gets the full tool surface,
    // it just isn't handed a "here's how to start building" briefing.
    const mcpInstructions =
      frontloadInstructions && mcpClient ? mcpClient.getInstructions() || "" : "";
    // Fetched on BOTH phases, unlike the front-load above: the command list
    // lives in the tool DESCRIPTION, which is re-sent with the tools array
    // on every request, and a repair turn needs correct argument syntax just
    // as much as generation does. One cheap subprocess beats a turn lost to
    // a guessed flag.
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

    // Conversation messages — we'll append tool results as the loop
    // progresses. The initial user message is wrapped in a content
    // array with `cache_control: ephemeral` so Anthropic caches the
    // (system prompt + first user message) prefix across the many
    // turns in this conversation. With MCP tool round-trips routinely
    // hitting 10+ turns, this is the single highest-leverage caching
    // breakpoint.
    const messages = [
      {
        role: "user",
        content: [{ type: "text", text: promptContent, cache_control: { type: "ephemeral" } }],
      },
    ];

    // Track all four token buckets separately. Anthropic's prompt
    // caching splits an API response's input into three parallel
    // counters; we keep them apart so the report can show whether the
    // sliding cache breakpoint is doing its job (and what the
    // effective billed cost is) instead of papering over it.
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
    // In-conversation grounding recovery: a full scaffold with ZERO calls to
    // any per-component verification tool means every prop/export name in it
    // is unverified against the real docs — observed in practice (2026-08-18,
    // one test's MCP server): a model emitted a complete, plausible-looking
    // project after calling only a broad context-brief tool once, and two of
    // its type errors (a non-exported compound-component name, a tone/level
    // prop confusion) survived every one of 5 build-fix attempts, because
    // nothing ever told the model the real contract. One bounded nudge,
    // separate from MAX_EMISSION_NUDGES (a different failure: files present
    // but unverified, not files missing).
    //
    // A test opts into this by setting `mcp.groundingCheck` (or
    // `cli.groundingCheck`, for a CLI-only test with no `mcp` block) to
    // `{ pattern: <RegExp matching its own verification tool names>, nudge:
    // <STOP message naming those tools> }` — absent means this harness has
    // no opinion on what "verified" means for a given MCP server or CLI, so
    // the check is skipped entirely. `mcpConfig` can legitimately be `null`
    // here (a CLI-only test), hence the optional chaining.
    const groundingCheck = mcpConfig?.groundingCheck ?? cliConfig?.groundingCheck ?? null;
    let groundingNudges = 0;
    const MAX_GROUNDING_NUDGES = 1;
    // The block currently carrying the sliding conversation cache breakpoint.
    let cacheMarker = null;

    while (turns < MAX_TOOL_TURNS) {
      turns++;

      // Sliding cache breakpoint: mark the last block of the latest message so
      // Anthropic caches the ENTIRE conversation prefix up to here. Without this,
      // only the system prompt + first user message are cached and every grown
      // turn re-bills all accumulated tool results at full input price. We move
      // the breakpoint each turn (clearing the previous one) and never touch
      // messages[0], keeping us within the 4-breakpoint limit (system + first
      // user + this slider).
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

      // Split the system field so the stable part is cached and the
      // per-turn nudge (which changes when turns approach the limit or
      // a duplicate streak triggers) lives in a separate non-cached
      // block at the end. Cache-control on the stable block creates a
      // cacheable prefix that survives across turns within this
      // conversation.
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

      // Write any ---FILE: path--- blocks the agent has emitted so far to disk
      // immediately, so a subsequent self-lint tool call (if the MCP server
      // has one) in this (or a later) turn can read them from disk instead
      // of the agent re-pasting the full source as a `code` argument.
      // parseFiles() reads the cumulative text, so revised files overwrite
      // earlier versions; writeProjectFiles rewrites the whole set each call.
      const emittedSoFar = parseFiles(allTextParts.join("\n"));
      if (emittedSoFar.length > 0) {
        await writeProjectFiles(projectDir, emittedSoFar);
      }

      // Extract tool_use blocks
      const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");

      // If the model stopped without calling tools, it believes it's done.
      // "Done" without package.json in the parsed text means the project
      // exists only in the model's reasoning — demand emission in the SAME
      // conversation (where the composed files still are) instead of failing
      // the attempt and re-researching from scratch.
      if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
        const hasScaffold = emittedSoFar.some((f) => f.path === "package.json");
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
                text: `STOP: your visible text output contains ${status}. Files composed in your reasoning were NOT output — the harness receives only the text you write. Nothing is persisted after your response ends, and nothing you passed to tools was saved. Write out EVERY project file now — package.json, tsconfig.json, vite.config.ts, index.html, src/main.tsx, src/App.tsx, and every component/view — as complete \`---FILE: path--- … ---END FILE---\` blocks. No tool calls. No summary. Only the files.`,
              },
            ],
          });
          forceTextOnly = true;
          continue;
        }

        if (
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
 * Aggregate eslint error messages by ruleId → count, across all files. Feeds
 * the harness's rule-level lint telemetry (which rules fire, first-try vs
 * residual) so high-value rules can be targeted and churn pruned.
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
 * Reduce an ESLint-shaped `files` array into the gate's result contract.
 * Shared by the MCP and CLI lint paths so the error/warning policy lives in
 * exactly one place — a CLI's own top-level "problem count" must NOT be
 * trusted for this (dsds-mcp's CLI, for one, reports errors AND warnings in
 * its `remaining` field, which would gate on advisory findings).
 *
 * The gate counts ERRORS only (severity 2), not warnings. Fixable issues of any
 * severity are already auto-applied by the apply pass; what remains as a warning is
 * advisory and often structurally unfixable (e.g. `no-style-prop` on a
 * `backgroundColor`). Gating on those would burn repair attempts on something the
 * model can't clear, so warnings are reported (for the report) but never trigger
 * a repair. Returns { remaining (errors), files (error messages only), warnings }.
 *
 * @param {Array<{filename?: string, messages?: Array<{severity: number}>}>} lintFiles
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
  return { remaining, files: errorFiles, warnings, byRule: countByRule(errorFiles) };
}

/**
 * Lint the project's source files via the MCP, applying auto-fixes to disk.
 *
 * `toolName` is the test's own `mcp.lintTool` config — this harness has no
 * built-in idea of what a "lint" tool is called on any given MCP server.
 * See `runCliLintGate` for the CLI-transport equivalent, and
 * `summarizeLintFiles` for the shared error/warning policy.
 */
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
 * Lint the project's source files via the test's configured CLI, applying
 * auto-fixes to disk — the CLI-transport twin of `runLintGate`.
 *
 * A test opts in with `cli.lint: { args, parse }`:
 *   - `args: (absolutePaths) => string[]` — the subcommand and flags to run,
 *     appended to `cli.args`. The test owns its CLI's flag syntax; the
 *     harness has no built-in idea of how to ask a given CLI to lint with
 *     autofix (dsds-mcp's is `lint <paths…> --apply --json`).
 *   - `parse: (stdout) => files[]` — normalise that CLI's stdout into an
 *     ESLint-shaped array of `{filename, messages: [{ruleId, severity,
 *     line, message}]}`. Severity/error policy is then applied centrally by
 *     `summarizeLintFiles`, so a test only has to describe its output
 *     format, not re-implement the gate.
 *
 * `LINT_SOURCE_DIR` is injected into the subprocess env exactly as the MCP
 * path does. It is load-bearing, not cosmetic: without it, verified live
 * 2026-09-10, dsds-mcp's CLI returns ESLint's "File ignored because outside
 * of base path" for every file and silently finds nothing.
 *
 * Never throws — a broken lint CLI degrades to "no findings, gate inert"
 * with an `error`/`unavailable` flag, matching `runLintGate`'s contract, so
 * a misconfigured lint step can't take down an otherwise healthy iteration.
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
 * Fix prompt for remaining (non-auto-fixable) lint violations.
 *
 * Carries the same anti-regression guardrails as `buildA11yFixPrompt`, and
 * for the same reason: both run only AFTER the build is confirmed
 * rendering, so a wholesale rewrite here can only lose ground. That
 * parity was missing until 2026-09-10 — this prompt said just "Output ONLY
 * the files you changed" while the a11y one spelled out why, and models
 * ignored the short version.
 *
 * Observed in 2026-09-10/21.48 `ui5-cli` iteration-5: a render-clean app
 * got two real `no-prop-backed-inline-style` errors, and the lint fix
 * re-emitted SEVEN files (package.json, tsconfig.json, vite.config.ts,
 * index.html, main.tsx included) for a two-line styling change, breaking
 * the type check and spending the build-fix budget. 6 of 701 pre-existing
 * MCP-gate iterations show the same lint-fix → build-fix pattern going back
 * to 2026-08-28, so this is a long-standing shared-path weakness, not
 * specific to either transport.
 *
 * Deliberately generic: it names no design system's props or rules. The
 * specific mistake in that iteration (reaching for a v3 prop value the v5
 * type rejects) is exactly the kind of finding the stripped-prompt arms
 * exist to measure, so it is not pre-empted here.
 *
 * Exported only so the guardrails are testable without driving a whole
 * iteration — same rationale as `toAnthropicTools` in mcp-client.js.
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
 * One repair turn: prompt the agent, parse + merge fixed files to disk.
 * `logNote` adds an optional line to the prompt's agent-log header (the
 * build stage uses it to record the fatal error / console-error count).
 *
 * MCP in the fix loop
 * -------------------
 * When the test defines an `mcp` block, repair turns get the same tools the
 * initial generation had. Before 2026-09-09 they did not: every fix attempt
 * was a stateless `generateSimple` call carrying only the fix-system prompt
 * and the broken files — no conversation history, no tools. That made the
 * fix loop strictly less informed than the build that preceded it, and it
 * punished exactly the tests whose knowledge lives in the MCP rather than in
 * a hand-written fix prompt.
 *
 * It showed up clearly in 2026-09-09/11.51 (Haiku). The `ui5-frontload` arm
 * burned all 16 of its fix rounds on `@sanity/icons` imports and passed 0 of
 * its first 3 iterations. The package's root `index.d.ts` declares icon
 * names its `index.js` never exports, so a root import type-checks and then
 * throws in the browser. Recovering needs one fact — rewrite the import to
 * the icon's own subpath. `ui5-mcp` had that fact hard-coded in a 6 KB
 * fix-system prompt and recovered; `ui5-frontload`'s 364-byte prompt did
 * not, and it could not look the fact up either, despite its own prompt
 * telling it to "use the design system MCP server". Now it can.
 *
 * Set `mcp.fixLoop: false` (or `cli.fixLoop: false`) on a test to restore
 * the old tool-free behaviour for that tool specifically.
 */
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
  let updated = files;
  if (parsed.length) {
    updated = [...files];
    for (const fx of parsed) {
      const i = updated.findIndex((f) => f.path === fx.path);
      if (i >= 0) updated[i] = fx;
      else updated.push(fx);
    }
    await writeProjectFiles(projectDir, updated);
  }
  return { files: updated, produced: parsed.length > 0, usage: resp };
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
  // Per-test `effort` override (config.js), e.g. "low"/"medium"/"high"/"xhigh"/
  // "max". Applied only to models that accept `output_config.effort` — see
  // `modelTuning`. Also gates `{{isReasoningModel}}` in the system prompt, so
  // reasoning-model-specific instructions (the self-lint workflow) stay scoped
  // to Fable/Mythos regardless of what effort value is configured.
  effort = null,
  mcpConfig = null,
  // Test-supplied `cli` block (config.js) — see `pipeline/cli-tool.js`.
  // Independent of `mcpConfig`: a test can set either, both, or neither.
  cliConfig = null,
  // Test-supplied patterns (config.js `renderFailureSignatures`) matched
  // against the rendered page's visible text. Catches a library's own
  // graceful-degradation message (e.g. a UI kit's ThemeProvider rendering
  // an error string when a required prop is missing) rendering as ordinary
  // page content — no thrown error, no console output, "something is on
  // the page" per the existing render check, but the app is completely
  // broken. Empty by default; see `detectRenderFailureSignature` in
  // evaluation/validate.js for why this lives in test config, not here.
  renderFailureSignatures = [],
  // Test-supplied floor (config.js `minStylesheetRules`) on how many CSS
  // rules a rendered page must carry. Catches a build-time stylesheet step
  // that never ran (an unregistered Tailwind/PostCSS plugin, a CSS entry
  // nothing imports): valid HTML, browser-default styling, no error
  // anywhere. 0 disables it — only a test that knows its own stack ships
  // CSS can set a meaningful floor. See `detectFatalError` in
  // evaluation/validate.js.
  minStylesheetRules = 0,
}) {
  const systemPrompt = getSystemPrompt(testLabel, model);
  const fixSystemPrompt = getFixSystemPrompt(testLabel);
  // Per-model request overrides (e.g. Fable's effort cap in modelTuning())
  // are recorded in _meta.json and the report, so tuned results are never
  // mistaken for default-settings results when comparing models.
  const tuning = modelTuning(model, effort);
  const tuningNote = Object.keys(tuning).length > 0 ? tuning : null;
  // Sonnet 4.6 generation can take 2-3 minutes per call. The default SDK
  // timeout is 10 min with 2 retries (30 min worst-case per call). Increase
  // the per-request timeout to 15 min and reduce retries to 1 so a slow
  // call doesn't block the entire run.
  // A model ID containing a colon (e.g. "qwen2.5-coder:14b") is an Ollama
  // tag, never a Claude model — route it through the local shim instead of
  // the Anthropic SDK. See ollama-client.js for the translation and its
  // documented limitations.
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
  // Validation cycles where the type check failed on a tsconfig/project-
  // reference scaffold error (see `isTsconfigScaffoldError`) — a broken
  // config the agent wrote, not a flake and not an ordinary app-code bug.
  // Reported via `result.tsconfigError` and tracked separately so a run
  // dominated by scaffold mistakes isn't indistinguishable from one full
  // of real code bugs.
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
      // Attempts must be independent. Files persisted mid-loop by the failed
      // attempt would otherwise be visible to this attempt's lint-by-path
      // calls, "confirming" the false belief that files persist without being
      // emitted as ---FILE: blocks (observed with Fable: leftover files from
      // attempt 1 lint clean in attempt 3, so the model concludes the harness
      // persists its internally-composed files and never emits anything).
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

    // A generation is only usable if the model emitted a full project
    // scaffold — at minimum, `package.json`. Some models (observed with
    // Fable) "mentally compose" the whole project internally, "lint"
    // it, then only re-emit the single file they think they had to
    // change — treating the initial generation as if it were a fix
    // response. The whole validation pipeline below is gated on
    // `package.json` being present, so partial-scaffold generations
    // silently skip npm install / tsc / dev server / measurements and
    // record a no-op iteration. Reject them here so the retry loop
    // gets another shot; a persistent partial output ends up as an
    // explicit iteration failure rather than a silent success.
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
    // Step 1 — last known-good render. Once the app renders, the terminal
    // result must never be WORSE than that: an accessibility fix (the only
    // gate that re-enters the loop after a successful render) can rewrite a
    // file and regress the build back to non-rendering, which would drag the
    // iteration down to "unbuilt". We snapshot the rendering files (and their
    // axe count) at each render; if the loop later exhausts its budget with a
    // broken build, we restore this snapshot and measure it instead.
    let lastGoodFiles = null;
    let lastGoodAxe = null;
    // Lint has two distinct halves that behave very differently:
    //  - AUTO-FIX (the ~2/3 of eslint-plugin-sanity-ui rules with `fixable:
    //    "code"`): a deterministic AST transform, not an agent rewrite. It's
    //    safe to run on ANY write, including code that's never been
    //    build-validated — so it runs unconditionally at the top of every
    //    loop iteration, on every generation/fix attempt, free of charge.
    //  - REMAINDER (rules `apply:true` can't fix — semantic/structural or
    //    content the agent must author): only escalated to an agent fix
    //    prompt once the build has been confirmed rendering at least once
    //    (inside the `validation.success` branch below). Editing code that's
    //    never been validated is how a lint-fix rewrite can introduce (or
    //    mask) a build-breaking regression with no way to tell which
    //    happened — observed in practice (2026-07-22). Once inside the
    //    success branch, a lint-fix that regresses the build is caught by
    //    the SAME mechanism that already protects against a11y-fix
    //    regressions (Step 1 below / the post-loop restore): the next loop
    //    iteration's validateProject() simply fails like any other
    //    regression, and if the build-fix budget can't recover it, the
    //    post-loop restore falls back to `lastGoodFiles`.
    // `maxLintFixes` bounds the REMAINDER escalation only; auto-fix is
    // unbounded (unbounded, because each call is cheap and side-effect-free
    // beyond the files it touches).
    let lintFixAttempts = 0;
    let lintSettled = false;
    // Per-rule telemetry (P5): first-try vs residual eslint ruleId → count.
    // "First try" now means "the first post-render check", not "before any
    // build attempt" — a build that never renders has no shippable code to
    // report lint compliance for, so these stay null for build failures.
    let firstTryLintRules = null;
    let residualLintRules = null;

    // The lint gate is a harness step (not the agent's choice), available
    // over either transport. It activates when the test configures
    // `mcp.lintTool` (the MCP tool name to call) or `cli.lint` (how to
    // invoke and parse its CLI) — absent both, the harness has no built-in
    // idea of what to call, so the gate stays off. Both paths get
    // `LINT_SOURCE_DIR=projectDir`; see `runCliLintGate` for why that's
    // load-bearing rather than cosmetic.
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
        // ── Auto-fix pass: unconditional, every iteration, on whatever was
        // just written (initial generation or any fix attempt). Mechanical
        // and deterministic (not an agent rewrite), so it's safe even before
        // the build has ever been validated. Captured in `lastLintResult` so
        // the post-render remainder check below doesn't need a second call —
        // nothing writes files between here and validateProject(). ──
        let lastLintResult = null;
        if (lintGateActive) {
          const autofix = await runConfiguredLintGate();
          if (!autofix.unavailable && !autofix.error) {
            files = await readProjectFiles(projectDir, files); // pick up applied auto-fixes
            lastLintResult = autofix;
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

            // Step 1: snapshot this rendering state IMMEDIATELY — before
            // EITHER the lint-remainder gate or the a11y gate can send the
            // code back for a fix that regresses the build. Without this
            // snapshotted here (not after the lint gate), a lint-fix
            // regression mid-loop would have no known-good state to fall
            // back to.
            lastGoodFiles = await readProjectFiles(projectDir, files);

            // ── Gate 2: Lint remainder (non-auto-fixable violations only) —
            // only reached once the build is confirmed rendering. See the
            // comment above the auto-fix pass at the top of this loop for
            // why escalation is deferred this far. `lastLintResult` is this
            // iteration's auto-fix result from the top of the loop; nothing
            // has written files since, so it's still accurate here. ──
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
                  // Without this, a violation file that hasn't changed since
                  // the last hash snapshot gets elided to a manifest line —
                  // the agent is told the violation exists but never shown
                  // the file contents to fix it. Observed in practice
                  // (2026-07-22): the agent's own fix response reasoned
                  // through this exact gap ("I cannot fix files I cannot
                  // see") and left every violation in an elided file intact
                  // across both attempts.
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

            // The accessibility gate runs after lint settles because it can
            // ALSO send the code back for another fix. Capturing the
            // expensive measurements (8 screenshots + DOM + semantic HTML,
            // then Lighthouse) BEFORE that check wasted a full pass on every
            // intermediate render that the a11y gate then discarded — an
            // iteration that took two a11y fixes captured all 8 screenshots
            // three times over, keeping only the last. Run the cheap axe scan
            // first; take the heavy measurements once, below, after the gate
            // resolves — which also means they capture the final a11y-clean
            // state rather than an intermediate one.

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
                // No `previousHashes` here (unlike the build/lint gates): axe
                // violations carry a DOM selector + rendered HTML, not a file
                // path, so there's no reliable way to compute which files are
                // "referenced" and safe to elide. Eliding by hash alone risks
                // the same bug found in the lint gate (2026-07-22) — a
                // violation's file getting hidden from the fix prompt because
                // it happened not to change on the previous attempt. Always
                // showing full content here trades a little token cost for
                // guaranteed correctness.
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
              firstTryAxe,
              residualLint,
              residualLintRules,
              residualAxe,
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
            // Record THIS validation's failure before giving up. Without
            // this, fixLog's last entry is always the failure that PROMPTED
            // the last fix attempt, not the result of that attempt — the
            // true final error (whatever the last fix actually produced,
            // including "it silently succeeded and something else broke,"
            // or even a transient flake) was previously invisible in
            // _meta.json entirely, visible only by reading the raw
            // _tsc_check.txt / _dev_server.txt log files by hand. Observed
            // in practice (2026-07-25): an iteration's reported "final
            // error" in fixLog was stale — the actual last validation call
            // showed `tsc` passing cleanly, meaning the fix worked and a
            // separate, unlogged issue (render/runtime) was the true cause
            // of giving up.
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

          // Build the fix prompt with current files + errors. On attempts
          // ≥ 2, unchanged-and-not-error-referenced files become a
          // manifest entry instead of full content — UNLESS the regex above
          // found zero real project-file paths in the error text, which
          // happens for browser `pageerror` failures (e.g. a runtime
          // TypeError whose message names a bundled/minified path, or no
          // path at all). In that case we have no reliable signal for which
          // file is actually broken, so eliding by stale hash risks hiding
          // the very file that needs fixing — observed in practice
          // (2026-07-22): the agent explicitly reasoned "since I don't have
          // visibility into which file has this import... the most likely
          // culprit is one of the component files," guessed wrong, and
          // introduced a new, unrelated regression. Falling back to full
          // content for every file is the same trade made for the a11y gate.
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

      // Step 1: the loop ended with a broken build, but an earlier attempt
      // had produced a working render. A later fix (the a11y repair) regressed
      // it. Reporting the broken end-state would score the iteration BELOW a
      // build it already achieved — so roll back to the last good render and
      // measure that instead. The residual axe it carried is the honest result.
      if (exitStage === "build" && lastGoodFiles) {
        console.warn(
          `${tag(iterLabel)} ${warn("A later fix regressed a previously-working build — restoring the last good render for the final result")}`,
        );
        await writeProjectFiles(projectDir, lastGoodFiles);
        files = lastGoodFiles;
        // Reflect the restored (rendering) state, not the discarded broken one.
        exitStage = (lastGoodAxe ?? 0) > 0 ? "accessibility" : "clean";
      }

      // Fix budget exhausted. Decide whether a final measurement pass is
      // worth doing:
      //  - exitStage="build" — the in-loop validation just failed. The
      //    page won't render. Skip everything (no screenshot, no DOM,
      //    no axe, no lighthouse). Saves a dev-server spawn and avoids
      //    polluting the report with measurements against a broken page.
      //  - exitStage="lint" — lint never converged so the build wasn't
      //    tested. One final validateProject() — if it renders, capture
      //    measurements and axe; if not, skip.
      //  - exitStage restored to "clean"/"accessibility" above — the last
      //    good render is back on disk; the pass below measures it.
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
        firstTryAxe,
        residualLint,
        residualLintRules,
        residualAxe,
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
