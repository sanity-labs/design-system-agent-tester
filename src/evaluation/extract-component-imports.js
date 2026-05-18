import { isSourceFile } from "./parse-files.js";

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
  const importRegex = new RegExp(
    `import\\s*\\{([^}]+)\\}\\s*from\\s*['"](?:${pattern})['"]`,
    "g",
  );

  for (const file of files) {
    if (!isSourceFile(file.path)) continue;

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
    importRegex.lastIndex = 0;
  }

  return components;
}
