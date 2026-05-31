/**
 * In-memory bookmark repository for testing.
 *
 * Provides a Map-based implementation of BookmarkRepository
 * for use in unit tests and development.
 *
 * @module repository/in-memory/bookmark-repository
 */
import type { Bookmark, BookmarkFilter, BookmarkRepository, BookmarkSearchOptions, BookmarkSort } from "../bookmark-repository";
/**
 * In-memory implementation of BookmarkRepository.
 *
 * Uses a Map for storage with bookmark.id as the key.
 * All data is lost when the instance is destroyed.
 */
export declare class InMemoryBookmarkRepository implements BookmarkRepository {
    private readonly bookmarks;
    /**
     * Find a bookmark by its ID.
     */
    findById(id: string): Promise<Bookmark | null>;
    /**
     * Find bookmarks by session ID.
     */
    findBySession(sessionId: string): Promise<readonly Bookmark[]>;
    /**
     * Find bookmarks by tag.
     */
    findByTag(tag: string): Promise<readonly Bookmark[]>;
    /**
     * List bookmarks with optional filtering and sorting.
     */
    list(filter?: BookmarkFilter, sort?: BookmarkSort): Promise<readonly Bookmark[]>;
    /**
     * Search bookmarks by query string.
     *
     * Searches in name, description, and tags fields.
     * Returns results sorted by relevance (exact matches first).
     */
    search(options: BookmarkSearchOptions): Promise<readonly Bookmark[]>;
    /**
     * Save a bookmark.
     *
     * Creates a new bookmark or updates an existing one.
     */
    save(bookmark: Bookmark): Promise<void>;
    /**
     * Update a bookmark by ID.
     */
    update(id: string, updates: Partial<Omit<Bookmark, "id">>): Promise<void>;
    /**
     * Delete a bookmark by ID.
     *
     * @returns True if bookmark was deleted, false if not found
     */
    delete(id: string): Promise<boolean>;
    /**
     * Get all unique tags across all bookmarks.
     */
    getAllTags(): Promise<readonly string[]>;
    /**
     * Count bookmarks matching the filter.
     */
    count(filter?: BookmarkFilter): Promise<number>;
    /**
     * Clear all bookmarks.
     *
     * Useful for cleaning up between tests.
     */
    clear(): void;
}
//# sourceMappingURL=bookmark-repository.d.ts.map