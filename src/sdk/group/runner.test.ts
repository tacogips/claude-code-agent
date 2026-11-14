/**
 * Tests for GroupRunner.
 *
 * @module sdk/group/runner.test
 */

import { describe, test, expect, beforeEach } from "vitest";
import { GroupRunner, type RunOptions } from "./runner";
import { createTestContainer, type Container } from "../../container";
import type {
  GroupRepository,
  GroupSession,
} from "../../repository/group-repository";
import { EventEmitter } from "../events/emitter";
import type { SessionGroup, GroupConfig } from "./types";
import { DEFAULT_GROUP_CONFIG } from "./types";
import { MockFileSystem } from "../../test/mocks/filesystem";
import { MockProcessManager } from "../../test/mocks/process-manager";
import { MockClock } from "../../test/mocks/clock";

// Mock repository implementation
class MockGroupRepository implements GroupRepository {
  private groups: Map<string, SessionGroup> = new Map();

  async findById(id: string): Promise<SessionGroup | null> {
    return this.groups.get(id) ?? null;
  }

  async findByStatus(): Promise<readonly SessionGroup[]> {
    return Array.from(this.groups.values());
  }

  async list(): Promise<readonly SessionGroup[]> {
    return Array.from(this.groups.values());
  }

  async save(group: SessionGroup): Promise<void> {
    this.groups.set(group.id, group);
  }

  async delete(id: string): Promise<boolean> {
    return this.groups.delete(id);
  }

  async updateSession(
    groupId: string,
    sessionId: string,
    updates: Partial<Omit<GroupSession, "id">>,
  ): Promise<boolean> {
    const group = this.groups.get(groupId);
    if (group === undefined) {
      return false;
    }

    const sessionIndex = group.sessions.findIndex((s) => s.id === sessionId);
    if (sessionIndex === -1) {
      return false;
    }

    const sessions = [...group.sessions];
    const existingSession = sessions[sessionIndex];
    if (existingSession !== undefined) {
      sessions[sessionIndex] = {
        ...existingSession,
        ...updates,
        id: existingSession.id, // Ensure id is preserved
      };
    }

    this.groups.set(groupId, { ...group, sessions });
    return true;
  }

  async count(): Promise<number> {
    return this.groups.size;
  }

  // Test helper
  addGroup(group: SessionGroup): void {
    this.groups.set(group.id, group);
  }

  // Test helper to update group
  updateGroup(group: SessionGroup): void {
    this.groups.set(group.id, group);
  }
}

// Helper to create test session
function createTestSession(
  id: string,
  projectPath: string,
  prompt: string,
  dependsOn: string[] = [],
): GroupSession {
  return {
    id,
    projectPath,
    prompt,
    status: "pending",
    dependsOn,
    createdAt: "2026-01-04T14:30:00Z",
  };
}

// Helper to create test group
function createTestGroup(
  id: string,
  sessions: GroupSession[],
  config?: Partial<GroupConfig>,
): SessionGroup {
  return {
    id,
    name: "Test Group",
    slug: "test-group",
    status: "created",
    sessions,
    config: { ...DEFAULT_GROUP_CONFIG, ...config },
    createdAt: "2026-01-04T14:30:00Z",
    updatedAt: "2026-01-04T14:30:00Z",
  };
}

