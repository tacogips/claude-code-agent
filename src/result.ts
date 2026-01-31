/**
 * Result type for error handling without exceptions.
 *
 * Re-exports neverthrow Result type with additional utility functions
 * for backward compatibility.
 *
 * @module result
 */

import { Result, ok, err, ResultAsync } from "neverthrow";

// Re-export core types and constructors from neverthrow
export { Result, ok, err, ResultAsync };

// Export the Ok and Err types for type annotations
export type { Ok, Err } from "neverthrow";

/**
 * Type guard to check if a result is successful.
 *
 * Use this to narrow the type and access the value.
 *
 * @deprecated Use result.isOk() method directly instead.
 * @param result - The result to check
 * @returns True if the result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): boolean {
  return result.isOk();
}

/**
 * Type guard to check if a result is a failure.
 *
 * Use this to narrow the type and access the error.
 *
 * @deprecated Use result.isErr() method directly instead.
 * @param result - The result to check
 * @returns True if the result is Err
 */
export function isErr<T, E>(result: Result<T, E>): boolean {
  return result.isErr();
}

/**
 * Map a successful result's value using a function.
 *
 * If the result is an error, it is passed through unchanged.
 *
 * @deprecated Use result.map(fn) method directly instead.
 * @param result - The result to map
 * @param fn - Function to apply to the success value
 * @returns A new result with the mapped value
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  return result.map(fn);
}

/**
 * Map a failed result's error using a function.
 *
 * If the result is successful, it is passed through unchanged.
 *
 * @deprecated Use result.mapErr(fn) method directly instead.
 * @param result - The result to map
 * @param fn - Function to apply to the error
 * @returns A new result with the mapped error
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> {
  return result.mapErr(fn);
}

/**
 * Chain result-returning operations.
 *
 * If the result is an error, the function is not called
 * and the error is passed through.
 *
 * @deprecated Use result.andThen(fn) method directly instead.
 * @param result - The result to chain
 * @param fn - Function that returns a new result
 * @returns The result of fn, or the original error
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return result.andThen(fn);
}

/**
 * Async version of flatMap for async operations.
 *
 * @param result - The result to chain
 * @param fn - Async function that returns a new result
 * @returns Promise resolving to the result of fn, or the original error
 */
export async function flatMapAsync<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Promise<Result<U, E>>,
): Promise<Result<U, E>> {
  if (result.isErr()) {
    return err(result.error);
  }
  return fn(result.value);
}

/**
 * Unwrap a result, throwing if it's an error.
 *
 * Use sparingly - prefer explicit handling with isOk/isErr.
 * Useful at program boundaries where errors should propagate.
 *
 * @param result - The result to unwrap
 * @param message - Optional custom error message
 * @returns The success value
 * @throws Error if the result is Err
 */
export function unwrap<T, E>(result: Result<T, E>, message?: string): T {
  if (result.isOk()) {
    return result.value;
  }
  const errorMessage = message ?? `Unwrap failed: ${String(result.error)}`;
  throw new Error(errorMessage);
}

/**
 * Get the success value or a default.
 *
 * @deprecated Use result.unwrapOr(defaultValue) method directly instead.
 * @param result - The result to unwrap
 * @param defaultValue - Value to return if result is Err
 * @returns The success value or default
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.unwrapOr(defaultValue);
}

/**
 * Get the success value or compute a default.
 *
 * @param result - The result to unwrap
 * @param fn - Function to compute default from error
 * @returns The success value or computed default
 */
export function unwrapOrElse<T, E>(
  result: Result<T, E>,
  fn: (error: E) => T,
): T {
  if (result.isOk()) {
    return result.value;
  }
  return fn(result.error);
}

/**
 * Combine multiple results into a single result.
 *
 * If all results are Ok, returns Ok with an array of values.
 * If any result is Err, returns the first Err encountered.
 *
 * @param results - Array of results to combine
 * @returns Combined result
 */
export function all<T, E>(
  results: readonly Result<T, E>[],
): Result<readonly T[], E> {
  // Use Result.combine for combining results
  return Result.combine(results as Result<T, E>[]);
}

/**
 * Try to execute a function and wrap the result.
 *
 * Catches any thrown errors and wraps them in Err.
 * Useful for wrapping functions that throw.
 *
 * @param fn - Function to try
 * @returns Result with success value or caught error
 */
export function tryCatch<T>(fn: () => T): Result<T, unknown> {
  try {
    return ok(fn());
  } catch (error: unknown) {
    return err(error);
  }
}

/**
 * Async version of tryCatch.
 *
 * @param fn - Async function to try
 * @returns Promise resolving to result with success value or caught error
 */
export async function tryCatchAsync<T>(
  fn: () => Promise<T>,
): Promise<Result<T, unknown>> {
  try {
    return ok(await fn());
  } catch (error: unknown) {
    return err(error);
  }
}
