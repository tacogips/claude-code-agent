/**
 * Session Group event types.
 *
 * These events are emitted during session group lifecycle operations,
 * including group creation, execution, session progress, and budget tracking.
 *
 * @module sdk/group/events
 */

import type { BaseEvent } from "../events/types";

/**
 * Emitted when a session group is created.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "group_created",
 *   "timestamp": "2026-01-10T10:00:00.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "name": "Authentication System Refactor",
 *   "slug": "auth-refactor",
 *   "totalSessions": 3
 * }
 * ```
 */
export interface GroupCreatedEvent extends BaseEvent {
  readonly type: "group_created";
  readonly groupId: string;
  readonly name: string;
  readonly slug: string;
  readonly totalSessions: number;
}

/**
 * Emitted when a session group starts execution.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "group_started",
 *   "timestamp": "2026-01-10T10:00:30.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "totalSessions": 3,
 *   "maxConcurrent": 2
 * }
 * ```
 */
export interface GroupStartedEvent extends BaseEvent {
  readonly type: "group_started";
  readonly groupId: string;
  readonly totalSessions: number;
  readonly maxConcurrent: number;
}

/**
 * Emitted when a session group completes successfully.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "group_completed",
 *   "timestamp": "2026-01-10T11:30:00.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "completedSessions": 3,
 *   "failedSessions": 0,
 *   "totalCostUsd": 0.2456,
 *   "elapsedMs": 5400000
 * }
 * ```
 */
export interface GroupCompletedEvent extends BaseEvent {
  readonly type: "group_completed";
  readonly groupId: string;
  readonly completedSessions: number;
  readonly failedSessions: number;
  readonly totalCostUsd: number;
  readonly elapsedMs: number;
}

/**
 * Emitted when a session group is paused.
 *
 * @example Manual pause
 * ```json
 * {
 *   "type": "group_paused",
 *   "timestamp": "2026-01-10T10:45:00.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "runningSessions": 2,
 *   "reason": "manual"
 * }
 * ```
 *
 * @example Budget exceeded pause
 * ```json
 * {
 *   "type": "group_paused",
 *   "timestamp": "2026-01-10T10:50:00.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "runningSessions": 1,
 *   "reason": "budget_exceeded"
 * }
 * ```
 */
export interface GroupPausedEvent extends BaseEvent {
  readonly type: "group_paused";
  readonly groupId: string;
  readonly runningSessions: number;
  readonly reason: "manual" | "budget_exceeded" | "error_threshold";
}

/**
 * Emitted when a session group is resumed.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "group_resumed",
 *   "timestamp": "2026-01-10T11:00:00.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "pendingSessions": 1
 * }
 * ```
 */
export interface GroupResumedEvent extends BaseEvent {
  readonly type: "group_resumed";
  readonly groupId: string;
  readonly pendingSessions: number;
}

/**
 * Emitted when a session group fails.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "group_failed",
 *   "timestamp": "2026-01-10T10:30:00.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "failedSessions": 2,
 *   "reason": "Error threshold exceeded (2 failures)"
 * }
 * ```
 */
export interface GroupFailedEvent extends BaseEvent {
  readonly type: "group_failed";
  readonly groupId: string;
  readonly failedSessions: number;
  readonly reason: string;
}

/**
 * Emitted when a session within a group is started.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "group_session_started",
 *   "timestamp": "2026-01-10T10:00:30.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "sessionId": "001-auth-service",
 *   "projectPath": "/home/user/projects/auth-service",
 *   "prompt": "Implement JWT token validation"
 * }
 * ```
 */
export interface GroupSessionStartedEvent extends BaseEvent {
  readonly type: "group_session_started";
  readonly groupId: string;
  readonly sessionId: string;
  readonly projectPath: string;
  readonly prompt: string;
}

/**
 * Emitted when a session within a group completes.
 *
 * @example Successful completion
 * ```json
 * {
 *   "type": "group_session_completed",
 *   "timestamp": "2026-01-10T10:12:45.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "sessionId": "001-auth-service",
 *   "status": "completed",
 *   "costUsd": 0.0892,
 *   "durationMs": 735000
 * }
 * ```
 */
export interface GroupSessionCompletedEvent extends BaseEvent {
  readonly type: "group_session_completed";
  readonly groupId: string;
  readonly sessionId: string;
  readonly status: "completed" | "failed";
  readonly costUsd?: number | undefined;
  readonly durationMs: number;
}

