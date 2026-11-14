/**
 * Auth Command Utilities
 *
 * Shared utility functions for auth CLI commands.
 *
 * @module cli/commands/auth/utils
 */

/**
 * Format relative time from now
 *
 * Converts a Date to a human-readable relative time string.
 * Handles both future and past dates appropriately.
 *
 * @param date - The date to format relative to now
 * @returns A human-readable relative time string (e.g., "2 days from now", "3 hours ago")
 *
 * @example
 * ```typescript
 * // Future date
 * formatRelativeTime(new Date(Date.now() + 86400000)) // "1 day from now"
 *
 * // Past date
 * formatRelativeTime(new Date(Date.now() - 7200000)) // "2 hours ago"
 * ```
 */
export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diffMs = date.getTime() - now;

  if (diffMs < 0) {
    const absDiffMs = Math.abs(diffMs);
    const hours = Math.floor(absDiffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }
    return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? "s" : ""} from now`;
  }
  return `${hours} hour${hours !== 1 ? "s" : ""} from now`;
}
