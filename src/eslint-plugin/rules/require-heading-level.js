export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require explicit as prop on Heading to prevent silent <h2> default',
    },
    messages: {
      missingLevel: 'Heading is missing the \'as\' prop. Without it, <h2> is rendered silently regardless of context. Set as="h1" through as="h6" explicitly.',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null
        if (name !== 'Heading') return
        const hasLevel = node.attributes.some(
          (attr) => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'as'
        )
        if (!hasLevel) {
          context.report({ node, messageId: 'missingLevel' })
        }
      },
    }
  },
}
