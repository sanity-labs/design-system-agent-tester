import Anthropic from "@anthropic-ai/sdk";

/**
 * Generates a varied, PRD-style interface brief for a Sanity-powered
 * content management application.
 *
 * The brief is injected into both PROMPT-CONTROL.md and PROMPT-WITH-TRAINING.md
 * in place of the [ADD PROMPT HERE] placeholder before each test run.
 *
 * Scope constraint: the brief always specifies a frontend-only prototype —
 * no Sanity backend, datasets, schemas, or Studio plugins.
 */

const SYSTEM_PROMPT = `You are a senior product manager writing a one-page interface brief for a frontend engineering team.

Rules you must follow:
- The deliverable is a FRONTEND-ONLY prototype. The team must NOT configure any Sanity backend, datasets, schemas, or Studio plugins. All data must be hardcoded or mocked directly in the React component.
- The interface must resemble a real content management admin panel — navigation sidebar, content area, and optionally an inspector panel.
- Choose a specific, realistic domain each time. Vary it across: news/editorial, travel, e-commerce, legal, healthcare, HR, education, media/entertainment, documentation platform, or similar.
- Be concrete: name the content types, the columns in lists, the fields in detail views.
- Keep the brief between 200 and 350 words.
- Use clear numbered sections with short headings.
- Do NOT mention React, Vite, TypeScript, or any specific technology.
- Do NOT mention Sanity Studio, GROQ, CDN, or any Sanity-specific backend concept.
- End with a short "Out of scope" list that explicitly calls out: no Sanity backend setup, no authentication, no real API calls, no unit tests.

Output ONLY the brief text. No preamble, no meta-commentary, no markdown code fences.`;

// Domains rotated on each call to ensure variety across test runs.
const DOMAINS = [
  "a news and editorial platform for a regional media company",
  "a travel content platform for a tour operator",
  "an e-commerce product catalogue for a specialty retailer",
  "a legal document management interface for a law firm",
  "a healthcare patient information portal for a clinic network",
  "an HR onboarding portal for an enterprise company",
  "an education course catalogue for an online learning provider",
  "a media asset library for a film production company",
  "a developer documentation platform for a SaaS company",
  "an event management interface for a conference organiser",
  "a recipe and menu management tool for a restaurant group",
  "a real-estate listing management interface for a property agency",
];

function pickDomain() {
  return DOMAINS[Math.floor(Math.random() * DOMAINS.length)];
}

/**
 * Call the Anthropic API to generate a fresh interface brief.
 *
 * @param {object} [opts]
 * @param {string} [opts.model] - Claude model to use for generation
 * @returns {Promise<string>} The generated brief text
 */
export async function generateAppPrompt({ model = "claude-sonnet-4-20250514" } = {}) {
  const client = new Anthropic();
  const domain = pickDomain();

  const userMessage =
    `Write an interface brief for a content management admin panel built for ${domain}. ` +
    `The interface is a frontend-only prototype — all data must be hardcoded. ` +
    `Make the brief concrete and specific to the domain.`;

  const response = await client.messages.create({
    model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const text = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  if (!text) {
    throw new Error("Prompt generator returned an empty response");
  }

  return text;
}

/**
 * The static fallback prompt used when --agent-prompt is false (default).
 */
export const STATIC_PROMPT =
  "Create a simple interface that mimics Sanity Studio using Sanity UI.";
