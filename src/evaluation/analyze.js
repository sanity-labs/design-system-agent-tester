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

// Backwards-compatible aliases. These accept the same `packages` shape
// older callers passed in, but their behaviour is now defined by the
// generic `extractComponentImports` above.
export const extractDesignSystemComponents = extractComponentImports;
export const extractSanityUIComponents = extractComponentImports;

/**
 * Count actual JSX usage instances of each component across source files.
 * Unlike extractSanityUIComponents (which tracks unique imported names),
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
    // We count all capitalised names to cover both @sanity/ui and ui-poc.
    const tagRegex = /<([A-Z][A-Za-z0-9.]*)/g;
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

/**
 * Check if a file is a JSX/TSX source file (excludes CSS, JSON, HTML).
 */
function isJsxFile(filePath) {
  const ext = extname(filePath).toLowerCase();
  return [".js", ".jsx", ".ts", ".tsx"].includes(ext);
}

/**
 * Check if a file is a source file worth analyzing.
 */
export function isSourceFile(filePath) {
  const exts = [".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json"];
  return exts.includes(extname(filePath).toLowerCase());
}

const VALID_CATEGORIES = [
  "documentation",
  "api",
  "components",
  "theming",
  "icons",
  "dx",
  "other",
];

/**
 * Parse ---FEEDBACK--- / ---END FEEDBACK--- blocks from the agent output.
 * Returns an array of { category, text } objects.
 *
 * Also attempts fallback parsing if the structured block is missing but
 * feedback-like content exists in the response.
 */
export function parseFeedback(text) {
  const items = [];

  // Primary: parse the structured ---FEEDBACK--- block
  const blockRegex = /---FEEDBACK---\n([\s\S]*?)---END FEEDBACK---/g;
  let blockMatch;

  while ((blockMatch = blockRegex.exec(text)) !== null) {
    const blockContent = blockMatch[1];
    const lineRegex = /^-\s*\[(\w+)\]\s*(.+)$/gm;
    let lineMatch;

    while ((lineMatch = lineRegex.exec(blockContent)) !== null) {
      const rawCategory = lineMatch[1].toLowerCase();
      const category = VALID_CATEGORIES.includes(rawCategory)
        ? rawCategory
        : "other";
      const feedbackText = lineMatch[2].trim();
      if (feedbackText) {
        items.push({ category, text: feedbackText });
      }
    }
  }

  // Fallback: look for a "Feedback" or "Friction" section in markdown-style output
  if (items.length === 0) {
    const sectionRegex =
      /(?:^|\n)#+\s*(?:Feedback|Friction|Areas of Friction|Developer Experience|DX Feedback)[^\n]*\n([\s\S]*?)(?=\n#|\n---FILE:|\n---FEEDBACK---|$)/gi;
    let sectionMatch;

    while ((sectionMatch = sectionRegex.exec(text)) !== null) {
      const sectionContent = sectionMatch[1];
      // Parse bullet points from the section
      const bulletRegex = /^[-*]\s*(?:\*\*([^*]+)\*\*[:\s]*)?(.+)$/gm;
      let bulletMatch;

      while ((bulletMatch = bulletRegex.exec(sectionContent)) !== null) {
        const boldPrefix = (bulletMatch[1] || "").toLowerCase();
        const feedbackText = bulletMatch[2].trim();

        // Try to infer category from bold prefix or content
        let category = "other";
        if (
          boldPrefix.includes("doc") ||
          feedbackText.toLowerCase().includes("documentation")
        ) {
          category = "documentation";
        } else if (
          boldPrefix.includes("api") ||
          feedbackText.toLowerCase().includes("api")
        ) {
          category = "api";
        } else if (
          boldPrefix.includes("component") ||
          feedbackText.toLowerCase().includes("component")
        ) {
          category = "components";
        } else if (
          boldPrefix.includes("theme") ||
          boldPrefix.includes("style") ||
          feedbackText.toLowerCase().includes("theme") ||
          feedbackText.toLowerCase().includes("styling")
        ) {
          category = "theming";
        } else if (
          boldPrefix.includes("icon") ||
          feedbackText.toLowerCase().includes("icon")
        ) {
          category = "icons";
        } else if (
          boldPrefix.includes("dx") ||
          boldPrefix.includes("developer")
        ) {
          category = "dx";
        }

        if (feedbackText) {
          items.push({ category, text: feedbackText });
        }
      }
    }
  }

  return items;
}
