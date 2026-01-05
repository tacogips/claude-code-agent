/**
 * Result type for error handling without exceptions.
 *
 * The Result pattern provides explicit error handling at the type level,
 * forcing callers to handle both success and error cases.
 *
 * @module result
 */

/**
 * A successful result containing a value.
 */
export interface Ok<T> {
  readonly ok: true;
  readonly value: T;
}

/**
 * A failed result containing an error.
 */
export interface Err<E> {
  readonly ok: false;
  readonly error: E;
}

/**
 * Result type representing either success (Ok) or failure (Err).
 *
 * Use this instead of throwing exceptions for expected error conditions.
 *
 * @example
 * ```typescript
 * function divide(a: number, b: number): Result<number, string> {
 *   if (b === 0) {
 *     return err("Division by zero");
 *   }
 *   return ok(a / b);
 * }
 *
 * const result = divide(10, 2);
 * if (isOk(result)) {
 *   console.log(result.value); // 5
 * } else {
 *   console.error(result.error);
 * }
 * ```
 */
export type Result<T, E> = Ok<T> | Err<E>;

/**
 * Create a successful result.
 *
 * @param value - The success value
 * @returns An Ok result containing the value
 */
export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

/**
 * Create a failed result.
 *
 * @param error - The error value
 * @returns An Err result containing the error
 */
export function err<E>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Type guard to check if a result is successful.
 *
 * Use this to narrow the type and access the value.
 *
 * @param result - The result to check
 * @returns True if the result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is Ok<T> {
  return result.ok;
}

/**
 * Type guard to check if a result is a failure.
 *
 * Use this to narrow the type and access the error.
 *
 * @param result - The result to check
 * @returns True if the result is Err
 */
export function isErr<T, E>(result: Result<T, E>): result is Err<E> {
  return !result.ok;
}

/**
 * Map a successful result's value using a function.
 *
 * If the result is an error, it is passed through unchanged.
 *
 * @param result - The result to map
 * @param fn - Function to apply to the success value
 * @returns A new result with the mapped value
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.value));
  }
  return result;
}

/**
 * Map a failed result's error using a function.
 *
 * If the result is successful, it is passed through unchanged.
 *
 * @param result - The result to map
 * @param fn - Function to apply to the error
 * @returns A new result with the mapped error
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> {
  if (isErr(result)) {
    return err(fn(result.error));
  }
  return result;
}

/**
 * Chain result-returning operations.
 *
 * If the result is an error, the function is not called
 * and the error is passed through.
 *
 * @param result - The result to chain
 * @param fn - Function that returns a new result
 * @returns The result of fn, or the original error
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
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
  if (isOk(result)) {
    return fn(result.value);
  }
  return result;
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
  if (isOk(result)) {
    return result.value;
  }
  const errorMessage = message ?? `Unwrap failed: ${String(result.error)}`;
  throw new Error(errorMessage);
}

/**
 * Get the success value or a default.
 *
 * @param result - The result to unwrap
 * @param defaultValue - Value to return if result is Err
 * @returns The success value or default
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) {
    return result.value;
  }
  return defaultValue;
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
  if (isOk(result)) {
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
  const values: T[] = [];
  for (const result of results) {
    if (isErr(result)) {
      return result;
    }
    values.push(result.value);
  }
  return ok(values);
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
