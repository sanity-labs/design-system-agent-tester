export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow @vitejs/plugin-react-swc — styled-components requires the Babel variant',
    },
    messages: {
      wrongPlugin: 'Use \'@vitejs/plugin-react\' (Babel), not \'@vitejs/plugin-react-swc\'. The SWC variant causes styled-components to silently produce unstyled output.',
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value === '@vitejs/plugin-react-swc') {
          context.report({ node, messageId: 'wrongPlugin' })
        }
      },
    }
  },
}
