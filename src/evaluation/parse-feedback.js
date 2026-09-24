import { MAX_PARSE_BYTES } from "./parse-files.js";

const VALID_CATEGORIES = ["documentation", "api", "components", "theming", "icons", "dx", "other"];

/**
 * Parse ---FEEDBACK--- / ---END FEEDBACK--- blocks from the agent output.
 * Returns an array of { category, text } objects.
 *
 * Also attempts fallback parsing if the structured block is missing but
 * feedback-like content exists in the response.
 */
export function parseFeedback(text) {
  if (typeof text !== "string") return [];
  // Untrusted, and run over the whole conversation each time. Cap the text
  // first so a very large or deliberately awkward response cannot slow the
  // run down. Same limit and reasoning as parse-files.js.
  if (text.length > MAX_PARSE_BYTES) text = text.slice(0, MAX_PARSE_BYTES);

  const items = [];

  // Find the `---FEEDBACK--- … ---END FEEDBACK---` blocks by scanning for
  // the markers directly, which stays fast even when a closing marker is
  // missing.
  const OPEN = "---FEEDBACK---\n";
  const CLOSE = "---END FEEDBACK---";
  const lineRegex = /^-\s*\[(\w+)\]\s*(.+)$/gm;
  let cursor = 0;
  while (true) {
    const open = text.indexOf(OPEN, cursor);
    if (open === -1) break;
    const bodyStart = open + OPEN.length;
    const close = text.indexOf(CLOSE, bodyStart);
    if (close === -1) break;
    const blockContent = text.slice(bodyStart, close);
    lineRegex.lastIndex = 0;
    let lineMatch;
    while ((lineMatch = lineRegex.exec(blockContent)) !== null) {
      const rawCategory = lineMatch[1].toLowerCase();
      const category = VALID_CATEGORIES.includes(rawCategory) ? rawCategory : "other";
      const feedbackText = lineMatch[2].trim();
      if (feedbackText) {
        items.push({ category, text: feedbackText });
      }
    }
    cursor = close + CLOSE.length;
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
        if (boldPrefix.includes("doc") || feedbackText.toLowerCase().includes("documentation")) {
          category = "documentation";
        } else if (boldPrefix.includes("api") || feedbackText.toLowerCase().includes("api")) {
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
        } else if (boldPrefix.includes("icon") || feedbackText.toLowerCase().includes("icon")) {
          category = "icons";
        } else if (boldPrefix.includes("dx") || boldPrefix.includes("developer")) {
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
