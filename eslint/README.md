# `eslint-plugin-ui-poc`

Local ESLint plugin for `@sanity-labs/ui-poc` conventions. Bundles
narrow, autofixable rules that catch the specific failure modes the
agent-tester harness has observed agents looping on across runs.

The plugin is not published to npm. It runs against the agent's
generated project from the harness's own `node_modules`, via the
CLI runner in `run.js` — agents don't need to install anything in
their project to use it.

## Rules

| Rule | What it catches | Autofix |
|---|---|---|
| `ui-poc/no-box-display-non-block` | `<Box display="flex">` or `<Box display="grid">` (only `none` / `block` / `inline-block` are valid on ui-poc Box) | Renames the tag to `<Flex>` or `<Grid>` and removes the `display` prop. Both opening and closing tags. |
| `ui-poc/no-null-in-responsive-array` | `null` inside a responsive-array JSX attribute (`gridTemplateColumns={['1fr', null, '1fr 1fr']}`) | Rewrites `null` to `undefined`. |
| `ui-poc/flex-shorthand-prop-names` | `<Flex direction/align/justify/wrap>` when `Flex` is imported from `@sanity-labs/ui-poc` | Renames to `flexDirection` / `alignItems` / `justifyContent` / `flexWrap`. Leaves `@sanity/ui` Flex alone. |
| `ui-poc/stack-from-sanity-ui` | `import { Stack } from '@sanity-labs/ui-poc'` (Stack lives in `@sanity/ui`) | Removes `Stack` from the ui-poc import line. The agent or TypeScript surfaces the missing import next. |
| `ui-poc/no-card-border` | `<Card border>` / `<Card border={true}>` (the prop doesn't exist on ui-poc Card — TS2322) | Removes the `border` attribute and the preceding whitespace. Only fires when `Card` is imported from `@sanity-labs/ui-poc`. |

## CLI usage

Run against any project directory. Lints `.js` / `.jsx` / `.ts` /
`.tsx` files, writes fixes back to disk, prints a stylish report of
what's left.

```sh
node /absolute/path/to/agent-tester/eslint/run.js <projectDir>
```

Exit codes:

- `0` — no problems left after autofix
- `1` — problems remain (read the output for what needs manual work)
- `2` — bad invocation (missing arg, directory doesn't exist)

## Programmatic usage

Import the plugin's flat-config preset:

```js
// eslint.config.js
import uiPoc from "/absolute/path/to/agent-tester/eslint/index.js";

export default [...uiPoc.configs.recommended];
```

Or wire individual rules:

```js
import uiPoc from "/absolute/path/to/agent-tester/eslint/index.js";
import tsParser from "@typescript-eslint/parser";

export default [{
  files: ["**/*.{js,jsx,ts,tsx}"],
  languageOptions: {
    parser: tsParser,
    parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
  },
  plugins: { "ui-poc": uiPoc },
  rules: {
    "ui-poc/no-box-display-non-block": "error",
    "ui-poc/no-null-in-responsive-array": "error",
  },
}];
```

## For agents (running from a fix prompt)

When the harness's `fix-system.md` includes the autofix invocation,
the agent's fix loop runs it before manual diagnosis:

```
node {{harnessRoot}}/eslint/run.js .
```

`{{harnessRoot}}` resolves to the absolute path of the agent-tester
checkout at prompt-render time. The agent runs this from the
generated project's working directory before deciding what else needs
to change.

After the autofix pass, the agent re-reads the TypeScript errors that
remain. Most of the recurring API-shape mistakes will be gone, so the
errors left are genuinely substantive (missing imports, real API gaps)
and easier to resolve in one fix attempt instead of looping.

## Adding new rules

Each rule lives in `rules/<name>.js` as a flat-config ESLint rule:

```js
export default {
  meta: {
    type: "problem",
    docs: { description: "..." },
    fixable: "code",
    messages: { id: "..." },
    schema: [],
  },
  create(context) {
    return {
      // AST visitor methods
    };
  },
};
```

Then register it in `index.js`:

```js
import myRule from "./rules/my-rule.js";

plugin.rules["my-rule"] = myRule;
plugin.configs.recommended[0].rules["ui-poc/my-rule"] = "error";
```

The `run.js` runner automatically picks up everything in the
`recommended` config — no separate registration step.

### What makes a good ui-poc rule

The bar for adding a rule is whether it catches a *recurring loop*
the harness has seen. Each existing rule corresponds to a specific
diagnosis where the agent failed to converge in the fix loop because
its prior fought the typed API. Symptoms to look for in `output/`:

- The same TypeScript error appears unchanged across 3+ fix attempts
  in a single iteration.
- Multiple iterations hit the same error shape.
- The autofix has exactly one correct answer (no judgment calls about
  which component to use, which prop the agent meant, etc.).

If the autofix needs judgment, it's not a lint rule — surface it as a
prompt note in `fix-system.md` instead.

## Layout

```
eslint/
├── README.md
├── index.js           ← plugin entry, exports { rules, configs }
├── run.js             ← CLI runner
└── rules/
    ├── no-box-display-non-block.js
    ├── no-null-in-responsive-array.js
    ├── flex-shorthand-prop-names.js
    ├── stack-from-sanity-ui.js
    └── no-card-border.js
```
