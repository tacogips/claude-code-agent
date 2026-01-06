/**
 * Command Queue module for sequential prompt execution.
 *
 * Provides types, events, manager, and runner for managing command queues
 * with flexible session modes (continue or new session per command).
 *
 * @module sdk/queue
 */

// Core types
export type {
  QueueStatus,
  CommandStatus,
  SessionMode,
  QueueConfig,
  QueueStats,
  QueueCommand,
  CommandQueue,
} from "./types";

// Event types
export type {
  BaseQueueEvent,
  QueueCreatedEvent,
  QueueStartedEvent,
  QueuePausedEvent,
  QueueResumedEvent,
  QueueStoppedEvent,
  QueueCompletedEvent,
  QueueFailedEvent,
  CommandStartedEvent,
  CommandCompletedEvent,
  CommandFailedEvent,
  CommandAddedEvent,
  CommandUpdatedEvent,
  CommandRemovedEvent,
  CommandReorderedEvent,
  CommandModeChangedEvent,
  QueueEvent,
} from "./events";

// Manager types and class
export type {
  CreateQueueOptions,
  AddCommandOptions,
  ListQueuesOptions,
} from "./manager";

export { QueueManager } from "./manager";

// Runner types and class
export type { RunOptions, QueueResult } from "./runner";

export { QueueRunner } from "./runner";

// Recovery types and class
export type { RecoveryResult } from "./recovery";

export { QueueRecovery } from "./recovery";
