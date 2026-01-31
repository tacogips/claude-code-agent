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
import type {
  Bookmark,
  BookmarkFilter as SdkBookmarkFilter,
  CreateBookmarkOptions,
  BookmarkSearchResult,
} from "./types";
import type { Message } from "../../types/message";
import { BookmarkSearch } from "./search";
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
export class BookmarkManager {
  private readonly repository: BookmarkRepository;
  private readonly bookmarkSearch: BookmarkSearch;
  private readonly sessionReader: SessionReader;

  /**
   * Create a new BookmarkManager.
   *
   * @param container - Dependency injection container
   * @param repository - Bookmark repository for persistence
   * @param sessionReader - Session reader for loading content (optional, uses container if not provided)
   */
  constructor(
    container: Container,
    repository: BookmarkRepository,
    sessionReader?: SessionReader,
  ) {
    this.repository = repository;
    this.bookmarkSearch = new BookmarkSearch(container);
    // SessionReader will be used when session path resolution is implemented
    this.sessionReader = sessionReader ?? new SessionReader(container);
  }

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
  async add(options: CreateBookmarkOptions): Promise<Bookmark> {
    // Validate options
    this.validateBookmark(options);

    // Generate ID and timestamps
    const id = this.generateId();
    const now = new Date().toISOString();

    // Create bookmark based on type
    const bookmark: Bookmark = {
      id,
      type: options.type,
      sessionId: options.sessionId,
      messageId: options.messageId,
      messageRange:
        options.type === "range" &&
        options.fromMessageId !== undefined &&
        options.toMessageId !== undefined
          ? {
              fromMessageId: options.fromMessageId,
              toMessageId: options.toMessageId,
            }
          : undefined,
      name: options.name,
      description: options.description,
      tags: options.tags ? [...options.tags] : [],
      createdAt: now,
      updatedAt: now,
    };

    // Save to repository
    await this.repository.save(bookmark);

    return bookmark;
  }

  /**
   * Get a bookmark by ID.
   *
   * @param bookmarkId - Bookmark ID
   * @returns The bookmark if found, null otherwise
   */
  async get(bookmarkId: string): Promise<Bookmark | null> {
    return this.repository.findById(bookmarkId);
  }

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
  async getWithContent(
    bookmarkId: string,
  ): Promise<BookmarkWithContent | null> {
    const bookmark = await this.repository.findById(bookmarkId);
    if (bookmark === null) {
      return null;
    }

    const content = await this.loadContent(bookmark);
    return {
      bookmark,
      content,
    };
  }

  /**
   * List bookmarks with optional filtering.
   *
   * @param filter - Filter criteria (type, sessionId, tags, etc.)
   * @returns Array of bookmarks matching the filter
   */
  async list(filter?: SdkBookmarkFilter): Promise<readonly Bookmark[]> {
    return this.repository.list(filter);
  }

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
  async update(
    bookmarkId: string,
    updates: Partial<Bookmark>,
  ): Promise<Bookmark> {
    const existing = await this.repository.findById(bookmarkId);
    if (existing === null) {
      throw new Error(`Bookmark not found: ${bookmarkId}`);
    }

    // Only allow updating specific fields
    const updatedBookmark: Bookmark = {
      ...existing,
      name: updates.name ?? existing.name,
      description: updates.description ?? existing.description,
      tags: updates.tags ? [...updates.tags] : existing.tags,
      updatedAt: new Date().toISOString(),
    };

    await this.repository.update(bookmarkId, {
      name: updatedBookmark.name,
      description: updatedBookmark.description,
      tags: updatedBookmark.tags,
      updatedAt: updatedBookmark.updatedAt,
    });

    return updatedBookmark;
  }

  /**
   * Delete a bookmark.
   *
   * @param bookmarkId - Bookmark ID to delete
   * @returns True if deleted, false if not found
   */
  async delete(bookmarkId: string): Promise<boolean> {
    return this.repository.delete(bookmarkId);
  }

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
  async search(
    query: string,
    options?: SearchOptions,
  ): Promise<readonly BookmarkSearchResult[]> {
    // Get all bookmarks (or apply a reasonable limit)
    const allBookmarks = await this.repository.list({
      limit: options?.limit,
    });

    // Metadata search
    const metadataResults = this.bookmarkSearch.searchMetadata(
      query,
      allBookmarks,
    );

    // If metadata-only, return metadata results
    if (options?.metadataOnly === true) {
      return metadataResults;
    }

    // Content search
    const contentResults = await this.bookmarkSearch.searchContent(
      query,
      allBookmarks,
    );

    // Combine results (avoid duplicates, prefer higher relevance)
    const resultMap = new Map<string, BookmarkSearchResult>();

    for (const result of metadataResults) {
      resultMap.set(result.bookmark.id, result);
    }

    for (const result of contentResults) {
      const existing = resultMap.get(result.bookmark.id);
      if (
        existing === undefined ||
        result.relevanceScore > existing.relevanceScore
      ) {
        resultMap.set(result.bookmark.id, result);
      }
    }

    // Convert to array and sort by relevance
    const combinedResults = Array.from(resultMap.values());
    combinedResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Apply limit if specified
    if (options?.limit !== undefined && options.limit > 0) {
      return combinedResults.slice(0, options.limit);
    }

    return combinedResults;
  }