/**
 * Emitted when a session within a group fails.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "group_session_failed",
 *   "timestamp": "2026-01-10T10:15:00.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "sessionId": "002-api-gateway",
 *   "error": "Process exited with code 1",
 *   "costUsd": 0.0156
 * }
 * ```
 */
export interface GroupSessionFailedEvent extends BaseEvent {
  readonly type: "group_session_failed";
  readonly groupId: string;
  readonly sessionId: string;
  readonly error: string;
  readonly costUsd?: number | undefined;
}

/**
 * Emitted when budget warning threshold is reached.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "budget_warning",
 *   "timestamp": "2026-01-10T10:30:00.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "currentUsage": 20.0,
 *   "limit": 25.0,
 *   "percentUsed": 0.8
 * }
 * ```
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
 *
 * @example Example data
 * ```json
 * {
 *   "type": "budget_exceeded",
 *   "timestamp": "2026-01-10T10:45:00.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "usage": 25.50,
 *   "limit": 25.0,
 *   "action": "pause"
 * }
 * ```
 */
export interface BudgetExceededEvent extends BaseEvent {
  readonly type: "budget_exceeded";
  readonly groupId: string;
  readonly usage: number;
  readonly limit: number;
  readonly action: "stop" | "warn" | "pause";
}

/**
 * Emitted when a session is waiting for dependencies to complete.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "dependency_waiting",
 *   "timestamp": "2026-01-10T10:00:30.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "sessionId": "002-api-gateway",
 *   "dependsOn": ["001-auth-service"],
 *   "pendingDependencies": ["001-auth-service"]
 * }
 * ```
 */
export interface DependencyWaitingEvent extends BaseEvent {
  readonly type: "dependency_waiting";
  readonly groupId: string;
  readonly sessionId: string;
  readonly dependsOn: readonly string[];
  readonly pendingDependencies: readonly string[];
}

/**
 * Emitted when all dependencies for a session are resolved.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "dependency_resolved",
 *   "timestamp": "2026-01-10T10:12:45.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "sessionId": "002-api-gateway",
 *   "resolvedDependencies": ["001-auth-service"]
 * }
 * ```
 */
export interface DependencyResolvedEvent extends BaseEvent {
  readonly type: "dependency_resolved";
  readonly groupId: string;
  readonly sessionId: string;
  readonly resolvedDependencies: readonly string[];
}

/**
 * Emitted when progress is updated for a session.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "session_progress",
 *   "timestamp": "2026-01-10T10:05:00.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "sessionId": "001-auth-service",
 *   "currentTool": "Edit",
 *   "costUsd": 0.0234,
 *   "messageCount": 15
 * }
 * ```
 */
export interface SessionProgressEvent extends BaseEvent {
  readonly type: "session_progress";
  readonly groupId: string;
  readonly sessionId: string;
  readonly currentTool?: string | undefined;
  readonly costUsd?: number | undefined;
  readonly messageCount: number;
}

/**
 * Emitted when overall group progress is updated.
 *
 * @example Example data
 * ```json
 * {
 *   "type": "group_progress",
 *   "timestamp": "2026-01-10T10:15:00.000Z",
 *   "groupId": "20260110-100000-auth-refactor",
 *   "completed": 1,
 *   "running": 2,
 *   "pending": 0,
 *   "failed": 0,
 *   "totalCostUsd": 0.0892
 * }
 * ```
 */
export interface GroupProgressEvent extends BaseEvent {
  readonly type: "group_progress";
  readonly groupId: string;
  readonly completed: number;
  readonly running: number;
  readonly pending: number;
  readonly failed: number;
  readonly totalCostUsd: number;
}

/**
 * Union of all session group events.
 */
export type GroupEvent =
  | GroupCreatedEvent
  | GroupStartedEvent
  | GroupCompletedEvent
  | GroupPausedEvent
  | GroupResumedEvent
  | GroupFailedEvent
  | GroupSessionStartedEvent
  | GroupSessionCompletedEvent
  | GroupSessionFailedEvent
  | BudgetWarningEvent
  | BudgetExceededEvent
  | DependencyWaitingEvent
  | DependencyResolvedEvent
  | SessionProgressEvent
  | GroupProgressEvent;

/**
 * Map of group event types to their payloads.
 */
export interface GroupEventMap {
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
}

/**
 * All group event type strings.
 */
export type GroupEventType = keyof GroupEventMap;
