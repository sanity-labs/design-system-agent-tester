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

// Regression guard for a real deadlock. On 2026-09-14 a run stalled with all
// five worker slots waiting on this queue: one measurement stopped responding,
// and because the queue had no time limit, nothing behind it ever ran. Twenty
// minutes of work finished, then the run sat idle for over half an hour.
describe("withLighthouseLock — a job that never finishes", () => {
  it("abandons it and lets the next job run", async () => {
    const order = [];
    // Never settles, standing in for a measurement whose browser stopped
    // replying.
    const stuck = withLighthouseLock(() => new Promise(() => {}), 50);
    const next = withLighthouseLock(async () => {
      order.push("next");
      return "done";
    });

    await expect(stuck).rejects.toThrow(/timed out after 50ms/);
    await expect(next).resolves.toBe("done");
    expect(order).toEqual(["next"]);
  });

  it("keeps the queue usable for everything that follows", async () => {
    await expect(withLighthouseLock(() => new Promise(() => {}), 20)).rejects.toThrow(/timed out/);
    for (const n of [1, 2, 3]) {
      await expect(withLighthouseLock(async () => n)).resolves.toBe(n);
    }
  });

  // The timeout has to leave the queue in a good state, not just reject once.
  it("still runs jobs in order after abandoning one", async () => {
    const order = [];
    await expect(withLighthouseLock(() => new Promise(() => {}), 20)).rejects.toThrow(/timed out/);
    const jobs = [1, 2, 3].map((n) =>
      withLighthouseLock(async () => {
        order.push(`start-${n}`);
        await new Promise((r) => setTimeout(r, 5));
        order.push(`end-${n}`);
      }),
    );
    await Promise.all(jobs);
    expect(order).toEqual(["start-1", "end-1", "start-2", "end-2", "start-3", "end-3"]);
  });
});
