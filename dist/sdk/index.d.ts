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
export type { GroupStatus, BudgetConfig, ConcurrencyConfig, SessionConfig, GroupConfig, GroupSession, SessionGroup, GroupCreatedEvent, GroupStartedEvent, GroupCompletedEvent, GroupPausedEvent, GroupResumedEvent, GroupFailedEvent, GroupSessionStartedEvent, GroupSessionCompletedEvent, GroupSessionFailedEvent, BudgetWarningEvent, BudgetExceededEvent, DependencyWaitingEvent, DependencyResolvedEvent, SessionProgressEvent, GroupProgressEvent, GroupEvent, GroupEventMap, GroupEventType, SessionProgress, GroupProgress, CreateGroupOptions, SessionConfigResult, ConfigGeneratorError, BlockedSession, RunOptions, PauseReason, RunnerState, } from "./group";
export { isTerminalGroupStatus, canResumeGroup, isActiveGroup, DEFAULT_BUDGET_CONFIG, DEFAULT_CONCURRENCY_CONFIG, DEFAULT_SESSION_CONFIG, DEFAULT_GROUP_CONFIG, ProgressAggregator, createSessionProgress, calculateBudgetUsage, isBudgetWarning, isBudgetExceeded, GroupManager, ConfigGenerator, DependencyGraph, GroupRunner, } from "./group";
export type { QueueStatus, CommandStatus, SessionMode, QueueConfig, QueueStats, QueueCommand, CommandQueue, BaseQueueEvent, QueueCreatedEvent, QueueStartedEvent, QueuePausedEvent, QueueResumedEvent, QueueStoppedEvent, QueueCompletedEvent, QueueFailedEvent, CommandStartedEvent, CommandCompletedEvent, CommandFailedEvent, CommandAddedEvent, CommandUpdatedEvent, CommandRemovedEvent, CommandReorderedEvent, CommandModeChangedEvent, QueueEvent, } from "./queue";
export type { BaseEvent, SessionStartedEvent, SessionEndedEvent, MessageReceivedEvent, ToolStartedEvent, ToolCompletedEvent, TasksUpdatedEvent, SessionEvent, SdkEvent, EventMap, EventType, EventHandler, Subscription, } from "./events";
export { EventEmitter, createEventEmitter } from "./events";
export { SessionReader } from "./session-reader";
export type { SessionIndexEntry, SessionIndex, ProjectInfo, SessionListResponse, ListSessionsByPathOptions, TranscriptSearchRole, SessionSearchSource, TranscriptSearchOptions, TranscriptSearchResult, SearchSessionsOptions, SessionSearchResponse, } from "../types/session-index";
export { SessionUpdateReceiver, createSessionReceiver, type ISessionUpdateReceiver, type SessionUpdate, type ReceiverOptions, } from "./receiver";
export { MockSessionUpdateReceiver, createMockSessionReceiver, } from "./__fixtures__/mock-receiver";
export type { TranscriptEvent } from "../polling/parser";
export { parseJsonl, parseJsonlWithRecovery, parseJsonLine, parseJsonlStream, toJsonl, toJsonLine, } from "./jsonl-parser";
export { parseMarkdown, type ParsedMarkdown, type MarkdownSection, type HeadingInfo, type ContentBlock, type ParagraphBlock, type CodeBlock, type ListBlock, type ListItem, type BlockquoteBlock, type TableBlock, type MarkdownMetadata, type ParseOptions, } from "./markdown-parser";
export type { ModifyingTool, FileOperation, FileChange, ChangedFile, ChangedFilesSummary, FileSessionMatch, FileHistory, IndexStats, } from "./file-changes";
export { FileChangeService, type GetFilesOptions, type FindOptions, FileChangeExtractor, type ExtractOptions, FileChangeIndex, } from "./file-changes";
export type { Bookmark, BookmarkType, MessageRange, CreateBookmarkOptions, BookmarkFilter, MatchType, BookmarkSearchResult, SearchOptions, BookmarkWithContent, } from "./bookmarks";
export { BookmarkManager } from "./bookmarks";
export type { ActivityStatus, ActivityEntry, ActivityStore, } from "../types/activity";
export type { ActivityManagerOptions, HookInput, UserPromptSubmitInput, PermissionRequestInput, StopInput, HookInputBase, } from "./activity";
export { ActivityManager } from "./activity/manager";
export { QueueManager, QueueRunner } from "./queue";
export type { ToolVersionInfo, AgentToolVersions } from "./tool-versions";
export { getToolVersions } from "./tool-versions";
export type { ClaudeReadinessCredentialSource, VerifyClaudeReadinessOptions, ClaudeReadinessResult, ClaudeAuthReadiness, ClaudeCliReadiness, ClaudeModelReadiness, } from "./readiness";
export { verifyClaudeReadiness } from "./readiness";
export type { ClaudeEnvironmentInput, ClaudeEnvironmentShape, } from "./environment";
export { ClaudeEnvironment, defineClaudeEnvironment, toClaudeEnvironmentRecord, } from "./environment";
export { SdkManager, SessionRunner, RunningSession, type SessionRunnerOptions, type SessionConfig as AgentSessionConfig, type SessionAttachment as AgentSessionAttachment, type SessionResult, type ClaudeReasoningEffort, type PermissionMode, } from "./agent";
export type { MockClaudeSessionAttachment, MockClaudeSessionConfig, MockClaudeSessionResult, MockClaudeSessionResultInput, MockClaudeRunningSessionOptions, MockClaudeStartSessionCall, MockClaudeResumeSessionCall, MockClaudeStateChange, } from "./mock-session-runner";
export { MockClaudeRunningSession, MockClaudeSessionRunner, createMockClaudeSessionRunner, } from "./mock-session-runner";
export { ClaudeCodeClient, type ClientOptions, type QueryOptions, type Message, } from "./client";
export { tool, createSdkMcpServer, toJsonSchema, ToolRegistry, type ToolConfig, type SdkMcpServerOptions, } from "./tool-registry";
export type { SdkTool, ToolInputSchema, ToolContext, ToolResult, ToolResultContent, JsonSchema, SimpleInputSchema, McpServerConfig, McpStdioServerConfig, McpHttpServerConfig, McpSdkServerConfig, SessionState, SessionStateInfo, PendingToolCall, PendingPermission, SessionStats, } from "./types";
export { isJsonSchema, isSimpleSchema, isToolResultContent, isToolResult, isSdkServer, isStdioServer, isHttpServer, isValidMcpServerConfig, isTerminalState, isValidSessionState, } from "./types";
export { ClaudeCodeAgentError, CLINotFoundError, CLIConnectionError, ToolExecutionError, ControlProtocolError, TimeoutError, InvalidStateError, isClaudeCodeAgentError, isCLINotFoundError, isCLIConnectionError, isToolExecutionError, isControlProtocolError, isTimeoutError, isInvalidStateError, } from "./errors";
//# sourceMappingURL=index.d.ts.map