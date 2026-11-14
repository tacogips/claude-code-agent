/**
 * Tests for InMemorySessionRepository.
 *
 * @module repository/in-memory/session-repository.test
 */

import { describe, test, expect, beforeEach } from "vitest";
import { InMemorySessionRepository } from "./session-repository";
import type { Session } from "../../types/session";

describe("InMemorySessionRepository", () => {
  let repo: InMemorySessionRepository;

  beforeEach(() => {
    repo = new InMemorySessionRepository();
  });

  const createTestSession = (overrides?: Partial<Session>): Session => ({
    id: "session-1",
    projectPath: "/project/path",
    status: "active",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    messages: [],
    tasks: [],
    costUsd: 1.5,
    ...overrides,
  });

  describe("save and findById", () => {
    test("saves and retrieves a session", async () => {
      const session = createTestSession();
      await repo.save(session);

      const found = await repo.findById("session-1");
      expect(found).toEqual(session);
    });

    test("returns null for non-existent session", async () => {
      const found = await repo.findById("non-existent");
      expect(found).toBeNull();
    });

    test("updates existing session on save", async () => {
      const session = createTestSession();
      await repo.save(session);

      const updated = { ...session, status: "completed" as const };
      await repo.save(updated);

      const found = await repo.findById("session-1");
      expect(found?.status).toBe("completed");
    });
  });

  describe("delete", () => {
    test("deletes existing session", async () => {
      const session = createTestSession();
      await repo.save(session);

      const deleted = await repo.delete("session-1");
      expect(deleted).toBe(true);

      const found = await repo.findById("session-1");
      expect(found).toBeNull();
    });

    test("returns false for non-existent session", async () => {
      const deleted = await repo.delete("non-existent");
      expect(deleted).toBe(false);
    });
  });

  describe("findByProject", () => {
    test("finds all sessions for a project", async () => {
      await repo.save(createTestSession({ id: "s1", projectPath: "/proj-a" }));
      await repo.save(createTestSession({ id: "s2", projectPath: "/proj-a" }));
      await repo.save(createTestSession({ id: "s3", projectPath: "/proj-b" }));

      const sessions = await repo.findByProject("/proj-a");
      expect(sessions).toHaveLength(2);
      expect(sessions.map((s) => s.id)).toEqual(
        expect.arrayContaining(["s1", "s2"]),
      );
    });

    test("returns empty array for project with no sessions", async () => {
      const sessions = await repo.findByProject("/non-existent");
      expect(sessions).toEqual([]);
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await repo.save(
        createTestSession({
          id: "s1",
          projectPath: "/proj-a",
          status: "active",
          createdAt: "2026-01-01T00:00:00Z",
          costUsd: 1.0,
        }),
      );
      await repo.save(
        createTestSession({
          id: "s2",
          projectPath: "/proj-a",
          status: "completed",
          createdAt: "2026-01-02T00:00:00Z",
          costUsd: 2.0,
        }),
      );
      await repo.save(
        createTestSession({
          id: "s3",
          projectPath: "/proj-b",
          status: "active",
          createdAt: "2026-01-03T00:00:00Z",
          costUsd: 3.0,
        }),
      );
    });

    test("lists all sessions without filter", async () => {
      const sessions = await repo.list();
      expect(sessions).toHaveLength(3);
    });

    test("filters by projectPath", async () => {
      const sessions = await repo.list({ projectPath: "/proj-a" });
      expect(sessions).toHaveLength(2);
      expect(sessions.every((s) => s.projectPath === "/proj-a")).toBe(true);
    });

    test("filters by status", async () => {
      const sessions = await repo.list({ status: "active" });
      expect(sessions).toHaveLength(2);
      expect(sessions.every((s) => s.status === "active")).toBe(true);
    });

    test("filters by since date", async () => {
      const sessions = await repo.list({
        since: new Date("2026-01-02T00:00:00Z"),
      });
      expect(sessions).toHaveLength(2);
      expect(sessions.map((s) => s.id)).toEqual(
        expect.arrayContaining(["s2", "s3"]),
      );
    });

    test("filters by until date", async () => {
      const sessions = await repo.list({
        until: new Date("2026-01-02T00:00:00Z"),
      });
      expect(sessions).toHaveLength(2);
      expect(sessions.map((s) => s.id)).toEqual(
        expect.arrayContaining(["s1", "s2"]),
      );
    });

    test("applies limit", async () => {
      const sessions = await repo.list({ limit: 2 });
      expect(sessions).toHaveLength(2);
    });

    test("applies offset", async () => {
      const sessions = await repo.list({ offset: 1 });
      expect(sessions).toHaveLength(2);
    });

    test("sorts by createdAt ascending", async () => {
      const sessions = await repo.list(
        {},
        { field: "createdAt", direction: "asc" },
      );
      expect(sessions.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
    });

    test("sorts by createdAt descending", async () => {
      const sessions = await repo.list(
        {},
        { field: "createdAt", direction: "desc" },
      );
      expect(sessions.map((s) => s.id)).toEqual(["s3", "s2", "s1"]);
    });

    test("sorts by costUsd ascending", async () => {
      const sessions = await repo.list(
        {},
        { field: "costUsd", direction: "asc" },
      );
      expect(sessions.map((s) => s.id)).toEqual(["s1", "s2", "s3"]);
    });
  });

  describe("listMetadata", () => {
    test("returns metadata without full message arrays", async () => {
      const session = createTestSession({
        messages: [
          {
            id: "m1",
            role: "user",
            content: "Hello",
            timestamp: "2026-01-01T00:00:00Z",
          },
        ],
      });
      await repo.save(session);

      const metadata = await repo.listMetadata();
      expect(metadata).toHaveLength(1);
      expect(metadata[0]?.messageCount).toBe(1);
      expect(metadata[0]).not.toHaveProperty("messages");
    });
  });

  describe("count", () => {
    beforeEach(async () => {
      await repo.save(createTestSession({ id: "s1", status: "active" }));
      await repo.save(createTestSession({ id: "s2", status: "completed" }));
      await repo.save(createTestSession({ id: "s3", status: "active" }));
    });

    test("counts all sessions without filter", async () => {
      const count = await repo.count();
      expect(count).toBe(3);
    });

    test("counts filtered sessions", async () => {
      const count = await repo.count({ status: "active" });
      expect(count).toBe(2);
    });
  });

  describe("clear", () => {
    test("removes all sessions", async () => {
      await repo.save(createTestSession({ id: "s1" }));
      await repo.save(createTestSession({ id: "s2" }));

      repo.clear();

      const sessions = await repo.list();
      expect(sessions).toEqual([]);
    });
  });
});
