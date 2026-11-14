// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: (newValue) => all[name] = () => newValue
    });
};
var __esm = (fn, res) => () => (fn && (res = fn(fn = 0)), res);
var __require = import.meta.require;

// src/sdk/mock-session-runner.ts
import { EventEmitter } from "events";

// src/sdk/types/tool.ts
function isJsonSchema(schema) {
  return typeof schema === "object" && schema !== null && (("type" in schema) || ("properties" in schema));
}
function isSimpleSchema(schema) {
  return !isJsonSchema(schema);
}
function isToolResultContent(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value;
  if (obj["type"] !== "text" && obj["type"] !== "image") {
    return false;
  }
  if (obj["type"] === "text") {
    return typeof obj["text"] === "string" || obj["text"] === undefined;
  }
  return (typeof obj["data"] === "string" || obj["data"] === undefined) && (typeof obj["mimeType"] === "string" || obj["mimeType"] === undefined);
}
function isToolResult(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value;
  if (!Array.isArray(obj["content"])) {
    return false;
  }
  if (!obj["content"].every(isToolResultContent)) {
    return false;
  }
  if (obj["isError"] !== undefined && typeof obj["isError"] !== "boolean") {
    return false;
  }
  return true;
}
// src/sdk/types/mcp.ts
function isSdkServer(config) {
  return config.type === "sdk";
}
function isStdioServer(config) {
  return config.type === "stdio";
}
function isHttpServer(config) {
  return config.type === "http" || config.type === "sse";
}
function isValidMcpServerConfig(config) {
  if (typeof config !== "object" || config === null) {
    return false;
  }
  const configObj = config;
  if (typeof configObj["type"] !== "string") {
    return false;
  }
  const type = configObj["type"];
  if (type === "stdio") {
    return typeof configObj["command"] === "string" && (configObj["args"] === undefined || Array.isArray(configObj["args"]) && configObj["args"].every((arg) => typeof arg === "string")) && (configObj["env"] === undefined || typeof configObj["env"] === "object" && configObj["env"] !== null && Object.values(configObj["env"]).every((v) => typeof v === "string"));
  }
  if (type === "http" || type === "sse") {
    return typeof configObj["url"] === "string" && (configObj["headers"] === undefined || typeof configObj["headers"] === "object" && configObj["headers"] !== null && Object.values(configObj["headers"]).every((v) => typeof v === "string"));
  }
  if (type === "sdk") {
    return typeof configObj["name"] === "string" && (configObj["version"] === undefined || typeof configObj["version"] === "string") && Array.isArray(configObj["tools"]);
  }
  return false;
}
// src/sdk/types/state.ts
function isTerminalState(state) {
  return state === "completed" || state === "failed" || state === "cancelled";
}
function isValidSessionState(value) {
  if (typeof value !== "string") {
    return false;
  }
  const validStates = [
    "idle",
    "starting",
    "running",
    "waiting_tool_call",
    "waiting_permission",
    "paused",
    "completed",
    "failed",
    "cancelled"
  ];
  return validStates.includes(value);
}
// src/sdk/types/protocol.ts
function isJsonRpcMessage(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value;
  if (candidate["jsonrpc"] !== "2.0") {
    return false;
  }
  if (candidate["id"] !== undefined) {
    const id = candidate["id"];
    if (typeof id !== "string" && typeof id !== "number") {
      return false;
    }
  }
  if (candidate["method"] !== undefined && typeof candidate["method"] !== "string") {
    return false;
  }
  if (candidate["params"] !== undefined) {
    if (typeof candidate["params"] !== "object" || candidate["params"] === null) {
      return false;
    }
  }
  if (candidate["result"] !== undefined) {
    if (typeof candidate["result"] !== "object" || candidate["result"] === null) {
      return false;
    }
  }
  if (candidate["error"] !== undefined) {
    const error = candidate["error"];
    if (typeof error !== "object" || error === null) {
      return false;
    }
    const errorObj = error;
    if (typeof errorObj["code"] !== "number" || typeof errorObj["message"] !== "string") {
      return false;
    }
  }
  return true;
}
function isIncomingControlRequest(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value;
  if (candidate["type"] !== "control_request") {
    return false;
  }
  if (typeof candidate["request_id"] !== "string") {
    return false;
  }
  if (typeof candidate["request"] !== "object" || candidate["request"] === null) {
    return false;
  }
  const request = candidate["request"];
  const subtype = request["subtype"];
  return subtype === "mcp_message" || subtype === "can_use_tool" || subtype === "hook_callback";
}
function isControlResponse(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value;
  if (candidate["type"] !== "control_response") {
    return false;
  }
  if (typeof candidate["response"] !== "object" || candidate["response"] === null) {
    return false;
  }
  const response = candidate["response"];
  const subtype = response["subtype"];
  return subtype === "success" || subtype === "error";
}
function isMcpMessageRequest(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value;
  if (candidate["subtype"] !== "mcp_message") {
    return false;
  }
  if (typeof candidate["server_name"] !== "string") {
    return false;
  }
  if (typeof candidate["message"] !== "object" || candidate["message"] === null) {
    return false;
  }
  return isJsonRpcMessage(candidate["message"]);
}
function isSuccessResponse(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value;
  return candidate["subtype"] === "success" && typeof candidate["request_id"] === "string" && typeof candidate["response"] === "object" && candidate["response"] !== null;
}
function isErrorResponse(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value;
  return candidate["subtype"] === "error" && typeof candidate["request_id"] === "string" && typeof candidate["error"] === "string";
}
// src/sdk/mock-session-runner.ts
var DEFAULT_STARTED_AT = "2026-01-01T00:00:00.000Z";
var DEFAULT_COMPLETED_AT = "2026-01-01T00:00:01.000Z";
var DEFAULT_SESSION_DURATION_MS = 1000;

