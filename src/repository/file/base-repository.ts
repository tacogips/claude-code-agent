/**
 * Base class for file-based repositories with locking support.
 *
 * Provides common infrastructure for atomic reads and writes
 * with optional locking for concurrent access safety.
 *
 * @module repository/file/base-repository
 */

import type { FileSystem } from "../../interfaces/filesystem";
import type { FileLockService, LockOptions } from "../../interfaces/lock";
import type { AtomicWriter } from "../../services/atomic-writer";

/**
 * Base class for file-based repositories with locking support.
 *
 * Provides common infrastructure for atomic reads and writes
 * with optional locking for concurrent access safety.
 *
 * Subclasses should extend this class and use the protected methods
 * to implement repository operations with proper locking semantics.
 *
 * @template T - Type of record stored in the repository
 *
 * @example
 * ```typescript
 * class UserRepository extends BaseFileRepository<User> {
 *   async getUser(id: string): Promise<User | null> {
 *     const path = this.getUserPath(id);
 *     return this.readWithLock(path);
 *   }
 *
 *   async saveUser(user: User): Promise<void> {
 *     const path = this.getUserPath(user.id);
 *     await this.writeWithLock(path, user);
 *   }
 * }
 * ```
 */
export abstract class BaseFileRepository<T> {
  /**
   * Create a new BaseFileRepository.
   *
   * @param fs - FileSystem implementation for file operations
   * @param lockService - FileLockService for concurrent access control
   * @param atomicWriter - AtomicWriter for atomic write operations
   */
  constructor(
    protected readonly fs: FileSystem,
    protected readonly lockService: FileLockService,
    protected readonly atomicWriter: AtomicWriter,
  ) {}

  /**
   * Read a record with optional shared lock.
   *
   * Reads the file and parses as JSON. Returns null if file does not exist.
   * No locking is used for reads as eventual consistency is acceptable
   * per the design (see impl-plans/exclusive-control.md).
   *
   * @param filePath - Path to the file to read
   * @returns Promise resolving to the record or null if not found
   * @throws Error if file exists but cannot be parsed as JSON
   */
  protected async readWithLock(filePath: string): Promise<T | null> {
    // Check if file exists
    const exists = await this.fs.exists(filePath);
    if (!exists) {
      return null;
    }

    // Read and parse file
    try {
      const content = await this.fs.readFile(filePath);
      return JSON.parse(content) as T;
    } catch (error) {
      // Re-throw with more context
      throw new Error(
        `Failed to read or parse file ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Write a record with exclusive lock.
   *
   * Acquires an exclusive lock on the file path, then uses AtomicWriter
   * to write the data atomically. Lock is automatically released after write.
   *
   * @param filePath - Path to the file to write
   * @param data - Record to serialize and write
   * @param options - Optional lock acquisition options
   * @throws Error if lock acquisition fails or write fails
   */
  protected async writeWithLock(
    filePath: string,
    data: T,
    options?: LockOptions,
  ): Promise<void> {
    await this.lockService.withLock(
      filePath,
      async () => {
        await this.atomicWriter.writeJson(filePath, data);
      },
      options,
    );
  }

  /**
   * Execute read-modify-write with exclusive lock.
   *
   * Acquires an exclusive lock, reads the current value (or null if not exists),
   * calls the modifier function to compute the new value, and writes it atomically.
   * Lock is automatically released after the operation completes.
   *
   * This method ensures that read-modify-write operations are atomic and
   * prevents lost updates in concurrent access scenarios.
   *
   * @param filePath - Path to the file to modify
   * @param modifier - Function that receives current value and returns new value
   * @param options - Optional lock acquisition options
   * @returns Promise resolving to the new value returned by modifier
   * @throws Error if lock acquisition fails, read fails, or write fails
   *
   * @example
   * ```typescript
   * // Increment a counter atomically
   * await this.modifyWithLock(counterPath, (current) => {
   *   const count = current?.count ?? 0;
   *   return { count: count + 1 };
   * });
   * ```
   */
  protected async modifyWithLock(
    filePath: string,
    modifier: (current: T | null) => T,
    options?: LockOptions,
  ): Promise<T> {
    return this.lockService.withLock(
      filePath,
      async () => {
        // Read current value (or null if not exists)
        const current = await this.readWithLock(filePath);

        // Call modifier to compute new value
        const newValue = modifier(current);

        // Write modified value atomically
        await this.atomicWriter.writeJson(filePath, newValue);

        return newValue;
      },
      options,
    );
  }

  /**
   * Delete a record with exclusive lock.
   *
   * Acquires an exclusive lock, checks if the file exists, and deletes it
   * if present. Returns true if file was deleted, false if it didn't exist.
   *
   * @param filePath - Path to the file to delete
   * @param options - Optional lock acquisition options
   * @returns Promise resolving to true if deleted, false if didn't exist
   * @throws Error if lock acquisition fails or deletion fails
   */
  protected async deleteWithLock(
    filePath: string,
    options?: LockOptions,
  ): Promise<boolean> {
    return this.lockService.withLock(
      filePath,
      async () => {
        // Check if file exists
        const exists = await this.fs.exists(filePath);
        if (!exists) {
          return false;
        }

        // Delete file
        await this.fs.rm(filePath, { force: true });
        return true;
      },
      options,
    );
  }
}
