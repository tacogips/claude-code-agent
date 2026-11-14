/**
 * Tests for session CLI commands.
 *
 * Covers session show --tasks and session tasks subcommand.
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
import { registerSessionCommands } from "./session";
import type { SdkManager } from "../../sdk/agent";
import type { SessionRunnerOptions } from "../../sdk/agent";
import type { Session } from "../../types/session";
import type { Task } from "../../types/task";
import * as output from "../output";

describe("Session Commands", () => {
  let program: Command;
  let mockAgent: Partial<SdkManager>;
  let mockSessionRunner: {
    startSession: ReturnType<typeof vi.fn>;
  };
  let mockCreateSessionRunner: ReturnType<typeof vi.fn>;
  let consoleLogSpy: MockInstance;
  let printErrorSpy: MockInstance;
  let stdoutWriteSpy: MockInstance;

  const mockTasks: readonly Task[] = [
    {
      content: "Fix authentication bug",
      status: "completed",
      activeForm: "Fixing authentication bug",
    },
    {
      content: "Add unit tests",
      status: "in_progress",
      activeForm: "Adding unit tests",
    },
    {
      content: "Update documentation",
      status: "pending",
      activeForm: "Updating documentation",
    },
  ];

  const mockSession: Session = {
    id: "test-session-123",
    projectPath: "/test/project",
    status: "active",
    createdAt: "2026-01-13T10:00:00.000Z",
    updatedAt: "2026-01-13T11:00:00.000Z",
    messages: [
      {
        id: "msg-1",
        role: "user",
        content: "Help me fix a bug",
        timestamp: "2026-01-13T10:00:00.000Z",
      },
      {
        id: "msg-2",
        role: "assistant",
        content: "I'll help you fix the bug.",
        timestamp: "2026-01-13T10:00:01.000Z",
      },
    ],
    tasks: mockTasks,
    tokenUsage: {
      input: 100,
      output: 200,
    },
  };

  const mockSessionNoTasks: Session = {
    ...mockSession,
    id: "test-session-no-tasks",
    tasks: [],
  };

  beforeEach(() => {
    // Create fresh program for each test
    program = new Command();
    program.exitOverride(); // Prevent actual process.exit
    program.option("--format <format>", "Output format", "table");

    // Create mock agent
    mockAgent = {
      sessions: {
        getSession: vi.fn(),
        listSessions: vi.fn(),
        readSession: vi.fn(),
        readMessages: vi.fn(),
        findSessionFiles: vi.fn(),
        getMessages: vi.fn(),
      } as any,
      parseMarkdown: vi.fn().mockReturnValue({ sections: [] }),
    };

    mockSessionRunner = {
      startSession: vi.fn(),
    };
    mockCreateSessionRunner = vi
      .fn<(options?: SessionRunnerOptions) => unknown>()
      .mockReturnValue(mockSessionRunner);

    // Spy on process.exit, console.log, and output functions
    vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as any);
    consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    printErrorSpy = vi.spyOn(output, "printError").mockImplementation(() => {});
    stdoutWriteSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);

    // Register commands
    registerSessionCommands(
      program,
      async () => mockAgent as SdkManager,
      mockCreateSessionRunner as unknown as (
        options?: SessionRunnerOptions,
      ) => any,
    );

    // Clear mock calls from registration
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("session show --tasks", () => {
    test("shows tasks in table format when --tasks flag is provided", async () => {
      (
        mockAgent.sessions!.getSession as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockSession);

      await program.parseAsync([
        "node",
        "test",
        "session",
        "show",
        "test-session-123",
        "--tasks",
      ]);

      expect(mockAgent.sessions!.getSession).toHaveBeenCalledWith(
        "test-session-123",
      );

      // Check that task-related output was logged
      const logCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      expect(logCalls.some((log) => String(log).includes("Tasks"))).toBe(true);
      expect(
        logCalls.some((log) => String(log).includes("1/3 completed")),
      ).toBe(true);
    });

    test("shows taskProgress in JSON format when --tasks flag is provided", async () => {
      (
        mockAgent.sessions!.getSession as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockSession);

      await program.parseAsync([
        "node",
        "test",
        "--format",
        "json",
        "session",
        "show",
        "test-session-123",
        "--tasks",
      ]);

      expect(mockAgent.sessions!.getSession).toHaveBeenCalledWith(
        "test-session-123",
      );

      // Check that JSON output includes taskProgress
      expect(consoleLogSpy).toHaveBeenCalled();
      const firstCall = consoleLogSpy.mock.calls[0];
      expect(firstCall).toBeDefined();
      const jsonOutput = firstCall?.[0] as string;
      const parsed = JSON.parse(jsonOutput);
      expect(parsed.taskProgress).toEqual({
        total: 3,
        completed: 1,
        inProgress: 1,
        pending: 1,
      });
    });

    test("shows 'No tasks found.' when session has no tasks", async () => {
      (
        mockAgent.sessions!.getSession as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockSessionNoTasks);

      await program.parseAsync([
        "node",
        "test",
        "session",
        "show",
        "test-session-no-tasks",
        "--tasks",
      ]);

      const logCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      expect(
        logCalls.some((log) => String(log).includes("No tasks found")),
      ).toBe(true);
    });

    test("works with --parse-markdown and --tasks together", async () => {
      (
        mockAgent.sessions!.getSession as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockSession);

      await program.parseAsync([
        "node",
        "test",
        "session",
        "show",
        "test-session-123",
        "--tasks",
        "--parse-markdown",
      ]);

      expect(mockAgent.sessions!.getSession).toHaveBeenCalledWith(
        "test-session-123",
      );
      expect(mockAgent.parseMarkdown).toHaveBeenCalled();

      const logCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      expect(logCalls.some((log) => String(log).includes("Tasks"))).toBe(true);
    });
  });

  describe("session tasks", () => {
    test("lists tasks in table format", async () => {
      (
        mockAgent.sessions!.getSession as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockSession);

      await program.parseAsync([
        "node",
        "test",
        "session",
        "tasks",
        "test-session-123",
      ]);

      expect(mockAgent.sessions!.getSession).toHaveBeenCalledWith(
        "test-session-123",
      );

      const logCalls = consoleLogSpy.mock.calls.map((call) => call[0]);

      // Check session info is displayed
      expect(
        logCalls.some((log) =>
          String(log).includes("Session: test-session-123"),
        ),
      ).toBe(true);
      expect(
        logCalls.some((log) => String(log).includes("Project: /test/project")),
      ).toBe(true);

      // Check progress is displayed
      expect(
        logCalls.some((log) =>
          String(log).includes("Progress: 1/3 completed (1 in progress)"),
        ),
      ).toBe(true);
    });

    test("lists tasks in JSON format", async () => {
      (
        mockAgent.sessions!.getSession as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockSession);

      await program.parseAsync([
        "node",
        "test",
        "--format",
        "json",
        "session",
        "tasks",
        "test-session-123",
      ]);

      expect(mockAgent.sessions!.getSession).toHaveBeenCalledWith(
        "test-session-123",
      );

      expect(consoleLogSpy).toHaveBeenCalled();
      const firstCall = consoleLogSpy.mock.calls[0];
      expect(firstCall).toBeDefined();
      const jsonOutput = firstCall?.[0] as string;
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.sessionId).toBe("test-session-123");
      expect(parsed.projectPath).toBe("/test/project");
      expect(parsed.tasks).toHaveLength(3);
      expect(parsed.progress).toEqual({
        total: 3,
        completed: 1,
        inProgress: 1,
        pending: 1,
      });
    });

    test("shows 'No tasks found.' when session has no tasks", async () => {
      (
        mockAgent.sessions!.getSession as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockSessionNoTasks);

      await program.parseAsync([
        "node",
        "test",
        "session",
        "tasks",
        "test-session-no-tasks",
      ]);

      const logCalls = consoleLogSpy.mock.calls.map((call) => call[0]);
      expect(
        logCalls.some((log) => String(log).includes("No tasks found.")),
      ).toBe(true);
    });

    test("shows error when session not found", async () => {
      (
        mockAgent.sessions!.getSession as ReturnType<typeof vi.fn>
      ).mockResolvedValue(null);

      await expect(
        program.parseAsync([
          "node",
          "test",
          "session",
          "tasks",
          "non-existent-session",
        ]),
      ).rejects.toThrow("process.exit called");

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Session not found: non-existent-session",
      );
    });

    test("JSON output for empty tasks includes empty array and zero progress", async () => {
      (
        mockAgent.sessions!.getSession as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockSessionNoTasks);

      await program.parseAsync([
        "node",
        "test",
        "--format",
        "json",
        "session",
        "tasks",
        "test-session-no-tasks",
      ]);

      const firstCall = consoleLogSpy.mock.calls[0];
      expect(firstCall).toBeDefined();
      const jsonOutput = firstCall?.[0] as string;
      const parsed = JSON.parse(jsonOutput);

      expect(parsed.tasks).toEqual([]);
      expect(parsed.progress).toEqual({
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
      });
    });
  });

  describe("session run", () => {
    test("streams assistant text in char mode with incremental dedup", async () => {
      const messages = async function* () {
        yield {
          type: "assistant",
          message: {
            id: "msg-1",
            role: "assistant",
            content: [{ type: "text", text: "Hel" }],
          },
        };
        yield {
          type: "assistant",
          message: {
            id: "msg-1",
            role: "assistant",
            content: [{ type: "text", text: "Hello" }],
          },
        };
      };

      mockSessionRunner.startSession.mockResolvedValue({
        messages,
        waitForCompletion: vi.fn().mockResolvedValue({ success: true }),
      });

      await program.parseAsync([
        "node",
        "test",
        "session",
        "run",
        "--prompt",
        "say hello",
        "--stream-granularity",
        "char",
        "--char-delay-ms",
        "0",
      ]);

      expect(mockCreateSessionRunner).toHaveBeenCalledWith({});
      expect(mockSessionRunner.startSession).toHaveBeenCalledWith({
        prompt: "say hello",
      });

      const rendered = stdoutWriteSpy.mock.calls
        .map((call) => call[0] as string)
        .join("");
      expect(rendered).toBe("Hello\n");
    });

    test("prints JSON events in event mode", async () => {
      const messages = async function* () {
        yield { type: "assistant", content: "hello" };
        yield { type: "result", subtype: "success" };
      };

      mockSessionRunner.startSession.mockResolvedValue({
        messages,
        waitForCompletion: vi.fn().mockResolvedValue({ success: true }),
      });

      await program.parseAsync([
        "node",
        "test",
        "session",
        "run",
        "--prompt",
        "say hello",
        "--stream-granularity",
        "event",
      ]);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({ type: "assistant", content: "hello" }),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        JSON.stringify({ type: "result", subtype: "success" }),
      );
    });

    test("fails when prompt is missing", async () => {
      await expect(
        program.parseAsync(["node", "test", "session", "run"]),
      ).rejects.toThrow("process.exit called");

      expect(printErrorSpy).toHaveBeenCalledWith(
        "Usage: claude-code-agent session run --prompt <text>",
      );
    });
  });
});
