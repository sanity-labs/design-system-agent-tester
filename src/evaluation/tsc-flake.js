/**
 * Pure helpers for detecting *suspicious* tsc failures — failures whose
 * signature contradicts the on-disk project state, indicating a transient
 * toolchain condition (a config read that failed mid-flight, a node_modules
 * tree still settling) rather than real type errors in the agent's code.
 *
 * The two signatures, and why they mean "tsc ran without the real config":
 *
 *   1. TS17004 "Cannot use JSX unless the '--jsx' flag is provided" (and its
 *      sibling TS6142) while tsconfig.json on disk parses and sets
 *      `compilerOptions.jsx`. tsc only reports this when it compiled WITHOUT
 *      the project's config — i.e. the config was unreadable at launch and
 *      tsc fell back to defaults.
 *
 *   2. TS2305/TS2724 "Module 'x' has no exported member 'Y'" where Y provably
 *      exists in the installed package's type declarations. Default (node10)
 *      resolution ignores modern `exports` maps, so a configless tsc run also
 *      produces this — as does a node_modules tree mid-install.
 *
 * Observed in runs 2026-07-01/08.23 (first tsc pass OK, identical pass 48s
 * later failed on every icon import) and at scale in 2026-07-03/16.33 (344×
 * TS17004 with valid tsconfig, 227× TS2305 on real exports) when two harness
 * runs shared one machine.
 *
 * validate.js uses these to decide whether a failed check earns ONE retry.
 */

/**
 * Parse a tsconfig.json string leniently (JSONC comments and trailing commas
 * are legal in tsconfig). Returns the parsed object, or null when unreadable.
 */
// A real tsconfig.json is tiny (well under 100KB). The lenient comment-strip
// path below uses a lazy `/\*[\s\S]*?\*\//` regex that backtracks quadratically
// on a `/*`-flood with no closing `*/`; agent content is only bounded to ~2MB
// at write time, so cap the lenient path here. Anything larger is not a real
// config — treat it as unreadable rather than risk a stall in the type-check
// preflight.
const MAX_TSCONFIG_STRIP_BYTES = 256_000;

export function parseTsconfig(raw) {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  const direct = tryParse(raw);
  if (direct) return direct;
  // Only the lenient strip path is vulnerable to the `/*`-flood; direct
  // JSON.parse above is linear. Bail rather than scan an oversized blob.
  if (raw.length > MAX_TSCONFIG_STRIP_BYTES) return null;
  // Strip /* */ and // comments (not inside strings — good enough for
  // tsconfig files, which rarely embed "//" in values), then trailing commas.
  const stripped = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/,\s*([}\]])/g, "$1");
  return tryParse(stripped);
}

/** True when the error text carries the configless-fallback signature. */
export function hasConfigFallbackSignature(errorText) {
  return /error TS17004:|error TS6142:/.test(errorText ?? "");
}

/**
 * TypeScript codes that mean "the project's tsconfig/project-reference
 * setup is broken" rather than "the app code has a bug". Distinct from the
 * flake signatures above: these are NOT transient — retrying tsc changes
 * nothing, because the tsconfig.json / tsconfig.app.json the agent wrote is
 * itself invalid. Observed in practice when a model imitates Vite's split
 * app/node tsconfig template (a `references` array) but gets a required
 * field wrong:
 *
 *   TS5023 — unknown compiler option
 *   TS6053 — a referenced project file doesn't exist
 *   TS6305 — output file wasn't built from the expected source (project
 *            references misconfigured)
 *   TS6306 — a referenced project is missing `"composite": true`
 *
 * Tracked separately from ordinary build fixes so a run dominated by
 * scaffold mistakes isn't indistinguishable from one full of real app-code
 * bugs (bad imports, JSX errors, logic errors).
 */
const TSCONFIG_SCAFFOLD_ERROR_CODES = ["TS5023", "TS6053", "TS6305", "TS6306"];

/** True when the error text carries a tsconfig/project-reference scaffold error. */
export function isTsconfigScaffoldError(errorText) {
  const text = errorText ?? "";
  return TSCONFIG_SCAFFOLD_ERROR_CODES.some((code) => text.includes(`error ${code}:`));
}

/**
 * Extract missing-export claims from tsc output. Handles both forms:
 *   TS2305: Module '"@sanity/icons"' has no exported member 'AddIcon'.
 *   TS2724: '"@sanity/icons"' has no exported member named 'AddIcon'. Did you mean …
 * Returns [{ module, member }], bare-package specifiers only (relative
 * imports are the agent's own files — never a toolchain flake).
 */
export function extractMissingExports(errorText) {
  const out = [];
  const re = /'"([^"]+)"' has no exported member (?:named )?'([^']+)'/g;
  let m;
  while ((m = re.exec(errorText ?? "")) !== null) {
    const module = m[1];
    if (module.startsWith(".") || module.startsWith("/")) continue;
    out.push({ module, member: m[2] });
  }
  return out;
}

/** True when `member` appears as a word in the given .d.ts source text. */
export function memberInTypes(dtsText, member) {
  if (typeof dtsText !== "string" || !member) return false;
  return new RegExp(`\\b${member.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(dtsText);
}
