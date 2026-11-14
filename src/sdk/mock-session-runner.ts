import { EventEmitter } from "node:events";
import {
  isTerminalState,
  type SessionState,
  type SessionStateInfo,
} from "./types";

const DEFAULT_STARTED_AT = "2026-01-01T00:00:00.000Z";
const DEFAULT_COMPLETED_AT = "2026-01-01T00:00:01.000Z";
const DEFAULT_SESSION_DURATION_MS = 1000;

interface SessionResultFallbacks {
  readonly startedAt: string;
  readonly toolCallCount: number;
  readonly messageCount: number;
}

export interface MockClaudeSessionAttachment {
  readonly path?: string;
  readonly fileName?: string;
  readonly mimeType?: string;
  readonly encoding?: "base64" | "utf8";
  readonly content?: string;
}

export interface MockClaudeSessionConfig {
  readonly prompt: string;
  readonly projectPath?: string;
  readonly resumeSessionId?: string;
  readonly systemPrompt?:
    | string
    | { readonly preset: "claude_code"; readonly append?: string };
  readonly attachments?: readonly MockClaudeSessionAttachment[];
}

export interface MockClaudeSessionResult {
  readonly success: boolean;
  readonly stats: {
    readonly startedAt: string;
    readonly completedAt: string;
    readonly toolCallCount: number;
    readonly messageCount: number;
  };
}

export interface MockClaudeSessionResultInput {
  readonly success?: boolean;
  readonly startedAt?: string;
  readonly completedAt?: string;
  readonly toolCallCount?: number;
  readonly messageCount?: number;
}

export interface MockClaudeRunningSessionOptions {
  readonly sessionId: string;
  readonly messages?: readonly object[];
  readonly result?: MockClaudeSessionResultInput;
  readonly state?: SessionState;
  readonly autoComplete?: boolean;
}

export interface MockClaudeStartSessionCall {
  readonly config: MockClaudeSessionConfig;
}

export interface MockClaudeResumeSessionCall {
  readonly sessionId: string;
  readonly prompt?: string;
  readonly systemPrompt?:
    | string
    | { readonly preset: "claude_code"; readonly append?: string };
  readonly attachments?: readonly MockClaudeSessionAttachment[];
}

export interface MockClaudeStateChange {
  readonly from: SessionState;
  readonly to: SessionState;
  readonly info: SessionStateInfo;
  readonly timestamp: string;
}

export class MockClaudeRunningSession extends EventEmitter {
  readonly sessionId: string;
  readonly #queue: object[] = [];
  #closed = false;
  #state: SessionState;
  #startedAt: string;
  #completedAt: string | undefined;
  #toolCallCount: number;
  #messageCount = 0;
  #waiter: (() => void) | undefined;
  #completionResolver: ((result: MockClaudeSessionResult) => void) | undefined;
  readonly #completion: Promise<MockClaudeSessionResult>;

