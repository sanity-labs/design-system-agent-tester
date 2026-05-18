import { extname } from "node:path";

/**
 * Parse ---FILE: path--- / ---END FILE--- blocks from the agent output.
 */
export function parseFiles(text) {
  const files = [];
  const fileRegex = /---FILE:\s*(.+?)---\n([\s\S]*?)---END FILE---/g;
  let match;

  while ((match = fileRegex.exec(text)) !== null) {
    const filePath = match[1].trim();
    const content = match[2];
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

  return files;
}

/**
 * Check if a file is a source file worth analyzing.
 */
export function isSourceFile(filePath) {
  const exts = [".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json"];
  return exts.includes(extname(filePath).toLowerCase());
}
