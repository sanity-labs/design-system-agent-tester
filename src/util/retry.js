/**
 * Shared transient-error detection for retry loops.
 *
 * One list, used by every retry layer (iteration retries in index.js,
 * API-call retries in runner-api.js) — the lists used to be duplicated
 * inline and drifted apart. Matches the failure modes worth retrying:
 * dropped connections, timeouts, rate limits, and 5xx server errors.
 */
export function isTransientError(err) {
  const msg = (err?.message || "").toLowerCase();
  return (
    msg.includes("connection error") ||
    msg.includes("connection reset") ||
    msg.includes("econnreset") ||
    msg.includes("econnrefused") ||
    msg.includes("etimedout") ||
    msg.includes("socket hang up") ||
    msg.includes("timed out") ||
    msg.includes("timeout") ||
    msg.includes("rate limit") ||
    msg.includes("429") ||
    msg.includes("overloaded") ||
    msg.includes("529") ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("internal server error")
  );
}
