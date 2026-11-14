/**
 * CLI Activity Setup Command
 *
 * Configures Claude Code hooks for automatic activity tracking.
 * Modifies settings.json to add activity update hooks that trigger
 * on UserPromptSubmit, PermissionRequest, and Stop events.
 *
 * @module cli/commands/activity/setup
 */
import type { Command } from "commander";
/**
 * Create the activity setup command.
 *
 * Configures Claude Code hooks for activity tracking by modifying
 * settings.json. Supports both global (~/.claude/settings.json) and
 * project-local (.claude/settings.json) configuration.
 *
 * Options:
 * - --global: Configure in ~/.claude/settings.json
 * - --project: Configure in .claude/settings.json (default)
 * - --dry-run: Show changes without applying
 *
 * Exit codes:
 * - 0: Setup successful
 * - 1: Setup failed
 *
 * @returns Commander command instance
 *
 * @example
 * ```bash
 * # Setup for current project
 * claude-code-agent activity setup
 *
 * # Setup globally
 * claude-code-agent activity setup --global
 *
 * # Preview changes without applying
 * claude-code-agent activity setup --dry-run
 * ```
 */
export declare function createActivitySetupCommand(): Command;
//# sourceMappingURL=setup.d.ts.map