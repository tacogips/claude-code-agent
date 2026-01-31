/**
 * Clock interface for abstracting time operations.
 *
 * This provides testability by allowing mock implementations
 * that control time in tests, enabling deterministic testing
 * of time-dependent code.
 */

/**
 * Abstract interface for time operations.
 *
 * All methods are synchronous as time access is typically fast.
 * sleep() is the exception as it must be async by nature.
 */
export interface Clock {
  /**
   * Get the current date and time.
   *
   * @returns Current Date object
   */
  now(): Date;

  /**
   * Get the current time as an ISO 8601 timestamp string.
   *
   * @returns ISO timestamp (e.g., "2026-01-05T12:30:45.123Z")
   */
  timestamp(): string;

  /**
   * Pause execution for the specified duration.
   *
   * In production, this maps to actual sleep.
   * In tests, mock can resolve immediately or advance fake time.
   *
   * @param ms - Duration to sleep in milliseconds
   * @returns Promise that resolves after the duration
   */
  sleep(ms: number): Promise<void>;
}
