import { describe, expect, it } from "vitest";
import { detectFatalError, extractViteServerError } from "./validate.js";

// ---------------------------------------------------------------------------
// extractViteServerError
//
// Vite dev-server-side errors (bad import specifier, esbuild pre-transform
// failure) print only to the dev server's own stdout — the browser never
// sees them as a console/pageerror event. These tests use the actual error
// shape observed in output/2026-07-21/15.03/ui4-mcp/claude-sonnet-4-6 (see
// the "Missing specifier" investigation): the model wrote
// `import "@sanity-labs/ui-poc/styles"` (missing .css) and
// `import "@sanity-labs/ui-poc/dist/styles.css"` (wrong subpath), and Vite
// rejected both server-side while the page just silently failed to render.
// ---------------------------------------------------------------------------
describe("extractViteServerError", () => {
  it("extracts an 'Internal server error' banner with its code-frame context", () => {
    const output = [
      '3:26:50 PM [vite] Internal server error: Missing "./styles" specifier in "@sanity-labs/ui-poc" package',
      "  Plugin: vite:import-analysis",
      "  File: /project/src/main.tsx:3:7",
      '  2  |  import { StrictMode } from "react";',
      '  3  |  import { createRoot } from "react-dom/client";',
      '  4  |  import "@sanity-labs/ui-poc/styles";',
      "     |          ^",
      '  5  |  import App from "./App";',
      '  6  |  createRoot(document.getElementById("root")).render(',
      "      at e (file:///project/node_modules/vite/dist/node/chunks/dep-Dm0c1Wj2.js:12200:25)",
      "      at n (file:///project/node_modules/vite/dist/node/chunks/dep-Dm0c1Wj2.js:12200:631)",
    ].join("\n");

    const result = extractViteServerError(output);

    expect(result).toContain(
      'Internal server error: Missing "./styles" specifier in "@sanity-labs/ui-poc" package',
    );
    expect(result).toContain('import "@sanity-labs/ui-poc/styles";');
    // The noisy internal call stack must not be included.
    expect(result).not.toContain("at e (file:///");
    expect(result).not.toContain("dep-Dm0c1Wj2.js");
  });

  it("extracts a 'Pre-transform error' banner for the wrong styles.css subpath", () => {
    const output = [
      '3:27:14 PM [vite] Pre-transform error: Missing "./dist/styles.css" specifier in "@sanity-labs/ui-poc" package',
      "  Plugin: vite:import-analysis",
      "  File: /project/src/main.tsx:3:7",
      '  4  |  import "@sanity-labs/ui-poc/dist/styles.css";',
      "     |          ^",
    ].join("\n");

    const result = extractViteServerError(output);

    expect(result).toContain(
      'Pre-transform error: Missing "./dist/styles.css" specifier in "@sanity-labs/ui-poc" package',
    );
    expect(result).toContain("dist/styles.css");
  });

  it("returns null when no known Vite error banner is present", () => {
    const output = [
      "VITE v6.4.3 ready in 383 ms",
      "",
      "  ➜  Local:   http://localhost:55591/",
      "3:21:15 PM [vite] (client) hmr update /src/App.tsx",
    ].join("\n");

    expect(extractViteServerError(output)).toBeNull();
  });

  it("returns null for empty or missing input", () => {
    expect(extractViteServerError("")).toBeNull();
    expect(extractViteServerError(null)).toBeNull();
    expect(extractViteServerError(undefined)).toBeNull();
  });

  it("strips esbuild's raw ANSI color codes so the message is plain text for the model", () => {
    // Real esbuild dep-scan output — colorized banner, plugin tag, and
    // code-frame underline are all wrapped in ANSI escape sequences.
    const output =
      "\x1b[31m✘ \x1b[41;31m[\x1b[41;97mERROR\x1b[41;31m]\x1b[0m " +
      '\x1b[1mMissing "./styles" specifier in "@sanity-labs/ui-poc" package\x1b[0m ' +
      "\x1b[1m\x1b[35m[plugin vite:dep-scan]\x1b[0m\n" +
      "    src/main.tsx:3:7:\n" +
      "\x1b[37m      3 │ import \x1b[32m'@sanity-labs/ui-poc/styles'\x1b[37m\n" +
      "        ╵        \x1b[32m~~~~~~~~~~~~~~~~~~~~~~~~~~~~\x1b[0m";

    const result = extractViteServerError(output);

    expect(result).not.toMatch(/\x1b\[/);
    expect(result).toContain('Missing "./styles" specifier in "@sanity-labs/ui-poc" package');
    expect(result).toContain("import '@sanity-labs/ui-poc/styles'");
  });

  it("caps the captured block at a bounded number of lines even with no stack trace to stop at", () => {
    const noisyLines = Array.from({ length: 50 }, (_, i) => `some non-stack context line ${i}`);
    const output = ["Internal server error: something broke", ...noisyLines].join("\n");

    const result = extractViteServerError(output);
    const lineCount = result.split("\n").length;
    expect(lineCount).toBeLessThanOrEqual(10);
  });

  it("finds the first matching banner when multiple restarts repeat the same error", () => {
    // Observed in practice: HMR retries the same broken import 3-4 times
    // in a row. The first occurrence is enough signal.
    const oneError = [
      'Internal server error: Missing "./styles" specifier in "@sanity-labs/ui-poc" package',
      "  File: /project/src/main.tsx:3:7",
    ].join("\n");
    const output = [oneError, oneError, oneError].join("\n\n");

    const result = extractViteServerError(output);
    expect(result).toContain('Missing "./styles" specifier');
  });
});

// ---------------------------------------------------------------------------
// detectFatalError
// ---------------------------------------------------------------------------
describe("detectFatalError", () => {
  it("prefers browser-side fatal console errors over dev-server output", () => {
    const consoleErrors = ["does not provide an export named 'SearchIcon'"];
    const serverOutput = "Internal server error: unrelated issue";

    const result = detectFatalError(consoleErrors, false, serverOutput);

    expect(result).toContain("does not provide an export named");
    expect(result).not.toContain("unrelated issue");
  });

  it("falls back to the Vite server error when nothing rendered and no browser error matched", () => {
    const serverOutput = [
      'Internal server error: Missing "./styles" specifier in "@sanity-labs/ui-poc" package',
      "  File: /project/src/main.tsx:3:7",
    ].join("\n");

    const result = detectFatalError([], false, serverOutput);

    expect(result).toContain('Missing "./styles" specifier in "@sanity-labs/ui-poc" package');
  });

  it("falls back to the generic message when nothing rendered and no error is found anywhere", () => {
    const result = detectFatalError([], false, "VITE v6.4.3 ready in 383 ms");
    expect(result).toBe("Page did not render any visible content within the timeout period");
  });

  it("returns null when the page rendered, regardless of server output", () => {
    const serverOutput = "Internal server error: this happened earlier but the page still mounted";
    expect(detectFatalError([], true, serverOutput)).toBeNull();
  });

  // Regression: a "successful" render can still be a completely broken app —
  // some library's own graceful-degradation message (e.g. @sanity/ui's
  // ThemeProvider on a missing `theme` prop) rendered as ordinary page text,
  // no thrown error, no console output. `rendered=true` alone can't catch
  // this; see `detectRenderFailureSignature` (2026-07-25).
  it("treats a rendered page matching a renderFailureSignature as fatal", () => {
    const bodyText = 'ThemeProvider: no "theme" property provided';
    const signatures = [/ThemeProvider:\s*no\s*"?theme"?\s*property\s*provided/i];
    const result = detectFatalError([], true, "", bodyText, signatures);
    expect(result).toContain("known failure signature");
    expect(result).toContain("ThemeProvider");
  });

  it("does not flag a normal render when no signature is configured", () => {
    const bodyText = 'ThemeProvider: no "theme" property provided';
    expect(detectFatalError([], true, "", bodyText, [])).toBeNull();
    expect(detectFatalError([], true, "", bodyText)).toBeNull();
  });

  it("does not flag a real app just because it renders unrelated text", () => {
    const bodyText = "Welcome to the dashboard. Total users: 1,204.";
    const signatures = [/ThemeProvider:\s*no\s*"?theme"?\s*property\s*provided/i];
    expect(detectFatalError([], true, "", bodyText, signatures)).toBeNull();
  });

  it("accepts a plain string signature (compiled as a case-insensitive regex)", () => {
    const bodyText = "Something Went Wrong — please refresh";
    const result = detectFatalError([], true, "", bodyText, ["something went wrong"]);
    expect(result).toContain("known failure signature");
  });
});
