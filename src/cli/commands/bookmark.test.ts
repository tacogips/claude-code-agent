/**
 * Tests for bookmark CLI commands.
 *
 * Covers TEST-001, TEST-002, TEST-003 from cli-commands-unit test plan.
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
import type { SdkManager } from "../../sdk/agent";
import type { Bookmark } from "../../sdk/bookmarks/types";
import * as output from "../output";

describe("Bookmark Commands", () => {
  let program: Command;
  let mockAgent: Partial<SdkManager>;
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let printSuccessSpy: ReturnType<typeof vi.spyOn>;
  let printErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Create fresh program for each test
    program = new Command();
    program.exitOverride(); // Prevent actual process.exit
    program.option("--format <format>", "Output format", "table");

    // Create mock agent
    mockAgent = {
      bookmarks: {
        add: vi.fn(),
        list: vi.fn(),
        search: vi.fn(),
        get: vi.fn(),
        delete: vi.fn(),
      } as any,
    };

    // Spy on process.exit, console.log, and output functions
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any) as MockInstance<(this: unknown, ...args: unknown[]) => unknown>;
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    printSuccessSpy = vi
      .spyOn(output, "printSuccess")
      .mockImplementation(() => {});
    printErrorSpy = vi.spyOn(output, "printError").mockImplementation(() => {});

    // Register commands
    registerBookmarkCommands(program, async () => mockAgent as SdkManager);

    // Clear mock calls from registration
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("TEST-001: Bookmark Add", () => {
    test("adds session-type bookmark when no message options provided", async () => {
      const mockBookmark: Bookmark = {
        id: "test-bookmark-id",
        type: "session",
        sessionId: "session-123",
        name: "Test Session Bookmark",
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
        "Test Session Bookmark",
      ]);

      expect(mockAgent.bookmarks!.add).toHaveBeenCalledWith({
        type: "session",
        sessionId: "session-123",
        name: "Test Session Bookmark",
        messageId: undefined,
        fromMessageId: undefined,
        toMessageId: undefined,
        description: undefined,
        tags: undefined,
      });

      expect(printSuccessSpy).toHaveBeenCalledWith(
        `Bookmark created: ${mockBookmark.id}`,
      );
    });

    test("adds message-type bookmark when --message specified", async () => {
      const mockBookmark: Bookmark = {
        id: "test-bookmark-id",
        type: "message",
        sessionId: "session-123",
        messageId: "msg-456",
        name: "Test Message Bookmark",
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
        "--message",
        "msg-456",
        "--name",
        "Test Message Bookmark",
      ]);

      expect(mockAgent.bookmarks!.add).toHaveBeenCalledWith({
        type: "message",
        sessionId: "session-123",
        messageId: "msg-456",
        name: "Test Message Bookmark",
        fromMessageId: undefined,
        toMessageId: undefined,
        description: undefined,
        tags: undefined,
      });
    });

    test("adds range-type bookmark when --from and --to specified", async () => {
      const mockBookmark: Bookmark = {
        id: "test-bookmark-id",
        type: "range",
        sessionId: "session-123",
        messageRange: {
          fromMessageId: "msg-100",
          toMessageId: "msg-200",
        },
        name: "Test Range Bookmark",
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
        "--from",
        "msg-100",
        "--to",
        "msg-200",
        "--name",
        "Test Range Bookmark",
      ]);

      expect(mockAgent.bookmarks!.add).toHaveBeenCalledWith({
        type: "range",
        sessionId: "session-123",
        messageId: undefined,
        fromMessageId: "msg-100",
        toMessageId: "msg-200",
        name: "Test Range Bookmark",
        description: undefined,
        tags: undefined,
      });
    });

    test("exits with code 2 for conflicting options (--message with --from)", async () => {
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

    test("exits with code 2 for conflicting options (--message with --to)", async () => {
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
          "--to",
          "msg-200",
          "--name",
          "Test",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Cannot specify both --message and --from/--to options",
      );
      expect(exitSpy).toHaveBeenCalledWith(2);
    });

    test("exits with code 2 for incomplete range (--from without --to)", async () => {
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

    test("exits with code 2 for incomplete range (--to without --from)", async () => {
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

    test("parses comma-separated tags correctly", async () => {
      const mockBookmark: Bookmark = {
        id: "test-bookmark-id",
        type: "session",
        sessionId: "session-123",
        name: "Test",
        tags: ["tag1", "tag2", "tag3"],
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
        "Test",
        "--tags",
        "tag1, tag2, tag3",
      ]);

      expect(mockAgent.bookmarks!.add).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ["tag1", "tag2", "tag3"], // Trimmed
        }),
      );
    });
  });

  describe("TEST-002: Bookmark List and Search", () => {
    test("lists all bookmarks when no filter provided", async () => {
      const mockBookmarks: Bookmark[] = [
        {
          id: "bookmark-1",
          type: "session",
          sessionId: "session-123",
          name: "Bookmark 1",
          tags: ["tag1"],
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "bookmark-2",
          type: "message",
          sessionId: "session-456",
          messageId: "msg-1",
          name: "Bookmark 2",
          tags: ["tag2"],
          createdAt: "2024-01-02T00:00:00Z",
          updatedAt: "2024-01-02T00:00:00Z",
        },
      ];

      (mockAgent.bookmarks!.list as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockBookmarks,
      );

      await program.parseAsync(["node", "test", "bookmark", "list"]);

      expect(mockAgent.bookmarks!.list).toHaveBeenCalledWith(undefined);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test("lists bookmarks with --tag filter", async () => {
      const mockBookmarks: Bookmark[] = [
        {
          id: "bookmark-1",
          type: "session",
          sessionId: "session-123",
          name: "Bookmark 1",
          tags: ["important"],
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      (mockAgent.bookmarks!.list as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockBookmarks,
      );

      await program.parseAsync([
        "node",
        "test",
        "bookmark",
        "list",
        "--tag",
        "important",
      ]);

      expect(mockAgent.bookmarks!.list).toHaveBeenCalledWith({
        tags: ["important"],
      });
    });

    test("displays 'No bookmarks found' for empty results", async () => {
      (mockAgent.bookmarks!.list as ReturnType<typeof vi.fn>).mockResolvedValue(
        [],
      );

      await program.parseAsync(["node", "test", "bookmark", "list"]);

      expect(consoleLogSpy).toHaveBeenCalledWith("No bookmarks found");
    });

    test("searches bookmarks by query", async () => {
      const mockResults = [
        {
          bookmark: {
            id: "bookmark-1",
            type: "session",
            sessionId: "session-123",
            name: "Test Bookmark",
            tags: [],
            createdAt: "2024-01-01T00:00:00Z",
            updatedAt: "2024-01-01T00:00:00Z",
          } as Bookmark,
          matchType: "name" as const,
          relevanceScore: 0.9,
          matchContext: "Test Bookmark",
        },
      ];

      (
        mockAgent.bookmarks!.search as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockResults);

      await program.parseAsync([
        "node",
        "test",
        "bookmark",
        "search",
        "test query",
      ]);

      expect(mockAgent.bookmarks!.search).toHaveBeenCalledWith("test query", {
        metadataOnly: undefined,
      });
    });

    test("searches with --metadata-only flag", async () => {
      (
        mockAgent.bookmarks!.search as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);

      await program.parseAsync([
        "node",
        "test",
        "bookmark",
        "search",
        "query",
        "--metadata-only",
      ]);

      expect(mockAgent.bookmarks!.search).toHaveBeenCalledWith("query", {
        metadataOnly: true,
      });
    });

    test("displays 'No bookmarks found' for empty search results", async () => {
      (
        mockAgent.bookmarks!.search as ReturnType<typeof vi.fn>
      ).mockResolvedValue([]);

      await program.parseAsync([
        "node",
        "test",
        "bookmark",
        "search",
        "nonexistent",
      ]);

      expect(consoleLogSpy).toHaveBeenCalledWith("No bookmarks found");
    });

    test("formats output as JSON when --format json", async () => {
      const mockBookmarks: Bookmark[] = [
        {
          id: "bookmark-1",
          type: "session",
          sessionId: "session-123",
          name: "Test",
          tags: [],
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      (mockAgent.bookmarks!.list as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockBookmarks,
      );

      await program.parseAsync([
        "node",
        "test",
        "--format",
        "json",
        "bookmark",
        "list",
      ]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"id": "bookmark-1"'),
      );
    });
  });

  describe("TEST-003: Bookmark Show and Delete", () => {
    test("shows existing bookmark details", async () => {
      const mockBookmark: Bookmark = {
        id: "bookmark-123",
        type: "message",
        sessionId: "session-456",
        messageId: "msg-789",
        name: "Important Message",
        description: "Test description",
        tags: ["tag1", "tag2"],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
      };

      (mockAgent.bookmarks!.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockBookmark,
      );

      await program.parseAsync([
        "node",
        "test",
        "bookmark",
        "show",
        "bookmark-123",
      ]);

      expect(mockAgent.bookmarks!.get).toHaveBeenCalledWith("bookmark-123");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("bookmark-123"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("message"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Important Message"),
      );
    });

    test("exits with code 1 for nonexistent bookmark", async () => {
      (mockAgent.bookmarks!.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      try {
        await program.parseAsync([
          "node",
          "test",
          "bookmark",
          "show",
          "nonexistent",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Bookmark not found: nonexistent",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("formats show output as JSON when --format json", async () => {
      const mockBookmark: Bookmark = {
        id: "bookmark-123",
        type: "session",
        sessionId: "session-456",
        name: "Test",
        tags: [],
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      (mockAgent.bookmarks!.get as ReturnType<typeof vi.fn>).mockResolvedValue(
        mockBookmark,
      );

      await program.parseAsync([
        "node",
        "test",
        "--format",
        "json",
        "bookmark",
        "show",
        "bookmark-123",
      ]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"id": "bookmark-123"'),
      );
    });

    test("deletes existing bookmark", async () => {
      (
        mockAgent.bookmarks!.delete as ReturnType<typeof vi.fn>
      ).mockResolvedValue(true);

      await program.parseAsync([
        "node",
        "test",
        "bookmark",
        "delete",
        "bookmark-123",
      ]);

      expect(mockAgent.bookmarks!.delete).toHaveBeenCalledWith("bookmark-123");
      expect(printSuccessSpy).toHaveBeenCalledWith(
        "Bookmark deleted: bookmark-123",
      );
    });

    test("exits with code 1 when deleting nonexistent bookmark", async () => {
      (
        mockAgent.bookmarks!.delete as ReturnType<typeof vi.fn>
      ).mockResolvedValue(false);

      try {
        await program.parseAsync([
          "node",
          "test",
          "bookmark",
          "delete",
          "nonexistent",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Bookmark not found: nonexistent",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
