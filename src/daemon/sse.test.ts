/**
 * Unit tests for SSE streaming implementation.
 *
 * @module daemon/sse.test
 */

import { describe, expect, test, beforeEach } from "bun:test";
import { EventEmitter } from "../sdk/events/emitter";
import type {
  SessionStartedEvent,
  SessionEndedEvent,
} from "../sdk/events/types";
import { SSEConnection, createSSEStream } from "./sse";
import type { EventFilter } from "./sse-types";

describe("SSEConnection", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  describe("matchesFilter", () => {
    test("matches all events with empty filter", () => {
      const filter: EventFilter = {};
      const connection = new SSEConnection(emitter, filter);

      const event: SessionStartedEvent = {
        type: "session_started",
        timestamp: new Date().toISOString(),
        sessionId: "test-session",
        projectPath: "/test/path",
      };

      // Access private method via type assertion for testing
      const matches = (connection as any).matchesFilter(event);
      expect(matches).toBe(true);
    });

    test("filters by sessionId", () => {
      const filter: EventFilter = { sessionId: "test-session" };
      const connection = new SSEConnection(emitter, filter);

      const matchingEvent: SessionStartedEvent = {
        type: "session_started",
        timestamp: new Date().toISOString(),
        sessionId: "test-session",
        projectPath: "/test/path",
      };

      const nonMatchingEvent: SessionStartedEvent = {
        type: "session_started",
        timestamp: new Date().toISOString(),
        sessionId: "other-session",
        projectPath: "/test/path",
      };

      expect((connection as any).matchesFilter(matchingEvent)).toBe(true);
      expect((connection as any).matchesFilter(nonMatchingEvent)).toBe(false);
    });

    test("filters by groupId", () => {
      const filter: EventFilter = { groupId: "test-group" };
      const connection = new SSEConnection(emitter, filter);

      const matchingEvent = {
        type: "group_started" as const,
        timestamp: new Date().toISOString(),
        groupId: "test-group",
        sessionCount: 5,
      };

      const nonMatchingEvent = {
        type: "group_started" as const,
        timestamp: new Date().toISOString(),
        groupId: "other-group",
        sessionCount: 3,
      };

      expect((connection as any).matchesFilter(matchingEvent)).toBe(true);
      expect((connection as any).matchesFilter(nonMatchingEvent)).toBe(false);
    });

    test("filters by queueId", () => {
      const filter: EventFilter = { queueId: "test-queue" };
      const connection = new SSEConnection(emitter, filter);

      const matchingEvent = {
        type: "queue_started" as const,
        timestamp: new Date().toISOString(),
        queueId: "test-queue",
      };

      const nonMatchingEvent = {
        type: "queue_started" as const,
        timestamp: new Date().toISOString(),
        queueId: "other-queue",
      };

      expect((connection as any).matchesFilter(matchingEvent)).toBe(true);
      expect((connection as any).matchesFilter(nonMatchingEvent)).toBe(false);
    });

    test("filters by eventTypes", () => {
      const filter: EventFilter = {
        eventTypes: ["session_started", "session_ended"],
      };
      const connection = new SSEConnection(emitter, filter);

      const matchingEvent1: SessionStartedEvent = {
        type: "session_started",
        timestamp: new Date().toISOString(),
        sessionId: "test-session",
        projectPath: "/test/path",
      };

      const matchingEvent2: SessionEndedEvent = {
        type: "session_ended",
        timestamp: new Date().toISOString(),
        sessionId: "test-session",
        status: "completed",
      };

      const nonMatchingEvent = {
        type: "tool_started" as const,
        timestamp: new Date().toISOString(),
        sessionId: "test-session",
        toolName: "Read",
        toolCallId: "call-1",
      };

      expect((connection as any).matchesFilter(matchingEvent1)).toBe(true);
      expect((connection as any).matchesFilter(matchingEvent2)).toBe(true);
      expect((connection as any).matchesFilter(nonMatchingEvent)).toBe(false);
    });

    test("filters by multiple criteria", () => {
      const filter: EventFilter = {
        sessionId: "test-session",
        eventTypes: ["session_started", "session_ended"],
      };
      const connection = new SSEConnection(emitter, filter);

      const matchingEvent: SessionStartedEvent = {
        type: "session_started",
        timestamp: new Date().toISOString(),
        sessionId: "test-session",
        projectPath: "/test/path",
      };

      const wrongSessionEvent: SessionStartedEvent = {
        type: "session_started",
        timestamp: new Date().toISOString(),
        sessionId: "other-session",
        projectPath: "/test/path",
      };

      const wrongTypeEvent = {
        type: "tool_started" as const,
        timestamp: new Date().toISOString(),
        sessionId: "test-session",
        toolName: "Read",
        toolCallId: "call-1",
      };

      expect((connection as any).matchesFilter(matchingEvent)).toBe(true);
      expect((connection as any).matchesFilter(wrongSessionEvent)).toBe(false);
      expect((connection as any).matchesFilter(wrongTypeEvent)).toBe(false);
    });

    test("empty eventTypes array matches no events", () => {
      const filter: EventFilter = {
        eventTypes: [],
      };
      const connection = new SSEConnection(emitter, filter);

      const event: SessionStartedEvent = {
        type: "session_started",
        timestamp: new Date().toISOString(),
        sessionId: "test-session",
        projectPath: "/test/path",
      };

      expect((connection as any).matchesFilter(event)).toBe(true);
    });
  });

  describe("formatSSE", () => {
    test("formats event in SSE format", () => {
      const filter: EventFilter = {};
      const connection = new SSEConnection(emitter, filter);

      const event: SessionStartedEvent = {
        type: "session_started",
        timestamp: "2026-01-07T00:00:00Z",
        sessionId: "test-session",
        projectPath: "/test/path",
      };

      const formatted = (connection as any).formatSSE(event);

      expect(formatted).toBe(`data: ${JSON.stringify(event)}\n\n`);
    });

    test("formats complex event with nested objects", () => {
      const filter: EventFilter = {};
      const connection = new SSEConnection(emitter, filter);

      const event = {
        type: "session_ended",
        timestamp: "2026-01-07T00:00:00Z",
        sessionId: "test-session",
        status: "completed",
        metadata: {
          cost: 0.05,
          tokens: { input: 1000, output: 500 },
        },
      };

      const formatted = (connection as any).formatSSE(event);

      expect(formatted).toBe(`data: ${JSON.stringify(event)}\n\n`);
    });
  });

  describe("connection lifecycle", () => {
    test("closes connection properly", () => {
      const filter: EventFilter = {};
      const connection = new SSEConnection(emitter, filter);

      // Mock controller
      const mockController = {
        enqueue: () => {},
        close: () => {},
      };

      connection.initialize(mockController as any);
      connection.close();

      // Verify connection is marked as closed
      expect((connection as any).closed).toBe(true);
    });

    test("handles multiple close calls", () => {
      const filter: EventFilter = {};
      const connection = new SSEConnection(emitter, filter);

      const mockController = {
        enqueue: () => {},
        close: () => {},
      };

      connection.initialize(mockController as any);
      connection.close();
      connection.close(); // Second close should not throw

      expect((connection as any).closed).toBe(true);
    });

    test("does not send events after close", () => {
      const filter: EventFilter = {};
      const connection = new SSEConnection(emitter, filter);

      let enqueueCount = 0;
      const mockController = {
        enqueue: () => {
          enqueueCount++;
        },
        close: () => {},
      };

      connection.initialize(mockController as any);

      const event: SessionStartedEvent = {
        type: "session_started",
        timestamp: new Date().toISOString(),
        sessionId: "test-session",
        projectPath: "/test/path",
      };

      connection.send(event);
      expect(enqueueCount).toBe(1);

      connection.close();
      connection.send(event);
      expect(enqueueCount).toBe(1); // Should not increment
    });
  });
});

