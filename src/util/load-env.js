import { existsSync, readFileSync } from "node:fs";

/**
 * Minimal .env loader. Node's `--env-file` parser is stricter than a shell and
 * silently leaves some keys unset, so we parse the file ourselves and fill any
 * variable that is unset OR empty in the environment. A non-empty value already
 * present (exported by the shell or `--env-file`) always wins; an exported but
 * empty value (`FOO=`) is treated as unset and filled from the file.
 */
export function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf-8").split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    let [, key, val] = m;
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined || process.env[key] === "") process.env[key] = val;
  }
}

/**
 * Exit with a clear message if the Anthropic API key isn't set. Call after
 * `loadEnvFile` so a key in `.env` counts. The harness only supports the
 * Anthropic SDK, so a missing key can never produce a useful run.
 */
export function requireApiKey() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      "Error: ANTHROPIC_API_KEY is not set. Add it to .env or export it in your shell.",
    );
    process.exit(1);
  }
}
