/**
 * Single import point for the project configuration.
 *
 * Resolves `agent-tester.config.js` at the project root. To use a custom
 * config file at a different path, set the `AGENT_TESTER_CONFIG` env var
 * to its absolute path before launching.
 *
 * Every other module reads config through this loader — never via direct
 * import — so the project has exactly one boundary between "engine" and
 * "configuration".
 */

import { resolve, dirname, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = resolve(__dirname, "..", "..");

const DEFAULT_CONFIG_PATH = resolve(PROJECT_ROOT, "agent-tester.config.js");
const EXAMPLE_CONFIG_PATH = resolve(
  PROJECT_ROOT,
  "agent-tester.config.example.js",
);

const envPath = process.env.AGENT_TESTER_CONFIG;
const resolvedPath = envPath
  ? isAbsolute(envPath)
    ? envPath
    : resolve(PROJECT_ROOT, envPath)
  : DEFAULT_CONFIG_PATH;

if (!existsSync(resolvedPath)) {
  const hint = existsSync(EXAMPLE_CONFIG_PATH)
    ? `Copy \`agent-tester.config.example.js\` to \`agent-tester.config.js\` and edit it.`
    : `Create \`agent-tester.config.js\` at the project root.`;
  throw new Error(
    `Agent Tester config not found at ${resolvedPath}.\n${hint}`,
  );
}

// Use a file:// URL so the dynamic import works with absolute paths on all OSes.
const { default: config } = await import(pathToFileURL(resolvedPath).href);

if (!config || typeof config !== "object") {
  throw new Error(
    `Agent Tester config at ${resolvedPath} must export a default object.`,
  );
}

export const CONFIG_PATH = resolvedPath;
export default config;
