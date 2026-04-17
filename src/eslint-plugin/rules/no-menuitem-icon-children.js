export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow combining icon prop with children on MenuItem — causes broken layout',
    },
    messages: {
      iconAndChildren: 'MenuItem has both an \'icon\' prop and children. This causes the icon to render on its own line. Use icon + text prop (no children), or put everything in children (no icon prop). See patterns-navigation.md.',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXElement(node) {
        const opening = node.openingElement
        const name = opening.name.type === 'JSXIdentifier' ? opening.name.name : null
        if (name !== 'MenuItem') return

        const hasIcon = opening.attributes.some(
          (attr) => attr.type === 'JSXAttribute' && attr.name && attr.name.name === 'icon'
        )
        const hasChildren = node.children && node.children.some(
          (child) => child.type !== 'JSXText' || child.value.trim() !== ''
        )

        if (hasIcon && hasChildren) {
          context.report({ node: opening, messageId: 'iconAndChildren' })
        }
      },
    }
  },
}
