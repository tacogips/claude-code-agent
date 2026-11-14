/**
 * Group command implementations for CLI.
 *
 * Provides thin wrappers around SDK GroupManager and GroupRunner methods,
 * handling argument parsing, output formatting, and error handling.
 *
 * @module cli/commands/group
 */
import type { Command } from "commander";
import type { SdkManager } from "../../sdk";
/**
 * Register all group subcommands.
 *
 * Adds group-related commands to the CLI program:
 * - create: Create new session group
 * - list: List session groups with optional filtering
 * - show: Show detailed group information
 * - run: Execute session group
 * - watch: Watch group execution progress (placeholder)
 * - pause: Pause running group
 * - resume: Resume paused group
 * - archive: Archive completed group (placeholder)
 * - delete: Delete group with confirmation
 *
 * @param program - Commander program instance
 * @param getAgent - Async function to get initialized SdkManager
 *
 * @example
 * ```typescript
 * const program = new Command();
 * registerGroupCommands(program, async () => {
 *   const container = createProductionContainer();
 *   return SdkManager.create(container);
 * });
 * ```
 */
export declare function registerGroupCommands(program: Command, getAgent: () => Promise<SdkManager>): void;
//# sourceMappingURL=group.d.ts.map