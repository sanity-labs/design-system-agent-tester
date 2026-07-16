/**
 * Pure helpers for the generative-UI run: extracting the spec from a model
 * response, parsing the MCP validator's text result, measuring a spec, and
 * building the report. No I/O — unit-testable in isolation.
 */

// Untrusted model output; in genui mode this is bounded only by max_tokens.
// Cap before regex scanning so an unterminated code fence can't drive
// quadratic backtracking (same rationale as parse-files.js MAX_PARSE_BYTES).
const MAX_SPEC_BYTES = 2_000_000;

/** Extract a `{ root, elements }` spec from a model response. */
export function extractSpec(text) {
  if (!text) return { spec: null, raw: null };
  if (typeof text !== "string") return { spec: null, raw: null };
  if (text.length > MAX_SPEC_BYTES) text = text.slice(0, MAX_SPEC_BYTES);

  let raw = null;
  // `[ \t]*\n?` instead of `\s*` removes the ambiguous overlap with the lazy
  // `[\s\S]*?` body that caused O(n²) backtracking on an unterminated fence
  // (both `\s*` and `[\s\S]*?` could match the same whitespace run).
  const fenced = text.match(/```(?:json)?[ \t]*\n?([\s\S]*?)```/i);
  if (fenced) raw = fenced[1].trim();

  if (!raw) {
    // Fall back to the first balanced { … } object in the text.
    const start = text.indexOf("{");
    if (start >= 0) {
      let depth = 0;
      for (let i = start; i < text.length; i++) {
        const c = text[i];
        if (c === "{") depth++;
        else if (c === "}") {
          depth--;
          if (depth === 0) {
            raw = text.slice(start, i + 1);
            break;
          }
        }
      }
    }
  }

  if (!raw) return { spec: null, raw: null };
  try {
    return { spec: JSON.parse(raw), raw };
  } catch {
    return { spec: null, raw };
  }
}

/** Parse the text returned by dsds_validate_ui into a structured result. */
export function parseValidationResult(text) {
  const valid = /UI spec is valid/i.test(text ?? "");
  const bullets = (text ?? "")
    .split("\n")
    .filter((l) => l.trim().startsWith("- "))
    .map((l) => l.trim().slice(2).trim());

  let issueCount = 0;
  if (!valid) {
    const m = (text ?? "").match(/(\d+)\s+issue/);
    issueCount = m ? Number(m[1]) : bullets.length;
  }
  // On success the single bullet is the "Valid. N element(s)…" line, not an issue.
  return { valid, issueCount, issues: valid ? [] : bullets };
}

/** Shallow metrics over a parsed spec. */
export function specMetrics(spec) {
  const elements = (spec && spec.elements) || {};
  const ids = Object.keys(elements);
  const componentsUsed = [...new Set(ids.map((id) => elements[id]?.type).filter(Boolean))];
  return {
    elementCount: ids.length,
    componentsUsed,
    rootPresent: Boolean(spec && spec.root && elements[spec.root]),
  };
}

/** Weighted effective input tokens (matches the harness's prompt-cache weighting). */
export function effectiveInput(u = {}) {
  return Math.round((u.uncached ?? 0) + (u.cacheRead ?? 0) * 0.1 + (u.cacheCreation ?? 0) * 1.25);
}

/**
 * Collapse a per-element validation issue into its error *class* (component +
 * prop + kind), dropping element ids and instance paths so the report groups
 * "Text.size — must be number" across every element that hit it.
 */
export function issueClass(issue) {
  const comp = (issue.match(/\(([A-Z][A-Za-z]+)\)/) || [])[1] || "";
  const prop =
    (issue.match(/prop "([^"]+)"/) || [])[1] ||
    (issue.match(/\/props\/([A-Za-z0-9_-]+)/) || [])[1] ||
    (issue.match(/:\s*([A-Za-z0-9_-]+)\s*=/) || [])[1] ||
    "";
  let kind;
  if (/is not allowed/.test(issue)) kind = "prop not allowed";
  else if (/is not in the catalog/.test(issue)) kind = "unknown component type";
  else if (/must be number/.test(issue)) kind = "must be number (string given?)";
  else if (/must be array/.test(issue)) kind = "must be array";
  else if (/oneOf/.test(issue)) kind = "failed scalar-or-array shape";
  else if (/= invalid value/.test(issue)) kind = "invalid enum value";
  else if (/missing required/.test(issue)) kind = "missing required prop";
  else if (/does not exist in elements/.test(issue)) kind = "dangling child reference";
  else if (/Root .* is not present/.test(issue)) kind = "missing root";
  else kind = "other";
  const head = [comp, prop].filter(Boolean).join(".");
  return head ? `${head} — ${kind}` : kind;
}

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (n, d) => (d ? Math.round((100 * n) / d) : 0);
const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Build the markdown report and a JSON summary from iteration records.
 * Each record: { brief, iteration, ok, validFirstTry, valid, fixAttempts,
 *   issueCount, elementCount, componentsUsed[], issues[], tokens{effIn,out}, error? }
 */