describe("createSSEStream", () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitter();
  });

  test("creates Response with correct headers", () => {
    const filter: EventFilter = {};
    const response = createSSEStream(emitter, filter);

    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(response.headers.get("Cache-Control")).toBe("no-cache");
    expect(response.headers.get("Connection")).toBe("keep-alive");
    expect(response.headers.get("X-Accel-Buffering")).toBe("no");
  });

  test("creates Response with readable stream body", () => {
    const filter: EventFilter = {};
    const response = createSSEStream(emitter, filter);

    expect(response.body).not.toBeNull();
    expect(response.body).toBeInstanceOf(ReadableStream);
  });

  test("streams events through Response body", async () => {
    const filter: EventFilter = {};
    const response = createSSEStream(emitter, filter);

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    if (!reader) {
      throw new Error("Reader is undefined");
    }

    // Emit an event
    const event: SessionStartedEvent = {
      type: "session_started",
      timestamp: new Date().toISOString(),
      sessionId: "test-session",
      projectPath: "/test/path",
    };

    setTimeout(() => {
      emitter.emit("session_started", event);
    }, 10);

    // Read from stream
    const result = await reader.read();
    expect(result.done).toBe(false);
    expect(result.value).toBeDefined();

    if (result.value) {
      const decoder = new TextDecoder();
      const text = decoder.decode(result.value);
      expect(text).toBe(`data: ${JSON.stringify(event)}\n\n`);
    }

    // Cleanup
    await reader.cancel();
  });

  test("filters events before streaming", async () => {
    const filter: EventFilter = {
      sessionId: "target-session",
    };
    const response = createSSEStream(emitter, filter);

    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    if (!reader) {
      throw new Error("Reader is undefined");
    }

    // Emit non-matching event
    const nonMatchingEvent: SessionStartedEvent = {
      type: "session_started",
      timestamp: new Date().toISOString(),
      sessionId: "other-session",
      projectPath: "/test/path",
    };

    setTimeout(() => {
      emitter.emit("session_started", nonMatchingEvent);
    }, 10);

    // Emit matching event
    const matchingEvent: SessionStartedEvent = {
      type: "session_started",
      timestamp: new Date().toISOString(),
      sessionId: "target-session",
      projectPath: "/test/path",
    };

    setTimeout(() => {
      emitter.emit("session_started", matchingEvent);
    }, 20);

    // Read from stream - should only get matching event
    const result = await reader.read();
    expect(result.done).toBe(false);
    expect(result.value).toBeDefined();

    if (result.value) {
      const decoder = new TextDecoder();
      const text = decoder.decode(result.value);
      expect(text).toBe(`data: ${JSON.stringify(matchingEvent)}\n\n`);
    }

    // Cleanup
    await reader.cancel();
  });
});
