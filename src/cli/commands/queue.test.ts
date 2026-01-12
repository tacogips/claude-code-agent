/**
 * Tests for queue CLI commands.
 *
 * Covers TEST-004, TEST-005, TEST-006 from cli-commands-unit test plan.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { registerQueueCommands } from "./queue";
import type { ClaudeCodeAgent } from "../../sdk/agent";
import type { CommandQueue, QueueCommand } from "../../repository";
import * as output from "../output";

describe("Queue Commands", () => {
  let program: Command;
  let mockAgent: Partial<ClaudeCodeAgent>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let printSuccessSpy: ReturnType<typeof vi.spyOn>;
  let printErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create fresh program for each test
    program = new Command();
    program.exitOverride(); // Prevent actual process.exit

    // Create mock agent with queue operations
    mockAgent = {
      queues: {
        createQueue: vi.fn(),
        listQueues: vi.fn(),
        getQueue: vi.fn(),
        deleteQueue: vi.fn(),
        addCommand: vi.fn(),
        updateCommand: vi.fn(),
        toggleSessionMode: vi.fn(),
        removeCommand: vi.fn(),
        reorderCommand: vi.fn(),
      } as any,
      queueRunner: {
        run: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        stop: vi.fn(),
      } as any,
    };

    // Spy on process.exit, console.log, and output functions
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any);
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    printSuccessSpy = vi.spyOn(output, "printSuccess").mockImplementation(() => {});
    printErrorSpy = vi.spyOn(output, "printError").mockImplementation(() => {});

    // Register commands
    registerQueueCommands(program, async () => mockAgent as ClaudeCodeAgent);

    // Clear mock calls from registration
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("TEST-004: Queue CRUD Operations", () => {
    test("creates queue with required --project option", async () => {
      const mockQueue: CommandQueue = {
        id: "queue-123",
        projectPath: "/test/project",
        name: "test-queue",
        commands: [],
        status: "pending",
        currentIndex: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      (mockAgent.queues!.createQueue as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueue);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "create",
        "test-queue",
        "--project",
        "/test/project",
      ]);

      expect(mockAgent.queues!.createQueue).toHaveBeenCalledWith({
        projectPath: "/test/project",
        name: "test-queue",
      });

      expect(printSuccessSpy).toHaveBeenCalledWith(
        `Queue created: ${mockQueue.id}`,
      );
    });

    test("creates queue with optional --name", async () => {
      const mockQueue: CommandQueue = {
        id: "queue-456",
        projectPath: "/test/project",
        name: "Custom Queue Name",
        commands: [],
        status: "pending",
        currentIndex: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      (mockAgent.queues!.createQueue as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueue);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "create",
        "test-queue",
        "--project",
        "/test/project",
        "--name",
        "Custom Queue Name",
      ]);

      expect(mockAgent.queues!.createQueue).toHaveBeenCalledWith({
        projectPath: "/test/project",
        name: "Custom Queue Name",
      });
    });

    test("lists all queues when no filter provided", async () => {
      const mockQueues: CommandQueue[] = [
        {
          id: "queue-1",
          projectPath: "/project1",
          name: "Queue 1",
          commands: [
            {
              id: "cmd-1",
              prompt: "Test prompt",
              sessionMode: "continue",
              status: "pending",
            } as QueueCommand,
          ],
          status: "pending",
          currentIndex: 0,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "queue-2",
          projectPath: "/project2",
          name: "Queue 2",
          commands: [],
          status: "running",
          currentIndex: 0,
          createdAt: "2024-01-02T00:00:00Z",
          updatedAt: "2024-01-02T00:00:00Z",
        },
      ];

      (mockAgent.queues!.listQueues as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueues);

      await program.parseAsync(["node", "test", "queue", "list"]);

      expect(mockAgent.queues!.listQueues).toHaveBeenCalledWith({
        filter: undefined,
      });
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test("lists queues with --status filter", async () => {
      const mockQueues: CommandQueue[] = [
        {
          id: "queue-1",
          projectPath: "/project1",
          name: "Running Queue",
          commands: [],
          status: "running",
          currentIndex: 0,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      (mockAgent.queues!.listQueues as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueues);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "list",
        "--status",
        "running",
      ]);

      expect(mockAgent.queues!.listQueues).toHaveBeenCalledWith({
        filter: { status: "running" },
      });
    });

    test("displays 'No queues found' for empty results", async () => {
      (mockAgent.queues!.listQueues as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await program.parseAsync(["node", "test", "queue", "list"]);

      expect(consoleLogSpy).toHaveBeenCalledWith("No queues found");
    });

    test("shows queue details with commands table", async () => {
      const mockQueue: CommandQueue = {
        id: "queue-123",
        projectPath: "/test/project",
        name: "Test Queue",
        commands: [
          {
            id: "cmd-1",
            prompt: "First command",
            sessionMode: "continue",
            status: "pending",
          } as QueueCommand,
          {
            id: "cmd-2",
            prompt: "Second command with a very long prompt that should be truncated in the display",
            sessionMode: "new",
            status: "pending",
          } as QueueCommand,
        ],
        status: "pending",
        currentIndex: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      (mockAgent.queues!.getQueue as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueue);

      await program.parseAsync(["node", "test", "queue", "show", "queue-123"]);

      expect(mockAgent.queues!.getQueue).toHaveBeenCalledWith("queue-123");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Test Queue"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("pending"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Commands:"),
      );
    });

    test("exits with code 1 for nonexistent queue on show", async () => {
      (mockAgent.queues!.getQueue as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "show",
          "nonexistent",
        ]);
      } catch (error) {
        // Expected to throw due to process.exit mock
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Queue not found: nonexistent",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("formats show output as JSON when --format json", async () => {
      const mockQueue: CommandQueue = {
        id: "queue-123",
        projectPath: "/test/project",
        name: "Test Queue",
        commands: [],
        status: "pending",
        currentIndex: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      (mockAgent.queues!.getQueue as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueue);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "show",
        "queue-123",
        "--format",
        "json",
      ]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"id": "queue-123"'),
      );
    });

    test("deletes existing queue with --force", async () => {
      (mockAgent.queues!.deleteQueue as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "delete",
        "queue-123",
        "--force",
      ]);

      expect(mockAgent.queues!.deleteQueue).toHaveBeenCalledWith(
        "queue-123",
        true,
      );
      expect(printSuccessSpy).toHaveBeenCalledWith(
        "Queue deleted: queue-123",
      );
    });

    test("deletes queue without --force (confirmation passed to SDK)", async () => {
      (mockAgent.queues!.deleteQueue as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "delete",
        "queue-123",
      ]);

      expect(mockAgent.queues!.deleteQueue).toHaveBeenCalledWith(
        "queue-123",
        false,
      );
    });

    test("exits with code 1 when deleting nonexistent queue", async () => {
      (mockAgent.queues!.deleteQueue as ReturnType<typeof vi.fn>).mockResolvedValue(false);

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "delete",
          "nonexistent",
          "--force",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Queue not found: nonexistent",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("formats list output as JSON when --format json", async () => {
      const mockQueues: CommandQueue[] = [
        {
          id: "queue-1",
          projectPath: "/project1",
          name: "Queue 1",
          commands: [],
          status: "pending",
          currentIndex: 0,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      (mockAgent.queues!.listQueues as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueues);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "list",
        "--format",
        "json",
      ]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"id": "queue-1"'),
      );
    });
  });

  describe("TEST-005: Queue Execution Control", () => {
    test("runs queue with callbacks (onCommandStart, onCommandComplete, onCommandFail)", async () => {
      const mockQueue: CommandQueue = {
        id: "queue-run",
        projectPath: "/test/project",
        name: "Test Queue",
        commands: [
          {
            id: "cmd-1",
            prompt: "First command",
            sessionMode: "continue",
            status: "pending",
          } as QueueCommand,
          {
            id: "cmd-2",
            prompt: "Second command",
            sessionMode: "new",
            status: "pending",
          } as QueueCommand,
        ],
        status: "pending",
        currentIndex: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const mockResult = {
        status: "completed" as const,
        completedCommands: 2,
        failedCommands: 0,
        skippedCommands: 0,
        totalCostUsd: 1.23,
        totalDurationMs: 5000,
      };

      (mockAgent.queues!.getQueue as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueue);
      (mockAgent.queueRunner!.run as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

      await program.parseAsync(["node", "test", "queue", "run", "queue-run"]);

      // Verify run was called with callbacks
      expect(mockAgent.queueRunner!.run).toHaveBeenCalledWith(
        "queue-run",
        expect.objectContaining({
          onCommandStart: expect.any(Function),
          onCommandComplete: expect.any(Function),
          onCommandFail: expect.any(Function),
        }),
      );

      // Verify success message
      expect(printSuccessSpy).toHaveBeenCalledWith(
        "Running queue: queue-run",
      );

      // Verify results displayed
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Queue execution completed"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Status: completed"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Completed: 2"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed: 0"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Skipped: 0"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Duration: 5000ms"),
      );
    });

    test("runs queue and displays progress with callbacks", async () => {
      const mockQueue: CommandQueue = {
        id: "queue-progress",
        projectPath: "/test/project",
        name: "Progress Test",
        commands: [
          {
            id: "cmd-1",
            prompt: "First command",
            sessionMode: "continue",
            status: "pending",
          } as QueueCommand,
          {
            id: "cmd-2",
            prompt: "Second command",
            sessionMode: "new",
            status: "pending",
          } as QueueCommand,
        ],
        status: "pending",
        currentIndex: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const mockResult = {
        status: "completed" as const,
        completedCommands: 2,
        failedCommands: 0,
        skippedCommands: 0,
        totalCostUsd: 0.5,
        totalDurationMs: 3000,
      };

      (mockAgent.queues!.getQueue as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueue);

      // Mock run to call callbacks
      (mockAgent.queueRunner!.run as ReturnType<typeof vi.fn>).mockImplementation(
        async (_queueId: string, options?: any) => {
          if (options?.onCommandStart) {
            options.onCommandStart(mockQueue.commands[0]!);
          }
          if (options?.onCommandComplete) {
            options.onCommandComplete(mockQueue.commands[0]!);
          }
          if (options?.onCommandStart) {
            options.onCommandStart(mockQueue.commands[1]!);
          }
          if (options?.onCommandComplete) {
            options.onCommandComplete(mockQueue.commands[1]!);
          }
          return mockResult;
        },
      );

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "run",
        "queue-progress",
      ]);

      // Verify progress messages displayed
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[0] Starting: First command"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[0] Completed: First command"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[1] Starting: Second command"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("[1] Completed: Second command"),
      );
    });

    test("runs queue and handles command failures", async () => {
      const mockQueue: CommandQueue = {
        id: "queue-fail",
        projectPath: "/test/project",
        name: "Fail Test",
        commands: [
          {
            id: "cmd-1",
            prompt: "Failing command",
            sessionMode: "continue",
            status: "pending",
          } as QueueCommand,
        ],
        status: "pending",
        currentIndex: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const mockResult = {
        status: "failed" as const,
        completedCommands: 0,
        failedCommands: 1,
        skippedCommands: 0,
        totalCostUsd: 0.1,
        totalDurationMs: 1000,
      };

      (mockAgent.queues!.getQueue as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueue);

      // Mock run to call onCommandFail callback
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      (mockAgent.queueRunner!.run as ReturnType<typeof vi.fn>).mockImplementation(
        async (_queueId: string, options?: any) => {
          if (options?.onCommandStart) {
            options.onCommandStart(mockQueue.commands[0]!);
          }
          if (options?.onCommandFail) {
            options.onCommandFail(mockQueue.commands[0]!, "Command execution failed");
          }
          return mockResult;
        },
      );

      await program.parseAsync(["node", "test", "queue", "run", "queue-fail"]);

      // Verify failure messages displayed
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[0] Failed: Failing command"),
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error: Command execution failed"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Status: failed"),
      );

      consoleErrorSpy.mockRestore();
    });

    test("exits with code 1 for nonexistent queue on run", async () => {
      (mockAgent.queues!.getQueue as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "run",
          "nonexistent",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Queue not found: nonexistent",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("pauses running queue", async () => {
      (mockAgent.queueRunner!.pause as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await program.parseAsync(["node", "test", "queue", "pause", "queue-123"]);

      expect(mockAgent.queueRunner!.pause).toHaveBeenCalledWith("queue-123");
      expect(printSuccessSpy).toHaveBeenCalledWith("Queue paused: queue-123");
    });

    test("handles error when pausing nonexistent queue", async () => {
      (mockAgent.queueRunner!.pause as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Queue not found"),
      );

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "pause",
          "nonexistent",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("resumes paused queue and displays results", async () => {
      const mockResult = {
        status: "completed" as const,
        completedCommands: 3,
        failedCommands: 1,
        skippedCommands: 0,
        totalCostUsd: 2.5,
        totalDurationMs: 8000,
      };

      (mockAgent.queueRunner!.resume as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "resume",
        "queue-123",
      ]);

      expect(mockAgent.queueRunner!.resume).toHaveBeenCalledWith("queue-123");
      expect(printSuccessSpy).toHaveBeenCalledWith(
        "Resuming queue: queue-123",
      );

      // Verify results displayed
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Queue resumed and completed"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Status: completed"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Completed: 3"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed: 1"),
      );
    });

    test("handles error when resuming nonexistent queue", async () => {
      (mockAgent.queueRunner!.resume as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Queue not found"),
      );

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "resume",
          "nonexistent",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("stops queue permanently", async () => {
      (mockAgent.queueRunner!.stop as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await program.parseAsync(["node", "test", "queue", "stop", "queue-123"]);

      expect(mockAgent.queueRunner!.stop).toHaveBeenCalledWith("queue-123");
      expect(printSuccessSpy).toHaveBeenCalledWith("Queue stopped: queue-123");
    });

    test("handles error when stopping nonexistent queue", async () => {
      (mockAgent.queueRunner!.stop as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Queue not found"),
      );

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "stop",
          "nonexistent",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("displays execution results with all metrics", async () => {
      const mockQueue: CommandQueue = {
        id: "queue-metrics",
        projectPath: "/test/project",
        name: "Metrics Test",
        commands: [
          {
            id: "cmd-1",
            prompt: "Command 1",
            sessionMode: "continue",
            status: "pending",
          } as QueueCommand,
          {
            id: "cmd-2",
            prompt: "Command 2",
            sessionMode: "new",
            status: "pending",
          } as QueueCommand,
          {
            id: "cmd-3",
            prompt: "Command 3",
            sessionMode: "continue",
            status: "pending",
          } as QueueCommand,
        ],
        status: "pending",
        currentIndex: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      const mockResult = {
        status: "stopped" as const,
        completedCommands: 2,
        failedCommands: 0,
        skippedCommands: 1,
        totalCostUsd: 1.5,
        totalDurationMs: 4500,
      };

      (mockAgent.queues!.getQueue as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueue);
      (mockAgent.queueRunner!.run as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "run",
        "queue-metrics",
      ]);

      // Verify all result metrics displayed
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Status: stopped"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Completed: 2"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed: 0"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Skipped: 1"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Duration: 4500ms"),
      );
    });
  });

  describe("TEST-006: Queue Command Management", () => {
    test("adds command with --prompt and --session-mode", async () => {
      const mockCommand: QueueCommand = {
        id: "cmd-123",
        prompt: "Test command prompt",
        sessionMode: "new",
        status: "pending",
      };

      const mockQueue: CommandQueue = {
        id: "queue-123",
        projectPath: "/test/project",
        name: "Test Queue",
        commands: [mockCommand],
        status: "pending",
        currentIndex: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      (mockAgent.queues!.addCommand as ReturnType<typeof vi.fn>).mockResolvedValue(mockCommand);
      (mockAgent.queues!.getQueue as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueue);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "command",
        "add",
        "queue-123",
        "--prompt",
        "Test command prompt",
        "--session-mode",
        "new",
      ]);

      expect(mockAgent.queues!.addCommand).toHaveBeenCalledWith("queue-123", {
        prompt: "Test command prompt",
        sessionMode: "new",
        position: undefined,
      });
      expect(printSuccessSpy).toHaveBeenCalledWith("Command added at index 0");
    });

    test("adds command at specific --position", async () => {
      const mockCommand: QueueCommand = {
        id: "cmd-456",
        prompt: "Inserted command",
        sessionMode: "continue",
        status: "pending",
      };

      const mockQueue: CommandQueue = {
        id: "queue-123",
        projectPath: "/test/project",
        name: "Test Queue",
        commands: [
          {
            id: "cmd-1",
            prompt: "First",
            sessionMode: "continue",
            status: "pending",
          } as QueueCommand,
          mockCommand,
          {
            id: "cmd-2",
            prompt: "Second",
            sessionMode: "continue",
            status: "pending",
          } as QueueCommand,
        ],
        status: "pending",
        currentIndex: 0,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      (mockAgent.queues!.addCommand as ReturnType<typeof vi.fn>).mockResolvedValue(mockCommand);
      (mockAgent.queues!.getQueue as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueue);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "command",
        "add",
        "queue-123",
        "--prompt",
        "Inserted command",
        "--position",
        "1",
      ]);

      expect(mockAgent.queues!.addCommand).toHaveBeenCalledWith("queue-123", {
        prompt: "Inserted command",
        sessionMode: "continue",
        position: 1,
      });
      expect(printSuccessSpy).toHaveBeenCalledWith("Command added at index 1");
    });

    test("edits command prompt", async () => {
      const mockCommand: QueueCommand = {
        id: "cmd-123",
        prompt: "Updated prompt text",
        sessionMode: "continue",
        status: "pending",
      };

      (mockAgent.queues!.updateCommand as ReturnType<typeof vi.fn>).mockResolvedValue(mockCommand);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "command",
        "edit",
        "queue-123",
        "2",
        "--prompt",
        "Updated prompt text",
      ]);

      expect(mockAgent.queues!.updateCommand).toHaveBeenCalledWith(
        "queue-123",
        2,
        {
          prompt: "Updated prompt text",
          sessionMode: undefined,
        },
      );
      expect(printSuccessSpy).toHaveBeenCalledWith("Command 2 updated");
    });

    test("edits command session mode", async () => {
      const mockCommand: QueueCommand = {
        id: "cmd-123",
        prompt: "Original prompt",
        sessionMode: "new",
        status: "pending",
      };

      (mockAgent.queues!.updateCommand as ReturnType<typeof vi.fn>).mockResolvedValue(mockCommand);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "command",
        "edit",
        "queue-123",
        "1",
        "--session-mode",
        "new",
      ]);

      expect(mockAgent.queues!.updateCommand).toHaveBeenCalledWith(
        "queue-123",
        1,
        {
          prompt: undefined,
          sessionMode: "new",
        },
      );
      expect(printSuccessSpy).toHaveBeenCalledWith("Command 1 updated");
    });

    test("toggles session mode from continue to new", async () => {
      const mockCommand: QueueCommand = {
        id: "cmd-123",
        prompt: "Test prompt",
        sessionMode: "new",
        status: "pending",
      };

      (mockAgent.queues!.toggleSessionMode as ReturnType<typeof vi.fn>).mockResolvedValue(mockCommand);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "command",
        "toggle-mode",
        "queue-123",
        "0",
      ]);

      expect(mockAgent.queues!.toggleSessionMode).toHaveBeenCalledWith(
        "queue-123",
        0,
      );
      expect(printSuccessSpy).toHaveBeenCalledWith(
        "Session mode toggled to: new",
      );
    });

    test("toggles session mode from new to continue", async () => {
      const mockCommand: QueueCommand = {
        id: "cmd-123",
        prompt: "Test prompt",
        sessionMode: "continue",
        status: "pending",
      };

      (mockAgent.queues!.toggleSessionMode as ReturnType<typeof vi.fn>).mockResolvedValue(mockCommand);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "command",
        "toggle-mode",
        "queue-123",
        "3",
      ]);

      expect(mockAgent.queues!.toggleSessionMode).toHaveBeenCalledWith(
        "queue-123",
        3,
      );
      expect(printSuccessSpy).toHaveBeenCalledWith(
        "Session mode toggled to: continue",
      );
    });

    test("removes command by index", async () => {
      (mockAgent.queues!.removeCommand as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "command",
        "remove",
        "queue-123",
        "2",
      ]);

      expect(mockAgent.queues!.removeCommand).toHaveBeenCalledWith(
        "queue-123",
        2,
      );
      expect(printSuccessSpy).toHaveBeenCalledWith("Command 2 removed");
    });

    test("moves command from one index to another", async () => {
      (mockAgent.queues!.reorderCommand as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "command",
        "move",
        "queue-123",
        "1",
        "3",
      ]);

      expect(mockAgent.queues!.reorderCommand).toHaveBeenCalledWith(
        "queue-123",
        1,
        3,
      );
      expect(printSuccessSpy).toHaveBeenCalledWith("Command moved from 1 to 3");
    });

    test("handles error when adding command to nonexistent queue", async () => {
      (mockAgent.queues!.addCommand as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Queue not found"),
      );

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "command",
          "add",
          "nonexistent",
          "--prompt",
          "Test",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Queue not found",
        }),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("handles error when editing nonexistent command index", async () => {
      (mockAgent.queues!.updateCommand as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Command index out of bounds"),
      );

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "command",
          "edit",
          "queue-123",
          "999",
          "--prompt",
          "Test",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Command index out of bounds",
        }),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
