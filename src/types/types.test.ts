/**
 * Tests for core types.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  toSessionMetadata,
  isTerminalStatus,
  canResume,
  hasToolCalls,
  hasToolResults,
  isAssistantToolUseMessage,
  isUserToolResultMessage,
  getMessageKind,
  isToolRelatedMessage,
  calculateTaskProgress,
  getDefaultConfig,
  mergeConfig,
} from "./index";
import type { Session, Message, Task, AgentConfig } from "./index";

describe("Session types", () => {
  describe("toSessionMetadata", () => {
    it("extracts metadata from session", () => {
      const session: Session = {
        id: "session-123",
        projectPath: "/path/to/project",
        status: "completed",
        createdAt: "2026-01-05T00:00:00.000Z",
        updatedAt: "2026-01-05T01:00:00.000Z",
        messages: [
          {
            id: "msg-1",
            role: "user",
            content: "Hello",
            timestamp: "2026-01-05T00:00:00.000Z",
          },
          {
            id: "msg-2",
            role: "assistant",
            content: "Hi there",
            timestamp: "2026-01-05T00:00:01.000Z",
          },
        ],
        tasks: [],
        tokenUsage: { input: 100, output: 50 },
        costUsd: 0.05,
      };

      const metadata = toSessionMetadata(session);

      expect(metadata.id).toBe("session-123");
      expect(metadata.projectPath).toBe("/path/to/project");
      expect(metadata.status).toBe("completed");
      expect(metadata.messageCount).toBe(2);
      expect(metadata.tokenUsage).toEqual({ input: 100, output: 50 });
      expect(metadata.costUsd).toBe(0.05);
    });
  });

  describe("isTerminalStatus", () => {
    it("returns true for completed", () => {
      expect(isTerminalStatus("completed")).toBe(true);
    });

    it("returns true for failed", () => {
      expect(isTerminalStatus("failed")).toBe(true);
    });

    it("returns false for active", () => {
      expect(isTerminalStatus("active")).toBe(false);
    });

    it("returns false for paused", () => {
      expect(isTerminalStatus("paused")).toBe(false);
    });
  });

  describe("canResume", () => {
    it("returns true for paused", () => {
      expect(canResume("paused")).toBe(true);
    });

    it("returns false for other statuses", () => {
      expect(canResume("active")).toBe(false);
      expect(canResume("completed")).toBe(false);
      expect(canResume("failed")).toBe(false);
    });
  });
});

describe("Message types", () => {
  describe("hasToolCalls", () => {
    it("returns true for messages with tool calls", () => {
      const message: Message = {
        id: "msg-1",
        role: "assistant",
        content: "Let me read that file",
        timestamp: "2026-01-05T00:00:00.000Z",
        toolCalls: [
          { id: "tool-1", name: "Read", input: { file_path: "/path/to/file" } },
        ],
      };

      expect(hasToolCalls(message)).toBe(true);
    });

    it("returns false for messages without tool calls", () => {
      const message: Message = {
        id: "msg-1",
        role: "user",
        content: "Hello",
        timestamp: "2026-01-05T00:00:00.000Z",
      };

      expect(hasToolCalls(message)).toBe(false);
    });

    it("returns false for empty tool calls array", () => {
      const message: Message = {
        id: "msg-1",
        role: "assistant",
        content: "Done",
        timestamp: "2026-01-05T00:00:00.000Z",
        toolCalls: [],
      };

      expect(hasToolCalls(message)).toBe(false);
    });
  });

  describe("hasToolResults", () => {
    it("returns true for messages with tool results", () => {
      const message: Message = {
        id: "msg-1",
        role: "system",
        content: "",
        timestamp: "2026-01-05T00:00:00.000Z",
        toolResults: [
          { id: "tool-1", output: "file contents", isError: false },
        ],
      };

      expect(hasToolResults(message)).toBe(true);
    });

    it("returns false for messages without tool results", () => {
      const message: Message = {
        id: "msg-1",
        role: "assistant",
        content: "Hello",
        timestamp: "2026-01-05T00:00:00.000Z",
      };

      expect(hasToolResults(message)).toBe(false);
    });
  });

  describe("tool-related classification", () => {
    it("classifies assistant tool_use messages", () => {
      const message: Message = {
        id: "msg-1",
        role: "assistant",
        content: "Reading file",
        timestamp: "2026-01-05T00:00:00.000Z",
        toolCalls: [{ id: "tool-1", name: "Read", input: {} }],
      };

      expect(isAssistantToolUseMessage(message)).toBe(true);
      expect(isUserToolResultMessage(message)).toBe(false);
      expect(getMessageKind(message)).toBe("assistant_tool_use");
      expect(isToolRelatedMessage(message)).toBe(true);
    });

    it("classifies user tool_result messages", () => {
      const message: Message = {
        id: "msg-2",
        role: "user",
        content: "",
        timestamp: "2026-01-05T00:00:01.000Z",
        toolResults: [{ id: "tool-1", output: "result", isError: false }],
      };

      expect(isAssistantToolUseMessage(message)).toBe(false);
      expect(isUserToolResultMessage(message)).toBe(true);
      expect(getMessageKind(message)).toBe("user_tool_result");
      expect(isToolRelatedMessage(message)).toBe(true);
    });

    it("classifies normal messages as other", () => {
      const message: Message = {
        id: "msg-3",
        role: "assistant",
        content: "Done",
        timestamp: "2026-01-05T00:00:02.000Z",
      };

      expect(isAssistantToolUseMessage(message)).toBe(false);
      expect(isUserToolResultMessage(message)).toBe(false);
      expect(getMessageKind(message)).toBe("other");
      expect(isToolRelatedMessage(message)).toBe(false);
    });

    it("classifies toolCalls payload even with non-assistant role", () => {
      const message: Message = {
        id: "msg-4",
        role: "user",
        content: "",
        timestamp: "2026-01-05T00:00:03.000Z",
        toolCalls: [{ id: "tool-1", name: "Read", input: {} }],
      };

      expect(isAssistantToolUseMessage(message)).toBe(false);
      expect(getMessageKind(message)).toBe("assistant_tool_use");
      expect(isToolRelatedMessage(message)).toBe(true);
    });

    it("classifies toolResults payload even with non-user role", () => {
      const message: Message = {
        id: "msg-5",
        role: "system",
        content: "",
        timestamp: "2026-01-05T00:00:04.000Z",
        toolResults: [{ id: "tool-1", output: "result", isError: false }],
      };

      expect(isUserToolResultMessage(message)).toBe(false);
      expect(getMessageKind(message)).toBe("user_tool_result");
      expect(isToolRelatedMessage(message)).toBe(true);
    });

    it("classifies malformed tool blocks as tool-related via block flags", () => {
      const malformedToolUse: Message = {
        id: "msg-6",
        role: "assistant",
        content: "",
        timestamp: "2026-01-05T00:00:05.000Z",
        hasToolUseBlocks: true,
      };
      const malformedToolResult: Message = {
        id: "msg-7",
        role: "user",
        content: "",
        timestamp: "2026-01-05T00:00:06.000Z",
        hasToolResultBlocks: true,
      };

      expect(getMessageKind(malformedToolUse)).toBe("assistant_tool_use");
      expect(isToolRelatedMessage(malformedToolUse)).toBe(true);
      expect(getMessageKind(malformedToolResult)).toBe("user_tool_result");
      expect(isToolRelatedMessage(malformedToolResult)).toBe(true);
    });
  });
});

describe("Task types", () => {
  describe("calculateTaskProgress", () => {
    it("calculates progress correctly", () => {
      const tasks: Task[] = [
        { content: "Task 1", status: "completed", activeForm: "Doing task 1" },
        { content: "Task 2", status: "completed", activeForm: "Doing task 2" },
        {
          content: "Task 3",
          status: "in_progress",
          activeForm: "Doing task 3",
        },
        { content: "Task 4", status: "pending", activeForm: "Doing task 4" },
        { content: "Task 5", status: "pending", activeForm: "Doing task 5" },
      ];

      const progress = calculateTaskProgress(tasks);

      expect(progress.total).toBe(5);
      expect(progress.completed).toBe(2);
      expect(progress.inProgress).toBe(1);
      expect(progress.pending).toBe(2);
    });

    it("handles empty task list", () => {
      const progress = calculateTaskProgress([]);

      expect(progress.total).toBe(0);
      expect(progress.completed).toBe(0);
      expect(progress.inProgress).toBe(0);
      expect(progress.pending).toBe(0);
    });
  });
});

describe("Config types", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getDefaultConfig", () => {
    it("returns config with default paths", () => {
      process.env["HOME"] = "/home/test";
      delete process.env["XDG_DATA_HOME"];

      const config = getDefaultConfig();

      expect(config.claudeDataDir).toBe("/home/test/.claude");
      expect(config.metadataDir).toBe(
        "/home/test/.local/share/claude-code-agent",
      );
      expect(config.claudeExecutable).toBe("claude");
      expect(config.logging?.level).toBe("info");
    });

    it("uses XDG_DATA_HOME when set", () => {
      process.env["HOME"] = "/home/test";
      process.env["XDG_DATA_HOME"] = "/custom/data";

      const config = getDefaultConfig();

      expect(config.metadataDir).toBe("/custom/data/claude-code-agent");
    });
  });

  describe("mergeConfig", () => {
    it("merges overrides with defaults", () => {
      const defaults: AgentConfig = {
        claudeDataDir: "/default/claude",
        metadataDir: "/default/metadata",
        claudeExecutable: "claude",
        logging: { level: "info" },
      };

      const overrides: Partial<AgentConfig> = {
        claudeDataDir: "/custom/claude",
        logging: { level: "debug" },
      };

      const merged = mergeConfig(defaults, overrides);

      expect(merged.claudeDataDir).toBe("/custom/claude");
      expect(merged.metadataDir).toBe("/default/metadata");
      expect(merged.logging?.level).toBe("debug");
    });

    it("keeps defaults when no overrides", () => {
      const defaults: AgentConfig = {
        claudeDataDir: "/default/claude",
        metadataDir: "/default/metadata",
        claudeExecutable: "claude",
        logging: { level: "info" },
      };

      const merged = mergeConfig(defaults, {});

      expect(merged).toEqual(defaults);
    });
  });
});
