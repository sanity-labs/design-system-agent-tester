import { describe, expect, it } from "vitest";
import { composeSystem, ratingsFormat } from "../config/boilerplate.js";
import { analyzeRatings } from "../reporting/aggregators.js";
import { parseRatings } from "./questionnaire.js";

// Agents rate the design system in a ---RATINGS--- block written right after
// their ---FEEDBACK--- block, from their experience doing the task.

const block = (lines) =>
  `---FILE: a.tsx---\nx\n---END FILE---\n---FEEDBACK---\n- [dx] ok\n---END FEEDBACK---\n---RATINGS---\n${lines}\n---END RATINGS---\n`;

describe("the RATINGS prompt", () => {
  it("names the subject, every question with anchors, and requires a reason", () => {
    const text = ratingsFormat("Sanity UI 5");
    expect(text).toContain("based on your experience using it for this task");
    expect(text).toContain(
      "How hard or easy is it to use Sanity UI 5? (1: very hard — 10: very easy)",
    );
    expect(text).toContain("How much slower or faster does Sanity UI 5 make building interfaces?");
    expect(text).toContain(
      "How few or many use cases does Sanity UI 5 support with components, patterns, or documentation? (1: very few — 10: very many)",
    );
    expect(text).toMatch(/The reason is required/);
  });

  it("is part of every system prompt, after the feedback format", () => {
    const sys = composeSystem("Intro", { ratingSubject: "Sanity UI 3" });
    expect(sys.indexOf("---RATINGS---")).toBeGreaterThan(sys.indexOf("---FEEDBACK---"));
    expect(sys).toContain("rate Sanity UI 3");
    expect(composeSystem("Intro")).toContain("rate the design system you used");
  });
});

describe("parseRatings", () => {
  it("reads each score and its reason", () => {
    const r = parseRatings(
      block(
        [
          "sentiment: 4 | The components were consistent and well named.",
          "ease: 3 | Density and gap took several lookups to get right.",
          "speed: 4 | Chunks gave me a working layout quickly.",
          "understanding: 2 | The split between v3 and v5 packages was confusing.",
          "coverage: 6 | Most of the brief was covered, but there was no Table.",
        ].join("\n"),
      ),
    );
    expect(r.valid).toBe(true);
    expect(r.scores).toEqual({ sentiment: 4, ease: 3, speed: 4, understanding: 2, coverage: 6 });
    expect(r.reasons.understanding).toBe("The split between v3 and v5 packages was confusing.");
  });

  it("tolerates bullets, bold and /5", () => {
    const r = parseRatings(
      block(
        "- sentiment: **8**/10 — Mostly consistent APIs across components.\n- ease: 4 | Props were easy to guess here.\n- speed: 5 | Chunks sped things up a lot.\n- understanding: 3 | Docs were fine but long.\n- coverage: **7**/10 | Nearly every section had a component.",
      ),
    );
    expect(r.valid).toBe(true);
    expect(r.scores.sentiment).toBe(8);
  });

  it("requires a score and a reason on every line", () => {
    const r = parseRatings(
      block(
        "sentiment: 4 | Good.\nease: 11 | Eleven is off the scale entirely.\nspeed: 4\nunderstanding: 2 | The package split was confusing.\ncoverage: 5 | About half the brief needed custom layout.",
      ),
    );
    expect(r.valid).toBe(false);
    expect(r.error).toBe("missing or out-of-range score: ease; missing reason: sentiment, speed");
  });

  it("rejects a block that leaves out a question, and names it", () => {
    const r = parseRatings(
      block(
        [
          "sentiment: 7 | The components were consistent and well named.",
          "ease: 6 | Density and gap took a couple of lookups.",
          "speed: 7 | Chunks gave me a working layout quickly.",
          "understanding: 6 | The getting-started guide covered setup well.",
        ].join("\n"),
      ),
    );
    expect(r.valid).toBe(false);
    expect(r.error).toBe("missing or out-of-range score: coverage; missing reason: coverage");
  });

  it("reports a missing block", () => {
    expect(parseRatings("---FEEDBACK---\n- [dx] x\n---END FEEDBACK---")).toMatchObject({
      valid: false,
      error: "no ---RATINGS--- block",
    });
  });
});

