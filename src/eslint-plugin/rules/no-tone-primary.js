export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow tone="primary" — it fails WCAG AA contrast (4.29:1)',
    },
    messages: {
      tonePrimary: 'tone="primary" on {{component}} fails WCAG AA contrast (4.29:1 ratio, needs 4.5:1). Use tone="default" for primary actions.',
    },
    schema: [],
  },
  create(context) {
    const TARGET_COMPONENTS = new Set(['Button', 'Badge', 'MenuItem', 'Card'])
    return {
      JSXOpeningElement(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null
        if (!name || !TARGET_COMPONENTS.has(name)) return
        for (const attr of node.attributes) {
          if (
            attr.type === 'JSXAttribute' &&
            attr.name && attr.name.name === 'tone' &&
            attr.value && attr.value.type === 'Literal' &&
            attr.value.value === 'primary'
          ) {
            context.report({ node: attr, messageId: 'tonePrimary', data: { component: name } })
          }
        }
      },
    }
  },
}
