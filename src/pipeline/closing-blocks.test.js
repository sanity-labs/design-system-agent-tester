import { describe, expect, it } from "vitest";
import { closingFollowUpText, missingClosingBlocks } from "./closing-blocks.js";

const FILES = "---FILE: src/App.tsx---\nexport default 1\n---END FILE---\n";
const FEEDBACK = "---FEEDBACK---\n- [api] Tabs is missing from the package.\n---END FEEDBACK---\n";
const RATINGS = [
  "---RATINGS---",
  "sentiment: 6 | The primitives are consistent and well documented.",
  "ease: 6 | Strict typed props were predictable once learned.",
  "speed: 7 | Chunks gave me working layouts quickly.",
  "understanding: 7 | The must and must-not rules were clear.",
  "coverage: 5 | Tabs, menus and toasts had to be hand-built.",
  "---END RATINGS---",
].join("\n");

describe("missingClosingBlocks", () => {
  it("finds nothing missing in a complete answer", () => {
    expect(missingClosingBlocks(FILES + FEEDBACK + RATINGS)).toEqual({
      feedback: false,
      ratings: false,
      any: false,
    });
  });

  it("flags both when the answer was cut off among the files", () => {
    expect(missingClosingBlocks(FILES + "<Text size={1}>")).toEqual({
      feedback: true,
      ratings: true,
      any: true,
    });
  });

  // The 2026-10-06 case: cut off mid-feedback, so the block never closed and
  // no item could be read.
  it("counts an unclosed feedback block as missing", () => {
    const cut = `${FILES}---FEEDBACK---\n- [components] There is no Tabs, Toast or TextArea. The v5 text input`;
    expect(missingClosingBlocks(cut).feedback).toBe(true);
  });

  it("flags only the ratings when the feedback made it", () => {
    expect(missingClosingBlocks(FILES + FEEDBACK)).toEqual({
      feedback: false,
      ratings: true,
      any: true,
    });
  });

  it("treats an unusable ratings block as missing", () => {
    const noReason = RATINGS.replace(
      "coverage: 5 | Tabs, menus and toasts had to be hand-built.",
      "coverage: 5",
    );
    expect(missingClosingBlocks(FILES + FEEDBACK + noReason).ratings).toBe(true);
  });

  // The follow-up's answer is appended to the same text, and the parsers read
  // the last block — so recovery is complete once it arrives.
  it("is satisfied once a follow-up supplies the blocks", () => {
    const cut = `${FILES}<Text`;
    expect(missingClosingBlocks(`${cut}\n${FEEDBACK}${RATINGS}`).any).toBe(false);
  });
});

describe("closingFollowUpText", () => {
  it("names the missing blocks and forbids re-emitting files", () => {
    const t = closingFollowUpText({ feedback: true, ratings: true });
    expect(t).toContain("---FEEDBACK--- and ---RATINGS--- blocks");
    expect(t).toMatch(/do not re-emit any file and do not call any tool/);
  });

  it("asks only for what is missing", () => {
    const t = closingFollowUpText({ feedback: false, ratings: true });
    expect(t).toContain("the ---RATINGS--- block");
    expect(t).not.toContain("FEEDBACK");
  });

  // Telling the agent its answer was cut off put the harness's output limit
  // into its ratings of the design system (2026-10-07).
  it("does not say why the blocks are missing", () => {
    const t = closingFollowUpText({ feedback: true, ratings: true });
    expect(t).not.toMatch(/cut off|output limit|truncat|ended without/i);
  });
});
