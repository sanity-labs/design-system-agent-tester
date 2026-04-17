import Anthropic from "@anthropic-ai/sdk";
import { runAccessibilityTests } from "./a11y.js";
import { lintProject, formatLintSummary } from "./lint.js";
import { createSanityUiMcpClient } from "./mcp-client.js";
import {
  writeFile,
  mkdir,
  rm,
  readFile,
  appendFile,
} from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");


import {
  validateProject,
  killDevServer,
  captureScreenshot,
} from "./screenshot.js";
import { measurePerformance } from "./perf.js";
import {
  parseFiles,
  parseFeedback,
  extractSanityUIComponents,
  extractInlineStyles,
  extractComponentUsageCounts,
  isSourceFile,
} from "./analyze.js";

const SYSTEM_PROMPT = readFileSync(resolve(PROJECT_ROOT, "prompts", "system.md"), "utf-8").trim();
const FIX_SYSTEM_PROMPT = readFileSync(resolve(PROJECT_ROOT, "prompts", "system-fix.md"), "utf-8").trim();

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
 * Simple single-shot generation (no MCP tools).
 */
async function generateSimple({ client, model, promptContent }) {
  const response = await callAnthropicWithRetry(client, {
    model,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
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
 * 1. Start the local Sanity UI MCP server
 * 2. Register its tools with the Anthropic SDK
 * 3. Let the model call tools (list_components, get_component_guideline, etc.)
 * 4. Route each tool call to the MCP server and send results back
 * 5. Continue until the model stops calling tools and emits its final text
 */
async function generateWithMcp({
  client,
  model,
  promptContent,
  iterDir,
  iterLabel,
}) {
  let mcpClient;
  try {
    console.log(`[${iterLabel}] Starting Sanity UI MCP server...`);
    mcpClient = await createSanityUiMcpClient();

    const mcpTools = mcpClient.getToolsForAnthropic();
    const mcpInstructions = mcpClient.getInstructions() || "";

    console.log(
      `[${iterLabel}] MCP ready — ${mcpTools.length} tools available`,
    );

    // Build system prompt with MCP instructions appended.
    // Amend the instructions to fix known issues:
    // - The MCP server instructions say to fetch the "props" section, but that
    //   section returns empty for most components. "all" works and includes props.
    // - search_design_system and list_icons don't support multi-word queries well;
    //   the model needs to search one term at a time.
    const mcpAmendments = `
IMPORTANT corrections to the workflow above:
- When calling get_component_guideline, ALWAYS use section: "all" (NOT "props"). The "props" section does not exist for most components. "all" includes props, usage, best practices, accessibility, variants, states, and content.
- When calling list_icons, search for ONE term at a time (e.g. "menu", then "document", then "search"). Multi-word searches like "menu home document" return no results.
- When calling search_design_system, use short single-concept queries (e.g. "layout", "navigation", "theme"). Long multi-word queries return no results.
- When calling validate_icons, use the icon names WITHOUT the "Icon" suffix (e.g. "home" not "HomeIcon", "document" not "DocumentIcon").
- ALWAYS call get_component_guideline with section "all" for EVERY component you plan to use before writing any code.
`;
    const systemPrompt =
      SYSTEM_PROMPT + "\n\n" + mcpInstructions + "\n" + mcpAmendments;

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
            max_tokens: 16000,
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
 * @returns {Promise<object>} Result metrics
 */
export async function runAgent({
  promptContent,
  model,
  iterDir,
  iterLabel,
  takeScreenshots,
  maxFixes = 5,
  maxGenerationRetries = 3,
  useMcp,
}) {
  // Sonnet 4.6 generation can take 2-3 minutes per call. The default SDK
  // timeout is 10 min with 2 retries (30 min worst-case per call). Increase
  // the per-request timeout to 15 min and reduce retries to 1 so a slow
  // call doesn't block the entire run.
  const client = new Anthropic({
    timeout: 15 * 60 * 1000, // 15 minutes
    maxRetries: 1,
  });

  // useMcp flag from CLI: true = auto-detect, false = force off
  const needsMcp = useMcp === false ? false : /mcp/i.test(promptContent);

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
        iterDir,
        iterLabel,
      });
    } else {
      result = await generateSimple({
        client,
        model,
        promptContent,
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

  // If the prompt references @sanity-labs/ui-poc, enforce correct imports
  // mechanically. The model's training prior for @sanity/ui is too strong
  // for prompt instructions alone to override reliably.
  if (promptContent.includes("@sanity-labs/ui-poc")) {
    const patched = enforceUiPocImports(files, iterLabel);
    if (patched) {
      await writeProjectFiles(projectDir, files);
    }
  }

  // --- Step 1b: Lint the project files ---
  let lintResults = null;
  try {
    lintResults = await lintProject(projectDir, iterLabel);
  } catch (err) {
    console.warn(`[${iterLabel}] ⚠ Lint failed: ${err.message}`);
  }

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
          // Page rendered! Take the screenshot from the running server.
          console.log(`[${iterLabel}] ✓ Page renders successfully`);

          const screenshotPath = await captureScreenshot(
            validation.serverUrl,
            iterDir,
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
            console.warn(`[${iterLabel}] ⚠ A11y tests failed: ${err.message}`);
          }

          // Run performance measurements against the live dev server
          let perfResults = null;
          try {
            perfResults = await measurePerformance({
              serverUrl: validation.serverUrl,
              iterDir,
              iterLabel,
            });
          } catch (err) {
            console.warn(
              `[${iterLabel}] ⚠ Perf measurement failed: ${err.message}`,
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

          // Re-lint after any fixes
          if (fixAttempts > 0) {
            try {
              lintResults = await lintProject(projectDir, iterLabel);
            } catch { /* ignore */ }
          }

          const result = buildResult({
            files,
            model,
            iterDir,
            iterLabel,
            screenshotPath,
            totalInputTokens,
            totalOutputTokens,
            fixAttempts,
            fixLog,
            feedback,
            a11yResults,
            perfResults,
            lintResults,
            runner: "api",
          });
          return result;
        }

        // --- Validation failed — attempt a fix ---
        if (fixAttempts >= maxFixes) {
          console.warn(
            `[${iterLabel}] ✗ Max fix attempts (${maxFixes}) reached — giving up`,
          );
          break;
        }

        fixAttempts++;
        const errorSummary = validation.fatalError || "Unknown error";
        console.log(
          `[${iterLabel}] ✗ Validation failed (fix attempt ${fixAttempts}/${maxFixes}): ${errorSummary.split("\n")[0]}`,
        );

        fixLog.push({
          attempt: fixAttempts,
          errors: validation.consoleErrors,
          fatalError: validation.fatalError,
        });

        // Build the fix prompt with current files + errors
        const currentFilesText = await buildCurrentFilesText(projectDir, files);
        const lintSummary = lintResults ? formatLintSummary(lintResults) : "";
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

        // Ask Claude to fix the errors
        console.log(`[${iterLabel}] Asking Claude to fix errors...`);
        const fixResponse = await callAnthropicWithRetry(
          client,
          {
            model,
            max_tokens: 16000,
            system: FIX_SYSTEM_PROMPT,
            messages: [
              {
                role: "user",
                content: fixPrompt,
              },
            ],
          },
          iterLabel,
        );

        totalInputTokens += fixResponse.usage?.input_tokens ?? 0;
        totalOutputTokens += fixResponse.usage?.output_tokens ?? 0;

        const fixText = fixResponse.content
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("\n");

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

        // Re-enforce @sanity-labs/ui-poc after every fix cycle — the model
        // frequently "fixes" errors by removing ui-poc and reverting to @sanity/ui
        if (promptContent.includes("@sanity-labs/ui-poc")) {
          const rePatched = enforceUiPocImports(files, iterLabel);
          if (rePatched) {
            await appendFile(
              agentLogPath,
              `=== POST-FIX ENFORCEMENT [${new Date().toISOString()}] ===\n` +
                `Re-applied @sanity-labs/ui-poc imports after fix attempt ${fixAttempts}\n\n`,
              "utf-8",
            );
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
    // Final lint for iterations that skip the validate loop
    if (!lintResults) {
      try {
        lintResults = await lintProject(projectDir, iterLabel);
      } catch { /* ignore */ }
    }

    let screenshotPath = null;
    try {
      if (lastValidation.serverUrl) {
        screenshotPath = await captureScreenshot(
          lastValidation.serverUrl,
          iterDir,
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
      screenshotPath,
      totalInputTokens,
      totalOutputTokens,
      fixAttempts,
      fixLog,
      feedback,
      a11yResults: null,
      perfResults: null,
      runner: "api",
    });
  }

  // No screenshots requested or no package.json — just return metrics
  return buildResult({
    files,
    model,
    iterDir,
    iterLabel,
    screenshotPath: null,
    totalInputTokens,
    totalOutputTokens,
    fixAttempts,
    fixLog,
    feedback,
    a11yResults: null,
    perfResults: null,
    runner: "api",
  });
}

// --- Helper functions ---

/**
 * Components that belong in @sanity-labs/ui-poc, NOT @sanity/ui.
 */
const UI_POC_COMPONENTS = ["Box", "Flex", "Grid", "Text", "Heading", "Card", "Divider"];

/**
 * Mechanically enforce @sanity-labs/ui-poc usage in generated files.
 * Returns true if any file was modified.
 *
 * This exists because the model's training prior for @sanity/ui is too
 * strong for prompt-only instructions to override reliably — even when
 * stated in the system prompt and repeated 47 times in the user prompt.
 */
function enforceUiPocImports(files, iterLabel) {
  let patched = false;

  // --- 1. Patch package.json ---
  const pkgFile = files.find((f) => f.path === "package.json");
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content);
      const deps = pkg.dependencies || {};
      let pkgChanged = false;

      // Ensure @sanity-labs/ui-poc is listed
      if (!deps["@sanity-labs/ui-poc"]) {
        deps["@sanity-labs/ui-poc"] = "latest";
        pkgChanged = true;
      }

      // Ensure classnames is listed (required by ui-poc)
      if (!deps["classnames"]) {
        deps["classnames"] = "latest";
        pkgChanged = true;
      }

      // Ensure React 19 (ui-poc peer dep)
      if (deps["react"] && !deps["react"].includes("19")) {
        deps["react"] = "^19.2";
        pkgChanged = true;
      }
      if (deps["react-dom"] && !deps["react-dom"].includes("19")) {
        deps["react-dom"] = "^19.2";
        pkgChanged = true;
      }

      // Upgrade @types/react* to v19 too
      const devDeps = pkg.devDependencies || {};
      if (devDeps["@types/react"] && !devDeps["@types/react"].includes("19")) {
        devDeps["@types/react"] = "^19";
        pkgChanged = true;
      }
      if (devDeps["@types/react-dom"] && !devDeps["@types/react-dom"].includes("19")) {
        devDeps["@types/react-dom"] = "^19";
        pkgChanged = true;
      }

      if (pkgChanged) {
        pkg.dependencies = deps;
        pkg.devDependencies = devDeps;
        pkgFile.content = JSON.stringify(pkg, null, 2) + "\n";
        patched = true;
      }
    } catch {
      // Malformed package.json — skip
    }
  }

  // --- 2. Rewrite imports in source files ---
  // Build a regex that matches: import { Box, Flex, ... } from '@sanity/ui'
  // where at least one of the UI_POC_COMPONENTS is in the import list.
  const pocSet = new Set(UI_POC_COMPONENTS);

  for (const file of files) {
    if (!/\.(tsx?|jsx?|mjs)$/.test(file.path)) continue;

    let content = file.content;
    let fileChanged = false;

    // Match all import statements from @sanity/ui
    const importRe = /import\s*\{([^}]+)\}\s*from\s*['"]@sanity\/ui['"]/g;
    const replacements = [];

    let match;
    while ((match = importRe.exec(content)) !== null) {
      const names = match[1].split(",").map((n) => n.trim()).filter(Boolean);
      const forPoc = names.filter((n) => pocSet.has(n));
      const forSanity = names.filter((n) => !pocSet.has(n));

      if (forPoc.length === 0) continue; // Nothing to move

      const newStatements = [];
      if (forPoc.length > 0) {
        newStatements.push(
          `import { ${forPoc.join(", ")} } from '@sanity-labs/ui-poc'`,
        );
      }
      if (forSanity.length > 0) {
        newStatements.push(
          `import { ${forSanity.join(", ")} } from '@sanity/ui'`,
        );
      }

      replacements.push({
        original: match[0],
        replacement: newStatements.join("\n"),
      });
    }

    for (const { original, replacement } of replacements) {
      content = content.replace(original, replacement);
      fileChanged = true;
    }

    // --- 3. Ensure styles.css import in main.tsx / main.tsx ---
    if (/main\.(tsx?|jsx?)$/.test(file.path)) {
      if (!content.includes("@sanity-labs/ui-poc/styles.css")) {
        // Add after the last import statement
        const lastImportIdx = content.lastIndexOf("\nimport ");
        if (lastImportIdx !== -1) {
          const eol = content.indexOf("\n", lastImportIdx + 1);
          content =
            content.slice(0, eol + 1) +
            "import '@sanity-labs/ui-poc/styles.css'\n" +
            content.slice(eol + 1);
          fileChanged = true;
        }
      }
    }

    if (fileChanged) {
      file.content = content;
      patched = true;
    }
  }

  if (patched) {
    console.log(
      `[${iterLabel}] Post-processed files to enforce @sanity-labs/ui-poc imports`,
    );
  }

  return patched;
}

/**
 * Write all files to the project directory (clean slate).
 */
async function writeProjectFiles(projectDir, files) {
  if (existsSync(projectDir)) {
    // Remove node_modules from the list of things to delete to save time on reinstall
    const { readdir } = await import("node:fs/promises");
    if (existsSync(projectDir)) {
      const entries = await readdir(projectDir);
      for (const entry of entries) {
        if (
          entry !== "node_modules" &&
          entry !== "package-lock.json"
        ) {
          await rm(resolve(projectDir, entry), {
            recursive: true,
            force: true,
          });
        }
      }
    }
  }
  await mkdir(projectDir, { recursive: true });

  for (const file of files) {
    const filePath = resolve(projectDir, file.path);
    const dir = resolve(filePath, "..");
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, file.content, "utf-8");
  }
}

/**
 * Re-read project files from disk (in case npm install changed package.json etc.)
 */
async function readProjectFiles(projectDir, originalFiles) {
  const updatedFiles = [];
  for (const file of originalFiles) {
    const filePath = resolve(projectDir, file.path);
    if (existsSync(filePath)) {
      const content = await readFile(filePath, "utf-8");
      updatedFiles.push({ path: file.path, content });
    } else {
      updatedFiles.push(file);
    }
  }
  return updatedFiles;
}

/**
 * Build a text representation of the current project files for the fix prompt.
 */
async function buildCurrentFilesText(projectDir, files) {
  const parts = [];
  for (const file of files) {
    const filePath = resolve(projectDir, file.path);
    let content = file.content;
    if (existsSync(filePath)) {
      content = await readFile(filePath, "utf-8");
    }
    parts.push(`--- ${file.path} ---\n${content}\n--- end ---`);
  }
  return parts.join("\n\n");
}

/**
 * Build the fix prompt to send to Claude.
 */
function buildFixPrompt(currentFilesText, consoleErrors, fatalError) {
  let prompt = `The following web application fails to render in the browser.\n\n`;
  prompt += `## Current Project Files\n\n${currentFilesText}\n\n`;
  prompt += `## Errors\n\n`;

  if (fatalError) {
    prompt += `**Fatal error (app did not mount):**\n${fatalError}\n\n`;
  }

  if (consoleErrors.length > 0) {
    prompt += `**Browser console errors:**\n`;
    // Limit to the most relevant errors to avoid token bloat
    const relevantErrors = consoleErrors
      .filter(
        (e) =>
          e.includes("[pageerror]") ||
          e.includes("does not provide an export") ||
          e.includes("is not defined") ||
          e.includes("Cannot read properties") ||
          e.includes("Failed to") ||
          e.includes("SyntaxError") ||
          e.includes("Unexpected token"),
      )
      .slice(0, 10);

    if (relevantErrors.length > 0) {
      prompt += relevantErrors.join("\n") + "\n\n";
    } else {
      // Fall back to first few errors
      prompt += consoleErrors.slice(0, 5).join("\n") + "\n\n";
    }
  }

  prompt += `Please fix all errors and output the corrected files. Only output files that need to change.`;
  return prompt;
}

/**
 * Build the final result object and save metadata.
 */
async function buildResult({
  files,
  model,
  iterDir,
  iterLabel,
  screenshotPath,
  totalInputTokens,
  totalOutputTokens,
  fixAttempts,
  fixLog,
  feedback,
  a11yResults,
  perfResults,
  lintResults,
  runner,
}) {
  const linesOfCode = files.reduce(
    (sum, f) => sum + f.content.split("\n").length,
    0,
  );

  const sanityUIComponents = extractSanityUIComponents(files);
  const inlineStyles = extractInlineStyles(files);
  const componentUsage = extractComponentUsageCounts(files);

  const sourceContents = files
    .filter((f) => isSourceFile(f.path))
    .map((f) => ({ path: f.path, content: f.content }));

  const meta = {
    runner,
    model,
    iterLabel,
    linesOfCode,
    fileCount: files.length,
    filePaths: files.map((f) => f.path),
    sanityUIComponents: [...sanityUIComponents],
    inlineStyles,
    componentUsage,
    screenshotPath,
    inputTokens: totalInputTokens || null,
    outputTokens: totalOutputTokens || null,
    fixAttempts,
    fixLog,
    feedback,
    a11yResults,
    perfResults,
    lintResults,
  };
  await writeFile(
    resolve(iterDir, "_meta.json"),
    JSON.stringify(meta, null, 2),
    "utf-8",
  );

  return {
    model,
    linesOfCode,
    fileCount: files.length,
    files: sourceContents,
    sanityUIComponents: [...sanityUIComponents],
    inlineStyles,
    componentUsage,
    screenshotPath,
    inputTokens: totalInputTokens || null,
    outputTokens: totalOutputTokens || null,
    fixAttempts,
    fixLog,
    feedback,
    a11yResults,
    perfResults,
    lintResults,
  };
}
