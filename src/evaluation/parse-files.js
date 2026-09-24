import { extname, isAbsolute, normalize, sep } from "node:path";

/**
 * Remove a markdown code fence wrapped around a whole file, if there is one.
 *
 * Some agents put file contents inside a ```lang fence. Written to disk as
 * is, that gives you a package.json starting with ```json, which npm
 * refuses to read.
 *
 * Only a fence around the entire content is removed, so a file that
 * legitimately contains one is left alone.
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
 * File paths from the agent cannot be trusted. A model could emit `../../x`
 * or an absolute path and read or write outside the project. Only accept
 * paths that stay inside it.
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
  // Reject anything under node_modules. Installed packages can include
  // symlinks pointing outside the project, so a path that looks contained
  // could still escape when followed. The agent never has a good reason to
  // write there.
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

// Agent output is untrusted, and this runs over the whole conversation on
// every turn. Cap the text first so a very large or deliberately awkward
// response cannot slow the run to a crawl. Real output is well under this.
export const MAX_PARSE_BYTES = 2_000_000;

/**
 * Split the text into `---FILE: path--- … ---END FILE---` blocks by scanning
 * for the markers directly, which stays fast even when markers are missing.
 */
function parseFileBlocks(text) {
  const files = [];
  const OPEN = "---FILE:";
  const CLOSE = "---END FILE---";
  let cursor = 0;
  while (true) {
    const open = text.indexOf(OPEN, cursor);
    if (open === -1) break;
    // The header runs to the end of its line. A well-formed one ends in
    // "---", but a header missing those three characters is still accepted:
    // the file content after it is usually fine, and dropping the whole block
    // over the header would lose real work.
    const lineEnd = text.indexOf("\n", open + OPEN.length);
    if (lineEnd === -1) break;
    let headerLine = text.slice(open + OPEN.length, lineEnd);
    if (headerLine.endsWith("---")) headerLine = headerLine.slice(0, -3);
    const filePath = headerLine.trim();
    const contentStart = lineEnd + 1;

    const close = text.indexOf(CLOSE, contentStart);
    if (close === -1) {
      // The closing marker is missing, which happens now and then in fix
      // replies. If no further file header follows, this is clearly the last
      // block, so treat the rest of the text as its content rather than
      // throwing the whole reply away.
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

  // If no `---FILE---` blocks were found, fall back to fenced code blocks
  // with a filename comment on the first line. Matching spaces and tabs
  // rather than any whitespace keeps the pattern from being slow.
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
