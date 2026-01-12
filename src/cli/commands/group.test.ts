/**
 * Tests for group CLI commands.
 *
 * Covers TEST-007 from cli-commands-unit test plan.
 */

import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { Command } from "commander";
import { registerGroupCommands } from "./group";
import type { ClaudeCodeAgent } from "../../sdk/agent";
import type { SessionGroup } from "../../sdk/group/types";
import { DEFAULT_GROUP_CONFIG } from "../../sdk/group/types";
import * as output from "../output";

describe("Group Commands", () => {
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
    program.option("--format <format>", "Output format", "table");

    // Create mock agent
    mockAgent = {
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

    // Spy on process.exit, console.log, and output functions
    exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any);
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    printSuccessSpy = vi.spyOn(output, "printSuccess").mockImplementation(() => {});
    printErrorSpy = vi.spyOn(output, "printError").mockImplementation(() => {});

    // Register commands
    registerGroupCommands(program, async () => mockAgent as ClaudeCodeAgent);

    // Clear mock calls from registration
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("TEST-007: Group CRUD Operations", () => {
    test("creates group with slug argument", async () => {
      const mockGroup: SessionGroup = {
        id: "test-group-id",
        name: "test-slug",
        slug: "test-slug",
        status: "created",
        sessions: [],
        config: DEFAULT_GROUP_CONFIG,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (mockAgent.groups!.createGroup as ReturnType<typeof vi.fn>).mockResolvedValue(mockGroup);

      await program.parseAsync([
        "node",
        "test",
        "group",
        "create",
        "test-slug",
      ]);

      expect(mockAgent.groups!.createGroup).toHaveBeenCalledWith({
        name: "test-slug",
        description: undefined,
      });

      expect(printSuccessSpy).toHaveBeenCalledWith(
        `Group created: ${mockGroup.id}`,
      );
    });

    test("creates group with --name and --description", async () => {
      const mockGroup: SessionGroup = {
        id: "test-group-id",
        name: "Custom Group Name",
        slug: "test-slug",
        description: "Custom description",
        status: "created",
        sessions: [],
        config: DEFAULT_GROUP_CONFIG,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (mockAgent.groups!.createGroup as ReturnType<typeof vi.fn>).mockResolvedValue(mockGroup);

      await program.parseAsync([
        "node",
        "test",
        "group",
        "create",
        "test-slug",
        "--name",
        "Custom Group Name",
        "--description",
        "Custom description",
      ]);

      expect(mockAgent.groups!.createGroup).toHaveBeenCalledWith({
        name: "Custom Group Name",
        description: "Custom description",
      });
    });

    test("lists groups with no filter", async () => {
      const mockGroups: SessionGroup[] = [
        {
          id: "group-1",
          name: "Group 1",
          slug: "group-1",
          status: "created",
          sessions: [],
          config: DEFAULT_GROUP_CONFIG,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "group-2",
          name: "Group 2",
          slug: "group-2",
          status: "running",
          sessions: [],
          config: DEFAULT_GROUP_CONFIG,
          createdAt: "2024-01-02T00:00:00Z",
          updatedAt: "2024-01-02T00:00:00Z",
        },
      ];

      (mockAgent.groups!.listGroups as ReturnType<typeof vi.fn>).mockResolvedValue(mockGroups);

      await program.parseAsync(["node", "test", "group", "list"]);

      expect(mockAgent.groups!.listGroups).toHaveBeenCalledWith(undefined);
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    test("lists groups with --status filter", async () => {
      const mockGroups: SessionGroup[] = [
        {
          id: "group-1",
          name: "Running Group",
          slug: "running-group",
          status: "running",
          sessions: [],
          config: DEFAULT_GROUP_CONFIG,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      (mockAgent.groups!.listGroups as ReturnType<typeof vi.fn>).mockResolvedValue(mockGroups);

      await program.parseAsync([
        "node",
        "test",
        "group",
        "list",
        "--status",
        "running",
      ]);

      expect(mockAgent.groups!.listGroups).toHaveBeenCalledWith({
        status: "running",
      });
    });

    test("shows 'No groups found' for empty list", async () => {
      (mockAgent.groups!.listGroups as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await program.parseAsync(["node", "test", "group", "list"]);

      expect(consoleLogSpy).toHaveBeenCalledWith("No groups found.");
    });

    test("shows group with sessions table", async () => {
      const mockGroup: SessionGroup = {
        id: "group-123",
        name: "Test Group",
        slug: "test-group",
        description: "Test description",
        status: "running",
        sessions: [
          {
            id: "session-1",
            projectPath: "/path/to/project1",
            prompt: "Test prompt",
            status: "completed",
            dependsOn: [],
            createdAt: "2024-01-01T00:00:00Z",
            cost: 0.5,
          },
          {
            id: "session-2",
            projectPath: "/path/to/project2",
            prompt: "Another prompt",
            status: "running",
            dependsOn: ["session-1"],
            createdAt: "2024-01-02T00:00:00Z",
          },
        ],
        config: DEFAULT_GROUP_CONFIG,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
        startedAt: "2024-01-01T01:00:00Z",
      };

      (mockAgent.groups!.getGroup as ReturnType<typeof vi.fn>).mockResolvedValue(mockGroup);

      await program.parseAsync(["node", "test", "group", "show", "group-123"]);

      expect(mockAgent.groups!.getGroup).toHaveBeenCalledWith("group-123");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Test Group"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Test description"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Sessions (2)"),
      );
    });

    test("exits with code 1 when showing nonexistent group", async () => {
      (mockAgent.groups!.getGroup as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      try {
        await program.parseAsync([
          "node",
          "test",
          "group",
          "show",
          "nonexistent",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Group not found: nonexistent",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("deletes group with --force", async () => {
      const mockGroup: SessionGroup = {
        id: "group-123",
        name: "Test Group",
        slug: "test-group",
        status: "completed",
        sessions: [],
        config: DEFAULT_GROUP_CONFIG,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      (mockAgent.groups!.getGroup as ReturnType<typeof vi.fn>).mockResolvedValue(mockGroup);
      (mockAgent.groups!.deleteGroup as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await program.parseAsync([
        "node",
        "test",
        "group",
        "delete",
        "group-123",
        "--force",
      ]);

      expect(mockAgent.groups!.deleteGroup).toHaveBeenCalledWith("group-123");
      expect(printSuccessSpy).toHaveBeenCalledWith("Group deleted: group-123");
    });

    test("deletes group without --force (shows warning)", async () => {
      const mockGroup: SessionGroup = {
        id: "group-123",
        name: "Test Group",
        slug: "test-group",
        status: "completed",
        sessions: [],
        config: DEFAULT_GROUP_CONFIG,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      (mockAgent.groups!.getGroup as ReturnType<typeof vi.fn>).mockResolvedValue(mockGroup);

      try {
        await program.parseAsync([
          "node",
          "test",
          "group",
          "delete",
          "group-123",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Deletion cancelled. Use --force to proceed.",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(mockAgent.groups!.deleteGroup).not.toHaveBeenCalled();
    });

    test("exits with code 1 when deleting nonexistent group", async () => {
      (mockAgent.groups!.getGroup as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      try {
        await program.parseAsync([
          "node",
          "test",
          "group",
          "delete",
          "nonexistent",
          "--force",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Group not found: nonexistent",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(mockAgent.groups!.deleteGroup).not.toHaveBeenCalled();
    });

    test("formats output as JSON when --format json", async () => {
      const mockGroups: SessionGroup[] = [
        {
          id: "group-1",
          name: "Test Group",
          slug: "test-group",
          status: "created",
          sessions: [],
          config: DEFAULT_GROUP_CONFIG,
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
        },
      ];

      (mockAgent.groups!.listGroups as ReturnType<typeof vi.fn>).mockResolvedValue(mockGroups);

      await program.parseAsync([
        "node",
        "test",
        "--format",
        "json",
        "group",
        "list",
      ]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"id": "group-1"'),
      );
    });
  });

  describe("TEST-008: Group Execution Control", () => {
    test("runs group with default options", async () => {
      const mockGroup: SessionGroup = {
        id: "group-123",
        name: "Test Group",
        slug: "test-group",
        status: "created",
        sessions: [],
        config: DEFAULT_GROUP_CONFIG,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      (mockAgent.groups!.getGroup as ReturnType<typeof vi.fn>).mockResolvedValue(mockGroup);
      (mockAgent.groupRunner!.run as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await program.parseAsync(["node", "test", "group", "run", "group-123"]);

      expect(mockAgent.groups!.getGroup).toHaveBeenCalledWith("group-123");
      expect(mockAgent.groupRunner!.run).toHaveBeenCalledWith(mockGroup, {
        maxConcurrent: undefined,
        respectDependencies: true,
      });
      expect(printSuccessSpy).toHaveBeenCalledWith(
        "Group execution started: group-123",
      );
    });

    test("runs group with --concurrent option", async () => {
      const mockGroup: SessionGroup = {
        id: "group-123",
        name: "Test Group",
        slug: "test-group",
        status: "created",
        sessions: [],
        config: DEFAULT_GROUP_CONFIG,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      (mockAgent.groups!.getGroup as ReturnType<typeof vi.fn>).mockResolvedValue(mockGroup);
      (mockAgent.groupRunner!.run as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await program.parseAsync([
        "node",
        "test",
        "group",
        "run",
        "group-123",
        "--concurrent",
        "5",
      ]);

      expect(mockAgent.groupRunner!.run).toHaveBeenCalledWith(mockGroup, {
        maxConcurrent: 5,
        respectDependencies: true,
      });
    });

    test("runs group with --respect-dependencies", async () => {
      const mockGroup: SessionGroup = {
        id: "group-123",
        name: "Test Group",
        slug: "test-group",
        status: "created",
        sessions: [],
        config: DEFAULT_GROUP_CONFIG,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      (mockAgent.groups!.getGroup as ReturnType<typeof vi.fn>).mockResolvedValue(mockGroup);
      (mockAgent.groupRunner!.run as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await program.parseAsync([
        "node",
        "test",
        "group",
        "run",
        "group-123",
        "--respect-dependencies",
      ]);

      expect(mockAgent.groupRunner!.run).toHaveBeenCalledWith(mockGroup, {
        maxConcurrent: undefined,
        respectDependencies: true,
      });
    });

    test("runs group with both --concurrent and --respect-dependencies", async () => {
      const mockGroup: SessionGroup = {
        id: "group-123",
        name: "Test Group",
        slug: "test-group",
        status: "created",
        sessions: [],
        config: DEFAULT_GROUP_CONFIG,
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
      };

      (mockAgent.groups!.getGroup as ReturnType<typeof vi.fn>).mockResolvedValue(mockGroup);
      (mockAgent.groupRunner!.run as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await program.parseAsync([
        "node",
        "test",
        "group",
        "run",
        "group-123",
        "--concurrent",
        "3",
        "--respect-dependencies",
      ]);

      expect(mockAgent.groupRunner!.run).toHaveBeenCalledWith(mockGroup, {
        maxConcurrent: 3,
        respectDependencies: true,
      });
    });

    test("exits with code 1 when running nonexistent group", async () => {
      (mockAgent.groups!.getGroup as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      try {
        await program.parseAsync([
          "node",
          "test",
          "group",
          "run",
          "nonexistent",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Group not found: nonexistent",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(mockAgent.groupRunner!.run).not.toHaveBeenCalled();
    });

    test("pauses running group", async () => {
      (mockAgent.groupRunner!.pause as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await program.parseAsync(["node", "test", "group", "pause", "group-123"]);

      expect(mockAgent.groupRunner!.pause).toHaveBeenCalledWith("manual");
      expect(printSuccessSpy).toHaveBeenCalledWith("Group paused: group-123");
    });

    test("resumes paused group", async () => {
      (mockAgent.groupRunner!.resume as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await program.parseAsync([
        "node",
        "test",
        "group",
        "resume",
        "group-123",
      ]);

      expect(mockAgent.groupRunner!.resume).toHaveBeenCalled();
      expect(printSuccessSpy).toHaveBeenCalledWith("Group resumed: group-123");
    });

    test("archives completed group", async () => {
      (mockAgent.groups!.archiveGroup as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      await program.parseAsync([
        "node",
        "test",
        "group",
        "archive",
        "group-123",
      ]);

      expect(mockAgent.groups!.archiveGroup).toHaveBeenCalledWith("group-123");
      expect(printSuccessSpy).toHaveBeenCalledWith(
        "Group archived: group-123",
      );
    });

    test("watch exits with code 1 (not implemented)", async () => {
      try {
        await program.parseAsync([
          "node",
          "test",
          "group",
          "watch",
          "group-123",
        ]);
      } catch (error) {
        // Expected to throw
      }

      expect(printErrorSpy).toHaveBeenCalledWith(
        "group watch: Not yet implemented",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });
});
