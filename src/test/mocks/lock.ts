/**
 * Mock FileLockService for testing.
 *
 * Provides controllable locking behavior for unit tests.
 * Allows tests to simulate success, timeout, and error scenarios
 * without actually creating lock files on the filesystem.
 *
 * @module test/mocks/lock
 */

import type {
  FileLockService,
  LockOptions,
  LockResult,
  LockHandle,
} from "../../interfaces/lock";

/**
 * Behavior type for lock acquisition attempts.
 */
type LockBehavior = "success" | "timeout" | "error";

/**
 * Mock lock handle implementation.
 */
class MockLockHandle implements LockHandle {
  private held: boolean = true;

  constructor(
    public readonly lockPath: string,
    private readonly onRelease: () => void,
  ) {}

  async release(): Promise<void> {
    if (this.held) {
      this.held = false;
      this.onRelease();
    }
  }

  isHeld(): boolean {
    return this.held;
  }
}

/**
 * Mock lock service for testing.
 *
 * Provides controllable locking behavior for unit tests.
 * Allows simulating various locking scenarios without filesystem operations.
 *
 * @example
 * ```typescript
 * const mockLock = new MockFileLockService();
 *
 * // Test successful lock acquisition
 * const result = await mockLock.acquire('/path/to/resource');
 * expect(result.success).toBe(true);
 *
 * // Simulate timeout
 * mockLock.setLockBehavior('/path/to/resource', 'timeout');
 * const result2 = await mockLock.acquire('/path/to/resource');
 * expect(result2.success).toBe(false);
 * expect(result2.reason).toBe('timeout');
 *
 * // Simulate contention
 * mockLock.simulateContention('/path/to/resource');
 * const result3 = await mockLock.acquire('/path/to/resource');
 * expect(result3.success).toBe(false);
 * expect(result3.reason).toBe('locked');
 * ```
 */
export class MockFileLockService implements FileLockService {
  private readonly locks = new Map<string, MockLockHandle>();
  private readonly behaviors = new Map<string, LockBehavior>();
  private readonly contentionPaths = new Set<string>();

  /**
   * Set the behavior for lock acquisition on a specific path.
   *
   * This controls what happens when acquire() is called for the given path.
   *
   * @param path - Resource path to configure
   * @param behavior - Behavior to simulate ("success" | "timeout" | "error")
   */
  setLockBehavior(path: string, behavior: LockBehavior): void {
    this.behaviors.set(this.normalizePath(path), behavior);
  }

  /**
   * Simulate lock contention on a specific path.
   *
   * Marks the path as locked, causing acquire() to fail with "locked" reason
   * until the simulated contention is cleared.
   *
   * @param path - Resource path to mark as locked
   */
  simulateContention(path: string): void {
    const normalized = this.normalizePath(path);
    this.contentionPaths.add(normalized);
  }

  /**
   * Clear simulated contention for a specific path.
   *
   * @param path - Resource path to clear
   */
  clearContention(path: string): void {
    const normalized = this.normalizePath(path);
    this.contentionPaths.delete(normalized);
  }

  /**
   * Reset the mock to its initial state.
   *
   * Clears all locks, behaviors, and contention simulations.
   * Useful for cleaning up between test cases.
   */
  reset(): void {
    this.locks.clear();
    this.behaviors.clear();
    this.contentionPaths.clear();
  }

  /**
   * Get all currently held locks.
   *
   * Useful for test assertions to verify lock state.
   *
   * @returns Map of resource paths to lock handles
   */
  getActiveLocks(): ReadonlyMap<string, LockHandle> {
    return new Map(this.locks);
  }

  // FileLockService interface implementation

  async acquire(
    resourcePath: string,
    _options?: LockOptions,
  ): Promise<LockResult> {
    const normalizedPath = this.normalizePath(resourcePath);

    // Check for simulated contention first
    if (this.contentionPaths.has(normalizedPath)) {
      return {
        success: false,
        reason: "locked",
        message: `Resource is locked: ${resourcePath}`,
      };
    }

    // Check if already locked
    if (this.locks.has(normalizedPath)) {
      return {
        success: false,
        reason: "locked",
        message: `Resource is already locked: ${resourcePath}`,
      };
    }

    // Check configured behavior
    const behavior = this.behaviors.get(normalizedPath) ?? "success";

    switch (behavior) {
      case "timeout":
        return {
          success: false,
          reason: "timeout",
          message: `Lock acquisition timed out for: ${resourcePath}`,
        };

      case "error":
        return {
          success: false,
          reason: "error",
          message: `Error acquiring lock for: ${resourcePath}`,
        };

      case "success": {
        // Create and register lock handle
        const handle = new MockLockHandle(resourcePath, () => {
          this.locks.delete(normalizedPath);
        });

        this.locks.set(normalizedPath, handle);

        return {
          success: true,
          handle,
        };
      }

      default: {
        // Exhaustiveness check
        const _exhaustive: never = behavior;
        throw new Error(`Unhandled behavior: ${_exhaustive}`);
      }
    }
  }

  async withLock<T>(
    resourcePath: string,
    fn: () => Promise<T>,
    options?: LockOptions,
  ): Promise<T> {
    const result = await this.acquire(resourcePath, options);

    if (!result.success) {
      throw new Error(
        `Failed to acquire lock: ${result.reason} - ${result.message}`,
      );
    }

    try {
      return await fn();
    } finally {
      await result.handle.release();
    }
  }

  async isLocked(resourcePath: string): Promise<boolean> {
    const normalizedPath = this.normalizePath(resourcePath);
    return (
      this.locks.has(normalizedPath) || this.contentionPaths.has(normalizedPath)
    );
  }

  // Helper methods

  private normalizePath(path: string): string {
    // Simple normalization: remove trailing slashes
    return path.replace(/\/+$/, "") || "/";
  }
}
