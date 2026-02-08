/**
 * Claude Code Agent SDK
 *
 * TypeScript SDK for programmatic integration with Claude Code sessions.
 *
 * This module provides the public API for external applications to integrate
 * with claude-code-agent. It includes types, managers, and utilities for
 * session monitoring, session groups, command queues, and real-time events.
 *
 * @example Session Groups
 * ```typescript
 * import { GroupManager, GroupRunner } from "claude-code-agent/sdk";
 *
 * // Create a session group
 * const manager = new GroupManager(container, repository, emitter);
 * const group = await manager.createGroup({
 *   name: "Cross-Project Refactor",
 *   description: "Refactor auth across services",
 * });
 *
 * // Add sessions
 * await manager.addSession(group.id, {
 *   id: "001-uuid-session1",
 *   projectPath: "/path/to/project-a",
 *   prompt: "Implement auth module",
 *   status: "pending",
 *   dependsOn: [],
 *   createdAt: new Date().toISOString(),
 * });
 *
 * // Run with concurrent execution
 * const runner = new GroupRunner(container, repository, emitter);
 * await runner.run(group.id, {
 *   maxConcurrent: 3,
 *   respectDependencies: true,
 * });
 * ```
 *
 * @packageDocumentation
 */

// Session Groups
export type {
  // Core types
  GroupStatus,
  BudgetConfig,
  ConcurrencyConfig,
  SessionConfig,
  GroupConfig,
  GroupSession,
  SessionGroup,
  // Events
  GroupCreatedEvent,
  GroupStartedEvent,
  GroupCompletedEvent,
  GroupPausedEvent,
  GroupResumedEvent,
  GroupFailedEvent,
  GroupSessionStartedEvent,
  GroupSessionCompletedEvent,
  GroupSessionFailedEvent,
  BudgetWarningEvent,
  BudgetExceededEvent,
  DependencyWaitingEvent,
  DependencyResolvedEvent,
  SessionProgressEvent,
  GroupProgressEvent,
  GroupEvent,
  GroupEventMap,
  GroupEventType,
  // Progress
  SessionProgress,
  GroupProgress,
  // Manager
  CreateGroupOptions,
  // Config Generator
  SessionConfigResult,
  ConfigGeneratorError,
  // Dependency Graph
  BlockedSession,
  // Runner
  RunOptions,
  PauseReason,
  RunnerState,
} from "./group";

export {
  // Type guards and defaults
  isTerminalGroupStatus,
  canResumeGroup,
  isActiveGroup,
  DEFAULT_BUDGET_CONFIG,
  DEFAULT_CONCURRENCY_CONFIG,
  DEFAULT_SESSION_CONFIG,
  DEFAULT_GROUP_CONFIG,
  // Progress utilities
  ProgressAggregator,
  createSessionProgress,
  calculateBudgetUsage,
  isBudgetWarning,
  isBudgetExceeded,
  // Classes
  GroupManager,
  ConfigGenerator,
  DependencyGraph,
  GroupRunner,
} from "./group";

// Command Queue
export type {
  // Core types
  QueueStatus,
  CommandStatus,
  SessionMode,
  QueueConfig,
  QueueStats,
  QueueCommand,
  CommandQueue,
  // Events
  BaseQueueEvent,
  QueueCreatedEvent,
  QueueStartedEvent,
  QueuePausedEvent,
  QueueResumedEvent,
  QueueStoppedEvent,
  QueueCompletedEvent,
  QueueFailedEvent,
  CommandStartedEvent,
  CommandCompletedEvent,
  CommandFailedEvent,
  CommandAddedEvent,
  CommandUpdatedEvent,
  CommandRemovedEvent,
  CommandReorderedEvent,
  CommandModeChangedEvent,
  QueueEvent,
} from "./queue";

// Events
export type {
  // Base and session events
  BaseEvent,
  SessionStartedEvent,
  SessionEndedEvent,
  MessageReceivedEvent,
  ToolStartedEvent,
  ToolCompletedEvent,
  TasksUpdatedEvent,
  SessionEvent,
  SdkEvent,
  EventMap,
  EventType,
  // Event emitter
  EventHandler,
  Subscription,
} from "./events";

