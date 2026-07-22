/**
 * Prompt boilerplate that is *required* by the engine, not the user.
 *
 * The harness parses the agent's output for `---FILE: …---` blocks and a
 * `---FEEDBACK---` section. If those instructions aren't present in the
 * system prompt, the harness can't process the result. Same with the fix
 * cycle: the agent has to know what format to use when re-emitting files.
 *
 * Rather than make every user paste these into their test prompts, the
 * engine appends them automatically:
 *
 *   final system prompt   = <test-specific intro> + OUTPUT + FEEDBACK + BASE
 *   final fix prompt      = FIX_PREAMBLE + FIX_RULES_BASE + <optional extras>
 *
 * Users only write the test-specific bits (import rules, package versions,
 * MCP guidance, etc.). The boilerplate stays out of their view.
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

// Shift-left lint advisory (P4). Injected into the generation system prompt
// ONLY for lint-enabled tests, so the agent authors to the design-system lint
// rules the FIRST time instead of tripping them and paying for the fix loop.
// These mirror the highest-frequency eslint-plugin-sanity-ui rules; keep in
// sync with the plugin. Prevention is cheaper than the repair budget and does
// not compete with it.
export const LINT_ADVISORY = `Design-system lint rules — author to these up front to avoid rework:
- Prefer props over \`style={{}}\`. Every layout/spacing/color value with a prop equivalent MUST use the prop: padding, margin, width, height, radius, overflow, tone, flexGrow/flexShrink/flexBasis. Inline \`style\` is only for values with NO prop path (transform, gradient, aspect-ratio, scrim/overlay color) and for raw SVG.
- Icons: pass the component to \`icon\`/\`iconStart\` (never \`symbol\`). Wrap raw @sanity/icons glyphs in \`<Icon>\` and size with \`size\`, color with \`tone\` — never inline \`fontSize\`/\`color\` on an icon.
- Never \`Box as="button"\`, and never put \`onClick\` on Box or Card. Use \`Button\`, or wrap a custom surface in \`PressArea\`.
- Card silently ignores layout/flex props. Put \`flexGrow\`/\`width\`/\`overflow\` on a wrapping \`Box\`; use Card \`density\` for padding.
- VStack/HStack accept only \`as\` and \`gap\`. Wrap in Box or Flex for anything else.
- Responsive arrays: use \`undefined\` to skip a breakpoint, never \`null\`.`;

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
 * Compose a full system prompt by appending the engine-required output,
 * feedback, and base-rules blocks to the test's intro.
 */
export function composeSystem(testIntro, { lintAdvisory = false } = {}) {
  const blocks = [testIntro.trim(), OUTPUT_FORMAT, FEEDBACK_FORMAT, BASE_RULES];
  // Shift-left: only lint-enabled tests get the advisory, so the A/B keeps
  // measuring linting's total contribution (prevention + gate) vs no lint.
  if (lintAdvisory) blocks.push(LINT_ADVISORY);
  return blocks.join("\n\n").trim();
}

/**
 * Compose a full fix-system prompt. The test can optionally provide
 * extra rules (e.g. "do not remove package X") that are appended after
 * the base rules.
 */
export function composeFix(extraRules = "") {
  const trimmed = extraRules.trim();
  const sections = trimmed
    ? [FIX_PREAMBLE, FIX_RULES_BASE, trimmed]
    : [FIX_PREAMBLE, FIX_RULES_BASE];
  return sections.join("\n\n").trim();
}
