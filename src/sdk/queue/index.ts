/**
 * Command Queue module for sequential prompt execution.
 *
 * Provides types and events for managing command queues with flexible
 * session modes (continue or new session per command).
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
