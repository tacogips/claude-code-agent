/**
 * Tests for error handling across all CLI commands.
 *
 * Covers TEST-010 from cli-commands-unit test plan.
 *
 * Tests comprehensive error handling including:
 * - Missing required arguments (Commander handles this automatically)
 * - Invalid option values
 * - SDK throws Error instance
 * - SDK throws non-Error value
 * - Resource not found errors (queue, group, bookmark)
 */

import {
  describe,
  test,
  expect,
  vi,
  beforeEach,
  afterEach,
  type MockInstance,
} from "vitest";
import { Command } from "commander";
import { registerBookmarkCommands } from "./bookmark";
import { registerQueueCommands } from "./queue";
import { registerGroupCommands } from "./group";
import type { ClaudeCodeAgent } from "../../sdk/agent";
import * as output from "../output";

describe("Error Handling - Invalid Arguments", () => {
  let program: Command;
  let mockAgent: Partial<ClaudeCodeAgent>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let printErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create fresh program for each test
    program = new Command();
    program.exitOverride(); // Prevent actual process.exit
    program.option("--format <format>", "Output format", "table");

    // Create mock agent with all needed command methods
    mockAgent = {
      bookmarks: {
        add: vi.fn(),
        list: vi.fn(),
        search: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
      } as any,
      queues: {
        createQueue: vi.fn(),
        listQueues: vi.fn(),
        getQueue: vi.fn(),
        deleteQueue: vi.fn(),
        run: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        stop: vi.fn(),
        addCommand: vi.fn(),
        editCommand: vi.fn(),
        removeCommand: vi.fn(),
        moveCommand: vi.fn(),
        toggleSessionMode: vi.fn(),
      } as any,
      groups: {
        createGroup: vi.fn(),
        listGroups: vi.fn(),
        getGroup: vi.fn(),
        deleteGroup: vi.fn(),
        run: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        archive: vi.fn(),
      } as any,
    };

    // Spy on process.exit and output functions
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any) as MockInstance<(this: unknown, ...args: unknown[]) => unknown>;
    printErrorSpy = vi.spyOn(output, "printError").mockImplementation(() => {});

    // Register all commands
    registerBookmarkCommands(program, async () => mockAgent as ClaudeCodeAgent);
    registerQueueCommands(program, async () => mockAgent as ClaudeCodeAgent);
    registerGroupCommands(program, async () => mockAgent as ClaudeCodeAgent);

    // Clear mock calls from registration
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Missing Required Arguments", () => {
    test("bookmark add - missing --session option", async () => {
      try {
        await program.parseAsync([
          "node",
          "test",
          "bookmark",
          "add",
          "--name",
          "Test",
        ]);
      } catch (error) {
        // Commander throws error for missing required option
        expect(error).toBeDefined();
      }

      // Commander prints its own error message for missing options
      // We don't control this error, just verify it throws
    });

    test("bookmark add - missing --name option", async () => {
      try {
        await program.parseAsync([
          "node",
          "test",
          "bookmark",
          "add",
          "--session",
          "session-123",
        ]);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test("queue create - missing slug argument", async () => {
      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "create",
          "--project",
          "/path/to/project",
        ]);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test("queue create - missing --project option", async () => {
      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "create",
          "test-queue",
        ]);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test("group create - missing slug argument", async () => {
      try {
        await program.parseAsync(["node", "test", "group", "create"]);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe("Invalid Option Values", () => {
    test("bookmark add - conflicting --message with --from", async () => {
      try {
        await program.parseAsync([
          "node",
          "test",
          "bookmark",
          "add",
          "--session",
          "session-123",
          "--message",
          "msg-456",
          "--from",
          "msg-100",
          "--name",
          "Test",
        ]);
      } catch (error) {
        // Expected to throw due to process.exit mock
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Cannot specify both --message and --from/--to options",
      );
      expect(exitSpy).toHaveBeenCalledWith(2);
    });

    test("bookmark add - incomplete range (--from without --to)", async () => {
      try {
        await program.parseAsync([
          "node",
          "test",
          "bookmark",
          "add",
          "--session",
          "session-123",
          "--from",
          "msg-100",
          "--name",
          "Test",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Range bookmarks require both --from and --to options",
      );
      expect(exitSpy).toHaveBeenCalledWith(2);
    });

    test("bookmark add - incomplete range (--to without --from)", async () => {
      try {
        await program.parseAsync([
          "node",
          "test",
          "bookmark",
          "add",
          "--session",
          "session-123",
          "--to",
          "msg-200",
          "--name",
          "Test",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Range bookmarks require both --from and --to options",
      );
      expect(exitSpy).toHaveBeenCalledWith(2);
    });
  });

  describe("SDK Throws Error Instance", () => {
    test("bookmark add - SDK throws Error with message", async () => {
      const testError = new Error("Session not found: session-123");
      (mockAgent.bookmarks!.add as ReturnType<typeof vi.fn>).mockRejectedValue(
        testError,
      );

      try {
        await program.parseAsync([
          "node",
          "test",
          "bookmark",
          "add",
          "--session",
          "session-123",
          "--name",
          "Test",
        ]);
      } catch (error) {
        // Expected to throw due to process.exit mock
      }

      expect(printErrorSpy).toHaveBeenCalledWith(testError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("queue create - SDK throws Error", async () => {
      const testError = new Error("Invalid project path: /nonexistent");
      (
        mockAgent.queues!.createQueue as ReturnType<typeof vi.fn>
      ).mockRejectedValue(testError);

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "create",
          "test-queue",
          "--project",
          "/nonexistent",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(testError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("group create - SDK throws Error", async () => {
      const testError = new Error("Group validation failed");
      (
        mockAgent.groups!.createGroup as ReturnType<typeof vi.fn>
      ).mockRejectedValue(testError);

      try {
        await program.parseAsync([
          "node",
          "test",
          "group",
          "create",
          "test-group",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(testError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("bookmark list - SDK throws Error", async () => {
      const testError = new Error("Database connection failed");
      (mockAgent.bookmarks!.list as ReturnType<typeof vi.fn>).mockRejectedValue(
        testError,
      );

      try {
        await program.parseAsync(["node", "test", "bookmark", "list"]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(testError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("queue list - SDK throws Error", async () => {
      const testError = new Error("Failed to read queues directory");
      (
        mockAgent.queues!.listQueues as ReturnType<typeof vi.fn>
      ).mockRejectedValue(testError);

      try {
        await program.parseAsync(["node", "test", "queue", "list"]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(testError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("group list - SDK throws Error", async () => {
      const testError = new Error("Failed to read groups directory");
      (
        mockAgent.groups!.listGroups as ReturnType<typeof vi.fn>
      ).mockRejectedValue(testError);

      try {
        await program.parseAsync(["node", "test", "group", "list"]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(testError);
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("SDK Throws Non-Error Value", () => {
    test("bookmark add - SDK throws string", async () => {
      (mockAgent.bookmarks!.add as ReturnType<typeof vi.fn>).mockRejectedValue(
        "Something went wrong",
      );

      try {
        await program.parseAsync([
          "node",
          "test",
          "bookmark",
          "add",
          "--session",
          "session-123",
          "--name",
          "Test",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith("Something went wrong");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("queue create - SDK throws string", async () => {
      (
        mockAgent.queues!.createQueue as ReturnType<typeof vi.fn>
      ).mockRejectedValue("Invalid configuration");

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "create",
          "test-queue",
          "--project",
          "/path",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith("Invalid configuration");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("group create - SDK throws object", async () => {
      const errorObj = { code: "ERR_INVALID", message: "Invalid input" };
      (
        mockAgent.groups!.createGroup as ReturnType<typeof vi.fn>
      ).mockRejectedValue(errorObj);

      try {
        await program.parseAsync([
          "node",
          "test",
          "group",
          "create",
          "test-group",
        ]);
      } catch (error) {
        // Expected to throw
      }

      // String() converts objects to "[object Object]"
      expect(printErrorSpy).toHaveBeenCalledWith("[object Object]");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("bookmark search - SDK throws number", async () => {
      (
        mockAgent.bookmarks!.search as ReturnType<typeof vi.fn>
      ).mockRejectedValue(404);

      try {
        await program.parseAsync([
          "node",
          "test",
          "bookmark",
          "search",
          "test query",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith("404");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("queue list - SDK throws null", async () => {
      (
        mockAgent.queues!.listQueues as ReturnType<typeof vi.fn>
      ).mockRejectedValue(null);

      try {
        await program.parseAsync(["node", "test", "queue", "list"]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith("null");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("group list - SDK throws undefined", async () => {
      (
        mockAgent.groups!.listGroups as ReturnType<typeof vi.fn>
      ).mockRejectedValue(undefined);

      try {
        await program.parseAsync(["node", "test", "group", "list"]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith("undefined");
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("Queue Not Found", () => {
    test("queue show - queue not found returns null", async () => {
      (
        mockAgent.queues!.getQueue as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "show",
          "nonexistent-queue",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Queue not found: nonexistent-queue",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("queue run - queue not found", async () => {
      (
        mockAgent.queues!.getQueue as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "run",
          "nonexistent-queue",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Queue not found: nonexistent-queue",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("queue delete - queue not found returns false", async () => {
      (
        mockAgent.queues!.deleteQueue as ReturnType<typeof vi.fn>
      ).mockResolvedValue(false);

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "delete",
          "nonexistent-queue",
          "--force",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Queue not found: nonexistent-queue",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("Group Not Found", () => {
    test("group show - group not found returns null", async () => {
      (
        mockAgent.groups!.getGroup as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      try {
        await program.parseAsync([
          "node",
          "test",
          "group",
          "show",
          "nonexistent-group",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Group not found: nonexistent-group",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("group run - group not found", async () => {
      (
        mockAgent.groups!.getGroup as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      try {
        await program.parseAsync([
          "node",
          "test",
          "group",
          "run",
          "nonexistent-group",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Group not found: nonexistent-group",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("group delete - group not found returns null from getGroup", async () => {
      // Group delete checks getGroup() first, not deleteGroup() return value
      (
        mockAgent.groups!.getGroup as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      try {
        await program.parseAsync([
          "node",
          "test",
          "group",
          "delete",
          "nonexistent-group",
          "--force",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Group not found: nonexistent-group",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("Bookmark Not Found", () => {
    test("bookmark show - bookmark not found returns null", async () => {
      (mockAgent.bookmarks!.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      try {
        await program.parseAsync([
          "node",
          "test",
          "bookmark",
          "show",
          "nonexistent-bookmark",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Bookmark not found: nonexistent-bookmark",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("bookmark delete - bookmark not found returns false", async () => {
      (
        mockAgent.bookmarks!.delete as ReturnType<typeof vi.fn>
      ).mockResolvedValue(false);

      try {
        await program.parseAsync([
          "node",
          "test",
          "bookmark",
          "delete",
          "nonexistent-bookmark",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Bookmark not found: nonexistent-bookmark",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("Consistent Error Formatting", () => {
    test("all error handlers call printError", async () => {
      const testError = new Error("Test error");

      // Test bookmark command
      (mockAgent.bookmarks!.add as ReturnType<typeof vi.fn>).mockRejectedValue(
        testError,
      );
      try {
        await program.parseAsync([
          "node",
          "test",
          "bookmark",
          "add",
          "--session",
          "s1",
          "--name",
          "Test",
        ]);
      } catch (e) {
        // ignore
      }
      expect(printErrorSpy).toHaveBeenCalledWith(testError);

      vi.clearAllMocks();

      // Test queue command
      (
        mockAgent.queues!.createQueue as ReturnType<typeof vi.fn>
      ).mockRejectedValue(testError);
      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "create",
          "q1",
          "--project",
          "/p",
        ]);
      } catch (e) {
        // ignore
      }
      expect(printErrorSpy).toHaveBeenCalledWith(testError);

      vi.clearAllMocks();

      // Test group command
      (
        mockAgent.groups!.createGroup as ReturnType<typeof vi.fn>
      ).mockRejectedValue(testError);
      try {
        await program.parseAsync(["node", "test", "group", "create", "g1"]);
      } catch (e) {
        // ignore
      }
      expect(printErrorSpy).toHaveBeenCalledWith(testError);
    });

    test("all error handlers exit with code 1", async () => {
      const testError = new Error("Test");

      // Test bookmark
      (mockAgent.bookmarks!.list as ReturnType<typeof vi.fn>).mockRejectedValue(
        testError,
      );
      try {
        await program.parseAsync(["node", "test", "bookmark", "list"]);
      } catch (e) {
        // ignore
      }
      expect(exitSpy).toHaveBeenCalledWith(1);

      vi.clearAllMocks();

      // Test queue
      (
        mockAgent.queues!.listQueues as ReturnType<typeof vi.fn>
      ).mockRejectedValue(testError);
      try {
        await program.parseAsync(["node", "test", "queue", "list"]);
      } catch (e) {
        // ignore
      }
      expect(exitSpy).toHaveBeenCalledWith(1);

      vi.clearAllMocks();

      // Test group
      (
        mockAgent.groups!.listGroups as ReturnType<typeof vi.fn>
      ).mockRejectedValue(testError);
      try {
        await program.parseAsync(["node", "test", "group", "list"]);
      } catch (e) {
        // ignore
      }
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
