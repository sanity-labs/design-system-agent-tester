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
