/**
 * Tests for Session Group event types.
 */

import { describe, test, expect } from "vitest";
import type {
  GroupEvent,
  GroupCreatedEvent,
  GroupStartedEvent,
  GroupSessionStartedEvent,
  BudgetWarningEvent,
  DependencyWaitingEvent,
} from "./events";

describe("Event Type Discriminators", () => {
  test("GroupCreatedEvent has correct type discriminator", () => {
    const event: GroupCreatedEvent = {
      type: "group_created",
      timestamp: new Date().toISOString(),
      groupId: "test-group",
      name: "Test Group",
      slug: "test-group",
      totalSessions: 3,
    };

    expect(event.type).toBe("group_created");
    expect(event.groupId).toBe("test-group");
    expect(event.totalSessions).toBe(3);
  });

  test("GroupStartedEvent has correct type discriminator", () => {
    const event: GroupStartedEvent = {
      type: "group_started",
      timestamp: new Date().toISOString(),
      groupId: "test-group",
      totalSessions: 5,
      maxConcurrent: 3,
    };

    expect(event.type).toBe("group_started");
    expect(event.maxConcurrent).toBe(3);
  });

  test("GroupSessionStartedEvent has correct type discriminator", () => {
    const event: GroupSessionStartedEvent = {
      type: "group_session_started",
      timestamp: new Date().toISOString(),
      groupId: "test-group",
      sessionId: "001-uuid",
      projectPath: "/path/to/project",
      prompt: "Test prompt",
    };

    expect(event.type).toBe("group_session_started");
    expect(event.sessionId).toBe("001-uuid");
    expect(event.prompt).toBe("Test prompt");
  });

  test("BudgetWarningEvent has correct type discriminator", () => {
    const event: BudgetWarningEvent = {
      type: "budget_warning",
      timestamp: new Date().toISOString(),
      groupId: "test-group",
      currentUsage: 8.0,
      limit: 10.0,
      percentUsed: 80,
    };

    expect(event.type).toBe("budget_warning");
    expect(event.percentUsed).toBe(80);
  });

  test("DependencyWaitingEvent has correct type discriminator", () => {
    const event: DependencyWaitingEvent = {
      type: "dependency_waiting",
      timestamp: new Date().toISOString(),
      groupId: "test-group",
      sessionId: "003-uuid",
      dependsOn: ["001-uuid", "002-uuid"],
      pendingDependencies: ["002-uuid"],
    };

    expect(event.type).toBe("dependency_waiting");
    expect(event.dependsOn).toEqual(["001-uuid", "002-uuid"]);
    expect(event.pendingDependencies).toEqual(["002-uuid"]);
  });
});

describe("Event Union Type", () => {
  test("GroupEvent union accepts all event types", () => {
    const events: GroupEvent[] = [
      {
        type: "group_created",
        timestamp: new Date().toISOString(),
        groupId: "test",
        name: "Test",
        slug: "test",
        totalSessions: 1,
      },
      {
        type: "group_started",
        timestamp: new Date().toISOString(),
        groupId: "test",
        totalSessions: 1,
        maxConcurrent: 1,
      },
      {
        type: "group_completed",
        timestamp: new Date().toISOString(),
        groupId: "test",
        completedSessions: 1,
        failedSessions: 0,
        totalCostUsd: 0.5,
        elapsedMs: 10000,
      },
      {
        type: "budget_warning",
        timestamp: new Date().toISOString(),
        groupId: "test",
        currentUsage: 8.0,
        limit: 10.0,
        percentUsed: 80,
      },
    ];

    expect(events).toHaveLength(4);
    expect(events[0]?.type).toBe("group_created");
    expect(events[1]?.type).toBe("group_started");
    expect(events[2]?.type).toBe("group_completed");
    expect(events[3]?.type).toBe("budget_warning");
  });

  test("Event type can be narrowed using discriminator", () => {
    const event: GroupEvent = {
      type: "group_session_started",
      timestamp: new Date().toISOString(),
      groupId: "test",
      sessionId: "001",
      projectPath: "/path",
      prompt: "Test",
    };

    if (event.type === "group_session_started") {
      // TypeScript should narrow the type here
      expect(event.sessionId).toBe("001");
      expect(event.prompt).toBe("Test");
    } else {
      throw new Error("Type narrowing failed");
    }
  });

  test("Switch on event type is exhaustive", () => {
    const handleEvent = (event: GroupEvent): string => {
      switch (event.type) {
        case "group_created":
          return `Created: ${event.name}`;
        case "group_started":
          return `Started: ${event.groupId}`;
        case "group_completed":
          return `Completed: ${event.groupId}`;
        case "group_paused":
          return `Paused: ${event.groupId}`;
        case "group_resumed":
          return `Resumed: ${event.groupId}`;
        case "group_failed":
          return `Failed: ${event.groupId}`;
        case "group_session_started":
          return `Session started: ${event.sessionId}`;
        case "group_session_completed":
          return `Session completed: ${event.sessionId}`;
        case "group_session_failed":
          return `Session failed: ${event.sessionId}`;
        case "budget_warning":
          return `Budget warning: ${event.percentUsed}%`;
        case "budget_exceeded":
          return `Budget exceeded: ${event.usage}`;
        case "dependency_waiting":
          return `Dependency waiting: ${event.sessionId}`;
        case "dependency_resolved":
          return `Dependency resolved: ${event.sessionId}`;
        case "session_progress":
          return `Session progress: ${event.sessionId}`;
        case "group_progress":
          return `Group progress: ${event.groupId}`;
        default: {
          // Exhaustiveness check
          const _exhaustive: never = event;
          throw new Error(`Unhandled event type: ${_exhaustive}`);
        }
      }
    };

    const event: GroupEvent = {
      type: "group_paused",
      timestamp: new Date().toISOString(),
      groupId: "test",
      runningSessions: 2,
      reason: "manual",
    };

    const result = handleEvent(event);
    expect(result).toBe("Paused: test");
  });
});
