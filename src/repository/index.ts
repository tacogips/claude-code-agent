/**
 * Repository interfaces for data access.
 *
 * This module exports all repository interfaces that define
 * the data access contracts for the application.
 *
 * @module repository
 */

export type {
  SessionRepository,
  SessionFilter,
  SessionSort,
} from "./session-repository";

export type {
  BookmarkRepository,
  Bookmark,
  BookmarkType,
  BookmarkFilter,
  BookmarkSort,
  BookmarkSearchOptions,
} from "./bookmark-repository";

export type {
  GroupRepository,
  SessionGroup,
  GroupSession,
  GroupStatus,
  GroupFilter,
  GroupSort,
} from "./group-repository";

export type {
  QueueRepository,
  CommandQueue,
  QueueCommand,
  QueueStatus,
  SessionMode,
  CommandStatus,
  QueueFilter,
  QueueSort,
  UpdateCommandOptions,
} from "./queue-repository";

// In-memory implementations
export {
  InMemorySessionRepository,
  InMemoryBookmarkRepository,
  InMemoryGroupRepository,
  InMemoryQueueRepository,
} from "./in-memory";

// File-based implementations
export { FileGroupRepository } from "./file/group-repository";
export { FileQueueRepository } from "./file/queue-repository";
