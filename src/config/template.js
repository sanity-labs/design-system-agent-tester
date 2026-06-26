/**
 * Minimal mustache-style template renderer.
 *
 * Supports the three constructs every test prompt actually needs and
 * nothing more:
 *
 *   {{path.to.value}}                — substitute a value (dot paths OK)
 *   {{#if path}}…{{/if}}             — render only if value is truthy
 *   {{#unless path}}…{{/unless}}     — render only if value is falsy
 *
 * Conditionals are processed before variable substitution so that
 * `{{undefined.thing}}` inside a falsy branch doesn't trigger an error.
 *
 * No nested conditionals, no loops, no helpers — by design. If a test
 * needs derived values (lists joined as comma-separated strings, markdown
 * tables, etc.), it provides a `derive(ctx)` function in its test file
 * that returns extra fields to merge into the render context.
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
 * Render a template string against a context object.
 *
 * Throws if a `{{path}}` references a value that is `undefined` or
 * `null` (typos surface immediately instead of producing the literal
 * string "undefined" in the prompt).
 *
 * @param {string} template
 * @param {object} ctx
 * @returns {string}
 */
export function render(template, ctx) {
  if (typeof template !== "string") {
    throw new TypeError("render: template must be a string");
  }

  let out = template;

  out = out.replace(UNLESS_RE, (_, path, body) => (resolve(ctx, path) ? "" : body));

  out = out.replace(IF_RE, (_, path, body) => (resolve(ctx, path) ? body : ""));

  // The conditional regexes are flat and non-nested by design. If any
  // `{{#if}}` / `{{/if}}` / `{{#unless}}` / `{{/unless}}` token survives the
  // two passes above, the template nested or unbalanced its conditionals —
  // which would otherwise render as corrupted output (a stray `{{/if}}`) or a
  // misleading "unknown value" error. Fail loudly instead.
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
