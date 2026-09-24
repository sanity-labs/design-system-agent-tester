import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { writeProjectFiles } from "./shared.js";

// Repair turns emit only the files they change. Clearing the project before
// writing them deleted everything else mid-turn (2026-09-23 runs).
describe("writeProjectFiles", () => {
  function project() {
    const dir = mkdtempSync(join(tmpdir(), "wpf-"));
    mkdirSync(join(dir, "src"));
    writeFileSync(join(dir, "package.json"), "{}");
    writeFileSync(join(dir, "src/App.tsx"), "old app");
    return dir;
  }

  it("clears the project by default (first generation)", async () => {
    const dir = project();
    await writeProjectFiles(dir, [{ path: "src/New.tsx", content: "new" }]);
    expect(existsSync(join(dir, "package.json"))).toBe(false);
  });

  it("overlays with clear: false and keeps every unchanged file", async () => {
    const dir = project();
    await writeProjectFiles(dir, [{ path: "src/App.tsx", content: "fixed app" }], { clear: false });
    expect(readFileSync(join(dir, "src/App.tsx"), "utf-8")).toBe("fixed app");
    expect(existsSync(join(dir, "package.json"))).toBe(true);
  });

  it("skips a file block whose path is a directory instead of throwing EISDIR", async () => {
    const dir = project();
    await expect(
      writeProjectFiles(
        dir,
        [
          { path: "src", content: "x" },
          { path: "src/B.tsx", content: "b" },
        ],
        { clear: false },
      ),
    ).resolves.toBeUndefined();
    expect(readFileSync(join(dir, "src/B.tsx"), "utf-8")).toBe("b");
  });
});
