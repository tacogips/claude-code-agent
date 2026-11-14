/**
 * Tests for StateManager
 */

import { describe, expect, test } from "vitest";
import { createEventEmitter } from "../sdk/events/emitter";
import type {
  MessageEvent,
  MonitorEvent,
  SubagentEndEvent,
  SubagentStartEvent,
  TaskUpdateEvent,
  ToolEndEvent,
  ToolStartEvent,
} from "./output";
import { StateManager } from "./state-manager";

describe("StateManager", () => {
  describe("processEvents", () => {
    test("processes empty array", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      stateManager.processEvents([]);

      const state = stateManager.getSessionState("session-123");
      expect(state).toBeUndefined();
    });

    test("creates session state on first event", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "tool_start",
          sessionId: "session-123",
          tool: "Task",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies ToolStartEvent,
      ];

      stateManager.processEvents(events);

      const state = stateManager.getSessionState("session-123");
      expect(state).toBeDefined();
      expect(state?.sessionId).toBe("session-123");
    });

    test("processes multiple events in order", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "tool_start",
          sessionId: "session-123",
          tool: "Task",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies ToolStartEvent,
        {
          type: "message",
          sessionId: "session-123",
          role: "user",
          content: "Hello",
          timestamp: "2026-01-06T10:00:01.000Z",
        } satisfies MessageEvent,
        {
          type: "tool_end",
          sessionId: "session-123",
          tool: "Task",
          duration: 5000,
          timestamp: "2026-01-06T10:00:05.000Z",
        } satisfies ToolEndEvent,
      ];

      stateManager.processEvents(events);

      const state = stateManager.getSessionState("session-123");
      expect(state?.messageCount).toBe(1);
      expect(state?.activeTools.size).toBe(0); // Tool ended
    });
  });

  describe("tool tracking", () => {
    test("tracks tool start", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "tool_start",
          sessionId: "session-123",
          tool: "Task",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies ToolStartEvent,
      ];

      stateManager.processEvents(events);

      const tools = stateManager.getActiveTools("session-123");
      expect(tools).toEqual(["Task"]);

      const state = stateManager.getSessionState("session-123");
      const activeTool = state?.activeTools.get("Task");
      expect(activeTool).toBeDefined();
      expect(activeTool?.tool).toBe("Task");
      expect(activeTool?.startedAt).toBe("2026-01-06T10:00:00.000Z");
    });

    test("tracks multiple tools concurrently", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "tool_start",
          sessionId: "session-123",
          tool: "Read",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies ToolStartEvent,
        {
          type: "tool_start",
          sessionId: "session-123",
          tool: "Write",
          timestamp: "2026-01-06T10:00:01.000Z",
        } satisfies ToolStartEvent,
      ];

      stateManager.processEvents(events);

      const tools = stateManager.getActiveTools("session-123");
      expect(tools).toHaveLength(2);
      expect(tools).toContain("Read");
      expect(tools).toContain("Write");
    });

    test("removes tool on tool_end", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "tool_start",
          sessionId: "session-123",
          tool: "Task",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies ToolStartEvent,
        {
          type: "tool_end",
          sessionId: "session-123",
          tool: "Task",
          duration: 5000,
          timestamp: "2026-01-06T10:00:05.000Z",
        } satisfies ToolEndEvent,
      ];

      stateManager.processEvents(events);

      const tools = stateManager.getActiveTools("session-123");
      expect(tools).toEqual([]);
    });

    test("handles tool_end without tool_start", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "tool_end",
          sessionId: "session-123",
          tool: "Task",
          duration: 0,
          timestamp: "2026-01-06T10:00:05.000Z",
        } satisfies ToolEndEvent,
      ];

      stateManager.processEvents(events);

      const tools = stateManager.getActiveTools("session-123");
      expect(tools).toEqual([]);
    });

    test("updates lastUpdated on tool events", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "tool_start",
          sessionId: "session-123",
          tool: "Task",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies ToolStartEvent,
      ];

      stateManager.processEvents(events);

      const state = stateManager.getSessionState("session-123");
      expect(state?.lastUpdated).toBe("2026-01-06T10:00:00.000Z");
    });
  });

  describe("subagent tracking", () => {
    test("tracks subagent start", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "subagent_start",
          sessionId: "session-123",
          agentId: "agent-456",
          agentType: "ts-coding",
          description: "Implement feature X",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies SubagentStartEvent,
      ];

      stateManager.processEvents(events);

      const subagents = stateManager.getActiveSubagents("session-123");
      expect(subagents).toHaveLength(1);
      expect(subagents[0]?.agentId).toBe("agent-456");
      expect(subagents[0]?.agentType).toBe("ts-coding");
      expect(subagents[0]?.description).toBe("Implement feature X");
      expect(subagents[0]?.status).toBe("running");
      expect(subagents[0]?.startedAt).toBe("2026-01-06T10:00:00.000Z");
      expect(subagents[0]?.endedAt).toBeUndefined();
    });

    test("tracks subagent end with completed status", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "subagent_start",
          sessionId: "session-123",
          agentId: "agent-456",
          agentType: "ts-coding",
          description: "Implement feature X",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies SubagentStartEvent,
        {
          type: "subagent_end",
          sessionId: "session-123",
          agentId: "agent-456",
          status: "completed",
          timestamp: "2026-01-06T10:00:10.000Z",
        } satisfies SubagentEndEvent,
      ];

      stateManager.processEvents(events);

      const state = stateManager.getSessionState("session-123");
      const subagent = state?.subagents.get("agent-456");
      expect(subagent?.status).toBe("completed");
      expect(subagent?.endedAt).toBe("2026-01-06T10:00:10.000Z");

      // No longer active
      const activeSubagents = stateManager.getActiveSubagents("session-123");
      expect(activeSubagents).toHaveLength(0);
    });

    test("tracks subagent end with failed status", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "subagent_start",
          sessionId: "session-123",
          agentId: "agent-456",
          agentType: "ts-coding",
          description: "Implement feature X",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies SubagentStartEvent,
        {
          type: "subagent_end",
          sessionId: "session-123",
          agentId: "agent-456",
          status: "failed",
          timestamp: "2026-01-06T10:00:10.000Z",
        } satisfies SubagentEndEvent,
      ];

      stateManager.processEvents(events);

      const state = stateManager.getSessionState("session-123");
      const subagent = state?.subagents.get("agent-456");
      expect(subagent?.status).toBe("failed");
    });

    test("handles subagent_end without subagent_start", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "subagent_end",
          sessionId: "session-123",
          agentId: "agent-456",
          status: "completed",
          timestamp: "2026-01-06T10:00:10.000Z",
        } satisfies SubagentEndEvent,
      ];

      stateManager.processEvents(events);

      const state = stateManager.getSessionState("session-123");
      const subagent = state?.subagents.get("agent-456");
      expect(subagent).toBeDefined();
      expect(subagent?.agentType).toBe("unknown");
      expect(subagent?.status).toBe("completed");
    });

    test("tracks multiple subagents", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "subagent_start",
          sessionId: "session-123",
          agentId: "agent-1",
          agentType: "ts-coding",
          description: "Task 1",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies SubagentStartEvent,
        {
          type: "subagent_start",
          sessionId: "session-123",
          agentId: "agent-2",
          agentType: "explore",
          description: "Task 2",
          timestamp: "2026-01-06T10:00:01.000Z",
        } satisfies SubagentStartEvent,
      ];

      stateManager.processEvents(events);

      const subagents = stateManager.getActiveSubagents("session-123");
      expect(subagents).toHaveLength(2);
    });
  });

  describe("message tracking", () => {
    test("increments message count", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "message",
          sessionId: "session-123",
          role: "user",
          content: "Hello",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies MessageEvent,
      ];

      stateManager.processEvents(events);

      const state = stateManager.getSessionState("session-123");
      expect(state?.messageCount).toBe(1);
    });

    test("increments message count for multiple messages", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "message",
          sessionId: "session-123",
          role: "user",
          content: "Hello",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies MessageEvent,
        {
          type: "message",
          sessionId: "session-123",
          role: "assistant",
          content: "Hi there",
          timestamp: "2026-01-06T10:00:01.000Z",
        } satisfies MessageEvent,
        {
          type: "message",
          sessionId: "session-123",
          role: "user",
          content: "How are you?",
          timestamp: "2026-01-06T10:00:02.000Z",
        } satisfies MessageEvent,
      ];

      stateManager.processEvents(events);

      const state = stateManager.getSessionState("session-123");
      expect(state?.messageCount).toBe(3);
    });
  });

  describe("task tracking", () => {
    test("tracks task updates", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "task_update",
          sessionId: "session-123",
          tasks: [
            { summary: "Implement parser", status: "running" },
            { summary: "Write tests", status: "completed" },
          ],
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies TaskUpdateEvent,
      ];

      stateManager.processEvents(events);

      const tasks = stateManager.getAllTasks("session-123");
      expect(tasks).toHaveLength(2);
      expect(tasks[0]?.summary).toBe("Implement parser");
      expect(tasks[0]?.status).toBe("running");
      expect(tasks[1]?.summary).toBe("Write tests");
      expect(tasks[1]?.status).toBe("completed");
    });

    test("replaces tasks on task_update", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "task_update",
          sessionId: "session-123",
          tasks: [{ summary: "Task 1", status: "running" }],
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies TaskUpdateEvent,
        {
          type: "task_update",
          sessionId: "session-123",
          tasks: [
            { summary: "Task 1", status: "completed" },
            { summary: "Task 2", status: "running" },
          ],
          timestamp: "2026-01-06T10:00:05.000Z",
        } satisfies TaskUpdateEvent,
      ];

      stateManager.processEvents(events);

      const tasks = stateManager.getAllTasks("session-123");
      expect(tasks).toHaveLength(2);
      expect(tasks[0]?.summary).toBe("Task 1");
      expect(tasks[0]?.status).toBe("completed");
      expect(tasks[1]?.summary).toBe("Task 2");
    });

    test("assigns task IDs", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "task_update",
          sessionId: "session-123",
          tasks: [
            { summary: "Task 1", status: "running" },
            { summary: "Task 2", status: "completed" },
          ],
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies TaskUpdateEvent,
      ];

      stateManager.processEvents(events);

      const task1 = stateManager.getTaskById("session-123", "task-0");
      expect(task1?.summary).toBe("Task 1");

      const task2 = stateManager.getTaskById("session-123", "task-1");
      expect(task2?.summary).toBe("Task 2");
    });

    test("getTaskById returns undefined for unknown task", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const task = stateManager.getTaskById("session-123", "task-999");
      expect(task).toBeUndefined();
    });
  });

  describe("multi-session tracking", () => {
    test("tracks multiple sessions independently", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "tool_start",
          sessionId: "session-1",
          tool: "Read",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies ToolStartEvent,
        {
          type: "tool_start",
          sessionId: "session-2",
          tool: "Write",
          timestamp: "2026-01-06T10:00:01.000Z",
        } satisfies ToolStartEvent,
      ];

      stateManager.processEvents(events);

      const tools1 = stateManager.getActiveTools("session-1");
      expect(tools1).toEqual(["Read"]);

      const tools2 = stateManager.getActiveTools("session-2");
      expect(tools2).toEqual(["Write"]);
    });
  });

  describe("reset and clear", () => {
    test("reset clears all state", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "tool_start",
          sessionId: "session-123",
          tool: "Task",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies ToolStartEvent,
        {
          type: "message",
          sessionId: "session-123",
          role: "user",
          content: "Hello",
          timestamp: "2026-01-06T10:00:01.000Z",
        } satisfies MessageEvent,
      ];

      stateManager.processEvents(events);

      stateManager.reset();

      const state = stateManager.getSessionState("session-123");
      expect(state).toBeUndefined();
    });

    test("clearSession removes specific session", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "tool_start",
          sessionId: "session-1",
          tool: "Read",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies ToolStartEvent,
        {
          type: "tool_start",
          sessionId: "session-2",
          tool: "Write",
          timestamp: "2026-01-06T10:00:01.000Z",
        } satisfies ToolStartEvent,
      ];

      stateManager.processEvents(events);

      stateManager.clearSession("session-1");

      const state1 = stateManager.getSessionState("session-1");
      expect(state1).toBeUndefined();

      const state2 = stateManager.getSessionState("session-2");
      expect(state2).toBeDefined();
    });
  });

  describe("query methods", () => {
    test("getSessionState returns undefined for unknown session", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const state = stateManager.getSessionState("unknown");
      expect(state).toBeUndefined();
    });

    test("getActiveTools returns empty array for unknown session", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const tools = stateManager.getActiveTools("unknown");
      expect(tools).toEqual([]);
    });

    test("getActiveSubagents returns empty array for unknown session", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const subagents = stateManager.getActiveSubagents("unknown");
      expect(subagents).toEqual([]);
    });

    test("getAllTasks returns empty array for unknown session", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const tasks = stateManager.getAllTasks("unknown");
      expect(tasks).toEqual([]);
    });

    test("getTaskById returns undefined for unknown session", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const task = stateManager.getTaskById("unknown", "task-0");
      expect(task).toBeUndefined();
    });
  });

  describe("session_end event", () => {
    test("updates lastUpdated on session_end", () => {
      const emitter = createEventEmitter();
      const stateManager = new StateManager(emitter);

      const events: MonitorEvent[] = [
        {
          type: "tool_start",
          sessionId: "session-123",
          tool: "Task",
          timestamp: "2026-01-06T10:00:00.000Z",
        } satisfies ToolStartEvent,
        {
          type: "session_end",
          sessionId: "session-123",
          status: "completed",
          timestamp: "2026-01-06T10:00:10.000Z",
        },
      ];

      stateManager.processEvents(events);

      const state = stateManager.getSessionState("session-123");
      expect(state?.lastUpdated).toBe("2026-01-06T10:00:10.000Z");
    });
  });
});
