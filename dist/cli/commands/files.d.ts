/**
 * Files subcommands for the CLI.
 *
 * Provides commands for tracking and querying file modifications from Claude Code sessions.
 * Supports listing files changed in a session, searching for sessions that modified a file,
 * and managing the file change index.
 *
 * @module cli/commands/files
 */
import type { Command } from "commander";
import type { SdkManager } from "../../sdk/agent";
/**
 * Register all files-related subcommands on the program.
 *
 * Attaches files list, search, and index subcommands to the CLI.
 * All commands support global --format option for output formatting.
 *
 * @param program - Commander program instance to attach commands to
 * @param getAgent - Factory function that creates/returns SdkManager instance
 *
 * @example
 * ```typescript
 * const program = new Command();
 * registerFilesCommands(program, async () => {
 *   const container = createProductionContainer();
 *   return SdkManager.create(container);
 * });
 * ```
 */
export declare function registerFilesCommands(program: Command, getAgent: () => Promise<SdkManager>): void;
//# sourceMappingURL=files.d.ts.map