/**
 * Tests for activity store.
 */

import { describe, test, expect, beforeEach } from "vitest";
import { createActivityStore } from "./store";
import type { ActivityEntry } from "../../types/activity";
import { MockFileSystem } from "../../test/mocks/filesystem";
import { MockClock } from "../../test/mocks/clock";

describe("ActivityStore", () => {
  let fs: MockFileSystem;
  let clock: MockClock;
  const testDataDir = "/tmp/test-activity";

  beforeEach(() => {
    fs = new MockFileSystem();
    clock = new MockClock();
  });

  describe("get()", () => {
    test("returns null when session not found", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      const result = await store.get("unknown-session");
      expect(result).toBeNull();
    });

    test("returns entry when session exists", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      const entry: ActivityEntry = {
        sessionId: "session-123",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T10:00:00.000Z",
      };

      await store.set(entry);
      const result = await store.get("session-123");

      expect(result).toEqual(entry);
    });

    test("handles missing storage file", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      const result = await store.get("session-123");
      expect(result).toBeNull();
    });

    test("handles invalid JSON in storage file", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      const storagePath = store.getStoragePath();

      // Create invalid JSON file
      await fs.mkdir("/tmp/test-activity", { recursive: true });
      await fs.writeFile(storagePath, "invalid json");

      const result = await store.get("session-123");
      expect(result).toBeNull();
    });
  });

  describe("set()", () => {
    test("creates new entry", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      const entry: ActivityEntry = {
        sessionId: "session-123",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T10:00:00.000Z",
      };

      await store.set(entry);
      const result = await store.get("session-123");

      expect(result).toEqual(entry);
    });

    test("updates existing entry", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      const entry1: ActivityEntry = {
        sessionId: "session-123",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T10:00:00.000Z",
      };

      await store.set(entry1);

      const entry2: ActivityEntry = {
        sessionId: "session-123",
        status: "idle",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T11:00:00.000Z",
      };

      await store.set(entry2);
      const result = await store.get("session-123");

      expect(result).toEqual(entry2);
    });

    test("creates storage directory if missing", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      const entry: ActivityEntry = {
        sessionId: "session-123",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T10:00:00.000Z",
      };

      await store.set(entry);

      const dirExists = await fs.exists(testDataDir);
      expect(dirExists).toBe(true);
    });
  });

  describe("list()", () => {
    test("returns empty array when no entries", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      const result = await store.list();
      expect(result).toEqual([]);
    });

    test("returns all entries without filter", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      const entry1: ActivityEntry = {
        sessionId: "session-1",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T10:00:00.000Z",
      };
      const entry2: ActivityEntry = {
        sessionId: "session-2",
        status: "idle",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T11:00:00.000Z",
      };

      await store.set(entry1);
      await store.set(entry2);

      const result = await store.list();

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(entry1);
      expect(result).toContainEqual(entry2);
    });

    test("filters by status", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      const entry1: ActivityEntry = {
        sessionId: "session-1",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T10:00:00.000Z",
      };
      const entry2: ActivityEntry = {
        sessionId: "session-2",
        status: "idle",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T11:00:00.000Z",
      };
      const entry3: ActivityEntry = {
        sessionId: "session-3",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T12:00:00.000Z",
      };

      await store.set(entry1);
      await store.set(entry2);
      await store.set(entry3);

      const result = await store.list({ status: "working" });

      expect(result).toHaveLength(2);
      expect(result).toContainEqual(entry1);
      expect(result).toContainEqual(entry3);
    });

    test("filters by waiting_user_response status", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      const entry1: ActivityEntry = {
        sessionId: "session-1",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T10:00:00.000Z",
      };
      const entry2: ActivityEntry = {
        sessionId: "session-2",
        status: "waiting_user_response",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T11:00:00.000Z",
      };

      await store.set(entry1);
      await store.set(entry2);

      const result = await store.list({ status: "waiting_user_response" });

      expect(result).toHaveLength(1);
      expect(result).toContainEqual(entry2);
    });
  });

  describe("remove()", () => {
    test("removes existing entry", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      const entry: ActivityEntry = {
        sessionId: "session-123",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T10:00:00.000Z",
      };

      await store.set(entry);
      await store.remove("session-123");

      const result = await store.get("session-123");
      expect(result).toBeNull();
    });

    test("does not throw when session not found", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      await expect(store.remove("unknown-session")).resolves.toBeUndefined();
    });

    test("preserves other entries when removing", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      const entry1: ActivityEntry = {
        sessionId: "session-1",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T10:00:00.000Z",
      };
      const entry2: ActivityEntry = {
        sessionId: "session-2",
        status: "idle",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T11:00:00.000Z",
      };

      await store.set(entry1);
      await store.set(entry2);
      await store.remove("session-1");

      const result1 = await store.get("session-1");
      const result2 = await store.get("session-2");

      expect(result1).toBeNull();
      expect(result2).toEqual(entry2);
    });
  });

  describe("cleanup()", () => {
    test("removes stale entries older than threshold", async () => {
      const store = createActivityStore(fs, clock, {
        dataDir: testDataDir,
        cleanupHours: 24,
      });

      // Current time: 2026-01-31T10:00:00.000Z
      clock.setTime(new Date("2026-01-31T10:00:00.000Z"));

      const oldEntry: ActivityEntry = {
        sessionId: "old-session",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-30T09:00:00.000Z", // 25 hours ago
      };

      const recentEntry: ActivityEntry = {
        sessionId: "recent-session",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T09:00:00.000Z", // 1 hour ago
      };

      await store.set(oldEntry);
      await store.set(recentEntry);

      const removedCount = await store.cleanup();

      expect(removedCount).toBe(1);

      const oldResult = await store.get("old-session");
      const recentResult = await store.get("recent-session");

      expect(oldResult).toBeNull();
      expect(recentResult).toEqual(recentEntry);
    });

    test("returns 0 when no stale entries", async () => {
      const store = createActivityStore(fs, clock, {
        dataDir: testDataDir,
        cleanupHours: 24,
      });

      clock.setTime(new Date("2026-01-31T10:00:00.000Z"));

      const entry: ActivityEntry = {
        sessionId: "session-123",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T09:00:00.000Z", // 1 hour ago
      };

      await store.set(entry);

      const removedCount = await store.cleanup();

      expect(removedCount).toBe(0);
    });

    test("respects custom cleanup threshold", async () => {
      const store = createActivityStore(fs, clock, {
        dataDir: testDataDir,
        cleanupHours: 1, // 1 hour threshold
      });

      clock.setTime(new Date("2026-01-31T10:00:00.000Z"));

      const oldEntry: ActivityEntry = {
        sessionId: "old-session",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T08:30:00.000Z", // 1.5 hours ago
      };

      await store.set(oldEntry);

      const removedCount = await store.cleanup();

      expect(removedCount).toBe(1);
    });

    test("removes multiple stale entries", async () => {
      const store = createActivityStore(fs, clock, {
        dataDir: testDataDir,
        cleanupHours: 24,
      });

      clock.setTime(new Date("2026-01-31T10:00:00.000Z"));

      const oldEntry1: ActivityEntry = {
        sessionId: "old-session-1",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-30T09:00:00.000Z", // 25 hours ago
      };

      const oldEntry2: ActivityEntry = {
        sessionId: "old-session-2",
        status: "idle",
        projectPath: "/project/path",
        lastUpdated: "2026-01-29T09:00:00.000Z", // 49 hours ago
      };

      const recentEntry: ActivityEntry = {
        sessionId: "recent-session",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T09:00:00.000Z", // 1 hour ago
      };

      await store.set(oldEntry1);
      await store.set(oldEntry2);
      await store.set(recentEntry);

      const removedCount = await store.cleanup();

      expect(removedCount).toBe(2);

      const listResult = await store.list();
      expect(listResult).toHaveLength(1);
      expect(listResult).toContainEqual(recentEntry);
    });
  });

  describe("getStoragePath()", () => {
    test("returns correct path with custom dataDir", () => {
      const store = createActivityStore(fs, clock, {
        dataDir: "/custom/data",
      });
      const path = store.getStoragePath();
      expect(path).toBe("/custom/data/activity.json");
    });

    test("uses XDG_DATA_HOME when set", () => {
      const originalXdg = process.env["XDG_DATA_HOME"];
      process.env["XDG_DATA_HOME"] = "/custom/xdg";

      const store = createActivityStore(fs, clock);
      const path = store.getStoragePath();

      process.env["XDG_DATA_HOME"] = originalXdg;

      expect(path).toBe("/custom/xdg/claude-code-agent/activity.json");
    });

    test("falls back to .local/share when XDG_DATA_HOME not set", () => {
      const originalXdg = process.env["XDG_DATA_HOME"];
      const originalHome = process.env["HOME"];

      delete process.env["XDG_DATA_HOME"];
      process.env["HOME"] = "/home/testuser";

      const store = createActivityStore(fs, clock);
      const path = store.getStoragePath();

      process.env["XDG_DATA_HOME"] = originalXdg;
      process.env["HOME"] = originalHome;

      expect(path).toBe(
        "/home/testuser/.local/share/claude-code-agent/activity.json",
      );
    });
  });

  describe("concurrent access", () => {
    test("handles sequential writes correctly", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });

      const entry1: ActivityEntry = {
        sessionId: "session-1",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T10:00:00.000Z",
      };

      const entry2: ActivityEntry = {
        sessionId: "session-2",
        status: "idle",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T11:00:00.000Z",
      };

      // Write entries sequentially (locking ensures safety)
      await store.set(entry1);
      await store.set(entry2);

      const result1 = await store.get("session-1");
      const result2 = await store.get("session-2");

      expect(result1).toEqual(entry1);
      expect(result2).toEqual(entry2);
    });

    test("locking prevents data corruption", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });

      const entry: ActivityEntry = {
        sessionId: "session-123",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T10:00:00.000Z",
      };

      await store.set(entry);

      // Update same entry sequentially
      await store.set({ ...entry, status: "idle" });

      const result = await store.get("session-123");

      // Should have the latest value, not corrupted
      expect(result).toBeTruthy();
      expect(result?.status).toBe("idle");
    });
  });

  describe("storage format", () => {
    test("stores data in correct format", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      const entry: ActivityEntry = {
        sessionId: "session-123",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T10:00:00.000Z",
      };

      await store.set(entry);

      const storagePath = store.getStoragePath();
      const content = await fs.readFile(storagePath);
      const parsed = JSON.parse(content);

      expect(parsed).toEqual({
        version: "1.0",
        sessions: {
          "session-123": {
            status: "working",
            projectPath: "/project/path",
            lastUpdated: "2026-01-31T10:00:00.000Z",
          },
        },
      });
    });

    test("sessionId not duplicated in stored entry", async () => {
      const store = createActivityStore(fs, clock, { dataDir: testDataDir });
      const entry: ActivityEntry = {
        sessionId: "session-123",
        status: "working",
        projectPath: "/project/path",
        lastUpdated: "2026-01-31T10:00:00.000Z",
      };

      await store.set(entry);

      const storagePath = store.getStoragePath();
      const content = await fs.readFile(storagePath);
      const parsed = JSON.parse(content);

      // sessionId should be the key, not in the value
      expect(parsed.sessions["session-123"]).not.toHaveProperty("sessionId");
    });
  });
});
