#!/usr/bin/env node
/**
 * CLI runner for the ui-poc ESLint plugin. Lints a project directory
 * with autofix enabled, writes fixed files to disk, and prints any
 * remaining problems.
 *
 * Designed to be invoked by an agent (or the harness) without the
 * target project needing to install ESLint or the plugin — the
 * harness's own ESLint dependency runs against the agent's files via
 * an absolute config.
 *
 * Usage:
 *   node /path/to/agent-tester/eslint/run.js <projectDir>
 *
 * Exit codes:
 *   0  no problems left after autofix
 *   1  problems remain (read the printed output for what needs manual work)
 *   2  bad invocation (no projectDir, dir doesn't exist, etc.)
 */

import { ESLint } from "eslint";
import tsParser from "@typescript-eslint/parser";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import plugin from "./index.js";

const arg = process.argv[2];
if (!arg) {
  console.error("Usage: node eslint/run.js <projectDir>");
  process.exit(2);
}

const projectDir = resolve(process.cwd(), arg);
if (!existsSync(projectDir)) {
  console.error(`Project directory not found: ${projectDir}`);
  process.exit(2);
}

const eslint = new ESLint({
  fix: true,
  cwd: projectDir,
  // Don't pick up the project's own ESLint config (if any). We supply
  // the entire flat-config inline.
  overrideConfigFile: true,
  overrideConfig: [
    {
      ignores: ["**/node_modules/**", "**/dist/**", "**/build/**"],
    },
    {
      files: ["**/*.{js,jsx,ts,tsx}"],
      languageOptions: {
        parser: tsParser,
        parserOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
          ecmaFeatures: { jsx: true },
        },
      },
      plugins: { "ui-poc": plugin },
      rules: {
        "ui-poc/no-box-display-non-block": "error",
        "ui-poc/no-null-in-responsive-array": "error",
        "ui-poc/flex-shorthand-prop-names": "error",
        "ui-poc/stack-from-sanity-ui": "error",
        "ui-poc/no-card-border": "error",
      },
    },
  ],
});

const results = await eslint.lintFiles(["**/*.{js,jsx,ts,tsx}"]);

await ESLint.outputFixes(results);

const formatter = await eslint.loadFormatter("stylish");
const output = await formatter.format(results);
if (output.trim()) console.log(output);

const remaining = results.reduce(
  (n, r) => n + r.errorCount + r.warningCount,
  0,
);
const fixed = results.reduce((n, r) => n + (r.output ? 1 : 0), 0);

console.log(
  `ui-poc lint: ${fixed} file(s) autofixed, ${remaining} problem(s) remaining.`,
);

process.exit(remaining > 0 ? 1 : 0);
