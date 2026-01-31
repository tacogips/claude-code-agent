/**
 * CLI Activity Status Command
 *
 * Queries the activity status for a specific Claude Code session.
 * Displays the current status (working, waiting for user, or idle)
 * or returns the full activity entry as JSON.
 *
 * @module cli/commands/activity/status
 */

import type { Command } from "commander";
import { ActivityManager } from "../../../sdk/activity/manager";
import { BunFileSystem } from "../../../interfaces/bun-filesystem";
import { SystemClock } from "../../../interfaces/system-clock";
import { formatJson, printError } from "../../output";

/**
 * Command options for activity status command.
 */
interface ActivityStatusOptions {
  /**
   * Output full ActivityEntry as JSON instead of just status text.
   * @default false
   */
  readonly json?: boolean | undefined;
}

/**
 * Create the activity status command.
 *
 * Queries activity status for a session by ID. By default, outputs
 * only the status text. With --json, outputs the full ActivityEntry
 * as JSON.
 *
 * Exit codes:
 * - 0: Session found
 * - 2: Session not found
 *
 * @returns Commander Command instance
 *
 * @example
 * ```bash
 * # Get status text for a session
 * claude-code-agent activity status 0dc4ee1f-2e78-462f-a400-16d14ab6a418
 * # Output: working
 *
 * # Get full activity entry as JSON
 * claude-code-agent activity status 0dc4ee1f-2e78-462f-a400-16d14ab6a418 --json
 * # Output:
 * # {
 * #   "sessionId": "0dc4ee1f-2e78-462f-a400-16d14ab6a418",
 * #   "status": "working",
 * #   "projectPath": "/home/user/projects/my-app",
 * #   "lastUpdated": "2026-01-31T10:30:00.000Z"
 * # }
 *
 * # Session not found
 * claude-code-agent activity status unknown-id
 * # Output: unknown
 * # Exit code: 2
 * ```
 */
export function createActivityStatusCommand(): Command {
  const { Command } = require("commander");
  const cmd = new Command("status");

  return cmd
    .description("Get activity status for a session")
    .argument("<session-id>", "Session ID to query")
    .option("--json", "Output as JSON")
    .action(async (sessionId: string, options: ActivityStatusOptions) => {
      try {
        // Create manager with production dependencies
        const fs = new BunFileSystem();
        const clock = new SystemClock();
        const manager = new ActivityManager(fs, clock);

        // Query activity status
        const entry = await manager.getStatus(sessionId);

        if (entry === null) {
          // Session not found
          if (options.json !== undefined && options.json) {
            // JSON mode: output error object
            console.log(formatJson({ error: "not_found", sessionId }));
          } else {
            // Text mode: output "unknown"
            console.log("unknown");
          }
          process.exit(2);
        }

        // Session found - output based on format
        if (options.json !== undefined && options.json) {
          // JSON mode: output full ActivityEntry
          console.log(formatJson(entry));
        } else {
          // Text mode: output just the status value
          console.log(entry.status);
        }
      } catch (error) {
        if (error instanceof Error) {
          printError(error);
        } else {
          printError(String(error));
        }
        process.exit(1);
      }
    });
}
