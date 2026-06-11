import { parseArgs } from "node:util";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { generateReport } from "./reporting/report.js";
import { computeVisualDiff } from "./evaluation/visual-diff.js";
import { generateAppPrompt, STATIC_PROMPT } from "./config/prompt-generator.js";
import { TESTS, TEST_LABELS, buildUserPrompt } from "./config/prompts.js";
import { banner, bold, dim, error, success, tag, warn } from "./util/color.js";

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
    test: {
      type: "string",
      short: "t",
      default: "all",
    },
    prompt: {
      type: "string",
      short: "p",
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
    "agent-prompt": {
      type: "boolean",
      default: false,
    },

    yes: {
      type: "boolean",
      short: "y",
      default: false,
    },
  },
});

// Resolve --test/--prompt with deprecation warning for --prompt.
if (values.test === "all" && values.prompt !== undefined) {
  console.error("Warning: --prompt is deprecated, use --test instead");
  values.test = values.prompt;
}

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
  const testArg = values.test;
  const iterations = parseInt(values.iterations, 10);
  const model = values.model;
  const runnerType = values.runner;
  const maxConcurrency =
    parseInt(values.concurrency, 10) || Math.min(iterations, 2);
  const takeScreenshots = values.screenshot;
  const maxFixes = parseInt(values["max-fixes"], 10);
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
  //   --test all  (or `both`)    — run every test
  //   --test LABEL                — run one test by label
  //   --test LABEL1,LABEL2        — run a comma-separated subset
  let testLabels;
  const testValue = testArg.trim();
  if (testValue === "all" || testValue === "both") {
    testLabels = [...TEST_LABELS];
  } else {
    const parts = testValue.split(",").map((s) => s.trim()).filter(Boolean);
    const unknown = parts.filter((p) => !TEST_LABELS.includes(p));
    if (parts.length === 0 || unknown.length > 0) {
      const valid = [...TEST_LABELS, "all"].join(", ");
      console.error(
        `Error: --test must be one of: ${valid} (or a comma-separated subset). Got "${testArg}"`,
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

  console.log(banner("=== Agent Tester ==="));
  const field = (k) => dim(k.padEnd(13));
  console.log(
    `${field("Runner:")} ${runnerType}${runnerType === "cli" ? " (claude CLI — no API key needed)" : " (Anthropic SDK — requires ANTHROPIC_API_KEY)"}`,
  );
  console.log(`${field("Model:")} ${model}`);
  console.log(`${field("Iterations:")} ${iterations}`);
  console.log(`${field("Max fixes:")} ${maxFixes}`);
  console.log(`${field("Concurrency:")} ${maxConcurrency}`);
  console.log(`${field("Screenshots:")} ${takeScreenshots}`);
  console.log(`${field("Agent prompt:")} ${useAgentPrompt}`);
  console.log(`${field("Tests:")} ${testLabels.join(", ")}`);
  console.log(`${field("Output:")} ${runDir}`);
  console.log(`${field("Brief:")} ${promptBrief.split("\n")[0]}${promptBrief.includes("\n") ? " …" : ""}`);
  console.log("");

  if (!values.yes) {
    const total = iterations * testLabels.length;
    const low = (0.05 * total).toFixed(2);
    const high = (1.00 * total).toFixed(2);
    console.log(
      warn(
        `About to run ${total} agent iterations against ${model}. Each iteration consumes\nAPI tokens (typically $0.05–$1.00 depending on model + iteration count).\nTotal cost for this run is approximately $${low}–$${high}. Press Ctrl-C within 5\nseconds to abort, or pass --yes to skip this warning.`,
      ),
    );
    await new Promise((r) => setTimeout(r, 5000));
  }

  const allResults = {};

  for (const label of testLabels) {
    const test = TESTS.find((t) => t.label === label);
    const promptContent = buildUserPrompt(label, promptBrief);

    console.log(
      bold(`\n--- Running "${label}" test (${iterations} iterations) ---\n`),
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

      console.log(`${tag(iterLabel)} Starting...`);
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
            mcpConfig: test.mcp,
          });

          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`${tag(iterLabel)} ${success(`Completed in ${elapsed}s`)}`);

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
              `${tag(iterLabel)} ${warn(`Transient error after ${elapsed}s (attempt ${attempt}/${MAX_ITERATION_RETRIES}):`)} ${err.message}`,
            );
            console.warn(
              `${tag(iterLabel)} ${warn(`Waiting ${delaySec}s before retry...`)}`,
            );
            await sleep(RETRY_DELAY_MS);
            continue;
          }

          // Non-transient error or final attempt — give up
          console.error(
            `${tag(iterLabel)} ${error(`Failed after ${elapsed}s:`)} ${err.message}`,
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
    console.log(banner("\n\n=== Computing Visual Diffs ===\n"));

    for (const [label, iterations] of Object.entries(allResults)) {
      const validIterations = iterations.filter(
        (r) => !r.error && r.screenshotPath,
      );

      if (validIterations.length < 2) {
        console.log(
          `${tag(label)} Skipping visual diff (need ≥2 screenshots, have ${validIterations.length})`,
        );
        continue;
      }

      console.log(
        `${tag(label)} Comparing ${validIterations.length} screenshots...`,
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
          `${tag(label)} Visual diff complete: avg ${visualDiff.averageDiffPercent}% difference across ${visualDiff.pairwiseDiffs.length} pair(s)`,
        );
      } catch (err) {
        console.warn(`${tag(label)} ${warn("Visual diff failed:")} ${err.message}`);
      }
    }
  }

  // Generate report
  console.log(banner("\n\n=== Generating Report ===\n"));
  await generateReport(allResults, runDir, promptBrief);

  console.log(`\n${success("Done!")} See ${runDir} for results and report.`);
}

main().catch((err) => {
  console.error(error("Fatal error:"), err);
  process.exit(1);
});
