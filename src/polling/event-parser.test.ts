/**
 * Tests for EventParser
 */

import { describe, expect, test } from "vitest";
import { createEventEmitter } from "../sdk/events/emitter";
import { EventParser } from "./event-parser";
import type { TranscriptEvent } from "./parser";

describe("EventParser", () => {
  describe("parseEvents", () => {
    test("parses empty array", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const result = parser.parseEvents([]);

      expect(result).toEqual([]);
    });

    test("skips unknown event types", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "unknown_type",
          raw: { type: "unknown_type" },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toEqual([]);
    });

    test("parses multiple events in order", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "tool_use",
          timestamp: "2026-01-06T10:00:00.000Z",
          raw: {
            type: "tool_use",
            content: { name: "Task" },
          },
        },
        {
          type: "user",
          timestamp: "2026-01-06T10:00:01.000Z",
          raw: {
            type: "user",
            content: "Hello",
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toHaveLength(2);
      expect(result[0]?.type).toBe("tool_start");
      expect(result[1]?.type).toBe("message");
    });
  });

  describe("parseToolUse", () => {
    test("parses tool_use event", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "tool_use",
          timestamp: "2026-01-06T10:00:00.000Z",
          raw: {
            type: "tool_use",
            content: { name: "Task" },
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toHaveLength(1);
      const event = result[0];
      expect(event).toEqual({
        type: "tool_start",
        sessionId: "session-123",
        tool: "Task",
        timestamp: "2026-01-06T10:00:00.000Z",
      });
    });

    test("handles missing content", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "tool_use",
          timestamp: "2026-01-06T10:00:00.000Z",
          raw: {
            type: "tool_use",
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toEqual([]);
    });

    test("handles missing tool name", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "tool_use",
          timestamp: "2026-01-06T10:00:00.000Z",
          raw: {
            type: "tool_use",
            content: {},
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toEqual([]);
    });

    test("uses default timestamp if missing", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "tool_use",
          raw: {
            type: "tool_use",
            content: { name: "Read" },
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toHaveLength(1);
      const event = result[0];
      expect(event?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
    });
  });

  describe("parseToolResult", () => {
    test("parses tool_result event with duration", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "tool_use",
          timestamp: "2026-01-06T10:00:00.000Z",
          raw: {
            type: "tool_use",
            content: { name: "Task" },
          },
        },
        {
          type: "tool_result",
          timestamp: "2026-01-06T10:00:05.000Z",
          raw: {
            type: "tool_result",
            content: { name: "Task" },
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toHaveLength(2);
      const endEvent = result[1];
      expect(endEvent).toEqual({
        type: "tool_end",
        sessionId: "session-123",
        tool: "Task",
        duration: 5000, // 5 seconds in ms
        timestamp: "2026-01-06T10:00:05.000Z",
      });
    });

    test("parses tool_result without prior tool_use", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "tool_result",
          timestamp: "2026-01-06T10:00:05.000Z",
          raw: {
            type: "tool_result",
            content: { name: "Task" },
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toHaveLength(1);
      const event = result[0];
      expect(event).toEqual({
        type: "tool_end",
        sessionId: "session-123",
        tool: "Task",
        duration: 0, // No start time tracked
        timestamp: "2026-01-06T10:00:05.000Z",
      });
    });

    test("handles negative duration gracefully", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "tool_use",
          timestamp: "2026-01-06T10:00:05.000Z",
          raw: {
            type: "tool_use",
            content: { name: "Task" },
          },
        },
        {
          type: "tool_result",
          timestamp: "2026-01-06T10:00:00.000Z", // Earlier than start!
          raw: {
            type: "tool_result",
            content: { name: "Task" },
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toHaveLength(2);
      const endEvent = result[1];
      expect(endEvent?.type).toBe("tool_end");
      if (endEvent?.type === "tool_end") {
        expect(endEvent.duration).toBe(0); // Clamped to 0
      }
    });
  });

  describe("parseSubagent", () => {
    test("parses subagent start event", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "task",
          timestamp: "2026-01-06T10:00:00.000Z",
          uuid: "task-456",
          raw: {
            type: "task",
            content: {
              subagent_type: "ts-coding",
              task_id: "task-456",
              prompt: "Implement feature X",
            },
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toHaveLength(1);
      const event = result[0];
      expect(event).toEqual({
        type: "subagent_start",
        sessionId: "session-123",
        agentId: "task-456",
        agentType: "ts-coding",
        description: "Implement feature X",
        timestamp: "2026-01-06T10:00:00.000Z",
      });
    });

    test("parses subagent end event with completed status", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "task",
          timestamp: "2026-01-06T10:00:10.000Z",
          uuid: "task-456",
          raw: {
            type: "task",
            content: {
              task_id: "task-456",
              status: "completed",
            },
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toHaveLength(1);
      const event = result[0];
      expect(event).toEqual({
        type: "subagent_end",
        sessionId: "session-123",
        agentId: "task-456",
        status: "completed",
        timestamp: "2026-01-06T10:00:10.000Z",
      });
    });

    test("parses subagent end event with failed status", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "task",
          timestamp: "2026-01-06T10:00:10.000Z",
          uuid: "task-456",
          raw: {
            type: "task",
            content: {
              task_id: "task-456",
              status: "failed",
            },
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toHaveLength(1);
      const event = result[0];
      if (event?.type === "subagent_end") {
        expect(event.status).toBe("failed");
      }
    });

    test("uses uuid as fallback for agent ID", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "task",
          timestamp: "2026-01-06T10:00:00.000Z",
          uuid: "uuid-789",
          raw: {
            type: "task",
            content: {
              subagent_type: "ts-coding",
              prompt: "Implement feature X",
            },
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toHaveLength(1);
      const event = result[0];
      if (event?.type === "subagent_start") {
        expect(event.agentId).toBe("uuid-789");
      }
    });
  });

  describe("parseMessage", () => {
    test("parses user message with string content", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "user",
          timestamp: "2026-01-06T10:00:00.000Z",
          raw: {
            type: "user",
            content: "Hello, Claude!",
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toHaveLength(1);
      const event = result[0];
      expect(event).toEqual({
        type: "message",
        sessionId: "session-123",
        role: "user",
        content: "Hello, Claude!",
        timestamp: "2026-01-06T10:00:00.000Z",
      });
    });

    test("parses assistant message with object content", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "assistant",
          timestamp: "2026-01-06T10:00:01.000Z",
          raw: {
            type: "assistant",
            content: {
              text: "Hello, user!",
            },
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toHaveLength(1);
      const event = result[0];
      expect(event).toEqual({
        type: "message",
        sessionId: "session-123",
        role: "assistant",
        content: "Hello, user!",
        timestamp: "2026-01-06T10:00:01.000Z",
      });
    });

    test("skips empty messages", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "user",
          timestamp: "2026-01-06T10:00:00.000Z",
          raw: {
            type: "user",
            content: "   ",
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toEqual([]);
    });

    test("handles missing content", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "user",
          timestamp: "2026-01-06T10:00:00.000Z",
          raw: {
            type: "user",
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toEqual([]);
    });
  });

  describe("parseTaskUpdate", () => {
    test("parses task update event", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "todo_write",
          timestamp: "2026-01-06T10:00:00.000Z",
          raw: {
            type: "todo_write",
            content: {
              tasks: [
                { summary: "Implement parser", status: "running" },
                { summary: "Write tests", status: "completed" },
              ],
            },
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toHaveLength(1);
      const event = result[0];
      expect(event).toEqual({
        type: "task_update",
        sessionId: "session-123",
        tasks: [
          { summary: "Implement parser", status: "running" },
          { summary: "Write tests", status: "completed" },
        ],
        timestamp: "2026-01-06T10:00:00.000Z",
      });
    });

    test("filters invalid tasks", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "todo_write",
          timestamp: "2026-01-06T10:00:00.000Z",
          raw: {
            type: "todo_write",
            content: {
              tasks: [
                { summary: "Valid task", status: "running" },
                null, // Invalid
                { summary: "Another valid", status: "completed" },
                { summary: "Invalid status", status: "invalid" }, // Invalid status
              ],
            },
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toHaveLength(1);
      const event = result[0];
      if (event?.type === "task_update") {
        expect(event.tasks).toHaveLength(2);
        expect(event.tasks[0]?.summary).toBe("Valid task");
        expect(event.tasks[1]?.summary).toBe("Another valid");
      }
    });

    test("handles missing tasks array", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      const events: TranscriptEvent[] = [
        {
          type: "todo_write",
          timestamp: "2026-01-06T10:00:00.000Z",
          raw: {
            type: "todo_write",
            content: {},
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toEqual([]);
    });
  });

  describe("reset", () => {
    test("clears active tool calls", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      // Start a tool
      const events: TranscriptEvent[] = [
        {
          type: "tool_use",
          timestamp: "2026-01-06T10:00:00.000Z",
          raw: {
            type: "tool_use",
            content: { name: "Task" },
          },
        },
      ];

      parser.parseEvents(events);

      // Reset
      parser.reset("session-456");

      // End the tool - should have no duration
      const endEvents: TranscriptEvent[] = [
        {
          type: "tool_result",
          timestamp: "2026-01-06T10:00:05.000Z",
          raw: {
            type: "tool_result",
            content: { name: "Task" },
          },
        },
      ];

      const result = parser.parseEvents(endEvents);

      expect(result).toHaveLength(1);
      const event = result[0];
      if (event?.type === "tool_end") {
        expect(event.duration).toBe(0); // No tracked start time
        expect(event.sessionId).toBe("session-456");
      }
    });

    test("updates session ID", () => {
      const emitter = createEventEmitter();
      const parser = new EventParser(emitter, "session-123");

      parser.reset("session-new");

      const events: TranscriptEvent[] = [
        {
          type: "tool_use",
          timestamp: "2026-01-06T10:00:00.000Z",
          raw: {
            type: "tool_use",
            content: { name: "Task" },
          },
        },
      ];

      const result = parser.parseEvents(events);

      expect(result).toHaveLength(1);
      const event = result[0];
      expect(event?.sessionId).toBe("session-new");
    });
  });
});
