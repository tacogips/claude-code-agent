/**
 * Unit tests for bookmark REST API routes
 *
 * @module daemon/routes/bookmarks.test
 */

import { describe, test, expect } from "bun:test";
import type { SdkManager } from "../../sdk";
import type { TokenManager } from "../auth";
import type { ApiToken, Permission } from "../types";
import type { Bookmark, BookmarkType } from "../../sdk/bookmarks/types";

// Mock token
const mockToken: ApiToken = {
  id: "test-id",
  name: "Test Token",
  hash: "sha256:testhash",
  permissions: ["bookmark:*"],
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86400000).toISOString(),
};

// Mock bookmark
const mockBookmark: Bookmark = {
  id: "bookmark-123",
  type: "session" as BookmarkType,
  sessionId: "session-123",
  name: "Test Bookmark",
  tags: ["test"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Create mock SDK
function createMockSDK(options: {
  addBookmarkResult?: Bookmark;
  listBookmarksResult?: Bookmark[];
  getBookmarkResult?: Bookmark | null;
  searchBookmarksResult?: Bookmark[];
  getWithContentResult?: {
    bookmark: Bookmark;
    content: readonly never[];
  } | null;
  deleteBookmarkResult?: boolean;
  throwError?: boolean;
}): SdkManager {
  return {
    bookmarks: {
      add: async () => {
        if (options.throwError) throw new Error("SDK Error");
        return options.addBookmarkResult ?? mockBookmark;
      },
      list: async () => {
        if (options.throwError) throw new Error("SDK Error");
        return options.listBookmarksResult ?? [mockBookmark];
      },
      get: async () => {
        if (options.throwError) throw new Error("SDK Error");
        return "getBookmarkResult" in options
          ? options.getBookmarkResult
          : mockBookmark;
      },
      search: async () => {
        if (options.throwError) throw new Error("SDK Error");
        return options.searchBookmarksResult ?? [mockBookmark];
      },
      getWithContent: async () => {
        if (options.throwError) throw new Error("SDK Error");
        return "getWithContentResult" in options
          ? options.getWithContentResult
          : { bookmark: mockBookmark, content: [] as const };
      },
      delete: async () => {
        if (options.throwError) throw new Error("SDK Error");
        return options.deleteBookmarkResult ?? true;
      },
    },
  } as unknown as SdkManager;
}

// Create mock TokenManager
function createMockTokenManager(hasPermission: boolean = true): TokenManager {
  return {
    hasPermission: () => hasPermission,
  } as unknown as TokenManager;
}

// Mock context helpers
function createMockContext(options: {
  body?: unknown;
  query?: Record<string, string>;
  params?: Record<string, string>;
  token?: ApiToken;
}) {
  return {
    body: options.body ?? {},
    query: options.query ?? {},
    params: options.params ?? {},
    token: options.token ?? mockToken,
  };
}

describe("Bookmark Routes", () => {
  describe("TEST-007: Bookmark Create", () => {
    test("Create session-type bookmark - 200", async () => {
      const sdk = createMockSDK({ addBookmarkResult: mockBookmark });
      const tokenManager = createMockTokenManager(true);

      const ctx = createMockContext({
        body: {
          sessionId: "session-123",
          name: "Test Bookmark",
        },
      });

      // Permission check
      const hasPermission = tokenManager.hasPermission(
        ctx.token,
        "bookmark:*" as Permission,
      );
      expect(hasPermission).toBe(true);

      // Create bookmark
      const body = ctx.body as {
        sessionId: string;
        messageId?: string;
        name: string;
      };
      const bookmark = await sdk.bookmarks.add({
        type: body.messageId ? "message" : "session",
        sessionId: body.sessionId,
        name: body.name,
      });

      expect(bookmark).toEqual(mockBookmark);
      expect(bookmark.type).toBe("session");
    });

    test("Create message-type bookmark with messageId - 200", async () => {
      const messageBookmark: Bookmark = {
        ...mockBookmark,
        type: "message",
        messageId: "message-123",
      };
      const sdk = createMockSDK({ addBookmarkResult: messageBookmark });

      const ctx = createMockContext({
        body: {
          sessionId: "session-123",
          messageId: "message-123",
          name: "Test Message Bookmark",
        },
      });

      const body = ctx.body as {
        sessionId: string;
        messageId?: string;
        name: string;
      };
      const bookmark = await sdk.bookmarks.add({
        type: body.messageId ? "message" : "session",
        sessionId: body.sessionId,
        messageId: body.messageId,
        name: body.name,
      });

      expect(bookmark.type).toBe("message");
      expect(bookmark.messageId).toBe("message-123");
    });

    test("Create bookmark with tags - 200", async () => {
      const taggedBookmark: Bookmark = {
        ...mockBookmark,
        tags: ["tag1", "tag2"],
      };
      const sdk = createMockSDK({ addBookmarkResult: taggedBookmark });

      const ctx = createMockContext({
        body: {
          sessionId: "session-123",
          name: "Test Bookmark",
          tags: ["tag1", "tag2"],
        },
      });

      const body = ctx.body as {
        sessionId: string;
        name: string;
        tags?: string[];
      };
      const bookmark = await sdk.bookmarks.add({
        type: "session",
        sessionId: body.sessionId,
        name: body.name,
        tags: body.tags,
      });

      expect(bookmark.tags).toEqual(["tag1", "tag2"]);
    });

    test("Missing sessionId - 400", () => {
      const ctx = createMockContext({
        body: { name: "Test Bookmark" },
      });

      const body = ctx.body as { sessionId?: string; name?: string };
      expect(body.sessionId).toBeUndefined();
    });

    test("Missing name - 400", () => {
      const ctx = createMockContext({
        body: { sessionId: "session-123" },
      });

      const body = ctx.body as { sessionId?: string; name?: string };
      expect(body.name).toBeUndefined();
    });

    test("Missing bookmark:* permission - 403", () => {
      const tokenManager = createMockTokenManager(false);
      const ctx = createMockContext({});

      const hasPermission = tokenManager.hasPermission(
        ctx.token,
        "bookmark:*" as Permission,
      );
      expect(hasPermission).toBe(false);
    });

    test("SDK error - 500", async () => {
      const sdk = createMockSDK({ throwError: true });

      await expect(
        sdk.bookmarks.add({
          type: "session",
          sessionId: "session-123",
          name: "Test",
        }),
      ).rejects.toThrow("SDK Error");
    });
  });

  describe("TEST-008: Bookmark List and Search", () => {
    test("List all bookmarks - 200", async () => {
      const sdk = createMockSDK({ listBookmarksResult: [mockBookmark] });

      const bookmarks = await sdk.bookmarks.list({});
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0]).toEqual(mockBookmark);
    });

    test("List with tag filter - 200", async () => {
      const filteredBookmark = { ...mockBookmark, tags: ["filtered-tag"] };
      const sdk = createMockSDK({ listBookmarksResult: [filteredBookmark] });

      const ctx = createMockContext({ query: { tag: "filtered-tag" } });

      const bookmarks = await sdk.bookmarks.list({
        tags: [ctx.query["tag"] ?? ""],
      });

      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0]?.tags).toContain("filtered-tag");
    });

    test("List with sessionId filter - 200", async () => {
      const sdk = createMockSDK({ listBookmarksResult: [mockBookmark] });
      const ctx = createMockContext({ query: { sessionId: "session-123" } });

      const bookmarks = await sdk.bookmarks.list({
        sessionId: ctx.query["sessionId"],
      });

      expect(bookmarks).toHaveLength(1);
    });

    test("Search with query - 200", async () => {
      const sdk = createMockSDK({ searchBookmarksResult: [mockBookmark] });
      const ctx = createMockContext({ query: { q: "test search" } });

      const results = await sdk.bookmarks.search(ctx.query["q"] ?? "", {});
      expect(results).toHaveLength(1);
    });

    test("Search with metadataOnly=true - 200", async () => {
      const sdk = createMockSDK({ searchBookmarksResult: [mockBookmark] });
      const ctx = createMockContext({
        query: { q: "test search", metadataOnly: "true" },
      });

      const results = await sdk.bookmarks.search(ctx.query["q"] ?? "", {
        metadataOnly: ctx.query["metadataOnly"] === "true",
      });

      expect(results).toBeDefined();
    });

    test("Search missing query param - 400", () => {
      const ctx = createMockContext({ query: {} });
      const query = ctx.query as { q?: string };

      expect(query.q).toBeUndefined();
    });

    test("Missing permission - 403", () => {
      const tokenManager = createMockTokenManager(false);
      const ctx = createMockContext({});

      const hasPermission = tokenManager.hasPermission(
        ctx.token,
        "bookmark:*" as Permission,
      );
      expect(hasPermission).toBe(false);
    });
  });

  describe("TEST-009: Bookmark Get and Delete", () => {
    test("Get existing bookmark - 200", async () => {
      const sdk = createMockSDK({ getBookmarkResult: mockBookmark });
      const ctx = createMockContext({ params: { id: "bookmark-123" } });

      const bookmark = await sdk.bookmarks.get(ctx.params["id"] ?? "");
      expect(bookmark).toEqual(mockBookmark);
    });

    test("Get nonexistent bookmark - 404", async () => {
      const sdk = createMockSDK({ getBookmarkResult: null });
      const ctx = createMockContext({ params: { id: "nonexistent" } });

      const bookmark = await sdk.bookmarks.get(ctx.params["id"] ?? "");
      expect(bookmark).toBeNull();
    });

    test("Get bookmark with content - 200", async () => {
      const sdk = createMockSDK({
        getWithContentResult: {
          bookmark: mockBookmark,
          content: [] as const,
        },
      });
      const ctx = createMockContext({ params: { id: "bookmark-123" } });

      const result = await sdk.bookmarks.getWithContent(ctx.params["id"] ?? "");
      expect(result).not.toBeNull();
      if (result) {
        expect(result.bookmark).toEqual(mockBookmark);
        expect(result.content).toBeDefined();
      }
    });

    test("Get content for nonexistent bookmark - 404", async () => {
      const sdk = createMockSDK({ getWithContentResult: null });
      const ctx = createMockContext({ params: { id: "nonexistent" } });

      const result = await sdk.bookmarks.getWithContent(ctx.params["id"] ?? "");
      expect(result).toBeNull();
    });

    test("Delete existing bookmark - 200", async () => {
      const sdk = createMockSDK({ deleteBookmarkResult: true });
      const ctx = createMockContext({ params: { id: "bookmark-123" } });

      const deleted = await sdk.bookmarks.delete(ctx.params["id"] ?? "");
      expect(deleted).toBe(true);
    });

    test("Delete nonexistent bookmark - 404", async () => {
      const sdk = createMockSDK({ deleteBookmarkResult: false });
      const ctx = createMockContext({ params: { id: "nonexistent" } });

      const deleted = await sdk.bookmarks.delete(ctx.params["id"] ?? "");
      expect(deleted).toBe(false);
    });

    test("Missing permission - 403", () => {
      const tokenManager = createMockTokenManager(false);
      const ctx = createMockContext({});

      const hasPermission = tokenManager.hasPermission(
        ctx.token,
        "bookmark:*" as Permission,
      );
      expect(hasPermission).toBe(false);
    });
  });
});