class MockClaudeRunningSession extends EventEmitter {
  sessionId;
  #queue = [];
  #closed = false;
  #state;
  #startedAt;
  #completedAt;
  #toolCallCount;
  #messageCount = 0;
  #waiter;
  #completionResolver;
  #completion;
  constructor(options) {
    super();
    this.sessionId = options.sessionId;
    this.#state = options.state ?? "running";
    this.#startedAt = options.result?.startedAt ?? DEFAULT_STARTED_AT;
    this.#toolCallCount = options.result?.toolCallCount ?? 0;
    this.#completion = new Promise((resolve) => {
      this.#completionResolver = resolve;
    });
    for (const message of options.messages ?? []) {
      this.pushMessage(message);
    }
    if (isTerminalState(this.#state)) {
      const completed = buildSessionResult({
        ...options.result,
        success: getTerminalResultSuccess(this.#state)
      }, this.#getResultFallbacks());
      this.#closed = true;
      this.#applyCompletionStats(completed);
      this.#completionResolver?.(completed);
      this.#completionResolver = undefined;
      return;
    }
    if (options.autoComplete !== false) {
      queueMicrotask(() => {
        this.complete(options.result);
      });
    }
  }
  pushMessage(message) {
    if (this.#closed) {
      throw new Error(`mock claude session '${this.sessionId}' is closed`);
    }
    this.#messageCount += 1;
    this.#queue.push(message);
    this.emit("message", message);
    this.#wake();
  }
  setState(state) {
    if (isTerminalState(state)) {
      this.#finish({ success: getTerminalResultSuccess(state) }, state);
      return;
    }
    const previous = this.#state;
    this.#state = state;
    this.#emitStateChange(previous, state);
  }
  complete(result = {}) {
    this.#finish(result);
  }
  async* messages() {
    while (!this.#closed || this.#queue.length > 0) {
      while (this.#queue.length > 0) {
        const message = this.#queue.shift();
        if (message !== undefined) {
          yield message;
        }
      }
      if (this.#closed) {
        break;
      }
      await new Promise((resolve) => {
        this.#waiter = resolve;
      });
    }
  }
  async waitForCompletion() {
    return await this.#completion;
  }
  async cancel() {
    if (this.#closed) {
      return;
    }
    this.#finish({ success: false }, "cancelled");
  }
  getState() {
    return {
      state: this.#state,
      sessionId: this.sessionId,
      stats: {
        startedAt: this.#startedAt,
        ...this.#completedAt === undefined ? {} : { completedAt: this.#completedAt },
        toolCallCount: this.#toolCallCount,
        messageCount: this.#messageCount
      }
    };
  }
  #wake() {
    const waiter = this.#waiter;
    this.#waiter = undefined;
    waiter?.();
  }
  #finish(result, terminalState) {
    if (this.#closed) {
      return;
    }
    const previous = this.#state;
    this.#closed = true;
    const completed = buildSessionResult(result, this.#getResultFallbacks());
    this.#applyCompletionStats(completed);
    this.#state = terminalState ?? (this.#state === "cancelled" ? "cancelled" : completed.success ? "completed" : "failed");
    this.#emitStateChange(previous, this.#state);
    this.emit("complete", completed);
    this.#completionResolver?.(completed);
    this.#completionResolver = undefined;
    this.#wake();
  }
  #getResultFallbacks() {
    return {
      startedAt: this.#startedAt,
      toolCallCount: this.#toolCallCount,
      messageCount: this.#messageCount
    };
  }
  #applyCompletionStats(result) {
    this.#startedAt = result.stats.startedAt;
    this.#completedAt = result.stats.completedAt;
    this.#toolCallCount = result.stats.toolCallCount;
    this.#messageCount = result.stats.messageCount;
  }
  #emitStateChange(from, to) {
    const change = {
      from,
      to,
      info: this.getState(),
      timestamp: new Date().toISOString()
    };
    this.emit("stateChange", change);
  }
}

