/**
 * Tests for test helper utilities.
 *
 * @module test/helpers.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createMockSession,
  createMockMessage,
  createMockTask,
  resetHelperCounters,
} from "./helpers";

describe("Test Helpers", () => {
  beforeEach(() => {
    resetHelperCounters();
  });

  describe("createMockSession", () => {
    it("should create session with default values", () => {
      const session = createMockSession();

      expect(session.id).toBe("test-session-1");
      expect(session.projectPath).toBe("/test/project");
      expect(session.status).toBe("active");
      expect(session.messages).toEqual([]);
      expect(session.tasks).toEqual([]);
      expect(session.createdAt).toBeDefined();
      expect(session.updatedAt).toBeDefined();
    });

    it("should allow overriding id", () => {
      const session = createMockSession({ id: "custom-id" });

      expect(session.id).toBe("custom-id");
    });

    it("should allow overriding projectPath", () => {
      const session = createMockSession({ projectPath: "/custom/path" });

      expect(session.projectPath).toBe("/custom/path");
    });

    it("should allow overriding status", () => {
      const session = createMockSession({ status: "completed" });

      expect(session.status).toBe("completed");
    });

    it("should allow overriding timestamps", () => {
      const createdAt = "2026-01-01T00:00:00.000Z";
      const updatedAt = "2026-01-02T00:00:00.000Z";

      const session = createMockSession({ createdAt, updatedAt });

      expect(session.createdAt).toBe(createdAt);
      expect(session.updatedAt).toBe(updatedAt);
    });

    it("should allow providing messages", () => {
      const messages = [
        createMockMessage({ role: "user", content: "Hello" }),
        createMockMessage({ role: "assistant", content: "Hi" }),
      ];

      const session = createMockSession({ messages });

      expect(session.messages).toEqual(messages);
    });

    it("should allow providing tasks", () => {
      const tasks = [
        createMockTask({ content: "Task 1" }),
        createMockTask({ content: "Task 2" }),
      ];

      const session = createMockSession({ tasks });

      expect(session.tasks).toEqual(tasks);
    });

    it("should create valid session for all status values", () => {
      const statuses = ["active", "paused", "completed", "failed"] as const;

      statuses.forEach((status) => {
        const session = createMockSession({ status });
        expect(session.status).toBe(status);
      });
    });
  });

  describe("createMockMessage", () => {
    it("should create message with default values", () => {
      const message = createMockMessage();

      expect(message.id).toBe("msg-1");
      expect(message.role).toBe("user");
      expect(message.content).toBe("Test message");
      expect(message.timestamp).toBeDefined();
    });

    it("should auto-increment message IDs", () => {
      const msg1 = createMockMessage();
      const msg2 = createMockMessage();
      const msg3 = createMockMessage();

      expect(msg1.id).toBe("msg-1");
      expect(msg2.id).toBe("msg-2");
      expect(msg3.id).toBe("msg-3");
    });

    it("should allow overriding id", () => {
      const message = createMockMessage({ id: "custom-msg-id" });

      expect(message.id).toBe("custom-msg-id");
    });

    it("should allow overriding role", () => {
      const message = createMockMessage({ role: "assistant" });

      expect(message.role).toBe("assistant");
    });

    it("should allow overriding content", () => {
      const message = createMockMessage({ content: "Custom content" });

      expect(message.content).toBe("Custom content");
    });

    it("should allow overriding timestamp", () => {
      const timestamp = "2026-01-01T00:00:00.000Z";
      const message = createMockMessage({ timestamp });

      expect(message.timestamp).toBe(timestamp);
    });

    it("should create valid messages for all role values", () => {
      const roles = ["user", "assistant", "system"] as const;

      roles.forEach((role) => {
        const message = createMockMessage({ role });
        expect(message.role).toBe(role);
      });
    });

    it("should reset counter when resetHelperCounters is called", () => {
      createMockMessage(); // msg-1
      createMockMessage(); // msg-2

      resetHelperCounters();

      const message = createMockMessage(); // Should be msg-1 again
      expect(message.id).toBe("msg-1");
    });
  });

  describe("createMockTask", () => {
    it("should create task with default values", () => {
      const task = createMockTask();

      expect(task.content).toBe("Test task");
      expect(task.status).toBe("pending");
      expect(task.activeForm).toBe("Test task");
    });

    it("should allow overriding content", () => {
      const task = createMockTask({ content: "Custom task content" });

      expect(task.content).toBe("Custom task content");
    });

    it("should allow overriding status", () => {
      const task = createMockTask({ status: "completed" });

      expect(task.status).toBe("completed");
    });

    it("should allow overriding activeForm", () => {
      const task = createMockTask({ activeForm: "Custom active form" });

      expect(task.activeForm).toBe("Custom active form");
    });

    it("should generate activeForm for in_progress status", () => {
      const task = createMockTask({
        content: "Build feature X",
        status: "in_progress",
      });

      expect(task.activeForm).toBe("Working on: Build feature X");
    });

    it("should use content as activeForm for non-in_progress status", () => {
      const task = createMockTask({
        content: "Build feature X",
        status: "pending",
      });

      expect(task.activeForm).toBe("Build feature X");
    });

    it("should create valid tasks for all status values", () => {
      const statuses = ["pending", "in_progress", "completed"] as const;

      statuses.forEach((status) => {
        const task = createMockTask({ status });
        expect(task.status).toBe(status);
      });
    });

    it("should allow providing all fields together", () => {
      const task = createMockTask({
        content: "Complete implementation",
        status: "in_progress",
        activeForm: "Currently implementing",
      });

      expect(task.content).toBe("Complete implementation");
      expect(task.status).toBe("in_progress");
      expect(task.activeForm).toBe("Currently implementing");
    });
  });

  describe("resetHelperCounters", () => {
    it("should reset message counter", () => {
      createMockMessage(); // msg-1
      createMockMessage(); // msg-2

      resetHelperCounters();

      const message = createMockMessage();

      expect(message.id).toBe("msg-1");
    });

    it("should allow multiple resets", () => {
      createMockMessage(); // msg-1
      resetHelperCounters();
      createMockMessage(); // msg-1
      resetHelperCounters();
      createMockMessage(); // msg-1

      const message = createMockMessage();
      expect(message.id).toBe("msg-2");
    });
  });
});
