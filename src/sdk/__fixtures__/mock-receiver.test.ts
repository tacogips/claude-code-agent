/**
 * Tests for MockSessionUpdateReceiver.
 */

import { describe, test, expect } from "vitest";
import {
  MockSessionUpdateReceiver,
  createMockSessionReceiver,
} from "./mock-receiver";
import type { SessionUpdate } from "../receiver";
import type { TranscriptEvent } from "../../polling/parser";

describe("MockSessionUpdateReceiver", () => {
  describe("createMockSessionReceiver", () => {
    test("returns a MockSessionUpdateReceiver instance", () => {
      const mock = createMockSessionReceiver("test-session");
      expect(mock).toBeInstanceOf(MockSessionUpdateReceiver);
      mock.close();
    });

    test("sets sessionId correctly", () => {
      const mock = createMockSessionReceiver("my-session-id");
      expect(mock.sessionId).toBe("my-session-id");
      mock.close();
    });
  });

  describe("initial state", () => {
    test("isClosed is false initially", () => {
      const mock = new MockSessionUpdateReceiver("test");
      expect(mock.isClosed).toBe(false);
      mock.close();
    });

    test("queueSize is 0 initially", () => {
      const mock = new MockSessionUpdateReceiver("test");
      expect(mock.queueSize).toBe(0);
      mock.close();
    });

    test("hasPendingReceive is false initially", () => {
      const mock = new MockSessionUpdateReceiver("test");
      expect(mock.hasPendingReceive).toBe(false);
      mock.close();
    });
  });

  describe("close()", () => {
    test("sets isClosed to true", () => {
      const mock = new MockSessionUpdateReceiver("test");
      mock.close();
      expect(mock.isClosed).toBe(true);
    });

    test("causes receive() to return null", async () => {
      const mock = new MockSessionUpdateReceiver("test");
      mock.close();
      const result = await mock.receive();
      expect(result).toBe(null);
    });

    test("can be called multiple times safely", () => {
      const mock = new MockSessionUpdateReceiver("test");
      mock.close();
      mock.close();
      expect(mock.isClosed).toBe(true);
    });

    test("resolves pending receive() with null", async () => {
      const mock = new MockSessionUpdateReceiver("test");
      const receivePromise = mock.receive();

      expect(mock.hasPendingReceive).toBe(true);

      mock.close();

      const result = await receivePromise;
      expect(result).toBe(null);
    });

    test("clears queued updates", () => {
      const mock = new MockSessionUpdateReceiver("test");
      const update: SessionUpdate = {
        sessionId: "test",
        newContent: "content",
        events: [],
        timestamp: new Date().toISOString(),
      };
      mock.pushUpdate(update);
      expect(mock.queueSize).toBe(1);
      mock.close();
      expect(mock.queueSize).toBe(0);
    });
  });

  describe("pushUpdate()", () => {
    test("queues update when no pending receive", () => {
      const mock = new MockSessionUpdateReceiver("test");
      const update: SessionUpdate = {
        sessionId: "test",
        newContent: '{"type":"user"}\n',
        events: [],
        timestamp: new Date().toISOString(),
      };
      mock.pushUpdate(update);
      expect(mock.queueSize).toBe(1);
      mock.close();
    });

    test("resolves pending receive immediately", async () => {
      const mock = new MockSessionUpdateReceiver("test");
      const receivePromise = mock.receive();

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mock.hasPendingReceive).toBe(true);

      const update: SessionUpdate = {
        sessionId: "test",
        newContent: '{"type":"user","content":"Hello"}\n',
        events: [
          {
            type: "user",
            raw: { type: "user", content: "Hello" },
          } as TranscriptEvent,
        ],
        timestamp: new Date().toISOString(),
      };

      mock.pushUpdate(update);

      const result = await receivePromise;
      expect(result).not.toBe(null);
      expect(result?.sessionId).toBe("test");
      expect(result?.events).toHaveLength(1);

      mock.close();
    });

    test("throws when receiver is closed", () => {
      const mock = new MockSessionUpdateReceiver("test");
      mock.close();

      const update: SessionUpdate = {
        sessionId: "test",
        newContent: "content",
        events: [],
        timestamp: new Date().toISOString(),
      };

      expect(() => mock.pushUpdate(update)).toThrow(
        "Cannot push update to closed mock receiver",
      );
    });

    test("multiple updates are queued in order", async () => {
      const mock = new MockSessionUpdateReceiver("test");

      const update1: SessionUpdate = {
        sessionId: "test",
        newContent: "first",
        events: [],
        timestamp: "2026-01-01T00:00:00.000Z",
      };
      const update2: SessionUpdate = {
        sessionId: "test",
        newContent: "second",
        events: [],
        timestamp: "2026-01-01T00:00:01.000Z",
      };

      mock.pushUpdate(update1);
      mock.pushUpdate(update2);
      expect(mock.queueSize).toBe(2);

      const result1 = await mock.receive();
      expect(result1?.newContent).toBe("first");

      const result2 = await mock.receive();
      expect(result2?.newContent).toBe("second");

      mock.close();
    });
  });

  describe("pushEvents()", () => {
    test("creates SessionUpdate from events", async () => {
      const mock = new MockSessionUpdateReceiver("test-session");

      const events: TranscriptEvent[] = [
        {
          type: "user",
          raw: { type: "user", content: "Hello" },
        } as TranscriptEvent,
        {
          type: "assistant",
          raw: { type: "assistant", content: "Hi there" },
        } as TranscriptEvent,
      ];

      mock.pushEvents(events);

      const update = await mock.receive();
      expect(update).not.toBe(null);
      expect(update?.sessionId).toBe("test-session");
      expect(update?.events).toHaveLength(2);
      expect(update?.events[0]?.type).toBe("user");
      expect(update?.events[1]?.type).toBe("assistant");
      expect(update?.timestamp).toBeDefined();

      mock.close();
    });

    test("auto-generates newContent from events", async () => {
      const mock = new MockSessionUpdateReceiver("test");

      const events: TranscriptEvent[] = [
        {
          type: "user",
          raw: { type: "user", content: "Hello" },
        } as TranscriptEvent,
      ];

      mock.pushEvents(events);

      const update = await mock.receive();
      expect(update?.newContent).toBe('{"type":"user","content":"Hello"}\n');

      mock.close();
    });

    test("uses custom content when provided", async () => {
      const mock = new MockSessionUpdateReceiver("test");

      const events: TranscriptEvent[] = [
        {
          type: "user",
          raw: { type: "user", content: "Hello" },
        } as TranscriptEvent,
      ];

      mock.pushEvents(events, "custom content here");

      const update = await mock.receive();
      expect(update?.newContent).toBe("custom content here");

      mock.close();
    });

    test("throws when receiver is closed", () => {
      const mock = new MockSessionUpdateReceiver("test");
      mock.close();

      expect(() => mock.pushEvents([])).toThrow(
        "Cannot push update to closed mock receiver",
      );
    });
  });

  describe("receive()", () => {
    test("returns queued updates in FIFO order", async () => {
      const mock = new MockSessionUpdateReceiver("test");

      mock.pushEvents([
        { type: "user", raw: { type: "user" } } as TranscriptEvent,
      ]);
      mock.pushEvents([
        {
          type: "assistant",
          raw: { type: "assistant" },
        } as TranscriptEvent,
      ]);

      const r1 = await mock.receive();
      const r2 = await mock.receive();

      expect(r1?.events[0]?.type).toBe("user");
      expect(r2?.events[0]?.type).toBe("assistant");

      mock.close();
    });

    test("blocks until update is pushed", async () => {
      const mock = new MockSessionUpdateReceiver("test");

      let received = false;
      const receivePromise = mock.receive().then((update) => {
        received = true;
        return update;
      });

      await new Promise((resolve) => setTimeout(resolve, 50));
      expect(received).toBe(false);
      expect(mock.hasPendingReceive).toBe(true);

      mock.pushEvents([
        { type: "user", raw: { type: "user" } } as TranscriptEvent,
      ]);

      const result = await receivePromise;
      expect(received).toBe(true);
      expect(result?.events[0]?.type).toBe("user");

      mock.close();
    });

    test("returns null immediately when closed", async () => {
      const mock = new MockSessionUpdateReceiver("test");
      mock.close();

      const result = await mock.receive();
      expect(result).toBe(null);
    });
  });

  describe("ISessionUpdateReceiver compatibility", () => {
    test("can be used where ISessionUpdateReceiver is expected", async () => {
      const mock: import("../receiver").ISessionUpdateReceiver =
        new MockSessionUpdateReceiver("test");

      expect(mock.sessionId).toBe("test");
      expect(mock.isClosed).toBe(false);

      mock.close();
      expect(mock.isClosed).toBe(true);

      const result = await mock.receive();
      expect(result).toBe(null);
    });
  });
});
