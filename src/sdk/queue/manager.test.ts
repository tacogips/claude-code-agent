/**
 * Unit tests for QueueManager.
 *
 * Tests all CRUD operations and command management functionality
 * with mock implementations.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { QueueManager } from "./manager";
import { InMemoryQueueRepository } from "../../repository/in-memory/queue-repository";
import { createTestContainer } from "../../container";
import { EventEmitter } from "../events/emitter";
import type { CommandQueue } from "../../repository/queue-repository";

describe("QueueManager", () => {
  let container: ReturnType<typeof createTestContainer>;
  let repository: InMemoryQueueRepository;
  let eventEmitter: EventEmitter;
  let manager: QueueManager;

  beforeEach(() => {
    container = createTestContainer();
    repository = new InMemoryQueueRepository();
    eventEmitter = new EventEmitter();
    manager = new QueueManager(container, repository, eventEmitter);
  });

  describe("createQueue", () => {
    test("creates a queue with generated ID", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });

      expect(queue.id).toMatch(/^\d{8}-\d{6}-test-queue$/);
      expect(queue.name).toBe("Test Queue");
      expect(queue.projectPath).toBe("/project/path");
      expect(queue.status).toBe("pending");
      expect(queue.commands).toHaveLength(0);
      expect(queue.totalCostUsd).toBe(0);
      expect(queue.currentIndex).toBe(0);
    });

    test("generates default name if not provided", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
      });

      expect(queue.name).toMatch(/^Queue \d{8}-\d{6}$/);
    });

    test("generates slug from name", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Build & Test System!",
      });

      expect(queue.id).toMatch(/-build-test-system$/);
    });

    test("emits queue_created event", async () => {
      let eventReceived = false;
      eventEmitter.on("queue_created", (event) => {
        eventReceived = true;
        expect(event.type).toBe("queue_created");
        expect(event.queueId).toBeDefined();
        expect(event.name).toBe("Test Queue");
        expect(event.projectPath).toBe("/project/path");
      });

      await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });

      expect(eventReceived).toBe(true);
    });
  });

  describe("getQueue", () => {
    test("returns queue when found", async () => {
      const created = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });

      const queue = await manager.getQueue(created.id);

      expect(queue).not.toBeNull();
      expect(queue?.id).toBe(created.id);
      expect(queue?.name).toBe("Test Queue");
    });

    test("returns null when queue not found", async () => {
      const queue = await manager.getQueue("nonexistent");

      expect(queue).toBeNull();
    });
  });

  describe("listQueues", () => {
    test("lists all queues", async () => {
      await manager.createQueue({
        projectPath: "/project/path",
        name: "Queue 1",
      });
      await manager.createQueue({
        projectPath: "/project/path",
        name: "Queue 2",
      });

      const queues = await manager.listQueues();

      expect(queues).toHaveLength(2);
    });

    test("filters queues by project path", async () => {
      await manager.createQueue({
        projectPath: "/project/a",
        name: "Queue A",
      });
      await manager.createQueue({
        projectPath: "/project/b",
        name: "Queue B",
      });

      const queues = await manager.listQueues({
        filter: { projectPath: "/project/a" },
      });

      expect(queues).toHaveLength(1);
      expect(queues[0]?.name).toBe("Queue A");
    });

    test("filters queues by status", async () => {
      const queue1 = await manager.createQueue({
        projectPath: "/project/path",
        name: "Queue 1",
      });

      // Manually update status to running
      const updatedQueue: CommandQueue = {
        ...queue1,
        status: "running",
        updatedAt: container.clock.now().toISOString(),
      };
      await repository.save(updatedQueue);

      await manager.createQueue({
        projectPath: "/project/path",
        name: "Queue 2",
      });

      const runningQueues = await manager.listQueues({
        filter: { status: "running" },
      });
      const pendingQueues = await manager.listQueues({
        filter: { status: "pending" },
      });

      expect(runningQueues).toHaveLength(1);
      expect(pendingQueues).toHaveLength(1);
    });

    test("sorts queues by creation time", async () => {
      const queue1 = await manager.createQueue({
        projectPath: "/project/path",
        name: "Queue 1",
      });

      // Advance time slightly using MockClock method
      const mockClock = container.clock as any;
      mockClock.advance(1000);

      const queue2 = await manager.createQueue({
        projectPath: "/project/path",
        name: "Queue 2",
      });

      const ascending = await manager.listQueues({
        sort: { field: "createdAt", direction: "asc" },
      });
      const descending = await manager.listQueues({
        sort: { field: "createdAt", direction: "desc" },
      });

      expect(ascending[0]?.id).toBe(queue1.id);
      expect(descending[0]?.id).toBe(queue2.id);
    });
  });

  describe("deleteQueue", () => {
    test("deletes an existing queue", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });

      const deleted = await manager.deleteQueue(queue.id);

      expect(deleted).toBe(true);
      expect(await manager.getQueue(queue.id)).toBeNull();
    });

    test("returns false when queue not found", async () => {
      const deleted = await manager.deleteQueue("nonexistent");

      expect(deleted).toBe(false);
    });

    test("prevents deletion of running queue without force", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });

      // Set status to running
      const runningQueue: CommandQueue = {
        ...queue,
        status: "running",
        updatedAt: container.clock.now().toISOString(),
      };
      await repository.save(runningQueue);

      await expect(manager.deleteQueue(queue.id)).rejects.toThrow(
        "Cannot delete running queue",
      );
    });

    test("allows deletion of running queue with force", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });

      // Set status to running
      const runningQueue: CommandQueue = {
        ...queue,
        status: "running",
        updatedAt: container.clock.now().toISOString(),
      };
      await repository.save(runningQueue);

      const deleted = await manager.deleteQueue(queue.id, true);

      expect(deleted).toBe(true);
      expect(await manager.getQueue(queue.id)).toBeNull();
    });
  });

  describe("addCommand", () => {
    test("adds command to end of queue", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });

      const command = await manager.addCommand(queue.id, {
        prompt: "Run tests",
      });

      expect(command.prompt).toBe("Run tests");
      expect(command.sessionMode).toBe("continue");
      expect(command.status).toBe("pending");

      const updated = await manager.getQueue(queue.id);
      expect(updated?.commands).toHaveLength(1);
    });

    test("adds command with explicit session mode", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });

      const command = await manager.addCommand(queue.id, {
        prompt: "Build project",
        sessionMode: "new",
      });

      expect(command.sessionMode).toBe("new");
    });

    test("inserts command at specific position", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });

      await manager.addCommand(queue.id, {
        prompt: "Command 1",
      });
      await manager.addCommand(queue.id, {
        prompt: "Command 3",
      });
      await manager.addCommand(queue.id, {
        prompt: "Command 2",
        position: 1,
      });

      const updated = await manager.getQueue(queue.id);
      expect(updated?.commands[0]?.prompt).toBe("Command 1");
      expect(updated?.commands[1]?.prompt).toBe("Command 2");
      expect(updated?.commands[2]?.prompt).toBe("Command 3");
    });

    test("throws error if queue not found", async () => {
      await expect(
        manager.addCommand("nonexistent", {
          prompt: "Run tests",
        }),
      ).rejects.toThrow("Queue nonexistent not found");
    });

    test("throws error if queue is not pending or paused", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });

      // Set status to running
      const runningQueue: CommandQueue = {
        ...queue,
        status: "running",
        updatedAt: container.clock.now().toISOString(),
      };
      await repository.save(runningQueue);

      await expect(
        manager.addCommand(queue.id, {
          prompt: "Run tests",
        }),
      ).rejects.toThrow("Cannot add commands to queue in running status");
    });

    test("emits command_added event", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });

      let eventReceived = false;
      eventEmitter.on("command_added", (event) => {
        eventReceived = true;
        expect(event.type).toBe("command_added");
        expect(event.queueId).toBe(queue.id);
        expect(event.sessionMode).toBe("new");
      });

      await manager.addCommand(queue.id, {
        prompt: "Run tests",
        sessionMode: "new",
      });

      expect(eventReceived).toBe(true);
    });
  });

  describe("updateCommand", () => {
    test("updates command prompt", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });
      await manager.addCommand(queue.id, {
        prompt: "Old prompt",
      });

      const updated = await manager.updateCommand(queue.id, 0, {
        prompt: "New prompt",
      });

      expect(updated.prompt).toBe("New prompt");
    });

    test("updates command session mode", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });
      await manager.addCommand(queue.id, {
        prompt: "Run tests",
        sessionMode: "continue",
      });

      const updated = await manager.updateCommand(queue.id, 0, {
        sessionMode: "new",
      });

      expect(updated.sessionMode).toBe("new");
    });

    test("throws error if queue not found", async () => {
      await expect(
        manager.updateCommand("nonexistent", 0, {
          prompt: "New prompt",
        }),
      ).rejects.toThrow("Queue nonexistent not found");
    });

    test("throws error if command index invalid", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });

      await expect(
        manager.updateCommand(queue.id, 0, {
          prompt: "New prompt",
        }),
      ).rejects.toThrow("Command at index 0 not found");
    });

    test("throws error if queue is not pending or paused", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });
      await manager.addCommand(queue.id, {
        prompt: "Run tests",
      });

      // Set status to completed
      const completedQueue: CommandQueue = {
        ...(await manager.getQueue(queue.id))!,
        status: "completed",
        updatedAt: container.clock.now().toISOString(),
      };
      await repository.save(completedQueue);

      await expect(
        manager.updateCommand(queue.id, 0, {
          prompt: "New prompt",
        }),
      ).rejects.toThrow(
        "Cannot update commands in queue with completed status",
      );
    });

    test("emits command_updated event", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });
      await manager.addCommand(queue.id, {
        prompt: "Old prompt",
      });

      let eventReceived = false;
      eventEmitter.on("command_updated", (event) => {
        eventReceived = true;
        expect(event.type).toBe("command_updated");
        expect(event.queueId).toBe(queue.id);
        expect(event.commandIndex).toBe(0);
      });

      await manager.updateCommand(queue.id, 0, {
        prompt: "New prompt",
      });

      expect(eventReceived).toBe(true);
    });
  });

  describe("removeCommand", () => {
    test("removes command from queue", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });
      await manager.addCommand(queue.id, {
        prompt: "Command 1",
      });
      await manager.addCommand(queue.id, {
        prompt: "Command 2",
      });

      await manager.removeCommand(queue.id, 0);

      const updated = await manager.getQueue(queue.id);
      expect(updated?.commands).toHaveLength(1);
      expect(updated?.commands[0]?.prompt).toBe("Command 2");
    });

    test("throws error if queue not found", async () => {
      await expect(manager.removeCommand("nonexistent", 0)).rejects.toThrow(
        "Queue nonexistent not found",
      );
    });

    test("throws error if command index invalid", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });

      await expect(manager.removeCommand(queue.id, 0)).rejects.toThrow(
        "Command at index 0 not found",
      );
    });

    test("throws error if queue is not pending or paused", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });
      await manager.addCommand(queue.id, {
        prompt: "Run tests",
      });

      // Set status to running
      const runningQueue: CommandQueue = {
        ...(await manager.getQueue(queue.id))!,
        status: "running",
        updatedAt: container.clock.now().toISOString(),
      };
      await repository.save(runningQueue);

      await expect(manager.removeCommand(queue.id, 0)).rejects.toThrow(
        "Cannot remove commands from queue with running status",
      );
    });

    test("emits command_removed event", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });
      const command = await manager.addCommand(queue.id, {
        prompt: "Command 1",
      });

      let eventReceived = false;
      eventEmitter.on("command_removed", (event) => {
        eventReceived = true;
        expect(event.type).toBe("command_removed");
        expect(event.queueId).toBe(queue.id);
        expect(event.commandId).toBe(command.id);
        expect(event.commandIndex).toBe(0);
      });

      await manager.removeCommand(queue.id, 0);

      expect(eventReceived).toBe(true);
    });
  });

  describe("reorderCommand", () => {
    test("reorders command within queue", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });
      await manager.addCommand(queue.id, {
        prompt: "Command 1",
      });
      await manager.addCommand(queue.id, {
        prompt: "Command 2",
      });
      await manager.addCommand(queue.id, {
        prompt: "Command 3",
      });

      await manager.reorderCommand(queue.id, 2, 0);

      const updated = await manager.getQueue(queue.id);
      expect(updated?.commands[0]?.prompt).toBe("Command 3");
      expect(updated?.commands[1]?.prompt).toBe("Command 1");
      expect(updated?.commands[2]?.prompt).toBe("Command 2");
    });

    test("throws error if queue not found", async () => {
      await expect(manager.reorderCommand("nonexistent", 0, 1)).rejects.toThrow(
        "Queue nonexistent not found",
      );
    });

    test("throws error if command index invalid", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });

      await expect(manager.reorderCommand(queue.id, 0, 1)).rejects.toThrow(
        "Command at index 0 not found",
      );
    });

    test("throws error if queue is not pending or paused", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });
      await manager.addCommand(queue.id, {
        prompt: "Command 1",
      });
      await manager.addCommand(queue.id, {
        prompt: "Command 2",
      });

      // Set status to running
      const runningQueue: CommandQueue = {
        ...(await manager.getQueue(queue.id))!,
        status: "running",
        updatedAt: container.clock.now().toISOString(),
      };
      await repository.save(runningQueue);

      await expect(manager.reorderCommand(queue.id, 0, 1)).rejects.toThrow(
        "Cannot reorder commands in queue with running status",
      );
    });

    test("emits command_reordered event", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });
      const command = await manager.addCommand(queue.id, {
        prompt: "Command 1",
      });
      await manager.addCommand(queue.id, {
        prompt: "Command 2",
      });

      let eventReceived = false;
      eventEmitter.on("command_reordered", (event) => {
        eventReceived = true;
        expect(event.type).toBe("command_reordered");
        expect(event.queueId).toBe(queue.id);
        expect(event.commandId).toBe(command.id);
        expect(event.fromIndex).toBe(0);
        expect(event.toIndex).toBe(1);
      });

      await manager.reorderCommand(queue.id, 0, 1);

      expect(eventReceived).toBe(true);
    });
  });

  describe("toggleSessionMode", () => {
    test("toggles session mode from continue to new", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });
      await manager.addCommand(queue.id, {
        prompt: "Run tests",
        sessionMode: "continue",
      });

      const updated = await manager.toggleSessionMode(queue.id, 0);

      expect(updated.sessionMode).toBe("new");
    });

    test("toggles session mode from new to continue", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });
      await manager.addCommand(queue.id, {
        prompt: "Run tests",
        sessionMode: "new",
      });

      const updated = await manager.toggleSessionMode(queue.id, 0);

      expect(updated.sessionMode).toBe("continue");
    });

    test("throws error if queue not found", async () => {
      await expect(manager.toggleSessionMode("nonexistent", 0)).rejects.toThrow(
        "Queue nonexistent not found",
      );
    });

    test("throws error if command index invalid", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });

      await expect(manager.toggleSessionMode(queue.id, 0)).rejects.toThrow(
        "Command at index 0 not found",
      );
    });

    test("throws error if queue is not pending or paused", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });
      await manager.addCommand(queue.id, {
        prompt: "Run tests",
      });

      // Set status to completed
      const completedQueue: CommandQueue = {
        ...(await manager.getQueue(queue.id))!,
        status: "completed",
        updatedAt: container.clock.now().toISOString(),
      };
      await repository.save(completedQueue);

      await expect(manager.toggleSessionMode(queue.id, 0)).rejects.toThrow(
        "Cannot toggle session mode in queue with completed status",
      );
    });

    test("emits command_mode_changed event", async () => {
      const queue = await manager.createQueue({
        projectPath: "/project/path",
        name: "Test Queue",
      });
      const command = await manager.addCommand(queue.id, {
        prompt: "Run tests",
        sessionMode: "continue",
      });

      let eventReceived = false;
      eventEmitter.on("command_mode_changed", (event) => {
        eventReceived = true;
        expect(event.type).toBe("command_mode_changed");
        expect(event.queueId).toBe(queue.id);
        expect(event.commandId).toBe(command.id);
        expect(event.commandIndex).toBe(0);
        expect(event.sessionMode).toBe("new");
      });

      await manager.toggleSessionMode(queue.id, 0);

      expect(eventReceived).toBe(true);
    });
  });
});
