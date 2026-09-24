/**
 * Round a measured number to `decimals` places.
 *
 * Used on raw data points that are already known to be numbers. Anything
 * that is not a number passes through unchanged. The reporting layer's own
 * `round` turns those into null instead, because a report cell has to show
 * something.
 */
export function round(n, decimals = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return n;
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}
