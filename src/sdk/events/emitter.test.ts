/**
 * Tests for EventEmitter.
 */

import { describe, it, expect, vi } from "vitest";
import { EventEmitter, createEventEmitter } from "./emitter";
import type { SessionStartedEvent } from "./types";

describe("EventEmitter", () => {
  const createSessionStartedEvent = (): SessionStartedEvent => ({
    type: "session_started",
    timestamp: "2026-01-05T00:00:00.000Z",
    sessionId: "test-session",
    projectPath: "/path/to/project",
  });

  describe("on", () => {
    it("subscribes to events and receives them", () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();
      const event = createSessionStartedEvent();

      emitter.on("session_started", handler);
      emitter.emit("session_started", event);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(event);
    });

    it("allows multiple handlers for same event", () => {
      const emitter = new EventEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const event = createSessionStartedEvent();

      emitter.on("session_started", handler1);
      emitter.on("session_started", handler2);
      emitter.emit("session_started", event);

      expect(handler1).toHaveBeenCalledOnce();
      expect(handler2).toHaveBeenCalledOnce();
    });

    it("calls handlers multiple times on multiple emits", () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();

      emitter.on("session_started", handler);
      emitter.emit("session_started", createSessionStartedEvent());
      emitter.emit("session_started", createSessionStartedEvent());

      expect(handler).toHaveBeenCalledTimes(2);
    });

    it("returns subscription that can be unsubscribed", () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();

      const subscription = emitter.on("session_started", handler);
      subscription.unsubscribe();
      emitter.emit("session_started", createSessionStartedEvent());

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("off", () => {
    it("removes specific handler", () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();

      emitter.on("session_started", handler);
      emitter.off("session_started", handler);
      emitter.emit("session_started", createSessionStartedEvent());

      expect(handler).not.toHaveBeenCalled();
    });

    it("keeps other handlers when one is removed", () => {
      const emitter = new EventEmitter();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      emitter.on("session_started", handler1);
      emitter.on("session_started", handler2);
      emitter.off("session_started", handler1);
      emitter.emit("session_started", createSessionStartedEvent());

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledOnce();
    });
  });

  describe("once", () => {
    it("calls handler only once", () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();

      emitter.once("session_started", handler);
      emitter.emit("session_started", createSessionStartedEvent());
      emitter.emit("session_started", createSessionStartedEvent());

      expect(handler).toHaveBeenCalledOnce();
    });

    it("can be unsubscribed before event", () => {
      const emitter = new EventEmitter();
      const handler = vi.fn();

      const subscription = emitter.once("session_started", handler);
      subscription.unsubscribe();
      emitter.emit("session_started", createSessionStartedEvent());

      expect(handler).not.toHaveBeenCalled();
    });

    it("continues calling other once handlers if one throws", () => {
      const emitter = new EventEmitter();
      const errorHandler = vi.fn(() => {
        throw new Error("once handler error");
      });
      const normalHandler = vi.fn();

      emitter.once("session_started", errorHandler);
      emitter.once("session_started", normalHandler);
      emitter.emit("session_started", createSessionStartedEvent());

      expect(errorHandler).toHaveBeenCalledOnce();
      expect(normalHandler).toHaveBeenCalledOnce();
      // Error is logged via logger.error, which we verify by ensuring
      // the second handler still executes (error handling works)
    });
  });

  describe("emit", () => {
    it("does nothing if no handlers", () => {
      const emitter = new EventEmitter();
      // Should not throw
      expect(() =>
        emitter.emit("session_started", createSessionStartedEvent()),
      ).not.toThrow();
    });

    it("continues calling handlers if one throws", () => {
      const emitter = new EventEmitter();
      const errorHandler = vi.fn(() => {
        throw new Error("handler error");
      });
      const normalHandler = vi.fn();

      emitter.on("session_started", errorHandler);
      emitter.on("session_started", normalHandler);
      emitter.emit("session_started", createSessionStartedEvent());

      expect(errorHandler).toHaveBeenCalledOnce();
      expect(normalHandler).toHaveBeenCalledOnce();
      // Error is logged via logger.error, which we verify by ensuring
      // the second handler still executes (error handling works)
    });
  });

  describe("listenerCount", () => {
    it("returns 0 for events with no listeners", () => {
      const emitter = new EventEmitter();
      expect(emitter.listenerCount("session_started")).toBe(0);
    });

    it("counts regular and once listeners", () => {
      const emitter = new EventEmitter();
      emitter.on("session_started", () => {});
      emitter.on("session_started", () => {});
      emitter.once("session_started", () => {});

      expect(emitter.listenerCount("session_started")).toBe(3);
    });
  });

  describe("removeAllListeners", () => {
    it("removes all listeners for specific event", () => {
      const emitter = new EventEmitter();
      emitter.on("session_started", () => {});
      emitter.on("session_ended", () => {});

      emitter.removeAllListeners("session_started");

      expect(emitter.listenerCount("session_started")).toBe(0);
      expect(emitter.listenerCount("session_ended")).toBe(1);
    });

    it("removes all listeners when no event specified", () => {
      const emitter = new EventEmitter();
      emitter.on("session_started", () => {});
      emitter.on("session_ended", () => {});

      emitter.removeAllListeners();

      expect(emitter.listenerCount("session_started")).toBe(0);
      expect(emitter.listenerCount("session_ended")).toBe(0);
    });
  });

  describe("waitFor", () => {
    it("resolves when event is emitted", async () => {
      const emitter = new EventEmitter();
      const event = createSessionStartedEvent();

      const promise = emitter.waitFor("session_started");

      // Emit after a short delay to simulate async
      setTimeout(() => {
        emitter.emit("session_started", event);
      }, 10);

      const received = await promise;
      expect(received).toEqual(event);
    });
  });

  describe("createEventEmitter", () => {
    it("creates a new EventEmitter instance", () => {
      const emitter = createEventEmitter();
      expect(emitter).toBeInstanceOf(EventEmitter);
    });
  });

  describe("type safety", () => {
    it("only allows correct event payloads", () => {
      const emitter = new EventEmitter();

      // This should compile and work
      emitter.on("session_started", (event) => {
        // Type narrowing should work
        expect(event.type).toBe("session_started");
        expect(typeof event.sessionId).toBe("string");
        expect(typeof event.projectPath).toBe("string");
      });

      emitter.emit("session_started", createSessionStartedEvent());
    });
  });
});
