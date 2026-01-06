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
 */
export interface GroupStartedEvent extends BaseEvent {
  readonly type: "group_started";
  readonly groupId: string;
  readonly totalSessions: number;
  readonly maxConcurrent: number;
}

/**
 * Emitted when a session group completes successfully.
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
 */
export interface GroupPausedEvent extends BaseEvent {
  readonly type: "group_paused";
  readonly groupId: string;
  readonly runningSessions: number;
  readonly reason: "manual" | "budget_exceeded" | "error_threshold";
}

/**
 * Emitted when a session group is resumed.
 */
export interface GroupResumedEvent extends BaseEvent {
  readonly type: "group_resumed";
  readonly groupId: string;
  readonly pendingSessions: number;
}

/**
 * Emitted when a session group fails.
 */
export interface GroupFailedEvent extends BaseEvent {
  readonly type: "group_failed";
  readonly groupId: string;
  readonly failedSessions: number;
  readonly reason: string;
}

/**
 * Emitted when a session within a group is started.
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
  readonly action: "stop" | "warn" | "pause";
}

/**
 * Emitted when a session is waiting for dependencies to complete.
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
 */
export interface DependencyResolvedEvent extends BaseEvent {
  readonly type: "dependency_resolved";
  readonly groupId: string;
  readonly sessionId: string;
  readonly resolvedDependencies: readonly string[];
}

/**
 * Emitted when progress is updated for a session.
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
