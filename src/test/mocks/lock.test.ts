/**
 * Tests for MockFileLockService.
 *
 * @module test/mocks/lock.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import { MockFileLockService } from "./lock";

describe("MockFileLockService", () => {
  let lockService: MockFileLockService;

  beforeEach(() => {
    lockService = new MockFileLockService();
  });

  describe("acquire", () => {
    it("should successfully acquire lock by default", async () => {
      const result = await lockService.acquire("/test/resource");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.handle).toBeDefined();
        expect(result.handle.lockPath).toBe("/test/resource");
        expect(result.handle.isHeld()).toBe(true);
      }
    });

    it("should fail if resource is already locked", async () => {
      const result1 = await lockService.acquire("/test/resource");
      expect(result1.success).toBe(true);

      const result2 = await lockService.acquire("/test/resource");
      expect(result2.success).toBe(false);
      if (!result2.success) {
        expect(result2.reason).toBe("locked");
        expect(result2.message).toContain("already locked");
      }
    });

    it("should allow reacquiring lock after release", async () => {
      const result1 = await lockService.acquire("/test/resource");
      expect(result1.success).toBe(true);

      if (result1.success) {
        await result1.handle.release();
      }

      const result2 = await lockService.acquire("/test/resource");
      expect(result2.success).toBe(true);
    });

    it("should normalize paths when checking locks", async () => {
      const result1 = await lockService.acquire("/test/resource/");
      expect(result1.success).toBe(true);

      const result2 = await lockService.acquire("/test/resource");
      expect(result2.success).toBe(false);
    });
  });

  describe("setLockBehavior", () => {
    it("should simulate timeout behavior", async () => {
      lockService.setLockBehavior("/test/resource", "timeout");

      const result = await lockService.acquire("/test/resource");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("timeout");
        expect(result.message).toContain("timed out");
      }
    });

    it("should simulate error behavior", async () => {
      lockService.setLockBehavior("/test/resource", "error");

      const result = await lockService.acquire("/test/resource");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("error");
        expect(result.message).toContain("Error acquiring lock");
      }
    });

    it("should allow switching behavior between calls", async () => {
      lockService.setLockBehavior("/test/resource", "timeout");
      const result1 = await lockService.acquire("/test/resource");
      expect(result1.success).toBe(false);

      lockService.setLockBehavior("/test/resource", "success");
      const result2 = await lockService.acquire("/test/resource");
      expect(result2.success).toBe(true);
    });

    it("should apply different behaviors to different paths", async () => {
      lockService.setLockBehavior("/path/a", "timeout");
      lockService.setLockBehavior("/path/b", "error");

      const resultA = await lockService.acquire("/path/a");
      expect(resultA.success).toBe(false);
      if (!resultA.success) {
        expect(resultA.reason).toBe("timeout");
      }

      const resultB = await lockService.acquire("/path/b");
      expect(resultB.success).toBe(false);
      if (!resultB.success) {
        expect(resultB.reason).toBe("error");
      }

      const resultC = await lockService.acquire("/path/c");
      expect(resultC.success).toBe(true);
    });
  });

  describe("simulateContention", () => {
    it("should mark path as locked", async () => {
      lockService.simulateContention("/test/resource");

      const result = await lockService.acquire("/test/resource");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("locked");
      }
    });

    it("should allow clearing contention", async () => {
      lockService.simulateContention("/test/resource");
      lockService.clearContention("/test/resource");

      const result = await lockService.acquire("/test/resource");
      expect(result.success).toBe(true);
    });

    it("should take precedence over behavior settings", async () => {
      lockService.setLockBehavior("/test/resource", "success");
      lockService.simulateContention("/test/resource");

      const result = await lockService.acquire("/test/resource");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("locked");
      }
    });
  });

  describe("withLock", () => {
    it("should execute function with lock held", async () => {
      let executed = false;

      await lockService.withLock("/test/resource", async () => {
        executed = true;
        const isLocked = await lockService.isLocked("/test/resource");
        expect(isLocked).toBe(true);
      });

      expect(executed).toBe(true);
    });

    it("should release lock after function completes", async () => {
      await lockService.withLock("/test/resource", async () => {
        // Do nothing
      });

      const isLocked = await lockService.isLocked("/test/resource");
      expect(isLocked).toBe(false);
    });

    it("should release lock even if function throws", async () => {
      await expect(
        lockService.withLock("/test/resource", async () => {
          throw new Error("Test error");
        }),
      ).rejects.toThrow("Test error");

      const isLocked = await lockService.isLocked("/test/resource");
      expect(isLocked).toBe(false);
    });

    it("should return function result", async () => {
      const result = await lockService.withLock("/test/resource", async () => {
        return 42;
      });

      expect(result).toBe(42);
    });

    it("should throw if lock acquisition fails", async () => {
      lockService.setLockBehavior("/test/resource", "timeout");

      await expect(
        lockService.withLock("/test/resource", async () => {
          return 42;
        }),
      ).rejects.toThrow("Failed to acquire lock");
    });

    it("should prevent concurrent execution on same resource", async () => {
      const executionOrder: number[] = [];

      const promise1 = lockService.withLock("/test/resource", async () => {
        executionOrder.push(1);
        await new Promise((resolve) => setTimeout(resolve, 10));
        executionOrder.push(2);
      });

      // Wait a bit to ensure promise1 has acquired the lock
      await new Promise((resolve) => setTimeout(resolve, 5));

      const promise2 = lockService.withLock("/test/resource", async () => {
        executionOrder.push(3);
      });

      await expect(promise2).rejects.toThrow("Failed to acquire lock");
      await promise1;

      // promise2 failed, so only promise1's execution order is recorded
      expect(executionOrder).toEqual([1, 2]);
    });
  });

  describe("isLocked", () => {
    it("should return false for unlocked resource", async () => {
      const isLocked = await lockService.isLocked("/test/resource");
      expect(isLocked).toBe(false);
    });

    it("should return true when lock is held", async () => {
      const result = await lockService.acquire("/test/resource");
      expect(result.success).toBe(true);

      const isLocked = await lockService.isLocked("/test/resource");
      expect(isLocked).toBe(true);
    });

    it("should return false after lock is released", async () => {
      const result = await lockService.acquire("/test/resource");
      if (result.success) {
        await result.handle.release();
      }

      const isLocked = await lockService.isLocked("/test/resource");
      expect(isLocked).toBe(false);
    });

    it("should return true for simulated contention", async () => {
      lockService.simulateContention("/test/resource");

      const isLocked = await lockService.isLocked("/test/resource");
      expect(isLocked).toBe(true);
    });
  });

  describe("LockHandle", () => {
    it("should report held status correctly", async () => {
      const result = await lockService.acquire("/test/resource");
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.handle.isHeld()).toBe(true);
        await result.handle.release();
        expect(result.handle.isHeld()).toBe(false);
      }
    });

    it("should be idempotent on multiple releases", async () => {
      const result = await lockService.acquire("/test/resource");
      expect(result.success).toBe(true);

      if (result.success) {
        await result.handle.release();
        await result.handle.release();
        await result.handle.release();
        expect(result.handle.isHeld()).toBe(false);
      }
    });

    it("should include lock path in handle", async () => {
      const result = await lockService.acquire("/test/resource");
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.handle.lockPath).toBe("/test/resource");
      }
    });
  });

  describe("reset", () => {
    it("should clear all locks", async () => {
      await lockService.acquire("/path/a");
      await lockService.acquire("/path/b");

      lockService.reset();

      expect(await lockService.isLocked("/path/a")).toBe(false);
      expect(await lockService.isLocked("/path/b")).toBe(false);
    });

    it("should clear all behaviors", async () => {
      lockService.setLockBehavior("/test/resource", "timeout");
      lockService.reset();

      const result = await lockService.acquire("/test/resource");
      expect(result.success).toBe(true);
    });

    it("should clear all contention simulations", async () => {
      lockService.simulateContention("/test/resource");
      lockService.reset();

      const result = await lockService.acquire("/test/resource");
      expect(result.success).toBe(true);
    });
  });

  describe("getActiveLocks", () => {
    it("should return empty map when no locks are held", () => {
      const locks = lockService.getActiveLocks();
      expect(locks.size).toBe(0);
    });

    it("should return all active locks", async () => {
      const result1 = await lockService.acquire("/path/a");
      const result2 = await lockService.acquire("/path/b");

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      const locks = lockService.getActiveLocks();
      expect(locks.size).toBe(2);
      expect(locks.has("/path/a")).toBe(true);
      expect(locks.has("/path/b")).toBe(true);
    });

    it("should not include released locks", async () => {
      const result1 = await lockService.acquire("/path/a");
      const result2 = await lockService.acquire("/path/b");

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      if (result1.success) {
        await result1.handle.release();
      }

      const locks = lockService.getActiveLocks();
      expect(locks.size).toBe(1);
      expect(locks.has("/path/a")).toBe(false);
      expect(locks.has("/path/b")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle root path", async () => {
      const result = await lockService.acquire("/");
      expect(result.success).toBe(true);
    });

    it("should handle paths with multiple slashes", async () => {
      const result1 = await lockService.acquire("/test//resource");
      const result2 = await lockService.acquire("/test/resource");

      // Both should succeed because normalization treats them as different
      // (Simple normalization only removes trailing slashes)
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it("should handle empty resource path", async () => {
      const result = await lockService.acquire("");
      expect(result.success).toBe(true);
    });

    it("should handle very long paths", async () => {
      const longPath = "/a".repeat(1000);
      const result = await lockService.acquire(longPath);
      expect(result.success).toBe(true);
    });
  });
});