  constructor(options: MockClaudeRunningSessionOptions) {
    super();
    this.sessionId = options.sessionId;
    this.#state = options.state ?? "running";
    this.#startedAt = options.result?.startedAt ?? DEFAULT_STARTED_AT;
    this.#toolCallCount = options.result?.toolCallCount ?? 0;
    this.#completion = new Promise<MockClaudeSessionResult>((resolve) => {
      this.#completionResolver = resolve;
    });
    for (const message of options.messages ?? []) {
      this.pushMessage(message);
    }
    if (isTerminalState(this.#state)) {
      const completed = buildSessionResult(
        {
          ...options.result,
          success: getTerminalResultSuccess(this.#state),
        },
        this.#getResultFallbacks(),
      );
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

  pushMessage(message: object): void {
    if (this.#closed) {
      throw new Error(`mock claude session '${this.sessionId}' is closed`);
    }
    this.#messageCount += 1;
    this.#queue.push(message);
    this.emit("message", message);
    this.#wake();
  }

  setState(state: SessionState): void {
    if (isTerminalState(state)) {
      this.#finish({ success: getTerminalResultSuccess(state) }, state);
      return;
    }

    const previous = this.#state;
    this.#state = state;
    this.#emitStateChange(previous, state);
  }

  complete(result: MockClaudeSessionResultInput = {}): void {
    this.#finish(result);
  }

  async *messages(): AsyncIterable<object> {
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
      await new Promise<void>((resolve) => {
        this.#waiter = resolve;
      });
    }
  }

  async waitForCompletion(): Promise<MockClaudeSessionResult> {
    return await this.#completion;
  }

  async cancel(): Promise<void> {
    if (this.#closed) {
      return;
    }
    this.#finish({ success: false }, "cancelled");
  }

  getState(): SessionStateInfo {
    return {
      state: this.#state,
      sessionId: this.sessionId,
      stats: {
        startedAt: this.#startedAt,
        ...(this.#completedAt === undefined
          ? {}
          : { completedAt: this.#completedAt }),
        toolCallCount: this.#toolCallCount,
        messageCount: this.#messageCount,
      },
    };
  }

  #wake(): void {
    const waiter = this.#waiter;
    this.#waiter = undefined;
    waiter?.();
  }

  #finish(
    result: MockClaudeSessionResultInput,
    terminalState?: SessionState,
  ): void {
    if (this.#closed) {
      return;
    }
    const previous = this.#state;
    this.#closed = true;
    const completed = buildSessionResult(result, this.#getResultFallbacks());
    this.#applyCompletionStats(completed);
    this.#state =
      terminalState ??
      (this.#state === "cancelled"
        ? "cancelled"
        : completed.success
          ? "completed"
          : "failed");
    this.#emitStateChange(previous, this.#state);
    this.emit("complete", completed);
    this.#completionResolver?.(completed);
    this.#completionResolver = undefined;
    this.#wake();
  }

  #getResultFallbacks(): SessionResultFallbacks {
    return {
      startedAt: this.#startedAt,
      toolCallCount: this.#toolCallCount,
      messageCount: this.#messageCount,
    };
  }

  #applyCompletionStats(result: MockClaudeSessionResult): void {
    this.#startedAt = result.stats.startedAt;
    this.#completedAt = result.stats.completedAt;
    this.#toolCallCount = result.stats.toolCallCount;
    this.#messageCount = result.stats.messageCount;
  }

  #emitStateChange(from: SessionState, to: SessionState): void {
    const change: MockClaudeStateChange = {
      from,
      to,
      info: this.getState(),
      timestamp: new Date().toISOString(),
    };
    this.emit("stateChange", change);
  }
}

export class MockClaudeSessionRunner {
  readonly startSessionCalls: MockClaudeStartSessionCall[] = [];
  readonly resumeSessionCalls: MockClaudeResumeSessionCall[] = [];
  readonly #startSessions: MockClaudeRunningSession[] = [];
  readonly #resumeSessions: MockClaudeRunningSession[] = [];
  readonly #activeSessions: Set<MockClaudeRunningSession> = new Set();

  enqueueStartSession(session: MockClaudeRunningSession): void {
    this.#startSessions.push(session);
  }

  enqueueResumeSession(session: MockClaudeRunningSession): void {
    this.#resumeSessions.push(session);
  }

