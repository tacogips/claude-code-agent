/**
 * Bookmark types for saving and retrieving session and message references.
 *
 * Bookmarks enable users to mark important sessions, messages, or ranges
 * for later retrieval, search, and knowledge management.
 *
 * @module sdk/bookmarks/types
 */

/**
 * Type of bookmark.
 *
 * - `session`: Bookmarks an entire session
 * - `message`: Bookmarks a specific message within a session
 * - `range`: Bookmarks a range of messages within a session
 */
export type BookmarkType = "session" | "message" | "range";

/**
 * Message range for range-type bookmarks.
 *
 * @example Example data
 * ```json
 * {
 *   "fromMessageId": "msg-001-start",
 *   "toMessageId": "msg-015-end"
 * }
 * ```
 */
export interface MessageRange {
  /** ID of the first message in the range */
  readonly fromMessageId: string;
  /** ID of the last message in the range */
  readonly toMessageId: string;
}

/**
 * Bookmark represents a saved reference to a session, message, or message range.
 *
 * Bookmarks are immutable after creation except for name, description, and tags
 * which can be updated via the BookmarkManager.
 *
 * @example Session bookmark
 * ```json
 * {
 *   "id": "bm-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 *   "type": "session",
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "name": "Authentication Refactor Discussion",
 *   "description": "Important decisions about the new auth architecture",
 *   "tags": ["architecture", "auth", "important"],
 *   "createdAt": "2026-01-10T10:30:00.000Z",
 *   "updatedAt": "2026-01-10T10:30:00.000Z"
 * }
 * ```
 *
 * @example Message bookmark
 * ```json
 * {
 *   "id": "bm-b2c3d4e5-f6a7-8901-bcde-f23456789012",
 *   "type": "message",
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "messageId": "msg-specific-insight",
 *   "name": "Key Insight on Token Validation",
 *   "tags": ["security", "tokens"],
 *   "createdAt": "2026-01-10T11:00:00.000Z",
 *   "updatedAt": "2026-01-10T11:00:00.000Z"
 * }
 * ```
 *
 * @example Range bookmark
 * ```json
 * {
 *   "id": "bm-c3d4e5f6-a7b8-9012-cdef-345678901234",
 *   "type": "range",
 *   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *   "messageRange": {
 *     "fromMessageId": "msg-debug-start",
 *     "toMessageId": "msg-debug-end"
 *   },
 *   "name": "Debugging Session for Memory Leak",
 *   "description": "Step-by-step debugging that found the root cause",
 *   "tags": ["debugging", "memory", "solved"],
 *   "createdAt": "2026-01-10T14:00:00.000Z",
 *   "updatedAt": "2026-01-10T15:30:00.000Z"
 * }
 * ```
 */
export interface Bookmark {
  /** Unique identifier for the bookmark */
  readonly id: string;

  /** Type of bookmark */
  readonly type: BookmarkType;

  /** Session ID this bookmark references */
  readonly sessionId: string;

  /**
   * Message ID for message-type bookmarks.
   * Must be undefined for session-type bookmarks.
   * Must be undefined for range-type bookmarks.
   */
  readonly messageId?: string | undefined;

  /**
   * Message range for range-type bookmarks.
   * Must be undefined for session-type bookmarks.
   * Must be undefined for message-type bookmarks.
   */
  readonly messageRange?: MessageRange | undefined;

  /** User-provided name for the bookmark */
  readonly name: string;

  /** Optional description providing context */
  readonly description?: string | undefined;

  /** Tags for categorization and filtering */
  readonly tags: readonly string[];

  /** ISO timestamp when the bookmark was created */
  readonly createdAt: string;

  /** ISO timestamp when the bookmark was last updated */
  readonly updatedAt: string;
}

/**
 * Options for creating a new bookmark.
 *
 * Depending on the type, different fields are required:
 * - `session`: Only sessionId required
 * - `message`: sessionId and messageId required
 * - `range`: sessionId, fromMessageId, and toMessageId required
 */
export interface CreateBookmarkOptions {
  /** Type of bookmark to create */
  readonly type: BookmarkType;

  /** Session ID to bookmark */
  readonly sessionId: string;

  /**
   * Message ID for message-type bookmarks.
   * Required when type is 'message'.
   * Must be undefined when type is 'session' or 'range'.
   */
  readonly messageId?: string | undefined;

  /**
   * Start message ID for range-type bookmarks.
   * Required when type is 'range'.
   * Must be undefined when type is 'session' or 'message'.
   */
  readonly fromMessageId?: string | undefined;

  /**
   * End message ID for range-type bookmarks.
   * Required when type is 'range'.
   * Must be undefined when type is 'session' or 'message'.
   */
  readonly toMessageId?: string | undefined;

  /** User-provided name for the bookmark */
  readonly name: string;

  /** Optional description */
  readonly description?: string | undefined;

  /** Optional tags (defaults to empty array if not provided) */
  readonly tags?: readonly string[] | undefined;
}

/**
 * Filter options for querying bookmarks.
 *
 * All fields are optional. When multiple fields are specified,
 * they are combined with AND logic.
 */
export interface BookmarkFilter {
  /** Filter by bookmark type */
  readonly type?: BookmarkType | undefined;

  /** Filter by session ID */
  readonly sessionId?: string | undefined;

  /** Filter by tags (matches if bookmark has ALL specified tags) */
  readonly tags?: readonly string[] | undefined;

  /** Filter bookmarks created after this date */
  readonly since?: Date | undefined;

  /** Maximum number of results to return */
  readonly limit?: number | undefined;

  /** Number of results to skip (for pagination) */
  readonly offset?: number | undefined;
}

/**
 * Match type indicates where the search term was found.
 */
export type MatchType = "metadata" | "content";

/**
 * Search result containing a bookmark and match information.
 *
 * Used by BookmarkManager.search() to return ranked results
 * with context about where the match occurred.
 *
 * @example Metadata match result
 * ```json
 * {
 *   "bookmark": {
 *     "id": "bm-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
 *     "type": "session",
 *     "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *     "name": "Authentication Architecture Review",
 *     "tags": ["architecture", "auth"],
 *     "createdAt": "2026-01-10T10:30:00.000Z",
 *     "updatedAt": "2026-01-10T10:30:00.000Z"
 *   },
 *   "matchType": "metadata",
 *   "relevanceScore": 0.92
 * }
 * ```
 *
 * @example Content match result
 * ```json
 * {
 *   "bookmark": {
 *     "id": "bm-b2c3d4e5-f6a7-8901-bcde-f23456789012",
 *     "type": "message",
 *     "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 *     "messageId": "msg-123",
 *     "name": "Token Implementation",
 *     "tags": ["tokens"],
 *     "createdAt": "2026-01-10T11:00:00.000Z",
 *     "updatedAt": "2026-01-10T11:00:00.000Z"
 *   },
 *   "matchType": "content",
 *   "matchContext": "...implement JWT token validation using the jsonwebtoken library...",
 *   "relevanceScore": 0.78
 * }
 * ```
 */
export interface BookmarkSearchResult {
  /** The matching bookmark */
  readonly bookmark: Bookmark;

  /**
   * Type of match.
   * - `metadata`: Match found in name, description, or tags
   * - `content`: Match found in session/message content
   */
  readonly matchType: MatchType;

  /**
   * Context snippet showing where the match occurred.
   * Undefined if matchType is 'metadata'.
   */
  readonly matchContext?: string | undefined;

  /**
   * Relevance score (0.0 to 1.0).
   * Higher scores indicate better matches.
   */
  readonly relevanceScore: number;
}
