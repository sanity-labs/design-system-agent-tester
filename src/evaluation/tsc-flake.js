/**
 * Spot tsc failures that are caused by the toolchain, not by the agent's code.
 *
 * Two error patterns mean tsc ran without the project's config, usually
 * because the config or node_modules was still being written:
 *
 *   1. It complains the `--jsx` flag is missing, but tsconfig.json on disk
 *      does set `jsx`.
 *   2. It says a module has no such export, but the export is right there in
 *      the installed package.
 *
 * validate.js uses these to allow one retry before calling the run a failure.
 */

/**
 * Parse tsconfig.json, allowing the comments and trailing commas that are
 * legal there. Returns null if it cannot be read.
 */
// Real config files are tiny. Anything this large is not one, and stripping
// comments from it is slow, so treat it as unreadable instead.
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
  if (raw.length > MAX_TSCONFIG_STRIP_BYTES) return null;
  // Remove comments, then trailing commas. This also strips "//" inside
  // string values, which tsconfig files almost never have.
  const stripped = raw
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/,\s*([}\]])/g, "$1");
  return tryParse(stripped);
}

/** True when tsc reported the missing-jsx-flag error. */
export function hasConfigFallbackSignature(errorText) {
  return /error TS17004:|error TS6142:/.test(errorText ?? "");
}

/**
 * Error codes that mean the agent wrote a broken tsconfig, rather than broken
 * app code. Retrying will not help, because the config itself is wrong.
 *
 * These usually show up when a model copies Vite's split app/node config
 * template and gets one of the required fields wrong.
 *
 * Counted separately so a run full of scaffolding mistakes does not look the
 * same as one full of real code bugs. Keep in step with `configErrorCodes` in
 * pipeline/error-hints.js, which pairs each code with its fix.
 */
const TSCONFIG_SCAFFOLD_ERROR_CODES = [
  "TS5023",
  "TS5070",
  "TS6053",
  "TS6305",
  "TS6306",
  "TS6310",
];

/** True when the error text contains one of the broken-config codes above. */
export function isTsconfigScaffoldError(errorText) {
  const text = errorText ?? "";
  return TSCONFIG_SCAFFOLD_ERROR_CODES.some((code) => text.includes(`error ${code}:`));
}

/**
 * Pull the "module has no exported member" complaints out of tsc output.
 * Returns [{ module, member }].
 *
 * Only package imports are returned. A relative import points at the agent's
 * own files, which is a real mistake rather than a toolchain problem.
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
