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
 */
export interface SessionStartedEvent extends BaseEvent {
  readonly type: "session_started";
  readonly sessionId: string;
  readonly projectPath: string;
}

/**
 * Emitted when a session ends.
 */
export interface SessionEndedEvent extends BaseEvent {
  readonly type: "session_ended";
  readonly sessionId: string;
  readonly status: "completed" | "failed" | "cancelled";
  readonly costUsd?: number | undefined;
}

/**
 * Emitted when a message is received in a session.
 */
export interface MessageReceivedEvent extends BaseEvent {
  readonly type: "message_received";
  readonly sessionId: string;
  readonly messageId: string;
  readonly role: "user" | "assistant" | "system";
}

/**
 * Emitted when a tool is invoked.
 */
export interface ToolStartedEvent extends BaseEvent {
  readonly type: "tool_started";
  readonly sessionId: string;
  readonly toolName: string;
  readonly toolCallId: string;
}

/**
 * Emitted when a tool completes.
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

/**
 * Emitted when a session group is created.
 */
export interface GroupCreatedEvent extends BaseEvent {
  readonly type: "group_created";
  readonly groupId: string;
  readonly name: string;
}

/**
 * Emitted when a session group starts execution.
 */
export interface GroupStartedEvent extends BaseEvent {
  readonly type: "group_started";
  readonly groupId: string;
  readonly totalSessions: number;
}

/**
 * Emitted when a session group completes.
 */
export interface GroupCompletedEvent extends BaseEvent {
  readonly type: "group_completed";
  readonly groupId: string;
  readonly completedSessions: number;
  readonly failedSessions: number;
  readonly totalCostUsd: number;
}

/**
 * Emitted when a session group is paused.
 */
export interface GroupPausedEvent extends BaseEvent {
  readonly type: "group_paused";
  readonly groupId: string;
  readonly runningSessions: number;
}

/**
 * Emitted when a session group is resumed.
 */
export interface GroupResumedEvent extends BaseEvent {
  readonly type: "group_resumed";
  readonly groupId: string;
}

/**
 * Emitted when a session within a group starts.
 */
export interface GroupSessionStartedEvent extends BaseEvent {
  readonly type: "group_session_started";
  readonly groupId: string;
  readonly sessionId: string;
  readonly projectPath: string;
}

/**
 * Emitted when a session within a group completes.
 */
export interface GroupSessionCompletedEvent extends BaseEvent {
  readonly type: "group_session_completed";
  readonly groupId: string;
  readonly sessionId: string;
  readonly status: "completed" | "failed";
  readonly costUsd?: number | undefined;
}

/**
 * Emitted when budget warning threshold is reached.
 */
export interface BudgetWarningEvent extends BaseEvent {
  readonly type: "budget_warning";
  readonly groupId: string;
  readonly currentUsage: number;
  readonly limit: number;
  readonly percentUsed: number;
}

/**
 * Emitted when budget is exceeded.
 */
export interface BudgetExceededEvent extends BaseEvent {
  readonly type: "budget_exceeded";
  readonly groupId: string;
  readonly usage: number;
  readonly limit: number;
}

// ============================================================================
// Command Queue Events
// ============================================================================

/**
 * Emitted when a command queue is created.
 */
export interface QueueCreatedEvent extends BaseEvent {
  readonly type: "queue_created";
  readonly queueId: string;
  readonly name: string;
  readonly projectPath: string;
}

/**
 * Emitted when a command queue starts execution.
 */
export interface QueueStartedEvent extends BaseEvent {
  readonly type: "queue_started";
  readonly queueId: string;
  readonly totalCommands: number;
}

/**
 * Emitted when a command queue completes.
 */
export interface QueueCompletedEvent extends BaseEvent {
  readonly type: "queue_completed";
  readonly queueId: string;
  readonly completedCommands: number;
  readonly failedCommands: number;
}

/**
 * Emitted when a command queue is paused.
 */
export interface QueuePausedEvent extends BaseEvent {
  readonly type: "queue_paused";
  readonly queueId: string;
  readonly currentCommandIndex: number;
}

/**
 * Emitted when a command in a queue starts.
 */
export interface CommandStartedEvent extends BaseEvent {
  readonly type: "command_started";
  readonly queueId: string;
  readonly commandId: string;
  readonly commandIndex: number;
  readonly isNewSession: boolean;
}

/**
 * Emitted when a command in a queue completes.
 */
export interface CommandCompletedEvent extends BaseEvent {
  readonly type: "command_completed";
  readonly queueId: string;
  readonly commandId: string;
  readonly commandIndex: number;
  readonly status: "completed" | "failed";
}

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
 * All session group events.
 */
export type GroupEvent =
  | GroupCreatedEvent
  | GroupStartedEvent
  | GroupCompletedEvent
  | GroupPausedEvent
  | GroupResumedEvent
  | GroupSessionStartedEvent
  | GroupSessionCompletedEvent
  | BudgetWarningEvent
  | BudgetExceededEvent;

/**
 * All command queue events.
 */
export type QueueEvent =
  | QueueCreatedEvent
  | QueueStartedEvent
  | QueueCompletedEvent
  | QueuePausedEvent
  | CommandStartedEvent
  | CommandCompletedEvent;

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
  group_session_started: GroupSessionStartedEvent;
  group_session_completed: GroupSessionCompletedEvent;
  budget_warning: BudgetWarningEvent;
  budget_exceeded: BudgetExceededEvent;
  queue_created: QueueCreatedEvent;
  queue_started: QueueStartedEvent;
  queue_completed: QueueCompletedEvent;
  queue_paused: QueuePausedEvent;
  command_started: CommandStartedEvent;
  command_completed: CommandCompletedEvent;
}

/**
 * All event type strings.
 */
export type EventType = keyof EventMap;
