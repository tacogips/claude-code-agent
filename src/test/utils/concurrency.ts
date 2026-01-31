/**
 * Concurrency test utilities.
 *
 * Provides utilities for testing concurrent access scenarios,
 * race conditions, and verification of atomic operations.
 *
 * @module test/utils/concurrency
 */

/**
 * Result of a single concurrent operation.
 *
 * Contains either the successful result or the error that occurred.
 */
export interface ConcurrentResult<T> {
  /** The successful result value, if the operation succeeded */
  readonly result?: T;
  /** The error that occurred, if the operation failed */
  readonly error?: Error;
}

/**
 * Options for runConcurrent.
 */
export interface RunConcurrentOptions {
  /** Delay in milliseconds between starting each operation */
  readonly delayBetween?: number;
}

/**
 * Result of verifying no lost updates.
 */
export interface VerifyNoLostUpdatesResult<T> {
  /** True if all modifications were applied correctly */
  readonly success: boolean;
  /** The expected final value after all modifications */
  readonly expected: T;
  /** The actual final value read from storage */
  readonly actual: T;
}

/**
 * Run multiple async operations concurrently and collect results.
 *
 * Starts all operations simultaneously using Promise.allSettled and
 * returns an array of results, where each entry contains either
 * the successful result or the error that occurred.
 *
 * This is useful for testing race conditions and concurrent access
 * patterns where you want to know the outcome of each operation
 * regardless of whether others succeeded or failed.
 *
 * @param operations - Array of async operations to run concurrently
 * @param options - Optional configuration
 * @returns Array of results with either result or error for each operation
 *
 * @example
 * ```typescript
 * // Run 10 concurrent writes
 * const results = await runConcurrent(
 *   Array(10).fill(null).map((_, i) => () => writeFile(`data-${i}.json`, data))
 * );
 *
 * // Check how many succeeded
 * const succeeded = results.filter(r => r.result !== undefined).length;
 * expect(succeeded).toBe(10);
 * ```
 *
 * @example With delay between operations
 * ```typescript
 * // Start each operation 50ms apart
 * const results = await runConcurrent(
 *   operations,
 *   { delayBetween: 50 }
 * );
 * ```
 */
export async function runConcurrent<T>(
  operations: ReadonlyArray<() => Promise<T>>,
  options?: RunConcurrentOptions,
): Promise<ReadonlyArray<ConcurrentResult<T>>> {
  const delayBetween = options?.delayBetween ?? 0;

  // Start all operations with optional delay between each
  const promises = operations.map(async (operation, index) => {
    if (delayBetween > 0 && index > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayBetween * index));
    }
    return operation();
  });

  // Use Promise.allSettled to collect all results
  const settled = await Promise.allSettled(promises);

  // Transform to ConcurrentResult format
  return settled.map((result) => {
    if (result.status === "fulfilled") {
      return { result: result.value };
    } else {
      // Ensure error is an Error instance
      const error =
        result.reason instanceof Error
          ? result.reason
          : new Error(String(result.reason));
      return { error };
    }
  });
}

/**
 * Verify no lost updates in concurrent modifications.
 *
 * Applies a series of modifications concurrently to a shared resource
 * and verifies that all modifications were successfully applied without
 * any lost updates due to race conditions.
 *
 * This function:
 * 1. Calculates the expected final value by applying all modifications sequentially
 * 2. Runs all modifications concurrently against the actual storage
 * 3. Reads the final value from storage
 * 4. Compares actual with expected to detect lost updates
 *
 * The test passes (success=true) only if the actual final value matches
 * the expected value, indicating no modifications were lost.
 *
 * @param initial - The initial value before any modifications
 * @param modifications - Array of modification functions to apply
 * @param readFn - Function to read the current value from storage
 * @param writeFn - Function to write a value to storage
 * @returns Result containing success status and expected/actual values
 *
 * @example
 * ```typescript
 * // Test concurrent counter increments
 * const result = await verifyNoLostUpdates(
 *   0,                           // Initial value
 *   [n => n + 1, n => n + 1, n => n + 1],  // 3 increments
 *   () => readCounter(),         // Read function
 *   (v) => writeCounter(v)       // Write function
 * );
 *
 * // Without proper locking, this will likely fail due to lost updates
 * expect(result.success).toBe(false);  // Actual < expected
 * expect(result.expected).toBe(3);
 * expect(result.actual).toBeLessThan(3); // Lost updates!
 * ```
 *
 * @example With atomic operations (should pass)
 * ```typescript
 * const result = await verifyNoLostUpdates(
 *   { count: 0 },
 *   [
 *     (v) => ({ count: v.count + 1 }),
 *     (v) => ({ count: v.count + 1 }),
 *     (v) => ({ count: v.count + 1 })
 *   ],
 *   () => repo.read(),
 *   (v) => repo.writeWithLock(v)  // Uses locking
 * );
 *
 * expect(result.success).toBe(true);  // All updates preserved
 * expect(result.actual).toEqual(result.expected);
 * ```
 */
export async function verifyNoLostUpdates<T>(
  initial: T,
  modifications: ReadonlyArray<(current: T) => T>,
  readFn: () => Promise<T>,
  writeFn: (value: T) => Promise<void>,
): Promise<VerifyNoLostUpdatesResult<T>> {
  // Calculate expected final value by applying modifications sequentially
  let expected = initial;
  for (const modify of modifications) {
    expected = modify(expected);
  }

  // Run all modifications concurrently
  const operations = modifications.map((modify) => async () => {
    const current = await readFn();
    const updated = modify(current);
    await writeFn(updated);
  });

  await runConcurrent(operations);

  // Read final value from storage
  const actual = await readFn();

  // Deep equality comparison for success
  const success = JSON.stringify(actual) === JSON.stringify(expected);

  return {
    success,
    expected,
    actual,
  };
}
