#!/usr/bin/env node
/**
 * clean-output.js — Recursively delete every `node_modules` directory
 * under `output/`.
 *
 * Each iteration in `output/<date>/<time>/<test>/iteration-N/project/`
 * has its own `node_modules`, typically 150–300 MB. Across hundreds of
 * iterations that adds up fast. This script reclaims that disk space
 * without touching reports, screenshots, _meta.json, or any other
 * artifact the harness produces.
 *
 * Usage:
 *   npm run clean-output                # delete after listing
 *   npm run clean-output -- --dry-run   # just list, don't delete
 *
 * Safe to run repeatedly. The harness recreates `node_modules` when
 * the next run needs them.
 */
import { readdir, rm } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");
const OUTPUT_DIR = resolve(PROJECT_ROOT, "output");

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(`
clean-output — Reclaim disk space by deleting every \`node_modules\`
directory under \`output/\`.

Usage:
  npm run clean-output                # delete after listing
  npm run clean-output -- --dry-run   # just list, don't delete

Scans recursively but never descends into a \`node_modules\` once
found. Other artifacts (screenshots, _meta.json, reports, etc.) are
left alone.
`);
  process.exit(0);
}

/**
 * Walk `dir`, collecting every `node_modules` directory. Does not
 * descend into a `node_modules` once found — that's both faster and
 * safer (no risk of accidentally counting nested node_modules of
 * deps that don't yet exist as their own deletion target).
 */
async function findNodeModules(dir, results = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return results;
    throw err;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const child = join(dir, entry.name);
    if (entry.name === "node_modules") {
      results.push(child);
    } else {
      await findNodeModules(child, results);
    }
  }
  return results;
}

/**
 * Total size of a directory in bytes, via `du -sk` (kilobytes).
 *
 * Pure-Node recursive stat() is ~10–50× slower than `du` on real
 * node_modules trees (millions of small files). For 1000+
 * node_modules the difference is "seconds" vs "tens of minutes" so
 * we shell out. POSIX-only — fine for the macOS / Linux dev hosts
 * this harness targets.
 */
function dirSize(p) {
  return new Promise((resolveSize) => {
    const proc = spawn("du", ["-sk", p], { stdio: ["ignore", "pipe", "ignore"] });
    let buf = "";
    proc.stdout.on("data", (chunk) => (buf += chunk.toString()));
    proc.on("close", () => {
      const kb = parseInt(buf.split(/\s+/, 1)[0], 10);
      resolveSize(Number.isFinite(kb) ? kb * 1024 : 0);
    });
    proc.on("error", () => resolveSize(0));
  });
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const found = await findNodeModules(OUTPUT_DIR);

if (found.length === 0) {
  console.log(`No node_modules directories found under ${OUTPUT_DIR}.`);
  process.exit(0);
}

console.log(
  `Found ${found.length} node_modules directories under output/. Measuring…`,
);

// Size with bounded parallelism. 16 concurrent `du` calls keeps the
// machine busy without hammering the filesystem.
const CONCURRENCY = 16;
const rows = new Array(found.length);
let next = 0;
let total = 0;
async function worker() {
  while (true) {
    const i = next++;
    if (i >= found.length) return;
    const p = found[i];
    const size = await dirSize(p);
    rows[i] = { p, size };
    total += size;
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// Sort biggest first so the worst offenders are visible at a glance.
rows.sort((a, b) => b.size - a.size);
for (const { p, size } of rows) {
  console.log(`  ${formatBytes(size).padStart(10)}  ${p}`);
}

console.log(
  `\nTotal: ${formatBytes(total)} across ${found.length} directories.`,
);

if (values["dry-run"]) {
  console.log("(dry-run — nothing was deleted)");
  process.exit(0);
}

console.log("Deleting…");
let deleted = 0;
for (const { p } of rows) {
  try {
    await rm(p, { recursive: true, force: true });
    deleted++;
  } catch (err) {
    console.warn(`  failed: ${p} (${err.message})`);
  }
}
console.log(
  `Done. Deleted ${deleted}/${rows.length} directories. Freed ~${formatBytes(total)}.`,
);
