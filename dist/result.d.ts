/**
 * Result type for error handling without exceptions.
 *
 * Re-exports neverthrow Result type with additional utility functions
 * for backward compatibility.
 *
 * @module result
 */
import { Result, ok, err, ResultAsync } from "neverthrow";
export { Result, ok, err, ResultAsync };
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
export declare function isOk<T, E>(result: Result<T, E>): boolean;
/**
 * Type guard to check if a result is a failure.
 *
 * Use this to narrow the type and access the error.
 *
 * @deprecated Use result.isErr() method directly instead.
 * @param result - The result to check
 * @returns True if the result is Err
 */
export declare function isErr<T, E>(result: Result<T, E>): boolean;
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
export declare function map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E>;
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
export declare function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F>;
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
export declare function flatMap<T, U, E>(result: Result<T, E>, fn: (value: T) => Result<U, E>): Result<U, E>;
/**
 * Async version of flatMap for async operations.
 *
 * @param result - The result to chain
 * @param fn - Async function that returns a new result
 * @returns Promise resolving to the result of fn, or the original error
 */
export declare function flatMapAsync<T, U, E>(result: Result<T, E>, fn: (value: T) => Promise<Result<U, E>>): Promise<Result<U, E>>;
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
export declare function unwrap<T, E>(result: Result<T, E>, message?: string): T;
/**
 * Get the success value or a default.
 *
 * @deprecated Use result.unwrapOr(defaultValue) method directly instead.
 * @param result - The result to unwrap
 * @param defaultValue - Value to return if result is Err
 * @returns The success value or default
 */
export declare function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T;
/**
 * Get the success value or compute a default.
 *
 * @param result - The result to unwrap
 * @param fn - Function to compute default from error
 * @returns The success value or computed default
 */
export declare function unwrapOrElse<T, E>(result: Result<T, E>, fn: (error: E) => T): T;
/**
 * Combine multiple results into a single result.
 *
 * If all results are Ok, returns Ok with an array of values.
 * If any result is Err, returns the first Err encountered.
 *
 * @param results - Array of results to combine
 * @returns Combined result
 */
export declare function all<T, E>(results: readonly Result<T, E>[]): Result<readonly T[], E>;
/**
 * Try to execute a function and wrap the result.
 *
 * Catches any thrown errors and wraps them in Err.
 * Useful for wrapping functions that throw.
 *
 * @param fn - Function to try
 * @returns Result with success value or caught error
 */
export declare function tryCatch<T>(fn: () => T): Result<T, unknown>;
/**
 * Async version of tryCatch.
 *
 * @param fn - Async function to try
 * @returns Promise resolving to result with success value or caught error
 */
export declare function tryCatchAsync<T>(fn: () => Promise<T>): Promise<Result<T, unknown>>;
//# sourceMappingURL=result.d.ts.map