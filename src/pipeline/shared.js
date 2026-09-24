/**
 * Shared utilities for the API runner.
 *
 * Per-test knobs (packages, prompts, MCP flag) are passed in via function
 * arguments — this file does not bake in a specific test.
 */

import { createHash } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { buildFixSystemPrompt, buildSystemPrompt, getTest } from "../config/prompts.js";
import { runAccessibilityTests } from "../evaluation/accessibility.js";
import { extractComponentUsageCounts } from "../evaluation/count-component-usage.js";
import { measureDom } from "../evaluation/dom-count.js";
import { extractComponentImports } from "../evaluation/extract-component-imports.js";
import { extractInlineStyles } from "../evaluation/extract-inline-styles.js";
import { computeJsxPropDensity } from "../evaluation/jsx-prop-density.js";
import { measureLighthouse } from "../evaluation/lighthouse.js";
import { isSourceFile } from "../evaluation/parse-files.js";
import { measureReactProfile } from "../evaluation/react-profile.js";
import { captureScreenshots } from "../evaluation/screenshot.js";
import { analyzeSemanticHtml } from "../evaluation/semantic-html.js";
import { computeTieredCoverage } from "../evaluation/tiered-coverage.js";
import { tag, warn } from "../util/color.js";
import { describeCheckout } from "../util/git-rev.js";
import { deriveErrorHints } from "./error-hints.js";

// ─── Prompt accessors ────────────────────────────────────────────────

/** Returns the system prompt for a given test label and model. */
export function getSystemPrompt(testLabel, model) {
  return buildSystemPrompt(testLabel, model);
}

/** Returns the fix-cycle system prompt for a given test label. */
export function getFixSystemPrompt(testLabel) {
  return buildFixSystemPrompt(testLabel);
}

// ─── File I/O ────────────────────────────────────────────────────────

/**
 * Canonicalize a path via realpath when it exists, else return it as-is.
 * Used to resolve symlinks before containment checks.
 */
function realIfExists(p) {
  try {
    return realpathSync(p);
  } catch {
    return p; // ENOENT (not yet created) — nothing to resolve
  }
}

/**
 * Resolve a file path inside the project directory, refusing anything
 * that escapes it. File paths come from agent output (untrusted), so
 * this is the last line of defense behind the parse-time filter in
 * `parse-files.js`.
 *
 * Two checks: (1) a lexical `resolve()`+prefix guard rejects `..`/absolute
 * escapes; (2) a symlink-aware guard canonicalizes the deepest existing
 * ancestor of the target (a to-be-created file's real bytes land under it)
 * and re-verifies containment against the canonicalized root. Without (2),
 * a symlink already on disk — e.g. an `npm install`-materialized `file:`
 * dependency under node_modules — would pass the lexical check yet make the
 * harness's own writeFile/readFile follow the link outside the sandbox.
 */
