/**
 * Unit tests for InMemoryBookmarkRepository.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { InMemoryBookmarkRepository } from "./bookmark-repository";
import type { Bookmark } from "../bookmark-repository";

describe("InMemoryBookmarkRepository", () => {
  let repo: InMemoryBookmarkRepository;

  // Test fixtures
  const createBookmark = (overrides: Partial<Bookmark> = {}): Bookmark => ({
    id: "bm-001",
    type: "session",
    sessionId: "session-001",
    name: "Test Bookmark",
    tags: [],
    createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    updatedAt: new Date("2026-01-01T00:00:00Z").toISOString(),
    ...overrides,
  });

  beforeEach(() => {
    repo = new InMemoryBookmarkRepository();
  });

  describe("findById", () => {
    test("should return bookmark when found", async () => {
      const bookmark = createBookmark();
      await repo.save(bookmark);

      const result = await repo.findById("bm-001");
      expect(result).toEqual(bookmark);
    });

    test("should return null when not found", async () => {
      const result = await repo.findById("nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("findBySession", () => {
    test("should return all bookmarks for a session", async () => {
      const bookmark1 = createBookmark({
        id: "bm-001",
        sessionId: "session-001",
      });
      const bookmark2 = createBookmark({
        id: "bm-002",
        sessionId: "session-001",
      });
      const bookmark3 = createBookmark({
        id: "bm-003",
        sessionId: "session-002",
      });

      await repo.save(bookmark1);
      await repo.save(bookmark2);
      await repo.save(bookmark3);

      const results = await repo.findBySession("session-001");
      expect(results).toHaveLength(2);
      expect(results).toContainEqual(bookmark1);
      expect(results).toContainEqual(bookmark2);
    });

    test("should return empty array when session has no bookmarks", async () => {
      const results = await repo.findBySession("nonexistent");
      expect(results).toEqual([]);
    });
  });

  describe("findByTag", () => {
    test("should return all bookmarks with the tag", async () => {
      const bookmark1 = createBookmark({ id: "bm-001", tags: ["auth", "bug"] });
      const bookmark2 = createBookmark({ id: "bm-002", tags: ["auth"] });
      const bookmark3 = createBookmark({ id: "bm-003", tags: ["feature"] });

      await repo.save(bookmark1);
      await repo.save(bookmark2);
      await repo.save(bookmark3);

      const results = await repo.findByTag("auth");
      expect(results).toHaveLength(2);
      expect(results).toContainEqual(bookmark1);
      expect(results).toContainEqual(bookmark2);
    });

    test("should return empty array when no bookmarks have the tag", async () => {
      const results = await repo.findByTag("nonexistent");
      expect(results).toEqual([]);
    });
  });

  describe("list", () => {
    test("should return all bookmarks when no filter", async () => {
      const bookmark1 = createBookmark({ id: "bm-001" });
      const bookmark2 = createBookmark({ id: "bm-002" });

      await repo.save(bookmark1);
      await repo.save(bookmark2);

      const results = await repo.list();
      expect(results).toHaveLength(2);
    });

    test("should filter by type", async () => {
      const sessionBm = createBookmark({ id: "bm-001", type: "session" });
      const messageBm = createBookmark({
        id: "bm-002",
        type: "message",
        messageId: "msg-001",
      });

      await repo.save(sessionBm);
      await repo.save(messageBm);

      const results = await repo.list({ type: "message" });
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(messageBm);
    });

    test("should filter by sessionId", async () => {
      const bookmark1 = createBookmark({
        id: "bm-001",
        sessionId: "session-001",
      });
      const bookmark2 = createBookmark({
        id: "bm-002",
        sessionId: "session-002",
      });

      await repo.save(bookmark1);
      await repo.save(bookmark2);

      const results = await repo.list({ sessionId: "session-001" });
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(bookmark1);
    });

    test("should filter by tags (ALL tags required)", async () => {
      const bookmark1 = createBookmark({ id: "bm-001", tags: ["auth", "bug"] });
      const bookmark2 = createBookmark({ id: "bm-002", tags: ["auth"] });

      await repo.save(bookmark1);
      await repo.save(bookmark2);

      const results = await repo.list({ tags: ["auth", "bug"] });
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(bookmark1);
    });

    test("should filter by nameContains (case-insensitive)", async () => {
      const bookmark1 = createBookmark({ id: "bm-001", name: "Auth Bug Fix" });
      const bookmark2 = createBookmark({
        id: "bm-002",
        name: "Feature Request",
      });

      await repo.save(bookmark1);
      await repo.save(bookmark2);

      const results = await repo.list({ nameContains: "auth" });
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(bookmark1);
    });

    test("should filter by since date", async () => {
      const bookmark1 = createBookmark({
        id: "bm-001",
        createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
      });
      const bookmark2 = createBookmark({
        id: "bm-002",
        createdAt: new Date("2026-01-05T00:00:00Z").toISOString(),
      });

      await repo.save(bookmark1);
      await repo.save(bookmark2);

      const results = await repo.list({
        since: new Date("2026-01-03T00:00:00Z"),
      });
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(bookmark2);
    });

    test("should sort by name ascending", async () => {
      const bookmark1 = createBookmark({ id: "bm-001", name: "Zebra" });
      const bookmark2 = createBookmark({ id: "bm-002", name: "Alpha" });

      await repo.save(bookmark1);
      await repo.save(bookmark2);

      const results = await repo.list(undefined, {
        field: "name",
        direction: "asc",
      });
      expect(results[0]?.name).toBe("Alpha");
      expect(results[1]?.name).toBe("Zebra");
    });

    test("should sort by createdAt descending", async () => {
      const bookmark1 = createBookmark({
        id: "bm-001",
        createdAt: new Date("2026-01-01T00:00:00Z").toISOString(),
      });
      const bookmark2 = createBookmark({
        id: "bm-002",
        createdAt: new Date("2026-01-05T00:00:00Z").toISOString(),
      });

      await repo.save(bookmark1);
      await repo.save(bookmark2);

      const results = await repo.list(undefined, {
        field: "createdAt",
        direction: "desc",
      });
      expect(results[0]?.id).toBe("bm-002");
      expect(results[1]?.id).toBe("bm-001");
    });

    test("should apply offset and limit", async () => {
      const bookmark1 = createBookmark({ id: "bm-001", name: "A" });
      const bookmark2 = createBookmark({ id: "bm-002", name: "B" });
      const bookmark3 = createBookmark({ id: "bm-003", name: "C" });

      await repo.save(bookmark1);
      await repo.save(bookmark2);
      await repo.save(bookmark3);

      const results = await repo.list(
        { offset: 1, limit: 1 },
        { field: "name", direction: "asc" },
      );
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe("B");
    });
  });

  describe("search", () => {
    test("should find bookmarks by name", async () => {
      const bookmark1 = createBookmark({ id: "bm-001", name: "Auth Bug" });
      const bookmark2 = createBookmark({ id: "bm-002", name: "Feature" });

      await repo.save(bookmark1);
      await repo.save(bookmark2);

      const results = await repo.search({ query: "auth" });
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(bookmark1);
    });

    test("should find bookmarks by description", async () => {
      const bookmark1 = createBookmark({
        id: "bm-001",
        name: "Session",
        description: "OAuth implementation",
      });
      const bookmark2 = createBookmark({ id: "bm-002", name: "Other" });

      await repo.save(bookmark1);
      await repo.save(bookmark2);

      const results = await repo.search({ query: "oauth" });
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(bookmark1);
    });

    test("should find bookmarks by tag", async () => {
      const bookmark1 = createBookmark({
        id: "bm-001",
        tags: ["authentication"],
      });
      const bookmark2 = createBookmark({ id: "bm-002", tags: ["feature"] });

      await repo.save(bookmark1);
      await repo.save(bookmark2);

      const results = await repo.search({ query: "auth" });
      expect(results).toHaveLength(1);
      expect(results[0]).toEqual(bookmark1);
    });

    test("should be case-insensitive", async () => {
      const bookmark = createBookmark({ id: "bm-001", name: "AUTH BUG" });
      await repo.save(bookmark);

      const results = await repo.search({ query: "auth bug" });
      expect(results).toHaveLength(1);
    });

    test("should prioritize exact name matches", async () => {
      const exactMatch = createBookmark({ id: "bm-001", name: "auth" });
      const partialMatch = createBookmark({
        id: "bm-002",
        name: "authentication",
      });

      await repo.save(partialMatch);
      await repo.save(exactMatch);

      const results = await repo.search({ query: "auth" });
      expect(results[0]).toEqual(exactMatch);
      expect(results[1]).toEqual(partialMatch);
    });

    test("should apply limit", async () => {
      const bookmark1 = createBookmark({ id: "bm-001", name: "Auth 1" });
      const bookmark2 = createBookmark({ id: "bm-002", name: "Auth 2" });

      await repo.save(bookmark1);
      await repo.save(bookmark2);

      const results = await repo.search({ query: "auth", limit: 1 });
      expect(results).toHaveLength(1);
    });
  });

  describe("save", () => {
    test("should save a new bookmark", async () => {
      const bookmark = createBookmark();
      await repo.save(bookmark);

      const result = await repo.findById("bm-001");
      expect(result).toEqual(bookmark);
    });

    test("should update an existing bookmark", async () => {
      const bookmark = createBookmark({ name: "Original" });
      await repo.save(bookmark);

      const updated = { ...bookmark, name: "Updated" };
      await repo.save(updated);

      const result = await repo.findById("bm-001");
      expect(result?.name).toBe("Updated");
    });
  });

  describe("update", () => {
    test("should update existing bookmark", async () => {
      const bookmark = createBookmark({ name: "Original" });
      await repo.save(bookmark);

      await repo.update("bm-001", { name: "Updated" });

      const result = await repo.findById("bm-001");
      expect(result?.name).toBe("Updated");
    });

    test("should throw when bookmark not found", async () => {
      await expect(
        repo.update("nonexistent", { name: "Updated" }),
      ).rejects.toThrow("Bookmark not found: nonexistent");
    });

    test("should not change ID", async () => {
      const bookmark = createBookmark();
      await repo.save(bookmark);

      await repo.update("bm-001", { name: "Updated" });

      const result = await repo.findById("bm-001");
      expect(result?.id).toBe("bm-001");
    });
  });

  describe("delete", () => {
    test("should delete existing bookmark", async () => {
      const bookmark = createBookmark();
      await repo.save(bookmark);

      const deleted = await repo.delete("bm-001");
      expect(deleted).toBe(true);

      const result = await repo.findById("bm-001");
      expect(result).toBeNull();
    });

    test("should return false when bookmark not found", async () => {
      const deleted = await repo.delete("nonexistent");
      expect(deleted).toBe(false);
    });
  });

  describe("getAllTags", () => {
    test("should return all unique tags sorted", async () => {
      const bookmark1 = createBookmark({ id: "bm-001", tags: ["auth", "bug"] });
      const bookmark2 = createBookmark({
        id: "bm-002",
        tags: ["feature", "auth"],
      });

      await repo.save(bookmark1);
      await repo.save(bookmark2);

      const tags = await repo.getAllTags();
      expect(tags).toEqual(["auth", "bug", "feature"]);
    });

    test("should return empty array when no bookmarks", async () => {
      const tags = await repo.getAllTags();
      expect(tags).toEqual([]);
    });
  });

  describe("count", () => {
    test("should count all bookmarks when no filter", async () => {
      await repo.save(createBookmark({ id: "bm-001" }));
      await repo.save(createBookmark({ id: "bm-002" }));

      const count = await repo.count();
      expect(count).toBe(2);
    });

    test("should count filtered bookmarks", async () => {
      await repo.save(
        createBookmark({ id: "bm-001", sessionId: "session-001" }),
      );
      await repo.save(
        createBookmark({ id: "bm-002", sessionId: "session-002" }),
      );

      const count = await repo.count({ sessionId: "session-001" });
      expect(count).toBe(1);
    });
  });

  describe("clear", () => {
    test("should remove all bookmarks", async () => {
      await repo.save(createBookmark({ id: "bm-001" }));
      await repo.save(createBookmark({ id: "bm-002" }));

      repo.clear();

      const count = await repo.count();
      expect(count).toBe(0);
    });
  });
});
