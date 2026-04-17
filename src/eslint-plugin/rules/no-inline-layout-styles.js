const LAYOUT_COMPONENTS = new Set(['Box', 'Flex', 'Grid'])
const LAYOUT_STYLE_PROPS = new Set([
  'display', 'flexDirection', 'flexWrap', 'alignItems', 'justifyContent',
  'gap', 'flexGrow', 'flexShrink', 'flexBasis',
  'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'maxHeight',
  'overflow', 'overflowX', 'overflowY', 'padding', 'margin',
])

export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow inline layout styles on Box/Flex/Grid — these have prop equivalents',
    },
    messages: {
      inlineLayout: 'Inline style \'{{prop}}\' on {{component}} has a prop equivalent. Use the prop instead: <{{component}} {{prop}}={...}>. See style-overrides.md.',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name = node.name.type === 'JSXIdentifier' ? node.name.name : null
        if (!name || !LAYOUT_COMPONENTS.has(name)) return
        for (const attr of node.attributes) {
          if (
            attr.type === 'JSXAttribute' &&
            attr.name && attr.name.name === 'style' &&
            attr.value && attr.value.type === 'JSXExpressionContainer' &&
            attr.value.expression.type === 'ObjectExpression'
          ) {
            for (const prop of attr.value.expression.properties) {
              if (prop.type === 'Property' && prop.key && prop.key.name && LAYOUT_STYLE_PROPS.has(prop.key.name)) {
                context.report({
                  node: prop,
                  messageId: 'inlineLayout',
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
