# Assertion patterns

Worked examples for common task shapes. Use these to calibrate the rubric criteria and literal checks for a new task. Patterns are drawn from existing tasks in the dataset; some older mirror-origin tasks use a different field shape (`assertions`, `promptText`, etc.) — ignore that, the current schema is `assert` / `taskPrompt`.

## Pattern 1 — Framework integration (implementation)

**Shape:** "Build X using Sanity and `<framework>`."

**Rubrics:**

- `task-completion` — 4–6 criteria listing the user-visible features and configuration that should be present. Keep each criterion outcome-oriented, not implementation-oriented.
- `code-correctness` — 3–5 criteria listing framework-specific patterns a correct implementation would use.

**Literal checks (typically 5–8):**

- `contains` on the framework-specific Sanity package name (e.g., `@sanity/sveltekit`, `@nuxtjs/sanity`)
- `contains-any` on GROQ variants: value `"[\"groq\",\"GROQ\",\"*[\"]"`
- `contains` on one or two framework hook/API names (e.g., `useSanityQuery`, `defineQuery`)
- `contains-any` on routing patterns (e.g., `"[\"page.server\",\"+page.server\"]"`)
- `contains-any` on PortableText renderers if relevant
- `not-contains` on 3–5 competing framework signatures

**Example (SvelteKit blog integration):**

```
assert:
  - type: llm-rubric
    template: task-completion
    criteria:
      - "Sanity client configuration using createClient from @sanity/sveltekit"
      - "GROQ queries for posts, categories, and authors using defineQuery"
      - "SvelteKit load function pattern for server-side data fetching (+page.server.ts)"
      - "TypeScript type definitions"
      - "Environment variables using SvelteKit conventions (PUBLIC_ prefix, $env/static/public)"
  - type: llm-rubric
    template: code-correctness
    criteria:
      - "Imports createClient from @sanity/sveltekit (not @sanity/client)"
      - "SvelteKit patterns — +page.server.ts load functions, +layout.server.ts"
      - "Svelte 5 patterns — $props(), $derived runes, {@render children()}"
      - "Valid GROQ query syntax using defineQuery"
  - { type: contains, value: "@sanity/sveltekit", weight: 1 }
  - { type: contains-any, value: "[\"groq\",\"GROQ\",\"*[\"]", weight: 1 }
  - { type: contains, value: "createClient", weight: 1 }
  - { type: contains, value: "$props", weight: 1 }
  - { type: contains-any, value: "[\"page.server\",\"+page.server\"]", weight: 1 }
  - { type: not-contains, value: "next-sanity" }
  - { type: not-contains, value: "getStaticProps" }
  - { type: not-contains, value: "react-router" }
```

## Pattern 2 — Single component implementation

**Shape:** "Using `<Component>`, build a thing that does X."

**Rubrics:**

- `task-completion` — Concrete props, structure, and accessibility requirements. Be specific about prop names and values when they matter.
- `code-correctness` — Import source, API usage correctness, what *not* to do (e.g., no inline styles, no overriding role).

**Literal checks (typically 0–3):**

- Often minimal — the rubrics already cover implementation. Add a `not-contains` for `style={` if the task is "use styling props, not inline styles".

**Example (Box styling props):**

```
assert:
  - type: llm-rubric
    template: task-completion
    criteria:
      - "Renders the component as Box with no style attribute"
      - "The Box has the following props - tone=\"neutral\" - padding={[ANY INTEGER]} - borderRight={true} - minWidth=\"260px\" - height=\"100vh\""
  - type: llm-rubric
    template: code-correctness
    criteria:
      - "Box is imported from the 'ui' package, not from '@sanity/ui'"
      - "No Flex or Card component is used"
      - "No inline styles exist on the component"
```

## Pattern 3 — Decision / multi-scenario

**Shape:** "For each scenario, decide whether to use A or B. Explain your choice."

**Rubrics:**

- `task-completion` — One criterion *per scenario* describing the correct choice and why it's correct. Plus criteria for any JSX the user asked to be shown.
- `code-correctness` — Focus on whether the reasoning and any code samples are valid. Fewer criteria than pattern 1 (2–3 is fine).

**Literal checks:** Rarely needed. The content is prose + examples, so string checks are usually too brittle.

## Pattern 4 — Code review / find the bug

**Shape:** "Review this code for problems. Explain and correct."

**Rubrics:**

- `task-completion` — What specific problem(s) the answer must identify, including relevant spec references (WCAG, ARIA) if applicable. End with a criterion about providing a valid corrected version.
- `code-correctness` — Whether the correction is syntactically valid and doesn't reintroduce the same issue.

**Literal checks:** Rarely needed — the response is prose + code diff.

## Deciding rubric count

- **One rubric task-completion + one rubric code-correctness** is the default. Always use both.
- Add a third rubric (`doc-coverage`) only when `docCoverage: true` **and** you want a custom rubric — otherwise the platform auto-generates the doc-coverage rubric from the canonical docs.
- Don't stack more rubrics than that. If you find yourself wanting 3+ rubrics of the same template, you're probably trying to test too many things in one task — split it.

## Avoiding common mistakes

- **Overlapping literal and rubric:** Don't write a `contains` for something that's already a rubric criterion — the rubric grader will penalize its absence and you'll be double-penalizing.
- **`not-contains` for something that *could* be correct:** If a valid answer might legitimately include the string (e.g., a comment mentioning Next.js for comparison), `not-contains` will false-positive. Use it only for strong framework signatures.
- **Criteria that describe the prompt back:** A criterion like "Answers the question" is useless. Every criterion should describe a specific observable thing in the output.
- **Criteria longer than a sentence:** If you need two sentences, split into two criteria.
- **Using `contains-any` with a native array:** The `value` field is a string. Pass JSON-encoded: `"[\"a\",\"b\"]"`, not `["a","b"]`.

