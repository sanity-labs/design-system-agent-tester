/**
 * Brief generator.
 *
 * Calls the Anthropic API to produce a varied, PRD-style interface brief.
 * The brief is then prepended to every user-prompt variant in a run so
 * variants are directly comparable.
 *
 * All content (system prompt, domain list, user message template, static
 * fallback) lives in the root config file under `briefGenerator`. This
 * module is purely the API-calling glue.
 */

import Anthropic from "@anthropic-ai/sdk";
import config from "./load.js";

function pickDomain() {
  const domains = config.briefGenerator?.domains ?? [];
  if (domains.length === 0) {
    throw new Error(
      "briefGenerator.domains is empty in agent-tester.config.js. " +
        "Add at least one domain string.",
    );
  }
  return domains[Math.floor(Math.random() * domains.length)];
}

/**
 * Call the Anthropic API to generate a fresh interface brief.
 *
 * @param {object} [opts]
 * @param {string} [opts.model] - Claude model to use for generation.
 * @returns {Promise<string>} The generated brief text.
 */
export async function generateAppPrompt({ model = "claude-sonnet-4-6" } = {}) {
  const bg = config.briefGenerator;
  if (!bg || typeof bg !== "object") {
    throw new Error("briefGenerator block is missing from agent-tester.config.js.");
  }
  if (typeof bg.systemPrompt !== "string") {
    throw new Error("briefGenerator.systemPrompt must be a string.");
  }
  if (typeof bg.buildUserMessage !== "function") {
    throw new Error("briefGenerator.buildUserMessage must be a function.");
  }

  const client = new Anthropic();
  const domain = pickDomain();
  const userMessage = bg.buildUserMessage({ domain });

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: bg.systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!text) {
    throw new Error("Brief generator returned an empty response");
  }

  return text;
}

/**
 * Static fallback brief used when --agent-prompt is false (default).
 * Sourced from the config so users can override without touching code.
 */
export const STATIC_PROMPT = config.briefGenerator?.staticBrief ?? "";
