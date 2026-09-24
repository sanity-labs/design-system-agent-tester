/**
 * True for a local Ollama model tag like "qwen2.5-coder:14b", false for a
 * Claude model ID. Claude IDs never contain a colon, so passing an Ollama
 * tag to the existing `--model` flag is enough to route generation there.
 */
export function isLocalModel(model) {
  return typeof model === "string" && model.includes(":");
}
