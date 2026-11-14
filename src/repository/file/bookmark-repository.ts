/**
 * File-based implementation of BookmarkRepository.
 *
 * Stores bookmarks as individual JSON files in the local filesystem at:
 * ~/.local/claude-code-agent/metadata/bookmarks/{id}.json
 *
 * @module repository/file/bookmark-repository
 */

import * as path from "node:path";
import type { FileSystem } from "../../interfaces/filesystem";
import type { Clock } from "../../interfaces/clock";
import { FileLockServiceImpl } from "../../services/file-lock";
import { AtomicWriter } from "../../services/atomic-writer";
import { BaseFileRepository } from "./base-repository";
import { resolveAgentDataPath } from "./path-utils";
import type {
  Bookmark,
  BookmarkFilter,
  BookmarkRepository,
  BookmarkSearchOptions,
  BookmarkSort,
} from "../bookmark-repository";

/**
 * File-based implementation of BookmarkRepository.
 *
 * Stores each bookmark as a separate JSON file.
 * Directory structure:
 * ~/.local/claude-code-agent/metadata/bookmarks/
 *   {bookmark-id}.json
 */
export class FileBookmarkRepository
  extends BaseFileRepository<Bookmark>
  implements BookmarkRepository
{
  private readonly baseDir: string;

  constructor(fs: FileSystem, clock: Clock, baseDir?: string) {
    const lockService = new FileLockServiceImpl(fs, clock);
    const atomicWriter = new AtomicWriter(fs);
    super(fs, lockService, atomicWriter);

    this.baseDir =
      baseDir ?? resolveAgentDataPath(undefined, "metadata", "bookmarks");
  }

  /**
   * Find a bookmark by its ID.
   *
   * @param id - Bookmark ID
   * @returns Bookmark if found, null otherwise
   */
  async findById(id: string): Promise<Bookmark | null> {
    try {
      return await this.readWithLock(this.getBookmarkPath(id));
    } catch (error: unknown) {
      // If file doesn't exist or is invalid JSON, return null
      return null;
    }
  }

  /**
   * Find bookmarks by session ID.
   *
   * @param sessionId - Session ID to filter by
   * @returns Array of bookmarks for the session
   */
  async findBySession(sessionId: string): Promise<readonly Bookmark[]> {
    return this.list({ sessionId });
  }

  /**
   * Find bookmarks by tag.
   *
   * @param tag - Tag to filter by
   * @returns Array of bookmarks containing the tag
   */
  async findByTag(tag: string): Promise<readonly Bookmark[]> {
    const allBookmarks = await this.readAllBookmarks();
    return allBookmarks.filter((bookmark) => bookmark.tags.includes(tag));
  }

  /**
   * List bookmarks with optional filtering and sorting.
   *
   * @param filter - Filter criteria
   * @param sort - Sort options
   * @returns Array of bookmarks matching the filter
   */
  async list(
    filter?: BookmarkFilter,
    sort?: BookmarkSort,
  ): Promise<readonly Bookmark[]> {
    let results = await this.readAllBookmarks();

    // Apply filters
    if (filter) {
      results = this.applyFilter(results, filter);
    }

    // Apply sorting
    if (sort) {
      results = this.applySort(results, sort);
    }

    return results;
  }

  /**
   * Search bookmarks by query string.
   *
   * Searches in name, description, and tags (metadata).
   * If metadataOnly is false, also searches in content (future implementation).
   *
   * @param options - Search options
   * @returns Array of matching bookmarks
   */
  async search(options: BookmarkSearchOptions): Promise<readonly Bookmark[]> {
    const allBookmarks = await this.readAllBookmarks();
    const query = options.query.toLowerCase();

    let results = allBookmarks.filter((bookmark) => {
      // Search in name
      if (bookmark.name.toLowerCase().includes(query)) {
        return true;
      }

      // Search in description
      if (bookmark.description?.toLowerCase().includes(query)) {
        return true;
      }

      // Search in tags
      if (bookmark.tags.some((tag) => tag.toLowerCase().includes(query))) {
        return true;
      }

      // TODO: Content search (requires loading session/message data)
      // This would be implemented in a higher-level service that has access to session repository

      return false;
    });

    // Apply limit
    if (options.limit !== undefined) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Save a bookmark.
   *
   * Creates a new bookmark or updates an existing one.
   * Uses locking to prevent concurrent write conflicts.
   *
   * @param bookmark - Bookmark to save
   */
  async save(bookmark: Bookmark): Promise<void> {
    await this.writeWithLock(this.getBookmarkPath(bookmark.id), bookmark);
  }

  /**
   * Update a bookmark by ID.
   *
   * Uses locking to prevent read-modify-write race conditions.
   *
   * @param id - Bookmark ID to update
   * @param updates - Partial bookmark updates (id cannot be changed)
   */
  async update(
    id: string,
    updates: Partial<Omit<Bookmark, "id">>,
  ): Promise<void> {
    await this.modifyWithLock(this.getBookmarkPath(id), (existing) => {
      if (!existing) {
        throw new Error(`Bookmark not found: ${id}`);
      }

      return {
        ...existing,
        ...updates,
        id: existing.id, // Ensure ID cannot be changed
        updatedAt: new Date().toISOString(),
      };
    });
  }

  /**
   * Delete a bookmark by ID.
   *
   * Uses locking to prevent deletion races.
   *
   * @param id - Bookmark ID to delete
   * @returns True if bookmark was deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    return this.deleteWithLock(this.getBookmarkPath(id));
  }

  /**
   * Get all unique tags across all bookmarks.
   *
   * @returns Array of unique tag strings
   */
  async getAllTags(): Promise<readonly string[]> {
    const allBookmarks = await this.readAllBookmarks();
    const tagsSet = new Set<string>();

    for (const bookmark of allBookmarks) {
      for (const tag of bookmark.tags) {
        tagsSet.add(tag);
      }
    }

    return Array.from(tagsSet).sort();
  }

  /**
   * Count bookmarks matching the filter.
   *
   * @param filter - Filter criteria
   * @returns Number of matching bookmarks
   */
  async count(filter?: BookmarkFilter): Promise<number> {
    const bookmarks = await this.list(filter);
    return bookmarks.length;
  }

  /**
   * Get the file path for a bookmark.
   */
  private getBookmarkPath(id: string): string {
    return path.join(this.baseDir, `${id}.json`);
  }

  /**
   * Read all bookmarks from disk.
   *
   * @returns Array of all bookmarks
   */
  private async readAllBookmarks(): Promise<Bookmark[]> {
    // Ensure base directory exists
    const baseExists = await this.fs.exists(this.baseDir);
    if (!baseExists) {
      return [];
    }

    // Read all bookmark files
    const files = await this.fs.readDir(this.baseDir);
    const bookmarks: Bookmark[] = [];

    for (const file of files) {
      // Only process .json files
      if (!file.endsWith(".json")) {
        continue;
      }

      try {
        const bookmark = await this.readWithLock(path.join(this.baseDir, file));
        if (bookmark !== null) {
          bookmarks.push(bookmark);
        }
      } catch {
        // Skip invalid or unreadable bookmarks
        continue;
      }
    }

    return bookmarks;
  }

  /**
   * Apply filter criteria to bookmark array.
   */
  private applyFilter(
    bookmarks: Bookmark[],
    filter: BookmarkFilter,
  ): Bookmark[] {
    let results = bookmarks;

    if (filter.type !== undefined) {
      results = results.filter((b) => b.type === filter.type);
    }

    if (filter.sessionId !== undefined) {
      results = results.filter((b) => b.sessionId === filter.sessionId);
    }

    if (filter.tags !== undefined && filter.tags.length > 0) {
      // Filter to bookmarks that have ALL specified tags
      results = results.filter((b) =>
        filter.tags!.every((tag) => b.tags.includes(tag)),
      );
    }

    if (filter.nameContains !== undefined) {
      const searchTerm = filter.nameContains.toLowerCase();
      results = results.filter((b) =>
        b.name.toLowerCase().includes(searchTerm),
      );
    }

    if (filter.since !== undefined) {
      const sinceTime =
        typeof filter.since === "string"
          ? new Date(filter.since).getTime()
          : filter.since.getTime();
      results = results.filter(
        (b) => new Date(b.createdAt).getTime() >= sinceTime,
      );
    }

    if (filter.offset !== undefined) {
      results = results.slice(filter.offset);
    }

    if (filter.limit !== undefined) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Apply sort options to bookmark array.
   */
  private applySort(bookmarks: Bookmark[], sort: BookmarkSort): Bookmark[] {
    const sorted = [...bookmarks];
    const direction = sort.direction === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      let compareValue = 0;

      switch (sort.field) {
        case "name":
          compareValue = a.name.localeCompare(b.name);
          break;
        case "createdAt":
          compareValue =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case "updatedAt":
          compareValue =
            new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
      }

      return compareValue * direction;
    });

    return sorted;
  }
}
