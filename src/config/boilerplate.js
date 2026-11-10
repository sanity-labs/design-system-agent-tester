/**
 * Prompt text the harness itself needs, as opposed to anything a test
 * author wants to say.
 *
 * The harness reads the agent's output for `---FILE: …---` blocks, a
 * `---FEEDBACK---` section and a `---RATINGS---` section. Without instructions describing that format in
 * the system prompt, there is nothing for it to read.
 *
 * Keeping this here means a test author writes only what is specific to
 * their design system, and cannot accidentally leave out the parts that
 * make the run work at all.
 */

import { QUESTION_DEFS, SCALE_MAX, TEXT_QUESTION_DEFS } from "../evaluation/questionnaire.js";

export const OUTPUT_FORMAT = `Your task is to produce ALL the files needed for a complete, working project. Output each file using the following format:

---FILE: path/to/file---
(file contents here)
---END FILE---

CRITICAL: Do NOT wrap the file contents inside the FILE block in
markdown code fences (\`\`\`json, \`\`\`tsx, etc.). The contents
between FILE markers are written verbatim to disk. A fenced
\`package.json\` will fail \`npm install\` with EJSONPARSE; a fenced
\`.tsx\` file will fail to compile. Emit raw file contents only.`;

// Agents were reporting "I did not run the linter or a build, so the project
// is unverified" as friction — 40 of 772 feedback items on 2026-10-07, in every
// run — and some rated speed and sentiment down for it. The harness installs,
// builds and loads every project after the answer and sends the errors back to
// fix, in every arm, so not verifying is expected, not a design-system cost.
// Stated for every arm alike so it cannot skew one against another.
const VERIFIED_AFTER = `After you answer, the harness installs your project, builds it and loads it in a browser, and sends you any errors to fix. You are not expected to run a build, linter or dev server yourself, so do not report that as friction.`;

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
- General developer experience friction

${VERIFIED_AFTER}`;

/**
 * The ratings block: one 1–10 rating per question in QUESTION_DEFS, each with a
 * required reason, written straight after the feedback — by the agent that
 * just used the system for the task, from that experience.
 *
 * @param {string} subject - what to rate, e.g. "Sanity UI 5"
 */
export function ratingsFormat(subject = "the design system you used") {
  // Built from QUESTION_DEFS so the prompt, the parser and the report can't
  // disagree about which questions exist.
  const lines = [
    ...QUESTION_DEFS.map((q) => `${q.id}: <1-${SCALE_MAX}> | <reason>`),
    ...TEXT_QUESTION_DEFS.map((q) => `${q.id}: <answer>`),
  ].join("\n");
  const described = QUESTION_DEFS.map(
    (q) => `- ${q.id}: ${q.ask(subject)} (1: ${q.low} — ${SCALE_MAX}: ${q.high})`,
  ).join("\n");
  const answered = TEXT_QUESTION_DEFS.map((q) => `- ${q.id}: ${q.ask(subject)}`).join("\n");
  return `After the FEEDBACK block, you MUST rate ${subject} based on your experience using it for this task. Output your ratings in this exact format:

---RATINGS---
${lines}
---END RATINGS---

What each line rates, on a scale of 1 to ${SCALE_MAX}:
${described}

Then answer in words, in one to three sentences, on its own line:
${answered}

Every rated line needs both a whole-number score and a reason. The reason is required: explain what, specifically, in your work on this task made you choose that score, in one to three sentences. There are no right answers. Rate the design system, not whether you could check your own work: the project is built and checked after you answer.`;
}

export const BASE_RULES = `Rules:
- Output ALL files needed (package.json, index.html, config files, source files, etc.)
- Use relative paths from the project root
- Do not include explanations outside of file blocks (except the FEEDBACK and RATINGS blocks at the end)
- Do not include unit tests
- Make sure the project works with "npm install && npm run dev"
- The FEEDBACK block must appear after all FILE blocks, and the RATINGS block after the FEEDBACK block`;

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
export function composeSystem(testIntro, { lintAdvisory = "", ratingSubject = null } = {}) {
  const blocks = [
    testIntro.trim(),
    OUTPUT_FORMAT,
    FEEDBACK_FORMAT,
    ratingsFormat(ratingSubject ?? undefined),
    BASE_RULES,
  ];
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
