/**
 * Session Group module.
 *
 * Provides types, events, and utilities for managing session groups -
 * collections of related Claude Code sessions that can span multiple projects,
 * execute concurrently, and share configuration.
 *
 * @module sdk/group
 */

// Re-export types
export type {
  GroupStatus,
  BudgetConfig,
  ConcurrencyConfig,
  SessionConfig,
  GroupConfig,
  GroupSession,
  SessionGroup,
} from "./types";

export {
  isTerminalGroupStatus,
  canResumeGroup,
  isActiveGroup,
  DEFAULT_BUDGET_CONFIG,
  DEFAULT_CONCURRENCY_CONFIG,
  DEFAULT_SESSION_CONFIG,
  DEFAULT_GROUP_CONFIG,
} from "./types";

// Re-export events
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
  GroupEventMap,
  GroupEventType,
} from "./events";

// Re-export progress
export type { SessionProgress, GroupProgress } from "./progress";

export {
  ProgressAggregator,
  createSessionProgress,
  calculateBudgetUsage,
  isBudgetWarning,
  isBudgetExceeded,
} from "./progress";
