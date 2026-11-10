/**
 * Each design-system component's default prop values, for the exact package
 * version an arm installs.
 *
 * The tables in `prop-defaults/` are generated from the installed package's
 * own source by eslint-plugin-sanity-ui's `scripts/derive-prop-defaults.mjs`:
 *
 *   node scripts/derive-prop-defaults.mjs <…/node_modules/@sanity/ui> \
 *     --json src/evaluation/prop-defaults/@sanity__ui@<version>.json
 *
 * A version with no table gets null, never a neighbouring version's table: a
 * default that moved between releases would otherwise be counted wrongly, and
 * the report shows "—" instead.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "prop-defaults");
const cache = new Map();

/** `{ Card: { density: "regular" }, … }` for one package version, or null. */
export function loadPropDefaults(name, version) {
  if (typeof name !== "string" || typeof version !== "string") return null;
  const key = `${name}@${version}`;
  if (!cache.has(key)) {
    const file = join(DIR, `${name.replace("/", "__")}@${version}.json`);
    cache.set(key, existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).defaults : null);
  }
  return cache.get(key);
}

/**
 * The defaults table for a test's design-system package, from its pinned
 * `packages` entries. The first package with a table wins; null when none has
 * one (an unpinned `latest`, or a version not generated yet).
 */
export function propDefaultsForPackages(packages) {
  for (const p of Object.values(packages ?? {})) {
    const table = loadPropDefaults(p?.name, p?.version);
    if (table) return table;
  }
  return null;
}
