import { describe, expect, it } from "vitest";
import { withLighthouseLock } from "./lighthouse.js";

const tick = () => new Promise((r) => setTimeout(r, 5));

describe("withLighthouseLock", () => {
  it("runs queued jobs one at a time, in order", async () => {
    const events = [];
    const job = (name) => async () => {
      events.push(`${name}:start`);
      await tick();
      events.push(`${name}:end`);
      return name;
    };
    const results = await Promise.all([
      withLighthouseLock(job("a")),
      withLighthouseLock(job("b")),
      withLighthouseLock(job("c")),
    ]);
    expect(results).toEqual(["a", "b", "c"]);
    // No job starts before the previous one ends.
    expect(events).toEqual(["a:start", "a:end", "b:start", "b:end", "c:start", "c:end"]);
  });

  it("does not let one job's rejection block the next", async () => {
    const failing = withLighthouseLock(async () => {
      throw new Error("boom");
    });
    const next = withLighthouseLock(async () => "ok");
    await expect(failing).rejects.toThrow("boom");
    await expect(next).resolves.toBe("ok");
  });

  it("returns the job's own value and error to its caller", async () => {
    await expect(withLighthouseLock(async () => 42)).resolves.toBe(42);
    await expect(
      withLighthouseLock(async () => {
        throw new Error("mine");
      }),
    ).rejects.toThrow("mine");
  });
});
