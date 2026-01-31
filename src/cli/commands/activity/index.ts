/**
 * CLI Activity Command Group
 *
 * Manages session activity tracking through Claude Code hooks.
 * Provides subcommands for updating status, querying session activity,
 * listing tracked sessions, cleaning up stale entries, and configuring hooks.
 *
 * @module cli/commands/activity
 */

import type { Command } from "commander";
import { createActivityUpdateCommand } from "./update";
import { createActivityStatusCommand } from "./status";
import { createActivityListCommand } from "./list";
import { createActivityCleanupCommand } from "./cleanup";
import { createActivitySetupCommand } from "./setup";

/**
 * Create the activity command group.
 *
 * Provides access to activity tracking commands:
 * - `update`: Update activity status from hook input (reads stdin)
 * - `status`: Get activity status for a session
 * - `list`: List all tracked session activities
 * - `cleanup`: Remove stale activity entries
 * - `setup`: Configure Claude Code hooks for activity tracking
 *
 * Activity tracking monitors Claude Code session status through hooks:
 * - UserPromptSubmit: Sets status to "working"
 * - PermissionRequest: Sets status to "waiting_user_response"
 * - Stop: Analyzes transcript to determine if waiting for user
 *
 * @returns Commander Command instance with registered subcommands
 *
 * @example
 * ```bash
 * # Show help for activity commands
 * claude-code-agent activity --help
 *
 * # Update activity from hook (stdin)
 * cat hook_input.json | claude-code-agent activity update
 *
 * # Get session status
 * claude-code-agent activity status 0dc4ee1f-2e78-462f-a400-16d14ab6a418
 *
 * # List all tracked sessions
 * claude-code-agent activity list
 *
 * # List only working sessions
 * claude-code-agent activity list --status working
 *
 * # Clean up stale entries
 * claude-code-agent activity cleanup --older-than 24
 *
 * # Configure hooks for automatic tracking
 * claude-code-agent activity setup
 * ```
 */
export function createActivityCommand(): Command {
  const { Command } = require("commander");

  return (
    new Command("activity")
      .description("Manage session activity tracking")
      // Activity tracking commands
      .addCommand(createActivityUpdateCommand())
      .addCommand(createActivityStatusCommand())
      .addCommand(createActivityListCommand())
      .addCommand(createActivityCleanupCommand())
      .addCommand(createActivitySetupCommand())
  );
}
