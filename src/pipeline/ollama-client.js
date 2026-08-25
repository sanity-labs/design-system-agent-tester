/**
 * Anthropic-SDK-compatible shim that routes generation through a local
 * Ollama model instead of the Claude API. Implements only the surface
 * `runner-api.js` actually calls — `client.messages.stream(params)` /
 * `.finalMessage()` — translating Anthropic's request/response shapes to
 * and from Ollama's `/api/chat`. Everything else in `runner-api.js` (the
 * MCP tool loop, fix loop, retry logic, prompt caching markers) is left
 * untouched; caching fields are simply reported as zero since Ollama has
 * no equivalent.
 *
 * Known limitations, honestly documented rather than hidden:
 * - Anthropic can return several `tool_use` blocks in one turn; this shim
 *   (like the read-only agent-loop pilot it's adapted from) only reliably
 *   recovers ONE tool call per turn when the model emits it as plain JSON
 *   text instead of Ollama's structured `tool_calls` field.
 * - `cache_control` markers in the request are accepted and ignored — no
 *   prompt caching exists for a local model.
 * - `output_config.effort` (Claude-only) is accepted and ignored.
 */

const OLLAMA_ENDPOINT = "http://127.0.0.1:11434/api/chat";
const OLLAMA_TIMEOUT_MS = 15 * 60 * 1000; // matches the Anthropic client's timeout in runner-api.js

let toolCallCounter = 0;

export function createOllamaClient() {
  return {
    messages: {
      stream(params) {
        const promise = requestOllama(params);
        return { finalMessage: () => promise };
      },
    },
  };
}

async function requestOllama(params) {
  const messages = [
    { role: "system", content: flattenSystem(params.system) },
    ...params.messages.flatMap(anthropicMessageToOllama),
  ];

  const tools = (params.tools ?? []).map(anthropicToolToOllama);

  let response;
  try {
    response = await fetch(OLLAMA_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: params.model,
        stream: false,
        ...(tools.length && params.tool_choice?.type !== "none" ? { tools } : {}),
        // num_ctx: the fix loop resends the full current file set plus the
        // error text every round, so the conversation grows fast across
        // several fix attempts. 16384 (the previous value) truncated older
        // turns mid-loop — observed 2026-08-19: a model that was 2 tsc
        // errors from a clean build by fix attempt 3 hallucinated a
        // completely different, generic package.json (wrong React version,
        // missing packages, invalid version strings) by attempt 5, having
        // apparently lost the actual file contents and package.json
        // instructions from context. Bumped to 32768 — the model's own
        // advertised max (see `ollama show <model>` / `ollama list`
        // context_length) — rather than a guessed value, since going
        // higher than the model supports has no effect and this is the
        // ceiling for both qwen2.5-coder:14b and :7b.
        options: { temperature: 0, num_ctx: 32768, num_predict: 8192 },
        messages,
      }),
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
    });
  } catch (err) {
    // Preserve the underlying socket error code (e.g. ECONNREFUSED,
    // ECONNRESET) so isTransientError() — the same retry classifier the
    // Anthropic path uses — can recognize this as retryable. A bare
    // `new Error(...)` here would swallow `err.cause.code`, silently
    // disabling the harness's existing 3-attempt retry for every local-model
    // network hiccup (observed in practice: a mid-run connection drop after
    // ~10 minutes ended the whole iteration instead of retrying once).
    const wrapped = new Error(`Could not reach local Ollama at ${OLLAMA_ENDPOINT}: ${err.message}`);
    wrapped.code = err.cause?.code ?? err.code;
    throw wrapped;
  }

  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  return ollamaResponseToAnthropic(payload, tools);
}

function flattenSystem(system) {
  if (typeof system === "string") return system;
  if (Array.isArray(system)) return system.map((block) => block.text ?? "").join("\n\n");
  return "";
}

/**
 * One Anthropic message can expand to several Ollama messages — a
 * `tool_result` array becomes one `role: "tool"` message per block, and an
 * assistant message carrying `tool_use` blocks becomes an assistant message
 * whose text summarizes the calls (Ollama doesn't need the original
 * structured call replayed for this harness's purposes; only the tool
 * results downstream matter for grounding the next turn).
 */
function anthropicMessageToOllama(message) {
  const content = message.content;

  if (typeof content === "string") {
    return [{ role: message.role, content }];
  }

  if (!Array.isArray(content)) return [];

  const toolResults = content.filter((b) => b.type === "tool_result");
  if (toolResults.length > 0) {
    return toolResults.map((b) => ({
      role: "tool",
      content: typeof b.content === "string" ? b.content : JSON.stringify(b.content),
    }));
  }

  const textParts = content.filter((b) => b.type === "text").map((b) => b.text);
  const toolUseParts = content
    .filter((b) => b.type === "tool_use")
    .map((b) => `${b.name}(${JSON.stringify(b.input)})`);

  const combined = [...textParts, ...toolUseParts].join("\n");
  return combined ? [{ role: message.role, content: combined }] : [];
}

function anthropicToolToOllama(tool) {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description ?? "",
      parameters: tool.input_schema ?? { type: "object", properties: {} },
    },
  };
}

const toolNamesFor = (tools) => new Set(tools.map((t) => t.function.name));

/**
 * Mirrors the fallback used in agent-loop-readonly.mjs: this model
 * sometimes emits a tool call as plain JSON text in `content` instead of
 * Ollama's structured `tool_calls` field. Accept either shape.
 */
function ollamaResponseToAnthropic(payload, tools) {
  const message = payload.message ?? {};
  const contentBlocks = [];

  const nativeCalls = message.tool_calls ?? [];
  if (nativeCalls.length > 0) {
    for (const call of nativeCalls) {
      contentBlocks.push({
        type: "tool_use",
        id: `ollama-tool-${++toolCallCounter}`,
        name: call.function.name,
        input: call.function.arguments ?? {},
      });
    }
  } else {
    const fallbackCall = extractFallbackToolCall(message.content, toolNamesFor(tools));
    if (fallbackCall) {
      contentBlocks.push({
        type: "tool_use",
        id: `ollama-tool-${++toolCallCounter}`,
        name: fallbackCall.name,
        input: fallbackCall.args,
      });
    } else if (message.content) {
      contentBlocks.push({ type: "text", text: message.content });
    }
  }

  const u = {
    input_tokens: payload.prompt_eval_count ?? 0,
    output_tokens: payload.eval_count ?? 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  };

  return {
    content: contentBlocks,
    stop_reason: contentBlocks.some((b) => b.type === "tool_use") ? "tool_use" : "end_turn",
    usage: u,
  };
}

function extractFallbackToolCall(content, toolNames) {
  const trimmed = content?.trim();
  if (!trimmed) return null;
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const candidate = fenced ? fenced[1] : trimmed;
  try {
    const parsed = JSON.parse(candidate);
    const name = parsed.name ?? parsed.tool;
    const args = parsed.arguments ?? parsed.args ?? {};
    if (toolNames.has(name)) return { name, args };
  } catch {
    // Not JSON — a genuine text response.
  }
  return null;
}
