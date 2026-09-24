/**
 * Machine-level run lock.
 *
 * Two runs on one machine spoil each other's numbers: parallel installs,
 * two dev servers and double the CPU load widen the timing gaps that cause
 * flaky failures and skew the performance results. This makes that
 * impossible. The second run refuses to start and names the run that
 * already holds the machine.
 *
 * How it works: creating a directory either succeeds or fails, and cannot
 * half-happen, which makes it a safe way to claim the lock. The directory
 * holds the owning process ID. A lock whose process is gone is treated as
 * stale and taken over.
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
