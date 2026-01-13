/**
 * Tests for SessionMonitor.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { join } from "node:path";
import { homedir } from "node:os";
import { createTestContainer } from "../container";
import { createEventEmitter } from "../sdk/events/emitter";
import { MockFileSystem } from "../test/mocks/filesystem";
import { SessionMonitor } from "./monitor";

describe("SessionMonitor", () => {
  let container: ReturnType<typeof createTestContainer>;
  let mockFs: MockFileSystem;
  let emitter: ReturnType<typeof createEventEmitter>;

  beforeEach(() => {
    mockFs = new MockFileSystem();
    container = createTestContainer({ fileSystem: mockFs });
    emitter = createEventEmitter();
  });

  describe("watch()", () => {
    it("should yield monitor events from transcript", async () => {
      const sessionId = "test-session-123";
      const transcriptPath = join(
        homedir(),
        ".claude",
        "sessions",
        sessionId,
        "transcript.jsonl",
      );

      // Setup mock transcript content
      const transcriptContent =
        [
          JSON.stringify({
            type: "user",
            content: "Hello",
            timestamp: "2026-01-06T10:00:00Z",
          }),
          JSON.stringify({
            type: "assistant",
            content: "Hi there",
            timestamp: "2026-01-06T10:00:01Z",
          }),
          JSON.stringify({
            type: "tool_use",
            content: { name: "Read" },
            timestamp: "2026-01-06T10:00:02Z",
          }),
        ].join("\n") + "\n";

      // Create the file
      mockFs.writeFileSync(transcriptPath, transcriptContent);

      // Create monitor
      const monitor = new SessionMonitor(container, emitter);

      // Collect events
      const events: Array<{ type: string }> = [];

      // Watch with includeExisting to get initial content
      const watchPromise = (async () => {
        for await (const event of monitor.watch(sessionId)) {
          events.push({ type: event.type });

          // Stop after collecting initial events
          if (events.length >= 3) {
            monitor.stop();
            break;
          }
        }
      })();

      await watchPromise;

      // Verify we got events
      expect(events).toHaveLength(3);
      expect(events[0]?.type).toBe("message"); // user message
      expect(events[1]?.type).toBe("message"); // assistant message
      expect(events[2]?.type).toBe("tool_start"); // tool_use -> tool_start
    });

    it("should update state as events are processed", async () => {
      const sessionId = "test-session-456";
      const transcriptPath = join(
        homedir(),
        ".claude",
        "sessions",
        sessionId,
        "transcript.jsonl",
      );

      // Setup mock transcript with tool events
      const transcriptContent =
        [
          JSON.stringify({
            type: "tool_use",
            content: { name: "Task" },
            timestamp: "2026-01-06T10:00:00Z",
          }),
          JSON.stringify({
            type: "user",
            content: "Test",
            timestamp: "2026-01-06T10:00:01Z",
          }),
        ].join("\n") + "\n";

      mockFs.writeFileSync(transcriptPath, transcriptContent);

      const monitor = new SessionMonitor(container, emitter);

      // Watch and check state
      const watchPromise = (async () => {
        for await (const event of monitor.watch(sessionId)) {
          if (event.type === "tool_start") {
            // Check state after tool start
            const state = monitor.getState();
            expect(state).toBeDefined();
            expect(state?.activeTools.size).toBe(1);
            expect(state?.activeTools.has("Task")).toBe(true);
          } else if (event.type === "message") {
            // Check message count
            const state = monitor.getState();
            expect(state?.messageCount).toBe(1);
            monitor.stop();
            break;
          }
        }
      })();

      await watchPromise;
    });

    it("should handle incremental file updates", async () => {
      const sessionId = "test-session-789";
      const transcriptPath = join(
        homedir(),
        ".claude",
        "sessions",
        sessionId,
        "transcript.jsonl",
      );

      // Start with empty file
      mockFs.writeFileSync(transcriptPath, "");

      const monitor = new SessionMonitor(container, emitter);
      const events: Array<{ type: string }> = [];

      // Start watching
      const watchPromise = (async () => {
        for await (const event of monitor.watch(sessionId)) {
          events.push({ type: event.type });

          if (events.length >= 2) {
            monitor.stop();
            break;
          }
        }
      })();

      // Simulate file updates
      setTimeout(() => {
        mockFs.appendFileSync(
          transcriptPath,
          JSON.stringify({
            type: "user",
            content: "First",
            timestamp: "2026-01-06T10:00:00Z",
          }) + "\n",
        );
      }, 10);

      setTimeout(() => {
        mockFs.appendFileSync(
          transcriptPath,
          JSON.stringify({
            type: "assistant",
            content: "Second",
            timestamp: "2026-01-06T10:00:01Z",
          }) + "\n",
        );
      }, 20);

      await watchPromise;

      expect(events).toHaveLength(2);
      expect(events[0]?.type).toBe("message");
      expect(events[1]?.type).toBe("message");
    });
  });

  describe("getState()", () => {
    it("should return undefined before watching", () => {
      const monitor = new SessionMonitor(container, emitter);
      const state = monitor.getState();
      expect(state).toBeUndefined();
    });

    it("should return current state during watching", async () => {
      const sessionId = "test-session-state";
      const transcriptPath = join(
        homedir(),
        ".claude",
        "sessions",
        sessionId,
        "transcript.jsonl",
      );

      const transcriptContent =
        JSON.stringify({
          type: "user",
          content: "Test message",
          timestamp: "2026-01-06T10:00:00Z",
        }) + "\n";

      mockFs.writeFileSync(transcriptPath, transcriptContent);

      const monitor = new SessionMonitor(container, emitter);

      const watchPromise = (async () => {
        for await (const event of monitor.watch(sessionId)) {
          if (event.type === "message") {
            const state = monitor.getState();
            expect(state).toBeDefined();
            expect(state?.sessionId).toBe(sessionId);
            expect(state?.messageCount).toBe(1);
            expect(state?.lastUpdated).toBe("2026-01-06T10:00:00Z");
            monitor.stop();
            break;
          }
        }
      })();

      await watchPromise;
    });
  });

  describe("stop()", () => {
    it("should stop watching and clean up resources", async () => {
      const sessionId = "test-session-stop";
      const transcriptPath = join(
        homedir(),
        ".claude",
        "sessions",
        sessionId,
        "transcript.jsonl",
      );

      mockFs.writeFileSync(transcriptPath, "");

      const monitor = new SessionMonitor(container, emitter);

      // Start watching
      const watchPromise = (async () => {
        for await (const _event of monitor.watch(sessionId)) {
          // Should exit when stop() is called
        }
      })();

      // Stop immediately
      setTimeout(() => {
        monitor.stop();
      }, 10);

      await watchPromise;

      // State should be cleared
      const state = monitor.getState();
      expect(state).toBeUndefined();
    });

    it("should be idempotent", () => {
      const monitor = new SessionMonitor(container, emitter);

      // Multiple calls should not throw
      expect(() => {
        monitor.stop();
        monitor.stop();
        monitor.stop();
      }).not.toThrow();
    });
  });

  describe("transcript path resolution", () => {
    it("should resolve correct transcript path", async () => {
      const sessionId = "abc-def-123";
      const expectedPath = join(
        homedir(),
        ".claude",
        "sessions",
        sessionId,
        "transcript.jsonl",
      );

      // Create file at expected path
      mockFs.writeFileSync(
        expectedPath,
        JSON.stringify({
          type: "user",
          content: "Test",
          timestamp: "2026-01-06T10:00:00Z",
        }) + "\n",
      );

      const monitor = new SessionMonitor(container, emitter);
      const events: Array<{ type: string }> = [];

      const watchPromise = (async () => {
        for await (const event of monitor.watch(sessionId)) {
          events.push({ type: event.type });
          monitor.stop();
          break;
        }
      })();

      await watchPromise;

      // Should have successfully read from the file
      expect(events).toHaveLength(1);
    });
  });

  describe("integration with components", () => {
    it("should integrate watcher, parser, event parser, and state manager", async () => {
      const sessionId = "integration-test";
      const transcriptPath = join(
        homedir(),
        ".claude",
        "sessions",
        sessionId,
        "transcript.jsonl",
      );

      // Complex transcript with various event types
      const transcriptContent =
        [
          // Tool start
          JSON.stringify({
            type: "tool_use",
            content: { name: "Read" },
            timestamp: "2026-01-06T10:00:00Z",
          }),
          // User message
          JSON.stringify({
            type: "user",
            content: "Read the file",
            timestamp: "2026-01-06T10:00:01Z",
          }),
          // Tool end
          JSON.stringify({
            type: "tool_result",
            content: { name: "Read" },
            timestamp: "2026-01-06T10:00:02Z",
          }),
          // Subagent start
          JSON.stringify({
            type: "task",
            content: {
              subagent_type: "ts-coding",
              task_id: "task-123",
              prompt: "Write code",
            },
            timestamp: "2026-01-06T10:00:03Z",
          }),
          // Subagent end
          JSON.stringify({
            type: "task",
            content: {
              task_id: "task-123",
              status: "completed",
            },
            timestamp: "2026-01-06T10:00:04Z",
          }),
        ].join("\n") + "\n";

      mockFs.writeFileSync(transcriptPath, transcriptContent);

      const monitor = new SessionMonitor(container, emitter);
      const events: Array<{ type: string }> = [];

      let finalState: ReturnType<typeof monitor.getState>;

      const watchPromise = (async () => {
        for await (const event of monitor.watch(sessionId)) {
          events.push({ type: event.type });

          if (events.length >= 5) {
            // Get state before stopping
            finalState = monitor.getState();
            monitor.stop();
            break;
          }
        }
      })();

      await watchPromise;

      // Verify all events were processed
      expect(events).toHaveLength(5);
      expect(events.map((e) => e.type)).toEqual([
        "tool_start",
        "message",
        "tool_end",
        "subagent_start",
        "subagent_end",
      ]);

      // Verify final state (captured before stop)
      expect(finalState).toBeDefined();
      expect(finalState?.messageCount).toBe(1); // One user message
      expect(finalState?.activeTools.size).toBe(0); // Tool completed
      expect(finalState?.subagents.size).toBe(1); // One subagent tracked
    });
  });
});
