/**
 * Identify the git state of a checkout the harness runs against.
 *
 * An MCP-backed arm runs the server straight from a working directory
 * (`mcp.defaultDirectory`), so its behaviour is whatever is on disk at the
 * moment the run starts — committed or not. Nothing recorded that, which made
 * "did the tooling change between these two runs?" answerable only by reading
 * commit timestamps against run directory names and guessing about
 * uncommitted work in between.
 *
 * That guessing cost real time on 2026-09-22: dsds-mcp renamed its lint tool
 * and made linting mandatory in the front-loaded brief, which roughly tripled
 * one arm's output tokens. The change was in the working tree for ~4 hours
 * before it was committed, so the commit log implied the wrong runs.
 *
 * `dirty` is the load-bearing field. A SHA alone is misleading for exactly
 * the case that caused the confusion: two runs can report the same SHA and
 * have run different code.
 */

import { execFileSync } from "node:child_process";

/**
 * Describe a checkout's git state.
 *
 * Never throws — a missing directory, a non-repository, or git not being
 * installed all return null. This is diagnostic metadata; it must not be able
 * to fail a run.
 *
 * @param {string} dir Absolute path to a git checkout.
 * @returns {{sha: string, dirty: boolean, branch: string|null, subject: string|null}|null}
 */
export function describeCheckout(dir) {
  if (!dir || typeof dir !== "string") return null;

  const git = (args) =>
    execFileSync("git", ["-C", dir, ...args], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5_000,
    }).trim();

  try {
    const sha = git(["rev-parse", "--short", "HEAD"]);
    // `--porcelain` is empty exactly when the tree matches HEAD. Untracked
    // files count: a new tool file the server would load is a real difference.
    const dirty = git(["status", "--porcelain"]).length > 0;
    let branch = null;
    let subject = null;
    try {
      branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
    } catch {
      // Detached HEAD or similar — the SHA is what matters.
    }
    try {
      subject = git(["log", "-1", "--pretty=%s"]);
    } catch {
      // Empty repository.
    }
    return { sha, dirty, branch, subject };
  } catch {
    return null;
  }
}
