import { writeFile, mkdir, rm, readFile, mkdtemp, cp } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

const COPY_ASSETS = ["ui-poc"];

async function copyAssetsToProject(projectDir, iterLabel) {
  for (const asset of COPY_ASSETS) {
    const src = resolve(PROJECT_ROOT, asset);
    if (!existsSync(src)) continue;

    const dest = resolve(projectDir, asset);
    console.log(`[${iterLabel}] Copying ${asset}/ into project...`);
    await cp(src, dest, { recursive: true });
  }
}
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

const SYSTEM_PROMPT = `You are an expert frontend developer. You will be given instructions to build a web application.

Your task is to produce ALL the files needed for a complete, working project. Output each file using the following format:

---FILE: path/to/file---
(file contents here)
---END FILE---

After ALL file blocks, you MUST provide feedback on areas of friction you encountered when using Sanity UI. Output your feedback in this exact format:

---FEEDBACK---
- [category] Your feedback item here
- [category] Another feedback item here
---END FEEDBACK---

Categories must be one of: [documentation], [api], [components], [theming], [icons], [dx], [other]

Each line must start with a dash and a category tag. Be specific and actionable. Cover things like:
- Missing or unclear documentation
- Components that were hard to use or understand
- Unexpected API behavior
- Missing components or features you expected to exist
- Theming or styling difficulties
- Icon naming inconsistencies
- General developer experience friction

Rules:
- Output ALL files needed (package.json, index.html, vite.config.js, source files, etc.)
- Use relative paths from the project root
- Do not include explanations outside of file blocks (except the FEEDBACK block at the end)
- Do not include unit tests
- Make sure the project works with "npm install && npm run dev"
- The FEEDBACK block must appear after all FILE blocks
- NEVER output any files under the ui-poc/ directory. The ui-poc/ directory is pre-installed in the project root and must not be created, modified, or overwritten. Import from it using relative paths (e.g. ../ui-poc/packages/ui/src/components/Box) but do not emit FILE blocks for any path starting with ui-poc/.`;

const FIX_SYSTEM_PROMPT = `You are an expert frontend developer debugging a web application that fails to render.

You will be given:
1. The current project files
2. The errors that occurred when the app was loaded in a browser

Your task is to fix ALL the errors so the page renders correctly. Output ONLY the files that need to change, using this format:

---FILE: path/to/file---
(complete file contents here)
---END FILE---

Rules:
- Feedback is required. This step cannot be skipped.
- Output the COMPLETE contents of each file you change (not just the diff)
- Only output files that need to change
- Do not add explanations outside of file blocks
- Fix the root cause, not the symptoms
- If an import does not exist in a library, remove it or replace it with one that does exist
- Make sure the project works with "npm install && npm run dev"`;

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
  copyAssets = true,
}) {
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

  // Copy asset directories (e.g. ui-poc) into the project if enabled
  if (copyAssets) {
    await copyAssetsToProject(projectDir, iterLabel);
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

        // Parse the fixed files and merge them into the project
        const fixedFiles = parseFiles(fixText);
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
      fixAttempts,
      fixLog,
      feedback,
      a11yResults: null,
      perfResults: null,
    });
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
  });
}

// --- Helper functions ---

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
        entry !== "package-lock.json" &&
        !COPY_ASSETS.includes(entry)
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
    componentUsage,
    screenshotPath,
    inputTokens: null,
    outputTokens: null,
    fixAttempts,
    fixLog,
    feedback,
    a11yResults,
    perfResults,
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
    inputTokens: null,
    outputTokens: null,
    fixAttempts,
    fixLog,
    feedback,
    a11yResults,
    perfResults,
  };
}
