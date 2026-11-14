/**
 * Session runner: subprocess Claude sessions with control protocol and SDK tools.
 *
 * @module sdk/session-runner
 */
import { EventEmitter as NodeEventEmitter } from "node:events";
import type { ClaudeEnvironmentInput } from "./environment";
import type { Transport } from "./transport/transport";
import { ControlProtocolHandler } from "./control-protocol";
import { SessionStateManager } from "./session-state";
import type { McpServerConfig } from "./types/mcp";
import type { SessionStateInfo } from "./types/state";
/**
 * Permission mode for tool execution.
 */
export type PermissionMode = "default" | "acceptEdits" | "plan" | "bypassPermissions";
export type ClaudeReasoningEffort = string;
/**
 * Options for creating a SessionRunner.
 */
export interface SessionRunnerOptions {
    /** Working directory for Claude Code */
    cwd?: string;
    /** MCP servers (SDK and external) */
    mcpServers?: Record<string, McpServerConfig>;
    /** Tools to allow (pre-approved) */
    allowedTools?: readonly string[];
    /** Tools to disallow */
    disallowedTools?: readonly string[];
    /** System prompt customization */
    systemPrompt?: string | {
        preset: "claude_code";
        append?: string;
    };
    /** Permission mode */
    permissionMode?: PermissionMode;
    /** Model selection */
    model?: string;
    /** Reasoning effort level */
    effort?: ClaudeReasoningEffort;
    /** Budget limit */
    maxBudgetUsd?: number;
    /** Maximum turns */
    maxTurns?: number;
    /** Environment variables for Claude Code subprocess */
    env?: ClaudeEnvironmentInput;
    /** Custom CLI path (default: bundled or system claude) */
    cliPath?: string;
    /** Default timeout for operations in ms */
    defaultTimeout?: number;
    /** Additional CLI arguments to pass to Claude Code (e.g., ['--dangerously-skip-permissions']) */
    additionalArgs?: readonly string[];
}
/**
 * Configuration for starting a session.
 */
export interface SessionConfig {
    /**
     * Initial prompt.
     * Sent as a stream-json `user` message via stdin at startup.
     */
    prompt: string;
    /** Project path (defaults to cwd) */
    projectPath?: string;
    /** Session ID to resume (if resuming an existing session) */
    resumeSessionId?: string;
    /** Session-level system prompt override */
    systemPrompt?: string | {
        preset: "claude_code";
        append?: string;
    };
    /** Optional file/image attachments for the initial prompt */
    attachments?: readonly SessionAttachment[];
}
/**
 * Attachment payload for a session start/resume request.
 */
export interface SessionAttachment {
    /** Path to an existing file on disk */
    path?: string;
    /** File name for in-memory content (required when `content` is provided) */
    fileName?: string;
    /** MIME type metadata (optional) */
    mimeType?: string;
    /** In-memory content encoding */
    encoding?: "base64" | "utf8";
    /** In-memory attachment content */
    content?: string;
}
/**
 * Result of a completed session.
 */
export interface SessionResult {
    /** Whether session completed successfully */
    success: boolean;
    /** Error if session failed */
    error?: Error;
    /** Session statistics */
    stats: {
        startedAt: string;
        completedAt: string;
        toolCallCount: number;
        messageCount: number;
    };
}
/**
 * Running session instance.
 * Provides methods to interact with and control the session.
 */
