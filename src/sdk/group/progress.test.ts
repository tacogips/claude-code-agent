/**
 * Tests for Session Group progress tracking.
 */

import { describe, test, expect, beforeEach } from "vitest";
import type { SessionGroup, GroupSession } from "./types";
import {
  ProgressAggregator,
  createSessionProgress,
  calculateBudgetUsage,
  isBudgetWarning,
  isBudgetExceeded,
} from "./progress";
import { DEFAULT_GROUP_CONFIG } from "./types";

describe("ProgressAggregator", () => {
  let aggregator: ProgressAggregator;
  let testGroup: SessionGroup;

  beforeEach(() => {
    const startTime = Date.now();
    aggregator = new ProgressAggregator(startTime);

    const session1: GroupSession = {
      id: "001-uuid",
      projectPath: "/path/to/project-a",
      prompt: "Test prompt 1",
      status: "completed",
      dependsOn: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date(startTime).toISOString(),
      cost: 1.5,
      tokens: { input: 1000, output: 500 },
    };

    const session2: GroupSession = {
      id: "002-uuid",
      projectPath: "/path/to/project-b",
      prompt: "Test prompt 2",
      status: "active",
      dependsOn: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date(startTime + 5000).toISOString(),
      cost: 0.5,
      tokens: { input: 500, output: 250 },
    };

    const session3: GroupSession = {
      id: "003-uuid",
      projectPath: "/path/to/project-c",
      prompt: "Test prompt 3",
      status: "paused",
      dependsOn: ["001-uuid"],
      createdAt: new Date().toISOString(),
    };

    testGroup = {
      id: "20260104-143022-test",
      name: "Test Group",
      slug: "test",
      status: "running",
      sessions: [session1, session2, session3],
      config: DEFAULT_GROUP_CONFIG,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      startedAt: new Date(startTime).toISOString(),
    };

    // Add progress for first two sessions
    aggregator.updateSession(createSessionProgress(session1));
    aggregator.updateSession(createSessionProgress(session2));
  });

  test("computeProgress counts sessions by status", () => {
    const progress = aggregator.computeProgress(testGroup);

    expect(progress.totalSessions).toBe(3);
    expect(progress.completed).toBe(1);
    expect(progress.running).toBe(1);
    expect(progress.pending).toBe(1);
    expect(progress.failed).toBe(0);
  });

  test("computeProgress aggregates cost correctly", () => {
    const progress = aggregator.computeProgress(testGroup);

    expect(progress.totalCost).toBe(2.0); // 1.5 + 0.5
  });

  test("computeProgress aggregates tokens correctly", () => {
    const progress = aggregator.computeProgress(testGroup);

    expect(progress.totalTokens.input).toBe(1500); // 1000 + 500
    expect(progress.totalTokens.output).toBe(750); // 500 + 250
  });

  test("computeProgress includes session details", () => {
    const progress = aggregator.computeProgress(testGroup);

    expect(progress.sessions).toHaveLength(2);
    const session1 = progress.sessions.find((s) => s.id === "001-uuid");
    expect(session1).toBeDefined();
    expect(session1?.status).toBe("completed");
    expect(session1?.cost).toBe(1.5);
  });

  test("updateSession adds new session", () => {
    const newSession = createSessionProgress({
      id: "004-uuid",
      projectPath: "/path/to/project-d",
      prompt: "Test prompt 4",
      status: "active",
      dependsOn: [],
      createdAt: new Date().toISOString(),
    });

    aggregator.updateSession(newSession);

    const allSessions = aggregator.getAllSessions();
    expect(allSessions).toHaveLength(3);
    const added = allSessions.find((s) => s.id === "004-uuid");
    expect(added).toBeDefined();
  });

  test("updateSession replaces existing session", () => {
    const updated = createSessionProgress({
      id: "001-uuid",
      projectPath: "/path/to/project-a",
      prompt: "Updated prompt",
      status: "completed",
      dependsOn: [],
      createdAt: new Date().toISOString(),
      cost: 2.5,
      tokens: { input: 2000, output: 1000 },
    });

    aggregator.updateSession(updated);

    const session = aggregator.getSessionProgress("001-uuid");
    expect(session?.cost).toBe(2.5);
  });

  test("removeSession deletes session from tracking", () => {
    aggregator.removeSession("001-uuid");

    const session = aggregator.getSessionProgress("001-uuid");
    expect(session).toBeUndefined();

    const allSessions = aggregator.getAllSessions();
    expect(allSessions).toHaveLength(1);
  });

  test("clear removes all sessions", () => {
    aggregator.clear();

    const allSessions = aggregator.getAllSessions();
    expect(allSessions).toHaveLength(0);
  });

  test("computeProgress calculates elapsed time", () => {
    const progress = aggregator.computeProgress(testGroup);

    // Elapsed time should be defined and non-negative
    expect(progress.elapsedTime).toBeDefined();
    expect(progress.elapsedTime).toBeGreaterThanOrEqual(0);
  });

  test("computeProgress handles cache tokens", () => {
    const sessionWithCache = createSessionProgress({
      id: "005-uuid",
      projectPath: "/path/to/project",
      prompt: "Test",
      status: "active",
      dependsOn: [],
      createdAt: new Date().toISOString(),
      tokens: {
        input: 1000,
        output: 500,
        cacheRead: 200,
        cacheWrite: 100,
      },
    });

    aggregator.updateSession(sessionWithCache);

    const progress = aggregator.computeProgress(testGroup);
    expect(progress.totalTokens.cacheRead).toBe(200);
    expect(progress.totalTokens.cacheWrite).toBe(100);
  });
});

