/**
 * The readiness banner is parsed, not just logged.
 *
 * Vite splits it with SGR escapes when colour is on — and colour is on
 * whenever `FORCE_COLOR` is set in the environment, which is true of most
 * agent and CI shells and is inherited by the spawned dev server. The raw
 * bytes are `ready in \x1b[0m\x1b[1m89\x1b[22m ms` and
 * `localhost:\x1b[1m5173`, so a pattern written against the rendered text
 * matches neither.
 *
 * The symptom is expensive and does not look like a harness bug: every
 * iteration times out after 30s, the agent is told its app would not start,
 * and it spends its whole fix budget removing dependencies that were never
 * the problem. Observed across 57 iterations of one run before anyone noticed
 * that the dev-server log said "ready in 89 ms" the whole time.
 */

import { describe, expect, it } from "vitest";

const stripAnsi = (text) => text.replace(/\x1b\[[0-9;]*m/g, "");
const readyPattern = (port) =>
  new RegExp(`https?:\\/\\/localhost:${port}\\b|ready in \\d+\\s*ms`, "i");

// Verbatim from a Vite 7.3.6 run with FORCE_COLOR=3.
const COLOURED =
  "\n  \x1b[32m\x1b[1mVITE\x1b[22m v7.3.6\x1b[39m  \x1b[2mready in \x1b[0m\x1b[1m89\x1b[22m\x1b[2m\x1b[0m ms\x1b[22m\n" +
  "  \x1b[32m➜\x1b[39m  \x1b[1mLocal\x1b[22m:   \x1b[36mhttp://localhost:\x1b[1m37695\x1b[22m/\x1b[39m\n";

const PLAIN = "\n  VITE v7.3.6  ready in 93 ms\n  ➜  Local:   http://localhost:37695/\n";

describe("dev server readiness", () => {
  it("does not match the coloured banner without stripping — the bug", () => {
    expect(readyPattern(37695).test(COLOURED)).toBe(false);
  });

  it("matches the coloured banner once escapes are stripped", () => {
    expect(readyPattern(37695).test(stripAnsi(COLOURED))).toBe(true);
  });

  it("still matches a plain banner", () => {
    expect(readyPattern(37695).test(stripAnsi(PLAIN))).toBe(true);
  });

  it("does not match a different port", () => {
    expect(readyPattern(41369).test(stripAnsi("  Local: http://localhost:37695/"))).toBe(false);
  });

  it("matches on the `ready in` half alone, whatever the port", () => {
    expect(readyPattern(9999).test(stripAnsi(COLOURED))).toBe(true);
  });
});
