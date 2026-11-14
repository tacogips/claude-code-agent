/**
 * Session Group module.
 *
 * Provides types, events, and utilities for managing session groups -
 * collections of related Claude Code sessions that can span multiple projects,
 * execute concurrently, and share configuration.
 *
 * @module sdk/group
 */
export type { GroupStatus, BudgetConfig, ConcurrencyConfig, SessionConfig, GroupConfig, GroupSession, SessionGroup, } from "./types";
export { isTerminalGroupStatus, canResumeGroup, isActiveGroup, DEFAULT_BUDGET_CONFIG, DEFAULT_CONCURRENCY_CONFIG, DEFAULT_SESSION_CONFIG, DEFAULT_GROUP_CONFIG, } from "./types";
export type { GroupCreatedEvent, GroupStartedEvent, GroupCompletedEvent, GroupPausedEvent, GroupResumedEvent, GroupFailedEvent, GroupSessionStartedEvent, GroupSessionCompletedEvent, GroupSessionFailedEvent, BudgetWarningEvent, BudgetExceededEvent, DependencyWaitingEvent, DependencyResolvedEvent, SessionProgressEvent, GroupProgressEvent, GroupEvent, GroupEventMap, GroupEventType, } from "./events";
export type { SessionProgress, GroupProgress } from "./progress";
export { ProgressAggregator, createSessionProgress, calculateBudgetUsage, isBudgetWarning, isBudgetExceeded, } from "./progress";
export type { CreateGroupOptions } from "./manager";
export { GroupManager } from "./manager";
export type { SessionConfigResult, ConfigGeneratorError, } from "./config-generator";
export { ConfigGenerator } from "./config-generator";
export type { BlockedSession } from "./dependency-graph";
export { DependencyGraph } from "./dependency-graph";
export type { RunOptions, PauseReason, RunnerState, WorkerState, } from "./runner-types";
export { GroupRunner } from "./runner";
export { GroupUpdater } from "./runner-updaters";
export { startGroupSession, processGroupSessionOutput, } from "./session-processor";
//# sourceMappingURL=index.d.ts.map