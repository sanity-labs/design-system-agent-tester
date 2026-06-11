import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import config from "../config/load.js";

/**
 * Lightweight MCP stdio client.
 *
 * Speaks JSON-RPC 2.0 over stdin/stdout to a local MCP server process.
 * Designed for the agent-tester harness — keeps things minimal:
 *
 *   const client = new McpClient({ command: "uv", args: [...] });
 *   await client.start();
 *   const tools = await client.listTools();          // MCP tool defs
 *   const result = await client.callTool("list_components", { category: "layout" });
 *   await client.stop();
 */
class McpClient extends EventEmitter {
  /**
   * @param {object} opts
   * @param {string} opts.command  - The executable to spawn (e.g. "uv")
   * @param {string[]} opts.args  - Arguments for the command
   * @param {Record<string,string>} [opts.env]  - Extra env vars
   * @param {number} [opts.requestTimeoutMs=30000] - Per-request timeout
   */
  constructor({ command, args = [], env = {}, requestTimeoutMs = 30_000 }) {
    super();
    this._command = command;
    this._args = args;
    this._env = env;
    this._requestTimeoutMs = requestTimeoutMs;

    /** @type {import("child_process").ChildProcess | null} */
    this._proc = null;
    /** @type {Map<string|number, {resolve: Function, reject: Function, timer: NodeJS.Timeout}>} */
    this._pending = new Map();
    this._buffer = "";
    this._nextId = 1;
    this._serverInfo = null;
    this._serverCapabilities = null;
    this._tools = null;
  }

  // ── Lifecycle ────────────────────────────────────────────────