export declare class RunningSession extends NodeEventEmitter {
    readonly sessionId: string;
    private readonly stateManager;
    private readonly protocol;
    private readonly transport;
    constructor(sessionId: string, _agent: SessionRunner, transport: Transport, protocol: ControlProtocolHandler, stateManager: SessionStateManager);
    /**
     * Async iterator that yields messages from the session.
     *
     * Messages are received from the protocol handler's event stream
     * (which reads from the transport via processMessages()). This avoids
     * competing with processMessages() for the transport's ReadableStream reader.
     */
    messages(): AsyncIterable<object>;
    /**
     * Pause the session.
     */
    pause(): Promise<void>;
    /**
     * Resume a paused session.
     */
    resume(): Promise<void>;
    /**
     * Cancel the session gracefully.
     *
     * Sends an interrupt signal to the CLI, transitions to cancelled state,
     * and closes the transport. If the interrupt request fails (e.g., CLI
     * unresponsive), the cancel still proceeds by force-closing the transport.
     *
     * Safe to call from any state:
     * - If already in a terminal state, this is a no-op.
     * - If in idle/starting/running/waiting/paused state, transitions to cancelled.
     */
    cancel(): Promise<void>;
    /**
     * Force-cancel the session without sending an interrupt signal.
     *
     * Immediately kills the subprocess and transitions to cancelled state.
     * Use this when the CLI is unresponsive and a graceful cancel would hang.
     *
     * Safe to call from any state:
     * - If already in a terminal state, this is a no-op.
     */
    abort(): Promise<void>;
    /**
     * Send interrupt signal to the session.
     *
     * Sends an interrupt to the CLI without cancelling the session.
     * The session remains active and may continue after processing the interrupt.
     */
    interrupt(): Promise<void>;
    /**
     * Get current session state.
     */
    getState(): SessionStateInfo;
    /**
     * Wait for session to complete.
     */
    waitForCompletion(): Promise<SessionResult>;
}
/**
 * High-level API for running Claude sessions with SDK tools.
 *
 * This agent spawns Claude Code CLI as a subprocess and communicates
 * via control protocol to handle SDK-registered tool calls.
 *
 * @example
 * ```typescript
 * import { SessionRunner, tool, createSdkMcpServer } from 'claude-code-agent/sdk';
 *
 * // Define a tool
 * const addTool = tool({
 *   name: 'add',
 *   description: 'Add two numbers',
 *   inputSchema: { a: 'number', b: 'number' },
 *   handler: async (args) => ({
 *     content: [{ type: 'text', text: `Result: ${args.a + args.b}` }]
 *   })
 * });
 *
 * // Create MCP server
 * const calculator = createSdkMcpServer({
 *   name: 'calculator',
 *   tools: [addTool]
 * });
 *
 * // Create agent with SDK tools
 * const agent = new SessionRunner({
 *   mcpServers: { calc: calculator },
 *   allowedTools: ['mcp__calc__add']
 * });
 *
 * // Run session
 * const session = await agent.startSession({
 *   prompt: 'Calculate 15 + 27 using the calculator'
 * });
 *
 * for await (const message of session.messages()) {
 *   console.log(message);
 * }
 * ```
 */
export declare class SessionRunner {
    private readonly options;
    private readonly toolRegistries;
    private readonly activeSessions;
    private sessionIdCounter;
    constructor(options?: SessionRunnerOptions);
    /**
     * Start a new session.
     *
     * Spawns Claude Code CLI, initializes control protocol,
     * and returns a session instance for interaction.
     */
    startSession(config: SessionConfig): Promise<RunningSession>;
    /**
     * Resume an existing session.
     *
     * Spawns Claude Code CLI with --resume flag to continue
     * a previously completed or paused session.
     *
     * @param sessionId - ID of the session to resume
     * @param prompt - Optional additional prompt for the resumed session
     * @param systemPrompt - Optional system prompt override for resumed session
     * @returns Running session instance
     */
    resumeSession(sessionId: string, prompt?: string, systemPrompt?: string | {
        preset: "claude_code";
        append?: string;
    }, attachments?: readonly SessionAttachment[]): Promise<RunningSession>;
    /**
     * Close all sessions and clean up.
     */
    close(): Promise<void>;
    /**
     * Get a list of active sessions.
     */
    getActiveSessions(): RunningSession[];
    /**
     * Create tool registries from mcpServers configuration.
     */
    private createToolRegistries;
    /**
     * Build MCP configuration for CLI.
     */
    private buildMcpConfig;
    /**
     * Build transport options from agent options.
     * Only include defined properties to satisfy exactOptionalPropertyTypes.
     */
    private buildTransportOptions;
    /**
     * Normalize system prompt option value.
     */
    private resolveSystemPrompt;
    /**
     * Generate unique session ID.
     */
    private generateSessionId;
    /**
     * Resolve attachment descriptors into concrete file paths.
     * In-memory content is materialized into temporary files.
     */
    private resolveSessionAttachments;
    /**
     * Augment the initial prompt with attachment references so Claude can consume them.
     */
    private buildInitialPromptWithAttachments;
    /**
     * Resolve base directory for relative attachment paths.
     */
    private resolveAttachmentBaseDir;
    /**
     * Resolve an attachment path relative to the session/project base directory.
     */
    private resolveAttachmentPath;
    /**
     * Resolve deterministic file name for an in-memory attachment.
     */
    private resolveAttachmentFileName;
    /**
     * Best-effort MIME type to extension mapping for in-memory attachments.
     */
    private extensionFromMimeType;
}
//# sourceMappingURL=session-runner.d.ts.map