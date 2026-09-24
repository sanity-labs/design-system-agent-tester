/**
 * Shared maths for the reporting layer.
 *
 * The one place mean, stdDev, sum, min, max, round and the Jaccard helpers
 * are defined. They used to be duplicated across report.js and aggregate.js
 * with slightly different rules for empty input, so the same run could be
 * summarised two different ways.
 */

/** Keep only finite numbers from an array. */
function finite(arr) {
  return arr.filter((x) => typeof x === "number" && Number.isFinite(x));
}

/** Arithmetic mean of the finite values, or null if there are none. */
export function mean(arr) {
  const valid = finite(arr);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/** Sum of the finite values. Empty → 0 (a sum is a count, not an average). */
export function sum(arr) {
  return finite(arr).reduce((a, b) => a + b, 0);
}

/**
 * Standard deviation. Needs at least two values to mean anything, so fewer
 * returns null.
 */
export function stdDev(arr) {
  const valid = finite(arr);
  if (valid.length < 2) return null;
  const m = valid.reduce((a, b) => a + b, 0) / valid.length;
  const variance = valid.reduce((acc, x) => acc + (x - m) ** 2, 0) / valid.length;
  return Math.sqrt(variance);
}

/** Smallest finite value, or null if there are none. */
export function minVal(arr) {
  const valid = finite(arr);
  return valid.length ? Math.min(...valid) : null;
}

/** Largest finite value, or null if there are none. */
export function maxVal(arr) {
  const valid = finite(arr);
  return valid.length ? Math.max(...valid) : null;
}

/**
 * Round to `decimals` places. Anything that is not a number becomes null,
 * so a report shows a dash rather than the word NaN.
 */
export function round(n, decimals = 3) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

/**
 * Mean of the numbers, rounded. Returns null for empty input, so callers do
 * not have to check first.
 */
export function roundedMean(arr, decimals = 3) {
  return round(mean(arr), decimals);
}

/**
 * Break a string into overlapping character runs, for the code-variance
 * metric.
 */
export function ngramSet(text, n) {
  const set = new Set();
  const normalized = text.replace(/\s+/g, " ").trim();
  for (let i = 0; i <= normalized.length - n; i++) {
    set.add(normalized.substring(i, i + n));
  }
  return set;
}

/** Jaccard similarity between two sets: |A∩B| / |A∪B|. */
export function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}
