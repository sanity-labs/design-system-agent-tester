export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow Box as="button" — use the Button component instead',
    },
    messages: {
      boxAsButton: '<Box as="button"> inherits browser button defaults (border, background, cursor) with no prop-based reset. Use <Button mode="bleed"> instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null
        if (name !== 'Box') return
        for (const attr of node.attributes) {
          if (
            attr.type === 'JSXAttribute' &&
            attr.name && attr.name.name === 'as' &&
            attr.value && attr.value.type === 'Literal' &&
            attr.value.value === 'button'
          ) {
            context.report({ node: attr, messageId: 'boxAsButton' })
          }
        }
      },
    }
  },
}
