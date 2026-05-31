/**
 * File-based implementation of BookmarkRepository.
 *
 * Stores bookmarks as individual JSON files in the local filesystem at:
 * ~/.local/claude-code-agent/metadata/bookmarks/{id}.json
 *
 * @module repository/file/bookmark-repository
 */
import type { FileSystem } from "../../interfaces/filesystem";
import type { Clock } from "../../interfaces/clock";
import { BaseFileRepository } from "./base-repository";
import type { Bookmark, BookmarkFilter, BookmarkRepository, BookmarkSearchOptions, BookmarkSort } from "../bookmark-repository";
/**
 * File-based implementation of BookmarkRepository.
 *
 * Stores each bookmark as a separate JSON file.
 * Directory structure:
 * ~/.local/claude-code-agent/metadata/bookmarks/
 *   {bookmark-id}.json
 */
export declare class FileBookmarkRepository extends BaseFileRepository<Bookmark> implements BookmarkRepository {
    private readonly baseDir;
    constructor(fs: FileSystem, clock: Clock, baseDir?: string);
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
    list(filter?: BookmarkFilter, sort?: BookmarkSort): Promise<readonly Bookmark[]>;
    /**
     * Search bookmarks by query string.
     *
     * Searches in name, description, and tags (metadata).
     * If metadataOnly is false, also searches in content (future implementation).
     *
     * @param options - Search options
     * @returns Array of matching bookmarks
     */
    search(options: BookmarkSearchOptions): Promise<readonly Bookmark[]>;
    /**
     * Save a bookmark.
     *
     * Creates a new bookmark or updates an existing one.
     * Uses locking to prevent concurrent write conflicts.
     *
     * @param bookmark - Bookmark to save
     */
    save(bookmark: Bookmark): Promise<void>;
    /**
     * Update a bookmark by ID.
     *
     * Uses locking to prevent read-modify-write race conditions.
     *
     * @param id - Bookmark ID to update
     * @param updates - Partial bookmark updates (id cannot be changed)
     */
    update(id: string, updates: Partial<Omit<Bookmark, "id">>): Promise<void>;
    /**
     * Delete a bookmark by ID.
     *
     * Uses locking to prevent deletion races.
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
    /**
     * Get the file path for a bookmark.
     */
    private getBookmarkPath;
    /**
     * Read all bookmarks from disk.
     *
     * @returns Array of all bookmarks
     */
    private readAllBookmarks;
    /**
     * Apply filter criteria to bookmark array.
     */
    private applyFilter;
    /**
     * Apply sort options to bookmark array.
     */
    private applySort;
}
//# sourceMappingURL=bookmark-repository.d.ts.map