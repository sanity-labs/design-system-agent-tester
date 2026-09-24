/**
 * Jev gate — judge the written source against the design system's own
 * assessable guidelines.
 *
 * This is the only gate that calls a paid, external, early-access API, so it
 * is off unless a test's config asks for it. Nothing here owns the questions
 * or the thresholds: both are imported from the jev tool at `toolDir`, which
 * reads them from the DSDS corpus. A second copy in this repo is exactly the
 * drift that tool's README warns about.
 *
 * Why this gate exists beside lint rather than instead of it: ESLint is free,
 * deterministic, and catches 87% of what agents get wrong. Jev is for the
 * guidelines a linter cannot decide. Today only one question has the measured
 * precision to be worth showing an agent (see `surface` in the tool's
 * THRESHOLDS), so in practice this gate is near-silent — that is correct
 * behaviour, not a bug. It becomes useful as calibrated questions are added.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { isTransientError } from "../util/retry.js";

// SystemOne returns 529 system_overloaded under load. On 2026-09-23 six files
// in one Sonnet arm failed that way with no retry and 10% of the arm went
// unjudged. Backoff grows so five concurrent iterations don't retry in step.
const JEV_RETRY_DELAYS_MS = [2000, 6000, 15000];

/** Ask the judge once, retrying transient failures. Returns the attempts made. */
async function judgeWithRetry(judge, request, { delays = JEV_RETRY_DELAYS_MS, sleep } = {}) {
  const wait = sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  for (let attempt = 1; ; attempt++) {
    try {
      return { res: await judge.systemOne(request), attempts: attempt };
    } catch (err) {
      if (!isTransientError(err) || attempt > delays.length) {
        err.attempts = attempt;
        throw err;
      }
      // Jitter of up to half the delay spreads concurrent retries apart.
      const base = delays[attempt - 1];
      await wait(base + Math.floor(Math.random() * base * 0.5));
    }
  }
}

/**
 * Load the judge from the configured tool directory.
 *
 * Imported dynamically and by absolute path: the tool is a sibling project,
 * not a dependency, and Node resolves its bare imports (`js-yaml`,
 * `dsds-mcp`) from its own `node_modules`.
 */
async function loadJudge(toolDir) {
  const [questions, ask] = await Promise.all([
    import(join(toolDir, "build-questions.mjs")),
    import(join(toolDir, "ask.mjs")),
  ]);
  return { ...questions, ...ask };
}

/**
 * Judge every source file and return only the findings worth acting on.
 *
 * "Worth acting on" is two filters, both deliberate:
 *   - `isSurfaceable(id)` — the item's measured precision can carry a reader.
 *     An AUC of 0.813 on a violation present in 7% of files still yields 0.17
 *     precision; sending that to an agent spends its repair budget on
 *     phantoms.
 *   - `p >= yes` — the item's own calibrated threshold, not a global one.
 *     Real files score lower than isolated snippets, and the three measured
 *     items want thresholds spanning 0.32 to 0.78.
 *
 * `review`-band judgments are recorded but never returned as findings. They
 * are for the report and a human, not for a repair round.
 *
 * A file the API still refuses after its retries goes in `unjudged`, never
 * in `all`. It used to be pushed into `all` as a judgment with no guideline,
 * which every consumer then read as a judged file.
 *
 * @returns {Promise<{findings: Array, judged: number, inputTokens: number,
 *   all: Array, unjudged: Array<{file: string, error: string, attempts: number}>,
 *   unavailable?: boolean, error?: string}>}
 */
export async function runJevGate(files, projectDir, { toolDir, surfaceOnly = true, retry } = {}) {
  const empty = { findings: [], judged: 0, inputTokens: 0, all: [], unjudged: [] };
  if (!toolDir) return { ...empty, unavailable: true, error: "no toolDir configured" };

  let judge;
  try {
    judge = await loadJudge(toolDir);
  } catch (err) {
    return { ...empty, unavailable: true, error: `load: ${err.message}` };
  }

  let questions, items;
  try {
    ({ questions, items } = await judge.buildQuestions());
  } catch (err) {
    return { ...empty, unavailable: true, error: `questions: ${err.message}` };
  }

  const byId = new Map(items.map((i) => [i.id, i]));
  // `files` carries `{ path, content }` records, not paths. Accepting a bare
  // string too keeps this callable from a test or a script with a path list.
  const sources = files
    .map((f) => (typeof f === "string" ? f : f?.path))
    .filter((p) => typeof p === "string" && /\.(tsx|jsx)$/.test(p));
  const findings = [];
  const all = [];
  const unjudged = [];
  let judged = 0;
  let inputTokens = 0;

  const contentByPath = new Map(
    files.filter((f) => f && typeof f === "object" && f.content != null).map((f) => [f.path, f.content]),
  );
  for (const rel of sources) {
    // Prefer what the loop is holding; fall back to disk for a path-only call.
    let code = contentByPath.get(rel);
    if (code == null) {
      try {
        code = readFileSync(join(projectDir, rel), "utf-8");
      } catch {
        continue;
      }
    }
    // No JSX, nothing for a UI guideline to be about.
    if (!code.includes("<")) continue;

    let res;
    try {
      ({ res } = await judgeWithRetry(judge, { state: { filename: rel, code }, questions }, retry));
    } catch (err) {
      // One file failing must not abandon the gate — record it where it
      // can't be mistaken for a judgment, and move on.
      unjudged.push({ file: rel, error: err.message, attempts: err.attempts ?? 1 });
      continue;
    }
    judged++;
    inputTokens += res.usage?.input_tokens ?? 0;

    // Logged through the tool, which writes into the MCP's own log so
    // `dsds logs:top --section jev` reports these beside tool use and lint.
    try {
      await judge.logJudgments(res, rel);
    } catch {
      /* logging is best-effort; never fail the gate on it */
    }

    for (const [id, a] of Object.entries(res.answers ?? {})) {
      const th = judge.thresholdsFor(id);
      const record = {
        file: rel,
        guideline: id,
        probability: a.noul,
        verdict: judge.verdict(a.noul, id),
        surfaceable: judge.isSurfaceable(id),
      };
      all.push(record);
      if (surfaceOnly && !record.surfaceable) continue;
      if (a.noul < th.yes) continue;
      findings.push({
        ...record,
        statement: byId.get(id)?.statement ?? id,
        entity: byId.get(id)?.entity ?? null,
        precision: th.precision ?? null,
      });
    }
  }

  return { findings, judged, inputTokens, all, unjudged };
}

/** Group findings by file, for a prompt that reads file-by-file. */
export function groupFindingsByFile(findings) {
  const byFile = new Map();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file).push(f);
  }
  return [...byFile.entries()].map(([file, items]) => ({ file, items }));
}

/** Persist the full judgment set, including the review band the gate ignored. */
export function writeJevResults(iterDir, result) {
  try {
    writeFileSync(
      join(iterDir, "_jev_results.json"),
      JSON.stringify(
        {
          judged: result.judged,
          inputTokens: result.inputTokens,
          findingCount: result.findings.length,
          unjudgedCount: result.unjudged?.length ?? 0,
          unjudged: result.unjudged ?? [],
          findings: result.findings,
          judgments: result.all,
        },
        null,
        2,
      ),
    );
  } catch {
    /* best-effort */
  }
}
