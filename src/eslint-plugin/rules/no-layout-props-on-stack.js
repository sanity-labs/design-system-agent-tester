const LAYOUT_PROPS = new Set(['flexGrow', 'flexShrink', 'flexBasis', 'overflow'])

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow flex-child props on Stack — they are silently ignored',
    },
    messages: {
      layoutOnStack: '\'{{prop}}\' on Stack is silently ignored. Use <Flex flexDirection="column" gap={N}> instead, or wrap Stack in <Box {{prop}}={...}>.',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null
        if (name !== 'Stack') return
        for (const attr of node.attributes) {
          if (attr.type === 'JSXAttribute' && attr.name && LAYOUT_PROPS.has(attr.name.name)) {
            context.report({ node: attr, messageId: 'layoutOnStack', data: { prop: attr.name.name } })
          }
        }
      },
    }
  },
}