export function buildReport(records, meta = {}) {
  const byBrief = {};
  for (const r of records) (byBrief[r.brief] ??= []).push(r);

  const briefRows = [];
  for (const [brief, rs] of Object.entries(byBrief)) {
    const done = rs.filter((r) => r.ok);
    briefRows.push({
      brief,
      n: rs.length,
      produced: done.length,
      validFirstTry: done.filter((r) => r.validFirstTry).length,
      validEventually: done.filter((r) => r.valid).length,
      avgFixes: r1(mean(done.map((r) => r.fixAttempts ?? 0))),
      avgElements: r1(mean(done.filter((r) => r.valid).map((r) => r.elementCount ?? 0))),
      avgComponents: r1(
        mean(done.filter((r) => r.valid).map((r) => (r.componentsUsed ?? []).length)),
      ),
      effIn: done.reduce((s, r) => s + (r.tokens?.effIn ?? 0), 0),
      out: done.reduce((s, r) => s + (r.tokens?.out ?? 0), 0),
    });
  }

  const all = records.filter((r) => r.ok);
  const overall = {
    n: records.length,
    produced: all.length,
    validFirstTry: all.filter((r) => r.validFirstTry).length,
    validEventually: all.filter((r) => r.valid).length,
    avgFixes: r1(mean(all.map((r) => r.fixAttempts ?? 0))),
  };

  // Component-usage frequency across valid specs.
  const compFreq = {};
  for (const r of all.filter((r) => r.valid)) {
    for (const c of r.componentsUsed ?? []) compFreq[c] = (compFreq[c] ?? 0) + 1;
  }
  // First-try validation-issue frequency (what models get wrong before fixing),
  // normalized to the text before the first ":". Falls back to final issues.
  const issueFreq = {};
  for (const r of all) {
    const seen = new Set(); // count each error class once per spec
    for (const issue of r.firstIssues ?? r.issues ?? []) {
      const key = issueClass(issue);
      if (seen.has(key)) continue;
      seen.add(key);
      issueFreq[key] = (issueFreq[key] ?? 0) + 1;
    }
  }

  const lines = [];
  lines.push("# Generative-UI catalog test", "");
  lines.push(`_Generated: ${meta.generatedAt ?? ""}_  `);
  lines.push(
    `**Model:** \`${meta.model ?? ""}\` · **Briefs:** ${Object.keys(byBrief).length} · **Iterations/brief:** ${meta.iterations ?? ""}`,
    "",
  );
  lines.push(
    'Each iteration: the agent fetches `dsds_get_catalog`, emits a `{ root, elements }` spec, and the spec is validated by `dsds_validate_ui`. "Valid first try" = passed before any fix; "valid eventually" = passed within the fix budget.',
    "",
  );

  lines.push("## Summary", "");
  lines.push(
    "| Brief | Iters | Produced | Valid 1st try | Valid eventually | Avg fixes | Avg elements | Avg components | Eff. input | Output |",
  );
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const b of briefRows) {
    lines.push(
      `| ${b.brief} | ${b.n} | ${b.produced} | ${b.validFirstTry}/${b.produced} (${pct(b.validFirstTry, b.produced)}%) | ${b.validEventually}/${b.produced} (${pct(b.validEventually, b.produced)}%) | ${b.avgFixes} | ${b.avgElements} | ${b.avgComponents} | ${b.effIn.toLocaleString()} | ${b.out.toLocaleString()} |`,
    );
  }
  lines.push(
    `| **All** | ${overall.n} | ${overall.produced} | ${overall.validFirstTry}/${overall.produced} (${pct(overall.validFirstTry, overall.produced)}%) | ${overall.validEventually}/${overall.produced} (${pct(overall.validEventually, overall.produced)}%) | ${overall.avgFixes} | — | — | — | — |`,
    "",
  );

  lines.push("## Component usage (across valid specs)", "");
  const comps = Object.entries(compFreq).sort((a, b) => b[1] - a[1]);
  if (comps.length) {
    lines.push("| Component | Specs using it |", "| --- | --- |");
    for (const [c, n] of comps) lines.push(`| \`${c}\` | ${n} |`);
  } else lines.push("_No valid specs._");
  lines.push("");

  lines.push("## Most common first-try validation issues", "");
  const issues = Object.entries(issueFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  if (issues.length) {
    lines.push("| Issue | Count |", "| --- | --- |");
    for (const [k, n] of issues) lines.push(`| ${k} | ${n} |`);
  } else lines.push("_No issues recorded._");
  lines.push("");

  const errs = records.filter((r) => !r.ok);
  if (errs.length) {
    lines.push("## Iterations that produced no spec", "");
    for (const e of errs)
      lines.push(`- ${e.brief} #${e.iteration}: ${e.error ?? "no parseable spec"}`);
    lines.push("");
  }

  return {
    markdown: lines.join("\n"),
    json: {
      meta,
      overall,
      byBrief: briefRows,
      componentFrequency: compFreq,
      issueFrequency: issueFreq,
    },
  };
}
