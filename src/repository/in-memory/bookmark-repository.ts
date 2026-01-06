/**
 * In-memory bookmark repository for testing.
 *
 * Provides a Map-based implementation of BookmarkRepository
 * for use in unit tests and development.
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
 * Uses a Map for storage with bookmark.id as the key.
 * All data is lost when the instance is destroyed.
 */
export class InMemoryBookmarkRepository implements BookmarkRepository {
  private bookmarks = new Map<string, Bookmark>();

  /**
   * Find a bookmark by its ID.
   */
  async findById(id: string): Promise<Bookmark | null> {
    return this.bookmarks.get(id) ?? null;
  }

  /**
   * Find bookmarks by session ID.
   */
  async findBySession(sessionId: string): Promise<readonly Bookmark[]> {
    const results: Bookmark[] = [];
    const bookmarks = Array.from(this.bookmarks.values());
    for (const bookmark of bookmarks) {
      if (bookmark.sessionId === sessionId) {
        results.push(bookmark);
      }
    }
    return results;
  }

  /**
   * Find bookmarks by tag.
   */
  async findByTag(tag: string): Promise<readonly Bookmark[]> {
    const results: Bookmark[] = [];
    const bookmarks = Array.from(this.bookmarks.values());
    for (const bookmark of bookmarks) {
      if (bookmark.tags.includes(tag)) {
        results.push(bookmark);
      }
    }
    return results;
  }

  /**
   * List bookmarks with optional filtering and sorting.
   */
  async list(
    filter?: BookmarkFilter,
    sort?: BookmarkSort,
  ): Promise<readonly Bookmark[]> {
    let results = Array.from(this.bookmarks.values());

    // Apply filters
    if (filter) {
      results = results.filter((bookmark) => {
        // Filter by type
        if (filter.type !== undefined && bookmark.type !== filter.type) {
          return false;
        }

        // Filter by sessionId
        if (
          filter.sessionId !== undefined &&
          bookmark.sessionId !== filter.sessionId
        ) {
          return false;
        }

        // Filter by tags (bookmark must have ALL specified tags)
        if (filter.tags !== undefined && filter.tags.length > 0) {
          const hasAllTags = filter.tags.every((tag) =>
            bookmark.tags.includes(tag),
          );
          if (!hasAllTags) {
            return false;
          }
        }

        // Filter by name (partial match)
        if (
          filter.nameContains !== undefined &&
          !bookmark.name.toLowerCase().includes(filter.nameContains.toLowerCase())
        ) {
          return false;
        }

        // Filter by since date
        if (filter.since !== undefined) {
          const sinceDate =
            typeof filter.since === "string"
              ? new Date(filter.since)
              : filter.since;
          const createdDate = new Date(bookmark.createdAt);
          if (createdDate < sinceDate) {
            return false;
          }
        }

        return true;
      });
    }

    // Apply sorting
    if (sort) {
      results.sort((a, b) => {
        const aValue = a[sort.field];
        const bValue = b[sort.field];

        let comparison = 0;
        if (aValue < bValue) {
          comparison = -1;
        } else if (aValue > bValue) {
          comparison = 1;
        }

        return sort.direction === "asc" ? comparison : -comparison;
      });
    }

    // Apply pagination
    if (filter?.offset !== undefined) {
      results = results.slice(filter.offset);
    }
    if (filter?.limit !== undefined) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }

  /**
   * Search bookmarks by query string.
   *
   * Searches in name, description, and tags fields.
   * Returns results sorted by relevance (exact matches first).
   */
  async search(
    options: BookmarkSearchOptions,
  ): Promise<readonly Bookmark[]> {
    const query = options.query.toLowerCase();
    const results: Bookmark[] = [];
    const bookmarks = Array.from(this.bookmarks.values());

    for (const bookmark of bookmarks) {
      // Search in name
      if (bookmark.name.toLowerCase().includes(query)) {
        results.push(bookmark);
        continue;
      }

      // Search in description
      if (
        bookmark.description !== undefined &&
        bookmark.description.toLowerCase().includes(query)
      ) {
        results.push(bookmark);
        continue;
      }

      // Search in tags
      const matchesTag = bookmark.tags.some((tag) =>
        tag.toLowerCase().includes(query),
      );
      if (matchesTag) {
        results.push(bookmark);
        continue;
      }
    }

    // Sort by relevance (exact name matches first)
    results.sort((a, b) => {
      const aExactName = a.name.toLowerCase() === query;
      const bExactName = b.name.toLowerCase() === query;

      if (aExactName && !bExactName) return -1;
      if (!aExactName && bExactName) return 1;

      // Secondary sort by name
      return a.name.localeCompare(b.name);
    });

    // Apply limit
    if (options.limit !== undefined) {
      return results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Save a bookmark.
   *
   * Creates a new bookmark or updates an existing one.
   */
  async save(bookmark: Bookmark): Promise<void> {
    this.bookmarks.set(bookmark.id, bookmark);
  }

  /**
   * Update a bookmark by ID.
   */
  async update(
    id: string,
    updates: Partial<Omit<Bookmark, "id">>,
  ): Promise<void> {
    const existing = this.bookmarks.get(id);
    if (existing === undefined) {
      throw new Error(`Bookmark not found: ${id}`);
    }

    const updated: Bookmark = {
      ...existing,
      ...updates,
      id, // Ensure ID cannot be changed
    };

    this.bookmarks.set(id, updated);
  }

  /**
   * Delete a bookmark by ID.
   *
   * @returns True if bookmark was deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    return this.bookmarks.delete(id);
  }

  /**
   * Get all unique tags across all bookmarks.
   */
  async getAllTags(): Promise<readonly string[]> {
    const tags = new Set<string>();
    const bookmarks = Array.from(this.bookmarks.values());
    for (const bookmark of bookmarks) {
      for (const tag of bookmark.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }

  /**
   * Count bookmarks matching the filter.
   */
  async count(filter?: BookmarkFilter): Promise<number> {
    const results = await this.list(filter);
    return results.length;
  }

  /**
   * Clear all bookmarks.
   *
   * Useful for cleaning up between tests.
   */
  clear(): void {
    this.bookmarks.clear();
  }
}
