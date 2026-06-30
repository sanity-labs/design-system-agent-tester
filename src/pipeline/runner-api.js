import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { parseFeedback } from "../evaluation/parse-feedback.js";
import { parseFiles } from "../evaluation/parse-files.js";
import { killDevServer, validateProject } from "../evaluation/validate.js";
import { error, success, tag, warn } from "../util/color.js";
import { isTransientError } from "../util/retry.js";
import { createMcpClient } from "./mcp-client.js";
import { generateGenuiProjectWithMcp } from "./runner-genui.js";
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

// Max tool-use round-trips before we force the model to finish
const MAX_TOOL_TURNS = 25;

const API_CALL_MAX_RETRIES = 3;
const API_CALL_RETRY_DELAY_MS = 15_000; // 15 seconds

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

/**
 * Simple single-shot generation (no MCP tools).
 *
 * The system prompt is wrapped as a single text block with
 * `cache_control: { type: "ephemeral" }` — for fix-loop calls, the same
 * fix-system prompt is used for every attempt within an iteration, so
 * subsequent attempts within the ~5-minute cache TTL hit the cached
 * prefix and are billed at ~10% of the normal input rate.
 */
async function generateSimple({ client, model, promptContent, systemPrompt }) {
  const response = await callAnthropicWithRetry(client, {
    model,
    max_tokens: 32000,
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
 * Multi-turn generation with MCP tool use.
 *
 * 1. Start the local MCP server
 * 2. Register its tools with the Anthropic SDK
 * 3. Let the model call tools (list_components, get_component_guideline, etc.)
 * 4. Route each tool call to the MCP server and send results back
 * 5. Continue until the model stops calling tools and emits its final text
 */
async function generateWithMcp({
  client,
  model,
  promptContent,
  baseSystemPrompt,
  iterDir,
  iterLabel,
  mcpConfig,
  projectDir,
}) {
  let mcpClient;
  try {
    console.log(`[${iterLabel}] Starting MCP server...`);
    // The project directory must exist before the MCP starts so it can read
    // files the agent writes (lint-by-path). The MCP is told where the agent's
    // files live via LINT_SOURCE_DIR so `dsds_lint_code({ path })` resolves
    // against the project, not the dsds-mcp install dir.
    await mkdir(projectDir, { recursive: true });
    const mcpConfigWithSource = {
      ...mcpConfig,
      env: (dir) => ({
        ...(typeof mcpConfig.env === "function" ? mcpConfig.env(dir) : (mcpConfig.env ?? {})),
        LINT_SOURCE_DIR: projectDir,
      }),
    };
    mcpClient = await createMcpClient(mcpConfigWithSource);

    const mcpTools = mcpClient.getToolsForAnthropic();
    const mcpInstructions = mcpClient.getInstructions() || "";

    console.log(`[${iterLabel}] MCP ready — ${mcpTools.length} tools available`);

    // Build system prompt with MCP instructions appended.
    const systemPrompt = baseSystemPrompt + "\n\n" + mcpInstructions;

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
        turns >= MAX_TOOL_TURNS - 2 || duplicateStreak >= 3
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
          system: systemBlocks,
          tools: mcpTools,
          messages,
        },
        iterLabel,
      );

      const u = response.usage ?? {};
      uncachedInputTokens += u.input_tokens ?? 0;
      cacheReadInputTokens += u.cache_read_input_tokens ?? 0;
      cacheCreationInputTokens += u.cache_creation_input_tokens ?? 0;
      outputTokens += u.output_tokens ?? 0;

      // Per-turn usage incl. cache hits, so we can confirm the sliding cache
      // breakpoint is working (cache_read should grow across turns).
      console.log(
        `[${iterLabel}] turn ${turns} usage: in=${u.input_tokens ?? 0} out=${u.output_tokens ?? 0} ` +
          `cache_read=${u.cache_read_input_tokens ?? 0} cache_write=${u.cache_creation_input_tokens ?? 0}`,
      );

      // Extract text blocks from this turn
      const textBlocks = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text);
      allTextParts.push(...textBlocks);

      // Write any ---FILE: path--- blocks the agent has emitted so far to disk
      // immediately, so a subsequent `dsds_lint_code({ path })` call in this
      // (or a later) turn can read them instead of the agent re-pasting the
      // full source as a `code` argument. parseFiles() reads the cumulative
      // text, so revised files overwrite earlier versions; writeProjectFiles
      // rewrites the whole set each call.
      const emittedSoFar = parseFiles(allTextParts.join("\n"));
      if (emittedSoFar.length > 0) {
        await writeProjectFiles(projectDir, emittedSoFar);
      }

      // Extract tool_use blocks
      const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");

      // If the model stopped without calling tools, we're done
      if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
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

    // Save tool log for debugging
    if (toolLog.length > 0) {
      await writeFile(
        resolve(iterDir, "_mcp_tool_log.json"),
        JSON.stringify(toolLog, null, 2),
        "utf-8",
      );
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
 * Lint the project's source files via the MCP, applying auto-fixes to disk.
 *
 * The gate counts ERRORS only (severity 2), not warnings. Fixable issues of any
 * severity are already auto-applied by `apply:true`; what remains as a warning is
 * advisory and often structurally unfixable (e.g. `no-style-prop` on a
 * `backgroundColor`). Gating on those would burn repair attempts on something the
 * model can't clear, so warnings are reported (for the report) but never trigger
 * a repair. Returns { remaining (errors), files (error messages only), warnings }.
 */
async function runLintGate(lintClient, files) {
  const sources = files.filter((f) => SOURCE_LINTABLE.test(f.path));
  if (!sources.length) return { remaining: 0, files: [], warnings: 0 };
  let result;
  try {
    result = await lintClient.callTool("dsds_lint_code", {
      apply: true,
      files: sources.map((f) => ({ path: f.path, filename: f.path })),
    });
  } catch (err) {
    return { remaining: 0, files: [], warnings: 0, error: err.message };
  }
  const sc = result?.structuredContent;
  if (!sc) return { remaining: 0, files: [], warnings: 0, unavailable: true };

  // Split messages by severity (2 = error, 1 = warn). Only errors gate.
  let warnings = 0;
  const errorFiles = [];
  for (const f of sc.files ?? []) {
    const errs = (f.messages ?? []).filter((m) => m.severity === 2);
    warnings += (f.messages ?? []).length - errs.length;
    if (errs.length) errorFiles.push({ ...f, messages: errs });
  }
  const remaining = errorFiles.reduce((n, f) => n + f.messages.length, 0);
  return { remaining, files: errorFiles, warnings };
}

/** Fix prompt for remaining (non-auto-fixable) lint violations. */
function buildLintFixPrompt(lintFiles, currentFilesText) {
  const lines = [
    "Your code has ESLint violations that auto-fix could not resolve. Auto-fixable issues are already applied on disk; fix the remaining ones below.",
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
    "Fix every violation above. Output ONLY the files you changed, each as a complete `---FILE: path---` / `---END FILE---` block.",
  );
  return lines.join("\n");
}

/** Fix prompt for axe violations — names what to change, where, and why. */
function buildA11yFixPrompt(axeViolations, currentFilesText) {
  const lines = [
    "The app builds and renders, but axe-core found accessibility violations. Fix each one in the component code that renders the offending element.",
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
    "Add a label, landmark, alt text, ARIA attribute, or fix contrast as appropriate. Output ONLY the files you changed, each as a complete `---FILE: path---` / `---END FILE---` block.",
  );
  return lines.join("\n");
}

/**
 * One repair turn: prompt the agent, parse + merge fixed files to disk.
 * `logNote` adds an optional line to the prompt's agent-log header (the
 * build stage uses it to record the fatal error / console-error count).
 */
async function runRepair({
  client,
  model,
  fixSystemPrompt,
  fixPrompt,
  files,
  projectDir,
  iterDir,
  agentLogPath,
  stage,
  attempt,
  maxFixes,
  logNote = "",
}) {
  await appendFile(
    agentLogPath,
    `=== FIX (${stage}) ${attempt}/${maxFixes} — PROMPT [${new Date().toISOString()}] ===\n${logNote ? logNote + "\n" : ""}\n${fixPrompt}\n\n`,
    "utf-8",
  );
  const resp = await generateSimple({
    client,
    model,
    promptContent: fixPrompt,
    systemPrompt: fixSystemPrompt,
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
  maxGenerationRetries = 3,
  mcpConfig = null,
  genui = false,
}) {
  const systemPrompt = getSystemPrompt(testLabel);
  const fixSystemPrompt = getFixSystemPrompt(testLabel);
  // Sonnet 4.6 generation can take 2-3 minutes per call. The default SDK
  // timeout is 10 min with 2 retries (30 min worst-case per call). Increase
  // the per-request timeout to 15 min and reduce retries to 1 so a slow
  // call doesn't block the entire run.
  const client = new Anthropic({
    timeout: 15 * 60 * 1000, // 15 minutes
    maxRetries: 1,
  });

  const needsMcp = Boolean(mcpConfig);
  if (genui && !needsMcp) {
    throw new Error("--genui requires a test with an `mcp` block (e.g. ui4-mcp).");
  }

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
  const trackInstall = (v) => {
    if (v?.installFailed) npmInstallFailures++;
  };

  const agentLogPath = resolve(iterDir, "_agent_log.txt");
  // Computed up front so the MCP-enabled generation can write the agent's
  // files here as they are emitted, enabling lint-by-path during generation.
  const projectDir = resolve(iterDir, "project");

  while (generationAttempt < maxGenerationRetries) {
    generationAttempt++;

    if (generationAttempt > 1) {
      console.log(
        `[${iterLabel}] Generation attempt ${generationAttempt}/${maxGenerationRetries} (previous attempt produced no files)...`,
      );
    }

    let result;
    if (genui) {
      // genui: agent writes a validated JSON spec, compiled to a React project.
      // The returned files then flow through the identical pipeline below.
      result = await generateGenuiProjectWithMcp({
        client,
        model,
        promptContent,
        iterDir,
        iterLabel,
        mcpConfig,
        maxSpecFixes: maxFixes,
      });
    } else if (needsMcp) {
      result = await generateWithMcp({
        client,
        model,
        promptContent,
        baseSystemPrompt: systemPrompt,
        iterDir,
        iterLabel,
        mcpConfig,
        projectDir,
      });
    } else {
      result = await generateSimple({
        client,
        model,
        promptContent,
        systemPrompt,
      });
    }

    addUsage(result);
    fullText = result.fullText;

    // Save raw response
    await writeFile(resolve(iterDir, "_raw_response.txt"), fullText, "utf-8");

    // Start cumulative agent log
    await writeFile(
      agentLogPath,
      `=== INITIAL GENERATION [${new Date().toISOString()}] ===\n` +
        `Model: ${model}\n` +
        `Response length: ${fullText.length} bytes\n` +
        `Files parsed: ${parseFiles(fullText).length}\n\n` +
        fullText +
        "\n\n",
      "utf-8",
    );

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

    if (files.length > 0) {
      break;
    }

    console.warn(
      `[${iterLabel}] Generation attempt ${generationAttempt}/${maxGenerationRetries} returned no parseable files (response: ${fullText.length} bytes)`,
    );
  }

  if (files.length === 0) {
    throw new Error(
      `All ${maxGenerationRetries} generation attempts returned no parseable files. Raw response was ${fullText.length} bytes.`,
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
    // Lint and a11y gate the React-code path. genui output is renderer-generated,
    // so it keeps the build-only loop (gates skipped when gateLintAndA11y=false).
    const gateLintAndA11y = !genui;
    let exitStage = null;
    let firstTryLint = null;
    let firstTryAxe = null;
    let residualLint = null;
    let residualAxe = null;

    // A dedicated MCP client drives the lint gate as a harness step (not the
    // agent's choice), pointed at the project dir via LINT_SOURCE_DIR.
    let lintClient = null;
    if (gateLintAndA11y && mcpConfig) {
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

    try {
      while (fixAttempts <= maxFixes) {
        // ── Gate 1: Lint (cheap, first; auto-fixes are applied to disk) ──
        if (lintClient) {
          const lint = await runLintGate(lintClient, files);
          if (!lint.unavailable && !lint.error) {
            files = await readProjectFiles(projectDir, files); // pick up applied auto-fixes
            if (firstTryLint === null) firstTryLint = lint.remaining;
            residualLint = lint.remaining;
            if (lint.remaining > 0) {
              console.log(
                `${tag(iterLabel)} ${warn(`✗ Lint: ${lint.remaining} error(s)${lint.warnings ? `, ${lint.warnings} warning(s) ignored` : ""}`)}`,
              );
              if (fixAttempts >= maxFixes) {
                exitStage = "lint";
                break;
              }
              fixAttempts++;
              exitStage = "lint";
              fixLog.push({ attempt: fixAttempts, stage: "lint", remaining: lint.remaining });
              const { text: lintFilesText, newHashes } = await buildCurrentFilesText(
                projectDir,
                files,
                { previousHashes: previousFileHashes },
              );
              previousFileHashes = newHashes;
              const fix = await runRepair({
                client,
                model,
                fixSystemPrompt,
                fixPrompt: buildLintFixPrompt(lint.files, lintFilesText),
                files,
                projectDir,
                iterDir,
                agentLogPath,
                stage: "lint",
                attempt: fixAttempts,
                maxFixes,
              });
              files = fix.files;
              addUsage(fix.usage);
              continue;
            }
          }
        }

        console.log(
          `[${iterLabel}] Validating project${fixAttempts > 0 ? ` (after fix #${fixAttempts})` : ""}...`,
        );

        const validation = await validateProject(projectDir, iterLabel);
        trackInstall(validation);

        try {
          if (validation.success) {
            // Page rendered! Run every measurement against the running server.
            console.log(`${tag(iterLabel)} ${success("✓ Page renders successfully")}`);

            const { screenshotPath, domElementCount, domHtmlBytes, semanticHtml } =
              await runStaticMeasurements(validation.serverUrl, iterDir, iterLabel);

            // Run accessibility tests against the live dev server
            const a11yResults = await runAccessibility(validation.serverUrl, iterDir, iterLabel);

            // ── Gate 3: Accessibility (React-code path only) ──
            // The app builds; now axe must pass. Violations become fix
            // instructions and re-enter the loop under the shared fix budget.
            if (gateLintAndA11y && a11yResults && !a11yResults.summary?.skipped) {
              const axeCount = a11yResults.axeViolationCount ?? 0;
              if (firstTryAxe === null) firstTryAxe = axeCount;
              residualAxe = axeCount;
              if (axeCount > 0 && fixAttempts < maxFixes) {
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
                const { text: a11yFilesText, newHashes } = await buildCurrentFilesText(
                  projectDir,
                  files,
                  { previousHashes: previousFileHashes },
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
                });
                files = fix.files;
                addUsage(fix.usage);
                continue; // dev server is killed in the finally below
              }
            }
            // Reaching here, lint passed and axe is clean or out of budget.
            exitStage = gateLintAndA11y && (residualAxe ?? 0) > 0 ? "accessibility" : "clean";

            // Lighthouse + React profiler (each runs its own browser)
            const { lighthouseResults, reactProfile } = await runPerformance(
              validation.serverUrl,
              iterDir,
              iterLabel,
            );

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
              iterDir,
              iterLabel,
              testLabel,
              screenshotPath,
              totalUncachedInputTokens,
              totalCacheReadInputTokens,
              totalCacheCreationInputTokens,
              totalOutputTokens,
              fixAttempts,
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
              firstTryAxe,
              residualLint,
              residualAxe,
              npmInstallFailures,
            });
            return result;
          }

          // --- Validation (build) failed — attempt a fix ---
          if (fixAttempts >= maxFixes) {
            console.warn(
              `${tag(iterLabel)} ${error(`✗ Max fix attempts (${maxFixes}) reached — giving up`)}`,
            );
            exitStage = "build";
            break;
          }

          exitStage = "build";
          fixAttempts++;
          const errorSummary = validation.fatalError || "Unknown error";
          console.log(
            `${tag(iterLabel)} ${warn(`✗ Validation failed (fix attempt ${fixAttempts}/${maxFixes}):`)} ${errorSummary.split("\n")[0]}`,
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
          // manifest entry instead of full content.
          const { text: currentFilesText, newHashes } = await buildCurrentFilesText(
            projectDir,
            files,
            { previousHashes: previousFileHashes, errorReferencedPaths },
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
            logNote: `Fatal error: ${(validation.fatalError || "none").split("\n")[0]}\nConsole errors: ${validation.consoleErrors.length}`,
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

      // Fix budget exhausted. Decide whether a final measurement pass is
      // worth doing:
      //  - exitStage="build" — the in-loop validation just failed. The
      //    page won't render. Skip everything (no screenshot, no DOM,
      //    no axe, no lighthouse). Saves a dev-server spawn and avoids
      //    polluting the report with measurements against a broken page.
      //  - exitStage="lint" — lint never converged so the build wasn't
      //    tested. One final validateProject() — if it renders, capture
      //    measurements and axe; if not, skip.
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
        const lastValidation = await validateProject(projectDir, iterLabel);
        trackInstall(lastValidation);
        try {
          if (lastValidation.success) {
            ({
              screenshotPath,
              domElementCount: lastDomElementCount,
              domHtmlBytes: lastDomHtmlBytes,
              semanticHtml: lastSemanticHtml,
            } = await runStaticMeasurements(lastValidation.serverUrl, iterDir, iterLabel));
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
        iterDir,
        iterLabel,
        testLabel,
        screenshotPath,
        totalUncachedInputTokens,
        totalCacheReadInputTokens,
        totalCacheCreationInputTokens,
        totalOutputTokens,
        fixAttempts,
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
        firstTryAxe,
        residualLint,
        residualAxe,
        npmInstallFailures,
      });
    } finally {
      if (lintClient) await lintClient.stop().catch(() => {});
    }
  }

  // No screenshots requested or no package.json — just return metrics
  return buildResult({
    files,
    model,
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
  });
}
