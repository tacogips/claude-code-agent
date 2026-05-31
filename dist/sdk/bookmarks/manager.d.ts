/**
 * Bookmark Manager for CRUD and search operations.
 *
 * Provides a high-level API for managing bookmarks with validation,
 * search capabilities, and integration with the bookmark repository.
 *
 * @module sdk/bookmarks/manager
 */
import type { Container } from "../../container";
import type { BookmarkRepository } from "../../repository/bookmark-repository";
import type { Bookmark, BookmarkFilter as SdkBookmarkFilter, CreateBookmarkOptions, BookmarkSearchResult } from "./types";
import type { Message } from "../../types/message";
import { SessionReader } from "../session-reader";
/**
 * Search options for bookmark search.
 */
export interface SearchOptions {
    /** Search in metadata only (skip content search) */
    readonly metadataOnly?: boolean | undefined;
    /** Maximum number of results to return */
    readonly limit?: number | undefined;
}
/**
 * Result of getWithContent operation.
 */
export interface BookmarkWithContent {
    /** The bookmark */
    readonly bookmark: Bookmark;
    /** Messages associated with the bookmark */
    readonly content: readonly Message[];
}
/**
 * BookmarkManager provides CRUD and search operations for bookmarks.
 *
 * Handles bookmark creation, retrieval, updates, deletion, and search.
 * Validates bookmark data and coordinates between repository and search.
 */
export declare class BookmarkManager {
    private readonly repository;
    private readonly bookmarkSearch;
    private readonly sessionReader;
    /**
     * Create a new BookmarkManager.
     *
     * @param container - Dependency injection container
     * @param repository - Bookmark repository for persistence
     * @param sessionReader - Session reader for loading content (optional, uses container if not provided)
     */
    constructor(container: Container, repository: BookmarkRepository, sessionReader?: SessionReader);
    /**
     * Create a new bookmark.
     *
     * Validates the bookmark options based on type and creates a new bookmark
     * with a generated ID and timestamps.
     *
     * @param options - Bookmark creation options
     * @returns The created bookmark
     * @throws Error if validation fails
     */
    add(options: CreateBookmarkOptions): Promise<Bookmark>;
    /**
     * Get a bookmark by ID.
     *
     * @param bookmarkId - Bookmark ID
     * @returns The bookmark if found, null otherwise
     */
    get(bookmarkId: string): Promise<Bookmark | null>;
    /**
     * Get a bookmark with its associated content.
     *
     * Loads the bookmark and its messages based on the bookmark type:
     * - session: all messages in the session
     * - message: only the specific message
     * - range: messages in the specified range
     *
     * @param bookmarkId - Bookmark ID
     * @returns Bookmark with content, or null if bookmark not found
     */
    getWithContent(bookmarkId: string): Promise<BookmarkWithContent | null>;
    /**
     * List bookmarks with optional filtering.
     *
     * @param filter - Filter criteria (type, sessionId, tags, etc.)
     * @returns Array of bookmarks matching the filter
     */
    list(filter?: SdkBookmarkFilter): Promise<readonly Bookmark[]>;
    /**
     * Update a bookmark.
     *
     * Only name, description, and tags can be updated.
     * ID, type, sessionId, messageId, messageRange, and createdAt are immutable.
     *
     * @param bookmarkId - Bookmark ID to update
     * @param updates - Partial bookmark updates
     * @returns The updated bookmark
     * @throws Error if bookmark not found
     */
    update(bookmarkId: string, updates: Partial<Bookmark>): Promise<Bookmark>;
    /**
     * Delete a bookmark.
     *
     * @param bookmarkId - Bookmark ID to delete
     * @returns True if deleted, false if not found
     */
    delete(bookmarkId: string): Promise<boolean>;
    /**
     * Search bookmarks by query string.
     *
     * Searches both metadata (name, description, tags) and content (session messages)
     * unless metadataOnly is true.
     *
     * @param query - Search query string
     * @param options - Search options (metadataOnly, limit)
     * @returns Array of search results sorted by relevance
     */
    search(query: string, options?: SearchOptions): Promise<readonly BookmarkSearchResult[]>;
    /**
     * Add a tag to a bookmark.
     *
     * @param bookmarkId - Bookmark ID
     * @param tag - Tag to add
     * @returns The updated bookmark
     * @throws Error if bookmark not found
     */
    addTag(bookmarkId: string, tag: string): Promise<Bookmark>;
    /**
     * Remove a tag from a bookmark.
     *
     * @param bookmarkId - Bookmark ID
     * @param tag - Tag to remove
     * @returns The updated bookmark
     * @throws Error if bookmark not found
     */
    removeTag(bookmarkId: string, tag: string): Promise<Bookmark>;
    /**
     * Validate bookmark creation options.
     *
     * Ensures type-specific requirements are met:
     * - session: only sessionId required
     * - message: sessionId + messageId required
     * - range: sessionId + fromMessageId + toMessageId required
     *
     * @param options - Bookmark creation options
     * @throws Error if validation fails
     */
    private validateBookmark;
    /**
     * Generate a unique bookmark ID.
     *
     * Uses crypto.randomUUID() for ID generation.
     *
     * @returns A unique bookmark ID
     */
    private generateId;
    /**
     * Load content (messages) for a bookmark.
     *
     * Loads messages based on bookmark type:
     * - session: all messages in the session
     * - message: only the specific message
     * - range: messages in the specified range
     *
     * Note: This is a placeholder implementation.
     * Full implementation requires session path resolution.
     *
     * @param _bookmark - Bookmark to load content for (unused in placeholder)
     * @returns Array of messages
     */
    private loadContent;
}
//# sourceMappingURL=manager.d.ts.map