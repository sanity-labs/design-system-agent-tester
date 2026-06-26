import { isJsxFile } from "./parse-files.js";

/**
 * Count actual JSX usage instances of each component across source files.
 * Unlike `extractComponentImports` (which tracks unique imported names),
 * this counts every <ComponentName occurrence in JSX — giving a total
 * usage count per component type.
 *
 * Returns an object:
 * {
 *   total: number,                       // total JSX component opens
 *   byComponent: { ComponentName: n },   // count per component name
 *   perFile: [{ path, total, byComponent }]
 * }
 */
export function extractComponentUsageCounts(files) {
  const globalByComponent = {};
  let globalTotal = 0;
  const perFile = [];

  for (const file of files) {
    if (!isJsxFile(file.path)) continue;

    const fileByComponent = {};
    let fileTotal = 0;

    // Match every JSX opening tag: <ComponentName or <ComponentName.Sub
    // Only capture PascalCase names (components) and lowercase HTML tags
    // we care about (skip plain div/span/etc unless explicitly wanted).
    //
    // Two guards keep TypeScript generics out of the count:
    //  - the `<` must not be preceded by an identifier character, which
    //    excludes `useState<FilterState>`, `Promise<Response>`, etc.
    //  - the name must be followed by whitespace, `/`, or `>`, which
    //    excludes generic parameter lists like `<T,>(x) => ...`.
    const tagRegex = /(?<![A-Za-z0-9_$])<([A-Z][A-Za-z0-9.]*)(?=[\s/>])/g;
    let m;

    while ((m = tagRegex.exec(file.content)) !== null) {
      const name = m[1];
      fileByComponent[name] = (fileByComponent[name] || 0) + 1;
      globalByComponent[name] = (globalByComponent[name] || 0) + 1;
      fileTotal++;
      globalTotal++;
    }

    if (fileTotal > 0) {
      perFile.push({ path: file.path, total: fileTotal, byComponent: fileByComponent });
    }
  }

  return {
    total: globalTotal,
    byComponent: globalByComponent,
    perFile,
  };
}
