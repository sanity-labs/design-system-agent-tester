import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run the suite against the example config so `npm test` is
    // deterministic on fresh clones and CI, where the personal
    // `agent-tester.config.js` (gitignored) doesn't exist.
    env: {
      AGENT_TESTER_CONFIG: "agent-tester.config.example.js",
    },
    include: ["src/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.js"],
      exclude: [
        "src/scripts/**",
        "src/**/*.test.js",
      ],
    },
  },
});
