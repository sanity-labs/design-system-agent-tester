import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildFixPrompt, resolveWithinProject } from "./shared.js";

// ─── resolveWithinProject ────────────────────────────────────────────

describe("resolveWithinProject", () => {
  const projectDir = resolve("/tmp/at-project");

  it("resolves paths inside the project directory", () => {
    expect(resolveWithinProject(projectDir, "src/App.jsx")).toBe(
      resolve(projectDir, "src/App.jsx"),
    );
  });

  it("allows `..` segments that stay inside the project", () => {
    expect(resolveWithinProject(projectDir, "src/../App.jsx")).toBe(resolve(projectDir, "App.jsx"));
  });

  it("throws on traversal outside the project directory", () => {
    expect(() => resolveWithinProject(projectDir, "../../etc/passwd")).toThrow(
      /outside the project directory/,
    );
  });

  it("throws on absolute paths outside the project directory", () => {
    expect(() => resolveWithinProject(projectDir, "/etc/passwd")).toThrow(
      /outside the project directory/,
    );
  });

  it("does not treat a sibling directory with a shared prefix as inside", () => {
    expect(() => resolveWithinProject(projectDir, `..${sep}at-project-evil${sep}x.js`)).toThrow(
      /outside the project directory/,
    );
  });
});

// ─── resolveWithinProject: symlink-aware containment (P3) ─────────────

describe("resolveWithinProject rejects symlink escapes", () => {
  let root;
  let outside;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "at-proj-"));
    outside = mkdtempSync(join(tmpdir(), "at-secret-"));
    writeFileSync(join(outside, ".env"), "SECRET=1");
    // Simulate `npm install` materializing a `file:` dependency as a
    // symlink under node_modules that points outside the sandbox.
    mkdirSync(join(root, "node_modules"), { recursive: true });
    symlinkSync(outside, join(root, "node_modules", "esc"), "dir");
  });

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  });

  it("throws when a path resolves through a symlinked ancestor to outside the project", () => {
    expect(() => resolveWithinProject(root, "node_modules/esc/.env")).toThrow(
      /via symlink|outside the project directory/,
    );
    expect(() => resolveWithinProject(root, "node_modules/esc/planted.js")).toThrow(
      /via symlink|outside the project directory/,
    );
  });

  it("still resolves legitimate in-project paths (root canonicalized)", () => {
    // macOS tmpdir is under a symlinked /var → /private/var; the check must
    // canonicalize the root too so this does not falsely trip.
    expect(resolveWithinProject(root, "src/App.tsx")).toBe(resolve(root, "src/App.tsx"));
  });
});

// ─── buildFixPrompt ──────────────────────────────────────────────────

describe("buildFixPrompt", () => {
  it("includes current files text and a call to action", () => {
    const prompt = buildFixPrompt("--- app.tsx ---\nconsole.log('hi')\n--- end ---", [], null);
    expect(prompt).toContain("--- app.tsx ---");
    expect(prompt).toContain("console.log('hi')");
    expect(prompt).toContain("## Current Project Files");
    expect(prompt).toContain("Fix all errors");
  });

  it("includes a fatal error when provided", () => {
    const prompt = buildFixPrompt("files", [], "TypeError: cannot read undefined");
    expect(prompt).toContain("**Fatal error (app did not mount):**");
    expect(prompt).toContain("TypeError: cannot read undefined");
  });

  it("does not include fatal error section when fatalError is null", () => {
    const prompt = buildFixPrompt("files", [], null);
    expect(prompt).not.toContain("Fatal error");
  });

  it("filters console errors to the most relevant ones", () => {
    const consoleErrors = [
      "[pageerror] Uncaught ReferenceError: foo is not defined",
      "some random log message",
      "Failed to fetch resource",
      "SyntaxError: Unexpected token '<'",
      "does not provide an export named 'Box'",
      "Cannot read properties of undefined (reading 'map')",
    ];

    const prompt = buildFixPrompt("files", consoleErrors, null);
    // Relevant errors should all appear (they match the filter)
    expect(prompt).toContain("[pageerror]");
    expect(prompt).toContain("Failed to");
    expect(prompt).toContain("SyntaxError");
    expect(prompt).toContain("does not provide an export");
    expect(prompt).toContain("Cannot read properties");
    // The non-matching line should NOT appear because relevantErrors was non-empty
    expect(prompt).not.toContain("some random log message");
  });

  it("falls back to first 5 errors when none match the relevance filter", () => {
    const consoleErrors = [
      "Warning: componentDidMount is deprecated",
      "Info: dev tools initialized",
      "Debug: render cycle complete",
      "Log: state updated",
      "Notice: feature flag enabled",
      "Trace: event fired",
    ];

    const prompt = buildFixPrompt("files", consoleErrors, null);
    // First 5 should appear
    expect(prompt).toContain("Warning: componentDidMount is deprecated");
    expect(prompt).toContain("Notice: feature flag enabled");
    // 6th should not
    expect(prompt).not.toContain("Trace: event fired");
  });

  it("handles empty console errors array", () => {
    const prompt = buildFixPrompt("files", [], null);
    expect(prompt).toContain("## Errors");
    // Should not contain the console errors heading
    expect(prompt).not.toContain("**Browser console errors:**");
  });

  it("handles both fatal error and console errors together", () => {
    const prompt = buildFixPrompt(
      "files",
      ["[pageerror] ReferenceError: x is not defined"],
      "App failed to mount: root element not found",
    );
    expect(prompt).toContain("**Fatal error (app did not mount):**");
    expect(prompt).toContain("App failed to mount: root element not found");
    expect(prompt).toContain("**Browser console errors:**");
    expect(prompt).toContain("[pageerror] ReferenceError: x is not defined");
  });
});
