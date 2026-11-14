/**
 * CLI Activity Cleanup Command
 *
 * Removes stale activity entries older than a configurable threshold.
 * This helps maintain a clean activity store by removing outdated session data.
 *
 * @module cli/commands/activity/cleanup
 */
import { Command } from "commander";
/**
 * Create activity cleanup command that removes stale activity entries.
 *
 * Removes entries older than the specified threshold (default: 24 hours).
 * Uses ActivityManager.cleanup() to perform the operation.
 *
 * Options:
 * - --older-than <hours>: Hours threshold for cleanup (default: 24)
 *
 * Exit codes:
 * - 0: Cleanup successful (regardless of entries removed)
 * - 1: Cleanup failed
 *
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * # Cleanup entries older than 24 hours (default)
 * claude-code-agent activity cleanup
 *
 * # Cleanup entries older than 48 hours
 * claude-code-agent activity cleanup --older-than 48
 *
 * # Cleanup entries older than 1 hour
 * claude-code-agent activity cleanup --older-than 1
 * ```
 */
export declare function createActivityCleanupCommand(): Command;
//# sourceMappingURL=cleanup.d.ts.map