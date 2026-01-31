/**
 * CLI Activity Update Command
 *
 * Updates activity status from Claude Code hook input.
 * Reads JSON from stdin, parses hook input, and updates activity status.
 * Designed to be called from Claude Code hooks - exits silently to avoid
 * blocking Claude Code execution.
 *
 * @module cli/commands/activity/update
 */

import type { Command } from "commander";
import { ActivityManager } from "../../../sdk/activity/manager";
import { BunFileSystem } from "../../../interfaces/bun-filesystem";
import { SystemClock } from "../../../interfaces/system-clock";

/**
 * Create activity update command that reads hook input from stdin.
 *
 * This command is designed to be called from Claude Code hooks.
 * It reads JSON hook input from stdin, updates the activity status,
 * and exits with code 0 regardless of success or failure to ensure
 * hooks never block Claude Code execution.
 *
 * Exit codes:
 * - 0: Always (success or silent failure)
 *
 * Output:
 * - stdout: None (silent for hooks)
 * - stderr: Error messages if any
 *
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * # From Claude Code hook script:
 * cat hook_input.json | claude-code-agent activity update
 * ```
 */
export function createActivityUpdateCommand(): Command {
  const { Command } = require("commander") as typeof import("commander");

  return new Command("update")
    .description("Update activity status from hook input (reads stdin)")
    .action(async () => {
      try {
        // Create manager with production dependencies
        const fs = new BunFileSystem();
        const clock = new SystemClock();
        const manager = new ActivityManager(fs, clock);

        // Update from stdin (manager handles all parsing and errors)
        await manager.updateFromHook();

        // Exit successfully (silent for hooks)
        process.exit(0);
      } catch (error) {
        // Log error to stderr but don't throw - hooks must never fail
        if (error instanceof Error) {
          process.stderr.write(`Failed to update activity: ${error.message}\n`);
        } else {
          process.stderr.write(`Failed to update activity: ${String(error)}\n`);
        }

        // Exit 0 even on error - don't block Claude Code
        process.exit(0);
      }
    });
}
