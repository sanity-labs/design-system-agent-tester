#!/usr/bin/env node
/**
 * clean-diff-images.js — Delete visual-diff PNGs from `output/`.
 *
 * The harness emits one `diff_iter<N>_vs_iter<M>.png` per pair of
 * iterations under each prompt's directory (see
 * `src/evaluation/visual-diff.js`). For an N-iteration run that's
 * N(N-1)/2 PNGs per test × however many tests ran. They're useful
 * during a review of one specific run but accumulate fast across
 * historical runs. This script reclaims that space without touching
 * the original screenshots (`screenshot-*.png`) or anything else.
 *
 * Usage:
 *   npm run clean-diff-images                # delete after listing
 *   npm run clean-diff-images -- --dry-run   # just list, don't delete
 */
import { readdir, stat, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");
const OUTPUT_DIR = resolve(PROJECT_ROOT, "output");

// Match exactly the harness's diff output naming:
//   diff_iter1_vs_iter2.png, diff_iter2_vs_iter5.png, …
// Stricter than `diff_*.png` so an unrelated file that happens to
// start with `diff_` doesn't get caught up.
const DIFF_RE = /^diff_iter\d+_vs_iter\d+\.png$/;

const { values } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
});

if (values.help) {
  console.log(`
clean-diff-images — Delete \`diff_iter<N>_vs_iter<M>.png\` files
under \`output/\`.

Usage:
  npm run clean-diff-images                # delete after listing
  npm run clean-diff-images -- --dry-run   # just list, don't delete

The original \`screenshot-*.png\` captures are not touched.
`);
  process.exit(0);
}

/**
 * Walk recursively, collecting files whose basename matches DIFF_RE.
 * Skips `node_modules` because the harness never puts diff images
 * there anyway and walking into one would waste a lot of time.
 */
async function findDiffImages(dir, results = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return results;
    throw err;
  }
  for (const entry of entries) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      await findDiffImages(child, results);
    } else if (entry.isFile() && DIFF_RE.test(entry.name)) {
      results.push(child);
    }
  }
  return results;
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const found = await findDiffImages(OUTPUT_DIR);

if (found.length === 0) {
  console.log(`No diff images found under ${OUTPUT_DIR}.`);
  process.exit(0);
}

// stat() each file in parallel — they're individual files, fast.
let total = 0;
await Promise.all(
  found.map(async (p) => {
    try {
      const s = await stat(p);
      total += s.size;
    } catch {
      // file may have vanished between find and stat; ignore.
    }
  }),
);

console.log(`Found ${found.length} diff images totaling ${formatBytes(total)}.`);

if (values["dry-run"]) {
  // Show a sample so the user can sanity-check the regex.
  console.log("\nSample paths:");
  for (const p of found.slice(0, 5)) console.log(`  ${p}`);
  if (found.length > 5) console.log(`  … (${found.length - 5} more)`);
  console.log("\n(dry-run — nothing was deleted)");
  process.exit(0);
}

console.log("Deleting…");
let deleted = 0;
await Promise.all(
  found.map(async (p) => {
    try {
      await unlink(p);
      deleted++;
    } catch (err) {
      console.warn(`  failed: ${p} (${err.message})`);
    }
  }),
);
console.log(`Done. Deleted ${deleted}/${found.length} files. Freed ~${formatBytes(total)}.`);
