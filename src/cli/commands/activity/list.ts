/**
 * CLI command for listing all tracked session activities.
 *
 * Provides table or JSON output of all activity entries with optional
 * filtering by activity status (working/waiting_user_response/idle).
 *
 * @module cli/commands/activity/list
 */

import { Command } from "commander";
import { ActivityManager } from "../../../sdk/activity/manager";
import type { ActivityStatus } from "../../../types/activity";
import { formatTable, formatJson } from "../../output";
import { BunFileSystem } from "../../../interfaces/bun-filesystem";
import { SystemClock } from "../../../interfaces/system-clock";

/**
 * Valid activity status values for filtering.
 */
const VALID_STATUSES: readonly ActivityStatus[] = [
  "working",
  "waiting_user_response",
  "idle",
] as const;

/**
 * Type guard to check if a string is a valid ActivityStatus.
 *
 * @param value - String to check
 * @returns True if value is a valid ActivityStatus
 */
function isValidActivityStatus(value: string): value is ActivityStatus {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

/**
 * Create the activity list command.
 *
 * Lists all tracked session activities with optional filtering by status.
 * Supports both table (default) and JSON output formats.
 *
 * @returns Commander Command instance
 *
 * @example
 * ```bash
 * # List all activities (table format)
 * claude-code-agent activity list
 *
 * # List only working sessions
 * claude-code-agent activity list --status working
 *
 * # List with JSON output
 * claude-code-agent activity list --json
 *
 * # Filter and output as JSON
 * claude-code-agent activity list --status waiting_user_response --json
 * ```
 */
export function createActivityListCommand(): Command {
  return new Command("list")
    .description("List all tracked session activities")
    .option(
      "--status <status>",
      "Filter by status (working, waiting_user_response, idle)",
    )
    .option("--json", "Output as JSON")
    .action(async (options: { status?: string; json?: boolean }) => {
      try {
        // Validate status option if provided
        if (options.status !== undefined) {
          if (!isValidActivityStatus(options.status)) {
            console.error(
              `Error: Invalid status "${options.status}". Valid statuses: ${VALID_STATUSES.join(", ")}`,
            );
            process.exit(2);
          }
        }

        // Create manager
        const fs = new BunFileSystem();
        const clock = new SystemClock();
        const manager = new ActivityManager(fs, clock);

        // Build filter
        const filter =
          options.status !== undefined ? { status: options.status } : undefined;

        // Query list
        const entries = await manager.list(filter);

        // Handle empty results
        if (entries.length === 0) {
          if (options.json === true) {
            console.log(formatJson([]));
          } else {
            console.log("No activity entries found.");
          }
          return;
        }

        // Format output
        if (options.json === true) {
          console.log(formatJson(entries));
        } else {
          // Table output with columns: SESSION_ID, STATUS, PROJECT, LAST_UPDATED
          console.log(
            formatTable(
              entries as unknown as readonly Record<string, unknown>[],
              [
                { key: "sessionId", header: "SESSION_ID", width: 36 },
                { key: "status", header: "STATUS", width: 22 },
                { key: "projectPath", header: "PROJECT", width: 40 },
                { key: "lastUpdated", header: "LAST_UPDATED", width: 24 },
              ],
            ),
          );
        }
      } catch (error) {
        // Error handling
        if (error instanceof Error) {
          console.error(`Error: ${error.message}`);
        } else {
          console.error(`Error: ${String(error)}`);
        }
        process.exit(1);
      }
    });
}
