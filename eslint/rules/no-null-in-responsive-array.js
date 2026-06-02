/**
 * Disallow `null` inside a JSX-attribute array literal — Sanity UI's
 * responsive-array props treat `undefined` (not `null`) as the
 * "skip this breakpoint" value, and the typed prop signatures
 * (`Responsive<string> | undefined`, etc.) reject `null`.
 *
 * Triggers on the pattern:
 *
 *   <Grid gridTemplateColumns={['1fr', null, '1fr 1fr']} />
 *                                     ^^^^
 *                                     // → undefined
 *
 * Autofix: replace the literal `null` with `undefined`.
 *
 * We only flag `null` inside an `ArrayExpression` that's the immediate
 * value of a JSX attribute — `null` elsewhere (state, conditional
 * renders, etc.) is left alone.
 */

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "Sanity UI responsive arrays use `undefined` (not `null`) to skip a breakpoint. Typed props like `Responsive<string> | undefined` reject `null`.",
    },
    fixable: "code",
    messages: {
      useUndefined:
        "Use `undefined` (not `null`) to skip a breakpoint in a responsive array.",
    },
    schema: [],
  },

  create(context) {
    return {
      Literal(node) {
        if (node.value !== null || node.raw !== "null") return;

        const arr = node.parent;
        if (!arr || arr.type !== "ArrayExpression") return;

        const container = arr.parent;
        if (!container || container.type !== "JSXExpressionContainer") return;

        if (!container.parent || container.parent.type !== "JSXAttribute") {
          return;
        }

        context.report({
          node,
          messageId: "useUndefined",
          fix(fixer) {
            return fixer.replaceText(node, "undefined");
          },
        });
      },
    };
  },
};
