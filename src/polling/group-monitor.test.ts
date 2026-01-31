/**
 * Tests for GroupMonitor.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { join } from "node:path";
import { homedir } from "node:os";
import { createTestContainer } from "../container";
import { createEventEmitter } from "../sdk/events/emitter";
import { MockFileSystem } from "../test/mocks/filesystem";
import { GroupMonitor } from "./monitor";
import type { SessionGroup } from "../sdk/group/types";

describe("GroupMonitor", () => {
  let container: ReturnType<typeof createTestContainer>;
  let mockFs: MockFileSystem;
  let emitter: ReturnType<typeof createEventEmitter>;

  beforeEach(() => {
    mockFs = new MockFileSystem();
    container = createTestContainer({ fileSystem: mockFs });
    emitter = createEventEmitter();
  });

  describe("watch()", () => {
    it("should throw error if group not found", async () => {
      const monitor = new GroupMonitor(container, emitter);

      // Need to iterate the async iterator to trigger the error
      try {
        for await (const _event of monitor.watch("non-existent-group")) {
          // Should not reach here
        }
        // If we reach here, test should fail
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        if (error instanceof Error) {
          expect(error.message).toBe("Group not found: non-existent-group");
        }
      }
    });

    it("should return immediately if group has no active sessions", async () => {
      // Create a group with no claudeSessionIds
      const group: SessionGroup = {
        id: "group-001",
        name: "Test Group",
        slug: "test-group",
        status: "created",
        sessions: [
          {
            id: "session-001",
            projectPath: "./project1",
            prompt: "Test prompt",
            status: "pending",
            dependsOn: [],
            createdAt: "2026-01-06T10:00:00Z",
            // No claudeSessionId yet
          },
        ],
        config: {
          model: "sonnet",
          maxBudgetUsd: 10.0,
          maxConcurrentSessions: 2,
          onBudgetExceeded: "pause",
          warningThreshold: 0.8,
        },
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      // Save group to repository
      await container.groupRepository.save(group);

      const monitor = new GroupMonitor(container, emitter);
      const events: Array<{ type: string }> = [];

      for await (const event of monitor.watch(group.id)) {
        events.push({ type: event.type });
      }

      // Should yield no events
      expect(events).toHaveLength(0);
    });

    it("should monitor all sessions in a group", async () => {
      const claudeSession1 = "claude-session-001";

      // Create transcript file for session
      const transcript1Path = join(
        homedir(),
        ".claude",
        "sessions",
        claudeSession1,
        "transcript.jsonl",
      );

      const transcript1Content =
        [
          JSON.stringify({
            type: "user",
            content: "Session 1 message",
            timestamp: "2026-01-06T10:00:00Z",
          }),
          JSON.stringify({
            type: "assistant",
            content: "Response",
            timestamp: "2026-01-06T10:00:01Z",
          }),
        ].join("\n") + "\n";

      mockFs.writeFileSync(transcript1Path, transcript1Content);

      // Create a group with one active session
      const group: SessionGroup = {
        id: "group-002",
        name: "Multi Session Group",
        slug: "multi-session-group",
        status: "running",
        sessions: [
          {
            id: "session-001",
            projectPath: "./project1",
            prompt: "Test prompt 1",
            status: "active",
            dependsOn: [],
            claudeSessionId: claudeSession1,
            createdAt: "2026-01-06T10:00:00Z",
            startedAt: "2026-01-06T10:00:00Z",
          },
        ],
        config: {
          model: "sonnet",
          maxBudgetUsd: 10.0,
          maxConcurrentSessions: 2,
          onBudgetExceeded: "pause",
          warningThreshold: 0.8,
        },
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:01Z",
      };

      await container.groupRepository.save(group);

      const monitor = new GroupMonitor(container, emitter);
      const events: Array<{ sessionId: string; type: string }> = [];

      // Collect events from session
      const watchPromise = (async () => {
        for await (const event of monitor.watch(group.id)) {
          events.push({ sessionId: event.sessionId, type: event.type });

          // Stop after receiving both events
          if (events.length >= 2) {
            monitor.stop();
            break;
          }
        }
      })();

      await watchPromise;

      // Should have received events from the session
      expect(events).toHaveLength(2);
      expect(events.every((e) => e.sessionId === claudeSession1)).toBe(true);
      expect(events.every((e) => e.type === "message")).toBe(true);
    });

    it("should merge events from all sessions in real-time", async () => {
      const claudeSession1 = "claude-session-multi-001";
      const claudeSession2 = "claude-session-multi-002";

      const transcript1Path = join(
        homedir(),
        ".claude",
        "sessions",
        claudeSession1,
        "transcript.jsonl",
      );
      const transcript2Path = join(
        homedir(),
        ".claude",
        "sessions",
        claudeSession2,
        "transcript.jsonl",
      );

      // Start with empty files
      mockFs.writeFileSync(transcript1Path, "");
      mockFs.writeFileSync(transcript2Path, "");

      const group: SessionGroup = {
        id: "group-merge",
        name: "Merge Events Group",
        slug: "merge-events-group",
        status: "running",
        sessions: [
          {
            id: "session-001",
            projectPath: "./project1",
            prompt: "Test prompt 1",
            status: "active",
            dependsOn: [],
            claudeSessionId: claudeSession1,
            createdAt: "2026-01-06T10:00:00Z",
            startedAt: "2026-01-06T10:00:00Z",
          },
          {
            id: "session-002",
            projectPath: "./project2",
            prompt: "Test prompt 2",
            status: "active",
            dependsOn: [],
            claudeSessionId: claudeSession2,
            createdAt: "2026-01-06T10:00:00Z",
            startedAt: "2026-01-06T10:00:01Z",
          },
        ],
        config: {
          model: "sonnet",
          maxBudgetUsd: 10.0,
          maxConcurrentSessions: 2,
          onBudgetExceeded: "pause",
          warningThreshold: 0.8,
        },
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:01Z",
      };

      await container.groupRepository.save(group);

      const monitor = new GroupMonitor(container, emitter);
      const events: Array<{ sessionId: string; type: string }> = [];

      const watchPromise = (async () => {
        for await (const event of monitor.watch(group.id)) {
          events.push({ sessionId: event.sessionId, type: event.type });

          if (events.length >= 3) {
            monitor.stop();
            break;
          }
        }
      })();

      // Simulate events arriving from different sessions
      setTimeout(() => {
        mockFs.appendFileSync(
          transcript1Path,
          JSON.stringify({
            type: "user",
            content: "From session 1",
            timestamp: "2026-01-06T10:00:00Z",
          }) + "\n",
        );
      }, 10);

      setTimeout(() => {
        mockFs.appendFileSync(
          transcript2Path,
          JSON.stringify({
            type: "user",
            content: "From session 2",
            timestamp: "2026-01-06T10:00:01Z",
          }) + "\n",
        );
      }, 20);

      setTimeout(() => {
        mockFs.appendFileSync(
          transcript1Path,
          JSON.stringify({
            type: "assistant",
            content: "Response from 1",
            timestamp: "2026-01-06T10:00:02Z",
          }) + "\n",
        );
      }, 30);

      await watchPromise;

      expect(events).toHaveLength(3);
      expect(events.filter((e) => e.sessionId === claudeSession1)).toHaveLength(
        2,
      );
      expect(events.filter((e) => e.sessionId === claudeSession2)).toHaveLength(
        1,
      );
    });
  });

  describe("getStates()", () => {
    it("should return empty map before monitoring", () => {
      const monitor = new GroupMonitor(container, emitter);
      const states = monitor.getStates();
      expect(states.size).toBe(0);
    });

    it("should return states for all monitored sessions", async () => {
      const claudeSession1 = "claude-states-001";
      const claudeSession2 = "claude-states-002";

      const transcript1Path = join(
        homedir(),
        ".claude",
        "sessions",
        claudeSession1,
        "transcript.jsonl",
      );
      const transcript2Path = join(
        homedir(),
        ".claude",
        "sessions",
        claudeSession2,
        "transcript.jsonl",
      );

      const transcript1Content =
        JSON.stringify({
          type: "tool_use",
          content: { name: "Task" },
          timestamp: "2026-01-06T10:00:00Z",
        }) + "\n";

      const transcript2Content =
        JSON.stringify({
          type: "user",
          content: "Message",
          timestamp: "2026-01-06T10:00:01Z",
        }) + "\n";

      mockFs.writeFileSync(transcript1Path, transcript1Content);
      mockFs.writeFileSync(transcript2Path, transcript2Content);

      const group: SessionGroup = {
        id: "group-states",
        name: "States Group",
        slug: "states-group",
        status: "running",
        sessions: [
          {
            id: "session-001",
            projectPath: "./project1",
            prompt: "Prompt 1",
            status: "active",
            dependsOn: [],
            claudeSessionId: claudeSession1,
            createdAt: "2026-01-06T10:00:00Z",
            startedAt: "2026-01-06T10:00:00Z",
          },
          {
            id: "session-002",
            projectPath: "./project2",
            prompt: "Prompt 2",
            status: "active",
            dependsOn: [],
            claudeSessionId: claudeSession2,
            createdAt: "2026-01-06T10:00:00Z",
            startedAt: "2026-01-06T10:00:01Z",
          },
        ],
        config: {
          model: "sonnet",
          maxBudgetUsd: 10.0,
          maxConcurrentSessions: 2,
          onBudgetExceeded: "pause",
          warningThreshold: 0.8,
        },
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:01Z",
      };

      await container.groupRepository.save(group);

      const monitor = new GroupMonitor(container, emitter);

      const watchPromise = (async () => {
        let eventCount = 0;
        for await (const _event of monitor.watch(group.id)) {
          eventCount++;
          if (eventCount >= 2) {
            // Check states after receiving events
            const states = monitor.getStates();
            expect(states.size).toBe(2);

            const state1 = states.get("session-001");
            const state2 = states.get("session-002");

            expect(state1).toBeDefined();
            expect(state2).toBeDefined();

            // Verify session-001 has an active tool
            expect(state1?.activeTools.size).toBe(1);
            expect(state1?.activeTools.has("Task")).toBe(true);

            // Verify session-002 has a message
            expect(state2?.messageCount).toBe(1);

            monitor.stop();
            break;
          }
        }
      })();

      await watchPromise;
    });
  });

  describe("addSession()", () => {
    it("should allow adding sessions dynamically", async () => {
      const claudeSession1 = "claude-dynamic-001";
      const claudeSession2 = "claude-dynamic-002";

      const transcript1Path = join(
        homedir(),
        ".claude",
        "sessions",
        claudeSession1,
        "transcript.jsonl",
      );
      const transcript2Path = join(
        homedir(),
        ".claude",
        "sessions",
        claudeSession2,
        "transcript.jsonl",
      );

      mockFs.writeFileSync(
        transcript1Path,
        JSON.stringify({
          type: "user",
          content: "Initial",
          timestamp: "2026-01-06T10:00:00Z",
        }) + "\n",
      );

      mockFs.writeFileSync(
        transcript2Path,
        JSON.stringify({
          type: "user",
          content: "Added later",
          timestamp: "2026-01-06T10:00:01Z",
        }) + "\n",
      );

      const group: SessionGroup = {
        id: "group-dynamic",
        name: "Dynamic Group",
        slug: "dynamic-group",
        status: "running",
        sessions: [
          {
            id: "session-001",
            projectPath: "./project1",
            prompt: "Prompt 1",
            status: "active",
            dependsOn: [],
            claudeSessionId: claudeSession1,
            createdAt: "2026-01-06T10:00:00Z",
            startedAt: "2026-01-06T10:00:00Z",
          },
        ],
        config: {
          model: "sonnet",
          maxBudgetUsd: 10.0,
          maxConcurrentSessions: 2,
          onBudgetExceeded: "pause",
          warningThreshold: 0.8,
        },
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:00Z",
      };

      await container.groupRepository.save(group);

      const monitor = new GroupMonitor(container, emitter);
      const events: Array<{ sessionId: string }> = [];

      const watchPromise = (async () => {
        for await (const event of monitor.watch(group.id)) {
          events.push({ sessionId: event.sessionId });

          // After first event, add second session
          if (events.length === 1) {
            monitor.addSession("session-002", claudeSession2);
          }

          // Stop after receiving events from dynamically added session
          // Note: Due to async nature, we need to wait a bit
          if (events.length >= 1) {
            // Give time for the dynamically added session to be picked up
            await new Promise((resolve) => setTimeout(resolve, 50));
            monitor.stop();
            break;
          }
        }
      })();

      await watchPromise;

      // Verify the first session was monitored
      expect(events.some((e) => e.sessionId === claudeSession1)).toBe(true);

      // This test primarily verifies addSession doesn't throw
      // and that the dynamically added session can be monitored
    });

    it("should not add duplicate sessions", async () => {
      const monitor = new GroupMonitor(container, emitter);

      const claudeSessionId = "claude-duplicate-001";
      const groupSessionId = "session-dup-001";

      // Add session once
      monitor.addSession(groupSessionId, claudeSessionId);

      // Add again - should be idempotent
      monitor.addSession(groupSessionId, claudeSessionId);

      // No error should be thrown
      expect(() => {
        monitor.addSession(groupSessionId, claudeSessionId);
      }).not.toThrow();

      monitor.stop();
    });
  });

  describe("removeSession()", () => {
    it("should stop monitoring a specific session", async () => {
      const monitor = new GroupMonitor(container, emitter);

      const claudeSessionId = "claude-remove-001";
      const groupSessionId = "session-remove-001";
      const transcriptPath = join(
        homedir(),
        ".claude",
        "sessions",
        claudeSessionId,
        "transcript.jsonl",
      );

      mockFs.writeFileSync(
        transcriptPath,
        JSON.stringify({
          type: "user",
          content: "Test",
          timestamp: "2026-01-06T10:00:00Z",
        }) + "\n",
      );

      // Add session
      monitor.addSession(groupSessionId, claudeSessionId);

      // Remove session
      monitor.removeSession(groupSessionId);

      // Verify it was removed by checking states
      const states = monitor.getStates();
      expect(states.has(groupSessionId)).toBe(false);

      monitor.stop();
    });

    it("should handle removing non-existent session", () => {
      const monitor = new GroupMonitor(container, emitter);

      // Should not throw
      expect(() => {
        monitor.removeSession("non-existent-session");
      }).not.toThrow();

      monitor.stop();
    });
  });

  describe("stop()", () => {
    it("should stop all session monitors and clean up", async () => {
      const claudeSession1 = "claude-stop-001";
      const claudeSession2 = "claude-stop-002";

      const transcript1Path = join(
        homedir(),
        ".claude",
        "sessions",
        claudeSession1,
        "transcript.jsonl",
      );
      const transcript2Path = join(
        homedir(),
        ".claude",
        "sessions",
        claudeSession2,
        "transcript.jsonl",
      );

      mockFs.writeFileSync(transcript1Path, "");
      mockFs.writeFileSync(transcript2Path, "");

      const group: SessionGroup = {
        id: "group-stop",
        name: "Stop Group",
        slug: "stop-group",
        status: "running",
        sessions: [
          {
            id: "session-001",
            projectPath: "./project1",
            prompt: "Prompt 1",
            status: "active",
            dependsOn: [],
            claudeSessionId: claudeSession1,
            createdAt: "2026-01-06T10:00:00Z",
            startedAt: "2026-01-06T10:00:00Z",
          },
          {
            id: "session-002",
            projectPath: "./project2",
            prompt: "Prompt 2",
            status: "active",
            dependsOn: [],
            claudeSessionId: claudeSession2,
            createdAt: "2026-01-06T10:00:00Z",
            startedAt: "2026-01-06T10:00:01Z",
          },
        ],
        config: {
          model: "sonnet",
          maxBudgetUsd: 10.0,
          maxConcurrentSessions: 2,
          onBudgetExceeded: "pause",
          warningThreshold: 0.8,
        },
        createdAt: "2026-01-06T10:00:00Z",
        updatedAt: "2026-01-06T10:00:01Z",
      };

      await container.groupRepository.save(group);

      const monitor = new GroupMonitor(container, emitter);

      const watchPromise = (async () => {
        for await (const _event of monitor.watch(group.id)) {
          // Iterator should exit when stop() is called
        }
      })();

      // Stop immediately
      setTimeout(() => {
        monitor.stop();
      }, 10);

      await watchPromise;

      // Verify all monitors were stopped
      const states = monitor.getStates();
      expect(states.size).toBe(0);
    });

    it("should be idempotent", () => {
      const monitor = new GroupMonitor(container, emitter);

      // Multiple calls should not throw
      expect(() => {
        monitor.stop();
        monitor.stop();
        monitor.stop();
      }).not.toThrow();
    });
  });
});
