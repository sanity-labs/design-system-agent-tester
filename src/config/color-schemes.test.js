/**
 * `measure.colorSchemes` — a per-test override for which color schemes the
 * two browser passes measure.
 *
 * The default-path assertion lives in prompts.test.js, which runs against the
 * example tests and can only ever see the default. This file builds a
 * throwaway tests directory so the override and the rejection are exercised
 * for real: without it, "the field is threaded through normalise()" is all
 * that is proven, and a field that normalises correctly and is then ignored
 * by the browser passes that bar.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let root;

/** Write a throwaway harness config plus one test directory, and load it. */
function loadWith(measureBlock) {
  const testsDir = join(root, "tests");
  const testDir = join(testsDir, "probe");
  mkdirSync(testDir, { recursive: true });
  writeFileSync(join(testDir, "system.md"), "You are a frontend developer.");
  writeFileSync(join(testDir, "user.md"), "{{brief}}");
  writeFileSync(
    join(testDir, "config.js"),
    `export default {
  label: "probe",
  packages: { ui: { name: "probe-ui", version: "latest" } },
  ${measureBlock}
  prompts: { system: "system.md", user: "user.md" },
};\n`,
  );

  const configPath = join(root, "agent-tester.config.js");
  writeFileSync(
    configPath,
    `export default { name: "Probe", appRootSelectors: ["#root"], testsDir: ${JSON.stringify(testsDir)} };\n`,
  );

  vi.resetModules();
  vi.stubEnv("AGENT_TESTER_CONFIG", configPath);
  // A literal specifier: Vite refuses to resolve a dynamic import with an
  // interpolated query, and the resulting error message happens to contain
  // the word this file greps for — so a broken import would read as a pass.
  return import("./prompts.js");
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), "agent-tester-schemes-"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(root, { recursive: true, force: true });
});

describe("measure.colorSchemes", () => {
  it("defaults to both schemes when the test says nothing", async () => {
    const { getTest } = await loadWith("");
    expect(getTest("probe").measure.colorSchemes).toEqual(["light", "dark"]);
  });

  it("carries a light-only selection through to the normalised test", async () => {
    const { getTest } = await loadWith(`measure: { colorSchemes: ["light"] },`);
    expect(getTest("probe").measure.colorSchemes).toEqual(["light"]);
  });

  it("rejects an empty selection rather than measuring nothing", async () => {
    await expect(loadWith(`measure: { colorSchemes: [] },`)).rejects.toThrow(/colorSchemes/);
  });

  it("rejects a scheme the browser has no media value for", async () => {
    await expect(loadWith(`measure: { colorSchemes: ["sepia"] },`)).rejects.toThrow(
      /colorSchemes/,
    );
  });
});