  /**
   * Add a tag to a bookmark.
   *
   * @param bookmarkId - Bookmark ID
   * @param tag - Tag to add
   * @returns The updated bookmark
   * @throws Error if bookmark not found
   */
  async addTag(bookmarkId: string, tag: string): Promise<Bookmark> {
    const existing = await this.repository.findById(bookmarkId);
    if (existing === null) {
      throw new Error(`Bookmark not found: ${bookmarkId}`);
    }

    // Add tag if not already present
    if (existing.tags.includes(tag)) {
      return existing; // Tag already exists, no change needed
    }

    const updatedTags = [...existing.tags, tag];
    return this.update(bookmarkId, { tags: updatedTags });
  }

  /**
   * Remove a tag from a bookmark.
   *
   * @param bookmarkId - Bookmark ID
   * @param tag - Tag to remove
   * @returns The updated bookmark
   * @throws Error if bookmark not found
   */
  async removeTag(bookmarkId: string, tag: string): Promise<Bookmark> {
    const existing = await this.repository.findById(bookmarkId);
    if (existing === null) {
      throw new Error(`Bookmark not found: ${bookmarkId}`);
    }

    // Remove tag if present
    const updatedTags = existing.tags.filter((t) => t !== tag);

    // If no change, return existing
    if (updatedTags.length === existing.tags.length) {
      return existing;
    }

    return this.update(bookmarkId, { tags: updatedTags });
  }

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
  private validateBookmark(options: CreateBookmarkOptions): void {
    // Validate based on type
    switch (options.type) {
      case "session":
        // Session bookmarks should not have messageId or range fields
        if (options.messageId !== undefined) {
          throw new Error(
            "Session bookmarks cannot have messageId. Use type 'message' instead.",
          );
        }
        if (
          options.fromMessageId !== undefined ||
          options.toMessageId !== undefined
        ) {
          throw new Error(
            "Session bookmarks cannot have message range. Use type 'range' instead.",
          );
        }
        break;

      case "message":
        // Message bookmarks require messageId
        if (options.messageId === undefined) {
          throw new Error("Message bookmarks require messageId");
        }
        // Message bookmarks should not have range fields
        if (
          options.fromMessageId !== undefined ||
          options.toMessageId !== undefined
        ) {
          throw new Error(
            "Message bookmarks cannot have message range. Use type 'range' instead.",
          );
        }
        break;

      case "range":
        // Range bookmarks require fromMessageId and toMessageId
        if (
          options.fromMessageId === undefined ||
          options.toMessageId === undefined
        ) {
          throw new Error(
            "Range bookmarks require both fromMessageId and toMessageId",
          );
        }
        // Range bookmarks should not have messageId
        if (options.messageId !== undefined) {
          throw new Error(
            "Range bookmarks cannot have messageId. Use type 'message' instead.",
          );
        }
        break;

      default:
        // TypeScript should ensure exhaustiveness, but add runtime check
        throw new Error(`Unknown bookmark type: ${String(options.type)}`);
    }

    // Validate name is not empty
    if (options.name.trim() === "") {
      throw new Error("Bookmark name cannot be empty");
    }
  }

  /**
   * Generate a unique bookmark ID.
   *
   * Uses crypto.randomUUID() for ID generation.
   *
   * @returns A unique bookmark ID
   */
  private generateId(): string {
    return crypto.randomUUID();
  }

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
  private async loadContent(_bookmark: Bookmark): Promise<readonly Message[]> {
    // Suppress unused variable warning - will be used when session path resolution is implemented
    void this.sessionReader;

    // TODO: Implement session path resolution
    // This requires a session path mapper or registry
    //
    // const sessionPath = await this.resolveSessionPath(_bookmark.sessionId);
    // const sessionResult = await this.sessionReader.readSession(sessionPath);
    //
    // if (sessionResult.isErr()) {
    //   return [];
    // }
    //
    // const session = sessionResult.value;
    //
    // switch (_bookmark.type) {
    //   case "session":
    //     return session.messages;
    //   case "message":
    //     return session.messages.filter(m => m.id === _bookmark.messageId);
    //   case "range":
    //     const fromIndex = session.messages.findIndex(
    //       m => m.id === _bookmark.messageRange?.fromMessageId
    //     );
    //     const toIndex = session.messages.findIndex(
    //       m => m.id === _bookmark.messageRange?.toMessageId
    //     );
    //     if (fromIndex !== -1 && toIndex !== -1 && fromIndex <= toIndex) {
    //       return session.messages.slice(fromIndex, toIndex + 1);
    //     }
    //     return [];
    // }

    // Placeholder: return empty array
    return [];
  }
}