class MockClaudeSessionRunner {
  startSessionCalls = [];
  resumeSessionCalls = [];
  #startSessions = [];
  #resumeSessions = [];
  #activeSessions = new Set;
  enqueueStartSession(session) {
    this.#startSessions.push(session);
  }
  enqueueResumeSession(session) {
    this.#resumeSessions.push(session);
  }
  async startSession(config) {
    this.startSessionCalls.push({ config: cloneSessionConfig(config) });
    return this.#activateSession(this.#shiftSession(this.#startSessions, "start"));
  }
  async resumeSession(sessionId, prompt, systemPrompt, attachments) {
    this.resumeSessionCalls.push({
      sessionId,
      ...prompt === undefined ? {} : { prompt },
      ...systemPrompt === undefined ? {} : { systemPrompt: cloneSystemPrompt(systemPrompt) },
      ...attachments === undefined ? {} : { attachments: cloneAttachments(attachments) }
    });
    return this.#activateSession(this.#shiftSession(this.#resumeSessions, "resume"));
  }
  async close() {
    const sessions = Array.from(this.#activeSessions);
    await Promise.all(sessions.map(async (session) => session.cancel()));
    this.#activeSessions.clear();
  }
  getActiveSessions() {
    return Array.from(this.#activeSessions);
  }
  #shiftSession(sessions, kind) {
    const session = sessions.shift();
    if (session === undefined) {
      throw new Error(`mock claude ${kind} session was not enqueued`);
    }
    return session;
  }
  #activateSession(session) {
    if (isTerminalState(session.getState().state)) {
      return session;
    }
    this.#activeSessions.add(session);
    session.once("complete", () => {
      this.#activeSessions.delete(session);
    });
    return session;
  }
}
function createMockClaudeSessionRunner(input = {}) {
  const runner = new MockClaudeSessionRunner;
  for (const session of input.startSessions ?? []) {
    runner.enqueueStartSession(session);
  }
  for (const session of input.resumeSessions ?? []) {
    runner.enqueueResumeSession(session);
  }
  return runner;
}
function buildSessionResult(input, fallbacks = {
  startedAt: DEFAULT_STARTED_AT,
  toolCallCount: 0,
  messageCount: 0
}) {
  const startedAt = input.startedAt ?? fallbacks.startedAt;
  return {
    success: input.success ?? true,
    stats: {
      startedAt,
      completedAt: input.completedAt ?? getDefaultCompletedAt(startedAt),
      toolCallCount: input.toolCallCount ?? fallbacks.toolCallCount,
      messageCount: input.messageCount ?? fallbacks.messageCount
    }
  };
}
function getTerminalResultSuccess(state) {
  return state === "completed";
}
function getDefaultCompletedAt(startedAt) {
  const startedAtMs = Date.parse(startedAt);
  if (Number.isNaN(startedAtMs)) {
    return DEFAULT_COMPLETED_AT;
  }
  return new Date(startedAtMs + DEFAULT_SESSION_DURATION_MS).toISOString();
}
function cloneSessionConfig(config) {
  return {
    prompt: config.prompt,
    ...config.projectPath === undefined ? {} : { projectPath: config.projectPath },
    ...config.resumeSessionId === undefined ? {} : { resumeSessionId: config.resumeSessionId },
    ...config.systemPrompt === undefined ? {} : { systemPrompt: cloneSystemPrompt(config.systemPrompt) },
    ...config.attachments === undefined ? {} : { attachments: cloneAttachments(config.attachments) }
  };
}
function cloneSystemPrompt(systemPrompt) {
  if (typeof systemPrompt === "string") {
    return systemPrompt;
  }
  return systemPrompt.append === undefined ? { preset: systemPrompt.preset } : { preset: systemPrompt.preset, append: systemPrompt.append };
}
function cloneAttachments(attachments) {
  return attachments.map((attachment) => ({ ...attachment }));
}
export {
  createMockClaudeSessionRunner,
  MockClaudeSessionRunner,
  MockClaudeRunningSession
};
