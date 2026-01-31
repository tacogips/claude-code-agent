/**
 * Bookmarks SDK module for saving and retrieving session references.
 *
 * This module provides bookmark management capabilities including:
 * - Type definitions for bookmarks (session, message, range)
 * - BookmarkManager for CRUD and search operations
 * - Search functionality for metadata and content
 *
 * @example Basic Usage
 * ```typescript
 * import { BookmarkManager, type CreateBookmarkOptions } from "claude-code-agent/sdk";
 *
 * const manager = new BookmarkManager(container, repository);
 *
 * // Create a session bookmark
 * const bookmark = await manager.add({
 *   type: "session",
 *   sessionId: "session-123",
 *   name: "Important Discussion",
 *   description: "Key decisions about architecture",
 *   tags: ["architecture", "decisions"],
 * });
 *
 * // Search bookmarks
 * const results = await manager.search("architecture", {
 *   metadataOnly: false,
 *   limit: 10,
 * });
 * ```
 *
 * @module sdk/bookmarks
 */

// Re-export all public types from types module
export type {
  Bookmark,
  BookmarkType,
  MessageRange,
  CreateBookmarkOptions,
  BookmarkFilter,
  MatchType,
  BookmarkSearchResult,
} from "./types";

// Re-export manager and its types
export {
  BookmarkManager,
  type SearchOptions,
  type BookmarkWithContent,
} from "./manager";
