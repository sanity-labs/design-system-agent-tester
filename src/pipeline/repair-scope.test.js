import { describe, expect, it } from "vitest";
import { guardRepairScope } from "./runner-api.js";

const existing = new Set([
  "package.json",
  "tsconfig.json",
  "vite.config.ts",
  "index.html",
  "src/main.tsx",
  "src/App.tsx",
]);
const f = (path) => ({ path, content: "x" });

describe("guardRepairScope", () => {
  it("drops scaffold rewrites from a post-render repair", () => {
    // The measured failure: a jev fix asked to change one file re-emitted 15,
    // including every scaffold file, and broke the build.
    const { kept, dropped } = guardRepairScope(
      [
        f("package.json"),
        f("tsconfig.json"),
        f("vite.config.ts"),
        f("index.html"),
        f("src/main.tsx"),
        f("src/App.tsx"),
      ],
      "jev",
      existing,
    );
    expect(kept.map((x) => x.path)).toEqual(["src/App.tsx"]);
    expect(dropped).toHaveLength(5);
  });

  it("guards lint and accessibility the same way", () => {
    for (const stage of ["lint", "accessibility"]) {
      const { kept, dropped } = guardRepairScope(
        [f("package.json"), f("src/App.tsx")],
        stage,
        existing,
      );
      expect(kept.map((x) => x.path)).toEqual(["src/App.tsx"]);
      expect(dropped).toEqual(["package.json"]);
    }
  });

  it("leaves build repairs alone — they may genuinely need package.json", () => {
    const parsed = [f("package.json"), f("src/App.tsx")];
    const { kept, dropped } = guardRepairScope(parsed, "build", existing);
    expect(kept).toEqual(parsed);
    expect(dropped).toEqual([]);
  });

  it("allows a scaffold file that does not exist yet — creating is not rewriting", () => {
    const { kept, dropped } = guardRepairScope([f("tsconfig.node.json")], "lint", existing);
    expect(kept.map((x) => x.path)).toEqual(["tsconfig.node.json"]);
    expect(dropped).toEqual([]);
  });

  it("passes ordinary source through untouched", () => {
    const parsed = [f("src/App.tsx"), f("src/components/Card.tsx")];
    expect(guardRepairScope(parsed, "jev", existing).kept).toEqual(parsed);
  });
});
