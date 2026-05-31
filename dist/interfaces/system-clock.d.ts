/**
 * Production Clock implementation using system time.
 *
 * This provides the real time operations using JavaScript's
 * Date and Bun's sleep APIs.
 *
 * @module interfaces/system-clock
 */
import type { Clock } from "./clock";
/**
 * Production Clock implementation using system time.
 *
 * Uses JavaScript Date for time access and Bun.sleep for
 * async pausing.
 */
export declare class SystemClock implements Clock {
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
     * Uses Bun.sleep for optimal async sleeping.
     *
     * @param ms - Duration to sleep in milliseconds
     * @returns Promise that resolves after the duration
     */
    sleep(ms: number): Promise<void>;
}
//# sourceMappingURL=system-clock.d.ts.map