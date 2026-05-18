export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require @sanity-labs/design-system/styles.css import in main entry file',
    },
    messages: {
      missingStyles:
        "main.tsx must import '@sanity-labs/design-system/styles.css'. Without it, all ui-poc components render as unstyled HTML with no error.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename()
    if (!/main\.(tsx?|jsx?)$/.test(filename)) return {}

    let found = false
    return {
      ImportDeclaration(node) {
        if (node.source.value === '@sanity-labs/design-system/styles.css') {
          found = true
        }
      },
      'Program:exit'(node) {
        if (!found) {
          context.report({ node, messageId: 'missingStyles' })
        }
      },
    }
  },
}
