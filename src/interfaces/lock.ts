/**
 * Lock interfaces for file-based exclusive control.
 *
 * This module provides type definitions for advisory file locking
 * to prevent race conditions in read-modify-write patterns.
 *
 * Lock acquisition uses retry mechanisms with exponential backoff
 * and timeout handling. Stale locks are automatically cleaned up.
 *
 * @module interfaces/lock
 */

/**
 * Lock acquisition options.
 *
 * Configure timeout, retry behavior, and lock type for
 * fine-grained control over locking behavior.
 */
export interface LockOptions {
  /**
   * Lock timeout in milliseconds.
   *
   * Maximum time to wait for lock acquisition before failing.
   *
   * @default 30000 (30 seconds)
   */
  readonly timeout?: number;

  /**
   * Retry interval in milliseconds.
   *
   * Initial delay between retry attempts.
   * Subsequent retries use exponential backoff.
   *
   * @default 100
   */
  readonly retryInterval?: number;

  /**
   * Maximum retry attempts.
   *
   * Total number of times to attempt lock acquisition
   * before failing with timeout error.
   *
   * @default 10
   */
  readonly maxRetries?: number;

  /**
   * Lock type: exclusive or shared.
   *
   * - exclusive: Only one writer can hold the lock
   * - shared: Multiple readers allowed, but no writers
   *
   * @default "exclusive"
   */
  readonly type?: "exclusive" | "shared";
}

/**
 * Lock handle returned after successful acquisition.
 *
 * Represents an active lock that must be released
 * when the critical section completes.
 *
 * Always release locks in finally blocks or use
 * the withLock convenience method to ensure cleanup.
 */
export interface LockHandle {
  /**
   * Release the lock.
   *
   * Removes the lock file and allows other processes
   * to acquire the lock. Safe to call multiple times.
   *
   * @returns Promise that resolves when lock is released
   */
  release(): Promise<void>;

  /**
   * Check if lock is still held.
   *
   * Returns false if lock has been released or if
   * the lock file has been removed externally.
   *
   * @returns true if lock is currently held
   */
  isHeld(): boolean;

  /**
   * Lock file path.
   *
   * Absolute path to the .lock file on disk.
   * Useful for debugging and logging.
   */
  readonly lockPath: string;
}

/**
 * Result of lock acquisition attempt.
 *
 * Discriminated union representing success or failure.
 * Check the success field to narrow the type.
 *
 * @example
 * ```typescript
 * const result = await lockService.acquire(path);
 * if (result.success) {
 *   try {
 *     // Critical section - result.handle is available
 *     await performOperation();
 *   } finally {
 *     await result.handle.release();
 *   }
 * } else {
 *   // Handle failure - result.reason and result.message available
 *   console.error(`Lock failed: ${result.reason} - ${result.message}`);
 * }
 * ```
 */
export type LockResult =
  | {
      /** Lock acquisition succeeded */
      success: true;
      /** Handle for releasing the lock */
      handle: LockHandle;
    }
  | {
      /** Lock acquisition failed */
      success: false;
      /** Reason for failure */
      reason: "timeout" | "locked" | "error";
      /** Human-readable error message */
      message: string;
    };

/**
 * File locking service interface.
 *
 * Provides advisory file locking using .lock files with
 * automatic retry, timeout, and stale lock cleanup.
 *
 * Implementations must ensure:
 * - Atomic lock file creation (O_CREAT | O_EXCL)
 * - PID tracking for stale lock detection
 * - Automatic cleanup of locks from dead processes
 * - Safe concurrent access from multiple processes
 *
 * @example
 * ```typescript
 * // Manual lock management
 * const result = await lockService.acquire('/path/to/resource.json');
 * if (result.success) {
 *   try {
 *     const data = await readAndModify();
 *     await writeData(data);
 *   } finally {
 *     await result.handle.release();
 *   }
 * }
 *
 * // Automatic lock management (recommended)
 * await lockService.withLock('/path/to/resource.json', async () => {
 *   const data = await readAndModify();
 *   await writeData(data);
 * });
 * ```
 */
export interface FileLockService {
  /**
   * Acquire an exclusive lock on a file or resource.
   *
   * Attempts to create a lock file atomically. If the lock
   * is already held, retries with exponential backoff until
   * timeout or maxRetries is reached.
   *
   * Stale locks (from dead processes) are automatically cleaned
   * up before retry attempts.
   *
   * @param resourcePath - Path to the resource to lock
   * @param options - Lock acquisition options
   * @returns Promise resolving to LockResult
   *
   * @example
   * ```typescript
   * const result = await lockService.acquire('/data/queue.json', {
   *   timeout: 5000,
   *   retryInterval: 50,
   *   maxRetries: 20
   * });
   * ```
   */
  acquire(resourcePath: string, options?: LockOptions): Promise<LockResult>;

  /**
   * Execute a function while holding a lock.
   *
   * Acquires lock, executes function, and releases lock automatically.
   * Lock is released even if function throws an error.
   *
   * Throws the original error if lock acquisition fails or if
   * the function throws. Use this method instead of manual acquire/release
   * to ensure proper cleanup.
   *
   * @param resourcePath - Path to the resource to lock
   * @param fn - Function to execute while holding lock
   * @param options - Lock acquisition options
   * @returns Promise resolving to function result
   * @throws Error if lock acquisition fails or function throws
   *
   * @example
   * ```typescript
   * const result = await lockService.withLock('/data/config.json', async () => {
   *   const config = await readConfig();
   *   config.value += 1;
   *   await writeConfig(config);
   *   return config;
   * });
   * ```
   */
  withLock<T>(
    resourcePath: string,
    fn: () => Promise<T>,
    options?: LockOptions,
  ): Promise<T>;

  /**
   * Check if a resource is currently locked.
   *
   * Returns true if a valid lock file exists for the resource.
   * Stale locks (from dead processes) are considered unlocked.
   *
   * This is a point-in-time check - the lock state may change
   * immediately after this call returns.
   *
   * @param resourcePath - Path to check
   * @returns Promise resolving to true if locked
   *
   * @example
   * ```typescript
   * if (await lockService.isLocked('/data/queue.json')) {
   *   console.log('Queue is currently locked by another process');
   * }
   * ```
   */
  isLocked(resourcePath: string): Promise<boolean>;
}
