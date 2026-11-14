import { describe, test, expect } from "vitest";
import {
  isTerminalState,
  isValidSessionState,
  type SessionState,
  type PendingToolCall,
  type PendingPermission,
  type SessionStats,
  type SessionStateInfo,
} from "./state";

describe("SessionState type", () => {
  test("all state values are valid", () => {
    const states: SessionState[] = [
      "idle",
      "starting",
      "running",
      "waiting_tool_call",
      "waiting_permission",
      "paused",
      "completed",
      "failed",
      "cancelled",
    ];

    for (const state of states) {
      expect(isValidSessionState(state)).toBe(true);
    }
  });
});

describe("isTerminalState", () => {
  test("returns true for terminal states", () => {
    expect(isTerminalState("completed")).toBe(true);
    expect(isTerminalState("failed")).toBe(true);
    expect(isTerminalState("cancelled")).toBe(true);
  });

  test("returns false for non-terminal states", () => {
    expect(isTerminalState("idle")).toBe(false);
    expect(isTerminalState("starting")).toBe(false);
    expect(isTerminalState("running")).toBe(false);
    expect(isTerminalState("waiting_tool_call")).toBe(false);
    expect(isTerminalState("waiting_permission")).toBe(false);
    expect(isTerminalState("paused")).toBe(false);
  });
});

describe("isValidSessionState", () => {
  test("returns true for valid session states", () => {
    expect(isValidSessionState("idle")).toBe(true);
    expect(isValidSessionState("starting")).toBe(true);
    expect(isValidSessionState("running")).toBe(true);
    expect(isValidSessionState("waiting_tool_call")).toBe(true);
    expect(isValidSessionState("waiting_permission")).toBe(true);
    expect(isValidSessionState("paused")).toBe(true);
    expect(isValidSessionState("completed")).toBe(true);
    expect(isValidSessionState("failed")).toBe(true);
    expect(isValidSessionState("cancelled")).toBe(true);
  });

  test("returns false for invalid states", () => {
    expect(isValidSessionState("invalid")).toBe(false);
    expect(isValidSessionState("RUNNING")).toBe(false);
    expect(isValidSessionState("")).toBe(false);
    expect(isValidSessionState(null)).toBe(false);
    expect(isValidSessionState(undefined)).toBe(false);
    expect(isValidSessionState(123)).toBe(false);
    expect(isValidSessionState({})).toBe(false);
    expect(isValidSessionState([])).toBe(false);
  });

  test("type guard narrows type correctly", () => {
    const value: unknown = "running";
    if (isValidSessionState(value)) {
      // This should compile without error
      const state: SessionState = value;
      expect(state).toBe("running");
    }
  });
});

describe("PendingToolCall interface", () => {
  test("creates valid pending tool call", () => {
    const pendingCall: PendingToolCall = {
      toolUseId: "toolu_01ABC123DEF456",
      toolName: "calculator_add",
      serverName: "calculator",
      arguments: { a: 15, b: 27 },
      startedAt: "2026-01-10T10:05:00.000Z",
    };

    expect(pendingCall.toolUseId).toBe("toolu_01ABC123DEF456");
    expect(pendingCall.toolName).toBe("calculator_add");
    expect(pendingCall.serverName).toBe("calculator");
    expect(pendingCall.arguments).toEqual({ a: 15, b: 27 });
    expect(pendingCall.startedAt).toBe("2026-01-10T10:05:00.000Z");
  });

  test("allows complex arguments", () => {
    const pendingCall: PendingToolCall = {
      toolUseId: "toolu_02XYZ789GHI012",
      toolName: "database_query",
      serverName: "database",
      arguments: {
        sql: "SELECT * FROM users WHERE id = $1",
        params: [123],
        options: { timeout: 5000 },
      },
      startedAt: "2026-01-10T10:10:00.000Z",
    };

    expect(pendingCall.arguments).toEqual({
      sql: "SELECT * FROM users WHERE id = $1",
      params: [123],
      options: { timeout: 5000 },
    });
  });
});

describe("PendingPermission interface", () => {
  test("creates valid pending permission", () => {
    const pendingPerm: PendingPermission = {
      requestId: "perm_01XYZ789ABC123",
      toolName: "Bash",
      toolInput: { command: "rm -rf /tmp/cache" },
    };

    expect(pendingPerm.requestId).toBe("perm_01XYZ789ABC123");
    expect(pendingPerm.toolName).toBe("Bash");
    expect(pendingPerm.toolInput).toEqual({ command: "rm -rf /tmp/cache" });
  });

  test("allows complex tool input", () => {
    const pendingPerm: PendingPermission = {
      requestId: "perm_02ABC456DEF789",
      toolName: "Write",
      toolInput: {
        file_path: "./src/app.ts",
        content: "console.log('Hello');",
        options: { encoding: "utf-8" },
      },
    };

    expect(pendingPerm.toolInput).toEqual({
      file_path: "./src/app.ts",
      content: "console.log('Hello');",
      options: { encoding: "utf-8" },
    });
  });
});

