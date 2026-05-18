import { parseArgs } from "node:util";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { generateReport } from "./reporting/report.js";
import { computeVisualDiff } from "./evaluation/visual-diff.js";
import { generateAppPrompt, STATIC_PROMPT } from "./config/prompt-generator.js";
import { TESTS, TEST_LABELS, buildUserPrompt } from "./config/prompts.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const MAX_ITERATION_RETRIES = 3;
const RETRY_DELAY_MS = 30_000; // 30 seconds between retries

/**
 * Check if an error is transient and worth retrying.
 */
function isTransientError(err) {
  const msg = (err.message || "").toLowerCase();
  return (
    msg.includes("connection error") ||
    msg.includes("connection reset") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("overloaded") ||
    msg.includes("529") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("internal server error")
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const { values } = parseArgs({
  options: {
    prompt: {
      type: "string",
      short: "p",
      default: "both",
    },
    iterations: {
      type: "string",
      short: "n",
      default: "3",
    },
    model: {
      type: "string",
      short: "m",
      default: "claude-sonnet-4-20250514",
    },
    runner: {
      type: "string",
      short: "r",
      default: "api",
    },
    concurrency: {
      type: "string",
      short: "c",
      default: "0",
    },
    screenshot: {
      type: "boolean",
      short: "s",
      default: true,
    },
    "max-fixes": {
      type: "string",
      short: "f",
      default: "5",
    },
    "no-mcp": {
      type: "boolean",
      default: false,
    },

    "agent-prompt": {
      type: "boolean",
      default: false,
    },
  },
});

/**
 * Resolve the interface brief used by every variant in the current run.
 *
 * When --agent-prompt is false (default): returns the static fallback string.
 * When --agent-prompt is true: calls the Anthropic API to generate a fresh
 * PRD-style interface brief, then returns it.
 *
 * @param {boolean} useAgentPrompt
 * @param {string}  model - Claude model used for generation
 * @returns {Promise<string>}
 */
async function resolvePromptBrief(useAgentPrompt, model) {
  if (!useAgentPrompt) {
    return STATIC_PROMPT;
  }

  console.log("Generating interface brief with agent...");
  const brief = await generateAppPrompt({ model });
  console.log(`\n--- Generated interface brief ---\n${brief}\n---\n`);
  return brief;
}

/**
 * Build a timestamped run path in the format YYYY-MM-DD/HH.MM
 */
function buildTimestampedRunPath() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}.${pad(now.getMinutes())}`;
  return `${date}/${time}`;
}

async function main() {
  const promptArg = values.prompt;
  const iterations = parseInt(values.iterations, 10);
  const model = values.model;
  const runnerType = values.runner;
  const maxConcurrency =
    parseInt(values.concurrency, 10) || Math.min(iterations, 2);
  const takeScreenshots = values.screenshot;
  const maxFixes = parseInt(values["max-fixes"], 10);
  const mcpEnabled = !values["no-mcp"];
  const useAgentPrompt = values["agent-prompt"];

  if (isNaN(maxFixes) || maxFixes < 0) {
    console.error("Error: --max-fixes must be a non-negative integer");
    process.exit(1);
  }

  if (isNaN(iterations) || iterations < 1) {
    console.error("Error: --iterations must be a positive integer");
    process.exit(1);
  }

  if (!["api", "cli"].includes(runnerType)) {
    console.error(
      `Error: --runner must be "api" or "cli". Got "${runnerType}"`,
    );
    process.exit(1);
  }

  // Dynamically import the selected runner
  const { runAgent } =
    runnerType === "cli"
      ? await import("./pipeline/runner-cli.js")
      : await import("./pipeline/runner-api.js");

  // Determine which tests to run.
  //   --prompt all  (or `both`)    — run every test
  //   --prompt LABEL                — run one test by label
  //   --prompt LABEL1,LABEL2        — run a comma-separated subset
  let testLabels;
  const promptValue = promptArg.trim();
  if (promptValue === "all" || promptValue === "both") {
    testLabels = [...TEST_LABELS];
  } else {
    const parts = promptValue.split(",").map((s) => s.trim()).filter(Boolean);
    const unknown = parts.filter((p) => !TEST_LABELS.includes(p));
    if (parts.length === 0 || unknown.length > 0) {
      const valid = [...TEST_LABELS, "all"].join(", ");
      console.error(
        `Error: --prompt must be one of: ${valid} (or a comma-separated subset). Got "${promptArg}"`,
      );
      process.exit(1);
    }
    testLabels = parts;
  }

  // Create a timestamped run directory: output/2025-03-18/14.30/
  const runDirPath = buildTimestampedRunPath();
  const runDir = resolve(ROOT, "output", runDirPath);
  await mkdir(runDir, { recursive: true });

  // Resolve the interface brief once — both prompt variants receive the same text.
  const promptBrief = await resolvePromptBrief(useAgentPrompt, model);

  console.log("=== Agent Tester ===");
  console.log(
    `Runner:       ${runnerType}${runnerType === "cli" ? " (claude CLI — no API key needed)" : " (Anthropic SDK — requires ANTHROPIC_API_KEY)"}`,
  );
  console.log(`Model:        ${model}`);
  console.log(`Iterations:   ${iterations}`);
  console.log(`Max fixes:    ${maxFixes}`);
  console.log(`Concurrency:  ${maxConcurrency}`);
  console.log(`Screenshots:  ${takeScreenshots}`);
  console.log(`MCP:          ${mcpEnabled}`);
  console.log(`Agent prompt: ${useAgentPrompt}`);
  console.log(`Tests:        ${testLabels.join(", ")}`);
  console.log(`Output:       ${runDir}`);
  console.log(`Brief:        ${promptBrief.split("\n")[0]}${promptBrief.includes("\n") ? " …" : ""}`);
  console.log("");

  const allResults = {};

  for (const label of testLabels) {
    const test = TESTS.find((t) => t.label === label);
    const promptContent = buildUserPrompt(label, promptBrief);

    console.log(
      `\n--- Running "${label}" test (${iterations} iterations) ---\n`,
    );

    const outputDir = resolve(runDir, label);
    await mkdir(outputDir, { recursive: true });

    const results = [];

    // Run iterations with bounded concurrency
    const queue = Array.from({ length: iterations }, (_, i) => i);
    const inFlight = new Set();

    async function runNext() {
      if (queue.length === 0) return;
      const idx = queue.shift();
      const iterLabel = `${label}-iter-${idx + 1}`;
      const iterDir = resolve(outputDir, `iteration-${idx + 1}`);
      await mkdir(iterDir, { recursive: true });

      console.log(`[${iterLabel}] Starting...`);
      const startTime = Date.now();

      let lastError = null;

      for (let attempt = 1; attempt <= MAX_ITERATION_RETRIES; attempt++) {
        try {
          const result = await runAgent({
            promptContent,
            model,
            iterDir,
            iterLabel,
            testLabel: label,
            takeScreenshots,
            maxFixes,
            useMcp: mcpEnabled && test.requiresMcp,
          });

          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`[${iterLabel}] Completed in ${elapsed}s`);

          results[idx] = {
            iteration: idx + 1,
            elapsedSeconds: parseFloat(elapsed),
            ...result,
          };
          return; // success — exit retry loop
        } catch (err) {
          lastError = err;
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

          if (isTransientError(err) && attempt < MAX_ITERATION_RETRIES) {
            const delaySec = Math.round(RETRY_DELAY_MS / 1000);
            console.warn(
              `[${iterLabel}] Transient error after ${elapsed}s (attempt ${attempt}/${MAX_ITERATION_RETRIES}): ${err.message}`,
            );
            console.warn(`[${iterLabel}] Waiting ${delaySec}s before retry...`);
            await sleep(RETRY_DELAY_MS);
            continue;
          }

          // Non-transient error or final attempt — give up
          console.error(
            `[${iterLabel}] Failed after ${elapsed}s: ${err.message}`,
          );
          break;
        }
      }

      // All retries exhausted or non-transient error
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      results[idx] = {
        iteration: idx + 1,
        elapsedSeconds: parseFloat(elapsed),
        testLabel: label,
        error: lastError.message,
        linesOfCode: 0,
        files: [],
        componentImports: [],
      };
    }

    // Process queue with concurrency limit
    async function processQueue() {
      while (queue.length > 0 || inFlight.size > 0) {
        while (queue.length > 0 && inFlight.size < maxConcurrency) {
          const promise = runNext();
          inFlight.add(promise);
          promise.then(() => inFlight.delete(promise));
        }
        if (inFlight.size > 0) {
          await Promise.race(inFlight);
        }
      }
    }

    await processQueue();

    allResults[label] = results;
  }

  // Visual diff: compare screenshots within each test
  if (takeScreenshots) {
    console.log("\n\n=== Computing Visual Diffs ===\n");

    for (const [label, iterations] of Object.entries(allResults)) {
      const validIterations = iterations.filter(
        (r) => !r.error && r.screenshotPath,
      );

      if (validIterations.length < 2) {
        console.log(
          `[${label}] Skipping visual diff (need ≥2 screenshots, have ${validIterations.length})`,
        );
        continue;
      }

      console.log(
        `[${label}] Comparing ${validIterations.length} screenshots...`,
      );
      const promptOutputDir = resolve(runDir, label);

      try {
        const visualDiff = await computeVisualDiff(
          validIterations,
          promptOutputDir,
        );

        // Attach visual diff results to each iteration set for the report
        for (const iter of iterations) {
          iter._visualDiff = visualDiff;
        }

        console.log(
          `[${label}] Visual diff complete: avg ${visualDiff.averageDiffPercent}% difference across ${visualDiff.pairwiseDiffs.length} pair(s)`,
        );
      } catch (err) {
        console.warn(`[${label}] Visual diff failed: ${err.message}`);
      }
    }
  }

  // Generate report
  console.log("\n\n=== Generating Report ===\n");
  await generateReport(allResults, runDir, promptBrief);

  console.log(`\nDone! See ${runDir} for results and report.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
