/**
 * Bookmark Repository interface.
 *
 * Defines the data access contract for bookmark storage and retrieval.
 *
 * @module repository/bookmark-repository
 */

import type {
  Bookmark,
  BookmarkFilter as SdkBookmarkFilter,
  BookmarkType,
} from "../sdk/bookmarks/types";

// Re-export types for convenience
export type { Bookmark, BookmarkType };

/**
 * Extended filter criteria for repository-level operations.
 *
 * Extends the SDK BookmarkFilter with repository-specific options
 * like name search.
 */
export interface BookmarkFilter extends Omit<SdkBookmarkFilter, "since"> {
  /** Filter by name (partial match) */
  readonly nameContains?: string | undefined;
  /** Filter bookmarks created after this date (ISO string or Date) */
  readonly since?: Date | string | undefined;
}

/**
 * Sort options for bookmark listing.
 */
export interface BookmarkSort {
  /** Field to sort by */
  readonly field: "name" | "createdAt" | "updatedAt";
  /** Sort direction */
  readonly direction: "asc" | "desc";
}

/**
 * Search options for bookmark full-text search.
 */
export interface BookmarkSearchOptions {
  /** Search query string */
  readonly query: string;
  /** Search in metadata only (name, description, tags) */
  readonly metadataOnly?: boolean | undefined;
  /** Maximum results */
  readonly limit?: number | undefined;
}

/**
 * Repository interface for bookmark data access.
 *
 * Provides CRUD operations for bookmark storage with
 * filtering, search, and tag management capabilities.
 */
export interface BookmarkRepository {
  /**
   * Find a bookmark by its ID.
   *
   * @param id - Bookmark ID
   * @returns Bookmark if found, null otherwise
   */
  findById(id: string): Promise<Bookmark | null>;

  /**
   * Find bookmarks by session ID.
   *
   * @param sessionId - Session ID to filter by
   * @returns Array of bookmarks for the session
   */
  findBySession(sessionId: string): Promise<readonly Bookmark[]>;

  /**
   * Find bookmarks by tag.
   *
   * @param tag - Tag to filter by
   * @returns Array of bookmarks containing the tag
   */
  findByTag(tag: string): Promise<readonly Bookmark[]>;

  /**
   * List bookmarks with optional filtering and sorting.
   *
   * @param filter - Filter criteria
   * @param sort - Sort options
   * @returns Array of bookmarks matching the filter
   */
  list(
    filter?: BookmarkFilter,
    sort?: BookmarkSort,
  ): Promise<readonly Bookmark[]>;

  /**
   * Search bookmarks by query string.
   *
   * @param options - Search options
   * @returns Array of matching bookmarks
   */
  search(options: BookmarkSearchOptions): Promise<readonly Bookmark[]>;

  /**
   * Save a bookmark.
   *
   * Creates a new bookmark or updates an existing one.
   *
   * @param bookmark - Bookmark to save
   */
  save(bookmark: Bookmark): Promise<void>;

  /**
   * Update a bookmark by ID.
   *
   * @param id - Bookmark ID to update
   * @param updates - Partial bookmark updates (id cannot be changed)
   */
  update(id: string, updates: Partial<Omit<Bookmark, "id">>): Promise<void>;

  /**
   * Delete a bookmark by ID.
   *
   * @param id - Bookmark ID to delete
   * @returns True if bookmark was deleted, false if not found
   */
  delete(id: string): Promise<boolean>;

  /**
   * Get all unique tags across all bookmarks.
   *
   * @returns Array of unique tag strings
   */
  getAllTags(): Promise<readonly string[]>;

  /**
   * Count bookmarks matching the filter.
   *
   * @param filter - Filter criteria
   * @returns Number of matching bookmarks
   */
  count(filter?: BookmarkFilter): Promise<number>;
}
