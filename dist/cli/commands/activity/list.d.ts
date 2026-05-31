/**
 * CLI command for listing all tracked session activities.
 *
 * Provides table or JSON output of all activity entries with optional
 * filtering by activity status (working/waiting_user_response/idle).
 *
 * @module cli/commands/activity/list
 */
import { Command } from "commander";
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
export declare function createActivityListCommand(): Command;
//# sourceMappingURL=list.d.ts.map