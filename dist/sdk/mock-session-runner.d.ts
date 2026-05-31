import { EventEmitter } from "node:events";
import { type SessionState, type SessionStateInfo } from "./types";
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
    readonly systemPrompt?: string | {
        readonly preset: "claude_code";
        readonly append?: string;
    };
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
    readonly systemPrompt?: string | {
        readonly preset: "claude_code";
        readonly append?: string;
    };
    readonly attachments?: readonly MockClaudeSessionAttachment[];
}
export interface MockClaudeStateChange {
    readonly from: SessionState;
    readonly to: SessionState;
    readonly info: SessionStateInfo;
    readonly timestamp: string;
}
export declare class MockClaudeRunningSession extends EventEmitter {
    #private;
    readonly sessionId: string;
    constructor(options: MockClaudeRunningSessionOptions);
    pushMessage(message: object): void;
    setState(state: SessionState): void;
    complete(result?: MockClaudeSessionResultInput): void;
    messages(): AsyncIterable<object>;
    waitForCompletion(): Promise<MockClaudeSessionResult>;
    cancel(): Promise<void>;
    getState(): SessionStateInfo;
}
export declare class MockClaudeSessionRunner {
    #private;
    readonly startSessionCalls: MockClaudeStartSessionCall[];
    readonly resumeSessionCalls: MockClaudeResumeSessionCall[];
    enqueueStartSession(session: MockClaudeRunningSession): void;
    enqueueResumeSession(session: MockClaudeRunningSession): void;
    startSession(config: MockClaudeSessionConfig): Promise<MockClaudeRunningSession>;
    resumeSession(sessionId: string, prompt?: string, systemPrompt?: string | {
        readonly preset: "claude_code";
        readonly append?: string;
    }, attachments?: readonly MockClaudeSessionAttachment[]): Promise<MockClaudeRunningSession>;
    close(): Promise<void>;
    getActiveSessions(): MockClaudeRunningSession[];
}
export declare function createMockClaudeSessionRunner(input?: {
    readonly startSessions?: readonly MockClaudeRunningSession[];
    readonly resumeSessions?: readonly MockClaudeRunningSession[];
}): MockClaudeSessionRunner;
//# sourceMappingURL=mock-session-runner.d.ts.map