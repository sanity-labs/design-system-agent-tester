import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { DEFAULT_MODE, generateBrief, MODES, staticBriefFor } from "./config/prompt-generator.js";
import { buildUserPrompt, TEST_LABELS, TESTS } from "./config/prompts.js";
import { computeVisualDiff } from "./evaluation/visual-diff.js";
import { iterationBuilt } from "./reporting/aggregators.js";
import { generateReport } from "./reporting/report.js";
import { banner, bold, dim, error, success, tag, warn } from "./util/color.js";
import { loadEnvFile, requireApiKey } from "./util/load-env.js";
import { isLocalModel } from "./util/local-model.js";
import { isTransientError } from "./util/retry.js";
import { acquireRunLock, releaseRunLock } from "./util/run-lock.js";

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
    // Comma-separated list of model IDs. Runs every test across every model
    // (tests × models × iterations). Takes precedence over --model.
    models: {
      type: "string",
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
    // Defaults to 1 (2026-09-24). It was 0 because a lint repair after a
    // working render sometimes rewrote scaffold files and broke the type
    // check. Two changes since remove that: `guardRepairScope` drops scaffold
    // rewrites in post-render repairs, and repair turns no longer nudge the
    // agent to re-emit the whole project. At 0, no lint finding that needed a
    // person was ever sent back — the 09-22..24 runs shipped 394 layout-prop
    // and 411 inline-style findings. The automatic fix pass still runs before
    // every render check either way.
    "max-lint-fixes": {
      type: "string",
      default: "1",
    },
    // When false (`--no-fix-accessibility`), axe still runs and violations are
    // still measured/reported — the agent just isn't sent back to FIX them, so
    // no fix budget is spent on accessibility and an a11y repair can't regress
    // a working build. Applies to the whole run (all tests × models).
    "fix-accessibility": {
      type: "boolean",
      default: true,
    },
    "agent-prompt": {
      type: "boolean",
      default: false,
    },
    // What kind of thing the run asks for. `app` is the original
    // behaviour — a whole interface. `component` narrows the brief to one
    // component plus a page demonstrating its states. Same pipeline and
    // same gates either way; only the brief pool differs.
    mode: {
      type: "string",
      default: DEFAULT_MODE,
    },
    // Use a fixed brief read verbatim from a file. Overrides both the static
    // fallback and --agent-prompt, so a run is exactly reproducible — required
    // for controlled A/B comparisons (same brief, different tooling/surface).
    "brief-file": {
      type: "string",
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
 * @param {string}  model - The run's target model (may be a local Ollama tag)
 * @returns {Promise<string>}
 */
async function resolvePromptBrief(useAgentPrompt, model, briefFile, mode = DEFAULT_MODE) {
  if (briefFile) {
    const brief = readFileSync(resolve(briefFile), "utf-8");
    console.log(`Using fixed brief from ${briefFile} (${brief.length} chars) — reproducible run.`);
    return brief;
  }
  if (!useAgentPrompt) {
    return staticBriefFor(mode);
  }

  // Brief generation always calls the Anthropic API directly (it's a
  // one-off PRD-writing step, not the model under test) — passing through
  // a local Ollama tag here 404s against Anthropic. Fall back to the
  // default Claude model whenever the run's target model isn't one.
  const briefModel = isLocalModel(model) ? undefined : model;
  console.log(
    `Generating ${mode} brief with agent${briefModel ? "" : " (local run target — using default Claude model for brief generation)"}...`,
  );
  const brief = await generateBrief({ mode, ...(briefModel ? { model: briefModel } : {}) });
  console.log(`\n--- Generated ${mode} brief ---\n${brief}\n---\n`);
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
  // --models (comma-separated) wins over --model; a single-model run via
  // either flag behaves identically (no extra path segment, plain report keys).
  const models = values.models
    ? [
        ...new Set(
          values.models
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ]
    : [values.model];
  if (models.length === 0) {
    console.error("Error: --models must contain at least one model ID");
    process.exit(1);
  }
  const multiModel = models.length > 1;
  // Default to 1 (sequential) so Lighthouse / DOM / screenshot measurements
  // aren't biased by CPU contention between parallel iterations. Pass an
  // explicit `--concurrency 2+` for runs that prioritise wall-clock time
  // over measurement precision.
  const maxConcurrency = parseInt(values.concurrency, 10) || 1;
  const takeScreenshots = values.screenshot;
  const maxFixes = parseInt(values["max-fixes"], 10);
  const maxLintFixes = parseInt(values["max-lint-fixes"], 10);
  const fixAccessibility = values["fix-accessibility"];
  const useAgentPrompt = values["agent-prompt"];

  // Load .env ourselves — Node's --env-file parser silently drops some keys.
  loadEnvFile(resolve(ROOT, ".env"));
  // An Ollama tag (colon in the model ID) runs entirely locally — no
  // Anthropic key needed for that model. A mixed run (some local, some
  // Claude) still needs the key for its Claude models.
  const allModelsLocal = models.every(isLocalModel);
  if (!allModelsLocal) requireApiKey();

  if (isNaN(maxFixes) || maxFixes < 0) {
    console.error("Error: --max-fixes must be a non-negative integer");
    process.exit(1);
  }

  if (isNaN(maxLintFixes) || maxLintFixes < 0) {
    console.error("Error: --max-lint-fixes must be a non-negative integer");
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

  // What the run asks agents to build. Validated here rather than at the
  // point of use so an unknown value fails before a run directory is
  // claimed and the lock is taken.
  const mode = String(values.mode ?? DEFAULT_MODE).trim();
  if (!MODES.includes(mode)) {
    console.error(`Error: --mode must be one of: ${MODES.join(", ")}. Got "${values.mode}"`);
    process.exit(1);
  }

  // Atomically claim a timestamped run directory:
  // `output/2025-03-18/14.30/` (or `…/14.30.1/` if another concurrent
  // run already owns 14.30). The directory is created by
  // buildTimestampedRunPath, so no separate mkdir is needed here.
  const runDirPath = await buildTimestampedRunPath();
  const runDir = resolve(ROOT, "output", runDirPath);

  // One harness run per machine. Concurrent runs contend for CPU, npm, and
  // dev-server resources — widening the install/typecheck race window and
  // skewing Lighthouse — so the second run refuses to start instead.
  acquireRunLock({ runDir: runDirPath });

  // Resolve the interface brief once — every test AND every model receives
  // the same text, so cross-model results stay comparable.
  const promptBrief = await resolvePromptBrief(
    useAgentPrompt,
    models[0],
    values["brief-file"],
    mode,
  );

  console.log(banner("=== Agent Tester ==="));
  const field = (k) => dim(k.padEnd(13));
  console.log(
    `${field(multiModel ? "Models:" : "Model:")} ${models.join(", ")}${
      allModelsLocal ? " (local via Ollama)" : " (Anthropic SDK — requires ANTHROPIC_API_KEY)"
    }`,
  );
  console.log(`${field("Mode:")} ${mode} (agent writes React)`);
  console.log(`${field("Iterations:")} ${iterations}`);
  console.log(`${field("Max fixes:")} ${maxFixes}`);
  console.log(`${field("Max lint fixes:")} ${maxLintFixes}`);
  console.log(`${field("Fix a11y:")} ${fixAccessibility}`);
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
    const total = iterations * testLabels.length * models.length;
    const message = allModelsLocal
      ? `About to run ${total} agent iterations against ${models.join(", ")} (local — no API cost).\nWall-clock time depends on model size and machine; expect it to run noticeably\nslower per iteration than a cloud model. Press Ctrl-C within 5 seconds to abort,\nor pass --yes to skip this warning.`
      : (() => {
          const low = (0.05 * total).toFixed(2);
          const high = (1.0 * total).toFixed(2);
          return `About to run ${total} agent iterations against ${models.join(", ")}. Each iteration spends\nAPI tokens; the cost depends heavily on the model. As a rough guide for a\nmid-tier model (e.g. Sonnet), expect ~$0.05–$1.00 per iteration, so roughly\n$${low}–$${high} for this run. Higher-tier models (e.g. Opus) cost several times\nmore. Press Ctrl-C within 5 seconds to abort, or pass --yes to skip this warning.`;
        })();
    console.log(warn(message));
    await new Promise((r) => setTimeout(r, 5000));
  }

  const allResults = {};

  for (const label of testLabels) {
    const test = TESTS.find((t) => t.label === label);

    // Optional per-test hook — a test declares this itself (see
    // tests.internal/ui5-mcp/config.js for the DSDS-specific example) if it
    // has something worth checking before iterations start. The harness
    // doesn't know or care what a test's tooling is.
    // Awaited so an async check can work: verifying a tool name against a
    // server's advertised tool list means starting the server, which is
    // async. Without the await, a rejected preflight became an unhandled
    // rejection and the run carried on past a check that had failed.
    if (typeof test.preflight === "function") await test.preflight();

    const promptContent = buildUserPrompt(label, promptBrief);

    for (const model of models) {
      // Each model gets its own result bucket and (in multi-model runs) its
      // own output subdirectory. The key uses a `/` so it doubles as the
      // path fragment under runDir — the visual-diff pass resolves it
      // directly. Single-model runs keep the plain label for back-compat
      // with existing reports and the aggregate tooling.
      const runKey = multiModel ? `${label}/${model}` : label;

      console.log(
        bold(
          `\n--- Running "${label}" test${multiModel ? ` on ${model}` : ""} (${iterations} iterations) ---\n`,
        ),
      );

      const outputDir = resolve(runDir, runKey);
      await mkdir(outputDir, { recursive: true });

      const results = [];

      // Run iterations with bounded concurrency
      const queue = Array.from({ length: iterations }, (_, i) => i);
      const inFlight = new Set();

      async function runNext() {
        if (queue.length === 0) return;
        const idx = queue.shift();
        const iterLabel = `${runKey}-iter-${idx + 1}`;
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
              maxLintFixes,
              fixAccessibility,
              measureScreenshots: test.measure.screenshots,
              measurePerformance: test.measure.performance,
              effort: test.effort,
              mcpConfig: test.mcp,
              cliConfig: test.cli,
              jevConfig: test.jev,
              renderFailureSignatures: test.renderFailureSignatures,
              minStylesheetRules: test.minStylesheetRules,
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

      allResults[runKey] = results;
    } // end per-model loop
  }

  // Visual diff: compare screenshots within each test
  if (takeScreenshots) {
    console.log(banner("\n\n=== Computing Visual Diffs ===\n"));

    for (const [label, iterations] of Object.entries(allResults)) {
      // `label` here is the result bucket key (`testLabel` or, in multi-model
      // runs, `testLabel/model`) — resolve back to the test config via each
      // iteration's own `testLabel` field so the per-test `measure.visualDiff`
      // toggle applies regardless of key shape.
      const testLabel = iterations[0]?.testLabel ?? label;
      const test = TESTS.find((t) => t.label === testLabel);
      if (test && !test.measure.visualDiff) {
        console.log(`${tag(label)} Skipping visual diff (measure.visualDiff: false)`);
        continue;
      }

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

  // Generate report.
  console.log(banner("\n\n=== Generating Report ===\n"));
  await generateReport(allResults, runDir, promptBrief);

  console.log(`\n${success("Done!")} See ${runDir} for results and report.`);
}

// evaluation/lighthouse.js. Lighthouse runs one at a time to prevent the
// clash that causes this, and this list is the backstop so a stray late
// timer can never bring down the whole run.
const TOLERATED_REJECTION_RE =
  /Target closed|Protocol error|Session closed|checkForQuiet|WebSocket is not open|Most likely the page has been closed|performance mark has not been set/i;

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
