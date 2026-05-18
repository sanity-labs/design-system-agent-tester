---
name: ailf-tasks
description: >
  Author and draft a new ailf.task document in the Sanity AILF dataset from a light prompt. Use when the user wants to add, create, author, draft, or scaffold an AILF task, eval task, or promptfoo task for the Sanity AI Language Feedback/benchmark suite. Triggers on phrases like "add an ailf task", "new ailf task", "create an eval for a feature", "draft a task for a feature area", "add a benchmark for this topic", or any request to produce an ailf.task document. Handles canonical doc selection, assertion design, and writes a draft document to the `next` dataset on project 3do82whm.
version: 2026-05-05
category:
  - engineering
  - writing
tags:
  - ailf
  - evals
  - promptfoo
  - sanity-mcp
visibility: confidential
owner: Mark Michon
---

# Add AILF Task

Author and draft a new `ailf.task` document in Sanity from a light, user-style prompt. The skill converts a short brief — feature area, task intent, prompt, and success criteria — into a complete draft document with canonical docs selected and assertions designed.

## What this skill writes

A single `ailf.task` document (draft) in project `3do82whm`, dataset `next`. The user publishes it from Studio after reviewing.

## Requirements

The user needs the Sanity MCP server connected to project `3do82whm`, dataset `next`. If the `mcp__*__query_documents` tool targeting that project doesn't respond, stop and tell the user to connect the Sanity MCP server to that project/dataset before continuing.

## Input from the user

Ask for these four things in a single `AskUserQuestion` round (use multi-question mode). Keep it light — resist asking for more:

1. **Feature area** — pick from the `ailf.featureArea` list (query it live; see "Picking the feature area")
2. **Short task label** — 3–8 words, used to derive Task ID and the `description` field (e.g., "Nuxt blog integration", "Box styling props")
3. **Prompt text** — the prompt that will be sent to the evaluated model. See "Writing the prompt" below.
4. **Success criteria** — 3–7 bullets describing what a correct answer looks like. Plain language. Skill derives assertions from this.

If the user already provided any of these in their initial message, skip that question.

## Writing the prompt

The prompt must read like a real developer asking another developer for help — not like a spec doc. Enforce this actively:

- **Good:** "Create a blog site using Sanity and Nuxt. It should include things like posts, categories, and authors."
- **Bad:** A 400-word prompt with numbered requirements, import paths, and prop specifications.

If the user hands you a detailed, spec-style prompt, rewrite it to be shorter and more casual, then show them the rewrite and ask if they're happy with it. Tell them why: the point of the prompt is to see whether a model can infer the right approach from a realistic developer ask, not to pass a test by being handed the answer. Detailed requirements belong in assertions, not the prompt.

Keep prompts to 1–3 sentences unless the task is inherently a "review this code" or "compare these options" task, in which case include the code or options inline but keep the framing casual.

## Picking the feature area

Query the available areas live before asking the user:

```groq
*[_type == "ailf.featureArea"]{_id, description} | order(description asc)
```

Present the user with the list and let them pick one. If none fit cleanly, tell the user — do not invent a new area or leave the field blank. Creating a new feature area is out of scope for this skill; the user should add it in Studio first.

## Picking canonical docs

Canonical docs are references to `article` documents that represent the ground truth a correct answer should align with. Pick 1–3. More is not better — only include docs that directly support the task.

Do not ask the user to provide doc IDs. Find candidates yourself:

1. Derive 2–4 keyword queries from the task label and prompt (e.g., for "Nuxt blog integration" → "nuxt", "blog", "quickstart nuxt")
2. Query articles:
   ```groq
   *[_type == "article" && (title match $q || pt::text(body) match $q)][0...10]{_id, title, "path": slug.current, _updatedAt} | order(_updatedAt desc)
   ```
3. Present the top 3–6 candidates to the user via `AskUserQuestion` (multi-select). For each, show title + path.
4. For each selected doc, write a one-line `reason` explaining why it's canonical for this task. Keep it specific: "Nuxt quickstart — installing @nuxtjs/sanity module, configuring client, displaying content with useSanityQuery" is good. "Relevant documentation" is not.

If zero candidates look relevant, tell the user and ask if they want to (a) proceed without canonical docs (sets `docCoverage: false`) or (b) stop so they can add the right doc first.

Each `canonicalDocRef` entry uses `refType: "id"` with a `doc` reference. The content-release (`perspective`) variant exists in the schema but is rare — don't use it unless the user explicitly asks.

## Designing assertions

The default pattern is **two rubrics + literal checks**. This matches the strongest existing tasks (see the Nuxt/SvelteKit/React Router blog integrations).

### The two rubrics

Both are `llm-rubric` type. Each has a `template` and a `criteria` array of 4–7 plain-language strings.

**Rubric 1: `task-completion`** — *What should the answer do or include?*

Translate the user's success criteria directly into this rubric. Each criterion is a complete sentence describing an outcome or required element. Example criteria:

- "Sanity client configuration using createClient from @sanity/sveltekit"
- "GROQ queries for posts, categories, and authors"
- "TypeScript type definitions or typegen setup"

**Rubric 2: `code-correctness`** — *Is the implementation using the right patterns for this stack/API?*

Focus on implementation-quality signals, not feature completeness. Example criteria:

- "Imports createClient from @sanity/sveltekit (not @sanity/client)"
- "SvelteKit patterns — +page.server.ts load functions, +layout.server.ts"
- "Valid GROQ query syntax using defineQuery"

If the task is a decision/review task (not implementation), the code-correctness rubric can instead check reasoning quality (e.g., "The correction is practically implementable and syntactically valid").

### Literal checks

