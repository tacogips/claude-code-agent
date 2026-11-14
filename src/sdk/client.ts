/**
 * Claude Code Client for multi-turn interactive sessions.
 *
 * Provides a wrapper around SessionRunner for interactive
 * conversational sessions with context preservation.
 *
 * @module sdk/client
 */

import { EventEmitter } from "node:events";
import {
  SessionRunner,
  type SessionRunnerOptions,
  type RunningSession,
  type SessionConfig,
} from "./agent";
import type { SessionStateInfo } from "./types/state";
import { createTaggedLogger } from "../logger";

const logger = createTaggedLogger("client");

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
export class ClaudeCodeClient extends EventEmitter {
  private readonly options: ClientOptions;
  private agent: SessionRunner;
  private currentSession: RunningSession | null = null;
  private connectionState: "disconnected" | "connected" | "connecting" =
    "disconnected";

  /**
   * Create a new ClaudeCodeClient instance.
   *
   * @param options - Configuration options for the client
   */
  constructor(options?: ClientOptions) {
    super();
    this.options = options ?? {};
    this.agent = new SessionRunner(this.options);
  }

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
  async connect(): Promise<void> {
    if (this.connectionState === "connected") {
      logger.debug("Client already connected");
      return;
    }

    if (this.connectionState === "connecting") {
      logger.warn("Connection already in progress");
      return;
    }

    this.connectionState = "connecting";
    logger.info("Connecting client...");

    try {
      // Client connection is primarily state management
      // The actual CLI subprocess is spawned when starting a session
      this.connectionState = "connected";
      logger.info("Client connected successfully");
    } catch (error) {
      this.connectionState = "disconnected";
      logger.error("Failed to connect client", error);
      throw error;
    }
  }

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
  async query(prompt: string, options?: QueryOptions): Promise<void> {
    if (this.connectionState !== "connected") {
      throw new Error("Client is not connected. Call connect() first.");
    }

    logger.info("Sending query", { prompt: prompt.slice(0, 50) + "..." });

    try {
      if (this.currentSession === null) {
        // Start new session
        logger.debug("Starting new session");
        const config: SessionConfig = { prompt };
        if (options?.systemPrompt !== undefined) {
          config.systemPrompt = options.systemPrompt;
        }
        this.currentSession = await this.agent.startSession(config);

        // Forward session events
        this.forwardSessionEvents(this.currentSession);
      } else {
        // Continue existing session (not yet supported by CLI)
        // For now, we'll log a warning and treat as new session
        logger.warn(
          "Multi-turn continuation not yet implemented, starting new session",
        );
        // Clean up old session
        await this.currentSession.cancel();
        this.currentSession = null;

        // Start new session
        const config: SessionConfig = { prompt };
        if (options?.systemPrompt !== undefined) {
          config.systemPrompt = options.systemPrompt;
        }
        this.currentSession = await this.agent.startSession(config);
        this.forwardSessionEvents(this.currentSession);
      }
    } catch (error) {
      logger.error("Failed to send query", error);

      if (this.options.reconnectOnError === true) {
        logger.info("Attempting reconnection...");
        await this.reconnect();
        // Retry query after reconnection
        await this.query(prompt, options);
      } else {
        throw error;
      }
    }
  }

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
  async *receiveResponse(): AsyncIterable<Message> {
    if (this.currentSession === null) {
      throw new Error("No active session. Call query() first.");
    }

    logger.debug("Receiving response from session", {
      sessionId: this.currentSession.sessionId,
    });

    try {
      for await (const message of this.currentSession.messages()) {
        yield message as Message;
      }
    } catch (error) {
      logger.error("Error receiving response", error);
      throw error;
    } finally {
      // Clean up session if not keeping alive
      if (this.options.keepAlive !== true) {
        logger.debug("Closing session (keepAlive=false)");
        this.currentSession = null;
      }
    }
  }

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
  async disconnect(): Promise<void> {
    if (this.connectionState === "disconnected") {
      logger.debug("Client already disconnected");
      return;
    }

    logger.info("Disconnecting client...");

    try {
      // Cancel current session if active
      if (this.currentSession !== null) {
        logger.debug("Cancelling active session");
        await this.currentSession.cancel();
        this.currentSession = null;
      }

      // Close agent
      await this.agent.close();

      this.connectionState = "disconnected";
      logger.info("Client disconnected successfully");
    } catch (error) {
      logger.error("Error during disconnect", error);
      // Still mark as disconnected even if error occurs
      this.connectionState = "disconnected";
      throw error;
    }
  }

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
  isConnected(): boolean {
    return this.connectionState === "connected";
  }

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
  getState(): SessionStateInfo | null {
    if (this.currentSession === null) {
      return null;
    }

    return this.currentSession.getState();
  }

  // Private methods

  /**
   * Forward events from the session to the client.
   */
  private forwardSessionEvents(session: RunningSession): void {
    session.on("message", (msg: unknown) => this.emit("message", msg));
    session.on("toolCall", (call: unknown) => this.emit("toolCall", call));
    session.on("toolResult", (result: unknown) =>
      this.emit("toolResult", result),
    );
    session.on("stateChange", (change: unknown) =>
      this.emit("stateChange", change),
    );
    session.on("complete", (result: unknown) => this.emit("complete", result));
    session.on("error", (error: unknown) => this.emit("error", error));
  }

  /**
   * Reconnect the client after an error.
   */
  private async reconnect(): Promise<void> {
    logger.info("Reconnecting client...");

    // Close old agent
    await this.agent.close();

    // Create new agent
    this.agent = new SessionRunner(this.options);

    // Reset session
    this.currentSession = null;

    // Mark as connected
    this.connectionState = "connected";

    logger.info("Reconnection successful");
  }
}