describe("analyzeRatings", () => {
  const it2 = (score, exitStage, iteration = 1) => ({
    iteration,
    exitStage,
    ratings: {
      subject: "Sanity UI 5",
      sentiment: score,
      ease: score,
      speed: score,
      understanding: score,
      coverage: score,
      reasons: { ease: "A reason with enough words." },
    },
  });

  it("reports median, spread and the split by build outcome", () => {
    const r = analyzeRatings([
      it2(4, "clean"),
      it2(5, "clean"),
      it2(2, "build"),
      { exitStage: "clean", ratings: null },
    ]);
    expect(r.measured).toBe(3);
    expect(r.questions.ease).toMatchObject({
      n: 3,
      median: 4,
      distribution: [0, 1, 0, 1, 1, 0, 0, 0, 0, 0],
      medianWhenBuilt: 4.5,
      medianWhenNotBuilt: 2,
    });
  });

  it("collects the reasons behind scores of 4 or below", () => {
    const r = analyzeRatings([it2(4, "build", 7), it2(5, "clean", 8)]);
    expect(r.questions.ease.lowReasons).toEqual([
      { iteration: 7, score: 4, reason: "A reason with enough words." },
    ]);
    expect(r.questions.speed.lowReasons).toEqual([]);
  });
});

// "What would raise sentiment by one point" — a text answer after the scores
// (2026-10-14: sentiment was 7 in 32 of 40 iterations across three systems).
describe("one_point_higher", () => {
  const SCORES = [
    "sentiment: 7 | The components rendered well, but several props had to be guessed.",
    "ease: 7 | Composing layouts was quick once the props were clear.",
    "speed: 7 | The chunks gave a working shell almost immediately.",
    "understanding: 6 | The guidance is thorough but spread across long lookups.",
    "coverage: 6 | Tabs, Toast and Menu are missing, so I built substitutes.",
  ];

  it("is asked after the scores, in the same block", () => {
    const text = ratingsFormat("Sanity UI 5");
    expect(text.indexOf("one_point_higher: <answer>")).toBeGreaterThan(
      text.indexOf("coverage: <1-10>"),
    );
    expect(text).toContain(
      "What would you need to see in Sanity UI 5 for your overall sentiment score to be one point higher?",
    );
  });

  it("reads the answer", () => {
    const r = parseRatings(
      block(
        [...SCORES, "one_point_higher: Ship Tabs and Toast, and list every prop's values."].join(
          "\n",
        ),
      ),
    );
    expect(r.valid).toBe(true);
    expect(r.answers.one_point_higher).toBe("Ship Tabs and Toast, and list every prop's values.");
  });

  it("keeps the scores usable when the answer is missing", () => {
    const r = parseRatings(block(SCORES.join("\n")));
    expect(r.valid).toBe(true);
    expect(r.answers).toEqual({});
  });

  it("does not mistake the answer for a score, even when it holds a number", () => {
    const r = parseRatings(
      block([...SCORES, "one_point_higher: 8 | Shipping TextArea would get it to 8."].join("\n")),
    );
    expect(r.scores.sentiment).toBe(7);
    expect(r.answers.one_point_higher).toBe("8 | Shipping TextArea would get it to 8.");
  });

  it("is listed in the analysis beside each agent's sentiment", () => {
    const a = analyzeRatings([
      { iteration: 1, ratings: { sentiment: 7, answers: { one_point_higher: "Ship Tabs." } } },
      { iteration: 2, ratings: { sentiment: 6, answers: {} } },
    ]);
    expect(a.answers.one_point_higher).toEqual([
      { iteration: 1, sentiment: 7, text: "Ship Tabs." },
    ]);
  });
});