describe("createSessionProgress", () => {
  test("creates progress from GroupSession", () => {
    const session: GroupSession = {
      id: "001-uuid",
      projectPath: "/path/to/project",
      prompt: "Test prompt",
      status: "active",
      dependsOn: [],
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      cost: 1.0,
      tokens: { input: 1000, output: 500 },
    };

    const progress = createSessionProgress(session);

    expect(progress.id).toBe("001-uuid");
    expect(progress.projectPath).toBe("/path/to/project");
    expect(progress.status).toBe("active");
    expect(progress.cost).toBe(1.0);
    expect(progress.tokens.input).toBe(1000);
    expect(progress.tokens.output).toBe(500);
  });

  test("handles session without cost/tokens", () => {
    const session: GroupSession = {
      id: "001-uuid",
      projectPath: "/path/to/project",
      prompt: "Test prompt",
      status: "paused",
      dependsOn: [],
      createdAt: new Date().toISOString(),
    };

    const progress = createSessionProgress(session);

    expect(progress.cost).toBe(0);
    expect(progress.tokens.input).toBe(0);
    expect(progress.tokens.output).toBe(0);
  });

  test("calculates duration when startedAt is present", () => {
    const startedAt = new Date(Date.now() - 10000).toISOString(); // 10 seconds ago
    const session: GroupSession = {
      id: "001-uuid",
      projectPath: "/path/to/project",
      prompt: "Test prompt",
      status: "active",
      dependsOn: [],
      createdAt: new Date().toISOString(),
      startedAt,
    };

    const progress = createSessionProgress(session);

    expect(progress.durationMs).toBeGreaterThan(9000);
    expect(progress.durationMs).toBeLessThan(11000);
  });
});

describe("Budget Helpers", () => {
  test("calculateBudgetUsage computes percentage", () => {
    expect(calculateBudgetUsage(5.0, 10.0)).toBe(50);
    expect(calculateBudgetUsage(8.0, 10.0)).toBe(80);
    expect(calculateBudgetUsage(10.0, 10.0)).toBe(100);
  });

  test("calculateBudgetUsage handles zero budget", () => {
    expect(calculateBudgetUsage(5.0, 0)).toBe(0);
  });

  test("isBudgetWarning detects warning threshold", () => {
    expect(isBudgetWarning(8.0, 10.0, 0.8)).toBe(true);
    expect(isBudgetWarning(7.9, 10.0, 0.8)).toBe(false);
    expect(isBudgetWarning(9.0, 10.0, 0.8)).toBe(true);
  });

  test("isBudgetExceeded detects budget limit", () => {
    expect(isBudgetExceeded(10.0, 10.0)).toBe(true);
    expect(isBudgetExceeded(10.5, 10.0)).toBe(true);
    expect(isBudgetExceeded(9.9, 10.0)).toBe(false);
  });
});
