/**
 * File-based locking service using advisory locks.
 *
 * This module implements advisory file locking using .lock files with
 * PID and timestamp tracking. Provides automatic retry with exponential
 * backoff and stale lock cleanup.
 *
 * @module services/file-lock
 */
import type { FileSystem } from "../interfaces/filesystem";
import type { Clock } from "../interfaces/clock";
import type { FileLockService, LockOptions, LockResult } from "../interfaces/lock";
/**
 * File-based locking service using advisory locks.
 *
 * Uses .lock files with PID and timestamp for lock management.
 * Implements retry with exponential backoff.
 */
export declare class FileLockServiceImpl implements FileLockService {
    private readonly fs;
    private readonly clock;
    constructor(fs: FileSystem, clock: Clock);
    /**
     * Acquire an exclusive lock on a file or resource.
     *
     * Attempts to create a lock file atomically. If the lock is already held,
     * retries with exponential backoff until timeout or maxRetries is reached.
     *
     * @param resourcePath - Path to the resource to lock
     * @param options - Lock acquisition options
     * @returns Promise resolving to LockResult
     */
    acquire(resourcePath: string, options?: LockOptions): Promise<LockResult>;
    /**
     * Execute a function while holding a lock.
     *
     * Acquires lock, executes function, and releases lock automatically.
     * Lock is released even if function throws an error.
     *
     * @param resourcePath - Path to the resource to lock
     * @param fn - Function to execute while holding lock
     * @param options - Lock acquisition options
     * @returns Promise resolving to function result
     * @throws Error if lock acquisition fails or function throws
     */
    withLock<T>(resourcePath: string, fn: () => Promise<T>, options?: LockOptions): Promise<T>;
    /**
     * Check if a resource is currently locked.
     *
     * Returns true if a valid lock file exists for the resource.
     * Stale locks (from dead processes) are considered unlocked.
     *
     * @param resourcePath - Path to check
     * @returns Promise resolving to true if locked
     */
    isLocked(resourcePath: string): Promise<boolean>;
    /**
     * Create a lock file atomically.
     *
     * Attempts to create the lock file with O_CREAT | O_EXCL semantics
     * by checking existence first, then writing. This is not truly atomic
     * but provides reasonable advisory locking for most use cases.
     *
     * @param lockPath - Path to the lock file
     * @returns Promise resolving to true if lock was created
     */
    private createLockFile;
    /**
     * Check if an error is non-retryable (should fail fast).
     *
     * Permission errors, missing parent directories, and read-only filesystems
     * should fail immediately without retry.
     *
     * @param error - The error to check
     * @returns true if error should not be retried
     */
    private isNonRetryableError;
    /**
     * Read lock information from a lock file.
     *
     * @param lockPath - Path to the lock file
     * @returns Promise resolving to LockInfo or null if invalid
     */
    private readLockInfo;
    /**
     * Check if a lock is stale.
     *
     * A lock is stale if:
     * 1. The process holding the lock is no longer alive, OR
     * 2. The lock is older than STALE_LOCK_THRESHOLD_MS
     *
     * @param lockInfo - Lock information to check
     * @returns true if lock is stale
     */
    private isLockStale;
    /**
     * Clean up a stale lock file.
     *
     * Removes the lock file to allow new lock acquisition.
     *
     * @param lockPath - Path to the stale lock file
     */
    private cleanStaleLock;
    /**
     * Create a lock handle for a successfully acquired lock.
     *
     * @param lockPath - Path to the lock file
     * @returns LockHandle for managing the lock
     */
    private createLockHandle;
}
//# sourceMappingURL=file-lock.d.ts.map