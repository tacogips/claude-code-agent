/**
 * Mock Clock for testing.
 *
 * Provides a controllable implementation of the Clock interface
 * that allows tests to control time without waiting for real time.
 *
 * @module test/mocks/clock
 */

import type { Clock } from "../../interfaces/clock";

/**
 * Mock Clock implementation for testing.
 *
 * Allows precise control over time for deterministic testing
 * of time-dependent code.
 */
export class MockClock implements Clock {
  private currentTime: Date;
  private sleepResolvers: Array<{ ms: number; resolve: () => void }> = [];
  private autoAdvance = false;

  /**
   * Create a new MockClock.
   *
   * @param initialTime - Initial time (default: 2026-01-01T00:00:00.000Z)
   */
  constructor(initialTime: Date = new Date("2026-01-01T00:00:00.000Z")) {
    this.currentTime = new Date(initialTime.getTime());
  }

  /**
   * Get the current date and time.
   *
   * @returns Current Date object
   */
  now(): Date {
    return new Date(this.currentTime.getTime());
  }

  /**
   * Get the current time as an ISO 8601 timestamp string.
   *
   * @returns ISO timestamp (e.g., "2026-01-05T12:30:45.123Z")
   */
  timestamp(): string {
    return this.currentTime.toISOString();
  }

  /**
   * Pause execution for the specified duration.
   *
   * In mock mode, this blocks until advance() is called with
   * enough time, or resolves immediately if autoAdvance is enabled.
   *
   * @param ms - Duration to sleep in milliseconds
   * @returns Promise that resolves after the duration
   */
  async sleep(ms: number): Promise<void> {
    if (this.autoAdvance) {
      // Auto-advance mode: immediately advance time and resolve
      this.currentTime = new Date(this.currentTime.getTime() + ms);
      return;
    }

    // Manual mode: wait for advance() to be called
    return new Promise((resolve) => {
      this.sleepResolvers.push({ ms, resolve });
    });
  }

  /**
   * Set the current time.
   *
   * @param time - New current time
   */
  setTime(time: Date): void {
    this.currentTime = new Date(time.getTime());
  }

  /**
   * Set the current time from an ISO timestamp string.
   *
   * @param isoString - ISO timestamp string
   */
  setTimeFromString(isoString: string): void {
    this.currentTime = new Date(isoString);
  }

  /**
   * Advance time by the specified amount.
   *
   * This resolves any pending sleep() calls whose duration
   * has been reached.
   *
   * @param ms - Milliseconds to advance
   */
  advance(ms: number): void {
    this.currentTime = new Date(this.currentTime.getTime() + ms);

    // Resolve any sleep calls that have been reached
    let remaining = ms;
    while (remaining > 0 && this.sleepResolvers.length > 0) {
      const next = this.sleepResolvers[0];
      if (next === undefined) break;

      if (next.ms <= remaining) {
        remaining -= next.ms;
        this.sleepResolvers.shift();
        next.resolve();
      } else {
        next.ms -= remaining;
        remaining = 0;
      }
    }
  }

  /**
   * Advance time and resolve all pending sleep calls.
   *
   * Useful for tests that need to flush all pending timers.
   */
  advanceToNextSleep(): void {
    if (this.sleepResolvers.length === 0) {
      return;
    }

    const next = this.sleepResolvers[0];
    if (next !== undefined) {
      this.advance(next.ms);
    }
  }

  /**
   * Resolve all pending sleep calls immediately.
   *
   * Time is advanced by the sum of all pending durations.
   */
  flushAllSleeps(): void {
    let totalMs = 0;
    for (const resolver of this.sleepResolvers) {
      totalMs += resolver.ms;
      resolver.resolve();
    }
    this.currentTime = new Date(this.currentTime.getTime() + totalMs);
    this.sleepResolvers = [];
  }

  /**
   * Get the number of pending sleep calls.
   */
  getPendingSleepCount(): number {
    return this.sleepResolvers.length;
  }

  /**
   * Enable auto-advance mode.
   *
   * When enabled, sleep() calls resolve immediately
   * and time is automatically advanced.
   */
  enableAutoAdvance(): void {
    this.autoAdvance = true;
    // Resolve any pending sleeps
    this.flushAllSleeps();
  }

  /**
   * Disable auto-advance mode.
   *
   * When disabled, sleep() calls block until advance()
   * is called with enough time.
   */
  disableAutoAdvance(): void {
    this.autoAdvance = false;
  }

  /**
   * Check if auto-advance mode is enabled.
   */
  isAutoAdvanceEnabled(): boolean {
    return this.autoAdvance;
  }

  /**
   * Get the current time as Unix timestamp (milliseconds).
   */
  getTimeMs(): number {
    return this.currentTime.getTime();
  }
}
