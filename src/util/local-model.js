/**
 * Detects a local Ollama model tag (e.g. "qwen2.5-coder:14b") as opposed to
 * a Claude model ID (e.g. "claude-sonnet-4-6"). Claude IDs never contain a
 * colon, so this is a safe, zero-config heuristic — no new CLI flag needed;
 * passing an Ollama tag via the existing `--model`/`--models` flags is
 * enough to route generation through Ollama instead of the Anthropic SDK.
 */
export function isLocalModel(model) {
  return typeof model === "string" && model.includes(":");
}
