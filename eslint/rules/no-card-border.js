/**
 * `<Card border>` is not a valid prop on `@sanity-labs/ui-poc` Card.
 * TypeScript surfaces this as TS2322 ("Property 'border' does not exist
 * on type CardProps").
 *
 * Autofix: remove the `border` attribute (along with the whitespace
 * preceding it so we don't leave a stray double space). Removing the
 * prop yields the no-border default — agents that wanted a visible
 * outline should add it via `tone` or a wrapping component, but that's
 * a judgment call the lint rule deliberately doesn't make.
 *
 * Only fires when `Card` was imported from `@sanity-labs/ui-poc` in the
 * same file. A Card from `@sanity/ui` (UI 3) is left alone.
 */

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "@sanity-labs/ui-poc Card has no `border` prop. Remove it — the prop doesn't exist on CardProps.",
    },
    fixable: "code",
    messages: {
      noBorder:
        "`border` is not a prop on ui-poc Card. Remove it (and use `tone` or a wrapper for outlines).",
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
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
        if (node.name.name !== "Card") return;
        if (!uiPocLocals.has("Card")) return;

        const borderAttr = node.attributes.find(
          (a) =>
            a.type === "JSXAttribute" &&
            a.name &&
            a.name.type === "JSXIdentifier" &&
            a.name.name === "border",
        );
        if (!borderAttr) return;

        context.report({
          node: borderAttr,
          messageId: "noBorder",
          fix(fixer) {
            const text = sourceCode.getText();
            let start = borderAttr.range[0];
            while (start > 0 && text[start - 1] === " ") start--;
            return fixer.removeRange([start, borderAttr.range[1]]);
          },
        });
      },
    };
  },
};
