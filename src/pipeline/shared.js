/**
 * Shared utilities used by both the API runner and CLI runner.
 *
 * Per-test knobs (packages, prompts, MCP flag) are passed in via function
 * arguments — this file does not bake in a specific test.
 */
import { writeFile, mkdir, rm, readFile, readdir } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { existsSync } from "node:fs";
import { createHash } from "node:crypto";
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
 * Resolve a file path inside the project directory, refusing anything
 * that escapes it. File paths come from agent output (untrusted), so
 * this is the last line of defense behind the parse-time filter in
 * `parse-files.js`.
 */
export function resolveWithinProject(projectDir, filePath) {
  const root = resolve(projectDir);
  const resolved = resolve(root, filePath);
  if (resolved !== root && !resolved.startsWith(root + sep)) {
    throw new Error(
      `Refusing to access path outside the project directory: ${filePath}`,
    );
  }
  return resolved;
}

/**
 * Write all files to the project directory (clean slate).
 *
 * `node_modules` is preserved between writes — re-downloading hundreds of
 * tarballs per fix attempt would dominate run time. `package-lock.json`
 * is NOT preserved: keeping it pinned the project to whichever versions
 * the first install resolved, so subsequent `npm install` calls would
 * short-circuit with "up to date in N ms" even when the agent's new code
 * needed different sub-dep versions. Deleting the lockfile forces npm to
 * re-resolve against the current `package.json` while still reusing any
 * cached tarballs already on disk inside `node_modules`.
 */
export async function writeProjectFiles(projectDir, files) {
  // When an agent revises a file mid-output it can appear twice in the array.
  // Keep the last occurrence so the most recent version wins.
  const seen = new Set();
  files = [...files].reverse().filter(f => seen.has(f.path) ? false : seen.add(f.path)).reverse();

  if (existsSync(projectDir)) {
    const entries = await readdir(projectDir);
    for (const entry of entries) {
      if (entry !== "node_modules") {
        await rm(resolve(projectDir, entry), {
          recursive: true,
          force: true,
        });
      }
    }
  }
  await mkdir(projectDir, { recursive: true });

  for (const file of files) {
    const filePath = resolveWithinProject(projectDir, file.path);
    const dir = resolve(filePath, "..");
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, file.content, "utf-8");
  }
}

export async function readProjectFiles(projectDir, originalFiles) {
  const updatedFiles = [];
  for (const file of originalFiles) {
    const filePath = resolveWithinProject(projectDir, file.path);
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
 *
 * Without `opts.previousHashes` (or on the first fix attempt), every file
 * is emitted in full. On subsequent attempts, files whose hash matches
 * the previous attempt's snapshot AND aren't referenced in the current
 * error output are elided to a manifest line — the model is told they
 * exist but their contents are unchanged from what it last saw and
 * not implicated in any error.
 *
 * Returns `{ text, newHashes }`. Callers should keep `newHashes` and
 * pass it back as `previousHashes` on the next call.
 *
 * @param {string} projectDir
 * @param {Array<{path:string,content:string}>} files
 * @param {object} [opts]
 * @param {Map<string,string>} [opts.previousHashes] - sha256 hashes from the prior call
 * @param {string[]} [opts.errorReferencedPaths] - file paths mentioned in current errors
 * @returns {Promise<{text: string, newHashes: Map<string,string>}>}
 */
export async function buildCurrentFilesText(projectDir, files, opts = {}) {
  const previousHashes = opts.previousHashes ?? null;
  const errorRefs = new Set(opts.errorReferencedPaths ?? []);
  const newHashes = new Map();

  const fullParts = [];
  const manifest = [];

  for (const file of files) {
    const filePath = resolveWithinProject(projectDir, file.path);
    let content = file.content;
    if (existsSync(filePath)) {
      content = await readFile(filePath, "utf-8");
    }
    const hash = createHash("sha256").update(content).digest("hex");
    newHashes.set(file.path, hash);

    const wasUnchanged =
      previousHashes && previousHashes.get(file.path) === hash;
    const errorReferenced = errorRefs.has(file.path);

    // Show full content if: this is the first call (no previousHashes),
    // OR the file changed since previous, OR the file is mentioned in
    // current errors.
    if (!previousHashes || !wasUnchanged || errorReferenced) {
      fullParts.push(`--- ${file.path} ---\n${content}\n--- end ---`);
    } else {
      manifest.push(file.path);
    }
  }

  let text = fullParts.join("\n\n");
  if (manifest.length > 0) {
    text +=
      `\n\n## Unchanged files (contents elided)\n\n` +
      `The following files exist in the project but their contents have not changed since the previous fix attempt and are not referenced in the current errors. Their contents are omitted to save tokens. Do not modify them unless your fix specifically requires it.\n\n` +
      manifest.map((p) => `- ${p}`).join("\n");
  }

  return { text, newHashes };
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
  domHtmlBytes,
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
    domHtmlBytes: domHtmlBytes ?? null,
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
    domHtmlBytes: domHtmlBytes ?? null,
  };
}
