import { readdir, readFile } from "node:fs/promises";
import { resolve, extname, relative } from "node:path";
import { Linter } from "eslint";
import { rules as sanityUIRules } from "./eslint-plugin/index.js";

/**
 * Lint all source files in a project directory using the Sanity UI ESLint rules.
 *
 * This uses ESLint's Linter API (the in-process, no-config-file variant)
 * so that we can run it on ephemeral project directories without needing
 * an eslint.config.js inside each iteration's project folder.
 *
 * @param {string} projectDir - Absolute path to the iteration's project/ directory
 * @param {string} iterLabel  - Label for logging (e.g. "training/iteration-3")
 * @returns {Promise<LintResults>}
 *
 * @typedef {object} LintResults
 * @property {number} totalErrors
 * @property {number} totalWarnings
 * @property {number} fileCount
 * @property {Record<string, number>} errorsByRule   - rule id → count
 * @property {Record<string, number>} warningsByRule - rule id → count
 * @property {LintMessage[]} messages                - every individual message
 *
 * @typedef {object} LintMessage
 * @property {string} file
 * @property {number} line
 * @property {number} column
 * @property {string} ruleId
 * @property {string} message
 * @property {1|2} severity  - 1 = warning, 2 = error
 */
export async function lintProject(projectDir, iterLabel) {
  const linter = new Linter({ configType: "flat" });

  // Rule severity config — mirrors the "recommended" preset from the plugin index
  const ruleConfig = {
    "sanity-ui/no-sanity-ui-layout-import": 2,
    "sanity-ui/require-styles-import": 2,
    "sanity-ui/no-react-swc-plugin": 2,
    "sanity-ui/no-layout-props-on-card": 2,
    "sanity-ui/no-layout-props-on-stack": 2,
    "sanity-ui/require-heading-level": 2,
    "sanity-ui/no-tone-primary": 2,
    "sanity-ui/no-wrong-spacing-prop": 2,
    "sanity-ui/no-inline-color-styles": 1,
    "sanity-ui/no-inline-layout-styles": 1,
    "sanity-ui/no-box-as-button": 2,
    "sanity-ui/no-menuitem-icon-children": 2,
    "sanity-ui/require-menubutton-id": 2,
  };

  // Collect every .tsx / .jsx / .ts / .js file under src/, excluding node_modules and ui-poc
  const sourceFiles = await collectSourceFiles(projectDir);

  const results = {
    totalErrors: 0,
    totalWarnings: 0,
    fileCount: sourceFiles.length,
    errorsByRule: {},
    warningsByRule: {},
    messages: [],
  };

  for (const absPath of sourceFiles) {
    const relPath = relative(projectDir, absPath);
    let code;
    try {
      code = await readFile(absPath, "utf-8");
    } catch {
      continue; // Skip unreadable files
    }

    // Determine parser options based on extension
    const ext = extname(absPath).toLowerCase();
    const isTs = ext === ".ts" || ext === ".tsx";
    const isJsx = ext === ".tsx" || ext === ".jsx";

    // ESLint v9 flat config: rules are registered via the plugins key in the
    // config object, not via linter.defineRule().
    /** @type {import("eslint").Linter.Config} */
    const config = {
      files: ["**/*.{js,jsx,ts,tsx}"],
      plugins: {
        "sanity-ui": { rules: sanityUIRules },
      },
      rules: ruleConfig,
      languageOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        parserOptions: {
          ecmaFeatures: { jsx: isJsx },
        },
      },
    };

    let fileMessages;
    try {
      fileMessages = linter.verify(code, config, { filename: absPath });
      // If the only messages are parser errors (ruleId === null) and no
      // actual rule violations fired, the file likely contains TypeScript
      // syntax that espree can't handle. Fall back to the regex scanner
      // which catches the subset of rules that don't need a full AST.
      const hasRuleViolations = fileMessages.some((m) => m.ruleId !== null);
      const hasParserErrors = fileMessages.some((m) => m.ruleId === null);
      if (!hasRuleViolations && hasParserErrors) {
        fileMessages = verifyWithRegex(code, absPath, ruleConfig);
      }
    } catch {
      // Parser threw (shouldn't happen with espree, but just in case) —
      // fall back to regex scan.
      fileMessages = verifyWithRegex(code, absPath, ruleConfig);
    }

    for (const msg of fileMessages) {
      // Skip parser errors themselves — we only care about rule violations
      if (!msg.ruleId) continue;

      const severity = msg.severity; // 1 = warn, 2 = error
      const entry = {
        file: relPath,
        line: msg.line || 0,
        column: msg.column || 0,
        ruleId: msg.ruleId,
        message: msg.message,
        severity,
      };

      results.messages.push(entry);

      if (severity === 2) {
        results.totalErrors++;
        results.errorsByRule[msg.ruleId] =
          (results.errorsByRule[msg.ruleId] || 0) + 1;
      } else {
        results.totalWarnings++;
        results.warningsByRule[msg.ruleId] =
          (results.warningsByRule[msg.ruleId] || 0) + 1;
      }
    }
  }

  if (results.totalErrors > 0 || results.totalWarnings > 0) {
    console.log(
      `[${iterLabel}] Lint: ${results.totalErrors} error(s), ${results.totalWarnings} warning(s) across ${results.fileCount} file(s)`,
    );
  }

  return results;
}