  /**
   * Spawn the MCP server, perform the initialize handshake, and cache tools.
   */
  async start() {
    if (this._proc) return;

    this._proc = spawn(this._command, this._args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...this._env },
    });

    // Accumulate stdout and split on newlines (each line is one JSON-RPC message)
    this._proc.stdout.on("data", (chunk) => {
      this._buffer += chunk.toString();
      this._drainBuffer();
    });

    // Log stderr but don't crash
    this._proc.stderr.on("data", (chunk) => {
      this.emit("stderr", chunk.toString());
    });

    this._proc.on("error", (err) => {
      this._rejectAll(err);
      this.emit("error", err);
    });

    this._proc.on("close", (code) => {
      this._rejectAll(new Error(`MCP server exited with code ${code}`));
      this._proc = null;
      this.emit("close", code);
    });

    // Initialize handshake
    const initResult = await this._request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "agent-tester", version: "1.0.0" },
    });

    this._serverInfo = initResult.serverInfo;
    this._serverCapabilities = initResult.capabilities;
    this._instructions = initResult.instructions || null;

    // Send initialized notification (no response expected)
    this._notify("notifications/initialized");

    // Pre-fetch tools so callers don't have to
    const toolsResult = await this._request("tools/list", {});
    this._tools = toolsResult.tools || [];

    return this;
  }

  /**
   * Gracefully shut down the server process.
   */
  async stop() {
    if (!this._proc) return;
    this._rejectAll(new Error("MCP client stopping"));

    const proc = this._proc;
    this._proc = null;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (!proc.killed) proc.kill("SIGKILL");
      }, 5000);

      proc.on("close", () => {
        clearTimeout(timer);
        resolve();
      });

      proc.kill("SIGTERM");
    });
  }

  // ── Public API ───────────────────────────────────────────────

  /**
   * Return cached tool definitions (MCP format).
   * @returns {Array<{name: string, description?: string, inputSchema?: object}>}
   */
  getTools() {
    return this._tools || [];
  }

  /**
   * Convert MCP tool definitions to Anthropic SDK tool format.
   * @returns {Array<{name: string, description: string, input_schema: object}>}
   */
  getToolsForAnthropic() {
    return this.getTools().map((t) => ({
      name: t.name,
      description: t.description || "",
      input_schema: t.inputSchema || { type: "object", properties: {} },
    }));
  }

  /**
   * Get the MCP server's instructions text (if any).
   * This is useful as system prompt context for the LLM.
   * @returns {string|null}
   */
  getInstructions() {
    return this._instructions;
  }

  /**
   * Invoke an MCP tool by name.
   * @param {string} name  - Tool name (e.g. "list_components")
   * @param {object} args  - Tool arguments
   * @returns {Promise<{content: Array<{type: string, text?: string}>}>}
   */
  async callTool(name, args = {}) {
    const result = await this._request("tools/call", { name, arguments: args });
    return result;
  }

  /**
   * Convenience: call a tool and return the concatenated text content.
   * @param {string} name
   * @param {object} args
   * @returns {Promise<string>}
   */
  async callToolText(name, args = {}) {
    const result = await this.callTool(name, args);
    if (!result.content) return "";
    return result.content
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");
  }

  // ── JSON-RPC transport ───────────────────────────────────────

  /**
   * Send a JSON-RPC request and wait for the response.
   */
  _request(method, params) {
    return new Promise((resolve, reject) => {
      if (!this._proc || !this._proc.stdin.writable) {
        return reject(new Error("MCP server not running"));
      }

      const id = this._nextId++;
      const msg = JSON.stringify({ jsonrpc: "2.0", id, method, params });

      const timer = setTimeout(() => {
        this._pending.delete(id);
        reject(
          new Error(
            `MCP request timed out after ${this._requestTimeoutMs}ms: ${method}`,
          ),
        );
      }, this._requestTimeoutMs);

      this._pending.set(id, { resolve, reject, timer });
      this._proc.stdin.write(msg + "\n");
    });
  }

  /**
   * Send a JSON-RPC notification (no response expected).
   */
  _notify(method, params = {}) {
    if (!this._proc || !this._proc.stdin.writable) return;
    const msg = JSON.stringify({ jsonrpc: "2.0", method, params });
    this._proc.stdin.write(msg + "\n");
  }

  /**
   * Process buffered stdout data, extracting complete JSON-RPC messages.
   */
  _drainBuffer() {
    let newlineIdx;
    while ((newlineIdx = this._buffer.indexOf("\n")) !== -1) {
      const line = this._buffer.slice(0, newlineIdx).trim();
      this._buffer = this._buffer.slice(newlineIdx + 1);

      if (!line) continue;

      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        // Not valid JSON — skip
        continue;
      }

      // It's a response to one of our requests
      if (msg.id !== undefined && this._pending.has(msg.id)) {
        const { resolve, reject, timer } = this._pending.get(msg.id);
        this._pending.delete(msg.id);
        clearTimeout(timer);

        if (msg.error) {
          reject(
            new Error(`MCP error ${msg.error.code}: ${msg.error.message}`),
          );
        } else {
          resolve(msg.result);
        }
      }

      // Server-initiated notifications — emit for observability
      if (msg.method && msg.id === undefined) {
        this.emit("notification", msg.method, msg.params);
      }
    }
  }

  /**
   * Reject all pending requests (used on shutdown / error).
   */
  _rejectAll(err) {
    for (const [id, { reject, timer }] of this._pending) {
      clearTimeout(timer);
      reject(err);
    }
    this._pending.clear();
  }
}

/**
 * Convenience factory: create, start, and return a connected McpClient
 * configured from the project's MCP config block.
 *
 * @param {object} [opts]
 * @param {string} [opts.directory] - Path to the MCP server project
 * @param {number} [opts.requestTimeoutMs] - Per-request timeout
 * @returns {Promise<McpClient>}
 */
export async function createMcpClient({
  directory = config.mcp.defaultDirectory,
  requestTimeoutMs = 30_000,
} = {}) {
  // Resolve `env` from config. Supports either a plain object or a
  // function `(directory) => env`, mirroring the `args` field — useful
  // when an env var (e.g. `DSDS_PATHS`) needs to be derived from the
  // server's install location.
  const envFromConfig =
    typeof config.mcp.env === "function"
      ? config.mcp.env(directory)
      : config.mcp.env ?? {};

  const client = new McpClient({
    command: config.mcp.command,
    args: config.mcp.args(directory),
    env: envFromConfig,
    requestTimeoutMs,
  });

  await client.start();
  return client;
}
