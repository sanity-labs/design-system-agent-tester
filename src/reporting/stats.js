/**
 * Shared statistics primitives for the reporting layer.
 *
 * This is the single source of truth for mean / stdDev / sum / min / max /
 * round and the n-gram Jaccard helpers. Before this module, `report.js` and
 * `aggregate.js` each defined their own `mean`/`stdDev` with conflicting
 * empty-input semantics (0 vs null) and one variant that did NOT filter
 * non-finite values — so a single missing metric poisoned the whole average
 * with NaN, which then rendered literally as "NaN" in the report.
 *
 * The rules here:
 *   - All reducers IGNORE non-finite entries (null / undefined / NaN).
 *   - An average / spread with no usable data is `null` (renders as "—"),
 *     never 0 (which reads as a real measurement of zero).
 *   - `sum` of nothing is 0 (a count, not an average).
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
 * Population standard deviation of the finite values. Needs at least two
 * data points to be meaningful — fewer returns null.
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
 * Round to `decimals` places. Non-finite input (null / undefined / NaN)
 * returns null so it renders as "—" and never leaks the literal "NaN"
 * into a report (and `JSON.stringify` keeps it as null, not silently
 * dropping a NaN to null only in JSON).
 */
export function round(n, decimals = 3) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}

/**
 * Mean of the finite values, rounded. Empty/all-non-finite → null (because
 * `mean` returns null and `round` passes null through). Saves callers the
 * `arr.length ? round(mean(arr)) : null` dance.
 */
export function roundedMean(arr, decimals = 3) {
  return round(mean(arr), decimals);
}

/**
 * Build a set of character n-grams from a string (whitespace collapsed).
 * Used by the code-variance metric.
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
