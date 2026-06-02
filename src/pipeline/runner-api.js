import Anthropic from "@anthropic-ai/sdk";
import { runAccessibilityTests } from "../evaluation/accessibility.js";
import { createMcpClient } from "./mcp-client.js";
import {
  writeFile,
  appendFile,
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
import { AUTOFIX_TOOL, runAutofixTool } from "./eslint-autofix-tool.js";
import { error, success, tag, warn } from "../util/color.js";

// Max tool-use round-trips inside a single fix attempt before forcing
// the model to stop and emit files. Lower than MAX_TOOL_TURNS because
// the fix loop has only one tool and shouldn't need many turns.
const MAX_FIX_TOOL_TURNS = 5;

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
      const msg = (err.message || "").toLowerCase();
      const isTransient =
        msg.includes("connection error") ||
        msg.includes("connection reset") ||
        msg.includes("econnreset") ||
        msg.includes("socket hang up") ||
        msg.includes("timeout") ||
        msg.includes("overloaded") ||
        msg.includes("529") ||
        msg.includes("503");

      if (isTransient && attempt < API_CALL_MAX_RETRIES) {
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
 * Multi-turn fix-loop generation with the `run_eslint_autofix` tool
 * available to the model. The agent can choose to call the tool (the
 * harness shells out to `eslint/run.js`, returns the linter output plus
 * the updated file contents) or skip straight to emitting fixed files.
 *
 * Returns aggregated text across all turns, token usage, and the count
 * of autofix invocations the agent made in this fix attempt.
 *
 * Side effect: when the agent calls the tool, `files` is mutated in
 * place to reflect the post-autofix contents on disk.
 */
async function generateFixWithAutofixTool({
  client,
  model,
  fixSystemPrompt,
  fixPrompt,
  projectDir,
  files,
  iterLabel,
  agentLogPath,
  fixAttemptNum,
}) {
  const messages = [{ role: "user", content: fixPrompt }];

  let inputTokens = 0;
  let outputTokens = 0;
  let toolCalls = 0;
  const textParts = [];

  for (let turn = 1; turn <= MAX_FIX_TOOL_TURNS; turn++) {
    const response = await callAnthropicWithRetry(
      client,
      {
        model,
        max_tokens: 32000,
        system: fixSystemPrompt,
        tools: [AUTOFIX_TOOL],
        messages,
      },
      iterLabel,
    );

    inputTokens += response.usage?.input_tokens ?? 0;
    outputTokens += response.usage?.output_tokens ?? 0;

    for (const block of response.content) {
      if (block.type === "text" && block.text) {
        textParts.push(block.text);
      }
    }

    const toolUses = response.content.filter((b) => b.type === "tool_use");

    if (response.stop_reason === "end_turn" || toolUses.length === 0) {
      return { fullText: textParts.join("\n"), inputTokens, outputTokens, toolCalls };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults = [];
    for (const tu of toolUses) {
      if (tu.name === "run_eslint_autofix") {
        toolCalls++;
        console.log(
          `${tag(iterLabel)} Fix #${fixAttemptNum} turn ${turn}: agent called run_eslint_autofix`,
        );
        const { resultText, linterOutput } = await runAutofixTool({
          projectDir,
          files,
        });
        await appendFile(
          agentLogPath,
          `=== FIX ATTEMPT ${fixAttemptNum} — TOOL CALL: run_eslint_autofix (turn ${turn}) [${new Date().toISOString()}] ===\n` +
            linterOutput +
            "\n\n",
          "utf-8",
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: resultText,
        });
      } else {
        toolResults.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: `Unknown tool: ${tu.name}`,
          is_error: true,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  console.warn(
    `${tag(iterLabel)} ${warn(`Fix #${fixAttemptNum}: hit MAX_FIX_TOOL_TURNS (${MAX_FIX_TOOL_TURNS}) — returning whatever text the agent produced`)}`,
  );
  return { fullText: textParts.join("\n"), inputTokens, outputTokens, toolCalls };
}

/**
 * Simple single-shot generation (no MCP tools).
 */
async function generateSimple({ client, model, promptContent, systemPrompt }) {
  const response = await callAnthropicWithRetry(client, {
    model,
    max_tokens: 32000,
    system: systemPrompt,
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
}) {
  let mcpClient;
  try {
    console.log(`[${iterLabel}] Starting MCP server...`);
    mcpClient = await createMcpClient();

    const mcpTools = mcpClient.getToolsForAnthropic();
    const mcpInstructions = mcpClient.getInstructions() || "";

    console.log(
      `[${iterLabel}] MCP ready — ${mcpTools.length} tools available`,
    );

    // Build system prompt with MCP instructions appended.
    const systemPrompt = baseSystemPrompt + "\n\n" + mcpInstructions;

    // Conversation messages — we'll append tool results as the loop progresses
    const messages = [{ role: "user", content: promptContent }];

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

      // When approaching the limit or stuck in a loop, nudge the model to stop researching
      const nudge =
        turns >= MAX_TOOL_TURNS - 2 || duplicateStreak >= 3
          ? "\n\nYou have done enough research. Stop calling tools and produce ALL project files now using ---FILE: path--- blocks."
          : "";

      // Use streaming to keep the connection alive during long generation turns.
      // Non-streaming holds a silent TCP connection open for 100+ seconds on the
      // final code-generation turn, which causes infrastructure-level timeouts.
      let response;
      for (let attempt = 1; attempt <= API_CALL_MAX_RETRIES; attempt++) {
        try {
          const stream = await client.messages.stream({
            model,
            max_tokens: 32000,
            system: systemPrompt + nudge,
            tools: mcpTools,
            messages,
          });
          response = await stream.finalMessage();
          break;
        } catch (err) {
          const msg = (err.message || "").toLowerCase();
          const isTransient =
            msg.includes("connection error") ||
            msg.includes("connection reset") ||
            msg.includes("econnreset") ||
            msg.includes("socket hang up") ||
            msg.includes("timeout") ||
            msg.includes("overloaded") ||
            msg.includes("529") ||
            msg.includes("503");
          if (isTransient && attempt < API_CALL_MAX_RETRIES) {
            console.warn(
              `[${iterLabel}] API stream failed (attempt ${attempt}/${API_CALL_MAX_RETRIES}): ${err.message}. Retrying in ${Math.round(API_CALL_RETRY_DELAY_MS / 1000)}s...`,
            );
            await new Promise((r) => setTimeout(r, API_CALL_RETRY_DELAY_MS));
          } else {
            throw err;
          }
        }
      }

      inputTokens += response.usage?.input_tokens ?? 0;
      outputTokens += response.usage?.output_tokens ?? 0;

      // Extract text blocks from this turn
      const textBlocks = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text);
      allTextParts.push(...textBlocks);

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
 * @param {boolean} opts.useMcp - Whether to enable MCP tool use for generation
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
  useMcp = false,
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

  const needsMcp = Boolean(useMcp);

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

    // Parse files from the response
    files = parseFiles(fullText);

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
  const projectDir = resolve(iterDir, "project");
  await writeProjectFiles(projectDir, files);



  // Track fix attempts
  let fixAttempts = 0;
  const fixLog = [];

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
          autofixToolCalls: 0,
        };
        fixLog.push(fixLogEntry);

        // Build the fix prompt with current files + errors
        const currentFilesText = await buildCurrentFilesText(projectDir, files);
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

        // Ask Claude to fix the errors. The agent can call the
        // run_eslint_autofix tool to apply known mechanical rewrites
        // before emitting fixed files. Tool calls mutate `files` in
        // place so the merge below stays consistent with disk.
        console.log(`[${iterLabel}] Asking Claude to fix errors...`);
        const fixResponse = await generateFixWithAutofixTool({
          client,
          model,
          fixSystemPrompt,
          fixPrompt,
          projectDir,
          files,
          iterLabel,
          agentLogPath,
          fixAttemptNum: fixAttempts,
        });

        totalInputTokens += fixResponse.inputTokens;
        totalOutputTokens += fixResponse.outputTokens;
        fixLogEntry.autofixToolCalls = fixResponse.toolCalls;

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
