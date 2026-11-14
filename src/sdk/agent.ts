/**
 * Main SDK agent class providing unified access to all managers.
 *
 * This class acts as a facade for all SDK functionality, providing
 * a single entry point for external applications and the daemon server.
 *
 * @module sdk/agent
 */

import type { Container } from "../container";
import { EventEmitter } from "./events";
import { EventEmitter as NodeEventEmitter } from "events";
import { SessionReader } from "./session-reader";
import { GroupManager, GroupRunner } from "./group";
import { QueueManager, QueueRunner } from "./queue";
import { BookmarkManager } from "./bookmarks";
import { ActivityManager } from "./activity/manager";
import { parseMarkdown } from "./markdown-parser";
import type { Transport } from "./transport/transport";
import { SubprocessTransport } from "./transport/subprocess";
import type { TransportOptions } from "./transport/subprocess";
import { ControlProtocolHandler } from "./control-protocol";
import { SessionStateManager } from "./session-state";
import { ToolRegistry } from "./tool-registry";
import type { McpServerConfig } from "./types/mcp";
import { isSdkServer } from "./types/mcp";
import type { SessionStateInfo, SessionState } from "./types/state";

/**
 * Main SDK agent providing unified access to all claude-code-agent functionality.
 *
 * The ClaudeCodeAgent class serves as the primary interface for programmatic
 * integration with claude-code-agent. It provides access to all managers and
 * utilities through a single, cohesive API.
 *
 * @example Basic usage
 * ```typescript
 * import { ClaudeCodeAgent } from "claude-code-agent/sdk";
 * import { createContainer } from "claude-code-agent/container";
 *
 * const container = createContainer();
 * const agent = await ClaudeCodeAgent.create(container);
 *
 * // Use session reader
 * const sessions = await agent.sessions.listSessions();
 *
 * // Use group manager
 * const group = await agent.groups.createGroup({
 *   name: "My Group",
 *   description: "Test group"
 * });
 * ```
 */
export class ClaudeCodeAgent {
  /**
   * Container for dependency injection
   */
  public readonly container: Container;

  /**
   * Event emitter for SDK-wide events
   */
  public readonly events: EventEmitter;

  /**
   * Session reader for transcript parsing and monitoring
   */
  public readonly sessions: SessionReader;

  /**
   * Group manager for session group CRUD operations
   */
  public readonly groups: GroupManager;

  /**
   * Group runner for executing session groups
   */
  public readonly groupRunner: GroupRunner;

  /**
   * Queue manager for command queue CRUD operations
   */
  public readonly queues: QueueManager;

  /**
   * Queue runner for executing command queues
   */
  public readonly queueRunner: QueueRunner;

  /**
   * Bookmark manager for bookmark operations
   */
  public readonly bookmarks: BookmarkManager;

  /**
   * Activity manager for session activity tracking
   */
  public readonly activity: ActivityManager;

  /**
   * Private constructor - use ClaudeCodeAgent.create() instead.
   *
   * @param container - Dependency injection container
   * @private
   */
  private constructor(container: Container) {
    this.container = container;
    this.events = new EventEmitter();

    // Initialize managers
    this.sessions = new SessionReader(container);
    this.groups = new GroupManager(
      container,
      container.groupRepository,
      this.events,
    );
    this.groupRunner = new GroupRunner(
      container,
      container.groupRepository,
      this.events,
    );
    this.queues = new QueueManager(
      container,
      container.queueRepository,
      this.events,
    );
    this.queueRunner = new QueueRunner(
      container,
      container.queueRepository,
      this.queues,
      this.events,
    );
    this.bookmarks = new BookmarkManager(
      container,
      container.bookmarkRepository,
    );
    this.activity = new ActivityManager(container.fileSystem, container.clock);
  }

  /**
   * Create and initialize a new ClaudeCodeAgent instance.
   *
   * This is the recommended way to create an agent instance as it ensures
   * all dependencies are properly initialized.
   *
   * @param container - Dependency injection container
   * @returns Initialized ClaudeCodeAgent instance
   */
  static async create(container: Container): Promise<ClaudeCodeAgent> {
    const agent = new ClaudeCodeAgent(container);
    // Future: Add any async initialization here
    return agent;
  }

  /**
   * Parse markdown content from messages.
   *
   * Convenience method for markdown parsing.
   *
   * @param content - Raw markdown content
   * @returns Parsed markdown structure
   */
  parseMarkdown(content: string) {
    return parseMarkdown(content);
  }
}

/**
 * Permission mode for tool execution.
 */
export type PermissionMode =
  | "default"
  | "acceptEdits"
  | "plan"
  | "bypassPermissions";

/**
 * Options for creating a ClaudeCodeToolAgent.
 */
