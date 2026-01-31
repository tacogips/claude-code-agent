/**
 * Test assertion helpers for Result types.
 *
 * Provides type-safe assertion functions for working with Result types
 * in test code. These helpers automatically narrow types and provide
 * clear error messages.
 *
 * @module test/helpers/assertions
 */

import { expect } from "vitest";
import type { Result } from "../../result";

/**
 * Assert that a Result is Ok and return its value.
 *
 * This function checks that the result is successful and returns
 * the unwrapped value for use in subsequent assertions.
 *
 * @param result - The result to check
 * @returns The unwrapped success value
 * @throws AssertionError if result is Err
 *
 * @example
 * ```typescript
 * const result = parseConfig(input);
 * const config = expectOk(result);
 * expect(config.port).toBe(8080);
 * ```
 */
export function expectOk<T, E>(result: Result<T, E>): T {
  expect(result.isOk()).toBe(true);
  if (result.isErr()) {
    throw new Error(
      `Expected Ok result, got Err: ${JSON.stringify(result.error)}`,
    );
  }
  return result.value;
}

/**
 * Assert that a Result is Err and return its error.
 *
 * This function checks that the result is a failure and returns
 * the unwrapped error for use in subsequent assertions.
 *
 * @param result - The result to check
 * @returns The unwrapped error value
 * @throws AssertionError if result is Ok
 *
 * @example
 * ```typescript
 * const result = parseConfig("invalid");
 * const error = expectErr(result);
 * expect(error.message).toContain("invalid");
 * ```
 */
export function expectErr<T, E>(result: Result<T, E>): E {
  expect(result.isErr()).toBe(true);
  if (result.isOk()) {
    throw new Error(
      `Expected Err result, got Ok: ${JSON.stringify(result.value)}`,
    );
  }
  return result.error;
}

/**
 * Assert that a Result is Ok and run assertions on its value.
 *
 * Combines expectOk with custom value assertions for convenience.
 * First checks that the result is Ok, then runs the provided assertions
 * on the unwrapped value.
 *
 * @param result - The result to check
 * @param assertions - Function containing assertions to run on the value
 *
 * @example
 * ```typescript
 * const result = parseUser(data);
 * expectResultValue(result, (user) => {
 *   expect(user.name).toBe("Alice");
 *   expect(user.email).toContain("@example.com");
 * });
 * ```
 */
export function expectResultValue<T, E>(
  result: Result<T, E>,
  assertions: (value: T) => void,
): void {
  const value = expectOk(result);
  assertions(value);
}

/**
 * Assert that a Result is Err with optional code/message checks.
 *
 * Checks that the result is Err and optionally validates the error
 * code and message content. Useful for testing specific error conditions.
 *
 * @param result - The result to check
 * @param expectedCode - Optional error code to match exactly
 * @param messageContains - Optional substring that must appear in error message
 *
 * @example
 * ```typescript
 * const result = validateEmail("invalid");
 * expectResultError(result, "VALIDATION_ERROR", "invalid format");
 * ```
 *
 * @example Without code/message checks
 * ```typescript
 * const result = parseConfig("bad");
 * expectResultError(result); // Just checks it's an error
 * ```
 */
export function expectResultError<
  T,
  E extends { code?: string; message?: string },
>(result: Result<T, E>, expectedCode?: string, messageContains?: string): void {
  const error = expectErr(result);

  if (expectedCode !== undefined && error.code !== undefined) {
    expect(error.code).toBe(expectedCode);
  }

  if (messageContains !== undefined && error.message !== undefined) {
    expect(error.message).toContain(messageContains);
  }
}
