const LAYOUT_PROPS = new Set([
  'flexGrow', 'flexShrink', 'flexBasis',
  'minWidth', 'maxWidth', 'width', 'height', 'minHeight',
  'overflow', 'overflowX', 'overflowY', 'position',
])

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow layout props on Card — they are silently ignored',
    },
    messages: {
      layoutOnCard: '\'{{prop}}\' on Card is silently ignored. Wrap Card in a Box or Flex and put layout props on the wrapper: <Box {{prop}}={...}><Card>...</Card></Box>',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null
        if (name !== 'Card') return
        for (const attr of node.attributes) {
          if (attr.type === 'JSXAttribute' && attr.name && LAYOUT_PROPS.has(attr.name.name)) {
            context.report({ node: attr, messageId: 'layoutOnCard', data: { prop: attr.name.name } })
          }
        }
      },
    }
  },
}
