/**
 * Shared utilities used by both the API runner and CLI runner.
 *
 * Per-test knobs (packages, prompts, MCP flag) are passed in via function
 * arguments — this file does not bake in a specific test.
 */
import { writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { extractComponentImports } from "../evaluation/extract-component-imports.js";
import { extractInlineStyles } from "../evaluation/extract-inline-styles.js";
import { extractComponentUsageCounts } from "../evaluation/count-component-usage.js";
import { isSourceFile } from "../evaluation/parse-files.js";
import {
  buildSystemPrompt,
  buildFixSystemPrompt,
  getTest,
} from "../config/prompts.js";

// ─── Prompt accessors ────────────────────────────────────────────────

/** Returns the system prompt for a given test label. */
export function getSystemPrompt(testLabel) {
  return buildSystemPrompt(testLabel);
}

/** Returns the fix-cycle system prompt for a given test label. */
export function getFixSystemPrompt(testLabel) {
  return buildFixSystemPrompt(testLabel);
}

// ─── File I/O ────────────────────────────────────────────────────────

/**
 * Write all files to the project directory (clean slate).
 */
export async function writeProjectFiles(projectDir, files) {
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

export async function readProjectFiles(projectDir, originalFiles) {
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
export async function buildCurrentFilesText(projectDir, files) {
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
export function buildFixPrompt(currentFilesText, consoleErrors, fatalError) {
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
 *
 * `testLabel` is recorded in the metadata so downstream tools know which
 * test produced this iteration.
 */
export async function buildResult({
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
  semanticHtml,
  runner,
}) {
  const linesOfCode = files.reduce(
    (sum, f) => sum + f.content.split("\n").length,
    0,
  );

  // For component extraction, gather all named package references defined
  // by this test (whatever the test author called them — e.g. `ui`, `ds`,
  // `icons`). Anything with a `.name` field is treated as a package whose
  // imports should be tracked.
  const test = testLabel ? getTest(testLabel) : null;
  const packageNames = test
    ? Object.values(test.packages || {})
        .map((p) => p?.name)
        .filter((n) => typeof n === "string" && n.length > 0)
    : [];

  const componentImports = extractComponentImports(files, packageNames);
  const inlineStyles = extractInlineStyles(files);
  const componentUsage = extractComponentUsageCounts(files);

  const sourceContents = files
    .filter((f) => isSourceFile(f.path))
    .map((f) => ({ path: f.path, content: f.content }));

  const componentImportsArray = [...componentImports];

  const meta = {
    runner,
    model,
    iterLabel,
    testLabel: testLabel ?? null,
    linesOfCode,
    fileCount: files.length,
    filePaths: files.map((f) => f.path),
    componentImports: componentImportsArray,
    inlineStyles,
    semanticHtml,
    componentUsage,
    screenshotPath,
    inputTokens: totalInputTokens || null,
    outputTokens: totalOutputTokens || null,
    fixAttempts,
    fixLog,
    feedback,
    a11yResults,
    lighthouseResults,
    reactProfile,
    domElementCount: domElementCount || null,
  };
  await writeFile(
    resolve(iterDir, "_meta.json"),
    JSON.stringify(meta, null, 2),
    "utf-8",
  );

  return {
    model,
    testLabel: testLabel ?? null,
    linesOfCode,
    fileCount: files.length,
    files: sourceContents,
    componentImports: componentImportsArray,
    inlineStyles,
    semanticHtml,
    componentUsage,
    screenshotPath,
    inputTokens: totalInputTokens || null,
    outputTokens: totalOutputTokens || null,
    fixAttempts,
    fixLog,
    feedback,
    a11yResults,
    lighthouseResults,
    reactProfile,
    domElementCount: domElementCount || null,
  };
}
