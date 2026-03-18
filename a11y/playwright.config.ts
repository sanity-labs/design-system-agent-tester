import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: path.join(__dirname, "tests"),
  outputDir: path.join(__dirname, "..", "dist", "a11y", "results"),

  // Each test starts/stops a dev server sequentially — parallel runs would
  // fight over ports and overwhelm the machine with concurrent Vite builds.
  fullyParallel: false,
  workers: 1,

  // Projects need npm install + Vite dev server startup, which can be slow.
  timeout: 120_000,

  expect: {
    timeout: 15_000,
  },

  // No retries — a11y violations are deterministic, not flaky.
  retries: 0,

  reporter: [
    ["list"],
    [
      "html",
      {
        outputFolder: path.join(__dirname, "..", "dist", "a11y", "report"),
        open: "never",
      },
    ],
  ],

  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      testMatch: ["**/*.test.ts"],
      use: {
        browserName: "chromium",
        // Match the viewport used by screenshot.js for consistency
        viewport: { width: 1440, height: 900 },
      },
    },
  ],

  // No webServer — the test discovers and starts each project's dev server itself.
});
