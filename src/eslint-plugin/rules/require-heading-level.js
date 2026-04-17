export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require explicit level prop on Heading to prevent silent <h2> default',
    },
    messages: {
      missingLevel: 'Heading is missing the \'level\' prop. Without it, <h2> is rendered silently regardless of context. Set level={1} through level={6} explicitly.',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null
        if (name !== 'Heading') return
        const hasLevel = node.attributes.some(
          (attr) => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'level'
        )
        if (!hasLevel) {
          context.report({ node, messageId: 'missingLevel' })
        }
      },
    }
  },
}
