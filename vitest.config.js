import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
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
