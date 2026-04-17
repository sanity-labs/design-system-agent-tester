export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent using space on Flex or gap on Stack — they are silently ignored',
    },
    messages: {
      spaceOnFlex: '\'space\' on Flex has no effect. Use \'gap\' instead: <Flex gap={N}>.',
      gapOnStack: '\'gap\' on Stack has no effect. Use \'space\' instead: <Stack space={N}>.',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null
        if (name === 'Flex') {
          for (const attr of node.attributes) {
            if (attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'space') {
              context.report({ node: attr, messageId: 'spaceOnFlex' })
            }
          }
        }
        if (name === 'Stack') {
          for (const attr of node.attributes) {
            if (attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'gap') {
              context.report({ node: attr, messageId: 'gapOnStack' })
            }
          }
        }
      },
    }
  },
}
