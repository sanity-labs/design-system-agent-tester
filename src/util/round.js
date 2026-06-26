/**
 * Round a raw measured number to `decimals` places.
 *
 * Used by the evaluation layer (visual-diff, react-profile) on values that
 * are already known to be finite. Non-finite input is passed through
 * unchanged rather than nulled — these are raw data points, not report
 * cells. (The reporting layer's `stats.round` nulls non-finite input on
 * purpose, because there a NaN must render as "—".)
 */
export function round(n, decimals = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return n;
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}
