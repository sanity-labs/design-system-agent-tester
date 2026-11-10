/**
 * Tell the agent when the lint autofix rewrote its code.
 *
 * Before every check, the harness runs the design system's lint with autofix
 * on whatever the agent just wrote. The next repair prompt then shows the
 * project as it is on disk — after the autofix — with no sign that anything
 * changed. An agent that is told about an error on a line it never wrote
 * assumes its own edit was wrong, and writes the same edit again.
 *
 * That is exactly how two iterations failed on 2026-10-02: the agent moved a
 * percentage margin into `style` (correct), a buggy autofix lifted it back out
 * into a prop (a type error), and the agent — seeing only the error — moved it
 * into `style` again. Six rounds, same error, never fixed. This module makes
 * the rewrite visible, so the agent can see that the autofix produced the
 * error and write the code a different way.
 *
 * Deliberately says nothing about any particular design system: the engine
 * ships no design system's rules, and the note only reports what changed.
 */

// Line-level LCS is quadratic. Past this many cells for one file's changed
// middle section, fall back to reporting that section as a single hunk.
const MAX_LCS_CELLS = 4_000_000;

/**
 * Line-level diff of two versions of one file, as hunks of contiguous changes.
 *
 * Common leading and trailing lines are trimmed first, so the usual autofix —
 * a handful of changed lines — costs almost nothing.
 *
 * @param {string} before
 * @param {string} after
 * @returns {Array<{line: number, before: string[], after: string[]}>} `line` is
 *   the 1-based line where the hunk starts in `after`, because that is the
 *   version the type checker and the agent's next error message refer to.
 */
export function diffLineHunks(before, after) {
  if (before === after) return [];
  const a = before.split("\n");
  const b = after.split("\n");

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);

  if (midA.length * midB.length > MAX_LCS_CELLS) {
    return [{ line: start + 1, before: midA, after: midB }];
  }

  // LCS table over the middle section, then walk it to emit hunks.
  const n = midA.length;
  const m = midB.length;
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] =
        midA[i] === midB[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const hunks = [];
  let current = null;
  const flush = () => {
    if (current) hunks.push(current);
    current = null;
  };
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && midA[i] === midB[j]) {
      flush();
      i++;
      j++;
    } else if (j < m && (i >= n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      current ??= { line: start + j + 1, before: [], after: [] };
      current.after.push(midB[j]);
      j++;
    } else {
      current ??= { line: start + j + 1, before: [], after: [] };
      current.before.push(midA[i]);
      i++;
    }
  }
  flush();
  return hunks;
}

/**
 * Which files the autofix changed, and how.
 *
 * @param {Array<{path: string, content: string}>} beforeFiles - on disk just before the autofix
 * @param {Array<{path: string, content: string}>} afterFiles - on disk just after it
 * @returns {Array<{path: string, hunks: ReturnType<typeof diffLineHunks>}>}
 */
export function describeAutofixRewrites(beforeFiles, afterFiles) {
  const before = new Map((beforeFiles ?? []).map((f) => [f.path, f.content]));
  const rewrites = [];
  for (const f of afterFiles ?? []) {
    const prev = before.get(f.path);
    if (typeof prev !== "string" || typeof f.content !== "string" || prev === f.content) continue;
    const hunks = diffLineHunks(prev, f.content);
    if (hunks.length) rewrites.push({ path: f.path, hunks });
  }
  return rewrites;
}

const clip = (s, max) => (s.length > max ? `${s.slice(0, max)}…` : s);

/**
 * Render the rewrites as a section for the next repair prompt. Empty string
 * when the autofix changed nothing, so callers can append it unconditionally.
 *
 * Capped so an autofix that touched dozens of files cannot crowd out the
 * errors the prompt is actually about.
 *
 * @param {ReturnType<typeof describeAutofixRewrites>} rewrites
 * @param {{maxHunks?: number, maxLinesPerSide?: number, maxLineChars?: number}} [opts]
 * @returns {string}
 */
export function formatAutofixNote(rewrites, opts = {}) {
  const { maxHunks = 8, maxLinesPerSide = 4, maxLineChars = 200 } = opts;
  if (!rewrites?.length) return "";

  const all = rewrites.flatMap((r) => r.hunks.map((h) => ({ path: r.path, ...h })));
  const shown = all.slice(0, maxHunks);
  const side = (lines, sign) => {
    const out = lines.slice(0, maxLinesPerSide).map((l) => `${sign}${clip(l, maxLineChars)}`);
    if (lines.length > maxLinesPerSide)
      out.push(`${sign}… (${lines.length - maxLinesPerSide} more line(s))`);
    return out;
  };
  const blocks = shown.map((h) =>
    [`@@ ${h.path}, line ${h.line} @@`, ...side(h.before, "-"), ...side(h.after, "+")].join("\n"),
  );

  let md = "## Lint autofix rewrote these lines after your change\n\n";
  md +=
    "Before every check, the harness runs an automatic lint fix on your files. It changed the lines " +
    "below (`-` is what you wrote, `+` is what the autofix wrote). The files and errors above show the " +
    "rewritten code, not yours. If an error points at one of these lines, the autofix produced it, and " +
    "writing the same code again will be rewritten the same way. Write it differently, in a form the " +
    "autofix leaves alone.\n\n";
  md += "```diff\n" + blocks.join("\n") + "\n```\n";
  if (all.length > shown.length) md += `\n…and ${all.length - shown.length} more change(s).\n`;
  return md;
}

/** Append the note to a repair prompt, or return the prompt unchanged. */
export function withAutofixNote(prompt, note) {
  return note ? `${prompt}\n\n${note}` : prompt;
}
