/**
 * Tests for BookmarkManager.
 *
 * @module sdk/bookmarks/manager.test
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { BookmarkManager } from "./manager";
import type { Container } from "../../container";
import { createTestContainer } from "../../container";
import type { Bookmark, CreateBookmarkOptions } from "./types";
import { InMemoryBookmarkRepository } from "../../repository/in-memory/bookmark-repository";

describe("BookmarkManager", () => {
  let manager: BookmarkManager;
  let repository: InMemoryBookmarkRepository;
  let container: Container;

  beforeEach(() => {
    repository = new InMemoryBookmarkRepository();
    container = createTestContainer({
      bookmarkRepository: repository,
    });
    manager = new BookmarkManager(container, repository);
  });

  describe("add", () => {
    test("creates a session bookmark", async () => {
      const options: CreateBookmarkOptions = {
        type: "session",
        sessionId: "session-001",
        name: "Important session",
        description: "Debugging session",
        tags: ["debug", "important"],
      };

      const bookmark = await manager.add(options);

      expect(bookmark.id).toBeString();
      expect(bookmark.type).toBe("session");
      expect(bookmark.sessionId).toBe("session-001");
      expect(bookmark.messageId).toBeUndefined();
      expect(bookmark.messageRange).toBeUndefined();
      expect(bookmark.name).toBe("Important session");
      expect(bookmark.description).toBe("Debugging session");
      expect(bookmark.tags).toEqual(["debug", "important"]);
      expect(bookmark.createdAt).toBeString();
      expect(bookmark.updatedAt).toBeString();
    });

    test("creates a message bookmark", async () => {
      const options: CreateBookmarkOptions = {
        type: "message",
        sessionId: "session-001",
        messageId: "msg-123",
        name: "Solution message",
        tags: ["solution"],
      };

      const bookmark = await manager.add(options);

      expect(bookmark.type).toBe("message");
      expect(bookmark.sessionId).toBe("session-001");
      expect(bookmark.messageId).toBe("msg-123");
      expect(bookmark.messageRange).toBeUndefined();
      expect(bookmark.name).toBe("Solution message");
    });

    test("creates a range bookmark", async () => {
      const options: CreateBookmarkOptions = {
        type: "range",
        sessionId: "session-001",
        fromMessageId: "msg-001",
        toMessageId: "msg-010",
        name: "Discussion range",
        description: "OAuth implementation discussion",
      };

      const bookmark = await manager.add(options);

      expect(bookmark.type).toBe("range");
      expect(bookmark.sessionId).toBe("session-001");
      expect(bookmark.messageId).toBeUndefined();
      expect(bookmark.messageRange).toEqual({
        fromMessageId: "msg-001",
        toMessageId: "msg-010",
      });
      expect(bookmark.name).toBe("Discussion range");
    });

    test("creates bookmark with default empty tags", async () => {
      const options: CreateBookmarkOptions = {
        type: "session",
        sessionId: "session-001",
        name: "Session",
      };

      const bookmark = await manager.add(options);

      expect(bookmark.tags).toEqual([]);
    });

    test("throws error for session bookmark with messageId", async () => {
      const options: CreateBookmarkOptions = {
        type: "session",
        sessionId: "session-001",
        messageId: "msg-123", // Invalid for session type
        name: "Session",
      };

      await expect(manager.add(options)).rejects.toThrow(
        "Session bookmarks cannot have messageId",
      );
    });

    test("throws error for session bookmark with message range", async () => {
      const options: CreateBookmarkOptions = {
        type: "session",
        sessionId: "session-001",
        fromMessageId: "msg-001", // Invalid for session type
        toMessageId: "msg-010",
        name: "Session",
      };

      await expect(manager.add(options)).rejects.toThrow(
        "Session bookmarks cannot have message range",
      );
    });

    test("throws error for message bookmark without messageId", async () => {
      const options: CreateBookmarkOptions = {
        type: "message",
        sessionId: "session-001",
        name: "Message",
      };

      await expect(manager.add(options)).rejects.toThrow(
        "Message bookmarks require messageId",
      );
    });

    test("throws error for message bookmark with range fields", async () => {
      const options: CreateBookmarkOptions = {
        type: "message",
        sessionId: "session-001",
        messageId: "msg-123",
        fromMessageId: "msg-001", // Invalid for message type
        toMessageId: "msg-010",
        name: "Message",
      };

      await expect(manager.add(options)).rejects.toThrow(
        "Message bookmarks cannot have message range",
      );
    });

    test("throws error for range bookmark without fromMessageId", async () => {
      const options: CreateBookmarkOptions = {
        type: "range",
        sessionId: "session-001",
        toMessageId: "msg-010",
        name: "Range",
      };

      await expect(manager.add(options)).rejects.toThrow(
        "Range bookmarks require both fromMessageId and toMessageId",
      );
    });

    test("throws error for range bookmark without toMessageId", async () => {
      const options: CreateBookmarkOptions = {
        type: "range",
        sessionId: "session-001",
        fromMessageId: "msg-001",
        name: "Range",
      };

      await expect(manager.add(options)).rejects.toThrow(
        "Range bookmarks require both fromMessageId and toMessageId",
      );
    });

    test("throws error for range bookmark with messageId", async () => {
      const options: CreateBookmarkOptions = {
        type: "range",
        sessionId: "session-001",
        messageId: "msg-123", // Invalid for range type
        fromMessageId: "msg-001",
        toMessageId: "msg-010",
        name: "Range",
      };

      await expect(manager.add(options)).rejects.toThrow(
        "Range bookmarks cannot have messageId",
      );
    });

    test("throws error for empty bookmark name", async () => {
      const options: CreateBookmarkOptions = {
        type: "session",
        sessionId: "session-001",
        name: "   ", // Empty after trim
      };

      await expect(manager.add(options)).rejects.toThrow(
        "Bookmark name cannot be empty",
      );
    });
  });

  describe("get", () => {
    test("retrieves existing bookmark", async () => {
      const created = await manager.add({
        type: "session",
        sessionId: "session-001",
        name: "Test",
      });

      const retrieved = await manager.get(created.id);

      expect(retrieved).toEqual(created);
    });

    test("returns null for non-existent bookmark", async () => {
      const result = await manager.get("non-existent-id");

      expect(result).toBeNull();
    });
  });

  describe("getWithContent", () => {
    test("retrieves bookmark with content", async () => {
      const created = await manager.add({
        type: "session",
        sessionId: "session-001",
        name: "Test",
      });

      const result = await manager.getWithContent(created.id);

      expect(result).not.toBeNull();
      expect(result?.bookmark).toEqual(created);
      expect(result?.content).toBeArray();
      // Note: content is empty in placeholder implementation
      expect(result?.content).toEqual([]);
    });

    test("returns null for non-existent bookmark", async () => {
      const result = await manager.getWithContent("non-existent-id");

      expect(result).toBeNull();
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await manager.add({
        type: "session",
        sessionId: "session-001",
        name: "Session 1",
        tags: ["debug"],
      });
      await manager.add({
        type: "message",
        sessionId: "session-002",
        messageId: "msg-123",
        name: "Message 1",
        tags: ["solution"],
      });
      await manager.add({
        type: "range",
        sessionId: "session-001",
        fromMessageId: "msg-001",
        toMessageId: "msg-010",
        name: "Range 1",
        tags: ["debug", "oauth"],
      });
    });

    test("lists all bookmarks", async () => {
      const bookmarks = await manager.list();

      expect(bookmarks).toHaveLength(3);
    });

    test("filters by type", async () => {
      const bookmarks = await manager.list({ type: "session" });

      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0]?.type).toBe("session");
    });

    test("filters by sessionId", async () => {
      const bookmarks = await manager.list({ sessionId: "session-001" });

      expect(bookmarks).toHaveLength(2);
      expect(bookmarks.every((b) => b.sessionId === "session-001")).toBe(true);
    });

    test("filters by tags", async () => {
      const bookmarks = await manager.list({ tags: ["debug"] });

      expect(bookmarks).toHaveLength(2);
      expect(bookmarks.every((b) => b.tags.includes("debug"))).toBe(true);
    });

    test("applies limit", async () => {
      const bookmarks = await manager.list({ limit: 2 });

      expect(bookmarks).toHaveLength(2);
    });
  });

  describe("update", () => {
    let bookmark: Bookmark;

    beforeEach(async () => {
      bookmark = await manager.add({
        type: "session",
        sessionId: "session-001",
        name: "Original name",
        description: "Original description",
        tags: ["tag1"],
      });
    });

    test("updates bookmark name", async () => {
      const updated = await manager.update(bookmark.id, {
        name: "Updated name",
      });

      expect(updated.name).toBe("Updated name");
      expect(updated.description).toBe("Original description");
      expect(updated.tags).toEqual(["tag1"]);
    });

    test("updates bookmark description", async () => {
      const updated = await manager.update(bookmark.id, {
        description: "Updated description",
      });

      expect(updated.name).toBe("Original name");
      expect(updated.description).toBe("Updated description");
    });

    test("updates bookmark tags", async () => {
      const updated = await manager.update(bookmark.id, {
        tags: ["tag2", "tag3"],
      });

      expect(updated.tags).toEqual(["tag2", "tag3"]);
    });

    test("updates multiple fields", async () => {
      const updated = await manager.update(bookmark.id, {
        name: "New name",
        description: "New description",
        tags: ["new-tag"],
      });

      expect(updated.name).toBe("New name");
      expect(updated.description).toBe("New description");
      expect(updated.tags).toEqual(["new-tag"]);
    });

    test("updates updatedAt timestamp", async () => {
      const originalUpdatedAt = bookmark.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await manager.update(bookmark.id, {
        name: "Updated",
      });

      expect(updated.updatedAt).not.toBe(originalUpdatedAt);
    });

    test("preserves immutable fields", async () => {
      const updated = await manager.update(bookmark.id, {
        name: "Updated name",
      });

      expect(updated.id).toBe(bookmark.id);
      expect(updated.type).toBe(bookmark.type);
      expect(updated.sessionId).toBe(bookmark.sessionId);
      expect(updated.createdAt).toBe(bookmark.createdAt);
    });

    test("throws error for non-existent bookmark", async () => {
      await expect(
        manager.update("non-existent-id", { name: "Updated" }),
      ).rejects.toThrow("Bookmark not found");
    });
  });

  describe("delete", () => {
    test("deletes existing bookmark", async () => {
      const bookmark = await manager.add({
        type: "session",
        sessionId: "session-001",
        name: "Test",
      });

      const deleted = await manager.delete(bookmark.id);

      expect(deleted).toBe(true);

      const retrieved = await manager.get(bookmark.id);
      expect(retrieved).toBeNull();
    });

    test("returns false for non-existent bookmark", async () => {
      const deleted = await manager.delete("non-existent-id");

      expect(deleted).toBe(false);
    });
  });

  describe("search", () => {
    beforeEach(async () => {
      await manager.add({
        type: "session",
        sessionId: "session-001",
        name: "OAuth implementation",
        description: "Session about OAuth 2.0",
        tags: ["oauth", "auth"],
      });
      await manager.add({
        type: "message",
        sessionId: "session-002",
        messageId: "msg-123",
        name: "TypeScript solution",
        description: "Solution for TypeScript generics",
        tags: ["typescript", "solution"],
      });
      await manager.add({
        type: "session",
        sessionId: "session-003",
        name: "Database migration",
        description: "PostgreSQL migration guide",
        tags: ["database", "postgres"],
      });
    });

    test("searches by name", async () => {
      const results = await manager.search("OAuth", { metadataOnly: true });

      expect(results).toHaveLength(1);
      expect(results[0]?.bookmark.name).toBe("OAuth implementation");
      expect(results[0]?.matchType).toBe("metadata");
    });

    test("searches by description", async () => {
      const results = await manager.search("TypeScript", {
        metadataOnly: true,
      });

      expect(results).toHaveLength(1);
      expect(results[0]?.bookmark.name).toBe("TypeScript solution");
    });

    test("searches by tags", async () => {
      const results = await manager.search("postgres", { metadataOnly: true });

      expect(results).toHaveLength(1);
      expect(results[0]?.bookmark.name).toBe("Database migration");
    });

    test("returns results sorted by relevance", async () => {
      const results = await manager.search("solution", { metadataOnly: true });

      // "TypeScript solution" should rank higher (name match)
      expect(results[0]?.bookmark.name).toBe("TypeScript solution");
    });

    test("applies limit option", async () => {
      const results = await manager.search("", {
        metadataOnly: true,
        limit: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    test("searches both metadata and content when metadataOnly is false", async () => {
      const results = await manager.search("OAuth");

      // Results should include metadata matches
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    test("case-insensitive search", async () => {
      const results = await manager.search("OAUTH", { metadataOnly: true });

      expect(results).toHaveLength(1);
      expect(results[0]?.bookmark.name).toBe("OAuth implementation");
    });
  });

  describe("addTag", () => {
    let bookmark: Bookmark;

    beforeEach(async () => {
      bookmark = await manager.add({
        type: "session",
        sessionId: "session-001",
        name: "Test",
        tags: ["tag1"],
      });
    });

    test("adds new tag", async () => {
      const updated = await manager.addTag(bookmark.id, "tag2");

      expect(updated.tags).toEqual(["tag1", "tag2"]);
    });

    test("does not duplicate existing tag", async () => {
      const updated = await manager.addTag(bookmark.id, "tag1");

      expect(updated.tags).toEqual(["tag1"]);
    });

    test("throws error for non-existent bookmark", async () => {
      await expect(manager.addTag("non-existent-id", "tag")).rejects.toThrow(
        "Bookmark not found",
      );
    });
  });

  describe("removeTag", () => {
    let bookmark: Bookmark;

    beforeEach(async () => {
      bookmark = await manager.add({
        type: "session",
        sessionId: "session-001",
        name: "Test",
        tags: ["tag1", "tag2", "tag3"],
      });
    });

    test("removes existing tag", async () => {
      const updated = await manager.removeTag(bookmark.id, "tag2");

      expect(updated.tags).toEqual(["tag1", "tag3"]);
    });

    test("returns unchanged bookmark if tag not present", async () => {
      const updated = await manager.removeTag(bookmark.id, "non-existent-tag");

      expect(updated.tags).toEqual(["tag1", "tag2", "tag3"]);
    });

    test("throws error for non-existent bookmark", async () => {
      await expect(manager.removeTag("non-existent-id", "tag")).rejects.toThrow(
        "Bookmark not found",
      );
    });
  });
});
