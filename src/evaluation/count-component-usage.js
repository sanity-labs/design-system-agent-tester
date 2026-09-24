import { isJsxFile } from "./parse-files.js";

/**
 * Count how many times each component is used across the source files.
 *
 * `extractComponentImports` lists which components were imported;
 * this counts every place one is actually written in JSX.
 *
 * Returns { total, byComponent, perFile }.
 */
export function extractComponentUsageCounts(files) {
  const globalByComponent = {};
  let globalTotal = 0;
  const perFile = [];

  for (const file of files) {
    if (!isJsxFile(file.path)) continue;

    const fileByComponent = {};
    let fileTotal = 0;

    // Match every JSX opening tag, including compound names like
    // `<Menu.Item`. Only capitalised names count as components.
    //
    // Two guards keep TypeScript generics out of the count:
    //  - the `<` must not follow an identifier character, which rules out
    //    `useState<Filter>` and `Promise<Response>`
    //  - the name must be followed by whitespace, `/` or `>`, which rules out
    //    parameter lists like `<T,>(x) => ...`
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
