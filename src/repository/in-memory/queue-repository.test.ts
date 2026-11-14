/**
 * Tests for InMemoryQueueRepository.
 *
 * @module repository/in-memory/queue-repository.test
 */

import { describe, test, expect, beforeEach } from "vitest";
import { InMemoryQueueRepository } from "./queue-repository";
import type { CommandQueue, QueueCommand } from "../queue-repository";

describe("InMemoryQueueRepository", () => {
  let repo: InMemoryQueueRepository;

  beforeEach(() => {
    repo = new InMemoryQueueRepository();
  });

  const createTestCommand = (
    overrides?: Partial<QueueCommand>,
  ): QueueCommand => ({
    id: "cmd-1",
    prompt: "Test prompt",
    sessionMode: "continue",
    status: "pending",
    ...overrides,
  });

  const createTestQueue = (
    overrides?: Partial<CommandQueue>,
  ): CommandQueue => ({
    id: "queue-1",
    name: "Test Queue",
    projectPath: "/project",
    status: "pending",
    commands: [createTestCommand()],
    currentIndex: 0,
    totalCostUsd: 0,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  });

  describe("save and findById", () => {
    test("saves and retrieves a queue", async () => {
      const queue = createTestQueue();
      await repo.save(queue);

      const found = await repo.findById("queue-1");
      expect(found).toEqual(queue);
    });

    test("returns null for non-existent queue", async () => {
      const found = await repo.findById("non-existent");
      expect(found).toBeNull();
    });

    test("updates existing queue on save", async () => {
      const queue = createTestQueue();
      await repo.save(queue);

      const updated = { ...queue, status: "running" as const };
      await repo.save(updated);

      const found = await repo.findById("queue-1");
      expect(found?.status).toBe("running");
    });
  });

  describe("delete", () => {
    test("deletes existing queue", async () => {
      const queue = createTestQueue();
      await repo.save(queue);

      const deleted = await repo.delete("queue-1");
      expect(deleted).toBe(true);

      const found = await repo.findById("queue-1");
      expect(found).toBeNull();
    });

    test("returns false for non-existent queue", async () => {
      const deleted = await repo.delete("non-existent");
      expect(deleted).toBe(false);
    });
  });

  describe("findByProject", () => {
    test("finds all queues for a project", async () => {
      await repo.save(createTestQueue({ id: "q1", projectPath: "/proj-a" }));
      await repo.save(createTestQueue({ id: "q2", projectPath: "/proj-a" }));
      await repo.save(createTestQueue({ id: "q3", projectPath: "/proj-b" }));

      const queues = await repo.findByProject("/proj-a");
      expect(queues).toHaveLength(2);
      expect(queues.map((q) => q.id)).toEqual(
        expect.arrayContaining(["q1", "q2"]),
      );
    });

    test("returns empty array for project with no queues", async () => {
      const queues = await repo.findByProject("/non-existent");
      expect(queues).toEqual([]);
    });
  });

  describe("findByStatus", () => {
    test("finds all queues with a status", async () => {
      await repo.save(createTestQueue({ id: "q1", status: "pending" }));
      await repo.save(createTestQueue({ id: "q2", status: "running" }));
      await repo.save(createTestQueue({ id: "q3", status: "pending" }));

      const queues = await repo.findByStatus("pending");
      expect(queues).toHaveLength(2);
      expect(queues.map((q) => q.id)).toEqual(
        expect.arrayContaining(["q1", "q3"]),
      );
    });

    test("returns empty array for status with no queues", async () => {
      const queues = await repo.findByStatus("completed");
      expect(queues).toEqual([]);
    });
  });

  describe("list", () => {
    beforeEach(async () => {
      await repo.save(
        createTestQueue({
          id: "q1",
          name: "Alpha",
          projectPath: "/proj-a",
          status: "pending",
          createdAt: "2026-01-01T00:00:00Z",
          totalCostUsd: 1.0,
        }),
      );
      await repo.save(
        createTestQueue({
          id: "q2",
          name: "Beta",
          projectPath: "/proj-a",
          status: "running",
          createdAt: "2026-01-02T00:00:00Z",
          totalCostUsd: 2.0,
        }),
      );
      await repo.save(
        createTestQueue({
          id: "q3",
          name: "Gamma",
          projectPath: "/proj-b",
          status: "pending",
          createdAt: "2026-01-03T00:00:00Z",
          totalCostUsd: 3.0,
        }),
      );
    });

    test("lists all queues without filter", async () => {
      const queues = await repo.list();
      expect(queues).toHaveLength(3);
    });

    test("filters by projectPath", async () => {
      const queues = await repo.list({ projectPath: "/proj-a" });
      expect(queues).toHaveLength(2);
      expect(queues.every((q) => q.projectPath === "/proj-a")).toBe(true);
    });

    test("filters by status", async () => {
      const queues = await repo.list({ status: "pending" });
      expect(queues).toHaveLength(2);
      expect(queues.every((q) => q.status === "pending")).toBe(true);
    });

    test("filters by nameContains", async () => {
      const queues = await repo.list({ nameContains: "beta" });
      expect(queues).toHaveLength(1);
      expect(queues[0]?.name).toBe("Beta");
    });

    test("filters by since date", async () => {
      const queues = await repo.list({
        since: new Date("2026-01-02T00:00:00Z"),
      });
      expect(queues).toHaveLength(2);
      expect(queues.map((q) => q.id)).toEqual(
        expect.arrayContaining(["q2", "q3"]),
      );
    });

    test("applies limit", async () => {
      const queues = await repo.list({ limit: 2 });
      expect(queues).toHaveLength(2);
    });

    test("applies offset", async () => {
      const queues = await repo.list({ offset: 1 });
      expect(queues).toHaveLength(2);
    });

    test("sorts by name", async () => {
      const queues = await repo.list({}, { field: "name", direction: "asc" });
      expect(queues.map((q) => q.name)).toEqual(["Alpha", "Beta", "Gamma"]);
    });

    test("sorts by totalCostUsd", async () => {
      const queues = await repo.list(
        {},
        { field: "totalCostUsd", direction: "desc" },
      );
      expect(queues.map((q) => q.id)).toEqual(["q3", "q2", "q1"]);
    });
  });

  describe("addCommand", () => {
    test("adds command to end of queue by default", async () => {
      const queue = createTestQueue({ commands: [createTestCommand()] });
      await repo.save(queue);

      const added = await repo.addCommand("queue-1", {
        prompt: "New command",
        sessionMode: "new",
      });
      expect(added).toBe(true);

      const found = await repo.findById("queue-1");
      expect(found?.commands).toHaveLength(2);
      expect(found?.commands[1]?.prompt).toBe("New command");
      expect(found?.commands[1]?.status).toBe("pending");
    });

    test("adds command at specified position", async () => {
      const queue = createTestQueue({
        commands: [
          createTestCommand({ id: "cmd-1" }),
          createTestCommand({ id: "cmd-2" }),
        ],
      });
      await repo.save(queue);

      const added = await repo.addCommand(
        "queue-1",
        {
          prompt: "Inserted command",
          sessionMode: "continue",
        },
        1,
      );
      expect(added).toBe(true);

      const found = await repo.findById("queue-1");
      expect(found?.commands).toHaveLength(3);
      expect(found?.commands[1]?.prompt).toBe("Inserted command");
    });

    test("generates unique command ID", async () => {
      const queue = createTestQueue({ commands: [] });
      await repo.save(queue);

      await repo.addCommand("queue-1", {
        prompt: "Command 1",
        sessionMode: "continue",
      });
      await repo.addCommand("queue-1", {
        prompt: "Command 2",
        sessionMode: "continue",
      });

      const found = await repo.findById("queue-1");
      const ids = found?.commands.map((c) => c.id);
      expect(new Set(ids).size).toBe(2); // All unique
    });

    test("returns false for non-existent queue", async () => {
      const added = await repo.addCommand("non-existent", {
        prompt: "Test",
        sessionMode: "continue",
      });
      expect(added).toBe(false);
    });
  });

  describe("updateCommand", () => {
    test("updates command at index", async () => {
      const queue = createTestQueue({
        commands: [
          createTestCommand({ prompt: "Old prompt" }),
          createTestCommand({ id: "cmd-2" }),
        ],
      });
      await repo.save(queue);

      const updated = await repo.updateCommand("queue-1", 0, {
        prompt: "New prompt",
      });
      expect(updated).toBe(true);

      const found = await repo.findById("queue-1");
      expect(found?.commands[0]?.prompt).toBe("New prompt");
    });

    test("returns false for non-existent queue", async () => {
      const updated = await repo.updateCommand("non-existent", 0, {
        prompt: "Test",
      });
      expect(updated).toBe(false);
    });

    test("returns false for invalid index", async () => {
      const queue = createTestQueue({ commands: [createTestCommand()] });
      await repo.save(queue);

      const updated = await repo.updateCommand("queue-1", 99, {
        prompt: "Test",
      });
      expect(updated).toBe(false);
    });
  });

  describe("removeCommand", () => {
    test("removes command at index", async () => {
      const queue = createTestQueue({
        commands: [
          createTestCommand({ id: "cmd-1" }),
          createTestCommand({ id: "cmd-2" }),
          createTestCommand({ id: "cmd-3" }),
        ],
      });
      await repo.save(queue);

      const removed = await repo.removeCommand("queue-1", 1);
      expect(removed).toBe(true);

      const found = await repo.findById("queue-1");
      expect(found?.commands).toHaveLength(2);
      expect(found?.commands.map((c) => c.id)).toEqual(["cmd-1", "cmd-3"]);
    });

    test("returns false for non-existent queue", async () => {
      const removed = await repo.removeCommand("non-existent", 0);
      expect(removed).toBe(false);
    });

    test("returns false for invalid index", async () => {
      const queue = createTestQueue({ commands: [createTestCommand()] });
      await repo.save(queue);

      const removed = await repo.removeCommand("queue-1", 99);
      expect(removed).toBe(false);
    });
  });

  describe("reorderCommand", () => {
    test("moves command to new position", async () => {
      const queue = createTestQueue({
        commands: [
          createTestCommand({ id: "cmd-1" }),
          createTestCommand({ id: "cmd-2" }),
          createTestCommand({ id: "cmd-3" }),
        ],
      });
      await repo.save(queue);

      const reordered = await repo.reorderCommand("queue-1", 0, 2);
      expect(reordered).toBe(true);

      const found = await repo.findById("queue-1");
      expect(found?.commands.map((c) => c.id)).toEqual([
        "cmd-2",
        "cmd-3",
        "cmd-1",
      ]);
    });

    test("returns false for non-existent queue", async () => {
      const reordered = await repo.reorderCommand("non-existent", 0, 1);
      expect(reordered).toBe(false);
    });

    test("returns false for invalid indices", async () => {
      const queue = createTestQueue({ commands: [createTestCommand()] });
      await repo.save(queue);

      const reordered = await repo.reorderCommand("queue-1", 0, 99);
      expect(reordered).toBe(false);
    });
  });

  describe("count", () => {
    beforeEach(async () => {
      await repo.save(createTestQueue({ id: "q1", status: "pending" }));
      await repo.save(createTestQueue({ id: "q2", status: "running" }));
      await repo.save(createTestQueue({ id: "q3", status: "pending" }));
    });

    test("counts all queues without filter", async () => {
      const count = await repo.count();
      expect(count).toBe(3);
    });

    test("counts filtered queues", async () => {
      const count = await repo.count({ status: "pending" });
      expect(count).toBe(2);
    });
  });

  describe("clear", () => {
    test("removes all queues", async () => {
      await repo.save(createTestQueue({ id: "q1" }));
      await repo.save(createTestQueue({ id: "q2" }));

      repo.clear();

      const queues = await repo.list();
      expect(queues).toEqual([]);
    });
  });
});
