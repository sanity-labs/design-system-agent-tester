import { writeFile, mkdir, rm, readFile, mkdtemp, appendFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

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
import { runAccessibilityTests } from "./a11y.js";

const SYSTEM_PROMPT = readFileSync(resolve(PROJECT_ROOT, "prompts", "system.md"), "utf-8").trim();
const FIX_SYSTEM_PROMPT = readFileSync(resolve(PROJECT_ROOT, "prompts", "system-fix.md"), "utf-8").trim();
const CONTRIBUTION_SYSTEM_PROMPT = readFileSync(resolve(PROJECT_ROOT, "prompts", "system-contribution.md"), "utf-8").trim();
const AILF_SYSTEM_PROMPT = readFileSync(resolve(PROJECT_ROOT, "prompts", "system-ailf-tasks.md"), "utf-8").trim();

/**
 * Parse ---CHALLENGES--- blocks from agent contribution responses.
 * Returns an array of { category, text } objects.
 */
function parseChallenges(text) {
  const match = text.match(/---CHALLENGES---\s*([\s\S]*?)\s*---END CHALLENGES---/);
  if (!match) return [];
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => {
      const catMatch = line.match(/^-\s*\[(\w[\w-]*)\]\s*(.*)/);
      if (catMatch) return { category: catMatch[1], text: catMatch[2].trim() };
      return { category: "other", text: line.slice(2).trim() };
    });
}

/**
 * Generate contributions based on feedback from the build step.
 * Calls the model via the Claude CLI with the feedback items and the
 * contribution system prompt, then writes all outputs to a contributions/
 * directory inside iterDir.
 */
async function generateContributions({ model, feedback, iterDir, iterLabel, agentLogPath }) {
  const contribDir = resolve(iterDir, "contributions");
  await mkdir(contribDir, { recursive: true });

  if (!feedback || feedback.length === 0) {
    console.log(`[${iterLabel}] No feedback to generate contributions from — skipping`);
    await writeFile(resolve(contribDir, "feedback.json"), JSON.stringify({ challenges: [], note: "No feedback was provided" }, null, 2), "utf-8");
    await writeFile(resolve(contribDir, "feedback.md"), "# Contribution Challenges\n\nNo feedback was provided by the agent, so no contributions were generated.\n", "utf-8");
    return { fileCount: 0, challengeCount: 0 };
  }

  const feedbackText = feedback
    .map((f, i) => `${i + 1}. [${f.category}] ${f.text}`)
    .join("\n");

  const userPrompt = `Here is the feedback I provided after building a web application with Sanity UI:\n\n${feedbackText}\n\nPlease create concrete contributions that address each piece of feedback. Follow the output format specified in your instructions.`;

  console.log(`[${iterLabel}] Generating contributions from ${feedback.length} feedback item(s)...`);

  const contribText = await invokeClaudeCli({
    systemPrompt: CONTRIBUTION_SYSTEM_PROMPT,
    userPrompt,
    model,
    iterLabel: `${iterLabel}/contrib`,
  });

  // Save raw response
  await writeFile(resolve(contribDir, "_raw_response.txt"), contribText, "utf-8");

  // Log to cumulative agent log
  await appendFile(
    agentLogPath,
    `=== CONTRIBUTION GENERATION [${new Date().toISOString()}] ===\n` +
      `Feedback items: ${feedback.length}\n` +
      `Response length: ${contribText.length} bytes\n\n` +
      contribText +
      "\n\n",
    "utf-8",
  );

  // Parse contribution files and write them
  const contribFiles = parseFiles(contribText);
  for (const file of contribFiles) {
    const filePath = resolve(contribDir, file.path);
    const dir = resolve(filePath, "..");
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, file.content, "utf-8");
  }

  console.log(`[${iterLabel}] Wrote ${contribFiles.length} contribution file(s) to contributions/`);

  // Parse challenges
  const challenges = parseChallenges(contribText);

  // Write structured feedback as JSON
  const feedbackJson = {
    generatedAt: new Date().toISOString(),
    model,
    sourceFeedback: feedback,
    contributions: contribFiles.map((f) => f.path),
    challenges,
  };
  await writeFile(
    resolve(contribDir, "feedback.json"),
    JSON.stringify(feedbackJson, null, 2),
    "utf-8",
  );

  // Write human-readable feedback as Markdown
  let md = `# Contribution Challenges\n\n`;
  md += `**Generated:** ${feedbackJson.generatedAt}\n`;
  md += `**Model:** ${model}\n`;
  md += `**Source feedback items:** ${feedback.length}\n`;
  md += `**Contributions produced:** ${contribFiles.length}\n\n`;

  if (contribFiles.length > 0) {
    md += `## Contributions\n\n`;
    for (const f of contribFiles) {
      md += `- \`${f.path}\`\n`;
    }
    md += `\n`;
  }

  if (challenges.length > 0) {
    md += `## Challenges\n\n`;
    for (const c of challenges) {
      md += `- **[${c.category}]** ${c.text}\n`;
    }
    md += `\n`;
  } else {
    md += `## Challenges\n\nNo challenges reported.\n\n`;
  }

  md += `## Source Feedback\n\n`;
  for (const f of feedback) {
    md += `- **[${f.category}]** ${f.text}\n`;
  }
  md += `\n`;

  await writeFile(resolve(contribDir, "feedback.md"), md, "utf-8");

  return { fileCount: contribFiles.length, challengeCount: challenges.length };
}

