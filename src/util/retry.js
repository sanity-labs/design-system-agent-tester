/**
 * Decides which errors are worth retrying.
 *
 * One list, used by every retry loop in the harness. These used to be
 * written out separately in each place and drifted apart. Covers dropped
 * connections, rate limits, and server-side errors.
 */
export function isTransientError(err) {
  // Prefer structured fields when present. An HTTP status or a Node
  // socket error code is unambiguous, unlike substring-matching a message
  // (where "500" could be a token count, a port, or a file path).
  const status = err?.status ?? err?.statusCode;
  if ([408, 409, 429, 500, 502, 503, 529].includes(status)) return true;

  const code = err?.code;
  if (
    typeof code === "string" &&
    /^(ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|EAI_AGAIN|ENOTFOUND)$/.test(code)
  ) {
    return true;
  }

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
    // Node's general fetch failure message, used by the local model client,
    // which has no error code of its own to check. Broad, but fetch only
    // reports this for a connection that failed.
    msg.includes("fetch failed") ||
    msg.includes("rate limit") ||
    msg.includes("overloaded") ||
    msg.includes("internal server error") ||
    // Bare status codes, matched as standalone tokens so an unrelated
    // number that merely contains "500" doesn't count.
    /\b(429|500|502|503|529)\b/.test(msg)
  );
}
