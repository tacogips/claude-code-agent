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
 *
 * @example Example data
 * ```json
 * {
 *   "type": "queue_created",
 *   "timestamp": "2026-01-10T10:00:00.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "name": "Authentication Bug Fixes",
 *   "projectPath": "/home/user/projects/my-app"
 * }
 * ```
 */
export interface QueueCreatedEvent extends BaseQueueEvent {
  readonly type: "queue_created";
  readonly queueId: string;
  readonly name: string;
  readonly projectPath: string;
}

/**
 * Emitted when a command queue starts execution.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "queue_started",
 *   "timestamp": "2026-01-10T10:00:30.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "totalCommands": 3
 * }
 * ```
 */
export interface QueueStartedEvent extends BaseQueueEvent {
  readonly type: "queue_started";
  readonly queueId: string;
  readonly totalCommands: number;
}

/**
 * Emitted when a command queue is paused by user.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "queue_paused",
 *   "timestamp": "2026-01-10T10:15:00.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "currentCommandIndex": 1
 * }
 * ```
 */
export interface QueuePausedEvent extends BaseQueueEvent {
  readonly type: "queue_paused";
  readonly queueId: string;
  readonly currentCommandIndex: number;
}

/**
 * Emitted when a paused queue is resumed.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "queue_resumed",
 *   "timestamp": "2026-01-10T10:20:00.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "fromCommandIndex": 1
 * }
 * ```
 */
export interface QueueResumedEvent extends BaseQueueEvent {
  readonly type: "queue_resumed";
  readonly queueId: string;
  readonly fromCommandIndex: number;
}

/**
 * Emitted when a queue is stopped before completion.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "queue_stopped",
 *   "timestamp": "2026-01-10T10:30:00.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "completedCommands": 2,
 *   "totalCommands": 5
 * }
 * ```
 */
export interface QueueStoppedEvent extends BaseQueueEvent {
  readonly type: "queue_stopped";
  readonly queueId: string;
  readonly completedCommands: number;
  readonly totalCommands: number;
}

/**
 * Emitted when all commands in a queue complete successfully.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "queue_completed",
 *   "timestamp": "2026-01-10T11:00:00.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "completedCommands": 3,
 *   "failedCommands": 0,
 *   "totalCostUsd": 0.1234,
 *   "totalDurationMs": 3570000
 * }
 * ```
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
 *
 * @example Example data
 * ```json
 * {
 *   "type": "queue_failed",
 *   "timestamp": "2026-01-10T10:25:00.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "failedCommandIndex": 1,
 *   "error": "Command failed: Process exited with code 1"
 * }
 * ```
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
 *
 * @example Continue session
 * ```json
 * {
 *   "type": "command_started",
 *   "timestamp": "2026-01-10T10:00:30.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "commandId": "cmd-001",
 *   "commandIndex": 0,
 *   "prompt": "Fix the authentication bug in src/auth.ts",
 *   "sessionMode": "continue",
 *   "isNewSession": true
 * }
 * ```
 *
 * @example New session
 * ```json
 * {
 *   "type": "command_started",
 *   "timestamp": "2026-01-10T10:30:00.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "commandId": "cmd-003",
 *   "commandIndex": 2,
 *   "prompt": "Deploy to production",
 *   "sessionMode": "new",
 *   "isNewSession": true
 * }
 * ```
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
 *
 * @example Example data
 * ```json
 * {
 *   "type": "command_completed",
 *   "timestamp": "2026-01-10T10:05:15.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "commandId": "cmd-001",
 *   "commandIndex": 0,
 *   "costUsd": 0.0456,
 *   "claudeSessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "durationMs": 285000
 * }
 * ```
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
 *
 * @example Example data
 * ```json
 * {
 *   "type": "command_failed",
 *   "timestamp": "2026-01-10T10:15:45.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "commandId": "cmd-003",
 *   "commandIndex": 2,
 *   "error": "Permission denied: cannot access production environment",
 *   "durationMs": 45000
 * }
 * ```
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
 *
 * @example Example data
 * ```json
 * {
 *   "type": "command_added",
 *   "timestamp": "2026-01-10T10:00:00.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "commandId": "cmd-004",
 *   "commandIndex": 3,
 *   "sessionMode": "continue"
 * }
 * ```
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
 *
 * @example Example data
 * ```json
 * {
 *   "type": "command_updated",
 *   "timestamp": "2026-01-10T10:02:00.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "commandId": "cmd-002",
 *   "commandIndex": 1
 * }
 * ```
 */
export interface CommandUpdatedEvent extends BaseQueueEvent {
  readonly type: "command_updated";
  readonly queueId: string;
  readonly commandId: string;
  readonly commandIndex: number;
}

/**
 * Emitted when a command is removed from a queue.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "command_removed",
 *   "timestamp": "2026-01-10T10:01:30.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "commandId": "cmd-003",
 *   "commandIndex": 2
 * }
 * ```
 */
export interface CommandRemovedEvent extends BaseQueueEvent {
  readonly type: "command_removed";
  readonly queueId: string;
  readonly commandId: string;
  readonly commandIndex: number;
}

/**
 * Emitted when commands are reordered within a queue.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "command_reordered",
 *   "timestamp": "2026-01-10T10:01:45.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "commandId": "cmd-002",
 *   "fromIndex": 1,
 *   "toIndex": 0
 * }
 * ```
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
 *
 * @example Example data
 * ```json
 * {
 *   "type": "command_mode_changed",
 *   "timestamp": "2026-01-10T10:02:30.000Z",
 *   "queueId": "20260110-100000-auth-fixes",
 *   "commandId": "cmd-003",
 *   "commandIndex": 2,
 *   "sessionMode": "new"
 * }
 * ```
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
