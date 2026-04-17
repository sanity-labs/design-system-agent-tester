import noSanityUiLayoutImport from './rules/no-sanity-ui-layout-import.js'
import requireStylesImport from './rules/require-styles-import.js'
import noReactSwcPlugin from './rules/no-react-swc-plugin.js'
import noLayoutPropsOnCard from './rules/no-layout-props-on-card.js'
import noLayoutPropsOnStack from './rules/no-layout-props-on-stack.js'
import requireHeadingLevel from './rules/require-heading-level.js'
import noTonePrimary from './rules/no-tone-primary.js'
import noWrongSpacingProp from './rules/no-wrong-spacing-prop.js'
import noInlineColorStyles from './rules/no-inline-color-styles.js'
import noInlineLayoutStyles from './rules/no-inline-layout-styles.js'
import noBoxAsButton from './rules/no-box-as-button.js'
import noMenuitemIconChildren from './rules/no-menuitem-icon-children.js'
import requireMenubuttonId from './rules/require-menubutton-id.js'

/**
 * @sanity/eslint-plugin-ui — local ESLint plugin for the agent-tester.
 *
 * Each rule maps to a documented silent failure or code-style violation
 * from the Sanity UI component documentation. Rules are intentionally
 * small and atomic so that ESLint error messages act as a direct
 * feedback loop for agents — each message tells the agent exactly
 * what is wrong and how to fix it.
 */

export const rules = {
  'no-sanity-ui-layout-import': noSanityUiLayoutImport,
  'require-styles-import': requireStylesImport,
  'no-react-swc-plugin': noReactSwcPlugin,
  'no-layout-props-on-card': noLayoutPropsOnCard,
  'no-layout-props-on-stack': noLayoutPropsOnStack,
  'require-heading-level': requireHeadingLevel,
  'no-tone-primary': noTonePrimary,
  'no-wrong-spacing-prop': noWrongSpacingProp,
  'no-inline-color-styles': noInlineColorStyles,
  'no-inline-layout-styles': noInlineLayoutStyles,
  'no-box-as-button': noBoxAsButton,
  'no-menuitem-icon-children': noMenuitemIconChildren,
  'require-menubutton-id': requireMenubuttonId,
}

/**
 * Flat config preset that enables all rules as errors.
 * Usage in eslint.config.js:
 *
 *   import sanityUI from './src/eslint-plugin/index.js'
 *   export default [sanityUI.configs.recommended]
 */
export const configs = {
  recommended: {
    plugins: {
      'sanity-ui': { rules },
    },
    rules: {
      'sanity-ui/no-sanity-ui-layout-import': 'error',
      'sanity-ui/require-styles-import': 'error',
      'sanity-ui/no-react-swc-plugin': 'error',
      'sanity-ui/no-layout-props-on-card': 'error',
      'sanity-ui/no-layout-props-on-stack': 'error',
      'sanity-ui/require-heading-level': 'error',
      'sanity-ui/no-tone-primary': 'error',
      'sanity-ui/no-wrong-spacing-prop': 'error',
      'sanity-ui/no-inline-color-styles': 'warn',
      'sanity-ui/no-inline-layout-styles': 'warn',
      'sanity-ui/no-box-as-button': 'error',
      'sanity-ui/no-menuitem-icon-children': 'error',
      'sanity-ui/require-menubutton-id': 'error',
    },
  },
}

/**
 * Rule summary — maps each rule to the silent-failures.md entry it enforces.
 * Used by the report generator to cross-reference lint results with
 * documentation.
 */
export const ruleDocs = {
  'no-sanity-ui-layout-import':  { silentFailure: 5,  doc: 'silent-failures.md #5, code-style-guide.md' },
  'require-styles-import':       { silentFailure: 6,  doc: 'silent-failures.md #6, quick-start.md' },
  'no-react-swc-plugin':         { silentFailure: 7,  doc: 'silent-failures.md #7, quick-start.md' },
  'no-layout-props-on-card':     { silentFailure: 1,  doc: 'silent-failures.md #1, card.md' },
  'no-layout-props-on-stack':    { silentFailure: 4,  doc: 'silent-failures.md #4, stack.md' },
  'require-heading-level':       { silentFailure: 2,  doc: 'silent-failures.md #2, heading.md' },
  'no-tone-primary':             { silentFailure: 3,  doc: 'silent-failures.md #3, button.md' },
  'no-wrong-spacing-prop':       { silentFailure: 8,  doc: 'silent-failures.md #8, code-style-guide.md' },
  'no-inline-color-styles':      { silentFailure: null, doc: 'patterns-custom-theming.md, style-overrides.md' },
  'no-inline-layout-styles':     { silentFailure: null, doc: 'style-overrides.md' },
  'no-box-as-button':            { silentFailure: null, doc: 'style-overrides.md, patterns-navigation.md' },
  'no-menuitem-icon-children':   { silentFailure: 15, doc: 'silent-failures.md #15, patterns-navigation.md' },
  'require-menubutton-id':       { silentFailure: 10, doc: 'silent-failures.md #10, menu.md' },
}
