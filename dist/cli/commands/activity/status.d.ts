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
export declare function createActivityStatusCommand(): Command;
//# sourceMappingURL=status.d.ts.map