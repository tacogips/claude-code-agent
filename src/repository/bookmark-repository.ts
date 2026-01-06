/**
 * Bookmark Repository interface.
 *
 * Defines the data access contract for bookmark storage and retrieval.
 *
 * @module repository/bookmark-repository
 */

/**
 * Bookmark type indicating what is being bookmarked.
 */
export type BookmarkType = "session" | "message" | "range";

/**
 * Represents a bookmark to session content.
 *
 * Bookmarks can reference:
 * - An entire session
 * - A specific message within a session
 * - A range of messages within a session
 */
export interface Bookmark {
  /** Unique bookmark identifier */
  readonly id: string;
  /** User-defined name for the bookmark */
  readonly name: string;
  /** Type of bookmark */
  readonly type: BookmarkType;
  /** Session ID being bookmarked */
  readonly sessionId: string;
  /** Message ID (for single message bookmarks) */
  readonly messageId?: string | undefined;
  /** Start message ID (for range bookmarks) */
  readonly rangeStart?: string | undefined;
  /** End message ID (for range bookmarks) */
  readonly rangeEnd?: string | undefined;
  /** User-defined tags for categorization */
  readonly tags: readonly string[];
  /** Optional notes about the bookmark */
  readonly notes?: string | undefined;
  /** ISO timestamp when bookmark was created */
  readonly createdAt: string;
  /** ISO timestamp when bookmark was last updated */
  readonly updatedAt: string;
}

/**
 * Filter criteria for listing bookmarks.
 */
export interface BookmarkFilter {
  /** Filter by session ID */
  readonly sessionId?: string | undefined;
  /** Filter by bookmark type */
  readonly type?: BookmarkType | undefined;
  /** Filter by tags (any match) */
  readonly tags?: readonly string[] | undefined;
  /** Filter by name (partial match) */
  readonly nameContains?: string | undefined;
  /** Maximum number of results to return */
  readonly limit?: number | undefined;
  /** Number of results to skip (for pagination) */
  readonly offset?: number | undefined;
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
  /** Search in metadata only (name, tags, notes) */
  readonly metadataOnly?: boolean | undefined;
  /** Maximum results */
  readonly limit?: number | undefined;
}

/**
 * Repository interface for bookmark data access.
 *
 * Provides CRUD operations for bookmark storage with
 * filtering and search capabilities.
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
   * Find all bookmarks for a session.
   *
   * @param sessionId - Session ID
   * @returns Array of bookmarks for the session
   */
  findBySession(sessionId: string): Promise<readonly Bookmark[]>;

  /**
   * Find bookmarks by tag.
   *
   * @param tag - Tag to search for
   * @returns Array of bookmarks with the tag
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
