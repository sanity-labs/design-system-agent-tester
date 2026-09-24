import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";

/** Keep at most this many bytes of server stderr for diagnostics. */
const MAX_STDERR_TAIL = 8 * 1024;

/**
 * Convert MCP tool definitions to the shape the Anthropic SDK expects,
 * dropping any name in `exclude`. Kept separate from the class method so it
 * can be tested without starting a server.
 */
export function toAnthropicTools(tools, exclude = []) {
  const excludeSet = new Set(exclude);
  return tools
    .filter((t) => !excludeSet.has(t.name))
    .map((t) => ({
      name: t.name,
      description: t.description || "",
      input_schema: t.inputSchema || { type: "object", properties: {} },
    }));
}

/**
 * Cap on the buffer used to reassemble server output. A server that never
 * sends a newline would otherwise grow it without limit. Far larger than
 * any real message.
 */
const MAX_BUFFER_BYTES = 16 * 1024 * 1024;

// Every MCP process started here. Each client's own `stop()` handles the
// normal path, but Ctrl-C and crashes skip that and leave processes behind,
// so they are tracked here and cleaned up on exit.
const _liveProcs = new Set();
let _exitHandlersInstalled = false;
function _ensureExitHandlers() {
  if (_exitHandlersInstalled) return;
  _exitHandlersInstalled = true;
  const killAll = () => {
    for (const proc of _liveProcs) {
      try {
        if (proc.exitCode === null && proc.signalCode === null) {
          proc.kill("SIGTERM");
        }
      } catch {
        // ignore — process may have already exited between the check
        // and the kill call (a race we can't avoid without locking).
      }
    }
    _liveProcs.clear();
  };
  // `exit` runs after Ctrl-C if stdin's been closed and after a
  // normal return from main. SIGINT/SIGTERM run before Node would
  // otherwise terminate without firing `exit`.
  process.on("exit", killAll);
  for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) {
    process.on(sig, () => {
      killAll();
      // Re-raise the signal so the default handler runs and exits
      // with the standard 128 + signal code. Without this, the
      // process would just sit there.
      process.kill(process.pid, sig);
    });
  }
}

/**
 * Small MCP client.
 *
 * Talks JSON-RPC over stdin and stdout to a local MCP server process:
 *
 *   const client = new McpClient({ command: "uv", args: [...] });
 *   await client.start();
 *   const tools = await client.listTools();
 *   const text = await client.callToolText("name", { ... });
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
    // Rolling tail of the server's stderr, kept so crashes/timeouts can
    // report what the server actually said instead of a bare exit code.
    this._recentStderr = "";
  }

  /** Append to the capped stderr tail used for diagnostics. */
  _captureStderr(text) {
    this._recentStderr = (this._recentStderr + text).slice(-MAX_STDERR_TAIL);
  }

  /** The last bit of server stderr, for inclusion in error messages. */
  _stderrSuffix() {
    const tail = this._recentStderr.trim();
    return tail ? `\n--- MCP server stderr (tail) ---\n${tail}` : "";
  }

  // ── Lifecycle ────────────────────────────────────────────────

  /**
   * Spawn the MCP server, perform the initialize handshake, and cache tools.
   */
  async start() {
    if (this._proc) return;

    _ensureExitHandlers();

    this._proc = spawn(this._command, this._args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...this._env },
    });
    _liveProcs.add(this._proc);

    // Accumulate stdout and split on newlines (each line is one JSON-RPC message)
    this._proc.stdout.on("data", (chunk) => {
      this._buffer += chunk.toString();
      this._drainBuffer();
      // No newline in a buffer this large means the server is not speaking
      // line-delimited JSON-RPC. Drop it rather than grow without bound.
      if (this._buffer.length > MAX_BUFFER_BYTES) {
        console.warn(`MCP: dropping ${this._buffer.length} bytes of unframed stdout (no newline).`);
        this._buffer = "";
      }
    });

    // Capture stderr for diagnostics and re-emit it. Without the capture,
    // a server stack trace vanished and a crash showed up as a bare
    // "exited with code 1".
    this._proc.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      this._captureStderr(text);
      this.emit("stderr", text);
    });

    this._proc.on("error", (err) => {
      this._rejectAll(err);
      // Only emit "error" when something is listening — an unheard "error"
      // event throws in Node. Pending requests were already rejected above.
      if (this.listenerCount("error") > 0) this.emit("error", err);
    });

    this._proc.on("close", (code) => {
      _liveProcs.delete(this._proc);
      this._rejectAll(new Error(`MCP server exited with code ${code}${this._stderrSuffix()}`));
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

    const exited = () => proc.exitCode !== null || proc.signalCode !== null;

    return new Promise((resolve) => {
      // `proc.killed` only records that a signal was sent, so the
      // SIGKILL escalation must check the actual exit state.
      const timer = setTimeout(() => {
        if (!exited()) proc.kill("SIGKILL");
      }, 5000);
      timer.unref();

      proc.once("close", () => {
        clearTimeout(timer);
        resolve();
      });

      // If the process already exited, `close` may have fired before
      // stop() was called — resolve immediately instead of waiting on
      // an event that will never come.
      if (exited()) {
        clearTimeout(timer);
        resolve();
        return;
      }

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
     * Convert MCP tool definitions to the Anthropic SDK format.
     *
     * @param {string[]} [exclude] - Tool names to leave out. Telling a model
     *   in the prompt not to use a tool is only advice: it can still see and
     *   call it, and the tool's own description may encourage that. Removing
     *   it from the list settles the matter.
     */
  getToolsForAnthropic(exclude = []) {
    return toAnthropicTools(this.getTools(), exclude);
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
            `MCP request timed out after ${this._requestTimeoutMs}ms: ${method}${this._stderrSuffix()}`,
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
          reject(new Error(`MCP error ${msg.error.code}: ${msg.error.message}`));
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
 * Create, start and return a connected client from a test's `mcp` block.
 */
export async function createMcpClient(mcpConfig, opts = {}) {
  if (!mcpConfig || typeof mcpConfig !== "object") {
    throw new Error("createMcpClient requires an mcpConfig argument (the test's `mcp` block).");
  }

  const directory = opts.directory ?? mcpConfig.defaultDirectory ?? null;
  const requestTimeoutMs = opts.requestTimeoutMs ?? 30_000;

  // `args` may be a plain array or `(directory) => string[]`.
  const args =
    typeof mcpConfig.args === "function" ? mcpConfig.args(directory) : (mcpConfig.args ?? []);

  // `env` may be a plain object or `(directory) => env`.
  const env =
    typeof mcpConfig.env === "function" ? mcpConfig.env(directory) : (mcpConfig.env ?? {});

  const client = new McpClient({
    command: mcpConfig.command,
    args,
    env,
    requestTimeoutMs,
  });

  // Surface server stderr so a crashing/misconfigured MCP server is
  // diagnosable instead of silently dropped. Also attach an "error"
  // listener so an emitted transport error never becomes an uncaught throw.
  const prefix = `[mcp:${mcpConfig.command}]`;
  client.on("stderr", (text) => {
    const trimmed = text.trimEnd();
    if (trimmed) console.warn(`${prefix} ${trimmed}`);
  });
  client.on("error", (err) => {
    console.warn(`${prefix} transport error: ${err.message}`);
  });

  await client.start();
  return client;
}