Add 3–6 cheap string-match assertions that catch obvious failures the rubrics might miss. Use these types:

- **`contains`** — a specific import or API the answer must include. Set `weight: 1`. E.g., value: `"@sanity/sveltekit"`.
- **`contains-any`** — when several variants are all correct. Value is a JSON array *string*. E.g., value: `"[\"groq\",\"GROQ\",\"*[\"]"`.
- **`not-contains`** — anti-patterns from adjacent stacks that indicate the model confused frameworks. No weight. E.g., value: `"next-sanity"` on a SvelteKit task.

Derive `not-contains` from the task's feature area: if the task is about framework X, exclude signatures of frameworks Y and Z. Common exclusions:

| This task is about | `not-contains` candidates |
| ---- | ---- |
| SvelteKit | `next-sanity`, `getServerSideProps`, `getStaticProps`, `react-router` |
| Next.js | `@sanity/sveltekit`, `+page.server`, `useSanityQuery` |
| Nuxt | `next-sanity`, `getServerSideProps`, `getStaticProps`, `@sanity/sveltekit` |
| React Router 7 | `next-sanity`, `getStaticProps`, `@sanity/sveltekit` |
| Sanity UI (ui package) | `@sanity/ui` imports for Box/Flex/Heading/Text, inline `style=` |

For non-framework tasks (single component, API decision, code review), skip `not-contains` unless there's an obvious confounding pattern.

### Confirm with the user before writing

Before calling `create_documents_from_json`, show the user the proposed assertions grouped by type, and ask them to approve or edit. This is where most mistakes hide — the rubrics and literals have to match the user's mental model of "correct" for this task.

## Default field values

Set these unless the user says otherwise:

- `status`: `"active"`
- `ownership`: `"studio"`
- `docCoverage`: `true` when canonical docs are selected; `false` otherwise
- `baseline`: `{ enabled: true, rubric: "full" }`
- `execution`: leave unset
- `tags`: leave unset unless the user provides them or the task involves an aliased term (e.g., `["react-router", "remix"]`)

## Task ID rules

- Slug format: lowercase, words separated by hyphens. Derive from the task label.
- Must be unique. Before writing, query:
  ```groq
  count(*[_type == "ailf.task" && id.current == $id])
  ```
  If the count is non-zero, ask the user for a different ID or suffix the topic (e.g., `nuxt-blog-integration-v2`).
- Do not include `(gold)` or `(baseline)` in the ID or `description`.

## Writing the document

Use `mcp__*__create_documents_from_json` with a single document. Fields in the correct shape:

```json
{
  "_type": "ailf.task",
  "_id": "drafts.<slug-or-uuid>",
  "id": { "_type": "slug", "current": "<task-id>" },
  "description": "<human-readable label>",
  "status": "active",
  "ownership": "studio",
  "taskPrompt": "<prompt text>",
  "featureArea": { "_type": "reference", "_ref": "<featureArea._id>" },
  "tags": ["<optional>"],
  "canonicalDocs": [
    {
      "_type": "canonicalDocRef",
      "_key": "<short-random>",
      "refType": "id",
      "doc": { "_type": "reference", "_ref": "<article._id>" },
      "reason": "<one-line justification>"
    }
  ],
  "docCoverage": true,
  "assert": [
    {
      "_type": "assertion",
      "_key": "<short-random>",
      "type": "llm-rubric",
      "template": "task-completion",
      "criteria": ["...", "..."]
    },
    {
      "_type": "assertion",
      "_key": "<short-random>",
      "type": "llm-rubric",
      "template": "code-correctness",
      "criteria": ["...", "..."]
    },
    {
      "_type": "assertion",
      "_key": "<short-random>",
      "type": "contains",
      "value": "<string>",
      "weight": 1
    },
    {
      "_type": "assertion",
      "_key": "<short-random>",
      "type": "not-contains",
      "value": "<string>"
    }
  ],
  "baseline": { "enabled": true, "rubric": "full" }
}
```

Notes:

- The draft ID convention in Sanity is `drafts.<id>`. Use a fresh UUID for the base ID.
- Every array item that's an object needs a unique `_key` (any short random string).
- The `assert` array needs at least one entry (schema validation). The default pattern gives ~5–10.
- Do not write the `origin` field — it's read-only and only set by the repo mirror sync process.
- `contains-any` / `contains-all` / `icontains-any` `value` must be a **JSON-encoded string** of an array, not a native array.

## Verification step

After writing, confirm the draft exists and report its Studio URL:

1. Query `*[_id == "drafts.<id>"][0]{_id, id, description, featureArea->{_id, description}, canonicalDocs[]{reason, doc->{title}}, "assertCount": count(assert)}`
2. Tell the user: draft ID, feature area, number of canonical docs, number of assertions, and the Studio URL:
   `https://sanity.io/manage/project/3do82whm` (for the manage link) or the workspace Studio URL if the user has shared it.
3. Remind them to review and publish from Studio.

## Workflow summary

1. Confirm Sanity MCP is connected to `3do82whm` / `next`. Abort with clear message if not.
2. Gather the four inputs in one `AskUserQuestion` round (skip questions already answered).
3. Rewrite the prompt to user-style if it's too spec-like; get approval.
4. Query feature areas; user picks one.
5. Query canonical doc candidates from article keyword search; user picks 1–3; write reasons.
6. Design the two rubrics from the success criteria.
7. Propose 3–6 literal assertions (incl. `not-contains` where relevant).
8. Show the full draft shape to the user for approval.
9. Write the draft via `create_documents_from_json` with `_id: "drafts.<uuid>"`.
10. Verify and report back with the Studio link.

