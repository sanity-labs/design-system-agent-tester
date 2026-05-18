/**
 * Shared utilities used by both the API runner and CLI runner.
 * Extracted to eliminate duplication between runner.js and runner-cli.js.
 */
import {
  writeFile,
  mkdir,
  rm,
  readFile,
} from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import {
  extractSanityUIComponents as extractDesignSystemComponents,
  extractInlineStyles,
  extractComponentUsageCounts,
  isSourceFile,
} from "../evaluation/analyze.js";
import dsConfig from "../config/design-system.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");

export const SYSTEM_PROMPT = readFileSync(resolve(PROJECT_ROOT, "prompts", "system.md"), "utf-8").trim();
export const FIX_SYSTEM_PROMPT = readFileSync(resolve(PROJECT_ROOT, "prompts", "system-fix.md"), "utf-8").trim();


/**
 * Components that belong in the design system package, NOT the legacy UI package.
 */
export const DS_COMPONENTS = dsConfig.packages.designSystem.components;



/**
 * Mechanically enforce @sanity-labs/design-system usage in generated files.
 * Returns true if any file was modified.
 *
 * This exists because the model's training prior for @sanity/ui is too
 * strong for prompt-only instructions to override reliably — even when
 * stated in the system prompt and repeated 47 times in the user prompt.
 */
export function enforceUiPocImports(files, iterLabel) {
  let patched = false;

  // --- 1. Patch package.json ---
  const pkgFile = files.find((f) => f.path === "package.json");
  if (pkgFile) {
    try {
      const pkg = JSON.parse(pkgFile.content);
      const deps = pkg.dependencies || {};
      let pkgChanged = false;

      // Ensure enforced deps are listed
      for (const [dep, version] of Object.entries(dsConfig.enforcedDeps)) {
        if (!deps[dep]) {
          deps[dep] = version;
          pkgChanged = true;
        }
      }

      // Ensure React 19 (ui-poc peer dep)
      if (deps["react"] && !deps["react"].includes("19")) {
        deps["react"] = dsConfig.reactVersion;
        pkgChanged = true;
      }
      if (deps["react-dom"] && !deps["react-dom"].includes("19")) {
        deps["react-dom"] = dsConfig.reactVersion;
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
  // Build a regex that matches: import { Box, Flex, ... } from '<legacy pkg>'
  // where at least one of the DS_COMPONENTS is in the import list.
  const pocSet = new Set(DS_COMPONENTS);

  for (const file of files) {
    if (!/\.(tsx?|jsx?|mjs)$/.test(file.path)) continue;

    let content = file.content;
    let fileChanged = false;

    // Match all import statements from the legacy UI package
    const legacyPkgEscaped = dsConfig.packages.legacy.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const importRe = new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*['"]${legacyPkgEscaped}['"]`, 'g');
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
          `import { ${forPoc.join(", ")} } from '${dsConfig.packages.designSystem.name}'`,
        );
      }
      if (forSanity.length > 0) {
        newStatements.push(
          `import { ${forSanity.join(", ")} } from '${dsConfig.packages.legacy.name}'`,
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
      if (!content.includes(dsConfig.packages.designSystem.cssImport)) {
        // Add after the last import statement
        const lastImportIdx = content.lastIndexOf("\nimport ");
        if (lastImportIdx !== -1) {
          const eol = content.indexOf("\n", lastImportIdx + 1);
          content =
            content.slice(0, eol + 1) +
            `import '${dsConfig.packages.designSystem.cssImport}'\n` +
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
      `[${iterLabel}] Post-processed files to enforce ${dsConfig.name} imports`,
    );
  }

  return patched;
}

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
 */
export async function buildResult({
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
  domElementCount,
  semanticHtml,
  runner,
}) {
  const linesOfCode = files.reduce(
    (sum, f) => sum + f.content.split("\n").length,
    0,
  );

  const designSystemComponents = extractDesignSystemComponents(files);
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
    designSystemComponents: [...designSystemComponents],
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
    perfResults,
    domElementCount: domElementCount || null,
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
    designSystemComponents: [...designSystemComponents],
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
    perfResults,
    domElementCount: domElementCount || null,
  };
}
