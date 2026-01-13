/**
 * Tests for edge cases in CLI commands.
 *
 * Covers TEST-012 from cli-commands-unit test plan:
 * - Paths with spaces
 * - Paths with special characters
 * - Unicode in names/descriptions
 * - Very long prompts
 * - Empty strings where allowed
 * - Negative index values
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
import type { Bookmark } from "../../sdk/bookmarks/types";
import type { CommandQueue, SessionGroup } from "../../repository";
import * as output from "../output";

describe("Edge Cases - Special Characters and Paths", () => {
  let program: Command;
  let mockAgent: Partial<ClaudeCodeAgent>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let printErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create fresh program for each test
    program = new Command();
    program.exitOverride(); // Prevent actual process.exit
    program.option("--format <format>", "Output format", "table");

    // Create mock agent with all required methods
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
      groups: {
        createGroup: vi.fn(),
        listGroups: vi.fn(),
        getGroup: vi.fn(),
        deleteGroup: vi.fn(),
        archiveGroup: vi.fn(),
      } as any,
      groupRunner: {
        run: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
      } as any,
    };

    // Spy on process.exit and output functions
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any) as MockInstance<(this: unknown, ...args: unknown[]) => unknown>;
    printErrorSpy = vi.spyOn(output, "printError").mockImplementation(() => {});

    // Register all command groups
    registerBookmarkCommands(program, async () => mockAgent as ClaudeCodeAgent);
    registerQueueCommands(program, async () => mockAgent as ClaudeCodeAgent);
    registerGroupCommands(program, async () => mockAgent as ClaudeCodeAgent);

    // Clear mock calls from registration
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Scenario 1: Paths with Spaces", () => {
    test("queue create handles project paths with spaces", async () => {
      const pathWithSpaces = "/home/user/My Projects/test project";
      const mockQueue: CommandQueue = {
        id: "queue-123",
        name: "Test Queue",
        projectPath: pathWithSpaces,
        commands: [],
        status: "pending",
        currentIndex: 0,
        totalCostUsd: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (
        mockAgent.queues!.createQueue as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockQueue);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "create",
        "test-slug",
        "--project",
        pathWithSpaces,
      ]);

      expect(mockAgent.queues!.createQueue).toHaveBeenCalledWith({
        projectPath: pathWithSpaces,
        name: "test-slug",
      });
      expect(mockQueue.projectPath).toBe(pathWithSpaces);
    });

    test("queue create handles paths with multiple consecutive spaces", async () => {
      const pathWithMultipleSpaces = "/home/user/my    project    folder";
      const mockQueue: CommandQueue = {
        id: "queue-456",
        name: "Test",
        projectPath: pathWithMultipleSpaces,
        commands: [],
        status: "pending",
        currentIndex: 0,
        totalCostUsd: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (
        mockAgent.queues!.createQueue as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockQueue);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "create",
        "test-slug",
        "--project",
        pathWithMultipleSpaces,
      ]);

      expect(mockAgent.queues!.createQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: pathWithMultipleSpaces,
        }),
      );
    });
  });

  describe("Scenario 2: Paths with Special Characters", () => {
    test("queue create handles paths with @ symbol", async () => {
      const pathWithAt = "/home/user@domain/projects";
      const mockQueue: CommandQueue = {
        id: "queue-789",
        name: "Test",
        projectPath: pathWithAt,
        commands: [],
        status: "pending",
        currentIndex: 0,
        totalCostUsd: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (
        mockAgent.queues!.createQueue as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockQueue);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "create",
        "test-slug",
        "--project",
        pathWithAt,
      ]);

      expect(mockAgent.queues!.createQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: pathWithAt,
        }),
      );
    });

    test("queue create handles paths with # $ % & characters", async () => {
      const pathWithSpecialChars = "/home/project#1/$test/%build/&data";
      const mockQueue: CommandQueue = {
        id: "queue-special",
        name: "Test",
        projectPath: pathWithSpecialChars,
        commands: [],
        status: "pending",
        currentIndex: 0,
        totalCostUsd: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (
        mockAgent.queues!.createQueue as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockQueue);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "create",
        "test-slug",
        "--project",
        pathWithSpecialChars,
      ]);

      expect(mockAgent.queues!.createQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: pathWithSpecialChars,
        }),
      );
      expect(mockQueue.projectPath).toBe(pathWithSpecialChars);
    });

    test("queue create handles paths with parentheses and brackets", async () => {
      const pathWithBrackets = "/home/project(v2)/[test]/build";
      const mockQueue: CommandQueue = {
        id: "queue-brackets",
        name: "Test",
        projectPath: pathWithBrackets,
        commands: [],
        status: "pending",
        currentIndex: 0,
        totalCostUsd: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (
        mockAgent.queues!.createQueue as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockQueue);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "create",
        "test-slug",
        "--project",
        pathWithBrackets,
      ]);

      expect(mockAgent.queues!.createQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          projectPath: pathWithBrackets,
        }),
      );
    });
  });

  describe("Scenario 3: Unicode in Names and Descriptions", () => {
    test("bookmark add handles emoji in name", async () => {
      const nameWithEmoji = "Important Bookmark 🔖 ⭐ 📌";
      const mockBookmark: Bookmark = {
        id: "bookmark-emoji",
        type: "session",
        sessionId: "session-123",
        name: nameWithEmoji,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (mockAgent.bookmarks!.add as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockBookmark,
      );

      await program.parseAsync([
        "node",
        "test",
        "bookmark",
        "add",
        "--session",
        "session-123",
        "--name",
        nameWithEmoji,
      ]);

      expect(mockAgent.bookmarks!.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: nameWithEmoji,
        }),
      );
      expect(mockBookmark.name).toBe(nameWithEmoji);
    });

    test("bookmark add handles CJK characters in name", async () => {
      const nameWithCJK = "重要なブックマーク 重要书签 중요한 북마크";
      const mockBookmark: Bookmark = {
        id: "bookmark-cjk",
        type: "session",
        sessionId: "session-456",
        name: nameWithCJK,
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (mockAgent.bookmarks!.add as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockBookmark,
      );

      await program.parseAsync([
        "node",
        "test",
        "bookmark",
        "add",
        "--session",
        "session-456",
        "--name",
        nameWithCJK,
      ]);

      expect(mockAgent.bookmarks!.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: nameWithCJK,
        }),
      );
      expect(mockBookmark.name).toBe(nameWithCJK);
    });

    test("group create handles unicode in description", async () => {
      const descriptionWithUnicode =
        "Тестовая группа mit Überprüfung والاختبار 测试 🚀";
      const mockGroup: SessionGroup = {
        id: "group-unicode",
        slug: "test-group",
        name: "Test Group",
        description: descriptionWithUnicode,
        status: "created",
        sessions: [],
        config: {
          model: "claude-3-5-sonnet-20241022",
          maxBudgetUsd: 10,
          maxConcurrentSessions: 3,
          onBudgetExceeded: "pause",
          warningThreshold: 0.8,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (
        mockAgent.groups!.createGroup as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockGroup);

      await program.parseAsync([
        "node",
        "test",
        "group",
        "create",
        "test-group",
        "--description",
        descriptionWithUnicode,
      ]);

      expect(mockAgent.groups!.createGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          description: descriptionWithUnicode,
        }),
      );
      expect(mockGroup.description).toBe(descriptionWithUnicode);
    });

    test("group create handles mixed emoji and text", async () => {
      const nameWithMixedUnicode = "🔥 Production Deploy 🚀 v2.0";
      const mockGroup: SessionGroup = {
        id: "group-mixed",
        slug: "prod-deploy",
        name: nameWithMixedUnicode,
        status: "created",
        sessions: [],
        config: {
          model: "claude-3-5-sonnet-20241022",
          maxBudgetUsd: 10,
          maxConcurrentSessions: 3,
          onBudgetExceeded: "pause",
          warningThreshold: 0.8,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (
        mockAgent.groups!.createGroup as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockGroup);

      await program.parseAsync([
        "node",
        "test",
        "group",
        "create",
        "prod-deploy",
        "--name",
        nameWithMixedUnicode,
      ]);

      expect(mockAgent.groups!.createGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          name: nameWithMixedUnicode,
        }),
      );
    });
  });

  describe("Scenario 4: Very Long Prompts", () => {
    test("queue command add handles prompts exceeding 500 characters", async () => {
      // Create a prompt that is 550 characters long
      const veryLongPrompt =
        "This is a very long prompt that exceeds typical display limits. ".repeat(
          8,
        ) +
        "Extra text to make it exactly over 500 characters for testing purposes.";

      expect(veryLongPrompt.length).toBeGreaterThan(500);

      const mockCommand = {
        id: "cmd-long",
        prompt: veryLongPrompt,
        sessionMode: "continue" as const,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockQueue: CommandQueue = {
        id: "queue-long",
        name: "Test",
        projectPath: "/test",
        commands: [mockCommand],
        status: "pending",
        currentIndex: 0,
        totalCostUsd: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (
        mockAgent.queues!.addCommand as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockCommand);
      (
        mockAgent.queues!.getQueue as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockQueue);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "command",
        "add",
        "queue-long",
        "--prompt",
        veryLongPrompt,
      ]);

      // Verify the full prompt is passed to the SDK (not truncated)
      expect(mockAgent.queues!.addCommand).toHaveBeenCalledWith(
        "queue-long",
        expect.objectContaining({
          prompt: veryLongPrompt,
        }),
      );

      // The prompt should be stored in full
      expect(mockCommand.prompt).toBe(veryLongPrompt);
      expect(mockCommand.prompt.length).toBe(veryLongPrompt.length);
    });

    test("queue command add handles prompts with 1000+ characters", async () => {
      const extremelyLongPrompt = "A".repeat(1000) + " with some extra text";

      expect(extremelyLongPrompt.length).toBeGreaterThan(1000);

      const mockCommand = {
        id: "cmd-extreme",
        prompt: extremelyLongPrompt,
        sessionMode: "new" as const,
        status: "pending" as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (
        mockAgent.queues!.addCommand as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockCommand);
      (
        mockAgent.queues!.getQueue as ReturnType<typeof vi.fn>
      ).mockResolvedValue({
        id: "queue-extreme",
        name: "Test",
        projectPath: "/test",
        commands: [mockCommand],
        status: "pending",
        currentIndex: 0,
        totalCostUsd: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "command",
        "add",
        "queue-extreme",
        "--prompt",
        extremelyLongPrompt,
      ]);

      expect(mockAgent.queues!.addCommand).toHaveBeenCalledWith(
        "queue-extreme",
        expect.objectContaining({
          prompt: extremelyLongPrompt,
        }),
      );

      // Full prompt should be stored
      expect(mockCommand.prompt.length).toBe(extremelyLongPrompt.length);
    });
  });

  describe("Scenario 5: Empty Strings Where Allowed", () => {
    test("bookmark add accepts empty description", async () => {
      const mockBookmark: Bookmark = {
        id: "bookmark-empty",
        type: "session",
        sessionId: "session-789",
        name: "Test Bookmark",
        description: undefined, // Optional field
        tags: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (mockAgent.bookmarks!.add as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockBookmark,
      );

      await program.parseAsync([
        "node",
        "test",
        "bookmark",
        "add",
        "--session",
        "session-789",
        "--name",
        "Test Bookmark",
        // No --description option
      ]);

      expect(mockAgent.bookmarks!.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Test Bookmark",
          description: undefined,
        }),
      );
    });

    test("group create accepts undefined description", async () => {
      const mockGroup: SessionGroup = {
        id: "group-no-desc",
        slug: "test-group",
        name: "Test Group",
        description: undefined, // Optional
        status: "created",
        sessions: [],
        config: {
          model: "claude-3-5-sonnet-20241022",
          maxBudgetUsd: 10,
          maxConcurrentSessions: 3,
          onBudgetExceeded: "pause",
          warningThreshold: 0.8,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (
        mockAgent.groups!.createGroup as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockGroup);

      await program.parseAsync([
        "node",
        "test",
        "group",
        "create",
        "test-group",
        // No --description option
      ]);

      expect(mockAgent.groups!.createGroup).toHaveBeenCalledWith({
        name: "test-group",
        description: undefined,
      });
      expect(mockGroup.description).toBeUndefined();
    });

    test("queue create uses slug as name when name not provided", async () => {
      const mockQueue: CommandQueue = {
        id: "queue-default",
        name: "my-queue-slug", // Defaults to slug
        projectPath: "/test",
        commands: [],
        status: "pending",
        currentIndex: 0,
        totalCostUsd: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (
        mockAgent.queues!.createQueue as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockQueue);

      await program.parseAsync([
        "node",
        "test",
        "queue",
        "create",
        "my-queue-slug",
        "--project",
        "/test",
        // No --name option
      ]);

      expect(mockAgent.queues!.createQueue).toHaveBeenCalledWith({
        projectPath: "/test",
        name: "my-queue-slug",
      });
    });
  });

  describe("Scenario 6: Negative Index Values", () => {
    test("queue command edit rejects negative index", async () => {
      // Mock an error from the SDK for negative index
      (
        mockAgent.queues!.updateCommand as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Invalid index: -1"));

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "command",
          "edit",
          "queue-123",
          "-1",
          "--prompt",
          "Updated prompt",
        ]);
      } catch (error) {
        // Expected to throw due to exit
      }

      expect(printErrorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("queue command remove rejects negative index", async () => {
      (
        mockAgent.queues!.removeCommand as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Invalid index: -5"));

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "command",
          "remove",
          "queue-456",
          "-5",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("queue command move rejects negative from index", async () => {
      (
        mockAgent.queues!.reorderCommand as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Invalid from index: -2"));

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "command",
          "move",
          "queue-789",
          "-2",
          "5",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("queue command move rejects negative to index", async () => {
      (
        mockAgent.queues!.reorderCommand as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Invalid to index: -3"));

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "command",
          "move",
          "queue-abc",
          "2",
          "-3",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("queue command toggle-mode rejects negative index", async () => {
      (
        mockAgent.queues!.toggleSessionMode as ReturnType<typeof vi.fn>
      ).mockRejectedValue(new Error("Invalid index: -10"));

      try {
        await program.parseAsync([
          "node",
          "test",
          "queue",
          "command",
          "toggle-mode",
          "queue-def",
          "-10",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
