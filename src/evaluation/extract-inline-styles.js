import { isJsxFile } from "./parse-files.js";

/**
 * Extract inline style usage counts from source files, broken down by
 * the JSX component the style prop is applied to.
 *
 * Returns an object:
 * {
 *   total: number,                       // total style={{}} occurrences
 *   byComponent: { ComponentName: n },   // count per component name
 *   perFile: [{ path, total, byComponent }]
 * }
 */
export function extractInlineStyles(files) {
  const globalByComponent = {};
  const globalByProperty = {};
  let globalTotal = 0;
  const perFile = [];

  for (const file of files) {
    if (!isJsxFile(file.path)) continue;

    const fileByComponent = {};
    let fileTotal = 0;

    // Match JSX opening tags that have a style={{ prop.
    // We look for the tag name immediately after < and then check if
    // style={{ appears before the tag closes.
    //
    // Strategy: scan for every `style={{` occurrence and walk backwards
    // to find the nearest opening tag name.
    const content = file.content;
    const styleRegex = /style\s*=\s*\{\s*\{/g;
    let m;

    while ((m = styleRegex.exec(content)) !== null) {
      const before = content.slice(0, m.index);
      // Find the last < that opened a JSX tag before this style prop.
      // A JSX tag starts with < followed by an uppercase or lowercase letter.
      const tagMatch = before.match(/<([A-Za-z][A-Za-z0-9.]*)(?=[^<>]*$)/);
      const componentName = tagMatch ? tagMatch[1] : "unknown";

      fileByComponent[componentName] = (fileByComponent[componentName] || 0) + 1;
      globalByComponent[componentName] = (globalByComponent[componentName] || 0) + 1;
      fileTotal++;
      globalTotal++;

      // Extract CSS property names from the style object.
      // Find the matching closing }} after style={{ and parse property names.
      const afterStyle = content.slice(m.index + m[0].length);
      const closingMatch = afterStyle.match(/^([\s\S]*?)\}\s*\}/);
      if (closingMatch) {
        const styleBody = closingMatch[1];
        // Match camelCase or quoted property names before a colon
        // e.g. "fontSize:", "'background-color':", "width:"
        const propRegex = /(?:^|[,\n])\s*(?:'([^']+)'|"([^"]+)"|([a-zA-Z_$][a-zA-Z0-9_$]*))\s*:/g;
        let pm;
        while ((pm = propRegex.exec(styleBody)) !== null) {
          const prop = pm[1] || pm[2] || pm[3];
          if (prop) {
            globalByProperty[prop] = (globalByProperty[prop] || 0) + 1;
          }
        }
      }
    }

    if (fileTotal > 0) {
      perFile.push({ path: file.path, total: fileTotal, byComponent: fileByComponent });
    }
  }

  return {
    total: globalTotal,
    byComponent: globalByComponent,
    byProperty: globalByProperty,
    perFile,
  };
}
