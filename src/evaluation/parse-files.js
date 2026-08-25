import { extname, isAbsolute, normalize, sep } from "node:path";

/**
 * Strip a markdown code fence wrapping the entire file content, if present.
 *
 * Some agents emit file contents inside `---FILE: …---` blocks with a
 * markdown ```lang … ``` fence wrapped around the body. Written verbatim
 * to disk that produces, e.g., a `package.json` that literally starts
 * with `` ```json ``, which npm rejects with EJSONPARSE.
 *
 * This strips a *full-content* fence — opening on the first non-empty
 * line and closing on the last non-empty line. Inner code fences (e.g. a
 * README that intentionally documents fenced examples) are left alone.
 */
function stripWrappingFence(content) {
  const trimmed = content.trimEnd();
  const lines = trimmed.split("\n");

  // Find first non-empty line. If it's not a fence, leave content alone.
  let start = 0;
  while (start < lines.length && lines[start].trim() === "") start++;
  if (start >= lines.length || !/^```/.test(lines[start].trim())) {
    return content;
  }

  // Find last non-empty line. If it's not a closing fence, leave alone.
  let end = lines.length - 1;
  while (end > start && lines[end].trim() === "") end--;
  if (end <= start || lines[end].trim() !== "```") return content;

  // Preserve a trailing newline if the original had one, since many tools
  // (and our own tests/configs) expect files to end with `\n`.
  const trailingNl = /\n$/.test(content) ? "\n" : "";
  return lines.slice(start + 1, end).join("\n") + trailingNl;
}

/**
 * Agent-emitted file paths are untrusted input — a model steered by MCP
 * or doc content could emit `../../x` or an absolute path and read or
 * write outside the sandbox project directory. Accept only paths that
 * stay inside the project dir once normalized.
 */
export function isSafeRelativePath(filePath) {
  if (typeof filePath !== "string" || filePath.trim().length === 0) {
    return false;
  }
  // Absolute posix/windows paths, drive letters, and UNC paths.
  if (isAbsolute(filePath) || /^[a-zA-Z]:[\\/]|^\\\\/.test(filePath)) {
    return false;
  }
  const normalized = normalize(filePath);
  if (normalized === ".." || normalized.startsWith(`..${sep}`) || normalized.startsWith("../")) {
    return false;
  }
  // Refuse any `node_modules` segment. The harness preserves node_modules
  // across fix-loop turns and `npm install` can materialize a `file:`/`link:`
  // dependency there as a symlink pointing outside the sandbox; an agent
  // path like `node_modules/<dep>/x` is lexically contained but would follow
  // that symlink on write/read. The agent never legitimately writes into
  // node_modules, so blocking the segment closes the vector at parse time.
  const segments = normalized.split(/[\\/]/);
  if (segments.includes("node_modules")) {
    return false;
  }
  return true;
}

/** Drop files whose paths would escape the project directory. */
function rejectUnsafePaths(files) {
  return files.filter((file) => {
    if (isSafeRelativePath(file.path)) return true;
    console.warn(`Skipping agent-emitted file with unsafe path: ${file.path}`);
    return false;
  });
}

// Agent output is untrusted and, in MCP mode, parseFiles runs on the
// cumulative conversation buffer every turn. Cap the text before any
// scanning so a crafted response (e.g. tens of thousands of unterminated
// `---FILE:` anchors, or a code fence followed by a long whitespace run)
// can't drive quadratic work and stall the single-threaded orchestrator.
// Legitimate output is bounded by max_tokens (~128KB); this cap is far
// above that.
export const MAX_PARSE_BYTES = 2_000_000;

/**
 * Split `---FILE: path--- … ---END FILE---` blocks with linear-time
 * indexOf scanning instead of a lazy `[\s\S]*?`-to-far-terminator regex
 * (which backtracks to end-of-input at every anchor when terminators are
 * missing — O(n²) on adversarial input).
 */
function parseFileBlocks(text) {
  const files = [];
  const OPEN = "---FILE:";
  const CLOSE = "---END FILE---";
  let cursor = 0;
  while (true) {
    const open = text.indexOf(OPEN, cursor);
    if (open === -1) break;
    // The header line runs to its own terminating newline. A well-formed
    // header ends the line in "---" (---FILE: path---) — tolerate one that
    // omits it (---FILE: path) too: a model that emits real, well-formed
    // file content but drops these three characters on the header line
    // shouldn't have the whole block silently discarded. This also fixes a
    // latent bug in the stricter version: searching forward for the next
    // literal "---\n" (instead of stopping at the header's own newline)
    // could walk past a missing trailing "---" into the file's own content
    // and match one deep inside a later, unrelated block.
    const lineEnd = text.indexOf("\n", open + OPEN.length);
    if (lineEnd === -1) break;
    let headerLine = text.slice(open + OPEN.length, lineEnd);
    if (headerLine.endsWith("---")) headerLine = headerLine.slice(0, -3);
    const filePath = headerLine.trim();
    const contentStart = lineEnd + 1;

    const close = text.indexOf(CLOSE, contentStart);
    if (close === -1) {
      // The model forgot the closing marker — this happens occasionally in
      // fix-loop replies (the system prompt shows the format, but a reply
      // can still end without it). If no further `---FILE:` header follows,
      // this is unambiguously the last block: treat the rest of the text as
      // its content instead of silently discarding the whole reply, which
      // otherwise wastes a full fix attempt re-submitting the unchanged,
      // still-broken file. If another header DOES follow, the boundary
      // between the two files is ambiguous — bail out rather than guess
      // (also what keeps a flood of unterminated headers, as in the
      // algorithmic-complexity test below, from being treated as one file).
      const nextOpen = text.indexOf(OPEN, contentStart);
      if (nextOpen !== -1) break;
      const content = stripWrappingFence(text.slice(contentStart));
      if (filePath) files.push({ path: filePath, content });
      break;
    }
    const content = stripWrappingFence(text.slice(contentStart, close));
    if (filePath) files.push({ path: filePath, content });
    cursor = close + CLOSE.length;
  }
  return files;
}

/**
 * Parse ---FILE: path--- / ---END FILE--- blocks from the agent output.
 */
export function parseFiles(text) {
  if (typeof text !== "string") return [];
  // Neutralize the algorithmic-complexity vector before scanning.
  if (text.length > MAX_PARSE_BYTES) text = text.slice(0, MAX_PARSE_BYTES);

  const files = parseFileBlocks(text);
  let match;

  // Fallback: try to parse fenced code blocks with filenames if no ---FILE--- blocks found.
  // The `[ \t]*` (not `\s*`) around the marker avoids the ambiguous whitespace
  // partitioning that made the old `\s*\n?\s*` group backtrack quadratically.
  if (files.length === 0) {
    const fencedRegex =
      /```(?:[a-z]*)[ \t]*\n[ \t]*(?:\/\/|#|<!--)[ \t]*(?:file:[ \t]*)?(\S+?)(?:[ \t]*-->)?[ \t]*\n([\s\S]*?)```/g;
    while ((match = fencedRegex.exec(text)) !== null) {
      files.push({ path: match[1].trim(), content: match[2] });
    }
  }

  // Second fallback: look for ```filename patterns
  if (files.length === 0) {
    const altFencedRegex = /```(\S+\.\w+)\n([\s\S]*?)```/g;
    while ((match = altFencedRegex.exec(text)) !== null) {
      const possiblePath = match[1];
      // Filter out language-only labels like ```javascript
      if (possiblePath.includes("/") || possiblePath.includes(".")) {
        files.push({ path: possiblePath, content: match[2] });
      }
    }
  }

  return rejectUnsafePaths(files);
}

/**
 * Check if a file is a source file worth analyzing.
 */
export function isSourceFile(filePath) {
  const exts = [".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json"];
  return exts.includes(extname(filePath).toLowerCase());
}

/**
 * Check if a file is a JSX/TSX source file (excludes CSS, JSON, HTML).
 */
export function isJsxFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  return [".js", ".jsx", ".ts", ".tsx"].includes(ext);
}
