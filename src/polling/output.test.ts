import { describe, test, expect } from "vitest";
import { JsonStreamOutput } from "./output";
import type {
  MonitorEvent,
  ToolStartEvent,
  ToolEndEvent,
  SubagentStartEvent,
  SubagentEndEvent,
  MessageEvent,
  TaskUpdateEvent,
  SessionEndEvent,
} from "./output";
import { Writable } from "node:stream";

/**
 * Mock writable stream for testing
 */
class MockWritableStream extends Writable {
  public writtenData: string[] = [];

  override _write(
    chunk: unknown,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.writtenData.push(chunk?.toString() ?? "");
    callback();
  }

  getOutput(): string {
    return this.writtenData.join("");
  }

  getLines(): string[] {
    return this.getOutput()
      .split("\n")
      .filter((line) => line.length > 0);
  }
}

describe("JsonStreamOutput", () => {
  describe("write()", () => {
    test("outputs tool_start event as JSON line", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      const event: ToolStartEvent = {
        type: "tool_start",
        sessionId: "session-123",
        tool: "Task",
        timestamp: "2026-01-06T10:00:00.000Z",
      };

      output.write(event);

      const lines = stream.getLines();
      expect(lines).toHaveLength(1);

      const parsed = JSON.parse(lines[0] ?? "{}") as ToolStartEvent;
      expect(parsed.type).toBe("tool_start");
      expect(parsed.sessionId).toBe("session-123");
      expect(parsed.tool).toBe("Task");
      expect(parsed.timestamp).toBe("2026-01-06T10:00:00.000Z");
    });

    test("outputs tool_end event as JSON line", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      const event: ToolEndEvent = {
        type: "tool_end",
        sessionId: "session-123",
        tool: "Task",
        duration: 1500,
        timestamp: "2026-01-06T10:00:01.500Z",
      };

      output.write(event);

      const lines = stream.getLines();
      expect(lines).toHaveLength(1);

      const parsed = JSON.parse(lines[0] ?? "{}") as ToolEndEvent;
      expect(parsed.type).toBe("tool_end");
      expect(parsed.duration).toBe(1500);
    });

    test("outputs subagent_start event as JSON line", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      const event: SubagentStartEvent = {
        type: "subagent_start",
        sessionId: "session-123",
        agentId: "agent-456",
        agentType: "ts-coding",
        description: "Implement feature X",
        timestamp: "2026-01-06T10:00:00.000Z",
      };

      output.write(event);

      const lines = stream.getLines();
      expect(lines).toHaveLength(1);

      const parsed = JSON.parse(lines[0] ?? "{}") as SubagentStartEvent;
      expect(parsed.type).toBe("subagent_start");
      expect(parsed.agentId).toBe("agent-456");
      expect(parsed.agentType).toBe("ts-coding");
    });

    test("outputs subagent_end event as JSON line", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      const event: SubagentEndEvent = {
        type: "subagent_end",
        sessionId: "session-123",
        agentId: "agent-456",
        status: "completed",
        timestamp: "2026-01-06T10:05:00.000Z",
      };

      output.write(event);

      const lines = stream.getLines();
      expect(lines).toHaveLength(1);

      const parsed = JSON.parse(lines[0] ?? "{}") as SubagentEndEvent;
      expect(parsed.type).toBe("subagent_end");
      expect(parsed.status).toBe("completed");
    });

    test("outputs message event as JSON line", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      const event: MessageEvent = {
        type: "message",
        sessionId: "session-123",
        role: "assistant",
        content: "Processing your request...",
        timestamp: "2026-01-06T10:00:00.000Z",
      };

      output.write(event);

      const lines = stream.getLines();
      expect(lines).toHaveLength(1);

      const parsed = JSON.parse(lines[0] ?? "{}") as MessageEvent;
      expect(parsed.type).toBe("message");
      expect(parsed.role).toBe("assistant");
      expect(parsed.content).toBe("Processing your request...");
    });

    test("outputs task_update event as JSON line", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      const event: TaskUpdateEvent = {
        type: "task_update",
        sessionId: "session-123",
        tasks: [
          { summary: "Read files", status: "completed" },
          { summary: "Write code", status: "running" },
        ],
        timestamp: "2026-01-06T10:00:00.000Z",
      };

      output.write(event);

      const lines = stream.getLines();
      expect(lines).toHaveLength(1);

      const parsed = JSON.parse(lines[0] ?? "{}") as TaskUpdateEvent;
      expect(parsed.type).toBe("task_update");
      expect(parsed.tasks).toHaveLength(2);
      expect(parsed.tasks[0]?.summary).toBe("Read files");
    });

    test("outputs session_end event as JSON line", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      const event: SessionEndEvent = {
        type: "session_end",
        sessionId: "session-123",
        status: "completed",
        timestamp: "2026-01-06T10:10:00.000Z",
      };

      output.write(event);

      const lines = stream.getLines();
      expect(lines).toHaveLength(1);

      const parsed = JSON.parse(lines[0] ?? "{}") as SessionEndEvent;
      expect(parsed.type).toBe("session_end");
      expect(parsed.status).toBe("completed");
    });

    test("outputs multiple events as separate lines", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      const events: MonitorEvent[] = [
        {
          type: "tool_start",
          sessionId: "session-123",
          tool: "Task",
          timestamp: "2026-01-06T10:00:00.000Z",
        },
        {
          type: "tool_end",
          sessionId: "session-123",
          tool: "Task",
          duration: 1000,
          timestamp: "2026-01-06T10:00:01.000Z",
        },
        {
          type: "session_end",
          sessionId: "session-123",
          status: "completed",
          timestamp: "2026-01-06T10:00:02.000Z",
        },
      ];

      for (const event of events) {
        output.write(event);
      }

      const lines = stream.getLines();
      expect(lines).toHaveLength(3);

      // Verify each line is valid JSON
      const parsed = lines.map((line) => JSON.parse(line) as MonitorEvent);
      expect(parsed[0]?.type).toBe("tool_start");
      expect(parsed[1]?.type).toBe("tool_end");
      expect(parsed[2]?.type).toBe("session_end");
    });

    test("does not write after close", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      const event: ToolStartEvent = {
        type: "tool_start",
        sessionId: "session-123",
        tool: "Task",
        timestamp: "2026-01-06T10:00:00.000Z",
      };

      output.write(event);
      output.close();
      output.write(event); // This should be ignored

      const lines = stream.getLines();
      expect(lines).toHaveLength(1); // Only the first write
    });

    test("handles events with special characters in strings", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      const event: MessageEvent = {
        type: "message",
        sessionId: "session-123",
        role: "assistant",
        content: 'String with "quotes" and\nnewlines\tand\ttabs',
        timestamp: "2026-01-06T10:00:00.000Z",
      };

      output.write(event);

      const lines = stream.getLines();
      expect(lines).toHaveLength(1);

      const parsed = JSON.parse(lines[0] ?? "{}") as MessageEvent;
      expect(parsed.content).toBe(
        'String with "quotes" and\nnewlines\tand\ttabs',
      );
    });
  });

  describe("close()", () => {
    test("flushes buffered content", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      const event: ToolStartEvent = {
        type: "tool_start",
        sessionId: "session-123",
        tool: "Task",
        timestamp: "2026-01-06T10:00:00.000Z",
      };

      output.write(event);
      output.close();

      // Verify the stream contains the event
      const lines = stream.getLines();
      expect(lines).toHaveLength(1);
      expect(JSON.parse(lines[0] ?? "{}")).toMatchObject({
        type: "tool_start",
      });
    });

    test("can be called multiple times safely", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      output.close();
      output.close(); // Should not throw

      expect(output.isClosed()).toBe(true);
    });

    test("marks output as closed", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      expect(output.isClosed()).toBe(false);

      output.close();

      expect(output.isClosed()).toBe(true);
    });
  });

  describe("isClosed()", () => {
    test("returns false initially", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      expect(output.isClosed()).toBe(false);
    });

    test("returns true after close", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      output.close();

      expect(output.isClosed()).toBe(true);
    });
  });

  describe("JSONL format compliance", () => {
    test("each event is on a single line", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      const event: MessageEvent = {
        type: "message",
        sessionId: "session-123",
        role: "assistant",
        content: "Line 1\nLine 2\nLine 3",
        timestamp: "2026-01-06T10:00:00.000Z",
      };

      output.write(event);

      const rawOutput = stream.getOutput();
      const lines = rawOutput.split("\n");

      // Should have exactly 2 lines: the event JSON + trailing newline
      expect(lines).toHaveLength(2);
      expect(lines[1]).toBe(""); // Trailing newline leaves empty string
    });

    test("no pretty-printing in output", () => {
      const stream = new MockWritableStream();
      const output = new JsonStreamOutput(stream);

      const event: TaskUpdateEvent = {
        type: "task_update",
        sessionId: "session-123",
        tasks: [
          { summary: "Task 1", status: "completed" },
          { summary: "Task 2", status: "running" },
        ],
        timestamp: "2026-01-06T10:00:00.000Z",
      };

      output.write(event);

      const rawOutput = stream.getOutput();
      const lines = rawOutput.split("\n");

      // Should not contain indentation whitespace
      expect(lines[0]).not.toMatch(/\n\s+/);
      expect(lines[0]).not.toMatch(/{\s+"/);
    });
  });
});
