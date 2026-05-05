import { EventEmitter } from "node:events";
import type { SessionAttachment, SessionConfig, SessionResult } from "./agent";
import type { SessionState, SessionStateInfo } from "./types";

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
  readonly config: SessionConfig;
}

export interface MockClaudeResumeSessionCall {
  readonly sessionId: string;
  readonly prompt?: string;
  readonly systemPrompt?:
    | string
    | { readonly preset: "claude_code"; readonly append?: string };
  readonly attachments?: readonly SessionAttachment[];
}

export class MockClaudeRunningSession extends EventEmitter {
  readonly sessionId: string;
  readonly #queue: object[] = [];
  #closed = false;
  #state: SessionState;
  #messageCount = 0;
  #waiter: (() => void) | undefined;
  #completionResolver: ((result: SessionResult) => void) | undefined;
  readonly #completion: Promise<SessionResult>;

  constructor(options: MockClaudeRunningSessionOptions) {
    super();
    this.sessionId = options.sessionId;
    this.#state = options.state ?? "running";
    this.#completion = new Promise<SessionResult>((resolve) => {
      this.#completionResolver = resolve;
    });
    for (const message of options.messages ?? []) {
      this.pushMessage(message);
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
    const previous = this.#state;
    this.#state = state;
    this.emit("stateChange", { from: previous, to: state });
  }

  complete(result: MockClaudeSessionResultInput = {}): void {
    if (this.#closed) {
      return;
    }
    this.#closed = true;
    const completed = buildSessionResult(result, this.#messageCount);
    this.#state =
      this.#state === "cancelled"
        ? "cancelled"
        : completed.success
          ? "completed"
          : "failed";
    this.emit("stateChange", { to: this.#state });
    this.emit("complete", completed);
    this.#completionResolver?.(completed);
    this.#completionResolver = undefined;
    this.#wake();
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

  async waitForCompletion(): Promise<SessionResult> {
    return await this.#completion;
  }

  async cancel(): Promise<void> {
    this.#state = "cancelled";
    this.complete({ success: false });
  }

  getState(): SessionStateInfo {
    return {
      state: this.#state,
      sessionId: this.sessionId,
      stats: {
        startedAt: "2026-01-01T00:00:00.000Z",
        ...(this.#closed ? { completedAt: "2026-01-01T00:00:01.000Z" } : {}),
        toolCallCount: 0,
        messageCount: this.#messageCount,
      },
    };
  }

  #wake(): void {
    const waiter = this.#waiter;
    this.#waiter = undefined;
    waiter?.();
  }
}

export class MockClaudeSessionRunner {
  readonly startSessionCalls: MockClaudeStartSessionCall[] = [];
  readonly resumeSessionCalls: MockClaudeResumeSessionCall[] = [];
  readonly #startSessions: MockClaudeRunningSession[] = [];
  readonly #resumeSessions: MockClaudeRunningSession[] = [];

  enqueueStartSession(session: MockClaudeRunningSession): void {
    this.#startSessions.push(session);
  }

  enqueueResumeSession(session: MockClaudeRunningSession): void {
    this.#resumeSessions.push(session);
  }

  async startSession(config: SessionConfig): Promise<MockClaudeRunningSession> {
    this.startSessionCalls.push({ config });
    return this.#shiftSession(this.#startSessions, "start");
  }

  async resumeSession(
    sessionId: string,
    prompt?: string,
    systemPrompt?:
      | string
      | { readonly preset: "claude_code"; readonly append?: string },
    attachments?: readonly SessionAttachment[],
  ): Promise<MockClaudeRunningSession> {
    this.resumeSessionCalls.push({
      sessionId,
      ...(prompt === undefined ? {} : { prompt }),
      ...(systemPrompt === undefined ? {} : { systemPrompt }),
      ...(attachments === undefined ? {} : { attachments }),
    });
    return this.#shiftSession(this.#resumeSessions, "resume");
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
  fallbackMessageCount: number,
): SessionResult {
  return {
    success: input.success ?? true,
    stats: {
      startedAt: input.startedAt ?? "2026-01-01T00:00:00.000Z",
      completedAt: input.completedAt ?? "2026-01-01T00:00:01.000Z",
      toolCallCount: input.toolCallCount ?? 0,
      messageCount: input.messageCount ?? fallbackMessageCount,
    },
  };
}
