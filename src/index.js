import { parseArgs } from "node:util";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, mkdir } from "node:fs/promises";
import { generateReport } from "./report.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

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
  },
});

const PROMPTS = {
  control: resolve(ROOT, "PROMPT-CONTROL.md"),
  training: resolve(ROOT, "PROMPT-WITH-TRAINING.md"),
};

/**
 * Build a timestamped directory name in the format YYYY-MM-DD-HH.MM
 */
function buildTimestampedDirName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}.${pad(now.getMinutes())}`;
  return `${date}-${time}`;
}

async function main() {
  const promptArg = values.prompt;
  const iterations = parseInt(values.iterations, 10);
  const model = values.model;
  const runnerType = values.runner;
  const maxConcurrency = parseInt(values.concurrency, 10) || iterations;
  const takeScreenshots = values.screenshot;
  const maxFixes = parseInt(values["max-fixes"], 10);

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
      ? await import("./runner-cli.js")
      : await import("./runner.js");

  // Determine which prompts to run
  let promptKeys;
  if (promptArg === "both") {
    promptKeys = ["control", "training"];
  } else if (PROMPTS[promptArg]) {
    promptKeys = [promptArg];
  } else {
    console.error(
      `Error: --prompt must be "control", "training", or "both". Got "${promptArg}"`,
    );
    process.exit(1);
  }

  // Create a timestamped run directory: output/2025-03-18-14.30/
  const runDirName = buildTimestampedDirName();
  const runDir = resolve(ROOT, "output", runDirName);
  await mkdir(runDir, { recursive: true });

  console.log("=== Agent Tester ===");
  console.log(
    `Runner:       ${runnerType}${runnerType === "cli" ? " (claude CLI — no API key needed)" : " (Anthropic SDK — requires ANTHROPIC_API_KEY)"}`,
  );
  console.log(`Model:        ${model}`);
  console.log(`Iterations:   ${iterations}`);
  console.log(`Max fixes:    ${maxFixes}`);
  console.log(`Concurrency:  ${maxConcurrency}`);
  console.log(`Screenshots:  ${takeScreenshots}`);
  console.log(`Prompts:      ${promptKeys.join(", ")}`);
  console.log(`Output:       ${runDir}`);
  console.log("");

  const allResults = {};

  for (const key of promptKeys) {
    const promptPath = PROMPTS[key];
    const promptContent = await readFile(promptPath, "utf-8");

    console.log(
      `\n--- Running "${key}" prompt (${iterations} iterations) ---\n`,
    );

    const outputDir = resolve(runDir, key);
    await mkdir(outputDir, { recursive: true });

    const results = [];

    // Run iterations with bounded concurrency
    const queue = Array.from({ length: iterations }, (_, i) => i);
    const inFlight = new Set();

    async function runNext() {
      if (queue.length === 0) return;
      const idx = queue.shift();
      const iterLabel = `${key}-iter-${idx + 1}`;
      const iterDir = resolve(outputDir, `iteration-${idx + 1}`);
      await mkdir(iterDir, { recursive: true });

      console.log(`[${iterLabel}] Starting...`);
      const startTime = Date.now();

      try {
        const result = await runAgent({
          promptContent,
          model,
          iterDir,
          iterLabel,
          takeScreenshots,
          maxFixes,
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[${iterLabel}] Completed in ${elapsed}s`);

        results[idx] = {
          iteration: idx + 1,
          elapsedSeconds: parseFloat(elapsed),
          ...result,
        };
      } catch (err) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.error(
          `[${iterLabel}] Failed after ${elapsed}s: ${err.message}`,
        );

        results[idx] = {
          iteration: idx + 1,
          elapsedSeconds: parseFloat(elapsed),
          error: err.message,
          linesOfCode: 0,
          files: [],
          sanityUIComponents: [],
        };
      }
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

    allResults[key] = results;
  }

  // Generate report
  console.log("\n\n=== Generating Report ===\n");
  await generateReport(allResults, runDir);

  console.log(`\nDone! See ${runDir} for results and report.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
