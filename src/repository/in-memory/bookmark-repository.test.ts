/**
 * Tests for InMemoryBookmarkRepository.
 *
 * @module repository/in-memory/bookmark-repository.test
 */

import { describe, test, expect, beforeEach } from "vitest";
import { InMemoryBookmarkRepository } from "./bookmark-repository";
import type { Bookmark } from "../bookmark-repository";

describe("InMemoryBookmarkRepository", () => {
  let repo: InMemoryBookmarkRepository;

  beforeEach(() => {
    repo = new InMemoryBookmarkRepository();
  });

  const createTestBookmark = (overrides?: Partial<Bookmark>): Bookmark => ({
    id: "bm-1",
    name: "Test Bookmark",
    type: "session",
    sessionId: "session-1",
    tags: ["important"],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  });

  describe("save and findById", () => {
    test("saves and retrieves a bookmark", async () => {
      const bookmark = createTestBookmark();
      await repo.save(bookmark);

      const found = await repo.findById("bm-1");
      expect(found).toEqual(bookmark);
    });

    test("returns null for non-existent bookmark", async () => {
      const found = await repo.findById("non-existent");
      expect(found).toBeNull();
    });

    test("updates existing bookmark on save", async () => {
      const bookmark = createTestBookmark();
      await repo.save(bookmark);

      const updated = { ...bookmark, name: "Updated Name" };
      await repo.save(updated);

      const found = await repo.findById("bm-1");
      expect(found?.name).toBe("Updated Name");
    });
  });

  describe("delete", () => {
    test("deletes existing bookmark", async () => {
      const bookmark = createTestBookmark();
      await repo.save(bookmark);

      const deleted = await repo.delete("bm-1");
      expect(deleted).toBe(true);

      const found = await repo.findById("bm-1");
      expect(found).toBeNull();
    });

    test("returns false for non-existent bookmark", async () => {
      const deleted = await repo.delete("non-existent");
      expect(deleted).toBe(false);
    });
  });

  describe("findBySession", () => {
    test("finds all bookmarks for a session", async () => {
      await repo.save(createTestBookmark({ id: "bm1", sessionId: "s1" }));
      await repo.save(createTestBookmark({ id: "bm2", sessionId: "s1" }));
      await repo.save(createTestBookmark({ id: "bm3", sessionId: "s2" }));

      const bookmarks = await repo.findBySession("s1");
      expect(bookmarks).toHaveLength(2);
      expect(bookmarks.map((b) => b.id)).toEqual(
        expect.arrayContaining(["bm1", "bm2"]),
      );
    });

    test("returns empty array for session with no bookmarks", async () => {
      const bookmarks = await repo.findBySession("non-existent");
      expect(bookmarks).toEqual([]);
    });
  });

  describe("findByTag", () => {
    test("finds all bookmarks with a tag", async () => {
      await repo.save(
        createTestBookmark({ id: "bm1", tags: ["important", "review"] }),
      );
      await repo.save(createTestBookmark({ id: "bm2", tags: ["review"] }));
      await repo.save(createTestBookmark({ id: "bm3", tags: ["archive"] }));

      const bookmarks = await repo.findByTag("review");
      expect(bookmarks).toHaveLength(2);
      expect(bookmarks.map((b) => b.id)).toEqual(
        expect.arrayContaining(["bm1", "bm2"]),
      );
    });

    test("returns empty array for tag with no bookmarks", async () => {
      const bookmarks = await repo.findByTag("non-existent");
      expect(bookmarks).toEqual([]);
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await repo.save(
        createTestBookmark({
          id: "bm1",
          name: "Alpha",
          type: "session",
          sessionId: "s1",
          tags: ["tag1"],
          createdAt: "2026-01-01T00:00:00Z",
        }),
      );
      await repo.save(
        createTestBookmark({
          id: "bm2",
          name: "Beta",
          type: "message",
          sessionId: "s1",
          tags: ["tag2"],
          createdAt: "2026-01-02T00:00:00Z",
        }),
      );
      await repo.save(
        createTestBookmark({
          id: "bm3",
          name: "Gamma",
          type: "range",
          sessionId: "s2",
          tags: ["tag1", "tag2"],
          createdAt: "2026-01-03T00:00:00Z",
        }),
      );
    });

    test("lists all bookmarks without filter", async () => {
      const bookmarks = await repo.list();
      expect(bookmarks).toHaveLength(3);
    });

    test("filters by sessionId", async () => {
      const bookmarks = await repo.list({ sessionId: "s1" });
      expect(bookmarks).toHaveLength(2);
      expect(bookmarks.every((b) => b.sessionId === "s1")).toBe(true);
    });

    test("filters by type", async () => {
      const bookmarks = await repo.list({ type: "message" });
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0]?.type).toBe("message");
    });

    test("filters by tags (any match)", async () => {
      const bookmarks = await repo.list({ tags: ["tag1"] });
      expect(bookmarks).toHaveLength(2);
      expect(bookmarks.map((b) => b.id)).toEqual(
        expect.arrayContaining(["bm1", "bm3"]),
      );
    });

    test("filters by nameContains", async () => {
      const bookmarks = await repo.list({ nameContains: "beta" });
      expect(bookmarks).toHaveLength(1);
      expect(bookmarks[0]?.name).toBe("Beta");
    });

    test("applies limit", async () => {
      const bookmarks = await repo.list({ limit: 2 });
      expect(bookmarks).toHaveLength(2);
    });

    test("applies offset", async () => {
      const bookmarks = await repo.list({ offset: 1 });
      expect(bookmarks).toHaveLength(2);
    });

    test("sorts by name ascending", async () => {
      const bookmarks = await repo.list(
        {},
        { field: "name", direction: "asc" },
      );
      expect(bookmarks.map((b) => b.name)).toEqual(["Alpha", "Beta", "Gamma"]);
    });

    test("sorts by name descending", async () => {
      const bookmarks = await repo.list(
        {},
        { field: "name", direction: "desc" },
      );
      expect(bookmarks.map((b) => b.name)).toEqual(["Gamma", "Beta", "Alpha"]);
    });

    test("sorts by createdAt", async () => {
      const bookmarks = await repo.list(
        {},
        { field: "createdAt", direction: "asc" },
      );
      expect(bookmarks.map((b) => b.id)).toEqual(["bm1", "bm2", "bm3"]);
    });
  });

  describe("search", () => {
    beforeEach(async () => {
      await repo.save(
        createTestBookmark({
          id: "bm1",
          name: "Important Session",
          tags: ["work"],
          description: "Critical bug fix",
        }),
      );
      await repo.save(
        createTestBookmark({
          id: "bm2",
          name: "Review Later",
          tags: ["review", "important"],
        }),
      );
      await repo.save(
        createTestBookmark({
          id: "bm3",
          name: "Archive",
          tags: ["archive"],
          description: "Old session",
        }),
      );
    });

    test("searches in name", async () => {
      const results = await repo.search({ query: "session" });
      expect(results).toHaveLength(2);
      expect(results.map((b) => b.id)).toEqual(
        expect.arrayContaining(["bm1", "bm3"]),
      );
    });

    test("searches in notes", async () => {
      const results = await repo.search({ query: "bug" });
      expect(results).toHaveLength(1);
      expect(results[0]?.id).toBe("bm1");
    });

    test("searches in tags", async () => {
      const results = await repo.search({ query: "important" });
      expect(results).toHaveLength(2);
      expect(results.map((b) => b.id)).toEqual(
        expect.arrayContaining(["bm1", "bm2"]),
      );
    });

    test("applies limit to search results", async () => {
      const results = await repo.search({ query: "session", limit: 1 });
      expect(results).toHaveLength(1);
    });

    test("is case insensitive", async () => {
      const results = await repo.search({ query: "IMPORTANT" });
      expect(results).toHaveLength(2);
    });
  });

  describe("getAllTags", () => {
    test("returns unique tags across all bookmarks", async () => {
      await repo.save(createTestBookmark({ tags: ["tag1", "tag2"] }));
      await repo.save(
        createTestBookmark({ id: "bm2", tags: ["tag2", "tag3"] }),
      );
      await repo.save(createTestBookmark({ id: "bm3", tags: ["tag1"] }));

      const tags = await repo.getAllTags();
      expect(tags).toEqual(["tag1", "tag2", "tag3"]);
    });

    test("returns empty array when no bookmarks", async () => {
      const tags = await repo.getAllTags();
      expect(tags).toEqual([]);
    });

    test("returns sorted tags", async () => {
      await repo.save(
        createTestBookmark({ tags: ["zebra", "apple", "monkey"] }),
      );

      const tags = await repo.getAllTags();
      expect(tags).toEqual(["apple", "monkey", "zebra"]);
    });
  });

  describe("count", () => {
    beforeEach(async () => {
      await repo.save(createTestBookmark({ id: "bm1", type: "session" }));
      await repo.save(createTestBookmark({ id: "bm2", type: "message" }));
      await repo.save(createTestBookmark({ id: "bm3", type: "session" }));
    });

    test("counts all bookmarks without filter", async () => {
      const count = await repo.count();
      expect(count).toBe(3);
    });

    test("counts filtered bookmarks", async () => {
      const count = await repo.count({ type: "session" });
      expect(count).toBe(2);
    });
  });

  describe("clear", () => {
    test("removes all bookmarks", async () => {
      await repo.save(createTestBookmark({ id: "bm1" }));
      await repo.save(createTestBookmark({ id: "bm2" }));

      repo.clear();

      const bookmarks = await repo.list();
      expect(bookmarks).toEqual([]);
    });
  });
});
