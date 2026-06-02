/**
 * On `<Flex>` imported from `@sanity-labs/ui-poc`, rename the
 * `@sanity/ui` (UI 3) shorthand props to the CSS-property names UI 4
 * uses:
 *
 *   direction → flexDirection
 *   align     → alignItems
 *   justify   → justifyContent
 *   wrap      → flexWrap
 *
 * Only applies when `Flex` was imported from `@sanity-labs/ui-poc` in
 * the same file. We track import sources by local-name so that a Flex
 * imported from `@sanity/ui` (legitimately, using UI 3 conventions) is
 * left alone.
 */

const RENAMES = Object.freeze({
  direction: "flexDirection",
  align: "alignItems",
  justify: "justifyContent",
  wrap: "flexWrap",
});

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "@sanity-labs/ui-poc Flex uses CSS-property prop names (flexDirection, alignItems, justifyContent, flexWrap), not the @sanity/ui shorthand.",
    },
    fixable: "code",
    messages: {
      renameProp: "Use `{{correct}}` instead of `{{wrong}}` on ui-poc Flex.",
    },
    schema: [],
  },

  create(context) {
    // Local names imported from @sanity-labs/ui-poc.
    const uiPocLocals = new Set();

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "@sanity-labs/ui-poc") return;
        for (const spec of node.specifiers) {
          if (spec.type === "ImportSpecifier") {
            uiPocLocals.add(spec.local.name);
          }
        }
      },

      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier") return;
        if (node.name.name !== "Flex") return;
        if (!uiPocLocals.has("Flex")) return;

        for (const attr of node.attributes) {
          if (attr.type !== "JSXAttribute") continue;
          if (!attr.name || attr.name.type !== "JSXIdentifier") continue;

          const wrong = attr.name.name;
          const correct = RENAMES[wrong];
          if (!correct) continue;

          context.report({
            node: attr.name,
            messageId: "renameProp",
            data: { correct, wrong },
            fix(fixer) {
              return fixer.replaceText(attr.name, correct);
            },
          });
        }
      },
    };
  },
};
