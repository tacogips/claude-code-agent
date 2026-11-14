/**
 * Bookmark search functionality.
 *
 * Provides metadata and content search for bookmarks with relevance scoring
 * and context extraction.
 *
 * @module sdk/bookmarks/search
 */
import type { Container } from "../../container";
import type { Bookmark, BookmarkSearchResult } from "./types";
/**
 * BookmarkSearch provides search functionality for bookmarks.
 *
 * Supports both metadata-only search (name, description, tags) and
 * full-content search (loading session messages).
 */
export declare class BookmarkSearch {
    /**
     * Create a new BookmarkSearch instance.
     *
     * @param container - Dependency injection container
     */
    constructor(container: Container);
    /**
     * Search bookmarks by metadata (name, description, tags).
     *
     * Performs case-insensitive search across bookmark metadata fields.
     * Does not load session content, making it fast for large bookmark sets.
     *
     * @param query - Search query string
     * @param bookmarks - Bookmarks to search through
     * @returns Array of search results sorted by relevance
     */
    searchMetadata(query: string, bookmarks: readonly Bookmark[]): BookmarkSearchResult[];
    /**
     * Search bookmarks by content (session messages).
     *
     * Loads session messages for each bookmark and searches within them.
     * For message and range bookmarks, searches only the specific messages.
     * For session bookmarks, searches all messages in the session.
     *
     * @param query - Search query string
     * @param bookmarks - Bookmarks to search through
     * @returns Promise resolving to array of search results sorted by relevance
     */
    searchContent(query: string, bookmarks: readonly Bookmark[]): Promise<BookmarkSearchResult[]>;
    /**
     * Check if bookmark metadata matches the query.
     *
     * Searches in name, description, and tags (case-insensitive).
     *
     * @param query - Normalized query string (lowercase)
     * @param bookmark - Bookmark to check
     * @returns True if any metadata field matches
     */
    private matchMetadata;
    /**
     * Check if message content matches the query.
     *
     * Searches all message content fields (case-insensitive).
     * Returns the first match with context snippet.
     *
     * @param query - Normalized query string (lowercase)
     * @param messages - Messages to search
     * @returns Match result with context if found
     */
    private matchContent;
    /**
     * Calculate relevance score for a search match.
     *
     * Scoring factors:
     * - Exact name match: 1.0
     * - Name contains query: 0.8
     * - Description/tags match: 0.6
     * - Content match: 0.4
     * - Bonus for query at start of field: +0.1
     *
     * @param bookmark - The matching bookmark
     * @param matchType - Type of match (metadata or content)
     * @param query - Normalized query string (lowercase)
     * @returns Relevance score between 0.0 and 1.0
     */
    private calculateRelevance;
    /**
     * Extract a context snippet around a match.
     *
     * Returns a substring centered on the first occurrence of the query,
     * with approximately contextLength/2 characters before and after.
     * Truncates with "..." if needed.
     *
     * @param content - Original content string
     * @param query - Query string to find (case-insensitive)
     * @param contextLength - Total length of context snippet
     * @returns Context snippet with "..." if truncated
     */
    private extractContext;
    /**
     * Load messages for a bookmark.
     *
     * For session bookmarks: loads all session messages
     * For message bookmarks: loads only the specific message
     * For range bookmarks: loads messages in the range
     *
     * Note: This is a simplified implementation. In a real system,
     * you would need to map sessionId to the actual session file path.
     * For now, this returns an empty array as a placeholder.
     *
     * @param _bookmark - Bookmark to load messages for (unused in placeholder)
     * @returns Array of messages
     */
    private loadBookmarkMessages;
}
//# sourceMappingURL=search.d.ts.map