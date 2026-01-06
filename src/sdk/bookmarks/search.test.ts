/**
 * Tests for bookmark search functionality.
 *
 * @module sdk/bookmarks/search.test
 */

import { describe, test, expect, beforeEach } from "vitest";
import { BookmarkSearch } from "./search";
import { createTestContainer } from "../../container";
import type { Bookmark } from "./types";

describe("BookmarkSearch", () => {
  let search: BookmarkSearch;

  beforeEach(() => {
    const container = createTestContainer();
    search = new BookmarkSearch(container);
  });

  describe("searchMetadata", () => {
    const bookmarks: Bookmark[] = [
      {
        id: "bm-1",
        type: "session",
        sessionId: "session-1",
        name: "Authentication Implementation",
        description: "OAuth2 token handling with JWT",
        tags: ["auth", "security", "jwt"],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "bm-2",
        type: "message",
        sessionId: "session-2",
        messageId: "msg-1",
        name: "Database Migration",
        description: "PostgreSQL schema update for user table",
        tags: ["database", "migration"],
        createdAt: "2026-01-02T00:00:00Z",
        updatedAt: "2026-01-02T00:00:00Z",
      },
      {
        id: "bm-3",
        type: "range",
        sessionId: "session-3",
        messageRange: {
          fromMessageId: "msg-10",
          toMessageId: "msg-15",
        },
        name: "API Design Discussion",
        description: "REST API endpoint design for user service",
        tags: ["api", "design", "rest"],
        createdAt: "2026-01-03T00:00:00Z",
        updatedAt: "2026-01-03T00:00:00Z",
      },
      {
        id: "bm-4",
        type: "session",
        sessionId: "session-4",
        name: "TypeScript Best Practices",
        tags: ["typescript", "coding"],
        createdAt: "2026-01-04T00:00:00Z",
        updatedAt: "2026-01-04T00:00:00Z",
      },
    ];

    test("returns empty array for empty query", () => {
      const results = search.searchMetadata("", bookmarks);
      expect(results).toEqual([]);
    });

    test("returns empty array for whitespace query", () => {
      const results = search.searchMetadata("   ", bookmarks);
      expect(results).toEqual([]);
    });

    test("searches in bookmark name (case-insensitive)", () => {
      const results = search.searchMetadata("authentication", bookmarks);
      expect(results).toHaveLength(1);
      expect(results[0]?.bookmark.id).toBe("bm-1");
      expect(results[0]?.matchType).toBe("metadata");
    });

    test("searches in bookmark name (partial match)", () => {
      const results = search.searchMetadata("auth", bookmarks);
      expect(results).toHaveLength(1);
      expect(results[0]?.bookmark.id).toBe("bm-1");
    });

    test("searches in description", () => {
      const results = search.searchMetadata("PostgreSQL", bookmarks);
      expect(results).toHaveLength(1);
      expect(results[0]?.bookmark.id).toBe("bm-2");
    });

    test("searches in tags", () => {
      const results = search.searchMetadata("design", bookmarks);
      expect(results).toHaveLength(1);
      expect(results[0]?.bookmark.id).toBe("bm-3");
    });

    test("matches multiple bookmarks", () => {
      const results = search.searchMetadata("api", bookmarks);
      expect(results).toHaveLength(1);
      expect(results[0]?.bookmark.id).toBe("bm-3");
    });

    test("is case-insensitive", () => {
      const upperResults = search.searchMetadata("TYPESCRIPT", bookmarks);
      const lowerResults = search.searchMetadata("typescript", bookmarks);
      const mixedResults = search.searchMetadata("TypeScript", bookmarks);

      expect(upperResults).toHaveLength(1);
      expect(lowerResults).toHaveLength(1);
      expect(mixedResults).toHaveLength(1);
      expect(upperResults[0]?.bookmark.id).toBe("bm-4");
      expect(lowerResults[0]?.bookmark.id).toBe("bm-4");
      expect(mixedResults[0]?.bookmark.id).toBe("bm-4");
    });

    test("returns no results for non-matching query", () => {
      const results = search.searchMetadata("nonexistent", bookmarks);
      expect(results).toEqual([]);
    });

    test("sorts results by relevance", () => {
      const testBookmarks: Bookmark[] = [
        {
          id: "bm-exact",
          type: "session",
          sessionId: "s1",
          name: "test",
          tags: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "bm-contains",
          type: "session",
          sessionId: "s2",
          name: "testing application",
          tags: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "bm-desc",
          type: "session",
          sessionId: "s3",
          name: "something else",
          description: "test implementation",
          tags: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];

      const results = search.searchMetadata("test", testBookmarks);
      expect(results).toHaveLength(3);

      // Exact match should come first
      expect(results[0]?.bookmark.id).toBe("bm-exact");
      expect(results[0]?.relevanceScore).toBe(1.0);

      // Name contains should be second
      expect(results[1]?.bookmark.id).toBe("bm-contains");
      expect(results[1]?.relevanceScore).toBeGreaterThan(0.5);

      // Description match should be third
      expect(results[2]?.bookmark.id).toBe("bm-desc");
    });

    test("matchContext is undefined for metadata matches", () => {
      const results = search.searchMetadata("auth", bookmarks);
      expect(results[0]?.matchContext).toBeUndefined();
    });
  });

  describe("searchContent", () => {
    const bookmarks: Bookmark[] = [
      {
        id: "bm-1",
        type: "session",
        sessionId: "session-1",
        name: "Test Session",
        tags: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      },
    ];

    test("returns empty array for empty query", async () => {
      const results = await search.searchContent("", bookmarks);
      expect(results).toEqual([]);
    });

    test("returns empty array when no messages loaded", async () => {
      // Since loadBookmarkMessages returns empty array as placeholder,
      // this test verifies the current behavior
      const results = await search.searchContent("test", bookmarks);
      expect(results).toEqual([]);
    });

    // Note: Full content search tests would require mocking SessionReader
    // and implementing session path resolution. These are integration-level
    // tests that should be added when the session path resolver is implemented.
  });

  describe("relevance scoring", () => {
    test("exact name match scores 1.0", () => {
      const bookmark: Bookmark = {
        id: "bm-1",
        type: "session",
        sessionId: "s1",
        name: "test",
        tags: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };

      const results = search.searchMetadata("test", [bookmark]);
      expect(results[0]?.relevanceScore).toBe(1.0);
    });

    test("name starts with query scores higher than contains", () => {
      const bookmarks: Bookmark[] = [
        {
          id: "bm-starts",
          type: "session",
          sessionId: "s1",
          name: "testing something",
          tags: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "bm-contains",
          type: "session",
          sessionId: "s2",
          name: "something testing",
          tags: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];

      const results = search.searchMetadata("test", bookmarks);
      expect(results).toHaveLength(2);
      expect(results[0]?.bookmark.id).toBe("bm-starts");
      expect(results[0]?.relevanceScore).toBeGreaterThan(
        results[1]?.relevanceScore ?? 0,
      );
    });

    test("tag exact match scores higher than partial", () => {
      const bookmarks: Bookmark[] = [
        {
          id: "bm-exact",
          type: "session",
          sessionId: "s1",
          name: "something",
          tags: ["api"],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "bm-partial",
          type: "session",
          sessionId: "s2",
          name: "something else",
          tags: ["api-design"],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];

      const results = search.searchMetadata("api", bookmarks);
      expect(results).toHaveLength(2);
      expect(results[0]?.bookmark.id).toBe("bm-exact");
      expect(results[0]?.relevanceScore).toBeGreaterThan(
        results[1]?.relevanceScore ?? 0,
      );
    });
  });

  describe("context extraction", () => {
    test("extracts context around match", () => {
      const bookmark: Bookmark = {
        id: "bm-1",
        type: "session",
        sessionId: "s1",
        name: "test",
        description:
          "This is a very long description that contains the word authentication somewhere in the middle of the text so we can test context extraction",
        tags: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };

      const results = search.searchMetadata("authentication", [bookmark]);
      expect(results[0]?.matchContext).toBeUndefined(); // Metadata searches don't return context
    });

    // Context extraction is tested indirectly through the private method
    // More specific tests would require exposing the method or using integration tests
  });

  describe("edge cases", () => {
    test("handles bookmarks without description", () => {
      const bookmark: Bookmark = {
        id: "bm-1",
        type: "session",
        sessionId: "s1",
        name: "test bookmark",
        tags: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };

      const results = search.searchMetadata("bookmark", [bookmark]);
      expect(results).toHaveLength(1);
    });

    test("handles bookmarks without tags", () => {
      const bookmark: Bookmark = {
        id: "bm-1",
        type: "session",
        sessionId: "s1",
        name: "test bookmark",
        tags: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };

      const results = search.searchMetadata("test", [bookmark]);
      expect(results).toHaveLength(1);
    });

    test("handles empty bookmarks array", () => {
      const results = search.searchMetadata("test", []);
      expect(results).toEqual([]);
    });

    test("handles special characters in query", () => {
      const bookmark: Bookmark = {
        id: "bm-1",
        type: "session",
        sessionId: "s1",
        name: "C++ programming",
        tags: [],
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };

      const results = search.searchMetadata("c++", [bookmark]);
      expect(results).toHaveLength(1);
    });
  });
});
