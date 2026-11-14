/**
 * Tests for QueueRunner.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { QueueRunner } from "./runner";
import { QueueManager } from "./manager";
import { EventEmitter } from "../events/emitter";
import { InMemoryQueueRepository } from "../../repository/in-memory/queue-repository";
import { createTestContainer } from "../../container";
import type { ManagedProcess } from "../../interfaces/process-manager";

describe("QueueRunner", () => {
  let container: ReturnType<typeof createTestContainer>;
  let repository: InMemoryQueueRepository;
  let manager: QueueManager;
  let eventEmitter: EventEmitter;
  let runner: QueueRunner;

  beforeEach(() => {
    container = createTestContainer();
    repository = new InMemoryQueueRepository();
    eventEmitter = new EventEmitter();
    manager = new QueueManager(container, repository, eventEmitter);
    runner = new QueueRunner(container, repository, manager, eventEmitter);
  });

  describe("run", () => {
    it("should execute all pending commands sequentially", async () => {
      // Create a queue with two commands
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
        sessionMode: "continue",
      });

      // Mock process spawning to return success
      const mockProcesses: ManagedProcess[] = [];

      container.processManager.spawn = (_command, _args, _options) => {
        const mockProcess: ManagedProcess = {
          pid: mockProcesses.length + 1,
          stdout: (async function* () {
            yield JSON.stringify({
              sessionId: `session-${mockProcesses.length + 1}`,
            });
          })(),
          stderr: (async function* () {
            // Empty stderr
          })(),
          exitCode: Promise.resolve(0),
          kill: () => {},
        };
        mockProcesses.push(mockProcess);
        return mockProcess;
      };

      const commandStartEvents: Array<{
        commandIndex: number;
        prompt: string;
      }> = [];
      const commandCompleteEvents: Array<{ commandIndex: number }> = [];

      eventEmitter.on("command_started", (event) => {
        commandStartEvents.push({
          commandIndex: event.commandIndex,
          prompt: event.prompt,
        });
      });

      eventEmitter.on("command_completed", (event) => {
        commandCompleteEvents.push({
          commandIndex: event.commandIndex,
        });
      });

      const result = await runner.run(queue.id);

      expect(result.status).toBe("completed");
      expect(result.completedCommands).toBe(2);
      expect(result.failedCommands).toBe(0);
      expect(result.skippedCommands).toBe(0);

      // Verify commands were executed in order
      expect(commandStartEvents).toHaveLength(2);
      expect(commandStartEvents[0]?.prompt).toBe("Command 1");
      expect(commandStartEvents[1]?.prompt).toBe("Command 2");

      expect(commandCompleteEvents).toHaveLength(2);

      // Verify queue state
      const updatedQueue = await manager.getQueue(queue.id);
      expect(updatedQueue?.status).toBe("completed");
      expect(updatedQueue?.commands[0]?.status).toBe("completed");
      expect(updatedQueue?.commands[1]?.status).toBe("completed");
    });

    it("should handle command failure with stopOnError", async () => {
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
        sessionMode: "continue",
      });

      let processCount = 0;

      container.processManager.spawn = (_command, _args, _options) => {
        processCount++;
        const mockProcess: ManagedProcess = {
          pid: processCount,
          stdout: (async function* () {
            yield JSON.stringify({ sessionId: `session-${processCount}` });
          })(),
          stderr: (async function* () {
            // Empty stderr
          })(),
          exitCode: Promise.resolve(processCount === 1 ? 1 : 0), // First command fails
          kill: () => {},
        };
        return mockProcess;
      };

      const result = await runner.run(queue.id);

      expect(result.status).toBe("failed");
      expect(result.completedCommands).toBe(0);
      expect(result.failedCommands).toBe(1);
      expect(result.skippedCommands).toBe(1); // Second command skipped

      // Verify queue state
      const updatedQueue = await manager.getQueue(queue.id);
      expect(updatedQueue?.status).toBe("failed");
      expect(updatedQueue?.commands[0]?.status).toBe("failed");
      expect(updatedQueue?.commands[1]?.status).toBe("skipped");
    });

    it("should start new session when sessionMode is 'new'", async () => {
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
        sessionMode: "new", // Start new session
      });

      const spawnCalls: Array<{ command: string; args: string[] }> = [];

      container.processManager.spawn = (command, args, _options) => {
        spawnCalls.push({ command, args: [...args] });
        const mockProcess: ManagedProcess = {
          pid: spawnCalls.length,
          stdout: (async function* () {
            yield JSON.stringify({ sessionId: `session-${spawnCalls.length}` });
          })(),
          stderr: (async function* () {
            // Empty stderr
          })(),
          exitCode: Promise.resolve(0),
          kill: () => {},
        };
        return mockProcess;
      };

      await runner.run(queue.id);

      // First command should NOT have --resume (first command always starts new)
      expect(spawnCalls[0]?.args).not.toContain("--resume");

      // Second command should NOT have --resume (sessionMode='new')
      expect(spawnCalls[1]?.args).not.toContain("--resume");
    });

    it("should continue session when sessionMode is 'continue'", async () => {
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
        sessionMode: "continue", // Continue session
      });

      const spawnCalls: Array<{ command: string; args: string[] }> = [];

      container.processManager.spawn = (command, args, _options) => {
        spawnCalls.push({ command, args: [...args] });
        const mockProcess: ManagedProcess = {
          pid: spawnCalls.length,
          stdout: (async function* () {
            yield JSON.stringify({ sessionId: `session-1` });
          })(),
          stderr: (async function* () {
            // Empty stderr
          })(),
          exitCode: Promise.resolve(0),
          kill: () => {},
        };
        return mockProcess;
      };

      await runner.run(queue.id);

      // First command should NOT have --resume (first command)
      expect(spawnCalls[0]?.args).not.toContain("--resume");

      // Second command should have --resume (sessionMode='continue')
      expect(spawnCalls[1]?.args).toContain("--resume");
    });

    it("should emit queue_started and queue_completed events", async () => {
      const queue = await manager.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      await manager.addCommand(queue.id, {
        prompt: "Command 1",
        sessionMode: "continue",
      });

      container.processManager.spawn = (_command, _args, _options) => {
        const mockProcess: ManagedProcess = {
          pid: 1,
          stdout: (async function* () {
            yield JSON.stringify({ sessionId: "session-1" });
          })(),
          stderr: (async function* () {
            // Empty stderr
          })(),
          exitCode: Promise.resolve(0),
          kill: () => {},
        };
        return mockProcess;
      };

      const queueStartedEvents: unknown[] = [];
      const queueCompletedEvents: unknown[] = [];

      eventEmitter.on("queue_started", (event) => {
        queueStartedEvents.push(event);
      });

      eventEmitter.on("queue_completed", (event) => {
        queueCompletedEvents.push(event);
      });

      await runner.run(queue.id);

      expect(queueStartedEvents).toHaveLength(1);
      expect(queueCompletedEvents).toHaveLength(1);
    });
  });

  describe("pause", () => {
    it("should pause a running queue", async () => {
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
        sessionMode: "continue",
      });

      let pauseCalled = false;
      let resolveExitCode: ((code: number) => void) | undefined;
      const exitCodePromise = new Promise<number>((resolve) => {
        resolveExitCode = resolve;
      });

      container.processManager.spawn = (_command, _args, _options) => {
        const mockProcess: ManagedProcess = {
          pid: 1,
          stdout: (async function* () {
            yield JSON.stringify({ sessionId: "session-1" });
          })(),
          stderr: (async function* () {
            // Empty stderr
          })(),
          exitCode: exitCodePromise,
          kill: (signal) => {
            if (signal === "SIGTERM") {
              pauseCalled = true;
              // Resolve exit code to allow command to complete
              resolveExitCode?.(0);
            }
          },
        };
        return mockProcess;
      };

      // Start running in background
      const runPromise = runner.run(queue.id);

      // Wait for command to start (process is spawned after this event)
      await eventEmitter.waitFor("command_started");

      // Small delay to ensure process is registered in runningProcesses
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Pause the queue
      await runner.pause(queue.id);

      const result = await runPromise;

      expect(result.status).toBe("paused");
      expect(pauseCalled).toBe(true);
    });

    it("should throw error when pausing non-running queue", async () => {
      const queue = await manager.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      await expect(runner.pause(queue.id)).rejects.toThrow(
        "Cannot pause queue in pending status",
      );
    });
  });

  describe("resume", () => {
    it("should resume a paused queue", async () => {
      const queue = await manager.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      await manager.addCommand(queue.id, {
        prompt: "Command 1",
        sessionMode: "continue",
      });

      // Manually set queue to paused state
      await repository.save({
        ...queue,
        status: "paused",
        currentIndex: 0,
      });

      container.processManager.spawn = (_command, _args, _options) => {
        const mockProcess: ManagedProcess = {
          pid: 1,
          stdout: (async function* () {
            yield JSON.stringify({ sessionId: "session-1" });
          })(),
          stderr: (async function* () {
            // Empty stderr
          })(),
          exitCode: Promise.resolve(0),
          kill: () => {},
        };
        return mockProcess;
      };

      const queueResumedEvents: unknown[] = [];
      eventEmitter.on("queue_resumed", (event) => {
        queueResumedEvents.push(event);
      });

      const result = await runner.resume(queue.id);

      expect(result.status).toBe("completed");
      expect(queueResumedEvents).toHaveLength(1);
    });

    it("should throw error when resuming non-paused queue", async () => {
      const queue = await manager.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      await expect(runner.resume(queue.id)).rejects.toThrow(
        "Cannot resume queue in pending status",
      );
    });
  });

  describe("stop", () => {
    it("should stop a running queue and skip remaining commands", async () => {
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
        sessionMode: "continue",
      });

      let stopCalled = false;
      let resolveExitCode: ((code: number) => void) | undefined;
      const exitCodePromise = new Promise<number>((resolve) => {
        resolveExitCode = resolve;
      });

      container.processManager.spawn = (_command, _args, _options) => {
        const mockProcess: ManagedProcess = {
          pid: 1,
          stdout: (async function* () {
            yield JSON.stringify({ sessionId: "session-1" });
          })(),
          stderr: (async function* () {
            // Empty stderr
          })(),
          exitCode: exitCodePromise,
          kill: (signal) => {
            if (signal === "SIGTERM") {
              stopCalled = true;
              // Resolve exit code to allow command to complete
              resolveExitCode?.(0);
            }
          },
        };
        return mockProcess;
      };

      // Start running in background
      const runPromise = runner.run(queue.id);

      // Wait for command to start (process is spawned after this event)
      await eventEmitter.waitFor("command_started");

      // Small delay to ensure process is registered in runningProcesses
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Stop the queue
      await runner.stop(queue.id);

      const result = await runPromise;

      expect(result.status).toBe("stopped");
      expect(result.skippedCommands).toBeGreaterThan(0);
      expect(stopCalled).toBe(true);
    });

    it("should throw error when stopping non-running/paused queue", async () => {
      const queue = await manager.createQueue({
        projectPath: "/test/project",
        name: "Test Queue",
      });

      await expect(runner.stop(queue.id)).rejects.toThrow(
        "Cannot stop queue in pending status",
      );
    });
  });
});