export function resolveWithinProject(projectDir, filePath) {
  const root = resolve(projectDir);
  const resolved = resolve(root, filePath);
  if (resolved !== root && !resolved.startsWith(root + sep)) {
    throw new Error(`Refusing to access path outside the project directory: ${filePath}`);
  }

  // Symlink-aware containment. Compare canonicalized real paths so a
  // symlinked ancestor is caught. The root itself is canonicalized too
  // (e.g. macOS /var → /private/var) so a legitimate path isn't rejected.
  const realRoot = realIfExists(root);
  // Walk up to the deepest ancestor that exists on disk; its realpath
  // reveals any symlink in the chain. The non-existent tail can't be a
  // symlink, so canonicalizing the existing ancestor is sufficient.
  let ancestor = resolved;
  while (ancestor !== root && ancestor !== dirname(ancestor) && !existsSync(ancestor)) {
    ancestor = dirname(ancestor);
  }
  const realAncestor = realIfExists(ancestor);
  if (realAncestor !== realRoot && !realAncestor.startsWith(realRoot + sep)) {
    throw new Error(
      `Refusing to access path that resolves (via symlink) outside the project directory: ${filePath}`,
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
 *
 * `clear: false` writes the given files over the existing project instead of
 * starting from a clean slate. A repair turn emits only the files it changed,
 * so clearing first deleted the rest of the project mid-turn.
 */
export async function writeProjectFiles(projectDir, files, { clear = true } = {}) {
  // When an agent revises a file mid-output it can appear twice in the array.
  // Keep the last occurrence so the most recent version wins.
  const seen = new Set();
  files = [...files]
    .reverse()
    .filter((f) => (seen.has(f.path) ? false : seen.add(f.path)))
    .reverse();

  if (clear && existsSync(projectDir)) {
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
    // A block whose path names a directory (`---FILE: src---`) can't be
    // written as a file. It used to throw EISDIR and fail the whole iteration
    // (2026-09-23 16.01, iteration 1); skip it and say so instead.
    if (/[\\/]$/.test(file.path) || (existsSync(filePath) && (await stat(filePath)).isDirectory())) {
      console.warn(`⚠ Skipped a file block whose path is a directory: ${file.path}`);
      continue;
    }
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

    const wasUnchanged = previousHashes && previousHashes.get(file.path) === hash;
    const errorReferenced = errorRefs.has(file.path);
    // A missing-dependency error names the file that imports the package,
    // never package.json itself, so the one file that actually needs editing
    // was the one being summarised away. A model asked to add a dependency
    // without being shown the current ones has been seen to invent a whole
    // new package.json instead of adding a line. It is a small file, so
    // including it in full costs very little.
    const isPackageJson = file.path === "package.json";

    // Show full content if: this is the first call (no previousHashes),
    // OR the file changed since previous, OR the file is mentioned in
    // current errors, OR it's package.json.
    if (!previousHashes || !wasUnchanged || errorReferenced || isPackageJson) {
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

// ─── Measurement helpers ─────────────────────────────────────────────
//
// These three run the browser-based evaluations against a live dev server.
// The runner calls them from both the success and broken-state paths, so the
// measurement set and ordering stay identical across both.

/**
 * Static, render-only measurements: screenshots + DOM count + semantic HTML.
 * Safe to call even on a broken page (each evaluation degrades to null).
 *
 * @param {object} [opts]
 * @param {boolean} [opts.screenshots=true] - per-test `measure.screenshots`
 *   toggle. When false, the screenshot capture (and the gallery/visual-diff
 *   input it feeds) is skipped; DOM count and semantic HTML still run.
 * @returns {Promise<{screenshotPath: string|null, domElementCount: number|null, domHtmlBytes: number|null, semanticHtml: object|null}>}
 */
export async function runStaticMeasurements(serverUrl, iterDir, iterLabel, opts = {}) {
  const { screenshots = true } = opts;
  const screenshotPath = screenshots
    ? await captureScreenshots(serverUrl, iterDir, iterLabel)
    : null;
  const dom = await measureDom(serverUrl, iterLabel);
  const semanticHtml = await analyzeSemanticHtml(serverUrl, iterLabel);
  return {
    screenshotPath,
    domElementCount: dom?.count ?? null,
    domHtmlBytes: dom?.htmlBytes ?? null,
    semanticHtml,
  };
}

/**
 * Run the axe-core accessibility scan, returning null (not throwing) on
 * failure so a measurement error never aborts the iteration.
 */
export async function runAccessibility(serverUrl, iterDir, iterLabel) {
  try {
    return await runAccessibilityTests({ serverUrl, iterDir, iterLabel });
  } catch (err) {
    console.warn(`${tag(iterLabel)} ${warn("⚠ A11y tests failed:")} ${err.message}`);
    return null;
  }
}

/**
 * Performance measurements: Lighthouse + React commit profile. Each is
 * independent and degrades to null on failure.
 *
 * @returns {Promise<{lighthouseResults: object|null, reactProfile: object|null}>}
 */
export async function runPerformance(serverUrl, iterDir, iterLabel) {
  let lighthouseResults = null;
  let reactProfile = null;
  try {
    lighthouseResults = await measureLighthouse({ serverUrl, iterDir, iterLabel });
  } catch (err) {
    console.warn(`${tag(iterLabel)} ${warn("⚠ Lighthouse measurement failed:")} ${err.message}`);
  }
  try {
    reactProfile = await measureReactProfile({ serverUrl, iterDir, iterLabel });
  } catch (err) {
    console.warn(`${tag(iterLabel)} ${warn("⚠ React profile failed:")} ${err.message}`);
  }
  return { lighthouseResults, reactProfile };
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

  // Pair each error with its fix: design-system-aware hints derived from the
  // error text (named component + valid props, import corrections, etc.) so the
  // model resolves the actual cause instead of re-guessing from raw TS type-soup.
  const hints = deriveErrorHints([fatalError || "", ...(consoleErrors || [])].join("\n"));
  if (hints.length > 0) {
    prompt += `## How to fix\n\n`;
    prompt += hints.map((h) => `- ${h}`).join("\n") + "\n\n";
  }

  prompt += `Fix all errors. Output ONLY the files you actually changed, each as a complete \`---FILE: path---\` block. Do NOT re-output files you did not modify — unchanged files are kept automatically. Re-emitting the whole project wastes output tokens and risks regressions.`;
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
  // Per-model request overrides applied by the runner (e.g. Fable's
  // `output_config.effort` cap). Recorded so results produced under
  // non-default settings are labeled as such in _meta.json and the report.
  modelTuning = null,
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
  runner,
  exitStage = null,
  firstTryLint = null,
  firstTryLintRules = null,
  firstTryAxe = null,
  residualLint = null,
  residualLintRules = null,
  residualAxe = null,
  // Jev gate. `null` when the gate did not run (the default — it calls a
  // paid API). `firstTryJev` is surfaceable departures before any jev
  // repair; `residualJev` is what survived the budget. `jevJudged` and
  // `jevInputTokens` carry the cost so a run can be priced. `jevUnjudged`
  // counts files the API refused after retries — a gap, not a pass.
  firstTryJev = null,
  residualJev = null,
  jevJudged = null,
  jevUnjudged = null,
  // Lint split. `lintAutofixed`: findings the harness fixed automatically.
  // `lintGateStatus`: "ran", "error" or "unavailable" (null: no lint gate) —
  // so a gate that never ran is not reported as clean. `selfLintCalls` and
  // `selfLintFindings`: the agent's own lint calls and what the first found.
  lintAutofixed = null,
  lintGateStatus = null,
  selfLintCalls = null,
  selfLintFindings = null,
  jevInputTokens = null,
  // Per-iteration count of `npm install` failures across all validation
  // cycles. 0 when every install resolved cleanly. Aggregated at the
  // report layer to surface dependency-install issues separately from
  // code errors in the fix loop.
  npmInstallFailures = 0,
  // Validation cycles where a transient toolchain flake (tsc failure
  // contradicting on-disk state) was healed by a single retry.
  tscFlakes = 0,
  // Validation cycles where the type check failed on a tsconfig/project-
  // reference scaffold error (broken config the agent wrote — not a flake,
  // not an ordinary app-code bug). See `isTsconfigScaffoldError`.
  tsconfigErrors = 0,
}) {
  // Token-usage breakdown. Prompt caching splits input tokens across
  // three buckets billed at different rates: uncached at 1.0×,
  // cache_read at ~0.1×, cache_creation at ~1.25×. We persist each
  // bucket separately and a derived "effective input" that weights
  // them so the report can compare runs fairly. `inputTokens` is kept
  // as the raw sum for backward compat with older reports.
  const uncachedIn = totalUncachedInputTokens || 0;
  const cacheReadIn = totalCacheReadInputTokens || 0;
  const cacheCreationIn = totalCacheCreationInputTokens || 0;
  const rawInputSum = uncachedIn + cacheReadIn + cacheCreationIn;
  const effectiveInputTokens = Math.round(uncachedIn + cacheReadIn * 0.1 + cacheCreationIn * 1.25);
  const linesOfCode = files.reduce((sum, f) => sum + f.content.split("\n").length, 0);

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
  // Plus any local import prefixes this test declares (`componentImportPaths`)
  // — for copy-in design systems whose components are vendored into the
  // project instead of installed. Empty for every package-based test, which
  // leaves their counts unchanged.
  const componentImportPaths = test?.componentImportPaths ?? [];

  const componentImports = extractComponentImports(files, packageNames, componentImportPaths);
  const inlineStyles = extractInlineStyles(files);
  const componentUsage = extractComponentUsageCounts(files);
  // Splits the same usage into design-system composites, design-system
  // primitives, and everything else. Needs to know which names are
  // primitives, which only the test can say; without `coverage.primitives`
  // every design system component counts as a composite.
  const tieredCoverage = computeTieredCoverage(files, {
    dsComponents: componentImports,
    primitives: test?.coverage?.primitives,
    rawAllowlist: test?.coverage?.rawAllowlist,
  });
  // How many props each of those tags carries. Coverage says which
  // components were reached for; this says how hard each one was leaned on —
  // a component used with eight props is an escape hatch being improvised out
  // of legitimate props, which no coverage share can show.
  // Git state of the tooling checkout this arm ran against. An MCP arm runs
  // the server from a working directory, so its behaviour is whatever was on
  // disk — a SHA plus a dirty flag is the only way to tell two runs apart
  // after the fact. See `describeCheckout`.
  const toolingCheckout = describeCheckout(
    test?.mcp?.defaultDirectory ?? (typeof test?.cli?.cwd === "string" ? test.cli.cwd : null),
  );

  const jsxPropDensity = computeJsxPropDensity(files, {
    dsComponents: componentImports,
    primitives: test?.coverage?.primitives,
    rawAllowlist: test?.coverage?.rawAllowlist,
  });

  const sourceContents = files
    .filter((f) => isSourceFile(f.path))
    .map((f) => ({ path: f.path, content: f.content }));

  const componentImportsArray = [...componentImports];

  const meta = {
    runner,
    model,
    modelTuning,
    iterLabel,
    testLabel: testLabel ?? null,
    linesOfCode,
    fileCount: files.length,
    filePaths: files.map((f) => f.path),
    componentImports: componentImportsArray,
    inlineStyles,
    semanticHtml,
    componentUsage,
    tieredCoverage,
    jsxPropDensity,
    toolingCheckout,
    screenshotPath,
    inputTokens: rawInputSum || null,
    uncachedInputTokens: uncachedIn || null,
    cacheReadInputTokens: cacheReadIn || null,
    cacheCreationInputTokens: cacheCreationIn || null,
    effectiveInputTokens: effectiveInputTokens || null,
    outputTokens: totalOutputTokens || null,
    fixAttempts,
    fixLog,
    feedback,
    a11yResults,
    lighthouseResults,
    reactProfile,
    domElementCount: domElementCount || null,
    domHtmlBytes: domHtmlBytes ?? null,
    exitStage,
    firstTryLint,
    firstTryLintRules,
    firstTryAxe,
    residualLint,
    residualLintRules,
    residualAxe,
    firstTryJev,
    residualJev,
    jevJudged,
    jevUnjudged,
    lintAutofixed,
    lintGateStatus,
    selfLintCalls,
    selfLintFindings,
    jevInputTokens,
    npmInstallFailures,
    tscFlakes,
    tsconfigErrors,
  };
  await writeFile(resolve(iterDir, "_meta.json"), JSON.stringify(meta, null, 2), "utf-8");

  return {
    model,
    modelTuning,
    testLabel: testLabel ?? null,
    linesOfCode,
    fileCount: files.length,
    files: sourceContents,
    componentImports: componentImportsArray,
    inlineStyles,
    semanticHtml,
    componentUsage,
    tieredCoverage,
    jsxPropDensity,
    toolingCheckout,
    screenshotPath,
    inputTokens: rawInputSum || null,
    uncachedInputTokens: uncachedIn || null,
    cacheReadInputTokens: cacheReadIn || null,
    cacheCreationInputTokens: cacheCreationIn || null,
    effectiveInputTokens: effectiveInputTokens || null,
    outputTokens: totalOutputTokens || null,
    fixAttempts,
    fixLog,
    feedback,
    a11yResults,
    lighthouseResults,
    reactProfile,
    domElementCount: domElementCount || null,
    domHtmlBytes: domHtmlBytes ?? null,
    exitStage,
    firstTryLint,
    firstTryLintRules,
    firstTryAxe,
    residualLint,
    residualLintRules,
    residualAxe,
    firstTryJev,
    residualJev,
    jevJudged,
    jevUnjudged,
    lintAutofixed,
    lintGateStatus,
    selfLintCalls,
    selfLintFindings,
    jevInputTokens,
    npmInstallFailures,
    tscFlakes,
    tsconfigErrors,
  };
}