export { EventEmitter, createEventEmitter } from "./events";

// Session Reader
export { SessionReader } from "./session-reader";

// Session Update Receiver
export {
  SessionUpdateReceiver,
  createSessionReceiver,
  type SessionUpdate,
  type ReceiverOptions,
} from "./receiver";

// Re-export TranscriptEvent from polling/parser for SDK consumers
export { type TranscriptEvent } from "../polling/parser";

// JSONL Parser
export {
  parseJsonl,
  parseJsonlWithRecovery,
  parseJsonLine,
  parseJsonlStream,
  toJsonl,
  toJsonLine,
} from "./jsonl-parser";

// Markdown Parser
export {
  parseMarkdown,
  type ParsedMarkdown,
  type MarkdownSection,
  type HeadingInfo,
  type ContentBlock,
  type ParagraphBlock,
  type CodeBlock,
  type ListBlock,
  type ListItem,
  type BlockquoteBlock,
  type TableBlock,
  type MarkdownMetadata,
  type ParseOptions,
} from "./markdown-parser";

// File Changes
export type {
  // Tool and operation types
  ModifyingTool,
  FileOperation,
  // File change
  FileChange,
  ChangedFile,
  // Session summary
  ChangedFilesSummary,
  // File history
  FileSessionMatch,
  FileHistory,
  // Index statistics
  IndexStats,
} from "./file-changes";

export {
  FileChangeService,
  type GetFilesOptions,
  type FindOptions,
  FileChangeExtractor,
  type ExtractOptions,
  FileChangeIndex,
} from "./file-changes";

// Bookmarks
export type {
  // Core types
  Bookmark,
  BookmarkType,
  MessageRange,
  CreateBookmarkOptions,
  BookmarkFilter,
  MatchType,
  BookmarkSearchResult,
  // Manager types
  SearchOptions,
  BookmarkWithContent,
} from "./bookmarks";

export { BookmarkManager } from "./bookmarks";

// Activity Tracking
export type {
  ActivityStatus,
  ActivityEntry,
  ActivityStore,
} from "../types/activity";

export type {
  ActivityManagerOptions,
  HookInput,
  UserPromptSubmitInput,
  PermissionRequestInput,
  StopInput,
  HookInputBase,
} from "./activity";

export { ActivityManager } from "./activity/manager";

// Queue Manager and Runner (re-export from queue module)
export { QueueManager, QueueRunner } from "./queue";

// Main SDK Agent
export {
  ClaudeCodeAgent,
  ClaudeCodeToolAgent,
  ToolAgentSession,
  type ToolAgentOptions,
  type SessionConfig as AgentSessionConfig,
  type SessionResult,
  type PermissionMode,
} from "./agent";

// SDK Client
export { ClaudeCodeClient, type ClientOptions, type Message } from "./client";

// Tool Registry
export {
  tool,
  createSdkMcpServer,
  toJsonSchema,
  ToolRegistry,
  type ToolConfig,
  type SdkMcpServerOptions,
} from "./tool-registry";

// SDK Types
export type {
  SdkTool,
  ToolInputSchema,
  ToolContext,
  ToolResult,
  ToolResultContent,
  JsonSchema,
  SimpleInputSchema,
  McpServerConfig,
  McpStdioServerConfig,
  McpHttpServerConfig,
  McpSdkServerConfig,
  SessionState,
  SessionStateInfo,
  PendingToolCall,
  PendingPermission,
  SessionStats,
} from "./types";

export {
  isJsonSchema,
  isSimpleSchema,
  isToolResultContent,
  isToolResult,
  isSdkServer,
  isStdioServer,
  isHttpServer,
  isValidMcpServerConfig,
  isTerminalState,
  isValidSessionState,
} from "./types";

// SDK Errors
export {
  ClaudeCodeAgentError,
  CLINotFoundError,
  CLIConnectionError,
  ToolExecutionError,
  ControlProtocolError,
  TimeoutError,
  InvalidStateError,
  isClaudeCodeAgentError,
  isCLINotFoundError,
  isCLIConnectionError,
  isToolExecutionError,
  isControlProtocolError,
  isTimeoutError,
  isInvalidStateError,
} from "./errors";
