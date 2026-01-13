/**
 * Event types for the SDK event system.
 *
 * These events are emitted during session execution, group operations,
 * queue processing, and other SDK activities.
 *
 * @module sdk/events/types
 */

/**
 * Base event interface with common properties.
 */
export interface BaseEvent {
  /** ISO timestamp when the event occurred */
  readonly timestamp: string;
}

// ============================================================================
// Session Events
// ============================================================================

/**
 * Emitted when a session starts.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "session_started",
 *   "timestamp": "2026-01-10T10:00:00.000Z",
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "projectPath": "/home/user/projects/my-app"
 * }
 * ```
 */
export interface SessionStartedEvent extends BaseEvent {
  readonly type: "session_started";
  readonly sessionId: string;
  readonly projectPath: string;
}

/**
 * Emitted when a session ends.
 *
 * @example Completed session
 * ```json
 * {
 *   "type": "session_ended",
 *   "timestamp": "2026-01-10T11:30:00.000Z",
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "status": "completed",
 *   "costUsd": 0.1234
 * }
 * ```
 *
 * @example Failed session
 * ```json
 * {
 *   "type": "session_ended",
 *   "timestamp": "2026-01-10T10:45:00.000Z",
 *   "sessionId": "abc12345-def6-7890-ghij-klmnopqrstuv",
 *   "status": "failed"
 * }
 * ```
 */
export interface SessionEndedEvent extends BaseEvent {
  readonly type: "session_ended";
  readonly sessionId: string;
  readonly status: "completed" | "failed" | "cancelled";
  readonly costUsd?: number | undefined;
}

/**
 * Emitted when a message is received in a session.
 *
 * @example User message
 * ```json
 * {
 *   "type": "message_received",
 *   "timestamp": "2026-01-10T10:05:00.000Z",
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "messageId": "msg-user-001",
 *   "role": "user"
 * }
 * ```
 *
 * @example Assistant message
 * ```json
 * {
 *   "type": "message_received",
 *   "timestamp": "2026-01-10T10:05:30.000Z",
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "messageId": "msg-asst-001",
 *   "role": "assistant"
 * }
 * ```
 */
export interface MessageReceivedEvent extends BaseEvent {
  readonly type: "message_received";
  readonly sessionId: string;
  readonly messageId: string;
  readonly role: "user" | "assistant" | "system";
}

/**
 * Emitted when a tool is invoked.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "tool_started",
 *   "timestamp": "2026-01-10T10:10:00.000Z",
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "toolName": "Read",
 *   "toolCallId": "toolu_01ABC123DEF456"
 * }
 * ```
 */
export interface ToolStartedEvent extends BaseEvent {
  readonly type: "tool_started";
  readonly sessionId: string;
  readonly toolName: string;
  readonly toolCallId: string;
}

/**
 * Emitted when a tool completes.
 *
 * @example Successful tool completion
 * ```json
 * {
 *   "type": "tool_completed",
 *   "timestamp": "2026-01-10T10:10:05.000Z",
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "toolName": "Read",
 *   "toolCallId": "toolu_01ABC123DEF456",
 *   "isError": false,
 *   "durationMs": 5000
 * }
 * ```
 *
 * @example Failed tool completion
 * ```json
 * {
 *   "type": "tool_completed",
 *   "timestamp": "2026-01-10T10:12:00.000Z",
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "toolName": "Bash",
 *   "toolCallId": "toolu_01XYZ789ABC123",
 *   "isError": true,
 *   "durationMs": 30000
 * }
 * ```
 */
export interface ToolCompletedEvent extends BaseEvent {
  readonly type: "tool_completed";
  readonly sessionId: string;
  readonly toolName: string;
  readonly toolCallId: string;
  readonly isError: boolean;
  readonly durationMs: number;
}

/**
 * Emitted when tasks are updated via TodoWrite.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "tasks_updated",
 *   "timestamp": "2026-01-10T10:15:00.000Z",
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "totalTasks": 5,
 *   "completedTasks": 2
 * }
 * ```
 */
export interface TasksUpdatedEvent extends BaseEvent {
  readonly type: "tasks_updated";
  readonly sessionId: string;
  readonly totalTasks: number;
  readonly completedTasks: number;
}

// ============================================================================
// Session Group Events
// ============================================================================

// NOTE: Group event types are now defined in src/sdk/group/events.ts
// Import and re-export them for backward compatibility
import type {
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
} from "../group/events";

export type {
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
};

// ============================================================================
// Command Queue Events
// ============================================================================

// NOTE: Queue event types are now defined in src/sdk/queue/events.ts
// Re-export them here for backward compatibility

import type { QueueEvent as QueueEventType } from "../queue/events";

// ============================================================================
// Union Types
// ============================================================================

/**
 * All session-related events.
 */
export type SessionEvent =
  | SessionStartedEvent
  | SessionEndedEvent
  | MessageReceivedEvent
  | ToolStartedEvent
  | ToolCompletedEvent
  | TasksUpdatedEvent;

/**
 * All command queue events.
 */
export type QueueEvent = QueueEventType;

/**
 * Union of all SDK events.
 */
export type SdkEvent = SessionEvent | GroupEvent | QueueEvent;

/**
 * Map of event types to their payloads.
 */
export interface EventMap {
  session_started: SessionStartedEvent;
  session_ended: SessionEndedEvent;
  message_received: MessageReceivedEvent;
  tool_started: ToolStartedEvent;
  tool_completed: ToolCompletedEvent;
  tasks_updated: TasksUpdatedEvent;
  group_created: GroupCreatedEvent;
  group_started: GroupStartedEvent;
  group_completed: GroupCompletedEvent;
  group_paused: GroupPausedEvent;
  group_resumed: GroupResumedEvent;
  group_failed: GroupFailedEvent;
  group_session_started: GroupSessionStartedEvent;
  group_session_completed: GroupSessionCompletedEvent;
  group_session_failed: GroupSessionFailedEvent;
  budget_warning: BudgetWarningEvent;
  budget_exceeded: BudgetExceededEvent;
  dependency_waiting: DependencyWaitingEvent;
  dependency_resolved: DependencyResolvedEvent;
  session_progress: SessionProgressEvent;
  group_progress: GroupProgressEvent;
  // Queue events - imported from sdk/queue/events
  queue_created: Extract<QueueEvent, { type: "queue_created" }>;
  queue_started: Extract<QueueEvent, { type: "queue_started" }>;
  queue_completed: Extract<QueueEvent, { type: "queue_completed" }>;
  queue_paused: Extract<QueueEvent, { type: "queue_paused" }>;
  queue_resumed: Extract<QueueEvent, { type: "queue_resumed" }>;
  queue_stopped: Extract<QueueEvent, { type: "queue_stopped" }>;
  queue_failed: Extract<QueueEvent, { type: "queue_failed" }>;
  command_started: Extract<QueueEvent, { type: "command_started" }>;
  command_completed: Extract<QueueEvent, { type: "command_completed" }>;
  command_failed: Extract<QueueEvent, { type: "command_failed" }>;
  command_added: Extract<QueueEvent, { type: "command_added" }>;
  command_updated: Extract<QueueEvent, { type: "command_updated" }>;
  command_removed: Extract<QueueEvent, { type: "command_removed" }>;
  command_reordered: Extract<QueueEvent, { type: "command_reordered" }>;
  command_mode_changed: Extract<QueueEvent, { type: "command_mode_changed" }>;
}

/**
 * All event type strings.
 */
export type EventType = keyof EventMap;
