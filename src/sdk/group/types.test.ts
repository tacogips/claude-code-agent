/**
 * Tests for Session Group types and helper functions.
 */

import { describe, test, expect } from "vitest";
import type { SessionGroup, GroupSession, GroupConfig } from "./types";
import {
  isTerminalGroupStatus,
  canResumeGroup,
  isActiveGroup,
  DEFAULT_BUDGET_CONFIG,
  DEFAULT_CONCURRENCY_CONFIG,
  DEFAULT_SESSION_CONFIG,
  DEFAULT_GROUP_CONFIG,
} from "./types";

describe("Group Status Helpers", () => {
  test("isTerminalGroupStatus identifies terminal states", () => {
    expect(isTerminalGroupStatus("completed")).toBe(true);
    expect(isTerminalGroupStatus("failed")).toBe(true);
    expect(isTerminalGroupStatus("deleted")).toBe(true);
    expect(isTerminalGroupStatus("running")).toBe(false);
    expect(isTerminalGroupStatus("paused")).toBe(false);
    expect(isTerminalGroupStatus("created")).toBe(false);
  });

  test("canResumeGroup identifies pausable states", () => {
    expect(canResumeGroup("paused")).toBe(true);
    expect(canResumeGroup("running")).toBe(false);
    expect(canResumeGroup("completed")).toBe(false);
    expect(canResumeGroup("failed")).toBe(false);
  });

  test("isActiveGroup identifies running state", () => {
    expect(isActiveGroup("running")).toBe(true);
    expect(isActiveGroup("paused")).toBe(false);
    expect(isActiveGroup("completed")).toBe(false);
    expect(isActiveGroup("created")).toBe(false);
  });
});

describe("Default Configurations", () => {
  test("DEFAULT_BUDGET_CONFIG has expected values", () => {
    expect(DEFAULT_BUDGET_CONFIG.maxBudgetUsd).toBe(10.0);
    expect(DEFAULT_BUDGET_CONFIG.onBudgetExceeded).toBe("pause");
    expect(DEFAULT_BUDGET_CONFIG.warningThreshold).toBe(0.8);
  });

  test("DEFAULT_CONCURRENCY_CONFIG has expected values", () => {
    expect(DEFAULT_CONCURRENCY_CONFIG.maxConcurrent).toBe(3);
    expect(DEFAULT_CONCURRENCY_CONFIG.respectDependencies).toBe(true);
    expect(DEFAULT_CONCURRENCY_CONFIG.pauseOnError).toBe(true);
    expect(DEFAULT_CONCURRENCY_CONFIG.errorThreshold).toBe(2);
  });

  test("DEFAULT_SESSION_CONFIG has expected values", () => {
    expect(DEFAULT_SESSION_CONFIG.generateClaudeMd).toBe(true);
    expect(DEFAULT_SESSION_CONFIG.generateSettings).toBe(false);
  });

  test("DEFAULT_GROUP_CONFIG has expected values", () => {
    expect(DEFAULT_GROUP_CONFIG.model).toBe("sonnet");
    expect(DEFAULT_GROUP_CONFIG.maxBudgetUsd).toBe(10.0);
    expect(DEFAULT_GROUP_CONFIG.maxConcurrentSessions).toBe(3);
    expect(DEFAULT_GROUP_CONFIG.onBudgetExceeded).toBe("pause");
    expect(DEFAULT_GROUP_CONFIG.warningThreshold).toBe(0.8);
  });
});

describe("Type Definitions", () => {
  test("GroupSession can be created with required fields", () => {
    const session: GroupSession = {
      id: "001-uuid",
      projectPath: "/path/to/project",
      prompt: "Test prompt",
      status: "active",
      dependsOn: [],
      createdAt: new Date().toISOString(),
    };

    expect(session.id).toBe("001-uuid");
    expect(session.status).toBe("active");
    expect(session.dependsOn).toEqual([]);
  });

  test("SessionGroup can be created with required fields", () => {
    const group: SessionGroup = {
      id: "20260104-143022-test",
      name: "Test Group",
      slug: "test",
      status: "created",
      sessions: [],
      config: DEFAULT_GROUP_CONFIG,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(group.id).toBe("20260104-143022-test");
    expect(group.name).toBe("Test Group");
    expect(group.status).toBe("created");
    expect(group.sessions).toEqual([]);
  });

  test("GroupConfig supports all budget actions", () => {
    const stopConfig: GroupConfig = {
      ...DEFAULT_GROUP_CONFIG,
      onBudgetExceeded: "stop",
    };
    const warnConfig: GroupConfig = {
      ...DEFAULT_GROUP_CONFIG,
      onBudgetExceeded: "warn",
    };
    const pauseConfig: GroupConfig = {
      ...DEFAULT_GROUP_CONFIG,
      onBudgetExceeded: "pause",
    };

    expect(stopConfig.onBudgetExceeded).toBe("stop");
    expect(warnConfig.onBudgetExceeded).toBe("warn");
    expect(pauseConfig.onBudgetExceeded).toBe("pause");
  });
});
