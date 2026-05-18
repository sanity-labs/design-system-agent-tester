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
