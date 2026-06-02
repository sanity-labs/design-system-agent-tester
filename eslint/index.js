/**
 * eslint-plugin-ui-poc — local ESLint plugin for @sanity-labs/ui-poc
 * conventions.
 *
 * Bundles narrow, autofixable rules that catch the specific failure
 * modes the agent-tester harness has observed agents looping on:
 *
 *   - no-box-display-non-block      <Box display="flex"> → <Flex>
 *   - no-null-in-responsive-array   null → undefined in responsive arrays
 *   - flex-shorthand-prop-names     direction/align/justify/wrap → CSS names
 *   - stack-from-sanity-ui          Stack imported from wrong package
 *   - no-card-border                <Card border> → <Card>
 *
 * Each rule's autofix is conservative: it only touches patterns it can
 * safely identify, and leaves anything ambiguous alone for the agent
 * (or TypeScript) to surface.
 *
 * See ./README.md for usage and ./run.js for the CLI runner.
 */

import noBoxDisplayNonBlock from "./rules/no-box-display-non-block.js";
import noNullInResponsiveArray from "./rules/no-null-in-responsive-array.js";
import flexShorthandPropNames from "./rules/flex-shorthand-prop-names.js";
import stackFromSanityUi from "./rules/stack-from-sanity-ui.js";
import noCardBorder from "./rules/no-card-border.js";

const plugin = {
  meta: {
    name: "eslint-plugin-ui-poc",
    version: "0.1.0",
  },
  rules: {
    "no-box-display-non-block": noBoxDisplayNonBlock,
    "no-null-in-responsive-array": noNullInResponsiveArray,
    "flex-shorthand-prop-names": flexShorthandPropNames,
    "stack-from-sanity-ui": stackFromSanityUi,
    "no-card-border": noCardBorder,
  },
};

/**
 * Flat-config preset. Spread into a project's `eslint.config.js` to
 * enable every rule at "error" severity.
 *
 * Example:
 *   import uiPoc from "/abs/path/to/agent-tester/eslint/index.js";
 *   export default [...uiPoc.configs.recommended];
 */
plugin.configs = {
  recommended: [
    {
      files: ["**/*.{js,jsx,ts,tsx}"],
      plugins: { "ui-poc": plugin },
      rules: {
        "ui-poc/no-box-display-non-block": "error",
        "ui-poc/no-null-in-responsive-array": "error",
        "ui-poc/flex-shorthand-prop-names": "error",
        "ui-poc/stack-from-sanity-ui": "error",
        "ui-poc/no-card-border": "error",
      },
    },
  ],
};

export default plugin;
