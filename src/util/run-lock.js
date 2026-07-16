/**
 * Machine-level run lock.
 *
 * Two harness runs sharing one machine invalidate each other's numbers:
 * parallel npm installs, two dev servers, and doubled CPU load widen the
 * install/typecheck race window and skew Lighthouse. (Runs 2026-07-03/16.33
 * and 16.36 ran concurrently; 16.33's build failures were dominated by
 * toolchain flakes.) This lock makes that collision impossible: the second
 * run refuses to start, naming the run that owns the machine.
 *
 * Mechanics: `mkdir` without `recursive` is the atomic primitive (EEXIST on
 * contention — same pattern as buildTimestampedRunPath). The lock directory
 * holds an owner.json with the owner's PID; a lock whose PID is no longer
 * alive is stale and gets stolen. Release happens on normal exit and on
 * SIGINT/SIGTERM via handlers registered at acquire time.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_LOCK_DIR = join(homedir(), ".agent-tester", "run.lock");

let held = null; // { lockDir } while this process owns the lock

function ownerOf(lockDir) {
  try {
    return JSON.parse(readFileSync(join(lockDir, "owner.json"), "utf-8"));
  } catch {
    return null; // unreadable owner file — treat as stale
  }
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0); // signal 0 = existence probe
    return true;
  } catch (err) {
    return err.code === "EPERM"; // exists but not ours; anything else = dead
  }
}

function tryMkdir(lockDir) {
  try {
    mkdirSync(lockDir, { recursive: false });
    return true;
  } catch (err) {
    if (err.code === "EEXIST") return false;
    if (err.code === "ENOENT") {
      // Parent (~/.agent-tester) missing — create it, then retry once.
      mkdirSync(join(lockDir, ".."), { recursive: true });
      return tryMkdir(lockDir);
    }
    throw err;
  }
}

/**
 * Acquire the machine lock or throw with a message naming the owner.
 * `info` (e.g. { runDir }) is recorded for the refusal message of any
 * would-be second run.
 */
export function acquireRunLock(info = {}, lockDir = DEFAULT_LOCK_DIR) {
  if (held) return; // idempotent within a process

  if (!tryMkdir(lockDir)) {
    const owner = ownerOf(lockDir);
    if (owner && pidAlive(owner.pid)) {
      throw new Error(
        `Another agent-tester run is active on this machine ` +
          `(pid ${owner.pid}${owner.runDir ? `, output ${owner.runDir}` : ""}, started ${owner.startedAt ?? "?"}).\n` +
          `Concurrent runs contend for CPU/npm/dev-server resources and invalidate each other's measurements.\n` +
          `Wait for it to finish (or kill it), then re-run. Stale locks from dead processes are stolen automatically.`,
      );
    }
    // Stale (dead PID or unreadable owner) — steal it.
    rmSync(lockDir, { recursive: true, force: true });
    if (!tryMkdir(lockDir)) {
      throw new Error(
        `Lost the race for ${lockDir} while stealing a stale lock — another run just started.`,
      );
    }
  }

  writeFileSync(
    join(lockDir, "owner.json"),
    JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), ...info }, null, 2),
    "utf-8",
  );
  held = { lockDir };

  process.once("exit", releaseRunLock);
  for (const sig of ["SIGINT", "SIGTERM"]) {
    process.once(sig, () => {
      releaseRunLock();
      process.exit(sig === "SIGINT" ? 130 : 143);
    });
  }
}

/** Release the lock if this process owns it. Safe to call repeatedly. */
export function releaseRunLock() {
  if (!held) return;
  const owner = ownerOf(held.lockDir);
  // Only remove a lock we actually own — a stale-steal by another process
  // must not be clobbered by our exit handler.
  if (!owner || owner.pid === process.pid) {
    rmSync(held.lockDir, { recursive: true, force: true });
  }
  held = null;
}
