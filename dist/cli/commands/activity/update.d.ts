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
export declare function createActivityUpdateCommand(): Command;
//# sourceMappingURL=update.d.ts.map