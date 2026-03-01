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
import { mkdir, writeFile, rm } from "node:fs/promises";
import { isAbsolute, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
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
import {
  getToolVersions as detectToolVersions,
  type AgentToolVersions,
} from "./tool-versions";

/**
 * Main SDK agent providing unified access to all claude-code-agent functionality.
 *
 * The SdkManager class serves as the primary interface for programmatic
 * integration with claude-code-agent. It provides access to all managers and
 * utilities through a single, cohesive API.
 *
 * @example Basic usage
 * ```typescript
 * import { SdkManager } from "claude-code-agent/sdk";
 * import { createContainer } from "claude-code-agent/container";
 *
 * const container = createContainer();
 * const agent = await SdkManager.create(container);
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
export class SdkManager {
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
   * Private constructor - use SdkManager.create() instead.
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
   * Create and initialize a new SdkManager instance.
   *
   * This is the recommended way to create an agent instance as it ensures
   * all dependencies are properly initialized.
   *
   * @param container - Dependency injection container
   * @returns Initialized SdkManager instance
   */
  static async create(container: Container): Promise<SdkManager> {
    const agent = new SdkManager(container);
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

  /**
   * Retrieve installed CLI tool versions used by the agent runtime.
   *
   * Returns structured success/error results for each tool so host
   * applications can display health and availability without shelling out.
   */
  async getToolVersions(): Promise<AgentToolVersions> {
    return detectToolVersions(this.container.processManager);
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
 * Options for creating a SessionRunner.
 */
export interface SessionRunnerOptions {
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
  /** Additional CLI arguments to pass to Claude Code (e.g., ['--dangerously-skip-permissions']) */
  additionalArgs?: string[];
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
  systemPrompt?: string | { preset: "claude_code"; append?: string };
  /** Optional file/image attachments for the initial prompt */
  attachments?: SessionAttachment[];
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
export class RunningSession extends NodeEventEmitter {
  readonly sessionId: string;
  private readonly stateManager: SessionStateManager;
  private readonly protocol: ControlProtocolHandler;
  private readonly transport: Transport;

  constructor(
    sessionId: string,
    _agent: SessionRunner,
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
   *
   * Messages are received from the protocol handler's event stream
   * (which reads from the transport via processMessages()). This avoids
   * competing with processMessages() for the transport's ReadableStream reader.
   */
  async *messages(): AsyncIterable<object> {
    const queue: object[] = [];
    let resolve: (() => void) | null = null;
    let done = false;

    const onMessage = (msg: unknown) => {
      if (typeof msg === "object" && msg !== null) {
        queue.push(msg as object);
        if (resolve !== null) {
          const r = resolve;
          resolve = null;
          r();
        }
      }
    };

    const onDone = () => {
      done = true;
      if (resolve !== null) {
        const r = resolve;
        resolve = null;
        r();
      }
    };

    // Listen for all message events from protocol
    this.protocol.on("message", onMessage);

    // When transport ends, processMessages() finishes and stateManager transitions
    this.stateManager.on("stateChange", () => {
      if (this.stateManager.isTerminal()) {
        onDone();
      }
    });

    // If processMessages already completed before messages() was called
    if (this.stateManager.isTerminal()) {
      return;
    }

    // Use a timeout to detect when the CLI process exits
    const checkInterval = setInterval(() => {
      if (this.stateManager.isTerminal()) {
        onDone();
      }
    }, 500);

    try {
      while (!done) {
        // Yield any queued messages
        while (queue.length > 0) {
          const msg = queue.shift();
          if (msg !== undefined) {
            yield msg;
          }
          if (this.stateManager.isTerminal()) {
            return;
          }
        }

        if (done) break;

        // Wait for next message or completion
        await new Promise<void>((r) => {
          resolve = r;
        });
      }

      // Yield remaining messages
      while (queue.length > 0) {
        const msg = queue.shift();
        if (msg !== undefined) {
          yield msg;
        }
      }
    } finally {
      clearInterval(checkInterval);
      this.protocol.removeListener("message", onMessage);
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
  async cancel(): Promise<void> {
    if (this.stateManager.isTerminal()) {
      return;
    }

    // Try to send interrupt signal, but don't block cancel on it
    try {
      await Promise.race([
        this.protocol.sendRequest({ subtype: "interrupt" }),
        new Promise<void>((resolve) => setTimeout(resolve, 3000)),
      ]);
    } catch {
      // Interrupt request failed (transport closed, timeout, etc.) - proceed with cancel
    }

    // Transition to cancelled state
    try {
      if (!this.stateManager.isTerminal()) {
        this.stateManager.transition("cancelled");
      }
    } catch {
      // State transition may fail if a concurrent transition happened
    }

    // Clean up protocol and close transport
    this.protocol.cleanup();
    await this.transport.close();
  }

  /**
   * Force-cancel the session without sending an interrupt signal.
   *
   * Immediately kills the subprocess and transitions to cancelled state.
   * Use this when the CLI is unresponsive and a graceful cancel would hang.
   *
   * Safe to call from any state:
   * - If already in a terminal state, this is a no-op.
   */
  async abort(): Promise<void> {
    if (this.stateManager.isTerminal()) {
      return;
    }

    // Transition to cancelled state immediately
    try {
      if (!this.stateManager.isTerminal()) {
        this.stateManager.transition("cancelled");
      }
    } catch {
      // State transition may fail if a concurrent transition happened
    }

    // Clean up protocol and force-close transport
    this.protocol.cleanup();
    await this.transport.close();
  }

  /**
   * Send interrupt signal to the session.
   *
   * Sends an interrupt to the CLI without cancelling the session.
   * The session remains active and may continue after processing the interrupt.
   */
  async interrupt(): Promise<void> {
    if (this.stateManager.isTerminal()) {
      return;
    }
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
export class SessionRunner {
  private readonly options: SessionRunnerOptions;
  private readonly toolRegistries: Map<string, ToolRegistry> = new Map();
  private activeSessions: Map<string, RunningSession> = new Map();
  private sessionIdCounter: number = 0;

  constructor(options?: SessionRunnerOptions) {
    this.options = options ?? {};
    this.createToolRegistries();
  }

  /**
   * Start a new session.
   *
   * Spawns Claude Code CLI, initializes control protocol,
   * and returns a session instance for interaction.
   */
  async startSession(config: SessionConfig): Promise<RunningSession> {
    const sessionId = this.generateSessionId();
    let cleanupAttachmentFiles: (() => Promise<void>) | undefined;

    try {
      // Create transport options
      const transportOptions = this.buildTransportOptions();

      // Add resume support
      if (config.resumeSessionId !== undefined) {
        transportOptions.resumeSessionId = config.resumeSessionId;
      }
      if (config.systemPrompt !== undefined) {
        const resolvedSystemPrompt = this.resolveSystemPrompt(
          config.systemPrompt,
        );
        if (resolvedSystemPrompt !== undefined) {
          transportOptions.systemPrompt = resolvedSystemPrompt;
        }
      }

      const attachmentResolution = await this.resolveSessionAttachments(
        sessionId,
        config.attachments,
        config.projectPath,
      );
      cleanupAttachmentFiles = attachmentResolution.cleanup;
      if (attachmentResolution.paths.length > 0) {
        transportOptions.attachmentPaths = attachmentResolution.paths;
      }

      const initialPrompt = this.buildInitialPromptWithAttachments(
        config.prompt,
        attachmentResolution.paths,
      );

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

      // Create state manager early so processMessages completion can update it
      const stateManager = new SessionStateManager(sessionId);

      // Start message processing BEFORE initialize to avoid deadlock.
      // initialize() sends a control request and waits for a response,
      // but responses are only read by processMessages(). Starting
      // processMessages() first ensures the response can be received.
      protocol
        .processMessages()
        .then(() => {
          // Transport ended - CLI process exited
          try {
            if (!stateManager.isTerminal()) {
              stateManager.markCompleted();
            }
          } catch {
            // State transition may fail if state hasn't reached a valid source state yet
          }
        })
        .catch((err: unknown) => {
          try {
            if (!stateManager.isTerminal()) {
              stateManager.markFailed(
                err instanceof Error ? err : new Error(String(err)),
              );
            }
          } catch {
            // State transition may fail if state hasn't reached a valid source state yet
          }
        });

      // Initialize control protocol
      await protocol.initialize();

      // Send initial prompt through stream-json stdin after initialize.
      if (initialPrompt !== "") {
        await transport.write(
          JSON.stringify({
            type: "user",
            message: {
              role: "user",
              content: initialPrompt,
            },
          }),
        );
      }

      // Create session instance
      const session = new RunningSession(
        sessionId,
        this,
        transport,
        protocol,
        stateManager,
      );

      // Track active session
      this.activeSessions.set(sessionId, session);

      // Clean up when session reaches any terminal state
      stateManager.on("stateChange", (change: { to: string }) => {
        if (
          change.to === "completed" ||
          change.to === "failed" ||
          change.to === "cancelled"
        ) {
          this.activeSessions.delete(sessionId);
        }
      });

      // Also clean up on session complete event (for waitForCompletion callers)
      session.on("complete", () => {
        this.activeSessions.delete(sessionId);
        protocol.cleanup();
        void transport.close();
        if (cleanupAttachmentFiles !== undefined) {
          void cleanupAttachmentFiles();
        }
      });

      // Listen for session result from CLI
      protocol.on("result", (result: { success: boolean }) => {
        if (!stateManager.isTerminal()) {
          if (result.success) {
            stateManager.markCompleted();
          } else {
            stateManager.markFailed(new Error("Session failed"));
          }
        }
      });

      // Mark session as started
      stateManager.transition("starting");
      stateManager.markStarted();

      return session;
    } catch (error) {
      if (cleanupAttachmentFiles !== undefined) {
        await cleanupAttachmentFiles();
      }
      throw error;
    }
  }

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
  async resumeSession(
    sessionId: string,
    prompt?: string,
    systemPrompt?: string | { preset: "claude_code"; append?: string },
    attachments?: SessionAttachment[],
  ): Promise<RunningSession> {
    const config: SessionConfig = {
      prompt: prompt ?? "",
      resumeSessionId: sessionId,
    };

    if (systemPrompt !== undefined) {
      config.systemPrompt = systemPrompt;
    }
    if (attachments !== undefined) {
      config.attachments = attachments;
    }

    return this.startSession(config);
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
  getActiveSessions(): RunningSession[] {
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
    const systemPrompt = this.resolveSystemPrompt(this.options.systemPrompt);

    const options: TransportOptions = {};

    if (this.options.mcpServers !== undefined) {
      options.mcpConfig = this.buildMcpConfig();
    }

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
    if (this.options.additionalArgs !== undefined)
      options.additionalArgs = this.options.additionalArgs;

    return options;
  }

  /**
   * Normalize system prompt option value.
   */
  private resolveSystemPrompt(
    value: string | { preset: "claude_code"; append?: string } | undefined,
  ): string | undefined {
    if (typeof value === "string") {
      return value;
    }
    if (value?.preset === "claude_code") {
      return value.append;
    }
    return undefined;
  }

  /**
   * Generate unique session ID.
   */
  private generateSessionId(): string {
    this.sessionIdCounter += 1;
    return `sdk-session-${this.sessionIdCounter}`;
  }

  /**
   * Resolve attachment descriptors into concrete file paths.
   * In-memory content is materialized into temporary files.
   */
  private async resolveSessionAttachments(
    sessionId: string,
    attachments: SessionAttachment[] | undefined,
    projectPath: string | undefined,
  ): Promise<{ paths: string[]; cleanup: (() => Promise<void>) | undefined }> {
    if (attachments === undefined || attachments.length === 0) {
      return { paths: [], cleanup: undefined };
    }

    const baseDir = this.resolveAttachmentBaseDir(projectPath);
    const tempDir = resolve(
      tmpdir(),
      "claude-code-agent",
      "attachments",
      sessionId,
    );
    const materialized = new Set<string>();
    const paths: string[] = [];

    for (const attachment of attachments) {
      if (attachment.path !== undefined && attachment.path !== "") {
        const resolvedPath = this.resolveAttachmentPath(
          attachment.path,
          baseDir,
        );
        paths.push(resolvedPath);
        continue;
      }

      if (attachment.content !== undefined) {
        const fileName = this.resolveAttachmentFileName(attachment);
        const destination = resolve(tempDir, fileName);
        await mkdir(dirname(destination), { recursive: true });

        const encoding = attachment.encoding ?? "utf8";
        const data =
          encoding === "base64"
            ? Buffer.from(attachment.content, "base64")
            : Buffer.from(attachment.content, "utf8");
        await writeFile(destination, new Uint8Array(data));
        materialized.add(destination);
        paths.push(destination);
      }
    }

    const uniquePaths = Array.from(new Set(paths));
    if (materialized.size === 0) {
      return { paths: uniquePaths, cleanup: undefined };
    }

    const cleanup = async () => {
      await rm(tempDir, { recursive: true, force: true });
    };
    return { paths: uniquePaths, cleanup };
  }

  /**
   * Augment the initial prompt with attachment references so Claude can consume them.
   */
  private buildInitialPromptWithAttachments(
    prompt: string,
    attachmentPaths: string[],
  ): string {
    if (attachmentPaths.length === 0) {
      return prompt;
    }

    const attachmentSection = [
      "",
      "Attached files:",
      ...attachmentPaths.map((path) => `- ${path}`),
    ].join("\n");

    return `${prompt}${attachmentSection}`;
  }

  /**
   * Resolve base directory for relative attachment paths.
   */
  private resolveAttachmentBaseDir(projectPath: string | undefined): string {
    if (projectPath !== undefined && projectPath !== "") {
      return resolve(projectPath);
    }
    if (this.options.cwd !== undefined && this.options.cwd !== "") {
      return resolve(this.options.cwd);
    }
    return process.cwd();
  }

  /**
   * Resolve an attachment path relative to the session/project base directory.
   */
  private resolveAttachmentPath(pathValue: string, baseDir: string): string {
    if (isAbsolute(pathValue)) {
      return pathValue;
    }
    return resolve(baseDir, pathValue);
  }

  /**
   * Resolve deterministic file name for an in-memory attachment.
   */
  private resolveAttachmentFileName(attachment: SessionAttachment): string {
    if (attachment.fileName !== undefined && attachment.fileName !== "") {
      return attachment.fileName;
    }
    const mimeExt = this.extensionFromMimeType(attachment.mimeType);
    if (mimeExt !== undefined) {
      return `attachment${mimeExt}`;
    }
    return "attachment.bin";
  }

  /**
   * Best-effort MIME type to extension mapping for in-memory attachments.
   */
  private extensionFromMimeType(
    mimeType: string | undefined,
  ): string | undefined {
    if (mimeType === undefined || mimeType === "") {
      return undefined;
    }

    const lower = mimeType.toLowerCase();
    if (lower === "image/png") return ".png";
    if (lower === "image/jpeg") return ".jpg";
    if (lower === "image/gif") return ".gif";
    if (lower === "image/webp") return ".webp";
    if (lower === "application/pdf") return ".pdf";
    if (lower === "text/plain") return ".txt";

    const slash = lower.indexOf("/");
    if (slash === -1) return undefined;
    const subtype = lower
      .slice(slash + 1)
      .split(";")[0]
      ?.trim();
    if (subtype === undefined || subtype === "") {
      return undefined;
    }
    const normalizedSubtype = subtype.replace(/[^a-z0-9.+-]/g, "");
    if (normalizedSubtype === "") {
      return undefined;
    }
    return `.${normalizedSubtype}`;
  }
}
