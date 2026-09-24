/**
 * Prompt text the harness itself needs, as opposed to anything a test
 * author wants to say.
 *
 * The harness reads the agent's output for `---FILE: …---` blocks and a
 * `---FEEDBACK---` section. Without instructions describing that format in
 * the system prompt, there is nothing for it to read.
 *
 * Keeping this here means a test author writes only what is specific to
 * their design system, and cannot accidentally leave out the parts that
 * make the run work at all.
 */

export const OUTPUT_FORMAT = `Your task is to produce ALL the files needed for a complete, working project. Output each file using the following format:

---FILE: path/to/file---
(file contents here)
---END FILE---

CRITICAL: Do NOT wrap the file contents inside the FILE block in
markdown code fences (\`\`\`json, \`\`\`tsx, etc.). The contents
between FILE markers are written verbatim to disk. A fenced
\`package.json\` will fail \`npm install\` with EJSONPARSE; a fenced
\`.tsx\` file will fail to compile. Emit raw file contents only.`;

export const FEEDBACK_FORMAT = `After ALL file blocks, you MUST provide feedback on areas of friction you encountered when using the design system. Output your feedback in this exact format:

---FEEDBACK---
- [category] Your feedback item here
- [category] Another feedback item here
---END FEEDBACK---

Categories must be one of: [documentation], [api], [components], [theming], [icons], [dx], [other]

Each line must start with a dash and a category tag. Be specific and actionable. Cover things like:
- Missing or unclear documentation
- Components that were hard to use or understand
- Unexpected API behavior
- Missing components or features you expected to exist
- Theming or styling difficulties
- Icon naming inconsistencies
- General developer experience friction`;

export const BASE_RULES = `Rules:
- Output ALL files needed (package.json, index.html, config files, source files, etc.)
- Use relative paths from the project root
- Do not include explanations outside of file blocks (except the FEEDBACK block at the end)
- Do not include unit tests
- Make sure the project works with "npm install && npm run dev"
- The FEEDBACK block must appear after all FILE blocks`;

// A test's own lint rules, added to the generation prompt so the agent
// writes code that follows them the first time instead of tripping them and
// spending fix attempts. Preventing a problem is cheaper than repairing it.

export const FIX_PREAMBLE = `You are an expert frontend developer debugging a web application that fails to render.

You will be given:
1. The current project files
2. The errors that occurred when the app was loaded in a browser

Your task is to fix ALL the errors so the page renders correctly. Output ONLY the files that need to change, using this format:

---FILE: path/to/file---
(complete file contents here)
---END FILE---`;

export const FIX_RULES_BASE = `Rules:
- Output the COMPLETE contents of each file you change (not just the diff)
- Only output files that need to change
- Do not add explanations outside of file blocks
- Fix the root cause, not the symptoms
- If an import does not exist in a library, remove it or replace it with one that does exist
- Make sure the project works with "npm install && npm run dev"`;

/**
 * Build the full system prompt: the test's own intro, then the blocks the
 * harness needs.
 */
export function composeSystem(testIntro, { lintAdvisory = "" } = {}) {
  const blocks = [testIntro.trim(), OUTPUT_FORMAT, FEEDBACK_FORMAT, BASE_RULES];
  // Only tests that supply this text get it, so comparing a lint-enabled
  // test against a lint-free one measures everything linting contributes,
  // both the advice up front and the gate afterwards.
  const advisory = typeof lintAdvisory === "string" ? lintAdvisory.trim() : "";
  if (advisory) blocks.push(advisory);
  return blocks.join("\n\n").trim();
}

/**
 * Build the full fix prompt. A test can add its own rules, which go after
 * the standard ones.
 */
export function composeFix(extraRules = "") {
  const trimmed = extraRules.trim();
  const sections = trimmed
    ? [FIX_PREAMBLE, FIX_RULES_BASE, trimmed]
    : [FIX_PREAMBLE, FIX_RULES_BASE];
  return sections.join("\n\n").trim();
}
