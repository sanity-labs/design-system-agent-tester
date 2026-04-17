export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require id prop on MenuButton for ARIA association',
    },
    messages: {
      missingId: 'MenuButton is missing the \'id\' prop. Without it, screen readers cannot associate the trigger with its menu (WCAG 4.1.2 A).',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null
        if (name !== 'MenuButton') return
        const hasId = node.attributes.some(
          (attr) => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'id'
        )
        if (!hasId) {
          context.report({ node, messageId: 'missingId' })
        }
      },
    }
  },
}
