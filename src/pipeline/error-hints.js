/**
 * Turn raw TypeScript / build errors into actionable, design-system-aware fix
 * hints — "pair each error with its fix, not just the error."
 *
 * Weak models (Haiku) re-guess when handed only the raw TS type-soup
 * (`… Omit<ButtonProps & Omit<HTMLProps<…>>>`). Naming the component, the bad
 * prop, and the valid props converges the repair far faster.
 *
 * Note on prop lists: we deliberately do NOT enumerate "valid props" from a
 * static map. The DSDS docs can drift from the installed package version (e.g.
 * Button's `level`), and a wrong "accepts: …" list would tell the model to
 * re-add the very prop the compiler just rejected. The compiler is authoritative
 * about which prop is invalid; the hint trusts it and points to the live,
 * version-synced tool (dsds_build_component) for the real prop set.
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
    hints.add(`\`${component}\` has no \`${prop}\` prop (the type checker rejected it) — remove it, do not re-add it. For the authoritative prop set for this version, call dsds_build_component(identifier="${component}").`);
  }

  // 2. Hallucinated import: `Module '"@sanity-labs/ui-poc"' has no exported member 'X'`
  const importRe = /has no exported member(?: named)? '([^']+)'/g;
  while ((m = importRe.exec(text)) !== null) {
    const name = m[1];
    if (/provider|theme|root/i.test(name)) {
      hints.add(`\`${name}\` is not a ui-poc export — ui-poc is CSS-driven and has no theme provider. Render components directly; the stylesheet is imported once in main.tsx.`);
    } else {
      hints.add(`\`${name}\` is not exported by @sanity-labs/ui-poc. Verify the name with dsds_check_exports — do not guess. Common ones: Box, Button, Card, Flex, Grid, Stack→VStack/HStack, Text, Heading, Icon, IconButton.`);
    }
  }

  // 3. Boolean prop given a string: `Type 'string' is not assignable to type 'Responsive<boolean>'`
  if (/is not assignable to type '(?:Responsive<boolean>|boolean)'/.test(text)) {
    hints.add('A boolean prop was given a string (e.g. `fullWidth="true"`). Use the bare prop (`fullWidth`) or a brace boolean (`fullWidth={false}`), never a string.');
  }

  // 4. Number where a CSS string is expected.
  if (/is not assignable to type 'Responsive<string>'/.test(text)) {
    hints.add('A sizing/grid prop (width, gridTemplateColumns, …) was given a number. These take CSS strings — use `width="320px"` or `gridTemplateColumns="repeat(3, 1fr)"`. (Spacing props like padding/gap are the opposite — integers.)');
  }

  // 5. Implicit any on a parameter (TS7006) — almost always an event handler.
  const anyRe = /Parameter '([^']+)' implicitly has an 'any' type/g;
  const anyParams = new Set();
  while ((m = anyRe.exec(text)) !== null) anyParams.add(m[1]);
  if (anyParams.size) {
    hints.add(`Add a type to ${[...anyParams].map((p) => `\`${p}\``).join(', ')} — for an input handler use \`(e: React.ChangeEvent<HTMLInputElement>)\`, for a click use \`(e: React.MouseEvent)\`.`);
  }

  // 6. Agent edited scaffold/config files it should leave alone.
  if (/tsconfig\.(?:json|app\.json|node\.json)|Unknown compiler option|'files' list .* is empty/i.test(text)) {
    hints.add('Do not modify tsconfig.json / tsconfig.*.json or other scaffold files — they are pre-configured and valid. Only edit files under `src/`.');
  }

  return [...hints];
}
