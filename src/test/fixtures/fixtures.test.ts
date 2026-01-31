/**
 * Tests for test fixtures.
 *
 * Verifies that fixture factory functions create valid objects.
 *
 * @module test/fixtures/fixtures.test
 */

import { describe, test, expect } from "vitest";
import { createTestQueue, createTestQueueCommand } from "./queue";
import { createTestGroup, createTestGroupSession } from "./group";
import { expectOk, expectErr, expectResultValue } from "../helpers/assertions";
import { ok, err } from "../../result";

describe("Queue Fixtures", () => {
  test("createTestQueue creates valid queue with defaults", () => {
    const queue = createTestQueue();

    expect(queue.id).toBe("queue-123");
    expect(queue.name).toBe("test-queue");
    expect(queue.status).toBe("pending");
    expect(queue.commands).toEqual([]);
    expect(queue.totalCostUsd).toBe(0);
  });

  test("createTestQueue accepts overrides", () => {
    const queue = createTestQueue({
      id: "custom-id",
      name: "Custom Queue",
      status: "running",
      totalCostUsd: 1.5,
    });

    expect(queue.id).toBe("custom-id");
    expect(queue.name).toBe("Custom Queue");
    expect(queue.status).toBe("running");
    expect(queue.totalCostUsd).toBe(1.5);
  });

  test("createTestQueueCommand creates valid command with defaults", () => {
    const command = createTestQueueCommand();

    expect(command.id).toBe("cmd-1");
    expect(command.prompt).toBe("Test command");
    expect(command.status).toBe("pending");
    expect(command.sessionMode).toBe("continue");
  });

  test("createTestQueueCommand accepts overrides", () => {
    const command = createTestQueueCommand({
      id: "cmd-custom",
      prompt: "Custom prompt",
      status: "completed",
      sessionId: "sess-123",
    });

    expect(command.id).toBe("cmd-custom");
    expect(command.prompt).toBe("Custom prompt");
    expect(command.status).toBe("completed");
    expect(command.sessionId).toBe("sess-123");
  });
});

describe("Group Fixtures", () => {
  test("createTestGroup creates valid group with defaults", () => {
    const group = createTestGroup();

    expect(group.id).toBe("group-123");
    expect(group.name).toBe("Test Group");
    expect(group.slug).toBe("test-group");
    expect(group.status).toBe("created");
    expect(group.sessions).toEqual([]);
  });

  test("createTestGroup accepts overrides", () => {
    const session = createTestGroupSession();
    const group = createTestGroup({
      id: "custom-group",
      name: "Custom Group",
      status: "running",
      sessions: [session],
    });

    expect(group.id).toBe("custom-group");
    expect(group.name).toBe("Custom Group");
    expect(group.status).toBe("running");
    expect(group.sessions).toHaveLength(1);
  });

  test("createTestGroupSession creates valid session with defaults", () => {
    const session = createTestGroupSession();

    expect(session.id).toBe("session-1");
    expect(session.projectPath).toBe("/test/project");
    expect(session.prompt).toBe("Test prompt");
    expect(session.status).toBe("pending");
    expect(session.dependsOn).toEqual([]);
  });

  test("createTestGroupSession accepts overrides", () => {
    const session = createTestGroupSession({
      id: "custom-session",
      prompt: "Custom prompt",
      status: "active",
      dependsOn: ["dep-1", "dep-2"],
    });

    expect(session.id).toBe("custom-session");
    expect(session.prompt).toBe("Custom prompt");
    expect(session.status).toBe("active");
    expect(session.dependsOn).toEqual(["dep-1", "dep-2"]);
  });
});

describe("Assertion Helpers", () => {
  test("expectOk extracts value from Ok result", () => {
    const result = ok(42);
    const value = expectOk(result);
    expect(value).toBe(42);
  });

  test("expectOk throws on Err result", () => {
    const result = err("error");
    // The function should throw (from expect().toBe() assertion)
    expect(() => expectOk(result)).toThrow();
  });

  test("expectErr extracts error from Err result", () => {
    const result = err("test error");
    const error = expectErr(result);
    expect(error).toBe("test error");
  });

  test("expectErr throws on Ok result", () => {
    const result = ok(42);
    // The function should throw (from expect().toBe() assertion)
    expect(() => expectErr(result)).toThrow();
  });

  test("expectResultValue runs assertions on Ok value", () => {
    const result = ok({ name: "Alice", age: 30 });

    expectResultValue(result, (value) => {
      expect(value.name).toBe("Alice");
      expect(value.age).toBe(30);
    });
  });

  test("expectResultValue throws on Err result", () => {
    const result = err("error");

    // The function should throw (from expect().toBe() assertion)
    expect(() => {
      expectResultValue(result, () => {
        // Should not reach here
        expect(true).toBe(false);
      });
    }).toThrow();
  });
});
