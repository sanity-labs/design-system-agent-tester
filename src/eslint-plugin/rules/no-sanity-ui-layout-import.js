const UI_POC_COMPONENTS = new Set(['Box', 'Flex', 'Grid', 'Card', 'Heading', 'Text', 'Divider'])

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow importing layout primitives from @sanity/ui instead of @sanity-labs/ui-poc',
    },
    messages: {
      wrongSource: '{{name}} must be imported from \'@sanity-labs/design-system\', not \'@sanity/ui\'. The @sanity/ui version has a different API and will silently produce wrong behavior.',
    },
    schema: [],
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        if (node.source.value !== '@sanity/ui') return
        for (const specifier of node.specifiers) {
          if (specifier.type === 'ImportSpecifier' && UI_POC_COMPONENTS.has(specifier.imported.name)) {
            context.report({ node: specifier, messageId: 'wrongSource', data: { name: specifier.imported.name } })
          }
        }
      },
    }
  },
}
