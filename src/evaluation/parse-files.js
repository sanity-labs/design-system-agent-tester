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
  return normalized !== ".." && !normalized.startsWith(`..${sep}`) && !normalized.startsWith("../");
}

/** Drop files whose paths would escape the project directory. */
function rejectUnsafePaths(files) {
  return files.filter((file) => {
    if (isSafeRelativePath(file.path)) return true;
    console.warn(`Skipping agent-emitted file with unsafe path: ${file.path}`);
    return false;
  });
}

/**
 * Parse ---FILE: path--- / ---END FILE--- blocks from the agent output.
 */
export function parseFiles(text) {
  const files = [];
  const fileRegex = /---FILE:\s*(.+?)---\n([\s\S]*?)---END FILE---/g;
  let match;

  while ((match = fileRegex.exec(text)) !== null) {
    const filePath = match[1].trim();
    const content = stripWrappingFence(match[2]);
    files.push({ path: filePath, content });
  }

  // Fallback: try to parse fenced code blocks with filenames if no ---FILE--- blocks found
  if (files.length === 0) {
    const fencedRegex =
      /```(?:[a-z]*)\s*\n?\s*(?:\/\/|#|<!--)\s*(?:file:\s*)?(\S+?)(?:\s*-->)?\s*\n([\s\S]*?)```/g;
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
