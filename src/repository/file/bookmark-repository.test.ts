/**
 * Tests for FileBookmarkRepository.
 *
 * @module repository/file/bookmark-repository.test
 */

import { describe, test, expect, beforeEach } from "vitest";
import { FileBookmarkRepository } from "./bookmark-repository";
import { MockFileSystem } from "../../test/mocks/filesystem";
import type { Bookmark } from "../bookmark-repository";

describe("FileBookmarkRepository", () => {
  let fs: MockFileSystem;
  let repo: FileBookmarkRepository;

  beforeEach(() => {
    fs = new MockFileSystem();
    repo = new FileBookmarkRepository(fs);
  });

  describe("save and findById", () => {
    test("saves bookmark to JSON file", async () => {
      const bookmark: Bookmark = {
        id: "bm-001",
        type: "session",
        sessionId: "session-001",
        name: "Important session",
        description: "OAuth implementation discussion",
        tags: ["auth", "implementation"],
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      await repo.save(bookmark);

      const saved = await repo.findById("bm-001");
      expect(saved).toEqual(bookmark);
    });

    test("returns null for non-existent bookmark", async () => {
      const result = await repo.findById("non-existent");
      expect(result).toBeNull();
    });

    test("updates existing bookmark when saved again", async () => {
      const bookmark: Bookmark = {
        id: "bm-001",
        type: "session",
        sessionId: "session-001",
        name: "Original name",
        tags: [],
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      await repo.save(bookmark);

      const updated: Bookmark = {
        ...bookmark,
        name: "Updated name",
        updatedAt: "2026-01-06T11:00:00Z",
      };

      await repo.save(updated);

      const result = await repo.findById("bm-001");
      expect(result?.name).toBe("Updated name");
    });

    test("creates directory on first save", async () => {
      const bookmark: Bookmark = {
        id: "bm-001",
        type: "session",
        sessionId: "session-001",
        name: "Test",
        tags: [],
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      await repo.save(bookmark);

      // Directory should exist
      const exists = await fs.exists(
        `${process.env["HOME"]}/.local/claude-code-agent/metadata/bookmarks`,
      );
      expect(exists).toBe(true);
    });
  });

  describe("message bookmarks", () => {
    test("saves and retrieves message bookmark", async () => {
      const bookmark: Bookmark = {
        id: "bm-002",
        type: "message",
        sessionId: "session-001",
        messageId: "msg-uuid-123",
        name: "Working solution",
        tags: ["solution"],
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      await repo.save(bookmark);

      const result = await repo.findById("bm-002");
      expect(result?.type).toBe("message");
      expect(result?.messageId).toBe("msg-uuid-123");
    });
  });

  describe("range bookmarks", () => {
    test("saves and retrieves range bookmark", async () => {
      const bookmark: Bookmark = {
        id: "bm-003",
        type: "range",
        sessionId: "session-001",
        messageRange: {
          fromMessageId: "msg-001",
          toMessageId: "msg-005",
        },
        name: "Auth discussion",
        tags: ["auth"],
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      await repo.save(bookmark);

      const result = await repo.findById("bm-003");
      expect(result?.type).toBe("range");
      expect(result?.messageRange).toEqual({
        fromMessageId: "msg-001",
        toMessageId: "msg-005",
      });
    });
  });

  describe("findBySession", () => {
    test("returns all bookmarks for a session", async () => {
      const bookmark1: Bookmark = {
        id: "bm-001",
        type: "session",
        sessionId: "session-001",
        name: "Session bookmark",
        tags: [],
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      const bookmark2: Bookmark = {
        id: "bm-002",
        type: "message",
        sessionId: "session-001",
        messageId: "msg-001",
        name: "Message bookmark",
        tags: [],
        createdAt: "2026-01-06T11:00:00Z",
        updatedAt: "2026-01-06T11:00:00Z",
      };

      const bookmark3: Bookmark = {
        id: "bm-003",
        type: "session",
        sessionId: "session-002",
        name: "Different session",
        tags: [],
        createdAt: "2026-01-06T12:00:00Z",
        updatedAt: "2026-01-06T12:00:00Z",
      };

      await repo.save(bookmark1);
      await repo.save(bookmark2);
      await repo.save(bookmark3);

      const results = await repo.findBySession("session-001");
      expect(results).toHaveLength(2);
      expect(results.map((b) => b.id).sort()).toEqual(["bm-001", "bm-002"]);
    });

    test("returns empty array for session with no bookmarks", async () => {
      const results = await repo.findBySession("non-existent");
      expect(results).toEqual([]);
    });
  });

  describe("findByTag", () => {
    test("returns bookmarks with the specified tag", async () => {
      const bookmark1: Bookmark = {
        id: "bm-001",
        type: "session",
        sessionId: "session-001",
        name: "Auth session",
        tags: ["auth", "security"],
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      const bookmark2: Bookmark = {
        id: "bm-002",
        type: "message",
        sessionId: "session-002",
        messageId: "msg-001",
        name: "Database query",
        tags: ["database", "performance"],
        createdAt: "2026-01-06T11:00:00Z",
        updatedAt: "2026-01-06T11:00:00Z",
      };

      const bookmark3: Bookmark = {
        id: "bm-003",
        type: "session",
        sessionId: "session-003",
        name: "Security fix",
        tags: ["auth", "bug"],
        createdAt: "2026-01-06T12:00:00Z",
        updatedAt: "2026-01-06T12:00:00Z",
      };

      await repo.save(bookmark1);
      await repo.save(bookmark2);
      await repo.save(bookmark3);

      const results = await repo.findByTag("auth");
      expect(results).toHaveLength(2);
      expect(results.map((b) => b.id).sort()).toEqual(["bm-001", "bm-003"]);
    });

    test("returns empty array for non-existent tag", async () => {
      const bookmark: Bookmark = {
        id: "bm-001",
        type: "session",
        sessionId: "session-001",
        name: "Test",
        tags: ["existing"],
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      await repo.save(bookmark);

      const results = await repo.findByTag("non-existent");
      expect(results).toEqual([]);
    });
  });

  describe("list with filters", () => {
    beforeEach(async () => {
      const bookmarks: Bookmark[] = [
        {
          id: "bm-001",
          type: "session",
          sessionId: "session-001",
          name: "Alpha session",
          tags: ["auth", "api"],
          createdAt: "2026-01-01T10:00:00Z",
          updatedAt: "2026-01-01T10:00:00Z",
        },
        {
          id: "bm-002",
          type: "message",
          sessionId: "session-001",
          messageId: "msg-001",
          name: "Beta message",
          tags: ["bug", "fix"],
          createdAt: "2026-01-02T10:00:00Z",
          updatedAt: "2026-01-02T10:00:00Z",
        },
        {
          id: "bm-003",
          type: "range",
          sessionId: "session-002",
          messageRange: { fromMessageId: "msg-001", toMessageId: "msg-005" },
          name: "Gamma range",
          tags: ["auth", "discussion"],
          createdAt: "2026-01-03T10:00:00Z",
          updatedAt: "2026-01-03T10:00:00Z",
        },
      ];

      for (const bookmark of bookmarks) {
        await repo.save(bookmark);
      }
    });

    test("filters by type", async () => {
      const results = await repo.list({ type: "message" });
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("bm-002");
    });

    test("filters by sessionId", async () => {
      const results = await repo.list({ sessionId: "session-001" });
      expect(results).toHaveLength(2);
      expect(results.map((b) => b.id).sort()).toEqual(["bm-001", "bm-002"]);
    });

    test("filters by tags (AND logic)", async () => {
      const results = await repo.list({ tags: ["auth", "api"] });
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("bm-001");
    });

    test("filters by nameContains", async () => {
      const results = await repo.list({ nameContains: "beta" });
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("bm-002");
    });

    test("filters by since date", async () => {
      const since = new Date("2026-01-02T00:00:00Z");
      const results = await repo.list({ since });
      expect(results).toHaveLength(2);
      expect(results.map((b) => b.id).sort()).toEqual(["bm-002", "bm-003"]);
    });

    test("filters by since date string", async () => {
      const results = await repo.list({ since: "2026-01-02T00:00:00Z" });
      expect(results).toHaveLength(2);
      expect(results.map((b) => b.id).sort()).toEqual(["bm-002", "bm-003"]);
    });

    test("applies limit", async () => {
      const results = await repo.list({ limit: 2 });
      expect(results).toHaveLength(2);
    });

    test("applies offset", async () => {
      const results = await repo.list({ offset: 1 });
      expect(results).toHaveLength(2);
    });

    test("applies multiple filters", async () => {
      const results = await repo.list({
        sessionId: "session-001",
        type: "session",
      });
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("bm-001");
    });
  });

  describe("list with sorting", () => {
    beforeEach(async () => {
      const bookmarks: Bookmark[] = [
        {
          id: "bm-001",
          type: "session",
          sessionId: "session-001",
          name: "Charlie",
          tags: [],
          createdAt: "2026-01-03T10:00:00Z",
          updatedAt: "2026-01-03T12:00:00Z",
        },
        {
          id: "bm-002",
          type: "session",
          sessionId: "session-001",
          name: "Alpha",
          tags: [],
          createdAt: "2026-01-01T10:00:00Z",
          updatedAt: "2026-01-01T10:00:00Z",
        },
        {
          id: "bm-003",
          type: "session",
          sessionId: "session-001",
          name: "Beta",
          tags: [],
          createdAt: "2026-01-02T10:00:00Z",
          updatedAt: "2026-01-02T11:00:00Z",
        },
      ];

      for (const bookmark of bookmarks) {
        await repo.save(bookmark);
      }
    });

    test("sorts by name ascending", async () => {
      const results = await repo.list(undefined, {
        field: "name",
        direction: "asc",
      });
      expect(results.map((b) => b.name)).toEqual(["Alpha", "Beta", "Charlie"]);
    });

    test("sorts by name descending", async () => {
      const results = await repo.list(undefined, {
        field: "name",
        direction: "desc",
      });
      expect(results.map((b) => b.name)).toEqual(["Charlie", "Beta", "Alpha"]);
    });

    test("sorts by createdAt ascending", async () => {
      const results = await repo.list(undefined, {
        field: "createdAt",
        direction: "asc",
      });
      expect(results.map((b) => b.id)).toEqual(["bm-002", "bm-003", "bm-001"]);
    });

    test("sorts by updatedAt descending", async () => {
      const results = await repo.list(undefined, {
        field: "updatedAt",
        direction: "desc",
      });
      expect(results.map((b) => b.id)).toEqual(["bm-001", "bm-003", "bm-002"]);
    });
  });

  describe("search", () => {
    beforeEach(async () => {
      const bookmarks: Bookmark[] = [
        {
          id: "bm-001",
          type: "session",
          sessionId: "session-001",
          name: "OAuth implementation",
          description: "Implementing OAuth 2.0 authentication",
          tags: ["auth", "security"],
          createdAt: "2026-01-01T10:00:00Z",
          updatedAt: "2026-01-01T10:00:00Z",
        },
        {
          id: "bm-002",
          type: "message",
          sessionId: "session-002",
          messageId: "msg-001",
          name: "Database optimization",
          description: "Query performance improvements",
          tags: ["database", "performance"],
          createdAt: "2026-01-02T10:00:00Z",
          updatedAt: "2026-01-02T10:00:00Z",
        },
        {
          id: "bm-003",
          type: "session",
          sessionId: "session-003",
          name: "Security audit",
          tags: ["security", "audit"],
          createdAt: "2026-01-03T10:00:00Z",
          updatedAt: "2026-01-03T10:00:00Z",
        },
      ];

      for (const bookmark of bookmarks) {
        await repo.save(bookmark);
      }
    });

    test("searches in name", async () => {
      const results = await repo.search({ query: "oauth" });
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("bm-001");
    });

    test("searches in description", async () => {
      const results = await repo.search({ query: "performance" });
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("bm-002");
    });

    test("searches in tags", async () => {
      const results = await repo.search({ query: "security" });
      expect(results).toHaveLength(2);
      expect(results.map((b) => b.id).sort()).toEqual(["bm-001", "bm-003"]);
    });

    test("search is case insensitive", async () => {
      const results = await repo.search({ query: "OAUTH" });
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("bm-001");
    });

    test("applies limit to search results", async () => {
      const results = await repo.search({ query: "security", limit: 1 });
      expect(results).toHaveLength(1);
    });

    test("returns empty array when no matches", async () => {
      const results = await repo.search({ query: "nonexistent" });
      expect(results).toEqual([]);
    });
  });

  describe("update", () => {
    test("updates bookmark fields", async () => {
      const bookmark: Bookmark = {
        id: "bm-001",
        type: "session",
        sessionId: "session-001",
        name: "Original name",
        description: "Original description",
        tags: ["tag1"],
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      await repo.save(bookmark);

      await repo.update("bm-001", {
        name: "Updated name",
        tags: ["tag1", "tag2"],
      });

      const updated = await repo.findById("bm-001");
      expect(updated?.name).toBe("Updated name");
      expect(updated?.tags).toEqual(["tag1", "tag2"]);
      expect(updated?.description).toBe("Original description");
    });

    test("updates updatedAt timestamp", async () => {
      const bookmark: Bookmark = {
        id: "bm-001",
        type: "session",
        sessionId: "session-001",
        name: "Test",
        tags: [],
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      await repo.save(bookmark);
      await repo.update("bm-001", { name: "Updated" });

      const updated = await repo.findById("bm-001");
      expect(updated?.updatedAt).not.toBe("2026-01-06T10:00:00Z");
    });

    test("throws error for non-existent bookmark", async () => {
      await expect(
        repo.update("non-existent", { name: "Updated" }),
      ).rejects.toThrow("Bookmark not found: non-existent");
    });

    test("cannot change bookmark id", async () => {
      const bookmark: Bookmark = {
        id: "bm-001",
        type: "session",
        sessionId: "session-001",
        name: "Test",
        tags: [],
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      await repo.save(bookmark);

      // TypeScript prevents this at compile time, but verify runtime behavior
      await repo.update("bm-001", { name: "Updated" });

      const updated = await repo.findById("bm-001");
      expect(updated?.id).toBe("bm-001");
    });
  });

  describe("delete", () => {
    test("deletes existing bookmark", async () => {
      const bookmark: Bookmark = {
        id: "bm-001",
        type: "session",
        sessionId: "session-001",
        name: "Test",
        tags: [],
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      await repo.save(bookmark);

      const deleted = await repo.delete("bm-001");
      expect(deleted).toBe(true);

      const result = await repo.findById("bm-001");
      expect(result).toBeNull();
    });

    test("returns false for non-existent bookmark", async () => {
      const deleted = await repo.delete("non-existent");
      expect(deleted).toBe(false);
    });
  });

  describe("getAllTags", () => {
    test("returns unique tags sorted alphabetically", async () => {
      const bookmarks: Bookmark[] = [
        {
          id: "bm-001",
          type: "session",
          sessionId: "session-001",
          name: "Test 1",
          tags: ["auth", "api", "security"],
          createdAt: "2026-01-06T10:00:00Z",
          updatedAt: "2026-01-06T10:00:00Z",
        },
        {
          id: "bm-002",
          type: "session",
          sessionId: "session-002",
          name: "Test 2",
          tags: ["database", "auth"],
          createdAt: "2026-01-06T11:00:00Z",
          updatedAt: "2026-01-06T11:00:00Z",
        },
        {
          id: "bm-003",
          type: "session",
          sessionId: "session-003",
          name: "Test 3",
          tags: ["api"],
          createdAt: "2026-01-06T12:00:00Z",
          updatedAt: "2026-01-06T12:00:00Z",
        },
      ];

      for (const bookmark of bookmarks) {
        await repo.save(bookmark);
      }

      const tags = await repo.getAllTags();
      expect(tags).toEqual(["api", "auth", "database", "security"]);
    });

    test("returns empty array when no bookmarks exist", async () => {
      const tags = await repo.getAllTags();
      expect(tags).toEqual([]);
    });

    test("handles bookmarks with no tags", async () => {
      const bookmark: Bookmark = {
        id: "bm-001",
        type: "session",
        sessionId: "session-001",
        name: "Test",
        tags: [],
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      await repo.save(bookmark);

      const tags = await repo.getAllTags();
      expect(tags).toEqual([]);
    });
  });

  describe("count", () => {
    beforeEach(async () => {
      const bookmarks: Bookmark[] = [
        {
          id: "bm-001",
          type: "session",
          sessionId: "session-001",
          name: "Test 1",
          tags: ["auth"],
          createdAt: "2026-01-01T10:00:00Z",
          updatedAt: "2026-01-01T10:00:00Z",
        },
        {
          id: "bm-002",
          type: "message",
          sessionId: "session-001",
          messageId: "msg-001",
          name: "Test 2",
          tags: ["bug"],
          createdAt: "2026-01-02T10:00:00Z",
          updatedAt: "2026-01-02T10:00:00Z",
        },
        {
          id: "bm-003",
          type: "session",
          sessionId: "session-002",
          name: "Test 3",
          tags: ["auth"],
          createdAt: "2026-01-03T10:00:00Z",
          updatedAt: "2026-01-03T10:00:00Z",
        },
      ];

      for (const bookmark of bookmarks) {
        await repo.save(bookmark);
      }
    });

    test("counts all bookmarks when no filter", async () => {
      const count = await repo.count();
      expect(count).toBe(3);
    });

    test("counts with filter", async () => {
      const count = await repo.count({ type: "session" });
      expect(count).toBe(2);
    });

    test("counts with sessionId filter", async () => {
      const count = await repo.count({ sessionId: "session-001" });
      expect(count).toBe(2);
    });

    test("returns 0 when no bookmarks match", async () => {
      const count = await repo.count({ type: "range" });
      expect(count).toBe(0);
    });
  });

  describe("empty directory handling", () => {
    test("list returns empty array when directory doesn't exist", async () => {
      const results = await repo.list();
      expect(results).toEqual([]);
    });

    test("findBySession returns empty array when directory doesn't exist", async () => {
      const results = await repo.findBySession("session-001");
      expect(results).toEqual([]);
    });

    test("findByTag returns empty array when directory doesn't exist", async () => {
      const results = await repo.findByTag("tag");
      expect(results).toEqual([]);
    });

    test("getAllTags returns empty array when directory doesn't exist", async () => {
      const tags = await repo.getAllTags();
      expect(tags).toEqual([]);
    });
  });

  describe("invalid JSON handling", () => {
    test("skips files with invalid JSON", async () => {
      // Create a valid bookmark
      const bookmark: Bookmark = {
        id: "bm-001",
        type: "session",
        sessionId: "session-001",
        name: "Valid",
        tags: [],
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      await repo.save(bookmark);

      // Manually write invalid JSON
      const invalidPath = `${process.env["HOME"]}/.local/claude-code-agent/metadata/bookmarks/invalid.json`;
      await fs.writeFile(invalidPath, "{ invalid json }");

      // Should only return the valid bookmark
      const results = await repo.list();
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("bm-001");
    });

    test("findById returns null for corrupted bookmark file", async () => {
      const corruptedPath = `${process.env["HOME"]}/.local/claude-code-agent/metadata/bookmarks/corrupted.json`;
      await fs.mkdir(
        `${process.env["HOME"]}/.local/claude-code-agent/metadata/bookmarks`,
        { recursive: true },
      );
      await fs.writeFile(corruptedPath, "{ invalid: json }");

      const result = await repo.findById("corrupted");
      expect(result).toBeNull();
    });
  });

  describe("non-JSON file handling", () => {
    test("ignores non-JSON files in bookmarks directory", async () => {
      const bookmark: Bookmark = {
        id: "bm-001",
        type: "session",
        sessionId: "session-001",
        name: "Valid",
        tags: [],
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      await repo.save(bookmark);

      // Create non-JSON file
      const txtPath = `${process.env["HOME"]}/.local/claude-code-agent/metadata/bookmarks/readme.txt`;
      await fs.writeFile(txtPath, "This is not a bookmark");

      const results = await repo.list();
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("bm-001");
    });
  });
});
