import { isJsxFile, MAX_PARSE_BYTES } from "./parse-files.js";

/**
 * Extract unique imported component names from a set of source files,
 * scanning imports from any of the listed packages.
 *
 * @param {Array<{path:string,content:string}>} files
 * @param {string[]} [packageNames]
 *        Package names whose named imports should be collected. Returns an
 *        empty Set if `packageNames` is empty or omitted.
 * @returns {Set<string>}
 */
export function extractComponentImports(files, packageNames) {
  const components = new Set();
  if (!Array.isArray(packageNames) || packageNames.length === 0) {
    return components;
  }

  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = packageNames.map(escRe).join("|");
  // Anchor: `import [type] {` up to the opening brace. No nested unbounded
  // quantifiers, so no catastrophic backtracking. The brace BODY and the
  // `} from "pkg"` tail are matched WITHOUT a `[^}]+`-to-far-terminator regex
  // (see below) — that pattern backtracked across the whole buffer at every
  // anchor on `import {`-flood input (O(n²)); a size cap alone can't tame
  // that at multi-MB sizes, so the body is found by linear indexOf instead.
  const anchorRe = /import\s+(?:type\s+)?\{/g;
  const tailRe = new RegExp(`^\\s*from\\s*['"](?:${pattern})['"]`);

  for (const file of files) {
    if (!isJsxFile(file.path)) continue;

    const content =
      file.content.length > MAX_PARSE_BYTES ? file.content.slice(0, MAX_PARSE_BYTES) : file.content;

    anchorRe.lastIndex = 0;
    let anchor;
    while ((anchor = anchorRe.exec(content)) !== null) {
      const braceOpen = anchor.index + anchor[0].length; // just past `{`
      const close = content.indexOf("}", braceOpen);
      // No closing brace anywhere ahead → no valid import can follow either,
      // since anchors only advance. Stop instead of rescanning to EOF per
      // anchor (which is what made the old regex quadratic).
      if (close === -1) break;
      // Only inspect a bounded tail window for the `} from "pkg"` suffix.
      if (tailRe.test(content.slice(close + 1, close + 1 + 512))) {
        const names = content
          .slice(braceOpen, close)
          .split(",")
          .map((s) =>
            s
              .trim()
              .split(/\s+as\s+/)[0]
              .trim(),
          );
        for (const name of names) {
          if (name) components.add(name);
        }
      }
      anchorRe.lastIndex = close + 1; // resume after this brace
    }
  }

  return components;
}
