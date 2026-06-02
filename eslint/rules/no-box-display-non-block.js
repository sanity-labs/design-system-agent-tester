/**
 * Disallow `<Box display="...">` with values @sanity-labs/ui-poc doesn't
 * allow (i.e. anything other than "none" | "block" | "inline-block").
 *
 * Autofix:
 *   - `display="flex"`  or `"inline-flex"`  →  rename tag to <Flex>
 *   - `display="grid"`  or `"inline-grid"`  →  rename tag to <Grid>
 *
 * Other invalid values are reported without an autofix (no safe target).
 *
 * The rule renames both the opening and closing tags and removes the
 * `display` attribute. It does NOT add an `import { Flex }` /
 * `import { Grid }` line — TypeScript will surface "name not found"
 * after the fix, which is a clearer signal to add the missing import
 * than this rule trying to manage imports.
 */

const ALLOWED = new Set(["none", "block", "inline-block"]);
const FLEX_VALUES = new Set(["flex", "inline-flex"]);
const GRID_VALUES = new Set(["grid", "inline-grid"]);

function getLiteralStringValue(attrValue) {
  if (!attrValue) return null;
  if (attrValue.type === "Literal" && typeof attrValue.value === "string") {
    return attrValue.value;
  }
  if (
    attrValue.type === "JSXExpressionContainer" &&
    attrValue.expression.type === "Literal" &&
    typeof attrValue.expression.value === "string"
  ) {
    return attrValue.expression.value;
  }
  return null;
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        '@sanity-labs/ui-poc Box.display only accepts "none" | "block" | "inline-block". Use <Flex> or <Grid> for layout containers.',
    },
    fixable: "code",
    messages: {
      useFlex: 'Replace `<Box display="{{value}}">` with `<Flex>`. ui-poc Box.display does not accept "{{value}}".',
      useGrid: 'Replace `<Box display="{{value}}">` with `<Grid>`. ui-poc Box.display does not accept "{{value}}".',
      invalidNoFix:
        'Box.display="{{value}}" is not supported. ui-poc Box.display only accepts "none" | "block" | "inline-block".',
    },
    schema: [],
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    return {
      JSXOpeningElement(node) {
        if (node.name.type !== "JSXIdentifier" || node.name.name !== "Box") {
          return;
        }

        const displayAttr = node.attributes.find(
          (a) =>
            a.type === "JSXAttribute" &&
            a.name &&
            a.name.type === "JSXIdentifier" &&
            a.name.name === "display",
        );
        if (!displayAttr) return;

        const value = getLiteralStringValue(displayAttr.value);
        if (value === null) return; // dynamic; can't analyse
        if (ALLOWED.has(value)) return;

        const target = FLEX_VALUES.has(value)
          ? "Flex"
          : GRID_VALUES.has(value)
            ? "Grid"
            : null;

        if (!target) {
          context.report({
            node: displayAttr,
            messageId: "invalidNoFix",
            data: { value },
          });
          return;
        }

        const jsxElement = node.parent;
        const closingElement =
          jsxElement && jsxElement.type === "JSXElement"
            ? jsxElement.closingElement
            : null;

        context.report({
          node,
          messageId: target === "Flex" ? "useFlex" : "useGrid",
          data: { value },
          fix(fixer) {
            const fixes = [];
            fixes.push(fixer.replaceText(node.name, target));

            // Remove `display="…"` plus the whitespace immediately
            // preceding it so we don't leave a double space behind.
            const text = sourceCode.getText();
            let start = displayAttr.range[0];
            while (start > 0 && text[start - 1] === " ") start--;
            fixes.push(fixer.removeRange([start, displayAttr.range[1]]));

            if (
              closingElement &&
              closingElement.name.type === "JSXIdentifier"
            ) {
              fixes.push(fixer.replaceText(closingElement.name, target));
            }
            return fixes;
          },
        });
      },
    };
  },
};
