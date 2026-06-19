import Anthropic from "@anthropic-ai/sdk";
import { runAccessibilityTests } from "../evaluation/accessibility.js";
import { createMcpClient } from "./mcp-client.js";
import {
  writeFile,
  appendFile,
  mkdir,
} from "node:fs/promises";
import { resolve } from "node:path";
import { validateProject, killDevServer } from "../evaluation/validate.js";
import { captureScreenshots } from "../evaluation/screenshot.js";
import { measureDom } from "../evaluation/dom-count.js";
import { analyzeSemanticHtml } from "../evaluation/semantic-html.js";
import { measureLighthouse } from "../evaluation/lighthouse.js";
import { measureReactProfile } from "../evaluation/react-profile.js";
import { parseFiles } from "../evaluation/parse-files.js";
import { parseFeedback } from "../evaluation/parse-feedback.js";
import {
  getSystemPrompt,
  getFixSystemPrompt,
  writeProjectFiles,
  readProjectFiles,
  buildCurrentFilesText,
  buildFixPrompt,
  buildResult,
} from "./shared.js";
import { error, success, tag, warn } from "../util/color.js";
import { isTransientError } from "../util/retry.js";

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
    system: [
      { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: promptContent }],
  });

  const fullText = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  return {
    fullText,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
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
        ...(typeof mcpConfig.env === "function" ? mcpConfig.env(dir) : mcpConfig.env ?? {}),
        LINT_SOURCE_DIR: projectDir,
      }),
    };
    mcpClient = await createMcpClient(mcpConfigWithSource);

    const mcpTools = mcpClient.getToolsForAnthropic();
    const mcpInstructions = mcpClient.getInstructions() || "";

    console.log(
      `[${iterLabel}] MCP ready — ${mcpTools.length} tools available`,
    );

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
        content: [
          { type: "text", text: promptContent, cache_control: { type: "ephemeral" } },
        ],
      },
    ];

    let inputTokens = 0;
    let outputTokens = 0;
    let allTextParts = [];
    let turns = 0;

    // Save a log of all tool interactions for debugging
    const toolLog = [];
    // Track seen tool calls to detect retry loops
    const seenToolCalls = new Set();
    let duplicateStreak = 0;

    while (turns < MAX_TOOL_TURNS) {
      turns++;

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

      inputTokens += response.usage?.input_tokens ?? 0;
      outputTokens += response.usage?.output_tokens ?? 0;

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
      const toolUseBlocks = response.content.filter(
        (block) => block.type === "tool_use",
      );

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
      console.warn(
        `[${iterLabel}] Hit max tool turns (${MAX_TOOL_TURNS}) — forcing completion`,
      );
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
      inputTokens,
      outputTokens,
    };
  } finally {
    // Always shut down the MCP server
    if (mcpClient) {
      await mcpClient.stop().catch(() => {});
    }
  }
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

  // Save the fully-resolved prompt for this iteration so it can be inspected
  // later to confirm every iteration received the same brief.
  await writeFile(resolve(iterDir, "_prompt.txt"), promptContent, "utf-8");

  // --- Step 1: Initial generation (with retries if no files are produced) ---
  let fullText = "";
  let files = [];
  let generationAttempt = 0;

  // Track token usage across all calls (including generation retries)
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

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
    if (needsMcp) {
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

    totalInputTokens += result.inputTokens;
    totalOutputTokens += result.outputTokens;
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
    files = [...rawFiles].reverse().filter(f => seenPaths.has(f.path) ? false : seenPaths.add(f.path)).reverse();

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
    await writeFile(
      resolve(iterDir, "_feedback.json"),
      JSON.stringify(feedback, null, 2),
      "utf-8",
    );
  }
  await writeProjectFiles(projectDir, files);



  // Track fix attempts
  let fixAttempts = 0;
  const fixLog = [];

  // Per-iteration snapshot of file hashes from the previous fix
  // attempt. Used by buildCurrentFilesText to elide unchanged-and-
  // not-error-referenced files into a manifest on attempts ≥ 2.
  let previousFileHashes = null;

  // --- Step 2: Validate → Fix loop ---
  if (takeScreenshots && files.some((f) => f.path === "package.json")) {
    let validated = false;

    while (!validated && fixAttempts <= maxFixes) {
      console.log(
        `[${iterLabel}] Validating project${fixAttempts > 0 ? ` (after fix #${fixAttempts})` : ""}...`,
      );

      const validation = await validateProject(projectDir, iterLabel);

      try {
        if (validation.success) {
          // Page rendered! Run every measurement against the running server.
          console.log(`${tag(iterLabel)} ${success("✓ Page renders successfully")}`);

          const screenshotPath = await captureScreenshots(
            validation.serverUrl,
            iterDir,
            iterLabel,
          );
          const domMeasurement = await measureDom(
            validation.serverUrl,
            iterLabel,
          );
          const domElementCount = domMeasurement?.count ?? null;
          const domHtmlBytes = domMeasurement?.htmlBytes ?? null;
          const semanticHtml = await analyzeSemanticHtml(
            validation.serverUrl,
            iterLabel,
          );

          // Run accessibility tests against the live dev server
          let a11yResults = null;
          try {
            a11yResults = await runAccessibilityTests({
              serverUrl: validation.serverUrl,
              iterDir,
              iterLabel,
            });
          } catch (err) {
            console.warn(`${tag(iterLabel)} ${warn(`⚠ A11y tests failed:`)} ${err.message}`);
          }

          // Lighthouse performance audit
          let lighthouseResults = null;
          try {
            lighthouseResults = await measureLighthouse({
              serverUrl: validation.serverUrl,
              iterDir,
              iterLabel,
            });
          } catch (err) {
            console.warn(
              `${tag(iterLabel)} ${warn("⚠ Lighthouse measurement failed:")} ${err.message}`,
            );
          }

          // React Profiler — separate run with its own browser
          let reactProfile = null;
          try {
            reactProfile = await measureReactProfile({
              serverUrl: validation.serverUrl,
              iterDir,
              iterLabel,
            });
          } catch (err) {
            console.warn(
              `${tag(iterLabel)} ${warn("⚠ React profile failed:")} ${err.message}`,
            );
          }

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
            totalInputTokens,
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
          });
          return result;
        }

        // --- Validation failed — attempt a fix ---
        if (fixAttempts >= maxFixes) {
          console.warn(
            `${tag(iterLabel)} ${error(`✗ Max fix attempts (${maxFixes}) reached — giving up`)}`,
          );
          break;
        }

        fixAttempts++;
        const errorSummary = validation.fatalError || "Unknown error";
        console.log(
          `${tag(iterLabel)} ${warn(`✗ Validation failed (fix attempt ${fixAttempts}/${maxFixes}):`)} ${errorSummary.split("\n")[0]}`,
        );

        const fixLogEntry = {
          attempt: fixAttempts,
          errors: validation.consoleErrors,
          fatalError: validation.fatalError,
        };
        fixLog.push(fixLogEntry);

        // Pull file paths mentioned in the error output so they're
        // always included in the fix prompt even when their hash
        // hasn't changed since the previous attempt. Matches `src/...`
        // and similar relative paths up to the next paren or colon.
        const errorText = [
          validation.fatalError || "",
          ...validation.consoleErrors,
        ].join("\n");
        const errorReferencedPaths = [
          ...new Set(
            (errorText.match(/(?:^|[\s(])([a-zA-Z0-9._/-]+\.(?:tsx?|jsx?|css|json|html))/g) || [])
              .map((m) => m.replace(/^[\s(]/, "")),
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

        // Log the fix prompt to the cumulative agent log
        await appendFile(
          agentLogPath,
          `=== FIX ATTEMPT ${fixAttempts}/${maxFixes} — PROMPT [${new Date().toISOString()}] ===\n` +
            `Fatal error: ${(validation.fatalError || "none").split("\n")[0]}\n` +
            `Console errors: ${validation.consoleErrors.length}\n\n` +
            fixPrompt +
            "\n\n",
          "utf-8",
        );

        console.log(`[${iterLabel}] Asking Claude to fix errors...`);
        const fixResponse = await generateSimple({
          client,
          model,
          promptContent: fixPrompt,
          systemPrompt: fixSystemPrompt,
        });

        totalInputTokens += fixResponse.inputTokens;
        totalOutputTokens += fixResponse.outputTokens;

        const fixText = fixResponse.fullText;

        // Save the fix response
        await writeFile(
          resolve(iterDir, `_fix_response_${fixAttempts}.txt`),
          fixText,
          "utf-8",
        );

        // Log the fix response to the cumulative agent log
        const fixedFilesParsed = parseFiles(fixText);
        await appendFile(
          agentLogPath,
          `=== FIX ATTEMPT ${fixAttempts}/${maxFixes} — RESPONSE [${new Date().toISOString()}] ===\n` +
            `Response length: ${fixText.length} bytes\n` +
            `Files in response: ${fixedFilesParsed.map((f) => f.path).join(", ") || "(none)"}\n\n` +
            fixText +
            "\n\n",
          "utf-8",
        );

        // Parse the fixed files and merge them into the project
        const fixedFiles = fixedFilesParsed;
        if (fixedFiles.length === 0) {
          console.warn(
            `[${iterLabel}] Claude returned no file blocks in fix response — retrying`,
          );
          continue;
        }

        console.log(
          `[${iterLabel}] Applying ${fixedFiles.length} fixed file(s)...`,
        );

        // Merge: overwrite changed files, keep the rest
        for (const fixed of fixedFiles) {
          const existing = files.findIndex((f) => f.path === fixed.path);
          if (existing >= 0) {
            files[existing] = fixed;
          } else {
            files.push(fixed);
          }
        }



        // Rewrite the full project directory
        await writeProjectFiles(projectDir, files);
      } finally {
        // Always kill the dev server between validation attempts
        killDevServer(validation.devServer);
      }
    }

    // If we got here, we exhausted fix attempts or broke out of the loop.
    // Take a screenshot anyway (even if the page is broken) for the report.
    console.log(
      `[${iterLabel}] Taking screenshot of final state (may be broken)...`,
    );
    const lastValidation = await validateProject(projectDir, iterLabel);

    let screenshotPath = null;
    let lastDomElementCount = null;
    let lastDomHtmlBytes = null;
    let lastSemanticHtml = null;
    try {
      if (lastValidation.serverUrl) {
        screenshotPath = await captureScreenshots(
          lastValidation.serverUrl,
          iterDir,
          iterLabel,
        );
        const lastDom = await measureDom(
          lastValidation.serverUrl,
          iterLabel,
        );
        lastDomElementCount = lastDom?.count ?? null;
        lastDomHtmlBytes = lastDom?.htmlBytes ?? null;
        lastSemanticHtml = await analyzeSemanticHtml(
          lastValidation.serverUrl,
          iterLabel,
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
      killDevServer(lastValidation.devServer);
    }

    files = await readProjectFiles(projectDir, files);
    return buildResult({
      files,
      model,
      iterDir,
      iterLabel,
      testLabel,
      screenshotPath,
      totalInputTokens,
      totalOutputTokens,
      fixAttempts,
      fixLog,
      feedback,
      a11yResults: null,
      lighthouseResults: null,
      reactProfile: null,
      domElementCount: lastDomElementCount,
      domHtmlBytes: lastDomHtmlBytes,
      semanticHtml: lastSemanticHtml,
      runner: "api",
    });
  }

  // No screenshots requested or no package.json — just return metrics
  return buildResult({
    files,
    model,
    iterDir,
    iterLabel,
    testLabel,
    screenshotPath: null,
    totalInputTokens,
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
  });
}
