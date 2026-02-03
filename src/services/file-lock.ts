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
import type {
  FileLockService,
  LockOptions,
  LockResult,
  LockHandle,
} from "../interfaces/lock";
import * as os from "node:os";

/**
 * Lock file content structure.
 *
 * Stored as JSON in the .lock file for debugging and stale lock detection.
 */
interface LockInfo {
  /** Process ID of the lock holder */
  pid: number;
  /** ISO timestamp when lock was acquired */
  timestamp: string;
  /** Hostname of the machine holding the lock */
  hostname: string;
}

/**
 * Default lock acquisition options.
 */
const DEFAULT_OPTIONS: Required<LockOptions> = {
  timeout: 30000, // 30 seconds
  retryInterval: 100, // 100ms
  maxRetries: 10,
  type: "exclusive",
};

/**
 * Stale lock threshold in milliseconds.
 *
 * Locks older than 5 minutes are considered stale and cleaned up.
 */
const STALE_LOCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * File-based locking service using advisory locks.
 *
 * Uses .lock files with PID and timestamp for lock management.
 * Implements retry with exponential backoff.
 */
export class FileLockServiceImpl implements FileLockService {
  constructor(
    private readonly fs: FileSystem,
    private readonly clock: Clock,
  ) {}

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
  async acquire(
    resourcePath: string,
    options?: LockOptions,
  ): Promise<LockResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const lockPath = `${resourcePath}.lock`;
    const startTime = this.clock.now().getTime();
    let attempt = 0;

    while (attempt < opts.maxRetries) {
      // Check timeout
      const elapsed = this.clock.now().getTime() - startTime;
      if (elapsed >= opts.timeout) {
        return {
          success: false,
          reason: "timeout",
          message: `Lock acquisition timed out after ${elapsed}ms (${attempt} attempts)`,
        };
      }

      // Try to create lock file
      const created = await this.createLockFile(lockPath);
      if (created) {
        // Successfully acquired lock
        return {
          success: true,
          handle: this.createLockHandle(lockPath),
        };
      }

      // Lock file already exists, check if it's stale or invalid
      const lockInfo = await this.readLockInfo(lockPath);
      if (lockInfo === null) {
        // Invalid lock file, clean up and retry
        await this.cleanStaleLock(lockPath);
        continue;
      }

      if (this.isLockStale(lockInfo)) {
        // Stale lock, clean up and retry
        await this.cleanStaleLock(lockPath);
        continue;
      }

      // Lock is held by another process, wait before retry
      attempt++;
      if (attempt < opts.maxRetries) {
        // Exponential backoff: 100ms, 200ms, 400ms, 800ms, ...
        const delay = Math.min(
          opts.retryInterval * Math.pow(2, attempt - 1),
          opts.timeout - elapsed,
        );
        if (delay > 0) {
          await this.clock.sleep(delay);
        }
      }
    }

    return {
      success: false,
      reason: "locked",
      message: `Lock is held by another process (tried ${attempt} times)`,
    };
  }

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

  /**
   * Check if a resource is currently locked.
   *
   * Returns true if a valid lock file exists for the resource.
   * Stale locks (from dead processes) are considered unlocked.
   *
   * @param resourcePath - Path to check
   * @returns Promise resolving to true if locked
   */
  async isLocked(resourcePath: string): Promise<boolean> {
    const lockPath = `${resourcePath}.lock`;

    const exists = await this.fs.exists(lockPath);
    if (!exists) {
      return false;
    }

    const lockInfo = await this.readLockInfo(lockPath);
    if (lockInfo === null) {
      // Invalid lock file
      return false;
    }

    // Check if lock is stale
    return !this.isLockStale(lockInfo);
  }

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
  private async createLockFile(lockPath: string): Promise<boolean> {
    try {
      // Check if lock file already exists
      const exists = await this.fs.exists(lockPath);
      if (exists) {
        return false;
      }

      // Create lock file with current process info
      const lockInfo: LockInfo = {
        pid: process.pid,
        timestamp: this.clock.timestamp(),
        hostname: os.hostname(),
      };

      await this.fs.writeFile(lockPath, JSON.stringify(lockInfo, null, 2));

      // Verify that we actually created it (race condition check)
      const verifyInfo = await this.readLockInfo(lockPath);
      if (verifyInfo === null || verifyInfo.pid !== process.pid) {
        // Someone else created it between our write and verify
        return false;
      }

      return true;
    } catch (error) {
      // Re-throw permission and path errors - these should fail fast
      if (this.isNonRetryableError(error)) {
        throw error;
      }
      // Other errors (race conditions, etc.) - return false to allow retry
      return false;
    }
  }

  /**
   * Check if an error is non-retryable (should fail fast).
   *
   * Permission errors, missing parent directories, and read-only filesystems
   * should fail immediately without retry.
   *
   * @param error - The error to check
   * @returns true if error should not be retried
   */
  private isNonRetryableError(error: unknown): boolean {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code: unknown }).code === "string"
    ) {
      const code = (error as { code: string }).code;
      // EACCES: Permission denied
      // ENOENT: Parent directory doesn't exist
      // EROFS: Read-only file system
      // EPERM: Operation not permitted
      return ["EACCES", "ENOENT", "EROFS", "EPERM"].includes(code);
    }
    return false;
  }

  /**
   * Read lock information from a lock file.
   *
   * @param lockPath - Path to the lock file
   * @returns Promise resolving to LockInfo or null if invalid
   */
  private async readLockInfo(lockPath: string): Promise<LockInfo | null> {
    try {
      const content = await this.fs.readFile(lockPath);
      const parsed = JSON.parse(content) as unknown;

      // Validate lock info structure
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "pid" in parsed &&
        "timestamp" in parsed &&
        "hostname" in parsed &&
        typeof parsed.pid === "number" &&
        typeof parsed.timestamp === "string" &&
        typeof parsed.hostname === "string"
      ) {
        return parsed as LockInfo;
      }

      return null;
    } catch (error) {
      // File doesn't exist or invalid JSON
      return null;
    }
  }

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
  private isLockStale(lockInfo: LockInfo): boolean {
    // Check if process is alive
    try {
      // process.kill(pid, 0) checks if process exists without actually killing it
      // Throws if process doesn't exist
      process.kill(lockInfo.pid, 0);
    } catch (error) {
      // Process doesn't exist, lock is stale
      return true;
    }

    // Check lock age
    const lockTime = new Date(lockInfo.timestamp).getTime();
    const currentTime = this.clock.now().getTime();
    const age = currentTime - lockTime;

    return age > STALE_LOCK_THRESHOLD_MS;
  }

  /**
   * Clean up a stale lock file.
   *
   * Removes the lock file to allow new lock acquisition.
   *
   * @param lockPath - Path to the stale lock file
   */
  private async cleanStaleLock(lockPath: string): Promise<void> {
    try {
      await this.fs.rm(lockPath, { force: true });
    } catch (error) {
      // Ignore errors during cleanup
      // Another process may have already cleaned it up
    }
  }

  /**
   * Create a lock handle for a successfully acquired lock.
   *
   * @param lockPath - Path to the lock file
   * @returns LockHandle for managing the lock
   */
  private createLockHandle(lockPath: string): LockHandle {
    let released = false;
    const fs = this.fs; // Capture fs in closure

    return {
      async release(): Promise<void> {
        if (released) {
          return;
        }
        released = true;

        try {
          await fs.rm(lockPath, { force: true });
        } catch (error) {
          // Ignore errors during release
          // Lock file may have been removed externally
        }
      },

      isHeld(): boolean {
        return !released;
      },

      lockPath,
    };
  }
}
