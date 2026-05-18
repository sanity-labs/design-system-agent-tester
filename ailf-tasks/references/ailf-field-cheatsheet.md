# `ailf.task` field cheatsheet

Current schema for the `next` dataset on project `3do82whm`. Older mirror-origin tasks in the dataset may use different field names (`assertions`, `promptText`, `contextDocs`, `title`, `area`) — those are the legacy shape and should not be copied when writing new documents.

## Top-level fields

| Field | Type | Required | Notes |
| ---- | ---- | ---- | ---- |
| `_type` | string | yes | Always `"ailf.task"` |
| `_id` | string | yes | For drafts use `"drafts.<uuid>"` |
| `id` | slug | yes | `{ _type: "slug", current: "<kebab-case>" }`. Must be unique across `ailf.task`. |
| `description` | string | yes | Human-readable label. Don't include `(gold)` / `(baseline)`. |
| `status` | string | no | `"active"` / `"draft"` / `"paused"` / `"archived"`. Default `"active"`. |
| `ownership` | string | no | `"studio"` or `"repo"`. Default `"studio"` for this skill. Hidden in UI. |
| `taskPrompt` | text | yes | The prompt sent to the evaluated model. Plain text or Markdown. Keep short and user-like. |
| `featureArea` | reference | yes | To `ailf.featureArea`. `{ _type: "reference", _ref: "ailf.featureArea.<slug>" }` |
| `tags` | string[] | no | Freeform. |
| `canonicalDocs` | canonicalDocRef[] | no | Required for `docCoverage: true` to be meaningful. See below. |
| `referenceSolution` | reference | no | To `ailf.referenceSolution`. Rare. |
| `docCoverage` | boolean | no | `true` auto-generates a doc-coverage rubric. Default `true` when `canonicalDocs` is set. |
| `assert` | assertion[] | yes (min 1) | See assertion types below. |
| `rawAssert` | rawAssertion[] | no | Advanced — raw Promptfoo objects that bypass validation. Skip unless asked. |
| `baseline` | object | no | `{ enabled: true, rubric: "full" }` is the default for this skill. |
| `execution` | object | no | Leave unset. See below for what's in it. |
| `origin` | object | no | Read-only. Only set by the repo mirror sync. Never write. |

## `canonicalDocRef` shape

```json
{
  "_type": "canonicalDocRef",
  "_key": "<short random>",
  "refType": "id",
  "doc": { "_type": "reference", "_ref": "<article._id>" },
  "reason": "<one-line justification>"
}
```

Alternative `refType: "perspective"` exists (for content releases) but is rare. When used, replace `doc` with `perspective: "<release-id>"` and optionally `perspectiveTitle`.

Legacy mirror-origin tasks use `refType: "path"` with a `path` field — that's for repo-path-based resolution and should not be used for Studio-authored tasks.

## `assertion` shape and types

```json
{ "_type": "assertion", "_key": "<short>", "type": "<type>", ... }
```

`type` is one of:

| Type | Extra fields | Use for |
| ---- | ---- | ---- |
| `llm-rubric` | `template` (task-completion / code-correctness / doc-coverage), `criteria: string[]` | Rubric-based grading |
| `contains` | `value: string`, `weight?: number` | Required string match |
| `contains-any` | `value: <json array string>`, `weight?: number` | Any one of several variants |
| `contains-all` | `value: <json array string>`, `weight?: number` | All of several strings |
| `not-contains` | `value: string` | String must be absent |
| `icontains` | `value: string` | Case-insensitive contains |
| `icontains-any` | `value: <json array string>` | Case-insensitive any |
| `regex` | `value: string` | Regex match |
| `javascript` | `value: string` | Custom JS assertion code |
| `similar` | `value: string`, `threshold: number` | Semantic similarity |
| `cost` | `threshold: number` | Cost ceiling |
| `latency` | `threshold: number` | Latency ceiling |

`value` is always a single string. For `*-any` / `*-all` types, the string must be a JSON-encoded array: `"[\"a\",\"b\"]"`.

`weight` applies to non-rubric assertions; omit unless you want something other than the default weighting.

## `baseline` shape

```json
{ "enabled": true, "rubric": "full" }
```

`rubric` is one of `"abbreviated"`, `"full"`, `"none"`.

## `execution` shape (skip unless user asks)

```json
{
  "enabled": true,
  "blocking": false,
  "trigger": {
    "branches": ["main"],
    "paths": ["src/**"],
    "labels": ["eval"],
    "schedule": "0 6 * * *"
  },
  "threshold": {
    "score": 70,
    "dimensions": {
      "taskCompletion": 70,
      "codeCorrectness": 60,
      "docCoverage": 50
    }
  }
}
```

## Feature area references

`featureArea._ref` must match an existing `ailf.featureArea` document ID. Query them with:

```groq
*[_type == "ailf.featureArea"]{_id, description} | order(description asc)
```

If the user's topic doesn't fit an existing area, don't invent one — tell the user to create it in Studio first.

