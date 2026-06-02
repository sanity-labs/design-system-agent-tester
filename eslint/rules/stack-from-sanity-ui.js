/**
 * `Stack` is exported from `@sanity/ui`, not `@sanity-labs/ui-poc`.
 *
 * Autofix: drop `Stack` from the `@sanity-labs/ui-poc` import
 * specifier list. If `Stack` was the only specifier, remove the whole
 * import line. We do NOT add `Stack` to a `@sanity/ui` import — that
 * cross-source rewrite gets fiddly and the resulting "Cannot find
 * name 'Stack'" TS error is a clear, one-line follow-up for the agent
 * (or whoever).
 */

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "`Stack` lives in `@sanity/ui`, not `@sanity-labs/ui-poc`. Importing it from ui-poc fails with TS2305 (no exported member 'Stack').",
    },
    fixable: "code",
    messages: {
      wrongSource:
        "Remove `Stack` from the `@sanity-labs/ui-poc` import — it belongs to `@sanity/ui`. Add it to your `@sanity/ui` import.",
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    return {
      ImportDeclaration(node) {
        if (node.source.value !== "@sanity-labs/ui-poc") return;

        const stackSpec = node.specifiers.find(
          (s) =>
            s.type === "ImportSpecifier" &&
            s.imported &&
            s.imported.name === "Stack",
        );
        if (!stackSpec) return;

        context.report({
          node: stackSpec,
          messageId: "wrongSource",
          fix(fixer) {
            const importSpecs = node.specifiers.filter(
              (s) => s.type === "ImportSpecifier",
            );

            // If this is the only named import (and no default/namespace
            // alongside), drop the whole import line — leaving an empty
            // `import { } from '@sanity-labs/ui-poc'` is invalid.
            if (importSpecs.length === 1 && node.specifiers.length === 1) {
              return fixer.remove(node);
            }

            // Otherwise remove just this specifier plus the surrounding
            // comma + whitespace so we don't leave `{ Box, , Flex }`.
            const text = sourceCode.getText();
            let start = stackSpec.range[0];
            let end = stackSpec.range[1];
            // Eat a trailing comma + whitespace if present.
            while (end < text.length && /[\s,]/.test(text[end])) {
              if (text[end] === ",") {
                end++;
                break;
              }
              end++;
            }
            // Otherwise eat a leading comma + whitespace.
            if (text.slice(stackSpec.range[1], end).indexOf(",") === -1) {
              while (start > 0 && /[\s,]/.test(text[start - 1])) {
                if (text[start - 1] === ",") {
                  start--;
                  break;
                }
                start--;
              }
            }
            return fixer.removeRange([start, end]);
          },
        });
      },
    };
  },
};