/**
 * Generate AILF evaluation tasks based on patterns where the agent struggled.
 */
async function generateAilfTasks({ model, feedback, fixLog, lintResults, inlineStyles, a11yResults, iterDir, iterLabel, agentLogPath }) {
  const ailfDir = resolve(iterDir, "ailf");
  await mkdir(ailfDir, { recursive: true });

  const sections = [];

  if (feedback && feedback.length > 0) {
    sections.push(
      `## Agent Feedback (${feedback.length} items)\n\n` +
      feedback.map((f, i) => `${i + 1}. [${f.category}] ${f.text}`).join("\n")
    );
  }

  if (fixLog && fixLog.length > 0) {
    sections.push(
      `## Fix Attempts (${fixLog.length})\n\n` +
      fixLog.map((f) => `- Fix #${f.attempt}: ${(f.fatalError || "unknown").split("\n")[0]}`).join("\n")
    );
  }

  if (lintResults && lintResults.messages && lintResults.messages.length > 0) {
    const lintSummary = {};
    for (const msg of lintResults.messages) {
      const key = `${msg.ruleId} (${msg.severity === 2 ? "error" : "warning"})`;
      lintSummary[key] = (lintSummary[key] || 0) + 1;
    }
    sections.push(
      `## Lint Violations\n\n` +
      Object.entries(lintSummary).map(([rule, count]) => `- ${rule}: ${count} occurrence(s)`).join("\n")
    );
  }

  if (inlineStyles && inlineStyles.total > 0) {
    const topProps = Object.entries(inlineStyles.byProperty || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([prop, count]) => `- ${prop}: ${count}`)
      .join("\n");
    const topComponents = Object.entries(inlineStyles.byComponent || {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([comp, count]) => `- ${comp}: ${count}`)
      .join("\n");
    sections.push(
      `## Inline Styles (${inlineStyles.total} total)\n\n` +
      `Top CSS properties used as inline styles:\n${topProps}\n\n` +
      `Top components with inline styles:\n${topComponents}`
    );
  }

  if (a11yResults && a11yResults.tests) {
    const failed = Object.entries(a11yResults.tests)
      .filter(([, t]) => t.status === "failed")
      .map(([name, t]) => `- ${name}: ${t.details?.issueCount || "?"} issue(s)`)
      .join("\n");
    if (failed) {
      sections.push(`## Accessibility Failures\n\n${failed}`);
    }
  }

  if (sections.length === 0) {
    console.log(`[${iterLabel}] No struggle data to generate AILF tasks from — skipping`);
    return { taskCount: 0 };
  }

  const userPrompt = `Here is the data from a test iteration where an AI agent built a web application using the Sanity Design System.\n\n${sections.join("\n\n---\n\n")}\n\nAnalyze the struggle patterns and produce AILF evaluation tasks that target the specific areas where the agent failed or had friction. Follow the output format specified in your instructions.`;

  console.log(`[${iterLabel}] Generating AILF tasks from ${sections.length} signal(s)...`);

  const ailfText = await invokeClaudeCli({
    systemPrompt: AILF_SYSTEM_PROMPT,
    userPrompt,
    model,
    iterLabel: `${iterLabel}/ailf`,
  });

  await writeFile(resolve(ailfDir, "_raw_response.txt"), ailfText, "utf-8");

  await appendFile(
    agentLogPath,
    `=== AILF TASK GENERATION [${new Date().toISOString()}] ===\n` +
      `Signals: ${sections.length}\n` +
      `Response length: ${ailfText.length} bytes\n\n` +
      ailfText +
      "\n\n",
    "utf-8",
  );

  const taskFiles = parseFiles(ailfText);
  let taskCount = 0;
  for (const file of taskFiles) {
    if (!file.path.endsWith(".json")) continue;
    const filePath = resolve(ailfDir, file.path);
    const dir = resolve(filePath, "..");
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, file.content, "utf-8");
    taskCount++;
  }

  console.log(`[${iterLabel}] Wrote ${taskCount} AILF task(s) to ailf/`);

  const taskSummaries = taskFiles
    .filter((f) => f.path.endsWith(".json"))
    .map((f) => {
      try {
        const task = JSON.parse(f.content);
        return {
          file: f.path,
          id: task.id?.current || "unknown",
          description: task.description || "",
          assertCount: (task.assert || []).length,
          tags: task.tags || [],
        };
      } catch {
        return { file: f.path, id: "parse-error", description: "", assertCount: 0, tags: [] };
      }
    });

  await writeFile(
    resolve(ailfDir, "_summary.json"),
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      model,
      taskCount,
      tasks: taskSummaries,
    }, null, 2),
    "utf-8",
  );

  return { taskCount };
}

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
  mcpTools = null, // e.g. ["mcp__Sanity"] to allow Sanity MCP tools
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
    // Allow only the specified MCP tool prefixes (e.g. "mcp__Sanity")
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

    // Timeout: kill the process if it takes too long
    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
      setTimeout(() => {
        if (!child.killed) child.kill("SIGKILL");
      }, 5000);
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
  generateContributions = false,
  generateAilf = true,
}) {
  // Save the fully-resolved prompt for this iteration so it can be inspected
  // later to confirm every iteration received the same brief.
  await writeFile(resolve(iterDir, "_prompt.txt"), promptContent, "utf-8");

  // useMcp flag from CLI: true = auto-detect, false = force off
  const needsMcp = useMcp === false ? false : /mcp/i.test(promptContent);
  const mcpTools = needsMcp ? ["mcp__sanity-ui"] : null;
  // MCP calls need more time since the model makes tool calls before generating code
  const generationTimeout = needsMcp ? 600_000 : 300_000;

  if (needsMcp) {
    console.log(`[${iterLabel}] MCP tools enabled (prompt references MCP)`);
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
      systemPrompt: SYSTEM_PROMPT,
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

  // If the prompt references @sanity-labs/design-system, enforce correct imports
  // mechanically. The model's training prior for @sanity/ui is too strong
  // for prompt instructions alone to override reliably.
  if (promptContent.includes("@sanity-labs/ui-poc")) {
    const patched = enforceUiPocImports(files, iterLabel);
    if (patched) {
      await writeProjectFiles(projectDir, files);
    }
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

          // Save any non-fatal console errors for reference
          if (validation.consoleErrors.length > 0) {
            await writeFile(
              resolve(iterDir, "_console_errors.txt"),
              validation.consoleErrors.join("\n"),
              "utf-8",
            );
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

          // --- Step 3: Generate contributions from feedback ---
          let contribResult = null;
          if (generateContributions && feedback.length > 0) {
            try {
              contribResult = await generateContributions({
                model, feedback, iterDir, iterLabel, agentLogPath,
              });
            } catch (err) {
              console.warn(`[${iterLabel}] ⚠ Contribution generation failed: ${err.message}`);
            }
          }

          // --- Step 4: Generate AILF tasks from struggle patterns ---
          let ailfResult = null;
          if (generateAilf) try {
            ailfResult = await generateAilfTasks({
              model, feedback, fixLog, lintResults: null,
              inlineStyles: extractInlineStyles(files),
              a11yResults, iterDir, iterLabel, agentLogPath,
            });
          } catch (err) {
            console.warn(`[${iterLabel}] ⚠ AILF task generation failed: ${err.message}`);
          }

          // Collect final metrics
          files = await readProjectFiles(projectDir, files);
          const result = buildResult({
            files,
            model,
            iterDir,
            iterLabel,
            screenshotPath,
            fixAttempts,
            fixLog,
            feedback,
            a11yResults,
            perfResults,
            contribResult,
            ailfResult,
            domElementCount: validation.domElementCount,
            semanticHtml: validation.semanticHtml,
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
          systemPrompt: FIX_SYSTEM_PROMPT,
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

        // Re-enforce @sanity-labs/design-system after every fix cycle — the model
        // frequently "fixes" errors by removing design-system and reverting to @sanity/ui
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

    // --- Step 3: Generate contributions from feedback (fallback path) ---
    let contribResult = null;
    if (generateContributions && feedback.length > 0) {
      try {
        contribResult = await generateContributions({
          model, feedback, iterDir, iterLabel, agentLogPath,
        });
      } catch (err) {
        console.warn(`[${iterLabel}] ⚠ Contribution generation failed: ${err.message}`);
      }
    }

    // --- Step 4: Generate AILF tasks from struggle patterns (fallback path) ---
    let ailfResult = null;
    if (generateAilf) try {
      ailfResult = await generateAilfTasks({
        model, feedback, fixLog, lintResults: null,
        inlineStyles: extractInlineStyles(files),
        a11yResults: null, iterDir, iterLabel, agentLogPath,
      });
    } catch (err) {
      console.warn(`[${iterLabel}] ⚠ AILF task generation failed: ${err.message}`);
    }

    files = await readProjectFiles(projectDir, files);
    return buildResult({
      files,
      model,
      iterDir,
      iterLabel,
      screenshotPath,
      fixAttempts,
      fixLog,
      feedback,
      a11yResults: null,
      perfResults: null,
      contribResult,
      ailfResult,
      domElementCount: lastValidation.domElementCount,
      semanticHtml: lastValidation.semanticHtml,
    });
  }

  // --- Step 3: Generate contributions from feedback (no-screenshot path) ---
  let contribResult = null;
  if (generateContributions && feedback.length > 0) {
    try {
      contribResult = await generateContributions({
        model, feedback, iterDir, iterLabel, agentLogPath,
      });
    } catch (err) {
      console.warn(`[${iterLabel}] ⚠ Contribution generation failed: ${err.message}`);
    }
  }

  // --- Step 4: Generate AILF tasks from struggle patterns (no-screenshot path) ---
  let ailfResult = null;
  if (generateAilf) try {
    ailfResult = await generateAilfTasks({
      model, feedback, fixLog, lintResults: null,
      inlineStyles: extractInlineStyles(files),
      a11yResults: null, iterDir, iterLabel, agentLogPath,
    });
  } catch (err) {
    console.warn(`[${iterLabel}] ⚠ AILF task generation failed: ${err.message}`);
  }

// No screenshots requested or no package.json — just return metrics
  return buildResult({
    files,
    model,
    iterDir,
    iterLabel,
    screenshotPath: null,
    fixAttempts,
    fixLog,
    feedback,
    a11yResults: null,
    perfResults: null,
    contribResult,
    ailfResult,
    domElementCount: null,
    semanticHtml: null,
  });
}

// --- Helper functions ---

/**
 * Components that belong in @sanity-labs/design-system, NOT @sanity/ui.
 */
const UI_POC_COMPONENTS = ["Box", "Flex", "Grid", "Text", "Heading", "Card", "Divider"];

/**
 * Mechanically enforce @sanity-labs/design-system usage in generated files.
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

      // Ensure @sanity-labs/design-system is listed
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

      if (forPoc.length === 0) continue;

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

    // --- 3. Ensure styles.css import in main.tsx / main.jsx ---
    if (/main\.(tsx?|jsx?)$/.test(file.path)) {
      if (!content.includes("@sanity-labs/ui-poc/styles.css")) {
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
      `[${iterLabel}] Post-processed files to enforce @sanity-labs/design-system imports`,
    );
  }

  return patched;
}

/**
 * Write all files to the project directory.
 * Preserves node_modules and package-lock.json to avoid unnecessary reinstall.
 */
async function writeProjectFiles(projectDir, files) {
  if (existsSync(projectDir)) {
    const { readdir } = await import("node:fs/promises");
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
  fixAttempts,
  fixLog,
  feedback,
  a11yResults,
  perfResults,
  contribResult,
  ailfResult,
  domElementCount,
  semanticHtml,
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
    runner: "cli",
    model,
    iterLabel,
    linesOfCode,
    fileCount: files.length,
    filePaths: files.map((f) => f.path),
    sanityUIComponents: [...sanityUIComponents],
    inlineStyles,
    semanticHtml,
    componentUsage,
    screenshotPath,
    inputTokens: null,
    outputTokens: null,
    fixAttempts,
    fixLog,
    feedback,
    a11yResults,
    perfResults,
    contribResult: contribResult || null,
    ailfResult: ailfResult || null,
    domElementCount: domElementCount || null,
    semanticHtml: semanticHtml || null,
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
    semanticHtml,
    componentUsage,
    screenshotPath,
    inputTokens: null,
    outputTokens: null,
    fixAttempts,
    fixLog,
    feedback,
    a11yResults,
    perfResults,
    contribResult: contribResult || null,
    ailfResult: ailfResult || null,
    domElementCount: domElementCount || null,
    semanticHtml: semanticHtml || null,
  };
}
