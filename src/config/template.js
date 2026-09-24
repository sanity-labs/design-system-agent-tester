/**
 * Small template renderer.
 *
 * Supports only what the test prompts need:
 *
 *   {{path.to.value}}         insert a value, dot paths allowed
 *   {{#if path}}…{{/if}}      include only when the value is set
 *   {{#unless path}}…{{/unless}}  include only when it is not
 *
 * Conditionals cannot be nested.
 */

const IF_RE = /\{\{\s*#if\s+([^}]+?)\s*\}\}([\s\S]*?)\{\{\s*\/if\s*\}\}/g;
const UNLESS_RE = /\{\{\s*#unless\s+([^}]+?)\s*\}\}([\s\S]*?)\{\{\s*\/unless\s*\}\}/g;
const VAR_RE = /\{\{\s*([a-zA-Z_][\w.]*)\s*\}\}/g;

function resolve(ctx, path) {
  const parts = path.trim().split(".");
  let cur = ctx;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}

/**
 * Fill in a template from a context object.
 *
 * Throws if a `{{path}}` has no value, so a typo shows up straight away
 * instead of putting the word "undefined" in the prompt.
 */
export function render(template, ctx) {
  if (typeof template !== "string") {
    throw new TypeError("render: template must be a string");
  }

  let out = template;

  out = out.replace(UNLESS_RE, (_, path, body) => (resolve(ctx, path) ? "" : body));

  out = out.replace(IF_RE, (_, path, body) => (resolve(ctx, path) ? body : ""));

  // Conditionals cannot nest. If any `{{#if}}` or `{{#unless}}` tag is still
  // here after the passes above, the template nested or failed to close one,
  // which would otherwise end up in the prompt as stray text.
  const stray = out.match(/\{\{\s*[#/](?:if|unless)\b[^}]*\}\}/);
  if (stray) {
    throw new Error(
      `Unbalanced or nested conditional in template near "${stray[0]}". ` +
        `This renderer supports only flat, non-nested {{#if}}/{{#unless}} blocks.`,
    );
  }

  out = out.replace(VAR_RE, (_, path) => {
    const val = resolve(ctx, path);
    if (val === undefined || val === null) {
      throw new Error(
        `Template references unknown value: {{${path.trim()}}}. ` +
          `Available top-level keys: ${Object.keys(ctx).join(", ")}.`,
      );
    }
    return String(val);
  });

  return out;
}
