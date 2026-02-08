import { describe, test, expect } from "vitest";
import { JsonlStreamParser, type TranscriptEvent } from "./parser";

describe("JsonlStreamParser", () => {
  describe("feed()", () => {
    test("parses complete lines", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed('{"type":"user"}\n{"type":"assistant"}\n');

      expect(events).toHaveLength(2);
      expect(events[0]?.type).toBe("user");
      expect(events[1]?.type).toBe("assistant");
    });

    test("buffers incomplete lines", () => {
      const parser = new JsonlStreamParser();
      const events1 = parser.feed('{"type":"user"}\n{"type":');

      expect(events1).toHaveLength(1);
      expect(events1[0]?.type).toBe("user");

      const events2 = parser.feed('"assistant"}\n');
      expect(events2).toHaveLength(1);
      expect(events2[0]?.type).toBe("assistant");
    });

    test("handles empty content", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed("");

      expect(events).toHaveLength(0);
    });

    test("skips empty lines", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed('{"type":"user"}\n\n{"type":"assistant"}\n');

      expect(events).toHaveLength(2);
      expect(events[0]?.type).toBe("user");
      expect(events[1]?.type).toBe("assistant");
    });

    test("skips whitespace-only lines", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed(
        '{"type":"user"}\n   \n{"type":"assistant"}\n',
      );

      expect(events).toHaveLength(2);
      expect(events[0]?.type).toBe("user");
      expect(events[1]?.type).toBe("assistant");
    });

    test("gracefully skips malformed JSON", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed(
        '{"type":"user"}\n{invalid json}\n{"type":"assistant"}\n',
      );

      expect(events).toHaveLength(2);
      expect(events[0]?.type).toBe("user");
      expect(events[1]?.type).toBe("assistant");
    });

    test("extracts uuid when present", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed('{"type":"user","uuid":"abc-123"}\n');

      expect(events).toHaveLength(1);
      expect(events[0]?.uuid).toBe("abc-123");
    });

    test("extracts timestamp when present", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed(
        '{"type":"user","timestamp":"2025-01-06T10:00:00Z"}\n',
      );

      expect(events).toHaveLength(1);
      expect(events[0]?.timestamp).toBe("2025-01-06T10:00:00Z");
    });

    test("extracts content when present", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed(
        '{"type":"user","content":{"text":"Hello"}}\n',
      );

      expect(events).toHaveLength(1);
      expect(events[0]?.content).toEqual({ text: "Hello" });
    });

    test("preserves raw object", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed(
        '{"type":"user","custom":"field","nested":{"value":42}}\n',
      );

      expect(events).toHaveLength(1);
      expect(events[0]?.raw).toEqual({
        type: "user",
        custom: "field",
        nested: { value: 42 },
      });
    });

    test("handles type field missing", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed('{"uuid":"abc-123"}\n');

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe("unknown");
    });

    test("handles type field with wrong type", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed('{"type":123}\n');

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe("unknown");
    });

    test("handles multiple incomplete chunks", () => {
      const parser = new JsonlStreamParser();

      const events1 = parser.feed('{"ty');
      expect(events1).toHaveLength(0);

      const events2 = parser.feed('pe":"u');
      expect(events2).toHaveLength(0);

      const events3 = parser.feed('ser"}\n');
      expect(events3).toHaveLength(1);
      expect(events3[0]?.type).toBe("user");
    });

    test("handles content ending with newline", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed('{"type":"user"}\n');

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe("user");

      // Buffer should be empty
      const flushEvents = parser.flush();
      expect(flushEvents).toHaveLength(0);
    });

    test("handles content not ending with newline", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed('{"type":"user"}');

      expect(events).toHaveLength(0);

      // Content should be in buffer
      const flushEvents = parser.flush();
      expect(flushEvents).toHaveLength(1);
      expect(flushEvents[0]?.type).toBe("user");
    });

    test("extracts content from message.content for user events", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed(
        '{"type":"user","uuid":"u1","timestamp":"2025-01-06T10:00:00Z","message":{"role":"user","content":"Hello world"}}\n',
      );

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe("user");
      expect(events[0]?.content).toBe("Hello world");
    });

    test("extracts content from message.content for assistant events", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed(
        '{"type":"assistant","uuid":"a1","message":{"role":"assistant","content":[{"type":"text","text":"Response"}]}}\n',
      );

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe("assistant");
      expect(events[0]?.content).toEqual([{ type: "text", text: "Response" }]);
    });

    test("prefers top-level content over message.content", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed(
        '{"type":"result","content":"top-level","message":{"content":"nested"}}\n',
      );

      expect(events).toHaveLength(1);
      expect(events[0]?.content).toBe("top-level");
    });

    test("handles message without content field", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed('{"type":"user","message":{"role":"user"}}\n');

      expect(events).toHaveLength(1);
      expect(events[0]?.content).toBeUndefined();
    });
  });

  describe("flush()", () => {
    test("parses remaining buffered content", () => {
      const parser = new JsonlStreamParser();
      parser.feed('{"type":"user"}\n{"type":"assistant"}');

      const events = parser.flush();
      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe("assistant");
    });

    test("returns empty array when buffer is empty", () => {
      const parser = new JsonlStreamParser();
      const events = parser.flush();

      expect(events).toHaveLength(0);
    });

    test("returns empty array when buffer contains only whitespace", () => {
      const parser = new JsonlStreamParser();
      parser.feed("   ");

      const events = parser.flush();
      expect(events).toHaveLength(0);
    });

    test("clears buffer after flushing", () => {
      const parser = new JsonlStreamParser();
      parser.feed('{"type":"user"}');

      parser.flush();

      // Flush again - should be empty
      const events = parser.flush();
      expect(events).toHaveLength(0);
    });

    test("handles malformed JSON in buffer", () => {
      const parser = new JsonlStreamParser();
      parser.feed("{invalid");

      const events = parser.flush();
      expect(events).toHaveLength(0);
    });

    test("can be called multiple times", () => {
      const parser = new JsonlStreamParser();

      const events1 = parser.flush();
      expect(events1).toHaveLength(0);

      const events2 = parser.flush();
      expect(events2).toHaveLength(0);
    });
  });

  describe("streaming scenarios", () => {
    test("simulates real-time file watching", () => {
      const parser = new JsonlStreamParser();
      const allEvents: TranscriptEvent[] = [];

      // Chunk 1: Partial line
      allEvents.push(...parser.feed('{"type":"user","uuid":"'));

      // Chunk 2: Complete first line, start second
      allEvents.push(...parser.feed('u1"}\n{"type":"assistant","uu'));

      // Chunk 3: Complete second line, start third
      allEvents.push(...parser.feed('id":"a1"}\n{"type":"tool_use'));

      // Chunk 4: Complete third line
      allEvents.push(...parser.feed('"}\n'));

      expect(allEvents).toHaveLength(3);
      expect(allEvents[0]?.type).toBe("user");
      expect(allEvents[0]?.uuid).toBe("u1");
      expect(allEvents[1]?.type).toBe("assistant");
      expect(allEvents[1]?.uuid).toBe("a1");
      expect(allEvents[2]?.type).toBe("tool_use");
    });

    test("handles mixed valid and invalid content", () => {
      const parser = new JsonlStreamParser();
      const allEvents: TranscriptEvent[] = [];

      allEvents.push(...parser.feed('{"type":"user"}\n'));
      allEvents.push(...parser.feed("{malformed}\n"));
      allEvents.push(...parser.feed('{"type":"assistant"}\n'));
      allEvents.push(...parser.feed("not-json-at-all\n"));
      allEvents.push(...parser.feed('{"type":"tool_use"}\n'));

      expect(allEvents).toHaveLength(3);
      expect(allEvents[0]?.type).toBe("user");
      expect(allEvents[1]?.type).toBe("assistant");
      expect(allEvents[2]?.type).toBe("tool_use");
    });

    test("handles large batch with final incomplete line", () => {
      const parser = new JsonlStreamParser();

      const batch =
        '{"type":"user"}\n{"type":"assistant"}\n{"type":"tool_use"}\n{"type":"incomplete';
      const events = parser.feed(batch);

      expect(events).toHaveLength(3);

      const remaining = parser.flush();
      expect(remaining).toHaveLength(0); // Invalid JSON
    });

    test("handles interleaved empty lines and content", () => {
      const parser = new JsonlStreamParser();

      const events = parser.feed(
        '\n\n{"type":"user"}\n\n\n{"type":"assistant"}\n\n',
      );

      expect(events).toHaveLength(2);
      expect(events[0]?.type).toBe("user");
      expect(events[1]?.type).toBe("assistant");
    });
  });

  describe("edge cases", () => {
    test("handles very long lines", () => {
      const parser = new JsonlStreamParser();
      const longContent = "x".repeat(10000);
      const events = parser.feed(
        `{"type":"user","content":"${longContent}"}\n`,
      );

      expect(events).toHaveLength(1);
      expect(events[0]?.type).toBe("user");
      expect(events[0]?.content).toBe(longContent);
    });

    test("handles nested objects", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed(
        '{"type":"user","content":{"nested":{"deep":{"value":42}}}}\n',
      );

      expect(events).toHaveLength(1);
      expect(events[0]?.content).toEqual({
        nested: { deep: { value: 42 } },
      });
    });

    test("handles arrays in content", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed(
        '{"type":"user","content":["item1","item2","item3"]}\n',
      );

      expect(events).toHaveLength(1);
      expect(events[0]?.content).toEqual(["item1", "item2", "item3"]);
    });

    test("handles special characters in content", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed(
        '{"type":"user","content":"Line 1\\nLine 2\\tTabbed"}\n',
      );

      expect(events).toHaveLength(1);
      expect(events[0]?.content).toBe("Line 1\nLine 2\tTabbed");
    });

    test("handles unicode characters", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed('{"type":"user","content":"Hello 世界 🌍"}\n');

      expect(events).toHaveLength(1);
      expect(events[0]?.content).toBe("Hello 世界 🌍");
    });

    test("handles null values", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed(
        '{"type":"user","content":null,"uuid":null}\n',
      );

      expect(events).toHaveLength(1);
      expect(events[0]?.content).toBeNull();
      expect(events[0]?.uuid).toBeUndefined(); // uuid is not a string
    });

    test("handles boolean and number values", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed(
        '{"type":"user","content":{"active":true,"count":42,"ratio":3.14}}\n',
      );

      expect(events).toHaveLength(1);
      expect(events[0]?.content).toEqual({
        active: true,
        count: 42,
        ratio: 3.14,
      });
    });

    test("handles single newline", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed("\n");

      expect(events).toHaveLength(0);
    });

    test("handles multiple consecutive newlines", () => {
      const parser = new JsonlStreamParser();
      const events = parser.feed("\n\n\n\n");

      expect(events).toHaveLength(0);
    });
  });
});
