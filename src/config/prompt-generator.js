/**
 * Brief generator.
 *
 * Calls the Anthropic API to produce a varied brief, which is then prepended
 * to every user-prompt variant in a run so variants stay comparable.
 *
 * Two modes, selected by `--mode`:
 *
 *   - `app`       a whole interface. The original behaviour.
 *   - `component` one reusable component, its states, and a page that
 *                 demonstrates them.
 *
 * All content — system prompt, idea pool, user-message template, static
 * fallback — lives in the root config file. This module is the API-calling
 * glue plus the mode lookup.
 *
 * Config shape, new and old:
 *
 *   briefGenerators: { app: …, component: … }   preferred
 *   briefGenerator: …                           legacy, treated as `app`
 *
 * The legacy key still resolves so an existing config keeps working
 * untouched; it only ever supplied an app brief, so that is the only mode it
 * can answer for.
 */

import Anthropic from "@anthropic-ai/sdk";
import config from "./load.js";

/** The modes `--mode` accepts. */
export const MODES = ["app", "component"];

export const DEFAULT_MODE = "app";

/**
 * The generator block for a mode.
 *
 * Throws rather than falling back to `app`: a component-mode run that
 * silently generated an application brief would produce a whole run of
 * results filed under the wrong mode, which is worse than not starting.
 *
 * @param {string} [mode]
 * @returns {object} the generator block
 */
export function generatorFor(mode = DEFAULT_MODE) {
  if (!MODES.includes(mode)) {
    throw new Error(`Unknown mode "${mode}". Valid modes: ${MODES.join(", ")}.`);
  }
  const byMode = config.briefGenerators;
  const resolved = byMode?.[mode] ?? (mode === DEFAULT_MODE ? config.briefGenerator : undefined);
  if (!resolved || typeof resolved !== "object") {
    // Name the key the caller actually has to add. For `app` the legacy
    // single-generator key is still a valid place to put it; for any other
    // mode it is not, so pointing there would send the reader somewhere
    // that cannot hold the answer.
    const where = mode === DEFAULT_MODE && !byMode ? "briefGenerator" : `briefGenerators.${mode}`;
    throw new Error(
      `No brief generator for mode "${mode}". Add \`${where}\` to agent-tester.config.js ` +
        `(see briefs/${mode}.js for the shape).`,
    );
  }
  return resolved;
}

function pickIdea(generator, mode) {
  const ideas = generator.domains ?? [];
  if (ideas.length === 0) {
    throw new Error(
      `Brief generator for mode "${mode}" has an empty \`domains\` list in agent-tester.config.js. ` +
        "Add at least one entry.",
    );
  }
  return ideas[Math.floor(Math.random() * ideas.length)];
}

/**
 * Call the Anthropic API to generate a fresh brief for a mode.
 *
 * @param {object} [opts]
 * @param {string} [opts.model] - Claude model to use for generation.
 * @param {string} [opts.mode]  - "app" (default) or "component".
 * @returns {Promise<string>} The generated brief text.
 */
export async function generateBrief({ model = "claude-sonnet-4-6", mode = DEFAULT_MODE } = {}) {
  const bg = generatorFor(mode);
  if (typeof bg.systemPrompt !== "string") {
    throw new Error(`Brief generator for mode "${mode}": systemPrompt must be a string.`);
  }
  if (typeof bg.buildUserMessage !== "function") {
    throw new Error(`Brief generator for mode "${mode}": buildUserMessage must be a function.`);
  }

  const client = new Anthropic();
  const domain = pickIdea(bg, mode);
  const userMessage = bg.buildUserMessage({ domain, mode });

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
    throw new Error(`Brief generator returned an empty response for mode "${mode}"`);
  }

  return text;
}

/**
 * Back-compat alias. `generateAppPrompt()` predates modes and is always an
 * app brief; new callers should use `generateBrief({ mode })`.
 *
 * @param {object} [opts]
 * @returns {Promise<string>}
 */
export function generateAppPrompt(opts = {}) {
  return generateBrief({ ...opts, mode: DEFAULT_MODE });
}

/**
 * The static fallback brief for a mode, used when --agent-prompt is off.
 *
 * @param {string} [mode]
 * @returns {string}
 */
export function staticBriefFor(mode = DEFAULT_MODE) {
  return generatorFor(mode).staticBrief ?? "";
}

/**
 * Static fallback for app mode. Kept as a constant because it is read at
 * import time in existing callers and tests.
 */
export const STATIC_PROMPT = config.briefGenerators?.app?.staticBrief ?? config.briefGenerator?.staticBrief ?? "";
