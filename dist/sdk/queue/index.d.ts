/**
 * Command Queue module for sequential prompt execution.
 *
 * Provides types, events, manager, and runner for managing command queues
 * with flexible session modes (continue or new session per command).
 *
 * @module sdk/queue
 */
export type { QueueStatus, CommandStatus, SessionMode, QueueConfig, QueueStats, QueueCommand, CommandQueue, } from "./types";
export type { BaseQueueEvent, QueueCreatedEvent, QueueStartedEvent, QueuePausedEvent, QueueResumedEvent, QueueStoppedEvent, QueueCompletedEvent, QueueFailedEvent, CommandStartedEvent, CommandCompletedEvent, CommandFailedEvent, CommandAddedEvent, CommandUpdatedEvent, CommandRemovedEvent, CommandReorderedEvent, CommandModeChangedEvent, QueueEvent, } from "./events";
export type { CreateQueueOptions, AddCommandOptions, ListQueuesOptions, } from "./manager";
export { QueueManager } from "./manager";
export type { RunOptions, QueueResult } from "./runner-types";
export { QueueRunner } from "./runner";
export { QueueUpdater } from "./runner-updaters";
export { captureClaudeSessionId } from "./session-capture";
export type { RecoveryResult } from "./recovery";
export { QueueRecovery } from "./recovery";
//# sourceMappingURL=index.d.ts.map