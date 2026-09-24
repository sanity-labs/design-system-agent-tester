/**
 * App-mode brief generator (`--mode app`, the default).
 *
 * Produces the PRD-style interface brief fed to every test in a run, so
 * all tests build the same spec. `briefs/component.js` is the same shape
 * scoped to a single component.
 *
 *   - `staticBrief`         used when `--agent-prompt` is OFF (default).
 *   - `systemPrompt` +
 *     `domains` +
 *     `buildUserMessage`    used when `--agent-prompt` is ON to call the
 *                           Anthropic API and generate a fresh brief.
 */

export default {
  staticBrief: "Create an web app interface that uses a wide range of UI components.",

  systemPrompt: `You are a senior product manager writing a one-page interface brief for a frontend engineering team.

Rules you must follow:
- The deliverable is a FRONTEND-ONLY prototype. The team must NOT configure any backend, datasets, schemas, or Studio plugins. All data must be hardcoded or mocked directly in the React component.
- The brief specifies a domain AND an interface archetype (dashboard, kanban, calendar, map, wizard, chat, feed, marketplace grid, comparison, configurator, monitor, settings hub, reader, gallery, data table, moderation queue, etc.). Build the page around the archetype's natural shape — do NOT default to a sidebar + table + inspector layout unless that's genuinely the right shape for this brief.
- Different archetypes call for different primary regions: a dashboard leads with KPI tiles and charts; a kanban leads with columns of cards; a calendar leads with a date grid; a map view leads with a map plus a side list; a wizard leads with a stepper and a single focused panel; a chat leads with a thread + composer; a configurator leads with live preview + controls; a monitor leads with status cards that refresh. Pick the regions that fit.
- Be concrete: name the data shown, the controls available, the regions/sections of the screen, and the cross-cutting interactions the user performs (filter, sort, drag, multi-select, modal, hover, expand, etc.).
- Keep the brief between 200 and 350 words.
- Use clear numbered sections with short headings.
- Do NOT add requirements for visual style, colors, or branding.
- Do NOT mention React, Vite, TypeScript, or any specific technology.
- End with a short "Out of scope" list that explicitly calls out: no backend setup, no authentication, no real API calls, no unit tests.

Output ONLY the brief text. No preamble, no meta-commentary, no markdown code fences.`,

  // Each entry pairs a domain with a distinct interface archetype so the
  // generated briefs span different layouts and interaction patterns —
  // not just sidebar-list-detail CMS panels. Keep the list balanced
  // across archetypes; if you add a duplicate archetype, also add a
  // counterweight.
  domains: [
    "an analytics dashboard with KPI tiles, trend charts, and a leaderboard for a regional newspaper's editorial team tracking story performance",
    "a kanban board with draggable cards across status columns for an engineering team triaging incoming bug reports",
    "a calendar-based scheduling interface (week + day views) for a personal trainer booking client sessions",
    "a map-centric dispatcher view with a list of in-flight jobs alongside the map for a local delivery service routing drivers",
    "a chat-style customer support console — thread list + active conversation + composer — for a SaaS support agent handling tickets",
    "a multi-step wizard with a left stepper and a focused per-step panel for a self-employed user filing their annual taxes",
    "a marketplace browse grid with faceted filters in a rail and product cards in a responsive grid for shopping handmade jewelry",
    "a high-density data table with column sort, multi-select, inline filters, and bulk actions for an analyst exploring sales transactions",
    "a guided onboarding flow with progress, single-question screens, and a final summary for a new user setting up a banking app with KYC steps",
    "a real-time operations monitor — a wall of status cards with live counters and alert badges — for a small logistics fleet",
    "a side-by-side comparison view with a sticky attribute column and aligned spec rows for choosing between three electric vehicles",
    "a settings hub with grouped preference sections, toggles, and contextual help for configuring a smart-home automation system",
    "a feed-style activity timeline of mixed-type entries (workouts, meals, milestones) with quick-add and day separators for a fitness tracker",
    "a media-asset gallery browser with thumbnail grid, lightbox detail, and tag-based filtering for a photographer organizing client shoots",
    "an interactive configurator with a live preview pane and grouped controls (frame, drivetrain, finish) for designing a custom bicycle build",
    "a long-form reading layout with persistent table of contents, inline annotations, and sticky reading progress for a legal team reviewing a policy document",
    "a portfolio dashboard with holdings table, allocation chart, and a watchlist for a retail investor tracking their accounts",
    "a content moderation queue — pending items with quick approve/reject/escalate actions and a slide-over detail panel — for a community trust-and-safety reviewer",
  ],

  buildUserMessage: ({ domain }) =>
    `Write an interface brief for the following: ${domain}. ` +
    `The interface is a frontend-only prototype — all data must be hardcoded. ` +
    `Build the page around the archetype's natural shape — don't default to a sidebar + table + inspector unless it's genuinely the right fit. ` +
    `Make the brief concrete: name the regions, the data shown, the controls, and the interactions specific to this kind of interface.`,
};
