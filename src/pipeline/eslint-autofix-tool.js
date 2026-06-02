/**
 * The `run_eslint_autofix` tool exposed to the API runner's fix loop.
 *
 * Why this exists: the API runner has no shell, so an agent reading the
 * fix-system prompt's "run the autofix" instruction can't actually do
 * it. This wires a single, narrow tool into the fix loop so the agent
 * can opt in to running the autofix the same way the CLI runner's
 * built-in Bash tool would.
 *
 * Deliberately a single tool, not a generic Bash tool: we want to
 * measure how reliably the agent runs THIS specific autofix, not give
 * it open-ended shell access.
 */
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { PROJECT_ROOT } from "../config/load.js";
import { readProjectFiles, buildCurrentFilesText } from "./shared.js";

const AUTOFIX_RUNNER = resolve(PROJECT_ROOT, "eslint", "run.js");

/**
 * Anthropic-SDK tool definition. Pass into `tools` on a `messages.create`
 * or `messages.stream` call.
 */
export const AUTOFIX_TOOL = {
  name: "run_eslint_autofix",
  description:
    "Run the ui-poc ESLint autofix pass against the current project. " +
    "It rewrites known @sanity-labs/ui-poc API-shape mistakes in place: " +
    "`<Box display=\"flex\">` → `<Flex>`, `<Card border>` → `<Card>`, " +
    "Flex `direction/align/justify/wrap` → CSS prop names, " +
    "`null` → `undefined` in responsive arrays, and removes `Stack` from " +
    "`@sanity-labs/ui-poc` imports. Returns the linter's output plus the " +
    "updated file contents. " +
    "Call this FIRST in the fix loop — many TypeScript errors disappear " +
    "after autofix, leaving only substantive issues (missing imports, " +
    "real API gaps) to diagnose by hand. Takes no arguments.",
  input_schema: {
    type: "object",
    properties: {},
    required: [],
  },
};

/**
 * Execute the autofix runner against the given project directory.
 * Returns the combined stdout+stderr text — the same output the agent
 * would see if it ran the script from a shell.
 */
function execAutofix(projectDir) {
  return new Promise((resolveExec) => {
    const child = spawn(process.execPath, [AUTOFIX_RUNNER, projectDir], {
      cwd: PROJECT_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));

    child.on("close", (code) => {
      const parts = [];
      if (stdout.trim()) parts.push(stdout.trim());
      if (stderr.trim()) parts.push(`[stderr]\n${stderr.trim()}`);
      parts.push(`[exit code: ${code}]`);
      resolveExec(parts.join("\n\n"));
    });

    child.on("error", (err) => {
      resolveExec(`Failed to spawn autofix runner: ${err.message}`);
    });
  });
}

/**
 * Run the autofix and bundle the result into a tool-result payload.
 *
 * Side effect: the autofix mutates files on disk. This helper re-reads
 * them and **mutates `files` in place** so subsequent `writeProjectFiles`
 * calls preserve the autofix changes. (Callers that don't share a
 * mutable `files` reference must use the returned `updatedFiles`.)
 *
 * @param {object} opts
 * @param {string} opts.projectDir
 * @param {Array<{path:string,content:string}>} opts.files - mutated in place
 * @returns {Promise<{ resultText: string, updatedFiles: Array, linterOutput: string }>}
 */
export async function runAutofixTool({ projectDir, files }) {
  const linterOutput = await execAutofix(projectDir);

  const updatedFiles = await readProjectFiles(projectDir, files);
  // Mutate in place so the caller's reference stays in sync.
  files.splice(0, files.length, ...updatedFiles);

  const updatedFilesText = await buildCurrentFilesText(projectDir, files);

  const resultText =
    `ui-poc ESLint autofix output:\n${linterOutput}\n\n` +
    `Project files after autofix (these are the current contents on disk — ` +
    `base any further edits on this snapshot, not the version in the ` +
    `original fix prompt):\n\n${updatedFilesText}`;

  return { resultText, updatedFiles, linterOutput };
}
