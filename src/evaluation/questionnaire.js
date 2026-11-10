import { MAX_PARSE_BYTES } from "./parse-files.js";

/**
 * Likert ratings an agent gives the design system it just used for the task.
 *
 * Written by the agent as a `---RATINGS---` block straight after its
 * `---FEEDBACK---` block, in the same final answer — see `ratingsFormat` in
 * config/boilerplate.js. The ratings come from the same experience as the
 * feedback: the docs the agent read, the components it looked up and the app
 * it wrote. Each score must carry a reason; the reason is what the docs can
 * act on.
 */

/** The top of the rating scale. Scores run 1 to SCALE_MAX. */
export const SCALE_MAX = 10;

/** Scores at or below this are "low": the reasons the report lists first. */
export const LOW_SCORE_MAX = 4;

/**
 * The questions, in the order the block lists them. The one definition:
 * the prompt text (config/boilerplate.js), the parser below, the analysis
 * (reporting/aggregators.js) and both report tables all read from here, so a
 * question added here is asked, parsed, analysed and reported — and one that
 * is not added here cannot be asked and then silently dropped.
 *
 * `ask` takes the subject (the test's `ratingSubject`). `low` and `high`
 * label the two ends of the scale.
 */
export const QUESTION_DEFS = [
  {
    id: "sentiment",
    label: "Overall sentiment",
    ask: (s) => `How unsatisfied or satisfied are you with ${s}?`,
    low: "very unsatisfied",
    high: "very satisfied",
  },
  {
    id: "ease",
    label: "Ease of use",
    ask: (s) => `How hard or easy is it to use ${s}?`,
    low: "very hard",
    high: "very easy",
  },
  {
    id: "speed",
    label: "Speed of building",
    ask: (s) => `How much slower or faster does ${s} make building interfaces?`,
    low: "much slower",
    high: "much faster",
  },
  {
    id: "understanding",
    label: "Ease of understanding",
    ask: (s) => `How hard or easy is it to understand how to use ${s}?`,
    low: "very hard",
    high: "very easy",
  },
  // Added 2026-09-25. Asks about the breadth of what the system covers, which
  // none of the other four do: an agent can find a system easy and fast to use
  // and still have had to build half the interface itself.
  {
    id: "coverage",
    label: "Use-case coverage",
    ask: (s) =>
      `How few or many use cases does ${s} support with components, patterns, or documentation?`,
    low: "very few",
    high: "very many",
  },
];

/** Question ids, in order. */
export const QUESTIONS = QUESTION_DEFS.map((q) => q.id);

/**
 * Questions answered in words, asked after the scores in the same block.
 *
 * Sentiment came back 7 in 32 of 40 iterations on 2026-10-14, across three
 * design systems, while the reasons named different problems for each — the
 * number had stopped carrying the difference. Asking what would move it up
 * one point turns "good, but…" into the specific change that would matter,
 * which is what the docs and the design system can act on.
 *
 * A missing answer never makes the scores unusable.
 */
export const TEXT_QUESTION_DEFS = [
  {
    id: "one_point_higher",
    label: "What would raise sentiment by one point",
    ask: (s) =>
      `What would you need to see in ${s} for your overall sentiment score to be one point higher? Name the specific changes to its components, API or documentation.`,
  },
];

/** Text question ids, in order. */
export const TEXT_QUESTIONS = TEXT_QUESTION_DEFS.map((q) => q.id);

// The shortest reason that can explain anything. Below it, an answer like
// "Good." or "N/A" is treated as no reason at all.
const MIN_REASON_WORDS = 4;

/**
 * Parse the `---RATINGS--- … ---END RATINGS---` block.
 *
 * Each line reads `<question>: <1-10> | <reason>`. A missing block, a score
 * outside 1–10 or a missing reason makes the ratings unusable, and the error
 * says which; nothing is guessed.
 *
 * @param {string} text - the agent's full answer
 * Text questions (`<question>: <answer>`) are read into `answers`; a missing
 * one is not an error.
 *
 * @returns {{scores: Record<string, number|null>, reasons: Record<string, string>,
 *   answers: Record<string, string>, valid: boolean, error?: string}}
 */
export function parseRatings(text) {
  const scores = Object.fromEntries(QUESTIONS.map((id) => [id, null]));
  const reasons = {};
  const answers = {};
  let body = typeof text === "string" ? text : "";
  if (body.length > MAX_PARSE_BYTES) body = body.slice(0, MAX_PARSE_BYTES);

  // The last block wins: an agent that restates its ratings means the later ones.
  const OPEN = "---RATINGS---";
  const CLOSE = "---END RATINGS---";
  const open = body.lastIndexOf(OPEN);
  const close = open === -1 ? -1 : body.indexOf(CLOSE, open);
  if (open === -1 || close === -1) {
    return { scores, reasons, answers, valid: false, error: "no ---RATINGS--- block" };
  }

  for (const line of body.slice(open + OPEN.length, close).split("\n")) {
    const t = /^\s*[-*]?\s*(\w+)\s*:\s*(.+?)\s*$/.exec(line);
    if (t && TEXT_QUESTIONS.includes(t[1].toLowerCase())) {
      answers[t[1].toLowerCase()] = t[2].replace(/^\*+|\*+$/g, "").trim();
      continue;
    }
    const m = /^\s*[-*]?\s*(\w+)\s*:\s*\**\s*(\d+)\s*\**\s*(?:\/\s*10)?\s*(?:[|–—-]\s*(.*))?$/.exec(
      line,
    );
    if (!m) continue;
    const id = m[1].toLowerCase();
    if (!QUESTIONS.includes(id)) continue;
    const n = Number(m[2]);
    if (n >= 1 && n <= SCALE_MAX) scores[id] = n;
    if (m[3]?.trim()) reasons[id] = m[3].trim();
  }

  const missing = QUESTIONS.filter((id) => scores[id] === null);
  const unexplained = QUESTIONS.filter(
    (id) => (reasons[id] ?? "").split(/\s+/).filter(Boolean).length < MIN_REASON_WORDS,
  );
  const problems = [
    ...(missing.length ? [`missing or out-of-range score: ${missing.join(", ")}`] : []),
    ...(unexplained.length ? [`missing reason: ${unexplained.join(", ")}`] : []),
  ];
  return problems.length
    ? { scores, reasons, answers, valid: false, error: problems.join("; ") }
    : { scores, reasons, answers, valid: true };
}
