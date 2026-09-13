/**
 * Turn raw TypeScript / build errors into actionable, generic fix hints —
 * "pair each error with its fix, not just the error."
 *
 * Weak models (Haiku) re-guess when handed only the raw TS type-soup
 * (`… Omit<ButtonProps & Omit<HTMLProps<…>>>`). Naming the component and the
 * bad prop converges the repair far faster than the raw compiler output alone.
 *
 * Deliberately generic: this file ships to every user of the harness
 * regardless of which design system (if any) their tests target, so it must
 * not assume a specific package, component library, or MCP tool exists.
 * Product-specific hints (e.g. "this package's ThemeProvider is called X")
 * belong in that test's own config, not here.
 */

/**
 * Scan combined error text and return an ordered, de-duplicated list of fix hints.
 * @param {string} text - fatal error + console errors, concatenated
 * @returns {string[]}
 */
export function deriveErrorHints(text) {
  if (!text) return [];
  const hints = new Set();

  // 1. Invalid prop: `Property 'X' does not exist on type '… <Component>Props …'`
  const propRe = /Property '([^']+)' does not exist on type '[^']*?\b([A-Z]\w+)Props/g;
  let m;
  while ((m = propRe.exec(text)) !== null) {
    const prop = m[1];
    const component = m[2];
    hints.add(
      `\`${component}\` has no \`${prop}\` prop (the type checker rejected it) — remove it, do not re-add it. Check the component's actual type definition for the correct prop name before re-emitting.`,
    );
  }

  // 2. Boolean prop given a string: `Type 'string' is not assignable to type 'Responsive<boolean>'`
  // Note: no trailing `'` anchor — optional props (the overwhelming majority)
  // render as `'Responsive<boolean> | undefined'`, not `'Responsive<boolean>'`
  // exactly. Anchoring on the closing quote meant this never matched a real
  // optional-prop error (2026-07-25).
  if (/is not assignable to type '(?:Responsive<boolean>|boolean)/.test(text)) {
    hints.add(
      'A boolean prop was given a string (e.g. `fullWidth="true"`). Use the bare prop (`fullWidth`) or a brace boolean (`fullWidth={false}`), never a string.',
    );
  }

  // 3. Number where a CSS string is expected. Same trailing-quote fix as #2.
  if (/is not assignable to type 'Responsive<string>/.test(text)) {
    hints.add(
      'A sizing/grid prop (width, gridTemplateColumns, …) was given a number. These take CSS strings — use `width="320px"` or `gridTemplateColumns="repeat(3, 1fr)"`. (Spacing props like padding/gap are the opposite — integers.)',
    );
  }

  // 4. Implicit any on a parameter (TS7006) — almost always an event handler.
  const anyRe = /Parameter '([^']+)' implicitly has an 'any' type/g;
  const anyParams = new Set();
  while ((m = anyRe.exec(text)) !== null) anyParams.add(m[1]);
  if (anyParams.size) {
    hints.add(
      `Add a type to ${[...anyParams].map((p) => `\`${p}\``).join(", ")} — for an input handler use \`(e: React.ChangeEvent<HTMLInputElement>)\`, for a click use \`(e: React.MouseEvent)\`.`,
    );
  }

  // 5. Missing devDependency crashes the dev server (or a Node-level
  // `require`/`import` failure elsewhere) instead of raising a tsc error —
  // e.g. `vite.config.ts` importing `@vitejs/plugin-react` without it being
  // declared in package.json. Generic Node error text, not design-system-
  // specific: any package can be missing this way. Observed 2026-08-19: a
  // weaker model was shown this exact error twice in a row across two fix
  // attempts and made no change both times — the fix (add the package to
  // package.json) apparently wasn't obvious from the raw error alone.
  const missingModuleRe = /Cannot find module '([^']+)'/g;
  const missingModules = new Set();
  while ((m = missingModuleRe.exec(text)) !== null) missingModules.add(m[1]);
  if (missingModules.size) {
    hints.add(
      `${[...missingModules].map((p) => `\`${p}\``).join(", ")} ${missingModules.size > 1 ? "are" : "is"} imported somewhere but missing from package.json. Add ${missingModules.size > 1 ? "them" : "it"} to \`dependencies\` or \`devDependencies\` (whichever matches how it's used) — do not remove the import.`,
    );
  }

  // 6. The project's own tsconfig is misconfigured.
  //
  // The agent AUTHORS every file in this harness, tsconfig.json included —
  // there is no pre-provided scaffold. So a compiler-config error can only
  // be fixed by editing that file, and the hint has to say so.
  //
  // This previously emitted the exact opposite ("Do not modify
  // tsconfig.json … they are pre-configured and valid. Only edit files
  // under `src/`."), which fired on ANY error text merely containing
  // "tsconfig.json". That made TS5070 / TS5023 / TS6306 / TS6310
  // unwinnable: tsc reports them against tsconfig.json, the hint forbade
  // touching tsconfig.json, and the model burned its whole fix budget
  // editing `src/` files that were never the problem (observed
  // 2026-09-03 — a model hit TS5070 and never once tried the one edit
  // that resolves it). Config errors are now paired with the fix, like
  // every other hint here.
  // Keep in sync with TSCONFIG_SCAFFOLD_ERROR_CODES in evaluation/tsc-flake.js
  // — the same codes the report counts as scaffold errors. TS6142 is
  // deliberately excluded: it doubles as a configless-tsc flake signature
  // (see isProbablyConfiglessRun), which the retry path already handles.
  const configErrorCodes = /TS5023|TS5070|TS6053|TS6305|TS6306|TS6310/;
  if (
    configErrorCodes.test(text) ||
    /Unknown compiler option|'files' list .* is empty/i.test(text)
  ) {
    hints.add(
      "This is a compiler-configuration error, not an app-code error — it can only be fixed by editing the tsconfig.json you emitted. Re-emit tsconfig.json with the offending option corrected or removed. Prefer a single tsconfig.json with no `references` array (drop any `tsconfig.app.json` / `tsconfig.node.json` and fold their options in), and when `module` is `ESNext` set `\"moduleResolution\": \"bundler\"` explicitly — omitting it defaults to `classic`, which conflicts with `resolveJsonModule` and modern package `exports`. Do NOT weaken type checking (`strict: false`, `skipLibCheck`, `// @ts-nocheck`) to silence app-code errors.",
    );
  }

  return [...hints];
}
