/**
 * Event types for Command Queue operations.
 *
 * These events are emitted during queue lifecycle (create, start, pause, etc.)
 * and command execution (start, complete, fail, etc.).
 *
 * @module sdk/queue/events
 */

import type { SessionMode } from "./types";

/**
 * Base event interface with common properties for all queue events.
 */
export interface BaseQueueEvent {
  /** ISO timestamp when the event occurred */
  readonly timestamp: string;
}

// ============================================================================
// Queue Lifecycle Events
// ============================================================================

/**
 * Emitted when a command queue is created.
 */
export interface QueueCreatedEvent extends BaseQueueEvent {
  readonly type: "queue_created";
  readonly queueId: string;
  readonly name: string;
  readonly projectPath: string;
}

/**
 * Emitted when a command queue starts execution.
 */
export interface QueueStartedEvent extends BaseQueueEvent {
  readonly type: "queue_started";
  readonly queueId: string;
  readonly totalCommands: number;
}

/**
 * Emitted when a command queue is paused by user.
 */
export interface QueuePausedEvent extends BaseQueueEvent {
  readonly type: "queue_paused";
  readonly queueId: string;
  readonly currentCommandIndex: number;
}

/**
 * Emitted when a paused queue is resumed.
 */
export interface QueueResumedEvent extends BaseQueueEvent {
  readonly type: "queue_resumed";
  readonly queueId: string;
  readonly fromCommandIndex: number;
}

/**
 * Emitted when a queue is stopped before completion.
 */
export interface QueueStoppedEvent extends BaseQueueEvent {
  readonly type: "queue_stopped";
  readonly queueId: string;
  readonly completedCommands: number;
  readonly totalCommands: number;
}

/**
 * Emitted when all commands in a queue complete successfully.
 */
export interface QueueCompletedEvent extends BaseQueueEvent {
  readonly type: "queue_completed";
  readonly queueId: string;
  readonly completedCommands: number;
  readonly failedCommands: number;
  readonly totalCostUsd: number;
  readonly totalDurationMs: number;
}

/**
 * Emitted when a queue fails due to command error (stopOnError=true).
 */
export interface QueueFailedEvent extends BaseQueueEvent {
  readonly type: "queue_failed";
  readonly queueId: string;
  readonly failedCommandIndex: number;
  readonly error: string;
}

// ============================================================================
// Command Lifecycle Events
// ============================================================================

/**
 * Emitted when a command within a queue starts execution.
 */
export interface CommandStartedEvent extends BaseQueueEvent {
  readonly type: "command_started";
  readonly queueId: string;
  readonly commandId: string;
  readonly commandIndex: number;
  readonly prompt: string;
  readonly sessionMode: SessionMode;
  readonly isNewSession: boolean;
}

/**
 * Emitted when a command completes successfully.
 */
export interface CommandCompletedEvent extends BaseQueueEvent {
  readonly type: "command_completed";
  readonly queueId: string;
  readonly commandId: string;
  readonly commandIndex: number;
  readonly costUsd: number;
  readonly claudeSessionId: string;
  readonly durationMs: number;
}

/**
 * Emitted when a command fails.
 */
export interface CommandFailedEvent extends BaseQueueEvent {
  readonly type: "command_failed";
  readonly queueId: string;
  readonly commandId: string;
  readonly commandIndex: number;
  readonly error: string;
  readonly durationMs: number;
}

// ============================================================================
// Command Management Events
// ============================================================================

/**
 * Emitted when a new command is added to a queue.
 */
export interface CommandAddedEvent extends BaseQueueEvent {
  readonly type: "command_added";
  readonly queueId: string;
  readonly commandId: string;
  readonly commandIndex: number;
  readonly sessionMode: SessionMode;
}

/**
 * Emitted when a command's properties are updated.
 */
export interface CommandUpdatedEvent extends BaseQueueEvent {
  readonly type: "command_updated";
  readonly queueId: string;
  readonly commandId: string;
  readonly commandIndex: number;
}

/**
 * Emitted when a command is removed from a queue.
 */
export interface CommandRemovedEvent extends BaseQueueEvent {
  readonly type: "command_removed";
  readonly queueId: string;
  readonly commandId: string;
  readonly commandIndex: number;
}

/**
 * Emitted when commands are reordered within a queue.
 */
export interface CommandReorderedEvent extends BaseQueueEvent {
  readonly type: "command_reordered";
  readonly queueId: string;
  readonly commandId: string;
  readonly fromIndex: number;
  readonly toIndex: number;
}

/**
 * Emitted when a command's session mode is changed.
 */
export interface CommandModeChangedEvent extends BaseQueueEvent {
  readonly type: "command_mode_changed";
  readonly queueId: string;
  readonly commandId: string;
  readonly commandIndex: number;
  readonly sessionMode: SessionMode;
}

// ============================================================================
// Union Types
// ============================================================================

/**
 * Union of all queue-related events.
 */
export type QueueEvent =
  | QueueCreatedEvent
  | QueueStartedEvent
  | QueuePausedEvent
  | QueueResumedEvent
  | QueueStoppedEvent
  | QueueCompletedEvent
  | QueueFailedEvent
  | CommandStartedEvent
  | CommandCompletedEvent
  | CommandFailedEvent
  | CommandAddedEvent
  | CommandUpdatedEvent
  | CommandRemovedEvent
  | CommandReorderedEvent
  | CommandModeChangedEvent;
