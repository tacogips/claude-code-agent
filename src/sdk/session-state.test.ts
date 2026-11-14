/**
 * Tests for SessionStateManager
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { SessionStateManager, type StateChange } from "./session-state";
import { InvalidStateError, TimeoutError } from "./errors";

describe("SessionStateManager", () => {
  let manager: SessionStateManager;
  const sessionId = "test-session-123";

  beforeEach(() => {
    manager = new SessionStateManager(sessionId);
  });

  describe("constructor", () => {
    it("should initialize with idle state", () => {
      const state = manager.getState();

      expect(state.state).toBe("idle");
      expect(state.sessionId).toBe(sessionId);
      expect(state.stats.toolCallCount).toBe(0);
      expect(state.stats.messageCount).toBe(0);
      expect(state.stats.startedAt).toBeUndefined();
      expect(state.stats.completedAt).toBeUndefined();
    });

    it("should have no pending operations initially", () => {
      const state = manager.getState();

      expect(state.pendingToolCall).toBeUndefined();
      expect(state.pendingPermission).toBeUndefined();
    });

    it("should not be terminal initially", () => {
      expect(manager.isTerminal()).toBe(false);
    });

    it("should return idle as current state", () => {
      expect(manager.getCurrentState()).toBe("idle");
    });
  });

  describe("transition()", () => {
    it("should transition from idle to starting", () => {
      manager.transition("starting");

      expect(manager.getCurrentState()).toBe("starting");
    });

    it("should emit stateChange event", () => {
      return new Promise<void>((resolve) => {
        manager.on("stateChange", (change: StateChange) => {
          expect(change.from).toBe("idle");
          expect(change.to).toBe("starting");
          expect(change.info.state).toBe("starting");
          expect(change.timestamp).toBeDefined();
          resolve();
        });

        manager.transition("starting");
      });
    });

    it("should throw InvalidStateError for invalid transition", () => {
      expect(() => {
        manager.transition("completed");
      }).toThrow(InvalidStateError);

      expect(() => {
        manager.transition("completed");
      }).toThrow("Invalid state: idle. Expected one of: starting");
    });

    it("should merge metadata into state info", () => {
      manager.transition("starting");
      manager.transition("running", {
        stats: {
          startedAt: "2026-01-10T10:00:00.000Z",
          toolCallCount: 0,
          messageCount: 0,
        },
      });

      const state = manager.getState();
      expect(state.stats.startedAt).toBe("2026-01-10T10:00:00.000Z");
    });

    it("should clear pending operations when entering terminal state", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.startToolCall("tool-1", "add", "calc", { a: 1, b: 2 });

      const beforeState = manager.getState();
      expect(beforeState.pendingToolCall).toBeDefined();

      // Transition to failed (terminal state)
      manager.transition("failed");

      const afterState = manager.getState();
      expect(afterState.pendingToolCall).toBeUndefined();
    });
  });

  describe("valid transitions", () => {
    it("should allow idle -> starting", () => {
      expect(() => manager.transition("starting")).not.toThrow();
    });

    it("should allow starting -> running", () => {
      manager.transition("starting");
      expect(() => manager.transition("running")).not.toThrow();
    });

    it("should allow starting -> failed", () => {
      manager.transition("starting");
      expect(() => manager.transition("failed")).not.toThrow();
    });

    it("should allow running -> waiting_tool_call", () => {
      manager.transition("starting");
      manager.transition("running");
      expect(() => manager.transition("waiting_tool_call")).not.toThrow();
    });

    it("should allow running -> waiting_permission", () => {
      manager.transition("starting");
      manager.transition("running");
      expect(() => manager.transition("waiting_permission")).not.toThrow();
    });

    it("should allow running -> paused", () => {
      manager.transition("starting");
      manager.transition("running");
      expect(() => manager.transition("paused")).not.toThrow();
    });

    it("should allow running -> completed", () => {
      manager.transition("starting");
      manager.transition("running");
      expect(() => manager.transition("completed")).not.toThrow();
    });

    it("should allow running -> failed", () => {
      manager.transition("starting");
      manager.transition("running");
      expect(() => manager.transition("failed")).not.toThrow();
    });

    it("should allow running -> cancelled", () => {
      manager.transition("starting");
      manager.transition("running");
      expect(() => manager.transition("cancelled")).not.toThrow();
    });

    it("should allow waiting_tool_call -> running", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.transition("waiting_tool_call");
      expect(() => manager.transition("running")).not.toThrow();
    });

    it("should allow waiting_tool_call -> failed", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.transition("waiting_tool_call");
      expect(() => manager.transition("failed")).not.toThrow();
    });

    it("should allow waiting_tool_call -> cancelled", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.transition("waiting_tool_call");
      expect(() => manager.transition("cancelled")).not.toThrow();
    });

    it("should allow waiting_permission -> running", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.transition("waiting_permission");
      expect(() => manager.transition("running")).not.toThrow();
    });

    it("should allow waiting_permission -> failed", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.transition("waiting_permission");
      expect(() => manager.transition("failed")).not.toThrow();
    });

    it("should allow waiting_permission -> cancelled", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.transition("waiting_permission");
      expect(() => manager.transition("cancelled")).not.toThrow();
    });

    it("should allow paused -> running", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.transition("paused");
      expect(() => manager.transition("running")).not.toThrow();
    });

    it("should allow paused -> cancelled", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.transition("paused");
      expect(() => manager.transition("cancelled")).not.toThrow();
    });
  });

  describe("invalid transitions", () => {
    it("should reject transition from terminal state", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.transition("completed");

      expect(() => manager.transition("running")).toThrow(InvalidStateError);
    });

    it("should reject completed -> any", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.transition("completed");

      expect(() => manager.transition("idle")).toThrow(InvalidStateError);
      expect(() => manager.transition("running")).toThrow(InvalidStateError);
    });

    it("should reject failed -> any", () => {
      manager.transition("starting");
      manager.transition("failed");

      expect(() => manager.transition("running")).toThrow(InvalidStateError);
    });

    it("should reject cancelled -> any", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.transition("cancelled");

      expect(() => manager.transition("running")).toThrow(InvalidStateError);
    });
  });

  describe("startToolCall()", () => {
    beforeEach(() => {
      manager.transition("starting");
      manager.transition("running");
    });

    it("should transition to waiting_tool_call", () => {
      manager.startToolCall("tool-1", "add", "calculator", { a: 1, b: 2 });

      expect(manager.getCurrentState()).toBe("waiting_tool_call");
    });

    it("should record pending tool call", () => {
      manager.startToolCall("tool-1", "add", "calculator", { a: 15, b: 27 });

      const state = manager.getState();
      expect(state.pendingToolCall).toBeDefined();
      expect(state.pendingToolCall?.toolUseId).toBe("tool-1");
      expect(state.pendingToolCall?.toolName).toBe("add");
      expect(state.pendingToolCall?.serverName).toBe("calculator");
      expect(state.pendingToolCall?.arguments).toEqual({ a: 15, b: 27 });
      expect(state.pendingToolCall?.startedAt).toBeDefined();
    });

    it("should emit stateChange event", () => {
      return new Promise<void>((resolve) => {
        manager.on("stateChange", (change: StateChange) => {
          expect(change.from).toBe("running");
          expect(change.to).toBe("waiting_tool_call");
          expect(change.info.pendingToolCall).toBeDefined();
          resolve();
        });

        manager.startToolCall("tool-1", "add", "calc", { a: 1, b: 2 });
      });
    });
  });

  describe("completeToolCall()", () => {
    beforeEach(() => {
      manager.transition("starting");
      manager.transition("running");
      manager.startToolCall("tool-1", "add", "calculator", { a: 1, b: 2 });
    });

    it("should transition back to running", () => {
      manager.completeToolCall("tool-1");

      expect(manager.getCurrentState()).toBe("running");
    });

    it("should clear pending tool call", () => {
      manager.completeToolCall("tool-1");

      const state = manager.getState();
      expect(state.pendingToolCall).toBeUndefined();
    });

    it("should increment tool call count", () => {
      const beforeCount = manager.getState().stats.toolCallCount;

      manager.completeToolCall("tool-1");

      const afterCount = manager.getState().stats.toolCallCount;
      expect(afterCount).toBe(beforeCount + 1);
    });

    it("should emit stateChange event", () => {
      return new Promise<void>((resolve) => {
        manager.on("stateChange", (change: StateChange) => {
          expect(change.from).toBe("waiting_tool_call");
          expect(change.to).toBe("running");
          expect(change.info.pendingToolCall).toBeUndefined();
          resolve();
        });

        manager.completeToolCall("tool-1");
      });
    });
  });

  describe("startPermissionRequest()", () => {
    beforeEach(() => {
      manager.transition("starting");
      manager.transition("running");
    });

    it("should transition to waiting_permission", () => {
      manager.startPermissionRequest("perm-1", "Bash", { command: "ls" });

      expect(manager.getCurrentState()).toBe("waiting_permission");
    });

    it("should record pending permission", () => {
      manager.startPermissionRequest("perm-1", "Bash", {
        command: "rm -rf /tmp",
      });

      const state = manager.getState();
      expect(state.pendingPermission).toBeDefined();
      expect(state.pendingPermission?.requestId).toBe("perm-1");
      expect(state.pendingPermission?.toolName).toBe("Bash");
      expect(state.pendingPermission?.toolInput).toEqual({
        command: "rm -rf /tmp",
      });
    });

    it("should emit stateChange event", () => {
      return new Promise<void>((resolve) => {
        manager.on("stateChange", (change: StateChange) => {
          expect(change.from).toBe("running");
          expect(change.to).toBe("waiting_permission");
          expect(change.info.pendingPermission).toBeDefined();
          resolve();
        });

        manager.startPermissionRequest("perm-1", "Bash", { command: "ls" });
      });
    });
  });

  describe("completePermissionRequest()", () => {
    beforeEach(() => {
      manager.transition("starting");
      manager.transition("running");
      manager.startPermissionRequest("perm-1", "Bash", { command: "ls" });
    });

    it("should transition back to running", () => {
      manager.completePermissionRequest("perm-1");

      expect(manager.getCurrentState()).toBe("running");
    });

    it("should clear pending permission", () => {
      manager.completePermissionRequest("perm-1");

      const state = manager.getState();
      expect(state.pendingPermission).toBeUndefined();
    });

    it("should emit stateChange event", () => {
      return new Promise<void>((resolve) => {
        manager.on("stateChange", (change: StateChange) => {
          expect(change.from).toBe("waiting_permission");
          expect(change.to).toBe("running");
          expect(change.info.pendingPermission).toBeUndefined();
          resolve();
        });

        manager.completePermissionRequest("perm-1");
      });
    });
  });

  describe("incrementMessageCount()", () => {
    it("should increment message count", () => {
      const before = manager.getState().stats.messageCount;

      manager.incrementMessageCount();

      const after = manager.getState().stats.messageCount;
      expect(after).toBe(before + 1);
    });

    it("should increment multiple times", () => {
      manager.incrementMessageCount();
      manager.incrementMessageCount();
      manager.incrementMessageCount();

      const count = manager.getState().stats.messageCount;
      expect(count).toBe(3);
    });

    it("should not emit stateChange event", () => {
      const listener = vi.fn();
      manager.on("stateChange", listener);

      manager.incrementMessageCount();

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe("markStarted()", () => {
    it("should transition from starting to running", () => {
      manager.transition("starting");
      manager.markStarted();

      expect(manager.getCurrentState()).toBe("running");
    });

    it("should set startedAt timestamp", () => {
      manager.transition("starting");

      const before = manager.getState().stats.startedAt;
      expect(before).toBeUndefined();

      manager.markStarted();

      const after = manager.getState().stats.startedAt;
      expect(after).toBeDefined();
      expect(typeof after).toBe("string");
    });

    it("should emit stateChange event", () => {
      manager.transition("starting");

      return new Promise<void>((resolve) => {
        manager.on("stateChange", (change: StateChange) => {
          expect(change.to).toBe("running");
          expect(change.info.stats.startedAt).toBeDefined();
          resolve();
        });

        manager.markStarted();
      });
    });
  });

  describe("markCompleted()", () => {
    beforeEach(() => {
      manager.transition("starting");
      manager.transition("running");
    });

    it("should transition to completed", () => {
      manager.markCompleted();

      expect(manager.getCurrentState()).toBe("completed");
    });

    it("should set completedAt timestamp", () => {
      const before = manager.getState().stats.completedAt;
      expect(before).toBeUndefined();

      manager.markCompleted();

      const after = manager.getState().stats.completedAt;
      expect(after).toBeDefined();
      expect(typeof after).toBe("string");
    });

    it("should be terminal", () => {
      manager.markCompleted();

      expect(manager.isTerminal()).toBe(true);
    });

    it("should emit stateChange event", () => {
      return new Promise<void>((resolve) => {
        manager.on("stateChange", (change: StateChange) => {
          expect(change.to).toBe("completed");
          expect(change.info.stats.completedAt).toBeDefined();
          resolve();
        });

        manager.markCompleted();
      });
    });
  });

  describe("markFailed()", () => {
    beforeEach(() => {
      manager.transition("starting");
      manager.transition("running");
    });

    it("should transition to failed", () => {
      manager.markFailed();

      expect(manager.getCurrentState()).toBe("failed");
    });

    it("should be terminal", () => {
      manager.markFailed();

      expect(manager.isTerminal()).toBe(true);
    });

    it("should accept error parameter", () => {
      const error = new Error("Connection lost");
      expect(() => manager.markFailed(error)).not.toThrow();
    });

    it("should emit stateChange event", () => {
      return new Promise<void>((resolve) => {
        manager.on("stateChange", (change: StateChange) => {
          expect(change.to).toBe("failed");
          resolve();
        });

        manager.markFailed();
      });
    });
  });

  describe("getState()", () => {
    it("should return a copy of state info", () => {
      const state1 = manager.getState();
      const state2 = manager.getState();

      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });

    it("should return copy of stats", () => {
      const state = manager.getState();

      // Cannot mutate readonly property, so just verify we got a copy
      const newState = manager.getState();
      expect(newState.stats.messageCount).toBe(0);
      expect(state.stats).not.toBe(newState.stats);
    });

    it("should return copy of pending tool call", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.startToolCall("tool-1", "add", "calc", { a: 1, b: 2 });

      const state = manager.getState();
      const pending = state.pendingToolCall;

      expect(pending).toBeDefined();

      const newState = manager.getState();
      expect(newState.pendingToolCall).not.toBe(pending);
      expect(newState.pendingToolCall).toEqual(pending);
    });

    it("should return copy of pending permission", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.startPermissionRequest("perm-1", "Bash", { command: "ls" });

      const state = manager.getState();
      const pending = state.pendingPermission;

      expect(pending).toBeDefined();

      const newState = manager.getState();
      expect(newState.pendingPermission).not.toBe(pending);
      expect(newState.pendingPermission).toEqual(pending);
    });
  });

  describe("getCurrentState()", () => {
    it("should return current state enum", () => {
      expect(manager.getCurrentState()).toBe("idle");

      manager.transition("starting");
      expect(manager.getCurrentState()).toBe("starting");

      manager.transition("running");
      expect(manager.getCurrentState()).toBe("running");
    });
  });

  describe("isTerminal()", () => {
    it("should return false for non-terminal states", () => {
      expect(manager.isTerminal()).toBe(false);

      manager.transition("starting");
      expect(manager.isTerminal()).toBe(false);

      manager.transition("running");
      expect(manager.isTerminal()).toBe(false);
    });

    it("should return true for completed", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.transition("completed");

      expect(manager.isTerminal()).toBe(true);
    });

    it("should return true for failed", () => {
      manager.transition("starting");
      manager.transition("failed");

      expect(manager.isTerminal()).toBe(true);
    });

    it("should return true for cancelled", () => {
      manager.transition("starting");
      manager.transition("running");
      manager.transition("cancelled");

      expect(manager.isTerminal()).toBe(true);
    });
  });

  describe("waitForState()", () => {
    it("should resolve immediately if already in target state", async () => {
      manager.transition("starting");

      const info = await manager.waitForState("starting");

      expect(info.state).toBe("starting");
    });

    it("should wait for state transition", async () => {
      const promise = manager.waitForState("running");

      // Trigger transition after a delay
      setTimeout(() => {
        manager.transition("starting");
        manager.transition("running");
      }, 10);

      const info = await promise;
      expect(info.state).toBe("running");
    });

    it("should work with array of states", async () => {
      const promise = manager.waitForState(["completed", "failed"]);

      setTimeout(() => {
        manager.transition("starting");
        manager.transition("running");
        manager.transition("completed");
      }, 10);

      const info = await promise;
      expect(info.state).toBe("completed");
    });

    it("should timeout if state not reached", async () => {
      const promise = manager.waitForState("completed", 50);

      await expect(promise).rejects.toThrow(TimeoutError);
      await expect(promise).rejects.toThrow("timed out after 50ms");
    });

    it("should resolve before timeout if state reached", async () => {
      const promise = manager.waitForState("running", 1000);

      setTimeout(() => {
        manager.transition("starting");
        manager.transition("running");
      }, 10);

      const info = await promise;
      expect(info.state).toBe("running");
    });

    it("should work without timeout", async () => {
      const promise = manager.waitForState("completed");

      setTimeout(() => {
        manager.transition("starting");
        manager.transition("running");
        manager.transition("completed");
      }, 10);

      const info = await promise;
      expect(info.state).toBe("completed");
    });

    it("should resolve to first matching state in array", async () => {
      const promise = manager.waitForState(["completed", "failed", "running"]);

      setTimeout(() => {
        manager.transition("starting");
        manager.transition("running");
      }, 10);

      const info = await promise;
      expect(info.state).toBe("running");
    });

    it("should clean up listener on success", async () => {
      const listenerCountBefore = manager.listenerCount("stateChange");

      const promise = manager.waitForState("running");

      // Listener added during waitForState
      expect(manager.listenerCount("stateChange")).toBe(
        listenerCountBefore + 1,
      );

      setTimeout(() => {
        manager.transition("starting");
        manager.transition("running");
      }, 10);

      await promise;

      // Listener should be removed after promise resolves
      expect(manager.listenerCount("stateChange")).toBe(listenerCountBefore);
    });

    it("should clean up listener on timeout", async () => {
      const listenerCountBefore = manager.listenerCount("stateChange");

      const promise = manager.waitForState("completed", 50);

      // Listener added during waitForState
      expect(manager.listenerCount("stateChange")).toBe(
        listenerCountBefore + 1,
      );

      await expect(promise).rejects.toThrow(TimeoutError);

      // Listener should be removed after timeout
      expect(manager.listenerCount("stateChange")).toBe(listenerCountBefore);
    });
  });

  describe("complex state sequences", () => {
    it("should handle tool call sequence", () => {
      manager.transition("starting");
      manager.transition("running");

      manager.startToolCall("tool-1", "add", "calc", { a: 1, b: 2 });
      expect(manager.getCurrentState()).toBe("waiting_tool_call");
      expect(manager.getState().stats.toolCallCount).toBe(0);

      manager.completeToolCall("tool-1");
      expect(manager.getCurrentState()).toBe("running");
      expect(manager.getState().stats.toolCallCount).toBe(1);

      manager.startToolCall("tool-2", "multiply", "calc", { a: 5, b: 3 });
      expect(manager.getCurrentState()).toBe("waiting_tool_call");

      manager.completeToolCall("tool-2");
      expect(manager.getCurrentState()).toBe("running");
      expect(manager.getState().stats.toolCallCount).toBe(2);
    });

    it("should handle permission sequence", () => {
      manager.transition("starting");
      manager.transition("running");

      manager.startPermissionRequest("perm-1", "Bash", { command: "ls" });
      expect(manager.getCurrentState()).toBe("waiting_permission");

      manager.completePermissionRequest("perm-1");
      expect(manager.getCurrentState()).toBe("running");
    });

    it("should handle full session lifecycle", () => {
      // Start
      manager.transition("starting");
      expect(manager.getCurrentState()).toBe("starting");

      manager.markStarted();
      expect(manager.getCurrentState()).toBe("running");
      expect(manager.getState().stats.startedAt).toBeDefined();

      // Tool call
      manager.incrementMessageCount();
      manager.startToolCall("tool-1", "add", "calc", { a: 1, b: 2 });
      manager.completeToolCall("tool-1");

      expect(manager.getState().stats.messageCount).toBe(1);
      expect(manager.getState().stats.toolCallCount).toBe(1);

      // Complete
      manager.markCompleted();
      expect(manager.getCurrentState()).toBe("completed");
      expect(manager.getState().stats.completedAt).toBeDefined();
      expect(manager.isTerminal()).toBe(true);
    });

    it("should track multiple messages and tool calls", () => {
      manager.transition("starting");
      manager.transition("running");

      for (let i = 0; i < 5; i++) {
        manager.incrementMessageCount();
      }

      for (let i = 0; i < 3; i++) {
        manager.startToolCall(`tool-${i}`, "add", "calc", { a: i, b: i + 1 });
        manager.completeToolCall(`tool-${i}`);
      }

      const state = manager.getState();
      expect(state.stats.messageCount).toBe(5);
      expect(state.stats.toolCallCount).toBe(3);
    });
  });

  describe("event emission", () => {
    it("should emit stateChange for all transitions", () => {
      const changes: StateChange[] = [];

      manager.on("stateChange", (change) => {
        changes.push(change);
      });

      manager.transition("starting");
      manager.transition("running");
      manager.transition("completed");

      expect(changes).toHaveLength(3);
      expect(changes[0]?.from).toBe("idle");
      expect(changes[0]?.to).toBe("starting");
      expect(changes[1]?.from).toBe("starting");
      expect(changes[1]?.to).toBe("running");
      expect(changes[2]?.from).toBe("running");
      expect(changes[2]?.to).toBe("completed");
    });

    it("should include timestamp in state change", () => {
      return new Promise<void>((resolve) => {
        manager.on("stateChange", (change) => {
          expect(change.timestamp).toBeDefined();
          expect(typeof change.timestamp).toBe("string");
          expect(new Date(change.timestamp).toISOString()).toBe(
            change.timestamp,
          );
          resolve();
        });

        manager.transition("starting");
      });
    });

    it("should include state info in change event", () => {
      return new Promise<void>((resolve) => {
        manager.on("stateChange", (change) => {
          expect(change.info).toBeDefined();
          expect(change.info.sessionId).toBe(sessionId);
          expect(change.info.state).toBe("starting");
          resolve();
        });

        manager.transition("starting");
      });
    });
  });
});
