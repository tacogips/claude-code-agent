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
export declare class MockClock implements Clock {
    private currentTime;
    private sleepResolvers;
    private autoAdvance;
    /**
     * Create a new MockClock.
     *
     * @param initialTime - Initial time (default: 2026-01-01T00:00:00.000Z)
     */
    constructor(initialTime?: Date);
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
     * In mock mode, this blocks until advance() is called with
     * enough time, or resolves immediately if autoAdvance is enabled.
     *
     * @param ms - Duration to sleep in milliseconds
     * @returns Promise that resolves after the duration
     */
    sleep(ms: number): Promise<void>;
    /**
     * Set the current time.
     *
     * @param time - New current time
     */
    setTime(time: Date): void;
    /**
     * Set the current time from an ISO timestamp string.
     *
     * @param isoString - ISO timestamp string
     */
    setTimeFromString(isoString: string): void;
    /**
     * Advance time by the specified amount.
     *
     * This resolves any pending sleep() calls whose duration
     * has been reached.
     *
     * @param ms - Milliseconds to advance
     */
    advance(ms: number): void;
    /**
     * Advance time and resolve all pending sleep calls.
     *
     * Useful for tests that need to flush all pending timers.
     */
    advanceToNextSleep(): void;
    /**
     * Resolve all pending sleep calls immediately.
     *
     * Time is advanced by the sum of all pending durations.
     */
    flushAllSleeps(): void;
    /**
     * Get the number of pending sleep calls.
     */
    getPendingSleepCount(): number;
    /**
     * Enable auto-advance mode.
     *
     * When enabled, sleep() calls resolve immediately
     * and time is automatically advanced.
     */
    enableAutoAdvance(): void;
    /**
     * Disable auto-advance mode.
     *
     * When disabled, sleep() calls block until advance()
     * is called with enough time.
     */
    disableAutoAdvance(): void;
    /**
     * Check if auto-advance mode is enabled.
     */
    isAutoAdvanceEnabled(): boolean;
    /**
     * Get the current time as Unix timestamp (milliseconds).
     */
    getTimeMs(): number;
}
//# sourceMappingURL=clock.d.ts.map