/**
 * CLI Activity Cleanup Command
 *
 * Removes stale activity entries older than a configurable threshold.
 * This helps maintain a clean activity store by removing outdated session data.
 *
 * @module cli/commands/activity/cleanup
 */

import { Command } from "commander";
import { ActivityManager } from "../../../sdk/activity/manager";
import { BunFileSystem } from "../../../interfaces/bun-filesystem";
import { SystemClock } from "../../../interfaces/system-clock";

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
export function createActivityCleanupCommand(): Command {
  return new Command("cleanup")
    .description("Remove stale activity entries")
    .option("--older-than <hours>", "Hours threshold for cleanup", "24")
    .action(async (options: { olderThan: string }) => {
      try {
        // Parse hours threshold
        const hours = parseInt(options.olderThan, 10);
        if (isNaN(hours) || hours < 0) {
          console.error("Error: --older-than must be a non-negative number");
          process.exit(1);
        }

        // Create activity manager with custom cleanup threshold
        const fs = new BunFileSystem();
        const clock = new SystemClock();
        const manager = new ActivityManager(fs, clock, {
          cleanupHours: hours,
        });

        // Run cleanup
        const removedCount = await manager.cleanup();

        // Display results
        if (removedCount === 0) {
          console.log("No stale entries to remove.");
        } else {
          console.log(
            `Removed ${removedCount} stale ${removedCount === 1 ? "entry" : "entries"}.`,
          );
        }
      } catch (error) {
        console.error(
          "Cleanup failed:",
          error instanceof Error ? error.message : String(error),
        );
        process.exit(1);
      }
    });
}
