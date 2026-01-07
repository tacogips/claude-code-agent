/**
 * Tests for Queue Recovery module.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { QueueRecovery } from "./recovery";
import { QueueManager } from "./manager";
import type { Container } from "../../container";
import type { CommandQueue } from "../../repository/queue-repository";
import { InMemoryQueueRepository } from "../../repository/in-memory/queue-repository";
import {
  InMemoryGroupRepository,
  InMemoryBookmarkRepository,
} from "../../repository/in-memory";
import { EventEmitter } from "../events/emitter";
import { MockClock } from "../../test/mocks/clock";
import { MockProcessManager } from "../../test/mocks/process-manager";
import { MockFileSystem } from "../../test/mocks/filesystem";

describe("QueueRecovery", () => {
  let container: Container;
  let repository: InMemoryQueueRepository;
  let eventEmitter: EventEmitter;
  let manager: QueueManager;
  let recovery: QueueRecovery;
  let clock: MockClock;

  beforeEach(() => {
    clock = new MockClock(new Date("2026-01-06T12:00:00Z"));
    const processManager = new MockProcessManager();
    const filesystem = new MockFileSystem();

    container = {
      clock,
      processManager,
      fileSystem: filesystem,
      groupRepository: new InMemoryGroupRepository(),
      queueRepository: new InMemoryQueueRepository(),
      bookmarkRepository: new InMemoryBookmarkRepository(),
    };

    repository = new InMemoryQueueRepository();
    eventEmitter = new EventEmitter();
    manager = new QueueManager(container, repository, eventEmitter);
    recovery = new QueueRecovery(container, manager);
  });

  describe("recoverStaleQueues", () => {
    it("should return empty result when no running queues exist", async () => {
      const result = await recovery.recoverStaleQueues();

      expect(result).toEqual({
        staleQueuesFound: 0,
        queuesRecovered: 0,
        recoveredQueueIds: [],
      });
    });

    it("should mark single running queue as paused", async () => {
      // Create a running queue
      const queue = await manager.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      // Manually update status to running
      const runningQueue: CommandQueue = {
        ...queue,
        status: "running",
        startedAt: "2026-01-06T11:00:00Z",
      };
      await repository.save(runningQueue);

      // Run recovery
      const result = await recovery.recoverStaleQueues();

      expect(result.staleQueuesFound).toBe(1);
      expect(result.queuesRecovered).toBe(1);
      expect(result.recoveredQueueIds).toEqual([queue.id]);

      // Verify queue is now paused
      const recovered = await manager.getQueue(queue.id);
      expect(recovered?.status).toBe("paused");
      expect(recovered?.updatedAt).toBe("2026-01-06T12:00:00.000Z");
    });

    it("should mark multiple running queues as paused", async () => {
      // Create multiple running queues
      const queue1 = await manager.createQueue({
        projectPath: "/test/project1",
        name: "Queue 1",
      });
      const queue2 = await manager.createQueue({
        projectPath: "/test/project2",
        name: "Queue 2",
      });
      const queue3 = await manager.createQueue({
        projectPath: "/test/project3",
        name: "Queue 3",
      });

      // Update all to running
      for (const queue of [queue1, queue2, queue3]) {
        const runningQueue: CommandQueue = {
          ...queue,
          status: "running",
          startedAt: "2026-01-06T11:00:00Z",
        };
        await repository.save(runningQueue);
      }

      // Run recovery
      const result = await recovery.recoverStaleQueues();

      expect(result.staleQueuesFound).toBe(3);
      expect(result.queuesRecovered).toBe(3);
      expect(result.recoveredQueueIds).toHaveLength(3);
      expect(result.recoveredQueueIds).toContain(queue1.id);
      expect(result.recoveredQueueIds).toContain(queue2.id);
      expect(result.recoveredQueueIds).toContain(queue3.id);

      // Verify all queues are paused
      for (const queue of [queue1, queue2, queue3]) {
        const recovered = await manager.getQueue(queue.id);
        expect(recovered?.status).toBe("paused");
      }
    });

    it("should not affect non-running queues", async () => {
      // Create queues in various states
      const pendingQueue = await manager.createQueue({
        projectPath: "/test/pending",
        name: "Pending Queue",
      });

      const completedQueue = await manager.createQueue({
        projectPath: "/test/completed",
        name: "Completed Queue",
      });
      await repository.save({ ...completedQueue, status: "completed" });

      const pausedQueue = await manager.createQueue({
        projectPath: "/test/paused",
        name: "Paused Queue",
      });
      await repository.save({ ...pausedQueue, status: "paused" });

      const runningQueue = await manager.createQueue({
        projectPath: "/test/running",
        name: "Running Queue",
      });
      await repository.save({
        ...runningQueue,
        status: "running",
        startedAt: "2026-01-06T11:00:00Z",
      });

      // Run recovery
      const result = await recovery.recoverStaleQueues();

      // Only the running queue should be affected
      expect(result.staleQueuesFound).toBe(1);
      expect(result.queuesRecovered).toBe(1);

      // Verify other queues unchanged
      const pending = await manager.getQueue(pendingQueue.id);
      expect(pending?.status).toBe("pending");

      const completed = await manager.getQueue(completedQueue.id);
      expect(completed?.status).toBe("completed");

      const paused = await manager.getQueue(pausedQueue.id);
      expect(paused?.status).toBe("paused");

      // Running queue should now be paused
      const recovered = await manager.getQueue(runningQueue.id);
      expect(recovered?.status).toBe("paused");
    });

    it("should preserve queue data when marking as paused", async () => {
      // Create a running queue with commands
      const queue = await manager.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      await manager.addCommand(queue.id, {
        prompt: "Command 1",
        sessionMode: "continue",
      });
      await manager.addCommand(queue.id, {
        prompt: "Command 2",
        sessionMode: "new",
      });

      // Update to running state
      const updatedQueue = await manager.getQueue(queue.id);
      if (updatedQueue === null) throw new Error("Queue not found");

      const runningQueue: CommandQueue = {
        ...updatedQueue,
        status: "running",
        currentIndex: 1,
        currentSessionId: "session-123",
        startedAt: "2026-01-06T11:00:00Z",
      };
      await repository.save(runningQueue);

      // Run recovery
      await recovery.recoverStaleQueues();

      // Verify all data preserved except status
      const recovered = await manager.getQueue(queue.id);
      expect(recovered).not.toBeNull();
      if (recovered === null) throw new Error("Queue not found");

      expect(recovered.status).toBe("paused");
      expect(recovered.id).toBe(queue.id);
      expect(recovered.name).toBe("Test Queue");
      expect(recovered.projectPath).toBe("/test/project");
      expect(recovered.currentIndex).toBe(1);
      expect(recovered.currentSessionId).toBe("session-123");
      expect(recovered.startedAt).toBe("2026-01-06T11:00:00Z");
      expect(recovered.commands).toHaveLength(2);
      expect(recovered.commands[0]?.prompt).toBe("Command 1");
      expect(recovered.commands[1]?.prompt).toBe("Command 2");
    });

    it("should handle recovery errors gracefully", async () => {
      // Create a running queue
      const queue = await manager.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      const runningQueue: CommandQueue = {
        ...queue,
        status: "running",
        startedAt: "2026-01-06T11:00:00Z",
      };
      await repository.save(runningQueue);

      // Mock repository.save to throw error when trying to pause
      const originalSave = repository.save.bind(repository);
      repository.save = async (q: CommandQueue) => {
        // Only allow saving non-paused queues (initial state)
        // Throw error when trying to mark as paused
        if (q.status === "paused" && q.id === queue.id) {
          throw new Error("Simulated save error");
        }
        return originalSave(q);
      };

      // Recovery should not throw
      const result = await recovery.recoverStaleQueues();

      // Should report finding the queue but not recovering it
      expect(result.staleQueuesFound).toBe(1);
      expect(result.queuesRecovered).toBe(0);
      expect(result.recoveredQueueIds).toHaveLength(0);

      // Queue should still be running (not recovered)
      const unchanged = await manager.getQueue(queue.id);
      expect(unchanged?.status).toBe("running");

      // Restore original save for cleanup
      repository.save = originalSave;
    });

    it("should update updatedAt timestamp when marking as paused", async () => {
      // Create a running queue
      const queue = await manager.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      const runningQueue: CommandQueue = {
        ...queue,
        status: "running",
        updatedAt: "2026-01-06T10:00:00Z",
        startedAt: "2026-01-06T11:00:00Z",
      };
      await repository.save(runningQueue);

      // Advance time
      clock.setTime(new Date("2026-01-06T14:30:00Z"));

      // Run recovery
      await recovery.recoverStaleQueues();

      // Verify updatedAt is current time
      const recovered = await manager.getQueue(queue.id);
      expect(recovered?.updatedAt).toBe("2026-01-06T14:30:00.000Z");
    });
  });

  describe("isProcessAlive (private method behavior)", () => {
    // These tests verify the internal logic without directly testing private methods
    // The isProcessAlive method is included for future enhancement

    it("should mark queue as paused regardless of process state", async () => {
      // Since we don't store PIDs yet, all running queues are considered stale
      const queue = await manager.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      const runningQueue: CommandQueue = {
        ...queue,
        status: "running",
        startedAt: "2026-01-06T11:00:00Z",
      };
      await repository.save(runningQueue);

      const result = await recovery.recoverStaleQueues();

      expect(result.queuesRecovered).toBe(1);
      const recovered = await manager.getQueue(queue.id);
      expect(recovered?.status).toBe("paused");
    });
  });

  describe("edge cases", () => {
    it("should handle queue with no commands", async () => {
      const queue = await manager.createQueue({
        projectPath: "/test/project",
        name: "Empty Queue",
      });

      const runningQueue: CommandQueue = {
        ...queue,
        status: "running",
        startedAt: "2026-01-06T11:00:00Z",
      };
      await repository.save(runningQueue);

      const result = await recovery.recoverStaleQueues();

      expect(result.queuesRecovered).toBe(1);
      const recovered = await manager.getQueue(queue.id);
      expect(recovered?.status).toBe("paused");
      expect(recovered?.commands).toHaveLength(0);
    });

    it("should handle queue at beginning (currentIndex = 0)", async () => {
      const queue = await manager.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      await manager.addCommand(queue.id, { prompt: "Command 1" });

      const updatedQueue = await manager.getQueue(queue.id);
      if (updatedQueue === null) throw new Error("Queue not found");

      const runningQueue: CommandQueue = {
        ...updatedQueue,
        status: "running",
        currentIndex: 0,
        startedAt: "2026-01-06T11:00:00Z",
      };
      await repository.save(runningQueue);

      const result = await recovery.recoverStaleQueues();

      expect(result.queuesRecovered).toBe(1);
      const recovered = await manager.getQueue(queue.id);
      expect(recovered?.status).toBe("paused");
      expect(recovered?.currentIndex).toBe(0);
    });

    it("should handle queue at end (currentIndex = commands.length)", async () => {
      const queue = await manager.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      await manager.addCommand(queue.id, { prompt: "Command 1" });
      await manager.addCommand(queue.id, { prompt: "Command 2" });

      const updatedQueue = await manager.getQueue(queue.id);
      if (updatedQueue === null) throw new Error("Queue not found");

      const runningQueue: CommandQueue = {
        ...updatedQueue,
        status: "running",
        currentIndex: 2, // At end
        startedAt: "2026-01-06T11:00:00Z",
      };
      await repository.save(runningQueue);

      const result = await recovery.recoverStaleQueues();

      expect(result.queuesRecovered).toBe(1);
      const recovered = await manager.getQueue(queue.id);
      expect(recovered?.status).toBe("paused");
      expect(recovered?.currentIndex).toBe(2);
    });
  });

  describe("concurrent recovery", () => {
    it("should handle running recovery multiple times safely", async () => {
      const queue = await manager.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      const runningQueue: CommandQueue = {
        ...queue,
        status: "running",
        startedAt: "2026-01-06T11:00:00Z",
      };
      await repository.save(runningQueue);

      // Run recovery twice
      const result1 = await recovery.recoverStaleQueues();
      const result2 = await recovery.recoverStaleQueues();

      // First run should find and recover
      expect(result1.staleQueuesFound).toBe(1);
      expect(result1.queuesRecovered).toBe(1);

      // Second run should find nothing (already paused)
      expect(result2.staleQueuesFound).toBe(0);
      expect(result2.queuesRecovered).toBe(0);
    });
  });
});
