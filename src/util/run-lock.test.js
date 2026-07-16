import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { acquireRunLock, releaseRunLock } from "./run-lock.js";

let base;
const lockDir = () => join(base, "run.lock");

afterEach(() => {
  releaseRunLock();
  if (base) rmSync(base, { recursive: true, force: true });
  base = null;
});

function freshBase() {
  base = mkdtempSync(join(tmpdir(), "run-lock-"));
  return lockDir();
}

describe("acquireRunLock", () => {
  it("acquires and releases", () => {
    const dir = freshBase();
    acquireRunLock({ runDir: "2026-07-04/10.00" }, dir);
    releaseRunLock();
    // Releasing frees the lock for the next acquire.
    acquireRunLock({}, dir);
  });

  it("refuses while a live process holds the lock", () => {
    const dir = freshBase();
    mkdirSync(dir, { recursive: true });
    // Our own PID is definitionally alive.
    writeFileSync(
      join(dir, "owner.json"),
      JSON.stringify({ pid: process.pid, startedAt: "x", runDir: "other-run" }),
    );
    expect(() => acquireRunLock({}, dir)).toThrow(/Another agent-tester run is active/);
  });

  it("steals a stale lock from a dead PID", () => {
    const dir = freshBase();
    mkdirSync(dir, { recursive: true });
    // PID 1 exists but is not ours (EPERM → alive) on unix; use an absurd PID
    // that cannot exist instead.
    writeFileSync(join(dir, "owner.json"), JSON.stringify({ pid: 2 ** 30, startedAt: "x" }));
    acquireRunLock({}, dir); // steals without throwing
  });

  it("steals a lock with an unreadable owner file", () => {
    const dir = freshBase();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "owner.json"), "not json");
    acquireRunLock({}, dir);
  });
});