export interface ToolAgentOptions {
  /** Working directory for Claude Code */
  cwd?: string;
  /** MCP servers (SDK and external) */
  mcpServers?: Record<string, McpServerConfig>;
  /** Tools to allow (pre-approved) */
  allowedTools?: string[];
  /** Tools to disallow */
  disallowedTools?: string[];
  /** System prompt customization */
  systemPrompt?: string | { preset: "claude_code"; append?: string };
  /** Permission mode */
  permissionMode?: PermissionMode;
  /** Model selection */
  model?: string;
  /** Budget limit */
  maxBudgetUsd?: number;
  /** Maximum turns */
  maxTurns?: number;
  /** Environment variables for Claude Code subprocess */
  env?: Record<string, string>;
  /** Custom CLI path (default: bundled or system claude) */
  cliPath?: string;
  /** Default timeout for operations in ms */
  defaultTimeout?: number;
}

/**
 * Configuration for starting a session.
 */
export interface SessionConfig {
  /** Initial prompt */
  prompt: string;
  /** Project path (defaults to cwd) */
  projectPath?: string;
  /** Session ID to resume (if resuming an existing session) */
  resumeSessionId?: string;
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
export class ToolAgentSession extends NodeEventEmitter {
  readonly sessionId: string;
  private readonly stateManager: SessionStateManager;
  private readonly protocol: ControlProtocolHandler;
  private readonly transport: Transport;

  constructor(
    sessionId: string,
    _agent: ClaudeCodeToolAgent,
    transport: Transport,
    protocol: ControlProtocolHandler,
    stateManager: SessionStateManager,
  ) {
    super();
    this.sessionId = sessionId;
    this.transport = transport;
    this.protocol = protocol;
    this.stateManager = stateManager;

    // Forward protocol events to session
    this.protocol.on("message", (msg: unknown) => this.emit("message", msg));
    this.protocol.on("toolCall", (call: unknown) =>
      this.emit("toolCall", call),
    );
    this.protocol.on("toolResult", (result: unknown) =>
      this.emit("toolResult", result),
    );
    this.protocol.on("error", (err: unknown) => this.emit("error", err));

    // Forward state manager events
    this.stateManager.on("stateChange", (change: unknown) =>
      this.emit("stateChange", change),
    );
  }

  /**
   * Async iterator that yields messages from the session.
   */
  async *messages(): AsyncIterable<object> {
    for await (const msg of this.transport.readMessages()) {
      await this.protocol.handleIncomingMessage(msg);
      yield msg;

      // If session reached terminal state, stop iteration
      if (this.stateManager.isTerminal()) {
        break;
      }
    }
  }

  /**
   * Pause the session.
   */
  async pause(): Promise<void> {
    this.stateManager.transition("paused");
  }

  /**
   * Resume a paused session.
   */
  async resume(): Promise<void> {
    this.stateManager.transition("running");
  }

  /**
   * Cancel the session.
   */
  async cancel(): Promise<void> {
    await this.protocol.sendRequest({ subtype: "interrupt" });
    this.stateManager.transition("cancelled");
    await this.transport.close();
  }

  /**
   * Send interrupt signal to the session.
   */
  async interrupt(): Promise<void> {
    await this.protocol.sendRequest({ subtype: "interrupt" });
  }

  /**
   * Get current session state.
   */
  getState(): SessionStateInfo {
    return this.stateManager.getState();
  }

  /**
   * Wait for session to complete.
   */
  async waitForCompletion(): Promise<SessionResult> {
    const terminalStates: SessionState[] = ["completed", "failed", "cancelled"];
    const finalState = await this.stateManager.waitForState(terminalStates);

    const success = finalState.state === "completed";
    const stats = {
      startedAt: finalState.stats.startedAt ?? new Date().toISOString(),
      completedAt: finalState.stats.completedAt ?? new Date().toISOString(),
      toolCallCount: finalState.stats.toolCallCount,
      messageCount: finalState.stats.messageCount,
    };

    this.emit("complete", { success, stats });

    return { success, stats };
  }
}

/**
 * High-level API for running Claude sessions with SDK tools.
 *
 * This agent spawns Claude Code CLI as a subprocess and communicates
 * via control protocol to handle SDK-registered tool calls.
 *
 * @example
 * ```typescript
 * import { ClaudeCodeToolAgent, tool, createSdkMcpServer } from 'claude-code-agent/sdk';
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
 * const agent = new ClaudeCodeToolAgent({
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
export class ClaudeCodeToolAgent {
  private readonly options: ToolAgentOptions;
  private readonly toolRegistries: Map<string, ToolRegistry> = new Map();
  private activeSessions: Map<string, ToolAgentSession> = new Map();
  private sessionIdCounter: number = 0;

  constructor(options?: ToolAgentOptions) {
    this.options = options ?? {};
    this.createToolRegistries();
  }

  /**
   * Start a new session.
   *
   * Spawns Claude Code CLI, initializes control protocol,
   * and returns a session instance for interaction.
   */
  async startSession(config: SessionConfig): Promise<ToolAgentSession> {
    const sessionId = this.generateSessionId();

    // Create transport options
    const transportOptions = this.buildTransportOptions();

    // Add resume and prompt support
    if (config.resumeSessionId !== undefined) {
      transportOptions.resumeSessionId = config.resumeSessionId;
      if (config.prompt !== "") {
        transportOptions.prompt = config.prompt;
      }
    }

    const transport = new SubprocessTransport(transportOptions);
    await transport.connect();

    // Create protocol handler with proper optional handling
    const protocolOptions =
      this.options.defaultTimeout !== undefined
        ? { defaultTimeout: this.options.defaultTimeout }
        : undefined;
    const protocol = new ControlProtocolHandler(transport, protocolOptions);

    // Register tool registries with protocol
    for (const [serverName, registry] of this.toolRegistries.entries()) {
      protocol.registerToolRegistry(serverName, registry);
    }

    // Initialize control protocol
    await protocol.initialize();

    // Create state manager
    const stateManager = new SessionStateManager(sessionId);

    // Create session instance
    const session = new ToolAgentSession(
      sessionId,
      this,
      transport,
      protocol,
      stateManager,
    );

    // Track active session
    this.activeSessions.set(sessionId, session);

    // Clean up on session complete
    session.on("complete", () => {
      this.activeSessions.delete(sessionId);
      protocol.cleanup();
      void transport.close();
    });

    // Mark session as started
    stateManager.transition("starting");
    stateManager.markStarted();

    // Start message processing in background
    void protocol.processMessages();

    // Send initial prompt (only for new sessions, not resumed ones)
    if (config.resumeSessionId === undefined) {
      const userMessage = {
        type: "user",
        content: config.prompt,
      };
      await transport.write(JSON.stringify(userMessage));
      stateManager.incrementMessageCount();
    }

    return session;
  }