  async startSession(
    config: MockClaudeSessionConfig,
  ): Promise<MockClaudeRunningSession> {
    this.startSessionCalls.push({ config: cloneSessionConfig(config) });
    return this.#activateSession(
      this.#shiftSession(this.#startSessions, "start"),
    );
  }

  async resumeSession(
    sessionId: string,
    prompt?: string,
    systemPrompt?:
      | string
      | { readonly preset: "claude_code"; readonly append?: string },
    attachments?: readonly MockClaudeSessionAttachment[],
  ): Promise<MockClaudeRunningSession> {
    this.resumeSessionCalls.push({
      sessionId,
      ...(prompt === undefined ? {} : { prompt }),
      ...(systemPrompt === undefined
        ? {}
        : { systemPrompt: cloneSystemPrompt(systemPrompt) }),
      ...(attachments === undefined
        ? {}
        : { attachments: cloneAttachments(attachments) }),
    });
    return this.#activateSession(
      this.#shiftSession(this.#resumeSessions, "resume"),
    );
  }

  async close(): Promise<void> {
    const sessions = Array.from(this.#activeSessions);
    await Promise.all(sessions.map(async (session) => session.cancel()));
    this.#activeSessions.clear();
  }

  getActiveSessions(): MockClaudeRunningSession[] {
    return Array.from(this.#activeSessions);
  }

  #shiftSession(
    sessions: MockClaudeRunningSession[],
    kind: "start" | "resume",
  ): MockClaudeRunningSession {
    const session = sessions.shift();
    if (session === undefined) {
      throw new Error(`mock claude ${kind} session was not enqueued`);
    }
    return session;
  }

  #activateSession(
    session: MockClaudeRunningSession,
  ): MockClaudeRunningSession {
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

export function createMockClaudeSessionRunner(
  input: {
    readonly startSessions?: readonly MockClaudeRunningSession[];
    readonly resumeSessions?: readonly MockClaudeRunningSession[];
  } = {},
): MockClaudeSessionRunner {
  const runner = new MockClaudeSessionRunner();
  for (const session of input.startSessions ?? []) {
    runner.enqueueStartSession(session);
  }
  for (const session of input.resumeSessions ?? []) {
    runner.enqueueResumeSession(session);
  }
  return runner;
}

function buildSessionResult(
  input: MockClaudeSessionResultInput,
  fallbacks: SessionResultFallbacks = {
    startedAt: DEFAULT_STARTED_AT,
    toolCallCount: 0,
    messageCount: 0,
  },
): MockClaudeSessionResult {
  const startedAt = input.startedAt ?? fallbacks.startedAt;
  return {
    success: input.success ?? true,
    stats: {
      startedAt,
      completedAt: input.completedAt ?? getDefaultCompletedAt(startedAt),
      toolCallCount: input.toolCallCount ?? fallbacks.toolCallCount,
      messageCount: input.messageCount ?? fallbacks.messageCount,
    },
  };
}

function getTerminalResultSuccess(state: SessionState): boolean {
  return state === "completed";
}

function getDefaultCompletedAt(startedAt: string): string {
  const startedAtMs = Date.parse(startedAt);
  if (Number.isNaN(startedAtMs)) {
    return DEFAULT_COMPLETED_AT;
  }
  return new Date(startedAtMs + DEFAULT_SESSION_DURATION_MS).toISOString();
}

function cloneSessionConfig(
  config: MockClaudeSessionConfig,
): MockClaudeSessionConfig {
  return {
    prompt: config.prompt,
    ...(config.projectPath === undefined
      ? {}
      : { projectPath: config.projectPath }),
    ...(config.resumeSessionId === undefined
      ? {}
      : { resumeSessionId: config.resumeSessionId }),
    ...(config.systemPrompt === undefined
      ? {}
      : { systemPrompt: cloneSystemPrompt(config.systemPrompt) }),
    ...(config.attachments === undefined
      ? {}
      : { attachments: cloneAttachments(config.attachments) }),
  };
}

function cloneSystemPrompt(
  systemPrompt:
    | string
    | { readonly preset: "claude_code"; readonly append?: string },
): string | { preset: "claude_code"; append?: string } {
  if (typeof systemPrompt === "string") {
    return systemPrompt;
  }
  return systemPrompt.append === undefined
    ? { preset: systemPrompt.preset }
    : { preset: systemPrompt.preset, append: systemPrompt.append };
}

function cloneAttachments(
  attachments: readonly MockClaudeSessionAttachment[],
): MockClaudeSessionAttachment[] {
  return attachments.map((attachment) => ({ ...attachment }));
}
