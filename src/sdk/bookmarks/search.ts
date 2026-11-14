/**
 * Bookmark search functionality.
 *
 * Provides metadata and content search for bookmarks with relevance scoring
 * and context extraction.
 *
 * @module sdk/bookmarks/search
 */

import type { Container } from "../../container";
import type { Bookmark, BookmarkSearchResult, MatchType } from "./types";
import type { Message } from "../../types/message";
import { SessionReader } from "../session-reader";

/**
 * BookmarkSearch provides search functionality for bookmarks.
 *
 * Supports both metadata-only search (name, description, tags) and
 * full-content search (loading session messages).
 */
export class BookmarkSearch {
  /**
   * Create a new BookmarkSearch instance.
   *
   * @param container - Dependency injection container
   */
  constructor(container: Container) {
    // SessionReader will be used when session path resolution is implemented
    // For now, suppress the unused variable warning
    void new SessionReader(container);
  }

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
  searchMetadata(
    query: string,
    bookmarks: readonly Bookmark[],
  ): BookmarkSearchResult[] {
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery === "") {
      return [];
    }

    const results: BookmarkSearchResult[] = [];

    for (const bookmark of bookmarks) {
      if (this.matchMetadata(normalizedQuery, bookmark)) {
        const relevance = this.calculateRelevance(
          bookmark,
          "metadata",
          normalizedQuery,
        );
        results.push({
          bookmark,
          matchType: "metadata",
          matchContext: undefined,
          relevanceScore: relevance,
        });
      }
    }

    // Sort by relevance score (highest first)
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

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
  async searchContent(
    query: string,
    bookmarks: readonly Bookmark[],
  ): Promise<BookmarkSearchResult[]> {
    const normalizedQuery = query.toLowerCase().trim();
    if (normalizedQuery === "") {
      return [];
    }

    const results: BookmarkSearchResult[] = [];

    for (const bookmark of bookmarks) {
      // Load messages for this bookmark
      const messages = await this.loadBookmarkMessages(bookmark);
      if (messages.length === 0) {
        continue;
      }

      // Search content
      const match = this.matchContent(normalizedQuery, messages);
      if (match.matches) {
        const relevance = this.calculateRelevance(
          bookmark,
          "content",
          normalizedQuery,
        );
        results.push({
          bookmark,
          matchType: "content",
          matchContext: match.context,
          relevanceScore: relevance,
        });
      }
    }

    // Sort by relevance score (highest first)
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Check if bookmark metadata matches the query.
   *
   * Searches in name, description, and tags (case-insensitive).
   *
   * @param query - Normalized query string (lowercase)
   * @param bookmark - Bookmark to check
   * @returns True if any metadata field matches
   */
  private matchMetadata(query: string, bookmark: Bookmark): boolean {
    // Search in name
    if (bookmark.name.toLowerCase().includes(query)) {
      return true;
    }

    // Search in description
    if (
      bookmark.description !== undefined &&
      bookmark.description.toLowerCase().includes(query)
    ) {
      return true;
    }

    // Search in tags
    for (const tag of bookmark.tags) {
      if (tag.toLowerCase().includes(query)) {
        return true;
      }
    }

    return false;
  }

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
  private matchContent(
    query: string,
    messages: readonly Message[],
  ): { matches: boolean; context?: string } {
    for (const message of messages) {
      const content = message.content.toLowerCase();
      if (content.includes(query)) {
        const context = this.extractContext(message.content, query, 100);
        return { matches: true, context };
      }
    }
    return { matches: false };
  }

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
  private calculateRelevance(
    bookmark: Bookmark,
    matchType: MatchType,
    query: string,
  ): number {
    const nameLower = bookmark.name.toLowerCase();

    // Exact name match
    if (nameLower === query) {
      return 1.0;
    }

    // Name contains query
    if (nameLower.includes(query)) {
      const startsWithQuery = nameLower.startsWith(query);
      return startsWithQuery ? 0.9 : 0.8;
    }

    // Description match
    if (
      bookmark.description !== undefined &&
      bookmark.description.toLowerCase().includes(query)
    ) {
      const descLower = bookmark.description.toLowerCase();
      const startsWithQuery = descLower.startsWith(query);
      return startsWithQuery ? 0.7 : 0.6;
    }

    // Tags match
    for (const tag of bookmark.tags) {
      const tagLower = tag.toLowerCase();
      if (tagLower === query) {
        return 0.7;
      }
      if (tagLower.includes(query)) {
        return 0.6;
      }
    }

    // Content match
    if (matchType === "content") {
      return 0.4;
    }

    // Fallback
    return 0.3;
  }

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
  private extractContext(
    content: string,
    query: string,
    contextLength: number,
  ): string {
    const lowerContent = content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const matchIndex = lowerContent.indexOf(lowerQuery);

    if (matchIndex === -1) {
      // No match found, return start of content
      return content.length > contextLength
        ? `${content.slice(0, contextLength)}...`
        : content;
    }

    // Calculate start and end positions
    const halfContext = Math.floor(contextLength / 2);
    let start = Math.max(0, matchIndex - halfContext);
    let end = Math.min(content.length, matchIndex + query.length + halfContext);

    // Adjust if at boundaries
    if (start === 0) {
      end = Math.min(content.length, contextLength);
    } else if (end === content.length) {
      start = Math.max(0, content.length - contextLength);
    }

    // Extract snippet
    let snippet = content.slice(start, end);

    // Add ellipsis
    if (start > 0) {
      snippet = `...${snippet}`;
    }
    if (end < content.length) {
      snippet = `${snippet}...`;
    }

    return snippet;
  }

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
  private async loadBookmarkMessages(
    _bookmark: Bookmark,
  ): Promise<readonly Message[]> {
    // TODO: Implement session path resolution
    // This requires a session path mapper or registry
    // For now, return empty array as placeholder
    //
    // const sessionPath = await this.resolveSessionPath(_bookmark.sessionId);
    // const messagesResult = await this.sessionReader.readMessages(sessionPath);
    //
    // if (messagesResult.isErr()) {
    //   return [];
    // }
    //
    // const allMessages = messagesResult.value;
    //
    // switch (_bookmark.type) {
    //   case "session":
    //     return allMessages;
    //   case "message":
    //     return allMessages.filter(m => m.id === _bookmark.messageId);
    //   case "range":
    //     // Find messages in range
    //     const fromIndex = allMessages.findIndex(
    //       m => m.id === _bookmark.messageRange?.fromMessageId
    //     );
    //     const toIndex = allMessages.findIndex(
    //       m => m.id === _bookmark.messageRange?.toMessageId
    //     );
    //     if (fromIndex !== -1 && toIndex !== -1 && fromIndex <= toIndex) {
    //       return allMessages.slice(fromIndex, toIndex + 1);
    //     }
    //     return [];
    // }

    return [];
  }
}