describe("SessionStats interface", () => {
  test("creates stats with all fields", () => {
    const stats: SessionStats = {
      startedAt: "2026-01-10T10:00:00.000Z",
      completedAt: "2026-01-10T10:15:30.000Z",
      toolCallCount: 12,
      messageCount: 8,
    };

    expect(stats.startedAt).toBe("2026-01-10T10:00:00.000Z");
    expect(stats.completedAt).toBe("2026-01-10T10:15:30.000Z");
    expect(stats.toolCallCount).toBe(12);
    expect(stats.messageCount).toBe(8);
  });

  test("creates stats without timestamps", () => {
    const stats: SessionStats = {
      toolCallCount: 5,
      messageCount: 3,
    };

    expect(stats.startedAt).toBeUndefined();
    expect(stats.completedAt).toBeUndefined();
    expect(stats.toolCallCount).toBe(5);
    expect(stats.messageCount).toBe(3);
  });

  test("creates stats with zero counts", () => {
    const stats: SessionStats = {
      toolCallCount: 0,
      messageCount: 0,
    };

    expect(stats.toolCallCount).toBe(0);
    expect(stats.messageCount).toBe(0);
  });
});

describe("SessionStateInfo interface", () => {
  test("creates idle session state info", () => {
    const stateInfo: SessionStateInfo = {
      state: "idle",
      sessionId: "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
      stats: {
        toolCallCount: 0,
        messageCount: 0,
      },
    };

    expect(stateInfo.state).toBe("idle");
    expect(stateInfo.sessionId).toBe("0dc4ee1f-2e78-462f-a400-16d14ab6a418");
    expect(stateInfo.pendingToolCall).toBeUndefined();
    expect(stateInfo.pendingPermission).toBeUndefined();
    expect(stateInfo.stats.toolCallCount).toBe(0);
  });

  test("creates running session state info", () => {
    const stateInfo: SessionStateInfo = {
      state: "running",
      sessionId: "abc12345-def6-7890-ghij-klmnopqrstuv",
      stats: {
        startedAt: "2026-01-10T10:00:00.000Z",
        toolCallCount: 3,
        messageCount: 5,
      },
    };

    expect(stateInfo.state).toBe("running");
    expect(stateInfo.stats.startedAt).toBe("2026-01-10T10:00:00.000Z");
    expect(stateInfo.stats.toolCallCount).toBe(3);
    expect(stateInfo.stats.messageCount).toBe(5);
  });

  test("creates waiting_tool_call session state info", () => {
    const stateInfo: SessionStateInfo = {
      state: "waiting_tool_call",
      sessionId: "session-123",
      pendingToolCall: {
        toolUseId: "toolu_01ABC123DEF456",
        toolName: "calculator_add",
        serverName: "calculator",
        arguments: { a: 15, b: 27 },
        startedAt: "2026-01-10T10:05:00.000Z",
      },
      stats: {
        startedAt: "2026-01-10T10:00:00.000Z",
        toolCallCount: 4,
        messageCount: 6,
      },
    };

    expect(stateInfo.state).toBe("waiting_tool_call");
    expect(stateInfo.pendingToolCall).toBeDefined();
    expect(stateInfo.pendingToolCall?.toolName).toBe("calculator_add");
    expect(stateInfo.pendingToolCall?.arguments).toEqual({ a: 15, b: 27 });
  });

  test("creates waiting_permission session state info", () => {
    const stateInfo: SessionStateInfo = {
      state: "waiting_permission",
      sessionId: "session-456",
      pendingPermission: {
        requestId: "perm_01XYZ789ABC123",
        toolName: "Bash",
        toolInput: { command: "rm -rf /tmp/cache" },
      },
      stats: {
        startedAt: "2026-01-10T10:00:00.000Z",
        toolCallCount: 2,
        messageCount: 4,
      },
    };

    expect(stateInfo.state).toBe("waiting_permission");
    expect(stateInfo.pendingPermission).toBeDefined();
    expect(stateInfo.pendingPermission?.toolName).toBe("Bash");
    expect(stateInfo.pendingPermission?.toolInput).toEqual({
      command: "rm -rf /tmp/cache",
    });
  });

  test("creates completed session state info", () => {
    const stateInfo: SessionStateInfo = {
      state: "completed",
      sessionId: "session-789",
      stats: {
        startedAt: "2026-01-10T10:00:00.000Z",
        completedAt: "2026-01-10T10:15:30.000Z",
        toolCallCount: 12,
        messageCount: 8,
      },
    };

    expect(stateInfo.state).toBe("completed");
    expect(stateInfo.stats.completedAt).toBe("2026-01-10T10:15:30.000Z");
    expect(isTerminalState(stateInfo.state)).toBe(true);
  });

  test("creates failed session state info", () => {
    const stateInfo: SessionStateInfo = {
      state: "failed",
      sessionId: "session-error",
      stats: {
        startedAt: "2026-01-10T10:00:00.000Z",
        completedAt: "2026-01-10T10:05:00.000Z",
        toolCallCount: 2,
        messageCount: 3,
      },
    };

    expect(stateInfo.state).toBe("failed");
    expect(isTerminalState(stateInfo.state)).toBe(true);
  });

  test("creates cancelled session state info", () => {
    const stateInfo: SessionStateInfo = {
      state: "cancelled",
      sessionId: "session-cancelled",
      stats: {
        startedAt: "2026-01-10T10:00:00.000Z",
        completedAt: "2026-01-10T10:02:00.000Z",
        toolCallCount: 1,
        messageCount: 2,
      },
    };

    expect(stateInfo.state).toBe("cancelled");
    expect(isTerminalState(stateInfo.state)).toBe(true);
  });
});
