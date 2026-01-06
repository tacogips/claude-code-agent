/**
 * SDK event system.
 *
 * Provides typed events for session execution, group operations,
 * queue processing, and other SDK activities.
 *
 * @module sdk/events
 */

// Event types
export type {
  BaseEvent,
  SessionStartedEvent,
  SessionEndedEvent,
  MessageReceivedEvent,
  ToolStartedEvent,
  ToolCompletedEvent,
  TasksUpdatedEvent,
  GroupCreatedEvent,
  GroupStartedEvent,
  GroupCompletedEvent,
  GroupPausedEvent,
  GroupResumedEvent,
  GroupSessionStartedEvent,
  GroupSessionCompletedEvent,
  BudgetWarningEvent,
  BudgetExceededEvent,
  SessionEvent,
  GroupEvent,
  QueueEvent,
  SdkEvent,
  EventMap,
  EventType,
} from "./types";

// Queue events (re-exported for convenience)
export type {
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
} from "../queue/events";

// Event emitter
export type { EventHandler, Subscription } from "./emitter";
export { EventEmitter, createEventEmitter } from "./emitter";
