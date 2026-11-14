/**
 * Mock FileLockService for testing.
 *
 * Provides controllable locking behavior for unit tests.
 * Allows tests to simulate success, timeout, and error scenarios
 * without actually creating lock files on the filesystem.
 *
 * @module test/mocks/lock
 */
import type { FileLockService, LockOptions, LockResult, LockHandle } from "../../interfaces/lock";
/**
 * Behavior type for lock acquisition attempts.
 */
type LockBehavior = "success" | "timeout" | "error";
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
export declare class MockFileLockService implements FileLockService {
    private readonly locks;
    private readonly behaviors;
    private readonly contentionPaths;
    /**
     * Set the behavior for lock acquisition on a specific path.
     *
     * This controls what happens when acquire() is called for the given path.
     *
     * @param path - Resource path to configure
     * @param behavior - Behavior to simulate ("success" | "timeout" | "error")
     */
    setLockBehavior(path: string, behavior: LockBehavior): void;
    /**
     * Simulate lock contention on a specific path.
     *
     * Marks the path as locked, causing acquire() to fail with "locked" reason
     * until the simulated contention is cleared.
     *
     * @param path - Resource path to mark as locked
     */
    simulateContention(path: string): void;
    /**
     * Clear simulated contention for a specific path.
     *
     * @param path - Resource path to clear
     */
    clearContention(path: string): void;
    /**
     * Reset the mock to its initial state.
     *
     * Clears all locks, behaviors, and contention simulations.
     * Useful for cleaning up between test cases.
     */
    reset(): void;
    /**
     * Get all currently held locks.
     *
     * Useful for test assertions to verify lock state.
     *
     * @returns Map of resource paths to lock handles
     */
    getActiveLocks(): ReadonlyMap<string, LockHandle>;
    acquire(resourcePath: string, _options?: LockOptions): Promise<LockResult>;
    withLock<T>(resourcePath: string, fn: () => Promise<T>, options?: LockOptions): Promise<T>;
    isLocked(resourcePath: string): Promise<boolean>;
    private normalizePath;
}
export {};
//# sourceMappingURL=lock.d.ts.map