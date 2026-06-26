import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { generateAppPrompt, STATIC_PROMPT } from "./config/prompt-generator.js";
import { buildUserPrompt, TEST_LABELS, TESTS } from "./config/prompts.js";
import { computeVisualDiff } from "./evaluation/visual-diff.js";
import { iterationBuilt } from "./reporting/aggregators.js";
import { generateReport } from "./reporting/report.js";
import { banner, bold, dim, error, success, tag, warn } from "./util/color.js";
import { loadEnvFile, requireApiKey } from "./util/load-env.js";
import { isTransientError } from "./util/retry.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const MAX_ITERATION_RETRIES = 3;
const RETRY_DELAY_MS = 30_000; // 30 seconds between retries

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
      default: "claude-sonnet-4-6",
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
    genui: {
      type: "boolean",
      default: false,
    },

    yes: {
      type: "boolean",
      short: "y",
      default: false,
    },
  },
  // Lets boolean flags be turned off (e.g. --no-screenshot) — without
  // this, a default-true boolean like --screenshot can never be unset.
  allowNegative: true,
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
 * Atomically claim a fresh run directory in the format
 * `YYYY-MM-DD/HH.MM`, falling back to `HH.MM.1`, `HH.MM.2`, … if the
 * minute-precision path is already taken by another concurrent run.
 *
 * Non-recursive `mkdir` is the race-safe primitive — it errors with
 * `EEXIST` if the directory already exists, even when two processes
 * try simultaneously. We loop on that error to pick the next suffix.
 * Without this, a second run started in the same wall-clock minute
 * silently shared an output directory with the first and overwrote
 * its iteration artifacts.
 *
 * Returns the relative path (e.g. `"2026-06-23/13.42"` or
 * `"2026-06-23/13.42.1"`). The directory has already been created on
 * disk; callers should not `mkdir` it again.
 */