  /**
   * Resume an existing session.
   *
   * Spawns Claude Code CLI with --resume flag to continue
   * a previously completed or paused session.
   *
   * @param sessionId - ID of the session to resume
   * @param prompt - Optional additional prompt for the resumed session
   * @returns Running session instance
   */
  async resumeSession(
    sessionId: string,
    prompt?: string,
  ): Promise<ToolAgentSession> {
    return this.startSession({
      prompt: prompt ?? "",
      resumeSessionId: sessionId,
    });
  }

  /**
   * Close all sessions and clean up.
   */
  async close(): Promise<void> {
    // Close all active sessions
    const closeTasks = Array.from(this.activeSessions.values()).map(
      async (session) => {
        await session.cancel();
      },
    );
    await Promise.all(closeTasks);

    this.activeSessions.clear();
  }

  /**
   * Get a list of active sessions.
   */
  getActiveSessions(): ToolAgentSession[] {
    return Array.from(this.activeSessions.values());
  }

  // Private methods

  /**
   * Create tool registries from mcpServers configuration.
   */
  private createToolRegistries(): void {
    if (this.options.mcpServers === undefined) {
      return;
    }

    for (const [serverName, config] of Object.entries(
      this.options.mcpServers,
    )) {
      if (isSdkServer(config)) {
        const registry = new ToolRegistry(serverName);
        for (const tool of config.tools) {
          registry.register(tool);
        }
        this.toolRegistries.set(serverName, registry);
      }
    }
  }

  /**
   * Build MCP configuration for CLI.
   */
  private buildMcpConfig(): object {
    if (this.options.mcpServers === undefined) {
      return {};
    }

    const mcpServers: Record<string, object> = {};

    for (const [name, config] of Object.entries(this.options.mcpServers)) {
      if (isSdkServer(config)) {
        // SDK servers are marked with type: 'sdk'
        // The instance is NOT passed to CLI (can't serialize)
        mcpServers[name] = {
          type: "sdk",
          name: config.name,
        };
      } else {
        // External servers passed as-is
        mcpServers[name] = config;
      }
    }

    return { mcpServers };
  }

  /**
   * Build transport options from agent options.
   * Only include defined properties to satisfy exactOptionalPropertyTypes.
   */
  private buildTransportOptions(): TransportOptions {
    const systemPrompt =
      typeof this.options.systemPrompt === "string"
        ? this.options.systemPrompt
        : this.options.systemPrompt?.preset === "claude_code"
          ? this.options.systemPrompt.append
          : undefined;

    const options: TransportOptions = {
      mcpConfig: this.buildMcpConfig(),
    };

    if (this.options.cliPath !== undefined)
      options.cliPath = this.options.cliPath;
    if (this.options.cwd !== undefined) options.cwd = this.options.cwd;
    if (this.options.env !== undefined) options.env = this.options.env;
    if (this.options.permissionMode !== undefined)
      options.permissionMode = this.options.permissionMode;
    if (this.options.model !== undefined) options.model = this.options.model;
    if (this.options.maxBudgetUsd !== undefined)
      options.maxBudgetUsd = this.options.maxBudgetUsd;
    if (this.options.maxTurns !== undefined)
      options.maxTurns = this.options.maxTurns;
    if (systemPrompt !== undefined) options.systemPrompt = systemPrompt;
    if (this.options.allowedTools !== undefined)
      options.allowedTools = this.options.allowedTools;
    if (this.options.disallowedTools !== undefined)
      options.disallowedTools = this.options.disallowedTools;

    return options;
  }

  /**
   * Generate unique session ID.
   */
  private generateSessionId(): string {
    this.sessionIdCounter += 1;
    return `sdk-session-${this.sessionIdCounter}`;
  }
}
