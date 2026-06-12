import { writeFile, mkdtemp, appendFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";

import { validateProject, killDevServer } from "../evaluation/validate.js";
import { captureScreenshots } from "../evaluation/screenshot.js";
import { measureDom } from "../evaluation/dom-count.js";
import { analyzeSemanticHtml } from "../evaluation/semantic-html.js";
import { measureLighthouse } from "../evaluation/lighthouse.js";
import { measureReactProfile } from "../evaluation/react-profile.js";
import { parseFiles } from "../evaluation/parse-files.js";
import { parseFeedback } from "../evaluation/parse-feedback.js";
import { runAccessibilityTests } from "../evaluation/accessibility.js";

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

/**
 * Invoke the `claude` CLI in --print mode and return the text output.
 * Each call is fully isolated — no shared conversation history.
 *
 * @param {object} opts
 * @param {string} opts.systemPrompt - System prompt
 * @param {string} opts.userPrompt - User prompt
 * @param {string} opts.model - Model name
 * @param {string} opts.cwd - Working directory for the child process
 * @param {string} opts.iterLabel - Label for logging
 * @returns {Promise<string>} Raw text output from the CLI
 */
async function invokeClaudeCli({
  systemPrompt,
  userPrompt,
  model,
  iterLabel,
  timeoutMs = 300_000, // 5 minutes default
  mcpTools = null, // Defined MCP tools
}) {
  // Merge system prompt into user prompt to avoid --system-prompt CLI hang
  // (claude CLI v2.1.79+ hangs when --system-prompt is combined with
  // non-trivial user prompts in --print mode)
  const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

  const useMcp = Array.isArray(mcpTools) && mcpTools.length > 0;

  const args = [
    "--print",
    "--output-format",
    "text",
    "--model",
    model,
    // Don't persist this as a resumable session
    "--no-session-persistence",
  ];

  if (useMcp) {
    // Allow only the specified MCP tool prefixes
    // plus block all filesystem tools so the agent can't edit files directly.
    // --allowed-tools takes variadic args, so it must come before the prompt
    // and we pipe the prompt via stdin to avoid it being consumed as a tool name.
    args.push("--allowed-tools", ...mcpTools);
  } else {
    // No MCP needed — disable all tools
    // Note: --tools "" broke in CLI v2.1.79+; --allowed-tools "none" is the replacement
    args.push("--allowed-tools", "none");
    // Safe to pass prompt as positional arg when no variadic --allowed-tools issue
    args.push(combinedPrompt);
  }

  // When MCP is disabled, use a temp dir to avoid project context interference.
  // When MCP is enabled, we must run from the project dir so MCP servers are discovered.
  const tempCwd = useMcp ? null : await mkdtemp(join(tmpdir(), "agent-cli-"));
  const cwd = useMcp ? resolve(import.meta.dirname, "..") : tempCwd;

  console.log(
    `[${iterLabel}] Invoking claude CLI (timeout: ${Math.round(timeoutMs / 1000)}s)...`,
  );

  try {
    return await runClaudeCli();
  } finally {
    // The non-MCP path runs in a throwaway temp dir — remove it so
    // repeated iterations don't accumulate agent-cli-* dirs in tmpdir.
    if (tempCwd) {
      await rm(tempCwd, { recursive: true, force: true });
    }
  }

  function runClaudeCli() {
    return new Promise((resolvePromise, reject) => {
      const child = spawn("claude", args, {
        // When using MCP, we pipe the prompt via stdin (to avoid --allowed-tools
        // variadic arg consuming the prompt). Otherwise stdin is ignored.
        stdio: [useMcp ? "pipe" : "ignore", "pipe", "pipe"],
        cwd,
        env: {
          ...process.env,
          // Prevent the CLI from picking up any project-level config
          ...(useMcp ? {} : { CLAUDE_CODE_DISABLE_PROJECT_CONFIG: "1" }),
        },
      });

      let stdout = "";
      let stderr = "";
      let killed = false;

      // Timeout: kill the process if it takes too long. `child.killed`
      // only means a signal was sent, so escalation checks the actual
      // exit state instead.
      const timer = setTimeout(() => {
        killed = true;
        child.kill("SIGTERM");
        const escalation = setTimeout(() => {
          if (child.exitCode === null && child.signalCode === null) {
            child.kill("SIGKILL");
          }
        }, 5000);
        escalation.unref();
      }, timeoutMs);

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      // When using MCP, pipe the combined prompt via stdin then close the stream
      if (useMcp) {
        child.stdin.write(combinedPrompt);
        child.stdin.end();
      }

      child.on("error", (err) => {
        clearTimeout(timer);
        reject(
          new Error(
            `Failed to spawn claude CLI: ${err.message}. Is it installed? (npm install -g @anthropic-ai/claude-code)`,
          ),
        );
      });

      child.on("close", (code) => {
        clearTimeout(timer);
        if (killed) {
          reject(
            new Error(
              `claude CLI timed out after ${Math.round(timeoutMs / 1000)}s. stdout: ${stdout.length} bytes, stderr: ${stderr.slice(0, 500)}`,
            ),
          );
        } else if (code !== 0) {
          reject(
            new Error(
              `claude CLI exited with code ${code}.\nstderr: ${stderr.slice(0, 1000)}`,
            ),
          );
        } else {
          resolvePromise(stdout);
        }
      });
    });
  }
}

/**
 * Run a single isolated agent iteration using the `claude` CLI.
 * No API key required — uses whatever auth the CLI already has.
 *
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
  // Save the fully-resolved prompt for this iteration so it can be inspected
  // later to confirm every iteration received the same brief.
  await writeFile(resolve(iterDir, "_prompt.txt"), promptContent, "utf-8");

  const needsMcp = Boolean(mcpConfig);
  const mcpTools =
    needsMcp && mcpConfig.toolPrefix ? [mcpConfig.toolPrefix] : null;
  // MCP calls need more time since the model makes tool calls before generating code
  const generationTimeout = needsMcp ? 600_000 : 300_000;

  if (needsMcp) {
    console.log(`[${iterLabel}] MCP tools enabled`);
  }

  // --- Step 1: Initial generation (with retries if no files are produced) ---
  let fullText = "";
  let files = [];
  let generationAttempt = 0;

  const agentLogPath = resolve(iterDir, "_agent_log.txt");

  while (generationAttempt < maxGenerationRetries) {
    generationAttempt++;

    if (generationAttempt > 1) {
      console.log(
        `[${iterLabel}] Generation attempt ${generationAttempt}/${maxGenerationRetries} (previous attempt produced no files)...`,
      );
    }

    fullText = await invokeClaudeCli({
      systemPrompt,
      userPrompt: promptContent,
      model,
      iterLabel,
      mcpTools,
      timeoutMs: generationTimeout,
    });

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

  // Parse feedback from the response
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

          // Save any non-fatal console errors for reference
          if (validation.consoleErrors.length > 0) {
            await writeFile(
              resolve(iterDir, "_console_errors.txt"),
              validation.consoleErrors.join("\n"),
              "utf-8",
            );
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

          // Run accessibility tests against the live dev server
          let a11yResults = null;
          try {
            a11yResults = await runAccessibilityTests({
              serverUrl: validation.serverUrl,
              iterDir,
              iterLabel,
            });
          } catch (err) {
            console.warn(`${tag(iterLabel)} ${warn("⚠ A11y tests failed:")} ${err.message}`);
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
            fixAttempts,
            fixLog,
            feedback,
            a11yResults,
            lighthouseResults,
            reactProfile,
            domElementCount,
            domHtmlBytes,
            semanticHtml,
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

        fixLog.push({
          attempt: fixAttempts,
          errors: validation.consoleErrors,
          fatalError: validation.fatalError,
        });

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

        // Ask Claude to fix the errors
        console.log(`[${iterLabel}] Asking Claude CLI to fix errors...`);
        const fixText = await invokeClaudeCli({
          systemPrompt: fixSystemPrompt,
          userPrompt: fixPrompt,
          model,
          iterLabel: `${iterLabel}/fix-${fixAttempts}`,
        });

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
      fixAttempts,
      fixLog,
      feedback,
      a11yResults: null,
      lighthouseResults: null,
      reactProfile: null,
      domElementCount: lastDomElementCount,
      domHtmlBytes: lastDomHtmlBytes,
      semanticHtml: lastSemanticHtml,
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
    fixAttempts,
    fixLog,
    feedback,
    a11yResults: null,
    lighthouseResults: null,
    reactProfile: null,
    domElementCount: null,
    domHtmlBytes: null,
    semanticHtml: null,
  });
}
