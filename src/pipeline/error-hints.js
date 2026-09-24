/**
 * Turn build errors into hints that say how to fix them, not just what went
 * wrong.
 *
 * Weaker models tend to guess again when handed raw TypeScript type errors,
 * which are long and hard to read. Naming the component and the bad prop
 * gets to a fix much faster.
 *
 * Everything here stays generic. This file ships to every user of the
 * harness whatever design system they test, so it must not assume a
 * particular package or component exists. Hints specific to one product
 * belong in that test's own config.
 */

/**
 * Read the error text and return fix hints, in order and without repeats.
 * @param {string} text - fatal error and console errors, joined
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

  // 2. A boolean prop was given a string.
  // The pattern deliberately does not require a closing quote: most props are
  // optional, so the type reads "Responsive<boolean> | undefined" and
  // anchoring on the quote never matched a real error.
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

  // 5. A package is used but never declared, so the dev server crashes
  // instead of tsc reporting it. A common case is vite.config.ts importing a
  // plugin that is missing from package.json. The wording stays generic,
  // since any package can be missing this way.
  const missingModuleRe = /Cannot find module '([^']+)'/g;
  const missingModules = new Set();
  while ((m = missingModuleRe.exec(text)) !== null) missingModules.add(m[1]);
  if (missingModules.size) {
    hints.add(
      `${[...missingModules].map((p) => `\`${p}\``).join(", ")} ${missingModules.size > 1 ? "are" : "is"} imported somewhere but missing from package.json. Add ${missingModules.size > 1 ? "them" : "it"} to \`dependencies\` or \`devDependencies\` (whichever matches how it's used) — do not remove the import.`,
    );
  }

  // 6. The project's own tsconfig is wrong.
  //
  // The agent writes every file here, tsconfig.json included, so a compiler
  // config error can only be fixed by editing that file and the hint has to
  // say so. It used to say the opposite, which left the agent unable to fix
  // the one file at fault.
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
