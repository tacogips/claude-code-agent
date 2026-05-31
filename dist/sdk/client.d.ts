/**
 * Claude Code Client for multi-turn interactive sessions.
 *
 * Provides a wrapper around SessionRunner for interactive
 * conversational sessions with context preservation.
 *
 * @module sdk/client
 */
import { EventEmitter } from "node:events";
import { type SessionRunnerOptions, type SessionConfig } from "./agent";
import type { SessionStateInfo } from "./types/state";
/**
 * Options for creating a ClaudeCodeClient.
 *
 * Extends SessionRunnerOptions with additional client-specific options.
 */
export interface ClientOptions extends SessionRunnerOptions {
    /**
     * Keep the underlying agent connection alive between queries.
     * Default: false.
     *
     * When true, the agent persists between queries, allowing for
     * context preservation in multi-turn conversations.
     */
    readonly keepAlive?: boolean;
    /**
     * Automatically reconnect if an error occurs.
     * Default: false.
     *
     * When true, the client will attempt to reconnect if the connection
     * is lost due to an error.
     */
    readonly reconnectOnError?: boolean;
}
/**
 * Per-query options.
 */
export interface QueryOptions {
    /**
     * System prompt override for this query/session.
     */
    readonly systemPrompt?: SessionConfig["systemPrompt"];
}
/**
 * Message from Claude session.
 *
 * This is a generic message type that can represent user messages,
 * assistant messages, tool calls, tool results, and system messages.
 */
export interface Message {
    readonly type: string;
    readonly content?: string | object | undefined;
    readonly [key: string]: unknown;
}
/**
 * Multi-turn conversation client for Claude Code.
 *
 * ClaudeCodeClient wraps SessionRunner to provide a higher-level
 * interface for interactive sessions. It maintains session context
 * between queries and provides async iteration over response messages.
 *
 * @example Basic usage
 * ```typescript
 * import { ClaudeCodeClient, tool, createSdkMcpServer } from 'claude-code-agent/sdk';
 *
 * // Define a calculator tool
 * const addTool = tool({
 *   name: 'add',
 *   description: 'Add two numbers',
 *   inputSchema: { a: 'number', b: 'number' },
 *   handler: async (args) => ({
 *     content: [{ type: 'text', text: `Result: ${args.a + args.b}` }]
 *   })
 * });
 *
 * const calculator = createSdkMcpServer({
 *   name: 'calculator',
 *   tools: [addTool]
 * });
 *
 * // Create client with SDK tools
 * const client = new ClaudeCodeClient({
 *   mcpServers: { calc: calculator },
 *   allowedTools: ['mcp__calc__add']
 * });
 *
 * // Connect
 * await client.connect();
 *
 * // First query
 * await client.query('Calculate 15 + 27');
 * for await (const message of client.receiveResponse()) {
 *   console.log(message);
 * }
 *
 * // Second query (maintains context)
 * await client.query('Now multiply that result by 2');
 * for await (const message of client.receiveResponse()) {
 *   console.log(message);
 * }
 *
 * // Disconnect
 * await client.disconnect();
 * ```
 *
 * @example Error handling
 * ```typescript
 * const client = new ClaudeCodeClient({
 *   mcpServers: { calc: calculator },
 *   reconnectOnError: true
 * });
 *
 * try {
 *   await client.connect();
 *   await client.query('What is 10 + 20?');
 *
 *   for await (const message of client.receiveResponse()) {
 *     console.log(message);
 *   }
 * } catch (error) {
 *   console.error('Session error:', error);
 * } finally {
 *   await client.disconnect();
 * }
 * ```
 */
export declare class ClaudeCodeClient extends EventEmitter {
    private readonly options;
    private agent;
    private currentSession;
    private connectionState;
    /**
     * Create a new ClaudeCodeClient instance.
     *
     * @param options - Configuration options for the client
     */
    constructor(options?: ClientOptions);
    /**
     * Connect the client and prepare for queries.
     *
     * This initializes the client but does NOT start a session yet.
     * Call query() to start the first session.
     *
     * @throws {CLINotFoundError} If CLI binary not found
     * @throws {CLIConnectionError} If connection fails
     *
     * @example
     * ```typescript
     * const client = new ClaudeCodeClient();
     * await client.connect();
     * console.log(client.isConnected());  // true
     * ```
     */
    connect(): Promise<void>;
    /**
     * Send a query and start or continue a session.
     *
     * If no session exists, starts a new session with the query as initial prompt.
     * If a session exists, sends the query as a continuation of that session.
     *
     * @param prompt - The user query or prompt
     * @throws {Error} If client is not connected
     * @throws {Error} If session fails to start
     *
     * @example First query
     * ```typescript
     * await client.query('What is 2 + 2?');
     * ```
     *
     * @example Subsequent query
     * ```typescript
     * await client.query('What is 2 + 2?');
     * // Wait for response...
     * await client.query('Now multiply that by 3');
     * ```
     */
    query(prompt: string, options?: QueryOptions): Promise<void>;
    /**
     * Receive response messages from the current session.
     *
     * Returns an async iterable that yields messages as they arrive from Claude.
     * The iterator completes when the session reaches a terminal state or
     * when no session is active.
     *
     * @yields Message objects from the session
     * @throws {Error} If no session is active
     *
     * @example
     * ```typescript
     * await client.query('Calculate 10 + 20');
     *
     * for await (const message of client.receiveResponse()) {
     *   if (message.type === 'assistant') {
     *     console.log('Claude says:', message.content);
     *   }
     * }
     * ```
     */
    receiveResponse(): AsyncIterable<Message>;
    /**
     * Disconnect the client and close the current session.
     *
     * Cancels any active session and cleans up resources.
     * After disconnecting, call connect() again to reuse the client.
     *
     * @example
     * ```typescript
     * await client.disconnect();
     * console.log(client.isConnected());  // false
     * ```
     */
    disconnect(): Promise<void>;
    /**
     * Check if the client is currently connected.
     *
     * @returns true if connected, false otherwise
     *
     * @example
     * ```typescript
     * if (client.isConnected()) {
     *   await client.query('Hello');
     * } else {
     *   await client.connect();
     * }
     * ```
     */
    isConnected(): boolean;
    /**
     * Get the current session state.
     *
     * Returns the state of the active session, or null if no session is active.
     *
     * @returns Session state information or null
     *
     * @example
     * ```typescript
     * const state = client.getState();
     * if (state) {
     *   console.log('Session state:', state.state);
     *   console.log('Tool calls:', state.stats.toolCallCount);
     * }
     * ```
     */
    getState(): SessionStateInfo | null;
    /**
     * Forward events from the session to the client.
     */
    private forwardSessionEvents;
    /**
     * Reconnect the client after an error.
     */
    private reconnect;
}
//# sourceMappingURL=client.d.ts.map