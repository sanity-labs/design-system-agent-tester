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
 * Extract unique Sanity UI component names from source files.
 * Returns a Set of component names. Icons are prefixed with "icon:".
 */
export function extractSanityUIComponents(files) {
  const components = new Set();

  for (const file of files) {
    if (!isSourceFile(file.path)) continue;

    // Match imports from @sanity/ui
    const importRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@sanity\/ui['"]/g;
    let match;
    while ((match = importRegex.exec(file.content)) !== null) {
      const names = match[1].split(",").map((s) =>
        s
          .trim()
          .split(/\s+as\s+/)[0]
          .trim(),
      );
      for (const name of names) {
        if (name) components.add(name);
      }
    }

    // Also check for @sanity/icons
    const iconRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@sanity\/icons['"]/g;
    while ((match = iconRegex.exec(file.content)) !== null) {
      const names = match[1].split(",").map((s) =>
        s
          .trim()
          .split(/\s+as\s+/)[0]
          .trim(),
      );
      for (const name of names) {
        if (name) components.add(`icon:${name}`);
      }
    }
  }

  return components;
}

/**
 * Check if a file is a source file worth analyzing.
 */
export function isSourceFile(filePath) {
  const exts = [".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json"];
  return exts.includes(extname(filePath).toLowerCase());
}
