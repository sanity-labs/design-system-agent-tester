const SANITY_COMPONENTS = new Set(['Box', 'Flex', 'Card', 'Text', 'Heading', 'Stack', 'Divider', 'Grid'])
const COLOR_PROPS = new Set(['background', 'backgroundColor', 'color', 'borderColor', 'border'])

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow inline color styles on Sanity UI components — use props or CSS custom properties instead',
    },
    messages: {
      inlineColor: 'Inline style \'{{prop}}\' on {{component}} should use a prop or CSS custom property override instead. See patterns-custom-theming.md.',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null
        if (!name || !SANITY_COMPONENTS.has(name)) return
        for (const attr of node.attributes) {
          if (
            attr.type === 'JSXAttribute' &&
            attr.name && attr.name.name === 'style' &&
            attr.value && attr.value.type === 'JSXExpressionContainer' &&
            attr.value.expression.type === 'ObjectExpression'
          ) {
            for (const prop of attr.value.expression.properties) {
              if (prop.type === 'Property' && prop.key && prop.key.name && COLOR_PROPS.has(prop.key.name)) {
                context.report({
                  node: prop,
                  messageId: 'inlineColor',
                  data: { prop: prop.key.name, component: name },
                })
              }
            }
          }
        }
      },
    }
  },
}