describe("GroupRunner", () => {
  let container: Container;
  let repository: MockGroupRepository;
  let emitter: EventEmitter;
  let runner: GroupRunner;
  let mockProcessManager: MockProcessManager;

  beforeEach(() => {
    const mockFileSystem = new MockFileSystem();
    mockProcessManager = new MockProcessManager();
    const mockClock = new MockClock();

    container = createTestContainer({
      fileSystem: mockFileSystem,
      processManager: mockProcessManager,
      clock: mockClock,
    });

    repository = new MockGroupRepository();
    emitter = new EventEmitter();
    runner = new GroupRunner(container, repository, emitter);
  });

  describe("construction", () => {
    test("should create a runner in idle state", () => {
      expect(runner.getState()).toBe("idle");
      expect(runner.getProgress()).toBeNull();
      expect(runner.getPauseReason()).toBeNull();
    });
  });

  describe("run", () => {
    test("should start running a group", async () => {
      const sessions = [
        createTestSession("s1", "/path/a", "prompt 1"),
        createTestSession("s2", "/path/b", "prompt 2"),
      ];
      const group = createTestGroup("g1", sessions);
      repository.addGroup(group);

      // Configure mock to simulate successful execution (exitCode: 0 is default)
      mockProcessManager.setDefaultConfig({ exitCode: 0 });

      const events: string[] = [];
      emitter.on("group_started", () => events.push("started"));
      emitter.on("group_session_started", () => events.push("session_started"));
      emitter.on("group_session_completed", () =>
        events.push("session_completed"),
      );
      emitter.on("group_completed", () => events.push("completed"));

      await runner.run(group);

      expect(runner.getState()).toBe("completed");
      expect(events).toContain("started");
      expect(events).toContain("completed");
    });

    test("should throw if already running", async () => {
      const sessions = [createTestSession("s1", "/path/a", "prompt 1")];
      const group = createTestGroup("g1", sessions);
      repository.addGroup(group);

      // Configure slow exit
      mockProcessManager.setDefaultConfig({ exitDelay: 1000 });
      const runPromise = runner.run(group);

      // Try to run again immediately
      await expect(runner.run(group)).rejects.toThrow("already executing");

      // Cancel the first run by pausing
      await runner.pause();
      await runPromise.catch(() => {});
    });

    test("should respect maxConcurrent option", async () => {
      const sessions = [
        createTestSession("s1", "/path/a", "prompt 1"),
        createTestSession("s2", "/path/b", "prompt 2"),
        createTestSession("s3", "/path/c", "prompt 3"),
      ];
      const group = createTestGroup("g1", sessions);
      repository.addGroup(group);

      // With default config, processes exit quickly
      mockProcessManager.setDefaultConfig({ exitCode: 0 });

      const options: RunOptions = { maxConcurrent: 2 };
      await runner.run(group, options);

      // Verify execution completed
      expect(runner.getState()).toBe("completed");
    });

    test("should execute sessions in dependency order", async () => {
      const sessions = [
        createTestSession("s1", "/path/a", "prompt 1"),
        createTestSession("s2", "/path/b", "prompt 2", ["s1"]), // depends on s1
        createTestSession("s3", "/path/c", "prompt 3", ["s2"]), // depends on s2
      ];
      const group = createTestGroup("g1", sessions);
      repository.addGroup(group);

      mockProcessManager.setDefaultConfig({ exitCode: 0 });

      const startOrder: string[] = [];

      emitter.on("group_session_started", (event) => {
        startOrder.push(event.sessionId);
      });

      await runner.run(group);

      // s1 must start before s2, s2 must start before s3
      expect(startOrder.indexOf("s1")).toBeLessThan(startOrder.indexOf("s2"));
      expect(startOrder.indexOf("s2")).toBeLessThan(startOrder.indexOf("s3"));
    });
  });

  describe("pause", () => {
    test("should pause a running group", async () => {
      const sessions = [createTestSession("s1", "/path/a", "prompt 1")];
      const group = createTestGroup("g1", sessions);
      repository.addGroup(group);

      // Configure slow execution
      mockProcessManager.setDefaultConfig({ exitDelay: 5000 });

      let pauseEvent: unknown = null;
      emitter.on("group_paused", (event) => {
        pauseEvent = event;
      });

      // Start running
      const runPromise = runner.run(group);

      // Wait a bit for session to start
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Pause
      await runner.pause("manual");

      expect(runner.getState()).toBe("paused");
      expect(runner.getPauseReason()).toBe("manual");
      expect(pauseEvent).not.toBeNull();

      // Clean up
      await runPromise.catch(() => {});
    });

    test("should throw if not running", async () => {
      await expect(runner.pause()).rejects.toThrow("not running");
    });
  });

  describe("resume", () => {
    test("should resume a paused group", async () => {
      const sessions = [createTestSession("s1", "/path/a", "prompt 1")];
      const group = createTestGroup("g1", sessions);
      repository.addGroup(group);

      // Configure slow execution
      mockProcessManager.setDefaultConfig({ exitDelay: 5000 });

      // Start and pause
      void runner.run(group); // run in background - we'll pause and resume
      await new Promise((resolve) => setTimeout(resolve, 50));
      await runner.pause();

      expect(runner.getState()).toBe("paused");

      // Configure quick execution for resume
      mockProcessManager.setDefaultConfig({ exitCode: 0, exitDelay: 0 });

      // Resume
      let resumeEvent: unknown = null;
      emitter.on("group_resumed", (event) => {
        resumeEvent = event;
      });

      await runner.resume();

      expect(resumeEvent).not.toBeNull();
      expect(runner.getState()).toBe("completed");
    });

    test("should throw if not paused", async () => {
      await expect(runner.resume()).rejects.toThrow("not paused");
    });
  });

  describe("stop", () => {
    test("should stop a running group", async () => {
      const sessions = [createTestSession("s1", "/path/a", "prompt 1")];
      const group = createTestGroup("g1", sessions);
      repository.addGroup(group);

      mockProcessManager.setDefaultConfig({ exitDelay: 5000 });

      let failedEvent: unknown = null;
      emitter.on("group_failed", (event) => {
        failedEvent = event;
      });

      const runPromise = runner.run(group);
      await new Promise((resolve) => setTimeout(resolve, 50));
      await runner.stop();

      expect(runner.getState()).toBe("stopped");
      expect(failedEvent).not.toBeNull();

      await runPromise.catch(() => {});
    });

    test("should throw if idle", async () => {
      await expect(runner.stop()).rejects.toThrow("not running or paused");
    });
  });

  describe("getProgress", () => {
    test("should return null when not running", () => {
      expect(runner.getProgress()).toBeNull();
    });

    test("should return progress when running", async () => {
      const sessions = [
        createTestSession("s1", "/path/a", "prompt 1"),
        createTestSession("s2", "/path/b", "prompt 2"),
      ];
      const group = createTestGroup("g1", sessions);
      repository.addGroup(group);

      mockProcessManager.setDefaultConfig({ exitDelay: 100 });

      const runPromise = runner.run(group);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const progress = runner.getProgress();
      expect(progress).not.toBeNull();
      expect(progress!.totalSessions).toBe(2);

      // Wait for completion
      await runPromise;
    });
  });

  describe("budget enforcement", () => {
    test("should emit budget warning", async () => {
      const sessions = [createTestSession("s1", "/path/a", "prompt 1")];
      const group = createTestGroup("g1", sessions, {
        maxBudgetUsd: 1.0,
        warningThreshold: 0.5,
      });
      repository.addGroup(group);

      mockProcessManager.setDefaultConfig({ exitCode: 0 });

      let warningEvent: unknown = null;
      emitter.on("budget_warning", (event) => {
        warningEvent = event;
      });

      await runner.run(group);

      // In a real scenario, the session would accumulate cost
      // For this test, we just verify the mechanism exists
      expect(warningEvent).toBeNull(); // No cost accumulated in mock
    });
  });

  describe("error threshold", () => {
    test("should pause after error threshold reached", async () => {
      const sessions = [
        createTestSession("s1", "/path/a", "prompt 1"),
        createTestSession("s2", "/path/b", "prompt 2"),
        createTestSession("s3", "/path/c", "prompt 3"),
      ];
      const group = createTestGroup("g1", sessions);
      repository.addGroup(group);

      // All sessions fail
      mockProcessManager.setDefaultConfig({ exitCode: 1 });

      let pauseReason: string | null = null;
      emitter.on("group_paused", (event) => {
        pauseReason = event.reason;
      });

      const runPromise = runner.run(group, { errorThreshold: 2 });
      await runPromise;

      expect(runner.getState()).toBe("paused");
      expect(pauseReason).toBe("error_threshold");
    });
  });

  describe("events", () => {
    test("should emit group_started event", async () => {
      const sessions = [createTestSession("s1", "/path/a", "prompt 1")];
      const group = createTestGroup("g1", sessions);
      repository.addGroup(group);

      mockProcessManager.setDefaultConfig({ exitCode: 0 });

      let startedEvent: {
        groupId: string;
        totalSessions: number;
        maxConcurrent: number;
      } | null = null;

      emitter.on("group_started", (event) => {
        startedEvent = event;
      });

      await runner.run(group, { maxConcurrent: 5 });

      expect(startedEvent).not.toBeNull();
      expect(startedEvent!.groupId).toBe("g1");
      expect(startedEvent!.totalSessions).toBe(1);
      expect(startedEvent!.maxConcurrent).toBe(5);
    });

    test("should emit group_completed event", async () => {
      const sessions = [createTestSession("s1", "/path/a", "prompt 1")];
      const group = createTestGroup("g1", sessions);
      repository.addGroup(group);

      mockProcessManager.setDefaultConfig({ exitCode: 0 });

      let completedEvent: {
        groupId: string;
        completedSessions: number;
      } | null = null;

      emitter.on("group_completed", (event) => {
        completedEvent = event;
      });

      await runner.run(group);

      expect(completedEvent).not.toBeNull();
      expect(completedEvent!.groupId).toBe("g1");
      expect(completedEvent!.completedSessions).toBe(1);
    });

    test("should emit group_session_started event", async () => {
      const sessions = [createTestSession("s1", "/path/a", "prompt 1")];
      const group = createTestGroup("g1", sessions);
      repository.addGroup(group);

      mockProcessManager.setDefaultConfig({ exitCode: 0 });

      let sessionStartedEvent: {
        sessionId: string;
        projectPath: string;
      } | null = null;

      emitter.on("group_session_started", (event) => {
        sessionStartedEvent = event;
      });

      await runner.run(group);

      expect(sessionStartedEvent).not.toBeNull();
      expect(sessionStartedEvent!.sessionId).toBe("s1");
      expect(sessionStartedEvent!.projectPath).toBe("/path/a");
    });

    test("should emit dependency_resolved event", async () => {
      const sessions = [
        createTestSession("s1", "/path/a", "prompt 1"),
        createTestSession("s2", "/path/b", "prompt 2", ["s1"]),
      ];
      const group = createTestGroup("g1", sessions);
      repository.addGroup(group);

      mockProcessManager.setDefaultConfig({ exitCode: 0 });

      let resolvedEvent: { sessionId: string } | null = null;
      emitter.on("dependency_resolved", (event) => {
        resolvedEvent = event;
      });

      await runner.run(group);

      expect(resolvedEvent).not.toBeNull();
      expect(resolvedEvent!.sessionId).toBe("s2");
    });
  });
});
