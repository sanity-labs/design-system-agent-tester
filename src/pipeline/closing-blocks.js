/**
 * Recover the FEEDBACK and RATINGS blocks when an answer ends without them.
 *
 * Both blocks come last in the agent's answer, after every file. So when an
 * answer is cut off by the output limit, they are what gets lost — and the
 * answers that run longest are the ones where the agent struggled most. On
 * 2026-10-06, 3 of 20 ui5 answers hit the 32k cap before their ratings; one
 * stopped mid-sentence in its feedback ("…The v5 text input"). Losing exactly
 * those answers biases the ratings upward.
 *
 * The fix asks once more, in the same conversation, for only what is missing.
 * The agent still has its whole experience of the task in context, so the
 * ratings come from the same place they would have. Raising the output cap
 * (GENERATION_MAX_TOKENS in runner-api.js, 64k since 2026-10-07) makes this
 * rarer but cannot rule it out, so both are in place.
 *
 * Files are already saved at this point, so the follow-up forbids re-emitting
 * them: a model asked to "finish its answer" will otherwise start over.
 */

import { parseFeedback } from "../evaluation/parse-feedback.js";
import { parseRatings } from "../evaluation/questionnaire.js";

/** At most one follow-up per generation. */
export const MAX_CLOSING_FOLLOW_UPS = 1;

/**
 * Which closing blocks the answer is missing.
 *
 * Feedback counts as missing when no feedback item can be read. That includes
 * a block cut off before its closing marker, which yields nothing — the
 * 2026-10-06 answer that stopped mid-feedback had an opening marker and no
 * readable items. Ratings are missing when there is no usable block — absent,
 * or present but with a missing score or reason — because an unusable block is
 * dropped from the report just the same.
 *
 * @param {string} text - the agent's whole answer so far
 * @returns {{feedback: boolean, ratings: boolean, any: boolean}}
 */
export function missingClosingBlocks(text) {
  const body = typeof text === "string" ? text : "";
  const feedback = parseFeedback(body).length === 0;
  const ratings = !parseRatings(body).valid;
  return { feedback, ratings, any: feedback || ratings };
}

/**
 * The follow-up message. Names what is missing and keeps the agent from
 * re-sending files.
 *
 * It deliberately says nothing about why the blocks are missing. On
 * 2026-10-07 it opened with "Your answer was cut off by the output limit",
 * and the agents rated what they were told: "the truncated output left me
 * frustrated", "the output truncation left the project unbuildable". Every
 * one of those projects built, because the repair loop finished them, but
 * the agent cannot know that. The 8 follow-up ratings averaged ~5.8
 * sentiment against 7 for the 2 that needed none. The cut-off is the
 * harness's limit, not the design system's, so it must not reach the ratings.
 *
 * @param {{feedback: boolean, ratings: boolean}} missing
 * @returns {string}
 */
export function closingFollowUpText(missing) {
  const blocks = [missing.feedback && "---FEEDBACK---", missing.ratings && "---RATINGS---"].filter(
    Boolean,
  );
  const what = blocks.join(" and ");
  const plural = blocks.length > 1 ? "blocks" : "block";
  return (
    `Now write the ${what} ${plural}, in the exact format given in the system prompt, based on your work on this task. ` +
    "Your project files are already saved, so do not re-emit any file and do not call any tool. " +
    `Reply with only the ${what} ${plural}.`
  );
}
