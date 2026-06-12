import { describe, it, expect } from "vitest";
import { isTransientError } from "./retry.js";

describe("isTransientError", () => {
  it.each([
    "Connection error.",
    "read ECONNRESET",
    "connect ECONNREFUSED 127.0.0.1:443",
    "socket hang up",
    "Request timed out",
    "rate limit exceeded",
    "429 Too Many Requests",
    "Overloaded",
    "529 overloaded_error",
    "500 Internal Server Error",
    "502 Bad Gateway",
    "503 Service Unavailable",
  ])("treats %j as transient", (message) => {
    expect(isTransientError(new Error(message))).toBe(true);
  });

  it.each([
    "invalid_request_error: max_tokens must be positive",
    "401 authentication_error",
    "TypeScript type check failed (3 error(s))",
    "All 3 generation attempts returned no parseable files.",
  ])("treats %j as permanent", (message) => {
    expect(isTransientError(new Error(message))).toBe(false);
  });

  it("handles errors without a message", () => {
    expect(isTransientError(new Error())).toBe(false);
    expect(isTransientError({})).toBe(false);
    expect(isTransientError(null)).toBe(false);
  });
});
