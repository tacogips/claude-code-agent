/**
 * In-memory implementation of BookmarkRepository.
 *
 * Provides in-memory storage for bookmarks using a Map.
 * Primarily for testing and development purposes.
 *
 * @module repository/in-memory/bookmark-repository
 */

import type {
  Bookmark,
  BookmarkFilter,
  BookmarkRepository,
  BookmarkSearchOptions,
  BookmarkSort,
} from "../bookmark-repository";

/**
 * In-memory implementation of BookmarkRepository.
 *
 * All data is stored in memory and will be lost when the process exits.
 * Suitable for testing and development.
 */
export class InMemoryBookmarkRepository implements BookmarkRepository {
  private bookmarks: Map<string, Bookmark>;

  constructor() {
    this.bookmarks = new Map();
  }

  /**
   * Find a bookmark by its ID.
   *
   * @param id - Bookmark ID
   * @returns Bookmark if found, null otherwise
   */
  async findById(id: string): Promise<Bookmark | null> {
    return this.bookmarks.get(id) ?? null;
  }

  /**
   * Find all bookmarks for a session.
   *
   * @param sessionId - Session ID
   * @returns Array of bookmarks for the session
   */
  async findBySession(sessionId: string): Promise<readonly Bookmark[]> {
    return Array.from(this.bookmarks.values()).filter(
      (bookmark) => bookmark.sessionId === sessionId,
    );
  }

  /**
   * Find bookmarks by tag.
   *
   * @param tag - Tag to search for
   * @returns Array of bookmarks with the tag
   */
  async findByTag(tag: string): Promise<readonly Bookmark[]> {
    return Array.from(this.bookmarks.values()).filter((bookmark) =>
      bookmark.tags.includes(tag),
    );
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
    let results = Array.from(this.bookmarks.values());

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
   * Searches in name, description, and tags.
   *
   * @param options - Search options
   * @returns Array of matching bookmarks
   */
  async search(options: BookmarkSearchOptions): Promise<readonly Bookmark[]> {
    const query = options.query.toLowerCase();
    let results = Array.from(this.bookmarks.values());

    results = results.filter((bookmark) => {
      // Search in name
      if (bookmark.name.toLowerCase().includes(query)) {
        return true;
      }

      // Search in description
      if (bookmark.description?.toLowerCase().includes(query)) {
        return true;
      }

      // Search in tags
      if (
        bookmark.tags.some((tag: string) => tag.toLowerCase().includes(query))
      ) {
        return true;
      }

      return false;
    });

    if (options.limit !== undefined) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Save a bookmark.
   *
   * Creates a new bookmark or updates an existing one.
   *
   * @param bookmark - Bookmark to save
   */
  async save(bookmark: Bookmark): Promise<void> {
    this.bookmarks.set(bookmark.id, bookmark);
  }

  /**
   * Update a bookmark by ID.
   *
   * Updates mutable fields (name, description, tags) of an existing bookmark.
   *
   * @param id - Bookmark ID to update
   * @param updates - Partial bookmark data to update
   */
  async update(id: string, updates: Partial<Bookmark>): Promise<void> {
    const existing = this.bookmarks.get(id);
    if (!existing) {
      throw new Error(`Bookmark not found: ${id}`);
    }

    const updated: Bookmark = {
      ...existing,
      ...updates,
      id: existing.id, // ID cannot be changed
      type: existing.type, // Type cannot be changed
      sessionId: existing.sessionId, // Session ID cannot be changed
      createdAt: existing.createdAt, // Created timestamp cannot be changed
      updatedAt: new Date().toISOString(), // Always update timestamp
    };

    this.bookmarks.set(id, updated);
  }

  /**
   * Delete a bookmark by ID.
   *
   * @param id - Bookmark ID to delete
   * @returns True if bookmark was deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    return this.bookmarks.delete(id);
  }

  /**
   * Get all unique tags across all bookmarks.
   *
   * @returns Array of unique tag strings
   */
  async getAllTags(): Promise<readonly string[]> {
    const tagsSet = new Set<string>();

    for (const bookmark of this.bookmarks.values()) {
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
    if (!filter) {
      return this.bookmarks.size;
    }

    const filtered = this.applyFilter(
      Array.from(this.bookmarks.values()),
      filter,
    );
    return filtered.length;
  }

  /**
   * Clear all bookmarks from memory.
   *
   * Useful for test cleanup.
   */
  clear(): void {
    this.bookmarks.clear();
  }

  /**
   * Apply filter criteria to bookmark array.
   */
  private applyFilter(
    bookmarks: Bookmark[],
    filter: BookmarkFilter,
  ): Bookmark[] {
    let results = bookmarks;

    if (filter.sessionId !== undefined) {
      results = results.filter((b) => b.sessionId === filter.sessionId);
    }

    if (filter.type !== undefined) {
      results = results.filter((b) => b.type === filter.type);
    }

    if (filter.tags !== undefined && filter.tags.length > 0) {
      results = results.filter((b) =>
        filter.tags!.some((tag: string) => b.tags.includes(tag)),
      );
    }

    if (filter.nameContains !== undefined) {
      const searchTerm = filter.nameContains.toLowerCase();
      results = results.filter((b) =>
        b.name.toLowerCase().includes(searchTerm),
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