/**
 * Regex-based fallback for files that the espree parser can't handle (TypeScript).
 * This catches the subset of rules that operate on import statements and simple
 * JSX patterns without needing a full AST.
 *
 * @param {string} code
 * @param {string} filename
 * @param {Record<string, number>} ruleConfig
 * @returns {Array<{ruleId: string, message: string, severity: number, line: number, column: number}>}
 */
function verifyWithRegex(code, filename, ruleConfig) {
  const messages = [];
  const lines = code.split("\n");

  const UI_POC_COMPONENTS = new Set([
    "Box",
    "Flex",
    "Grid",
    "Card",
    "Heading",
    "Text",
    "Divider",
  ]);

  // --- Rule: no-sanity-ui-layout-import ---
  if (ruleConfig["sanity-ui/no-sanity-ui-layout-import"]) {
    const importRe =
      /import\s*\{([^}]+)\}\s*from\s*['"]@sanity\/ui['"]/g;
    let m;
    while ((m = importRe.exec(code)) !== null) {
      const names = m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim());
      for (const name of names) {
        if (UI_POC_COMPONENTS.has(name)) {
          const line = code.slice(0, m.index).split("\n").length;
          messages.push({
            ruleId: "sanity-ui/no-sanity-ui-layout-import",
            message: `${name} must be imported from '@sanity-labs/ui-poc', not '@sanity/ui'. The @sanity/ui version has a different API and will silently produce wrong behavior.`,
            severity: ruleConfig["sanity-ui/no-sanity-ui-layout-import"],
            line,
            column: 1,
          });
        }
      }
    }
  }

  // --- Rule: require-styles-import ---
  if (
    ruleConfig["sanity-ui/require-styles-import"] &&
    /main\.(tsx?|jsx?)$/.test(filename)
  ) {
    if (!code.includes("@sanity-labs/ui-poc/styles.css")) {
      messages.push({
        ruleId: "sanity-ui/require-styles-import",
        message:
          "main.tsx must import '@sanity-labs/ui-poc/styles.css'. Without it, all ui-poc components render as unstyled HTML with no error.",
        severity: ruleConfig["sanity-ui/require-styles-import"],
        line: 1,
        column: 1,
      });
    }
  }

  // --- Rule: no-react-swc-plugin ---
  if (ruleConfig["sanity-ui/no-react-swc-plugin"]) {
    const swcRe = /import\s+.*from\s*['"]@vitejs\/plugin-react-swc['"]/g;
    let m;
    while ((m = swcRe.exec(code)) !== null) {
      const line = code.slice(0, m.index).split("\n").length;
      messages.push({
        ruleId: "sanity-ui/no-react-swc-plugin",
        message:
          "Use '@vitejs/plugin-react' (Babel), not '@vitejs/plugin-react-swc'. The SWC variant causes styled-components to silently produce unstyled output.",
        severity: ruleConfig["sanity-ui/no-react-swc-plugin"],
        line,
        column: 1,
      });
    }
  }

  // --- Rule: require-heading-level ---
  if (ruleConfig["sanity-ui/require-heading-level"]) {
    // Match <Heading that does NOT have a level prop before the closing >
    const headingRe = /<Heading(?=[\s>])([^>]*?)>/g;
    let m;
    while ((m = headingRe.exec(code)) !== null) {
      const attrs = m[1];
      if (!/\blevel\s*[=]/.test(attrs)) {
        const line = code.slice(0, m.index).split("\n").length;
        messages.push({
          ruleId: "sanity-ui/require-heading-level",
          message:
            "Heading is missing the 'level' prop. Without it, <h2> is rendered silently regardless of context. Set  through as="h6" explicitly.",
          severity: ruleConfig["sanity-ui/require-heading-level"],
          line,
          column: 1,
        });
      }
    }
  }

  // --- Rule: no-tone-primary ---
  if (ruleConfig["sanity-ui/no-tone-primary"]) {
    const tonePrimaryRe =
      /<(Button|Badge|MenuItem|Card)\b[^>]*\btone\s*=\s*["']primary["'][^>]*>/g;
    let m;
    while ((m = tonePrimaryRe.exec(code)) !== null) {
      const line = code.slice(0, m.index).split("\n").length;
      messages.push({
        ruleId: "sanity-ui/no-tone-primary",
        message: `tone="primary" on ${m[1]} fails WCAG AA contrast (4.29:1 ratio, needs 4.5:1). Use tone="default" for primary actions.`,
        severity: ruleConfig["sanity-ui/no-tone-primary"],
        line,
        column: 1,
      });
    }
    // Also catch tone={"primary"} with braces
    const tonePrimaryBraceRe =
      /<(Button|Badge|MenuItem|Card)\b[^>]*\btone\s*=\s*\{\s*["']primary["']\s*\}[^>]*>/g;
    while ((m = tonePrimaryBraceRe.exec(code)) !== null) {
      const line = code.slice(0, m.index).split("\n").length;
      messages.push({
        ruleId: "sanity-ui/no-tone-primary",
        message: `tone="primary" on ${m[1]} fails WCAG AA contrast (4.29:1 ratio, needs 4.5:1). Use tone="default" for primary actions.`,
        severity: ruleConfig["sanity-ui/no-tone-primary"],
        line,
        column: 1,
      });
    }
  }

  // --- Rule: no-wrong-spacing-prop ---
  if (ruleConfig["sanity-ui/no-wrong-spacing-prop"]) {
    // <Flex ... space=  (should be gap)
    const flexSpaceRe = /<Flex\b[^>]*\bspace\s*=/g;
    let m;
    while ((m = flexSpaceRe.exec(code)) !== null) {
      const line = code.slice(0, m.index).split("\n").length;
      messages.push({
        ruleId: "sanity-ui/no-wrong-spacing-prop",
        message:
          "'space' on Flex has no effect. Use 'gap' instead: <Flex gap={N}>.",
        severity: ruleConfig["sanity-ui/no-wrong-spacing-prop"],
        line,
        column: 1,
      });
    }
    // <Stack ... gap=  (should be space)
    const stackGapRe = /<Stack\b[^>]*\bgap\s*=/g;
    while ((m = stackGapRe.exec(code)) !== null) {
      const line = code.slice(0, m.index).split("\n").length;
      messages.push({
        ruleId: "sanity-ui/no-wrong-spacing-prop",
        message:
          "'gap' on Stack has no effect. Use 'space' instead: <Stack space={N}>.",
        severity: ruleConfig["sanity-ui/no-wrong-spacing-prop"],
        line,
        column: 1,
      });
    }
  }

  // --- Rule: no-layout-props-on-card ---
  if (ruleConfig["sanity-ui/no-layout-props-on-card"]) {
    const layoutProps = [
      "flexGrow",
      "flexShrink",
      "flexBasis",
      "minWidth",
      "maxWidth",
      "width",
      "height",
      "minHeight",
      "overflow",
      "overflowX",
      "overflowY",
      "position",
    ];
    for (const prop of layoutProps) {
      const re = new RegExp(`<Card\\b[^>]*\\b${prop}\\s*=`, "g");
      let m;
      while ((m = re.exec(code)) !== null) {
        const line = code.slice(0, m.index).split("\n").length;
        messages.push({
          ruleId: "sanity-ui/no-layout-props-on-card",
          message: `'${prop}' on Card is silently ignored. Wrap Card in a Box or Flex and put layout props on the wrapper: <Box ${prop}={...}><Card>...</Card></Box>`,
          severity: ruleConfig["sanity-ui/no-layout-props-on-card"],
          line,
          column: 1,
        });
      }
    }
  }

  // --- Rule: no-layout-props-on-stack ---
  if (ruleConfig["sanity-ui/no-layout-props-on-stack"]) {
    const layoutProps = ["flexGrow", "flexShrink", "flexBasis", "overflow"];
    for (const prop of layoutProps) {
      const re = new RegExp(`<Stack\\b[^>]*\\b${prop}\\s*=`, "g");
      let m;
      while ((m = re.exec(code)) !== null) {
        const line = code.slice(0, m.index).split("\n").length;
        messages.push({
          ruleId: "sanity-ui/no-layout-props-on-stack",
          message: `'${prop}' on Stack is silently ignored. Use <Flex flexDirection="column" gap={N}> instead, or wrap Stack in <Box ${prop}={...}>.`,
          severity: ruleConfig["sanity-ui/no-layout-props-on-stack"],
          line,
          column: 1,
        });
      }
    }
  }

  // --- Rule: no-box-as-button ---
  if (ruleConfig["sanity-ui/no-box-as-button"]) {
    const re = /<Box\b[^>]*\bas\s*=\s*["']button["'][^>]*>/g;
    let m;
    while ((m = re.exec(code)) !== null) {
      const line = code.slice(0, m.index).split("\n").length;
      messages.push({
        ruleId: "sanity-ui/no-box-as-button",
        message:
          '<Box as="button"> inherits browser button defaults (border, background, cursor) with no prop-based reset. Use <Button mode="bleed"> instead.',
        severity: ruleConfig["sanity-ui/no-box-as-button"],
        line,
        column: 1,
      });
    }
  }

  // --- Rule: no-menuitem-icon-children ---
  if (ruleConfig["sanity-ui/no-menuitem-icon-children"]) {
    // Match <MenuItem ... icon={...}> (not self-closing)
    // Heuristic: <MenuItem with icon= and > but not />
    const re =
      /<MenuItem\b([^>]*)\bicon\s*=\s*\{[^}]*\}([^>]*)>(?!\s*<\/)/g;
    let m;
    while ((m = re.exec(code)) !== null) {
      // Check this isn't a self-closing tag
      const fullMatch = m[0];
      if (!fullMatch.endsWith("/>")) {
        const line = code.slice(0, m.index).split("\n").length;
        messages.push({
          ruleId: "sanity-ui/no-menuitem-icon-children",
          message:
            "MenuItem has both an 'icon' prop and children. This causes the icon to render on its own line. Use icon + text prop (no children), or put everything in children (no icon prop). See patterns-navigation.md.",
          severity: ruleConfig["sanity-ui/no-menuitem-icon-children"],
          line,
          column: 1,
        });
      }
    }
  }

  // --- Rule: require-menubutton-id ---
  if (ruleConfig["sanity-ui/require-menubutton-id"]) {
    const re = /<MenuButton\b([^>]*)>/g;
    let m;
    while ((m = re.exec(code)) !== null) {
      const attrs = m[1];
      if (!/\bid\s*=/.test(attrs)) {
        const line = code.slice(0, m.index).split("\n").length;
        messages.push({
          ruleId: "sanity-ui/require-menubutton-id",
          message:
            "MenuButton is missing the 'id' prop. Without it, screen readers cannot associate the trigger with its menu (WCAG 4.1.2 A).",
          severity: ruleConfig["sanity-ui/require-menubutton-id"],
          line,
          column: 1,
        });
      }
    }
  }

  return messages;
}

/**
 * Recursively collect all .js/.jsx/.ts/.tsx files under projectDir/src,
 * excluding node_modules, ui-poc, and dist directories.
 *
 * @param {string} projectDir
 * @returns {Promise<string[]>}
 */
async function collectSourceFiles(projectDir) {
  const srcDir = resolve(projectDir, "src");
  const files = [];

  try {
    const entries = await readdir(srcDir, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const ext = extname(entry.name).toLowerCase();
      if (![".js", ".jsx", ".ts", ".tsx"].includes(ext)) continue;

      // Build full path — entry.parentPath is available in Node 20+
      const parentPath = entry.parentPath || entry.path;
      const fullPath = resolve(parentPath, entry.name);
      const rel = relative(projectDir, fullPath);

      // Skip directories we don't want to lint
      if (
        rel.includes("node_modules") ||
        rel.includes("ui-poc") ||
        rel.includes("/dist/")
      ) {
        continue;
      }

      files.push(fullPath);
    }
  } catch {
    // src/ directory may not exist — return empty
  }

  // Also check for vite.config.ts/js at the project root (for no-react-swc-plugin)
  const viteConfigs = [
    "vite.config.ts",
    "vite.config.js",
    "vite.config.mjs",
  ];
  for (const name of viteConfigs) {
    const fullPath = resolve(projectDir, name);
    try {
      await readFile(fullPath, "utf-8");
      files.push(fullPath);
    } catch {
      // File doesn't exist — skip
    }
  }

  return files;
}

/**
 * Format lint results as a human-readable summary string suitable for
 * including in the agent's fix prompt or the test report.
 *
 * @param {LintResults} results
 * @returns {string}
 */
export function formatLintSummary(results) {
  if (results.totalErrors === 0 && results.totalWarnings === 0) {
    return "Lint: all Sanity UI rules pass ✓";
  }

  const parts = [];
  parts.push(
    `Lint: ${results.totalErrors} error(s), ${results.totalWarnings} warning(s)`,
  );
  parts.push("");

  // Group messages by rule for a concise summary
  const byRule = {};
  for (const msg of results.messages) {
    if (!byRule[msg.ruleId]) {
      byRule[msg.ruleId] = [];
    }
    byRule[msg.ruleId].push(msg);
  }

  for (const [ruleId, msgs] of Object.entries(byRule)) {
    const severity = msgs[0].severity === 2 ? "error" : "warn";
    parts.push(`  ${severity}: ${ruleId} (${msgs.length}x)`);
    // Show up to 3 locations per rule
    for (const msg of msgs.slice(0, 3)) {
      parts.push(`    ${msg.file}:${msg.line} — ${msg.message}`);
    }
    if (msgs.length > 3) {
      parts.push(`    ... and ${msgs.length - 3} more`);
    }
  }

  return parts.join("\n");
}
