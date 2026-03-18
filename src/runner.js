import Anthropic from "@anthropic-ai/sdk";
import { runAccessibilityTests } from "./a11y.js";
import { writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import {
  validateProject,
  killDevServer,
  captureScreenshot,
} from "./screenshot.js";
import {
  parseFiles,
  parseFeedback,
  extractSanityUIComponents,
  isSourceFile,
} from "./analyze.js";

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
- The FEEDBACK block must appear after all FILE blocks`;

const FIX_SYSTEM_PROMPT = `You are an expert frontend developer debugging a web application that fails to render.

You will be given:
1. The current project files
2. The errors that occurred when the app was loaded in a browser

Your task is to fix ALL the errors so the page renders correctly. Output ONLY the files that need to change, using this format:

---FILE: path/to/file---
(complete file contents here)
---END FILE---

Rules:
- Output the COMPLETE contents of each file you change (not just the diff)
- Only output files that need to change
- Do not add explanations outside of file blocks
- Fix the root cause, not the symptoms
- If an import does not exist in a library, remove it or replace it with one that does exist
- Make sure the project works with "npm install && npm run dev"`;

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
}) {
  const client = new Anthropic();

  // --- Step 1: Initial generation ---
  const response = await client.messages.create({
    model,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: promptContent,
      },
    ],
  });

  const fullText = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");

  // Save raw response
  await writeFile(resolve(iterDir, "_raw_response.txt"), fullText, "utf-8");

  // Parse files and feedback from the response
  let files = parseFiles(fullText);
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

  // Track token usage across all calls
  let totalInputTokens = response.usage?.input_tokens ?? 0;
  let totalOutputTokens = response.usage?.output_tokens ?? 0;

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
            screenshotPath,
            totalInputTokens,
            totalOutputTokens,
            fixAttempts,
            fixLog,
            feedback,
            a11yResults,
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
        const fixPrompt = buildFixPrompt(
          currentFilesText,
          validation.consoleErrors,
          validation.fatalError,
        );

        // Ask Claude to fix the errors
        console.log(`[${iterLabel}] Asking Claude to fix errors...`);
        const fixResponse = await client.messages.create({
          model,
          max_tokens: 16000,
          system: FIX_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: fixPrompt,
            },
          ],
        });

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
      totalInputTokens,
      totalOutputTokens,
      fixAttempts,
      fixLog,
      feedback,
      a11yResults: null,
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
    runner: "api",
  });
}

// --- Helper functions ---

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
        if (entry !== "node_modules" && entry !== "package-lock.json") {
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
  runner,
}) {
  const linesOfCode = files.reduce(
    (sum, f) => sum + f.content.split("\n").length,
    0,
  );

  const sanityUIComponents = extractSanityUIComponents(files);

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
    screenshotPath,
    inputTokens: totalInputTokens || null,
    outputTokens: totalOutputTokens || null,
    fixAttempts,
    fixLog,
    feedback,
    a11yResults,
  };
  await writeFile(
    resolve(iterDir, "_meta.json"),
    JSON.stringify(meta, null, 2),
    "utf-8",
  );

  return {
    linesOfCode,
    fileCount: files.length,
    files: sourceContents,
    sanityUIComponents: [...sanityUIComponents],
    screenshotPath,
    inputTokens: totalInputTokens || null,
    outputTokens: totalOutputTokens || null,
    fixAttempts,
    fixLog,
    feedback,
    a11yResults,
  };
}
