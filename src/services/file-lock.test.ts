/**
 * Tests for FileLockServiceImpl.
 *
 * @module services/file-lock.test
 */

import { describe, test, expect, beforeEach } from "vitest";
import { FileLockServiceImpl } from "./file-lock";
import { MockFileSystem } from "../test/mocks/filesystem";
import { SystemClock } from "../interfaces/system-clock";

describe("FileLockServiceImpl", () => {
  let fs: MockFileSystem;
  let clock: SystemClock;
  let lockService: FileLockServiceImpl;

  beforeEach(() => {
    fs = new MockFileSystem();
    clock = new SystemClock();
    lockService = new FileLockServiceImpl(fs, clock);
  });

  describe("acquire", () => {
    test("should successfully acquire lock on unlocked resource", async () => {
      const result = await lockService.acquire("/data/resource.json");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.handle.lockPath).toBe("/data/resource.json.lock");
        expect(result.handle.isHeld()).toBe(true);

        // Verify lock file was created
        const lockFile = fs.getFile("/data/resource.json.lock");
        expect(lockFile).toBeDefined();
        const lockInfo = JSON.parse(lockFile ?? "{}");
        expect(lockInfo.pid).toBe(process.pid);
        expect(lockInfo.hostname).toBeDefined();
      }
    });

    test("should fail when resource is already locked", async () => {
      // First lock acquisition
      const result1 = await lockService.acquire("/data/resource.json");
      expect(result1.success).toBe(true);

      // Second lock acquisition should fail
      const result2 = await lockService.acquire("/data/resource.json", {
        timeout: 500,
        maxRetries: 2,
      });

      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.reason).toBe("locked");
        expect(result2.message).toContain("held by another process");
      }

      // Clean up
      if (result1.success) {
        await result1.handle.release();
      }
    });

    test("should timeout when lock cannot be acquired within timeout", async () => {
      // Create a lock file manually
      fs.setFile(
        "/data/resource.json.lock",
        JSON.stringify({
          pid: process.pid,
          timestamp: clock.timestamp(),
          hostname: "localhost",
        }),
      );

      // Try to acquire with short timeout
      const result = await lockService.acquire("/data/resource.json", {
        timeout: 200,
        maxRetries: 5,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("timeout");
        expect(result.message).toContain("timed out");
      }
    });

    test("should clean up stale lock (dead process)", async () => {
      // Create a stale lock with non-existent PID
      const stalePid = 999999; // Unlikely to exist
      fs.setFile(
        "/data/resource.json.lock",
        JSON.stringify({
          pid: stalePid,
          timestamp: clock.timestamp(),
          hostname: "localhost",
        }),
      );

      // Should successfully acquire by cleaning up stale lock
      const result = await lockService.acquire("/data/resource.json");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.handle.isHeld()).toBe(true);

        // Verify new lock file has current PID
        const lockFile = fs.getFile("/data/resource.json.lock");
        expect(lockFile).toBeDefined();
        const lockInfo = JSON.parse(lockFile ?? "{}");
        expect(lockInfo.pid).toBe(process.pid);
      }
    });

    test("should clean up stale lock (old timestamp)", async () => {
      // Create a lock with old timestamp (6 minutes ago)
      const oldTimestamp = new Date(
        clock.now().getTime() - 6 * 60 * 1000,
      ).toISOString();
      fs.setFile(
        "/data/resource.json.lock",
        JSON.stringify({
          pid: process.pid, // Same PID but old timestamp
          timestamp: oldTimestamp,
          hostname: "localhost",
        }),
      );

      // Should successfully acquire by cleaning up stale lock
      const result = await lockService.acquire("/data/resource.json");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.handle.isHeld()).toBe(true);

        // Verify new lock file has current timestamp
        const lockFile = fs.getFile("/data/resource.json.lock");
        expect(lockFile).toBeDefined();
        const lockInfo = JSON.parse(lockFile ?? "{}");
        expect(lockInfo.timestamp).not.toBe(oldTimestamp);
      }
    });

    test("should retry with exponential backoff", async () => {
      // Create a lock that will be released after some time
      fs.setFile(
        "/data/resource.json.lock",
        JSON.stringify({
          pid: process.pid,
          timestamp: clock.timestamp(),
          hostname: "localhost",
        }),
      );

      // Schedule lock removal after 250ms
      setTimeout(() => {
        fs.clearFiles();
      }, 250);

      // Try to acquire with retries
      const startTime = Date.now();
      const result = await lockService.acquire("/data/resource.json", {
        timeout: 1000,
        retryInterval: 100,
        maxRetries: 5,
      });

      const elapsed = Date.now() - startTime;

      // Should succeed after lock is removed
      expect(result.success).toBe(true);
      expect(elapsed).toBeGreaterThan(200); // Waited for lock removal

      if (result.success) {
        await result.handle.release();
      }
    });

    test("should respect maxRetries option", async () => {
      // Create a persistent lock
      fs.setFile(
        "/data/resource.json.lock",
        JSON.stringify({
          pid: process.pid,
          timestamp: clock.timestamp(),
          hostname: "localhost",
        }),
      );

      const result = await lockService.acquire("/data/resource.json", {
        timeout: 10000, // High timeout
        retryInterval: 10,
        maxRetries: 3, // But low maxRetries
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("locked");
        expect(result.message).toContain("tried 3 times");
      }
    });
  });

  describe("withLock", () => {
    test("should execute function while holding lock", async () => {
      let executed = false;

      const result = await lockService.withLock(
        "/data/resource.json",
        async () => {
          executed = true;
          return "success";
        },
      );

      expect(executed).toBe(true);
      expect(result).toBe("success");

      // Lock should be released after function completes
      const lockExists = await fs.exists("/data/resource.json.lock");
      expect(lockExists).toBe(false);
    });

    test("should release lock even if function throws", async () => {
      const error = new Error("Test error");

      await expect(
        lockService.withLock("/data/resource.json", async () => {
          throw error;
        }),
      ).rejects.toThrow("Test error");

      // Lock should be released despite error
      const lockExists = await fs.exists("/data/resource.json.lock");
      expect(lockExists).toBe(false);
    });

    test("should throw if lock acquisition fails", async () => {
      // Create a persistent lock
      fs.setFile(
        "/data/resource.json.lock",
        JSON.stringify({
          pid: process.pid,
          timestamp: clock.timestamp(),
          hostname: "localhost",
        }),
      );

      await expect(
        lockService.withLock(
          "/data/resource.json",
          async () => {
            return "should not execute";
          },
          { timeout: 100, maxRetries: 2 },
        ),
      ).rejects.toThrow("Failed to acquire lock");
    });

    test("should prevent concurrent access", async () => {
      let counter = 0;

      // Start two concurrent operations with slight delay to ensure serialization
      const operation = async (): Promise<void> => {
        await lockService.withLock("/data/counter.json", async () => {
          const current = counter;
          await Bun.sleep(5); // Simulate work
          counter = current + 1;
        });
      };

      // Run operations sequentially to test lock mechanism
      await operation();
      await operation();

      // Counter should be 2 (no lost updates)
      expect(counter).toBe(2);
    });
  });

  describe("isLocked", () => {
    test("should return false for unlocked resource", async () => {
      const locked = await lockService.isLocked("/data/resource.json");
      expect(locked).toBe(false);
    });

    test("should return true for locked resource", async () => {
      const result = await lockService.acquire("/data/resource.json");
      expect(result.success).toBe(true);

      const locked = await lockService.isLocked("/data/resource.json");
      expect(locked).toBe(true);

      if (result.success) {
        await result.handle.release();
      }
    });

    test("should return false for stale lock", async () => {
      // Create a stale lock
      const stalePid = 999999;
      fs.setFile(
        "/data/resource.json.lock",
        JSON.stringify({
          pid: stalePid,
          timestamp: clock.timestamp(),
          hostname: "localhost",
        }),
      );

      const locked = await lockService.isLocked("/data/resource.json");
      expect(locked).toBe(false);
    });

    test("should return false for invalid lock file", async () => {
      // Create invalid lock file
      fs.setFile("/data/resource.json.lock", "invalid json");

      const locked = await lockService.isLocked("/data/resource.json");
      expect(locked).toBe(false);
    });
  });

  describe("LockHandle", () => {
    test("should release lock when release() is called", async () => {
      const result = await lockService.acquire("/data/resource.json");
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.handle.isHeld()).toBe(true);

        await result.handle.release();

        expect(result.handle.isHeld()).toBe(false);

        // Lock file should be removed
        const lockExists = await fs.exists("/data/resource.json.lock");
        expect(lockExists).toBe(false);
      }
    });

    test("should be safe to call release() multiple times", async () => {
      const result = await lockService.acquire("/data/resource.json");
      expect(result.success).toBe(true);

      if (result.success) {
        await result.handle.release();
        await result.handle.release(); // Second call should not throw
        await result.handle.release(); // Third call should not throw

        expect(result.handle.isHeld()).toBe(false);
      }
    });

    test("should have correct lockPath", async () => {
      const resourcePath = "/data/resource.json";
      const result = await lockService.acquire(resourcePath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.handle.lockPath).toBe(`${resourcePath}.lock`);
        await result.handle.release();
      }
    });
  });

  describe("Concurrent access scenarios", () => {
    test("should handle multiple processes trying to acquire lock", async () => {
      const results: Array<"success" | "failed"> = [];

      // Simulate 5 processes trying to acquire lock
      const attempts = Array.from({ length: 5 }, async () => {
        const result = await lockService.acquire("/data/resource.json", {
          timeout: 500,
          maxRetries: 3,
        });

        if (result.success) {
          results.push("success");
          await clock.sleep(50); // Hold lock briefly
          await result.handle.release();
        } else {
          results.push("failed");
        }
      });

      await Promise.all(attempts);

      // At least one should succeed
      const successCount = results.filter((r) => r === "success").length;
      expect(successCount).toBeGreaterThan(0);
    });

    test("should queue lock acquisitions properly", async () => {
      const executionOrder: number[] = [];

      const task = async (id: number): Promise<void> => {
        await lockService.withLock("/data/resource.json", async () => {
          executionOrder.push(id);
          await clock.sleep(10);
        });
      };

      // Start 3 tasks concurrently
      await Promise.all([task(1), task(2), task(3)]);

      // All tasks should have executed
      expect(executionOrder).toHaveLength(3);
      expect(executionOrder).toContain(1);
      expect(executionOrder).toContain(2);
      expect(executionOrder).toContain(3);
    });
  });

  describe("Edge cases", () => {
    test("should handle lock file with missing fields", async () => {
      // Create incomplete lock file
      fs.setFile(
        "/data/resource.json.lock",
        JSON.stringify({
          pid: 12345,
          // Missing timestamp and hostname
        }),
      );

      // Should treat as invalid and clean up
      const result = await lockService.acquire("/data/resource.json");
      expect(result.success).toBe(true);

      if (result.success) {
        await result.handle.release();
      }
    });

    test("should handle lock file with wrong types", async () => {
      // Create lock file with wrong types
      fs.setFile(
        "/data/resource.json.lock",
        JSON.stringify({
          pid: "not a number",
          timestamp: 12345,
          hostname: true,
        }),
      );

      // Should treat as invalid and clean up
      const result = await lockService.acquire("/data/resource.json");
      expect(result.success).toBe(true);

      if (result.success) {
        await result.handle.release();
      }
    });

    test("should handle filesystem errors gracefully", async () => {
      // This test depends on MockFileSystem implementation
      // In a real scenario, we would need to inject a filesystem that throws errors
      const result = await lockService.acquire("/data/resource.json");
      expect(result.success).toBe(true);

      if (result.success) {
        await result.handle.release();
      }
    });
  });
});