async function buildTimestampedRunPath() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}.${pad(now.getMinutes())}`;

  // The date directory is shared across all runs on a given day —
  // create it idempotently.
  const dateDir = resolve(ROOT, "output", date);
  await mkdir(dateDir, { recursive: true });

  // Try `HH.MM` first, then `HH.MM.1`, `HH.MM.2`, … until atomic
  // mkdir succeeds.
  for (let suffix = 0; ; suffix++) {
    const name = suffix === 0 ? time : `${time}.${suffix}`;
    const full = resolve(dateDir, name);
    try {
      await mkdir(full, { recursive: false });
      return `${date}/${name}`;
    } catch (err) {
      if (err.code !== "EEXIST") throw err;
      // Directory was claimed by another process — try the next suffix.
    }
  }
}

async function main() {
  const testArg = values.test;
  const iterations = parseInt(values.iterations, 10);
  const model = values.model;
  // Default to 1 (sequential) so Lighthouse / DOM / screenshot measurements
  // aren't biased by CPU contention between parallel iterations. Pass an
  // explicit `--concurrency 2+` for runs that prioritise wall-clock time
  // over measurement precision.
  const maxConcurrency = parseInt(values.concurrency, 10) || 1;
  const genui = values.genui;
  // genui still compiles to a real React app, so the full build/screenshot/
  // measure pipeline runs exactly like a normal test.
  const takeScreenshots = values.screenshot;
  const maxFixes = parseInt(values["max-fixes"], 10);
  const useAgentPrompt = values["agent-prompt"];

  // Load .env ourselves — Node's --env-file parser silently drops some keys.
  loadEnvFile(resolve(ROOT, ".env"));
  requireApiKey();

  if (isNaN(maxFixes) || maxFixes < 0) {
    console.error("Error: --max-fixes must be a non-negative integer");
    process.exit(1);
  }

  if (isNaN(iterations) || iterations < 1) {
    console.error("Error: --iterations must be a positive integer");
    process.exit(1);
  }

  // The runner is imported lazily so `--help`-style fast paths don't pull in
  // the Anthropic SDK and the browser-heavy evaluation modules.
  const { runAgent } = await import("./pipeline/runner-api.js");

  // Determine which tests to run.
  //   --test all  (or `both`)    — run every test
  //   --test LABEL                — run one test by label
  //   --test LABEL1,LABEL2        — run a comma-separated subset
  let testLabels;
  const testValue = testArg.trim();
  if (testValue === "all" || testValue === "both") {
    testLabels = [...TEST_LABELS];
  } else {
    const parts = testValue
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
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

  // Atomically claim a timestamped run directory:
  // `output/2025-03-18/14.30/` (or `…/14.30.1/` if another concurrent
  // run already owns 14.30). The directory is created by
  // buildTimestampedRunPath, so no separate mkdir is needed here.
  const runDirPath = await buildTimestampedRunPath();
  const runDir = resolve(ROOT, "output", runDirPath);

  // Resolve the interface brief once — both prompt variants receive the same text.
  const promptBrief = await resolvePromptBrief(useAgentPrompt, model);

  console.log(banner("=== Agent Tester ==="));
  const field = (k) => dim(k.padEnd(13));
  console.log(`${field("Model:")} ${model} (Anthropic SDK — requires ANTHROPIC_API_KEY)`);
  console.log(
    `${field("Mode:")} ${genui ? "genui — EXPERIMENTAL (agent writes JSON → compiled to React)" : "build (agent writes React)"}`,
  );
  console.log(`${field("Iterations:")} ${iterations}`);
  console.log(`${field("Max fixes:")} ${maxFixes}`);
  console.log(`${field("Concurrency:")} ${maxConcurrency}`);
  console.log(`${field("Screenshots:")} ${takeScreenshots}`);
  console.log(`${field("Agent prompt:")} ${useAgentPrompt}`);
  console.log(`${field("Tests:")} ${testLabels.join(", ")}`);
  console.log(`${field("Output:")} ${runDir}`);
  console.log(
    `${field("Brief:")} ${promptBrief.split("\n")[0]}${promptBrief.includes("\n") ? " …" : ""}`,
  );
  console.log("");

  if (!values.yes) {
    const total = iterations * testLabels.length;
    const low = (0.05 * total).toFixed(2);
    const high = (1.0 * total).toFixed(2);
    console.log(
      warn(
        `About to run ${total} agent iterations against ${model}. Each iteration spends\nAPI tokens; the cost depends heavily on the model. As a rough guide for a\nmid-tier model (e.g. Sonnet), expect ~$0.05–$1.00 per iteration, so roughly\n$${low}–$${high} for this run. Higher-tier models (e.g. Opus) cost several times\nmore. Press Ctrl-C within 5 seconds to abort, or pass --yes to skip this warning.`,
      ),
    );
    await new Promise((r) => setTimeout(r, 5000));
  }

  const allResults = {};

  for (const label of testLabels) {
    const test = TESTS.find((t) => t.label === label);
    if (genui && !test.mcp) {
      console.error(error(`--genui requires a test with an \`mcp\` block; "${label}" has none.`));
      process.exit(1);
    }
    // In genui mode the system prompt carries the catalog + format rules, so the
    // user message is the raw brief; the React path wraps it with test framing.
    const promptContent = genui ? promptBrief : buildUserPrompt(label, promptBrief);

    console.log(bold(`\n--- Running "${label}" test (${iterations} iterations) ---\n`));

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
            genui,
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
            console.warn(`${tag(iterLabel)} ${warn(`Waiting ${delaySec}s before retry...`)}`);
            await sleep(RETRY_DELAY_MS);
            continue;
          }

          // Non-transient error or final attempt — give up
          console.error(`${tag(iterLabel)} ${error(`Failed after ${elapsed}s:`)} ${err.message}`);
          break;
        }
      }

      // All retries exhausted or non-transient error
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Persist the failure to the iteration directory. Without this a
      // failed iteration leaves only `_prompt.txt`, so the cause is lost
      // once the terminal scrolls — and the bug-report template asks for
      // artifacts that wouldn't exist. Best-effort: never let a write
      // error mask the original failure.
      try {
        await writeFile(
          resolve(iterDir, "_error.txt"),
          `${new Date().toISOString()} — iteration failed after ${elapsed}s\n\n` +
            (lastError?.stack || lastError?.message || String(lastError)) +
            "\n",
          "utf-8",
        );
      } catch {
        // ignore — the in-memory result below still records the message
      }

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
          // runNext records its own failures in `results`; a rejection
          // here is unexpected (e.g. mkdir failed). Catch it so the
          // tracked promise can't reject — an unhandled rejection in
          // Promise.race would abort the whole run.
          const promise = runNext().catch((err) => {
            console.error(`${tag(label)} ${error("Iteration runner crashed:")} ${err.message}`);
          });
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
      // Only diff screenshots from iterations that produced a working
      // build. A broken render's screenshot still lives on disk, but
      // comparing it to a healthy one inflates the diff percentage with
      // pixels that reflect failure, not design variance.
      const validIterations = iterations.filter(
        (r) => !r.error && r.screenshotPath && iterationBuilt(r),
      );

      if (validIterations.length < 2) {
        console.log(
          `${tag(label)} Skipping visual diff (need ≥2 screenshots, have ${validIterations.length})`,
        );
        continue;
      }

      console.log(`${tag(label)} Comparing ${validIterations.length} screenshots...`);
      const promptOutputDir = resolve(runDir, label);

      try {
        const visualDiff = await computeVisualDiff(validIterations, promptOutputDir);

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

  // Generate report — the same report for both modes; genui just got its files
  // by compiling a JSON spec instead of the agent hand-writing React.
  console.log(banner("\n\n=== Generating Report ===\n"));
  await generateReport(allResults, runDir, promptBrief);

  console.log(`\n${success("Done!")} See ${runDir} for results and report.`);
}

// Tolerate a *narrow* class of orphan-promise rejections from libraries
// that leak background promises after their main API has resolved.
// Lighthouse's internal `checkForQuiet` polling can outlive
// `lighthouse()`'s resolved promise: when we close the browser, the next
// poll fires against a dead CDP session and rejects unhandled. Without
// tolerance, Node crashes the whole harness mid-iteration.
//
// We do NOT swallow everything — a blanket handler hides real bugs
// (e.g. a genuine ReferenceError surfaces as a silent "iteration
// failed"). Only the known CDP/teardown signatures are ignored; any
// other rejection is logged with its stack and crashes the process, the
// same as Node's default.
const TOLERATED_REJECTION_RE =
  /Target closed|Protocol error|Session closed|checkForQuiet|WebSocket is not open|Most likely the page has been closed/i;

process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  if (TOLERATED_REJECTION_RE.test(msg)) {
    console.warn(warn(`Unhandled promise rejection (ignored, orphan teardown): ${msg}`));
    return;
  }
  // Unexpected rejection — surface it loudly and exit non-zero.
  const stack = reason instanceof Error ? reason.stack : msg;
  console.error(error("Unhandled promise rejection (fatal):"), stack);
  process.exit(1);
});

main().catch((err) => {
  console.error(error("Fatal error:"), err);
  process.exit(1);
});
